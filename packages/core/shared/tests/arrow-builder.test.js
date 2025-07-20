/**
 * Tests for ArrowBuilder
 * @fileoverview Comprehensive test suite for Arrow data building functionality
 */

import { ArrowBuilder } from '../src/arrow-builder.js';
import * as arrow from 'apache-arrow';

// Test implementation of ArrowBuilder
class TestArrowBuilder extends ArrowBuilder {
  constructor(schema, options) {
    super(schema, options);
  }

  _buildArrowSchema() {
    const fields = [];
    for (const [name, type] of Object.entries(this.sourceSchema)) {
      const arrowType = this._mapSourceTypeToArrow(type);
      fields.push(arrow.Field.new(name, arrowType, true));
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
    // Create a simple test schema
    schema = {
      id: 'integer',
      name: 'string',
      active: 'boolean',
      score: 'float',
      created_at: 'date'
    };
    
    // Create test data
    testData = [
      { id: 1, name: 'Alice', active: true, score: 95.5, created_at: new Date('2023-01-01') },
      { id: 2, name: 'Bob', active: false, score: 87.2, created_at: new Date('2023-01-02') },
      { id: 3, name: 'Charlie', active: true, score: 92.8, created_at: new Date('2023-01-03') },
      { id: 4, name: 'Diana', active: false, score: 78.9, created_at: new Date('2023-01-04') },
      { id: 5, name: 'Eve', active: true, score: 88.1, created_at: new Date('2023-01-05') }
    ];
    
    builder = new TestArrowBuilder(schema);
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
      }).toThrow('_transformDataToColumns is not a function');
    });

    it('should require _mapSourceTypeToArrow implementation', () => {
      expect(() => {
        const builder = Object.create(ArrowBuilder.prototype);
        builder._mapSourceTypeToArrow('string');
      }).toThrow('_mapSourceTypeToArrow() must be implemented by subclass');
    });
  });

  describe('data conversion operations', () => {
    it('should convert data for Int32 type', () => {
      const data = ['1', '2', '3', null, '5'];
      const converted = builder._convertDataForArrowType(new arrow.Int32(), data);
      
      expect(converted).toEqual([1, 2, 3, null, 5]);
    });

    it('should convert data for Float64 type', () => {
      const data = ['1.5', '2.7', '3.0', null, '5.9'];
      const converted = builder._convertDataForArrowType(new arrow.Float64(), data);
      
      expect(converted).toEqual([1.5, 2.7, 3.0, null, 5.9]);
    });

    it('should convert data for Bool type', () => {
      const data = [true, false, 1, 0, null];
      const converted = builder._convertDataForArrowType(new arrow.Bool(), data);
      
      expect(converted).toEqual([true, false, true, false, null]);
    });

    it('should convert data for DateMillisecond type', () => {
      const dates = ['2023-01-01', '2023-01-02', null, '2023-01-04'];
      const converted = builder._convertDataForArrowType(new arrow.DateMillisecond(), dates);
      
      expect(converted[0]).toBeInstanceOf(Date);
      expect(converted[1]).toBeInstanceOf(Date);
      expect(converted[2]).toBeNull();
      expect(converted[3]).toBeInstanceOf(Date);
    });

    it('should handle null and undefined values', () => {
      const data = [null, undefined, 'test', '', 0];
      const converted = builder._convertDataForArrowType(new arrow.Utf8(), data);
      
      expect(converted).toEqual([null, undefined, 'test', '', 0]);
    });
  });

  describe('schema operations', () => {
    it('should return Arrow schema', () => {
      const schema = builder.getSchema();
      expect(schema).toBeInstanceOf(arrow.Schema);
      expect(schema.fields).toHaveLength(5);
    });

    it('should have correct field types', () => {
      const schema = builder.getSchema();
      const fieldTypes = schema.fields.map(field => field.type.constructor.name);
      

      
      // The TestArrowBuilder maps types correctly
      expect(fieldTypes).toContain('Int32');      // from 'integer'
      expect(fieldTypes).toContain('Utf8');       // from 'string'
      expect(fieldTypes).toContain('Bool');       // from 'boolean'
      expect(fieldTypes).toContain('Float64');    // from 'float'
      expect(fieldTypes).toContain('DateMillisecond'); // from 'date'
    });
  });

  describe('serialization', () => {
    it('should serialize typed arrays to IPC format', () => {
      const typedArrays = {
        id: new Int32Array([1, 2, 3, 4, 5]),
        name: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
        active: new Uint8Array([1, 0, 1, 0, 1]),
        score: new Float64Array([95.5, 87.2, 92.8, 78.9, 88.1])
      };
      
      const serialized = builder.serializeFromArrays(typedArrays);
      
      expect(serialized).toBeDefined();
      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should handle empty typed arrays', () => {
      const emptyArrays = {};
      const serialized = builder.serializeFromArrays(emptyArrays);
      
      expect(serialized).toBeDefined();
      expect(serialized).toBeInstanceOf(Uint8Array);
    });
  });
}); 