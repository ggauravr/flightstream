/**
 * Tests for ArrowBuilder
 * @fileoverview Comprehensive test suite for Arrow data building functionality
 */

import { ArrowBuilder } from '../src/arrow-builder.js';
import { safeParseInt, safeParseFloat, safeParseDateMillis } from '../src/type-system/index.js';
import * as arrow from 'apache-arrow';

// Test implementation of ArrowBuilder
class TestArrowBuilder extends ArrowBuilder {
  constructor(schema, options) {
    super(schema, options);
  }

  _buildArrowSchema() {
    const fields = [];
    for (const [name, type] of Object.entries(this.sourceSchema)) {
      fields.push(arrow.Field.new(name, type, true));
    }
    this.arrowSchema = new arrow.Schema(fields);
  }

  _transformDataToColumns(sourceData) {
    if (!Array.isArray(sourceData) || sourceData.length === 0) {
      return {};
    }

    const columnData = {};
    const fieldNames = Object.keys(this.sourceSchema);

    // Initialize columns
    for (const fieldName of fieldNames) {
      columnData[fieldName] = [];
    }

    // Transform rows to columns
    for (const row of sourceData) {
      for (const fieldName of fieldNames) {
        columnData[fieldName].push(row[fieldName]);
      }
    }

    return columnData;
  }

  _mapSourceTypeToArrow(sourceType) {
    switch (sourceType) {
      case 'boolean':
        return new arrow.Bool();
      case 'integer':
        return new arrow.Int32();
      case 'float':
        return new arrow.Float64();
      case 'date':
        return new arrow.DateMillisecond();
      case 'string':
      default:
        return new arrow.Utf8();
    }
  }
}

