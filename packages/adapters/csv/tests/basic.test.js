/**
 * @fileoverview Basic tests for CSV to Arrow streaming package
 */

import { CSVArrowStreamer, CSVParser, ArrowConverter, SchemaInference } from '../src/index.js';
import { PerformanceMonitor, DataValidator, FileUtils } from '../src/utils.js';

describe('CSV to Arrow Streaming Package', () => {
  describe('CSVParser', () => {
    let parser;

    beforeEach(() => {
      parser = new CSVParser();
    });

    test('should parse CSV string correctly', async () => {
      const csvString = 'name,age,city\nJohn,25,New York\nJane,30,Los Angeles';
      
      const result = await parser.parseString(csvString);
      
      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.rowCount).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.rows).toHaveLength(2);
    });

    test('should handle empty CSV', async () => {
      const csvString = '';
      
      const result = await parser.parseString(csvString);
      
      expect(result.headers).toBeNull();
      expect(result.rowCount).toBe(0);
    });

    test('should handle CSV without headers', async () => {
      const csvString = 'John,25,New York\nJane,30,Los Angeles';
      const parserNoHeaders = new CSVParser({ headers: false });
      
      const result = await parserNoHeaders.parseString(csvString);
      
      expect(result.headers).toBeNull();
      expect(result.rowCount).toBe(2);
    });
  });

  describe('SchemaInference', () => {
    let schemaInference;

    beforeEach(() => {
      schemaInference = new SchemaInference();
    });

    test('should infer schema from sample data', () => {
      const headers = ['name', 'age', 'isActive', 'score'];
      const sampleData = [
        ['John', '25', 'true', '85.5'],
        ['Jane', '30', 'false', '92.0'],
        ['Bob', '35', 'true', '78.2']
      ];

      const schema = schemaInference.inferSchema(headers, sampleData);
      
      expect(schema).toBeDefined();
      expect(schema.fields).toHaveLength(4);
      expect(schema.fields[0].name).toBe('name');
      expect(schema.fields[1].name).toBe('age');
    });

    test('should handle empty data', () => {
      const headers = ['name', 'age'];
      const sampleData = [];

      expect(() => {
        schemaInference.inferSchema(headers, sampleData);
      }).not.toThrow();
    });
  });

  describe('ArrowConverter', () => {
    let converter;

    beforeEach(() => {
      converter = new ArrowConverter();
    });

    test('should convert CSV rows to Arrow table', () => {
      const headers = ['name', 'age', 'city'];
      const rows = [
        ['John', '25', 'New York'],
        ['Jane', '30', 'Los Angeles']
      ];

      const table = converter.convertToTable(rows, headers);
      
      expect(table).toBeDefined();
      expect(table.numRows).toBe(2);
      expect(table.numCols).toBe(3);
    });

    test('should handle empty data', () => {
      const headers = ['name', 'age'];
      const rows = [];

      const table = converter.convertToTable(rows, headers);
      
      expect(table).toBeDefined();
      expect(table.numRows).toBe(0);
      expect(table.numCols).toBe(2);
    });

    test('should convert data types correctly', () => {
      const headers = ['name', 'age', 'isActive', 'score'];
      const rows = [
        ['John', '25', 'true', '85.5'],
        ['Jane', '30', 'false', '92.0']
      ];

      const table = converter.convertToTable(rows, headers);
      
      expect(table).toBeDefined();
      // Verify data types are inferred correctly
      expect(table.schema.fields[0].type.toString()).toContain('Utf8');
      expect(table.schema.fields[1].type.toString()).toContain('Int');
      expect(table.schema.fields[2].type.toString()).toContain('Bool');
      expect(table.schema.fields[3].type.toString()).toContain('Float');
    });
  });

  describe('CSVArrowStreamer', () => {
    let streamer;

    beforeEach(() => {
      streamer = new CSVArrowStreamer({ batchSize: 2 });
    });

    test('should stream CSV string to Arrow format', async () => {
      const csvString = 'name,age,city\nJohn,25,New York\nJane,30,Los Angeles';
      
      const result = await streamer.streamFromString(csvString);
      
      expect(result.schema).toBeDefined();
      expect(result.rowCount).toBe(2);
      expect(result.batches).toHaveLength(1); // 2 rows with batch size 2 = 1 batch
      expect(result.errors).toHaveLength(0);
    });

    test('should emit events during streaming', (done) => {
      const csvString = 'name,age\nJohn,25\nJane,30';
      let eventCount = 0;
      
      streamer.on('headers', (headers) => {
        expect(headers).toEqual(['name', 'age']);
        eventCount++;
      });

      streamer.on('schema', (schema) => {
        expect(schema).toBeDefined();
        eventCount++;
      });

      streamer.on('batch', (batch) => {
        expect(batch).toBeDefined();
        eventCount++;
      });

      streamer.on('end', (results) => {
        expect(results.rowCount).toBe(2);
        expect(eventCount).toBeGreaterThan(0);
        done();
      });

      streamer.streamFromString(csvString).catch(done);
    });
  });

  describe('Utilities', () => {
    describe('PerformanceMonitor', () => {
      test('should track performance metrics', async () => {
        const monitor = new PerformanceMonitor();
        
        monitor.start();
        monitor.recordBatch(100, 50);
        monitor.recordBatch(200, 75);
        // Add small delay to ensure time difference
        await new Promise(resolve => setTimeout(resolve, 10));
        monitor.end();
        
        const summary = monitor.getSummary();
        
        expect(summary.totalRows).toBe(300);
        expect(summary.totalBatches).toBe(2);
        expect(summary.totalTime).toBeGreaterThan(0);
      });
    });

    describe('DataValidator', () => {
      test('should validate CSV options', () => {
        const validOptions = { batchSize: 1000, sampleSize: 100 };
        const invalidOptions = { batchSize: -1, sampleSize: 0 };
        
        const validResult = DataValidator.validateOptions(validOptions);
        const invalidResult = DataValidator.validateOptions(invalidOptions);
        
        expect(validResult.valid).toBe(true);
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.errors.length).toBeGreaterThan(0);
      });

      test('should validate data structure', () => {
        const headers = ['name', 'age'];
        const validRows = [['John', '25'], ['Jane', '30']];
        const invalidRows = [['John'], ['Jane', '30', 'extra']];
        
        const validResult = DataValidator.validateDataStructure(validRows, headers);
        const invalidResult = DataValidator.validateDataStructure(invalidRows, headers);
        
        expect(validResult.valid).toBe(true);
        expect(invalidResult.valid).toBe(false);
      });
    });

    describe('FileUtils', () => {
      test('should format file size correctly', () => {
        expect(FileUtils.formatFileSize(1024)).toBe('1 KB');
        expect(FileUtils.formatFileSize(1048576)).toBe('1 MB');
        expect(FileUtils.formatFileSize(0)).toBe('0 Bytes');
      });
    });
  });
}); 