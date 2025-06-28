/**
 * @fileoverview Tests for DataHandler class
 */

import { DataHandler } from '../src/data-handler.js';
import { DataError } from '../src/errors.js';

describe('DataHandler', () => {
  let dataHandler;
  
  beforeEach(() => {
    dataHandler = new DataHandler();
  });

  describe('parseFlightInfo', () => {
    it('should parse flight info correctly', () => {
      const mockFlightInfo = {
        descriptor: { type: 'PATH', path: ['test-dataset'] },
        endpoints: [{ location: 'http://localhost:8080' }],
        totalRecords: 1000,
        totalBytes: 50000,
        schema: { fields: [{ name: 'id', type: 'int64' }] }
      };

      const parsed = dataHandler.parseFlightInfo(mockFlightInfo);
      
      expect(parsed.descriptor.type).toBe('PATH');
      expect(parsed.descriptor.path).toEqual(['test-dataset']);
      expect(parsed.totalRecords).toBe(1000);
      expect(parsed.totalBytes).toBe(50000);
      expect(parsed.schema).toBeDefined();
    });

    it('should handle missing schema', () => {
      const mockFlightInfo = {
        descriptor: { type: 'PATH', path: ['test'] },
        endpoints: [],
        totalRecords: 0,
        totalBytes: 0
      };

      const parsed = dataHandler.parseFlightInfo(mockFlightInfo);
      expect(parsed.schema).toBeNull();
    });

    it('should throw DataError on invalid input', () => {
      expect(() => {
        dataHandler.parseFlightInfo(null);
      }).toThrow(DataError);
    });
  });

  describe('parseSchema', () => {
    it('should parse schema object', () => {
      const mockSchema = {
        fields: [
          { name: 'id', type: 'int64', nullable: false },
          { name: 'name', type: 'utf8', nullable: true }
        ],
        metadata: { version: '1.0' }
      };

      const parsed = dataHandler.parseSchema(mockSchema);
      
      expect(parsed.fields).toHaveLength(2);
      expect(parsed.fields[0].name).toBe('id');
      expect(parsed.fields[0].type).toBe('int64');
      expect(parsed.fields[0].nullable).toBe(false);
      expect(parsed.metadata.version).toBe('1.0');
    });

    it('should handle empty schema', () => {
      const mockSchema = { fields: [] };
      const parsed = dataHandler.parseSchema(mockSchema);
      
      expect(parsed.fields).toHaveLength(0);
      expect(parsed.metadata).toEqual({});
    });

    it('should throw DataError on invalid schema', () => {
      expect(() => {
        dataHandler.parseSchema('invalid');
      }).toThrow(DataError);
    });
  });

  describe('combineBatches', () => {
    it('should combine multiple batches correctly', () => {
      const batches = [
        { data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] },
        { data: [{ id: 3, name: 'Charlie' }] },
        { data: [{ id: 4, name: 'David' }, { id: 5, name: 'Eve' }] }
      ];

      const combined = dataHandler.combineBatches(batches);
      
      expect(combined).toHaveLength(5);
      expect(combined[0]).toEqual({ id: 1, name: 'Alice' });
      expect(combined[4]).toEqual({ id: 5, name: 'Eve' });
    });

    it('should handle empty batches array', () => {
      const combined = dataHandler.combineBatches([]);
      expect(combined).toHaveLength(0);
    });

    it('should handle batches without data', () => {
      const batches = [
        { schema: 'test' },
        { data: [{ id: 1 }] },
        { numRows: 10 }
      ];

      const combined = dataHandler.combineBatches(batches);
      expect(combined).toHaveLength(1);
      expect(combined[0]).toEqual({ id: 1 });
    });
  });

  describe('convertToFormat', () => {
    const sampleData = [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 }
    ];

    it('should convert to JSON format', () => {
      const json = dataHandler.convertToFormat(sampleData, 'json');
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Alice');
    });

    it('should convert to CSV format', () => {
      const csv = dataHandler.convertToFormat(sampleData, 'csv');
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('id,name,age');
      expect(lines[1]).toBe('1,Alice,30');
      expect(lines[2]).toBe('2,Bob,25');
    });

    it('should convert to columnar format', () => {
      const columnar = dataHandler.convertToFormat(sampleData, 'columnar');
      
      expect(columnar.numRows).toBe(2);
      expect(columnar.columns.id).toEqual([1, 2]);
      expect(columnar.columns.name).toEqual(['Alice', 'Bob']);
      expect(columnar.columns.age).toEqual([30, 25]);
    });

    it('should return original data for unknown format', () => {
      const result = dataHandler.convertToFormat(sampleData, 'unknown');
      expect(result).toBe(sampleData);
    });

    it('should throw DataError on conversion failure', () => {
      // Mock a scenario that would cause conversion to fail
      const invalidData = { circular: null };
      invalidData.circular = invalidData; // Create circular reference
      
      expect(() => {
        dataHandler.convertToFormat([invalidData], 'json');
      }).toThrow(DataError);
    });
  });

  describe('CSV conversion', () => {
    it('should handle empty data', () => {
      const csv = dataHandler.convertToFormat([], 'csv');
      expect(csv).toBe('');
    });

    it('should escape CSV special characters', () => {
      const data = [
        { name: 'Alice, Jr.', description: 'Has "quotes"' },
        { name: 'Bob', description: 'Normal text' }
      ];
      
      const csv = dataHandler.convertToFormat(data, 'csv');
      expect(csv).toContain('"Alice, Jr."');
      expect(csv).toContain('"Has ""quotes"""');
    });

    it('should handle null and undefined values', () => {
      const data = [
        { id: 1, name: null, active: undefined },
        { id: 2, name: 'Bob', active: true }
      ];
      
      const csv = dataHandler.convertToFormat(data, 'csv');
      const lines = csv.split('\n');
      expect(lines[1]).toBe('1,,');
      expect(lines[2]).toBe('2,Bob,true');
    });
  });

  describe('schema caching', () => {
    it('should cache parsed schemas', () => {
      const schema = { fields: [{ name: 'test', type: 'utf8' }] };
      
      // Parse same schema twice
      const parsed1 = dataHandler.parseSchema(schema);
      const parsed2 = dataHandler.parseSchema(schema);
      
      // Should get same result
      expect(parsed1).toEqual(parsed2);
      
      // Cache should contain the schema
      expect(dataHandler.schemaCache.size).toBe(1);
    });

    it('should limit cache size', () => {
      const originalMaxSize = dataHandler.maxCacheSize;
      dataHandler.maxCacheSize = 2; // Set small cache size for testing
      
      // Add more schemas than cache limit
      for (let i = 0; i < 5; i++) {
        const schema = { fields: [{ name: `field${i}`, type: 'utf8' }] };
        dataHandler.parseSchema(schema);
      }
      
      // Cache should not exceed max size
      expect(dataHandler.schemaCache.size).toBeLessThanOrEqual(2);
      
      // Restore original cache size
      dataHandler.maxCacheSize = originalMaxSize;
    });
  });
}); 