describe('ArrowBuilder', () => {
  let schema;
  let testData;
  let builder;

  beforeEach(() => {
    schema = global.TestUtils.createTestSchema();
    testData = global.TestUtils.createTestData(5);
    
    // Convert schema format for TestArrowBuilder
    const builderSchema = {};
    for (const field of schema.fields) {
      builderSchema[field.name] = field.type;
    }
    
    builder = new TestArrowBuilder(builderSchema);
  });

  describe('when constructed directly', () => {
    it('should throw error when instantiated directly', () => {
      expect(() => {
        new ArrowBuilder({});
      }).toThrow('ArrowBuilder is abstract and cannot be instantiated directly');
    });

    it('should allow concrete subclass instantiation', () => {
      expect(builder).toBeInstanceOf(ArrowBuilder);
      expect(builder).toBeInstanceOf(TestArrowBuilder);
    });

    it('should initialize with source schema and options', () => {
      const options = { recordBatchSize: 1000, nullValue: null };
      const customBuilder = new TestArrowBuilder(schema, options);
      
      expect(customBuilder.sourceSchema).toBe(schema);
      expect(customBuilder.options.recordBatchSize).toBe(1000);
      expect(customBuilder.options.nullValue).toBeNull();
    });
  });

  describe('abstract method contract', () => {
    it('should require _buildArrowSchema implementation', () => {
      expect(() => {
        const badBuilder = new ArrowBuilder({});
        badBuilder._buildArrowSchema();
      }).toThrow('ArrowBuilder is abstract and cannot be instantiated directly');
    });

    it('should require _transformDataToColumns implementation', () => {
      expect(() => {
        const builder = Object.create(ArrowBuilder.prototype);
        builder._transformDataToColumns([]);
      }).toThrow('_transformDataToColumns() must be implemented by subclass');
    });

    it('should require _mapSourceTypeToArrow implementation', () => {
      expect(() => {
        const builder = Object.create(ArrowBuilder.prototype);
        builder._mapSourceTypeToArrow('string');
      }).toThrow('_mapSourceTypeToArrow() must be implemented by subclass');
    });
  });

  describe('record batch operations', () => {
    it('should handle null and empty input', () => {
      const result1 = builder.createRecordBatch(null);
      const result2 = builder.createRecordBatch([]);
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should create valid record batch from data', () => {
      const recordBatch = builder.createRecordBatch(testData);
      
      expect(recordBatch).toBeDefined();
      expect(recordBatch.numRows).toBe(5);
      expect(recordBatch.numCols).toBe(5);
    });

    it('should create record batch from column data', () => {
      const columnData = {
        id: [1, 2, 3],
        name: ['A', 'B', 'C'],
        active: [true, false, true],
        score: [1.1, 2.2, 3.3],
        created_at: [new Date(), new Date(), new Date()]
      };
      
      const recordBatch = builder.createRecordBatchFromColumns(columnData);
      expect(recordBatch).toBeDefined();
      expect(recordBatch.numRows).toBe(3);
    });
  });

  describe('type system integration', () => {
    it('should use centralized type system for parsing', () => {
      // Test that the type system functions work correctly
      expect(safeParseInt('123')).toBe(123);
      expect(safeParseInt('abc')).toBeNull();
      expect(safeParseInt('0')).toBe(0);
      expect(safeParseInt('-456')).toBe(-456);
      expect(safeParseInt(null)).toBeNull();
      expect(safeParseInt(undefined)).toBeNull();
    });

    it('should use centralized type system for float parsing', () => {
      expect(safeParseFloat('123.45')).toBeCloseTo(123.45);
      expect(safeParseFloat('abc')).toBeNull();
      expect(safeParseFloat('0.0')).toBe(0);
      expect(safeParseFloat('-456.789')).toBeCloseTo(-456.789);
      expect(safeParseFloat(null)).toBeNull();
      expect(safeParseFloat(undefined)).toBeNull();
    });

    it('should use centralized type system for date parsing', () => {
      const validDate = safeParseDateMillis('2023-01-01');
      expect(typeof validDate).toBe('number');
      expect(validDate).toBeGreaterThan(0);
      
      const invalidDate = safeParseDateMillis('invalid-date');
      expect(invalidDate).toBeNull();
      
      expect(safeParseDateMillis(null)).toBeNull();
      expect(safeParseDateMillis(undefined)).toBeNull();
    });
  });

  describe('table operations', () => {
    it('should create Arrow table from record batches', () => {
      const recordBatch = builder.createRecordBatch(testData);
      const table = builder.createTable([recordBatch]);
      
      expect(table).toBeDefined();
      expect(table.numRows).toBe(5);
    });

    it('should handle empty record batches array', () => {
      const table = builder.createTable([]);
      expect(table).toBeNull();
    });

    it('should return Arrow schema', () => {
      const schema = builder.getSchema();
      expect(schema).toBeInstanceOf(arrow.Schema);
      expect(schema.fields).toHaveLength(5);
    });

    it('should get statistics from record batch', () => {
      const recordBatch = builder.createRecordBatch(testData);
      const stats = builder.getStats(recordBatch);
      
      expect(stats).toBeDefined();
      expect(stats.numRows).toBe(5);
      expect(stats.numColumns).toBe(5);
      expect(stats.columns).toHaveLength(5);
      expect(stats.types).toHaveLength(5);
    });
  });

  describe('serialization', () => {
    it('should serialize record batch to IPC format', () => {
      const recordBatch = builder.createRecordBatch(testData);
      const serialized = builder.serializeRecordBatch(recordBatch);
      
      expect(serialized).toBeDefined();
      expect(serialized).toBeInstanceOf(Uint8Array);
    });

    it('should serialize schema to IPC format', () => {
      const serialized = builder.serializeSchema();
      
      expect(serialized).toBeDefined();
      expect(serialized).toBeInstanceOf(Uint8Array);
    });

    it('should handle null record batch serialization', () => {
      const result = builder.serializeRecordBatch(null);
      expect(result).toBeNull();
    });
  });
}); 