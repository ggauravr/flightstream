/**
 * Tests for CSVFlightService
 * @fileoverview Comprehensive test suite for CSV Flight service functionality
 */

import { CSVFlightService } from '../src/csv-service.js';
import { FlightServiceBase } from '@flightstream/core';
import { CSVTestUtils } from './setup.js';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('../src/csv-streamer.js', () => ({
  CSVStreamer: jest.fn().mockImplementation((filePath, options) => ({
    on: jest.fn(),
    start: jest.fn().mockResolvedValue(),
    stop: jest.fn()
  }))
}));

jest.mock('../src/csv-arrow-builder.js', () => ({
  CSVArrowBuilder: jest.fn().mockImplementation((schema) => ({
    getSchema: jest.fn().mockReturnValue({
      fields: [
        { name: 'id', type: { typeId: 6 } },
        { name: 'name', type: { typeId: 13 } }
      ]
    }),
    createRecordBatch: jest.fn().mockReturnValue({}),
    serializeRecordBatch: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3]))
  }))
}));

describe('CSVFlightService', () => {
  let service;
  let testDataDir;

  beforeEach(() => {
    testDataDir = CSVTestUtils.getFixturesDir();
    // Create test CSV files
    const testData = CSVTestUtils.createTestData(5);
    CSVTestUtils.createTestCSVFile('products.csv', testData);
    CSVTestUtils.createTestCSVFile('customers.csv', [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ]);
  });

  afterEach(() => {
    CSVTestUtils.cleanupTestFiles();
  });

  describe('construction', () => {
    it('should extend FlightServiceBase', () => {
      service = new CSVFlightService();
      expect(service).toBeInstanceOf(FlightServiceBase);
    });

    it('should accept CSV-specific options', () => {
      const options = {
        dataDirectory: '/custom/data',
        batchSize: 5000,
        delimiter: ';'
      };
      service = new CSVFlightService(options);
      
      expect(service.csvOptions.dataDirectory).toBe('/custom/data');
      expect(service.csvOptions.batchSize).toBe(5000);
      expect(service.csvOptions.delimiter).toBe(';');
    });

    it('should set default data directory to ./data', () => {
      service = new CSVFlightService();
      expect(service.csvOptions.dataDirectory).toBe('./data');
    });

    it('should set default batch size to 10000', () => {
      service = new CSVFlightService();
      expect(service.csvOptions.batchSize).toBe(10000);
    });

    it('should accept custom CSV parsing options', () => {
      const csvOptions = {
        delimiter: '|',
        headers: false,
        skipEmptyLines: false
      };
      service = new CSVFlightService({ csv: csvOptions });
      
      expect(service.csvOptions.delimiter).toBe('|');
      expect(service.csvOptions.headers).toBe(false);
      expect(service.csvOptions.skipEmptyLines).toBe(false);
    });
  });

  describe('CSV options', () => {
    beforeEach(() => {
      service = new CSVFlightService();
    });

    it('should configure delimiter (default comma)', () => {
      expect(service.csvOptions.delimiter).toBe(',');
    });

    it('should configure headers option (default true)', () => {
      expect(service.csvOptions.headers).toBe(true);
    });

    it('should configure skipEmptyLines (default true)', () => {
      expect(service.csvOptions.skipEmptyLines).toBe(true);
    });

    it('should merge custom CSV options', () => {
      service = new CSVFlightService({
        csv: {
          delimiter: '\t',
          encoding: 'utf16'
        }
      });
      
      expect(service.csvOptions.delimiter).toBe('\t');
      expect(service.csvOptions.encoding).toBe('utf16');
      expect(service.csvOptions.headers).toBe(true); // Should keep default
    });
  });

  describe('dataset discovery', () => {
    beforeEach(() => {
      service = new CSVFlightService({ dataDirectory: testDataDir });
    });

    describe('_initializeDatasets', () => {
      it('should scan data directory for CSV files', async () => {
        await service._initializeDatasets();
        
        const datasets = service.getDatasets();
        expect(datasets).toContain('products');
        expect(datasets).toContain('customers');
      });

      it('should handle missing data directory gracefully', async () => {
        service = new CSVFlightService({ dataDirectory: '/nonexistent/path' });
        
        // Should not throw error
        await expect(service._initializeDatasets()).resolves.toBeUndefined();
        
        const datasets = service.getDatasets();
        expect(datasets).toHaveLength(0);
      });

      it('should filter files by .csv extension', async () => {
        // Create non-CSV file
        const nonCsvFile = path.join(testDataDir, 'data.txt');
        fs.writeFileSync(nonCsvFile, 'not a csv file');
        
        await service._initializeDatasets();
        
        const datasets = service.getDatasets();
        expect(datasets).not.toContain('data');
        expect(datasets).toContain('products');
        expect(datasets).toContain('customers');
      });

      it('should skip files with schema inference errors', async () => {
        // Create malformed CSV
        CSVTestUtils.createMalformedCSVFile('malformed.csv');
        
        // Mock CSVStreamer to emit error for malformed file
        const { CSVStreamer } = require('../src/csv-streamer.js');
        CSVStreamer.mockImplementation((filePath) => {
          const mockStreamer = {
            on: jest.fn((event, callback) => {
              if (event === 'error' && filePath.includes('malformed')) {
                setTimeout(() => callback(new Error('Parse error')), 10);
              }
            }),
            start: jest.fn(),
            stop: jest.fn()
          };
          return mockStreamer;
        });
        
        await service._initializeDatasets();
        
        const datasets = service.getDatasets();
        expect(datasets).not.toContain('malformed');
        expect(datasets).toContain('products');
      });

      it('should log registration results', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        
        await service._initializeDatasets();
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Registered CSV dataset: products')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Registered CSV dataset: customers')
        );
      });
    });

    describe('dataset registration', () => {
      beforeEach(async () => {
        await service._initializeDatasets();
      });

      it('should create dataset ID from filename', () => {
        expect(service.hasDataset('products')).toBe(true);
        expect(service.hasDataset('customers')).toBe(true);
      });

      it('should store file path in dataset metadata', () => {
        const productDataset = service.datasets.get('products');
        expect(productDataset.filePath).toContain('products.csv');
      });

      it('should include file statistics in metadata', () => {
        const productDataset = service.datasets.get('products');
        expect(productDataset.metadata).toHaveProperty('totalBytes');
        expect(productDataset.metadata).toHaveProperty('created');
        expect(productDataset.metadata.totalBytes).toBeGreaterThan(0);
      });

      it('should store inferred Arrow schema', () => {
        const productDataset = service.datasets.get('products');
        expect(productDataset.schema).toBeDefined();
        expect(productDataset.schema.fields).toBeDefined();
      });

      it('should set dataset type to csv', () => {
        const productDataset = service.datasets.get('products');
        expect(productDataset.metadata.type).toBe('csv');
      });
    });
  });

  describe('schema inference', () => {
    beforeEach(() => {
      service = new CSVFlightService({ dataDirectory: testDataDir });
    });

    describe('_inferSchemaForDataset', () => {
      it('should handle file path input', async () => {
        const filePath = path.join(testDataDir, 'products.csv');
        const schema = await service._inferSchemaForDataset(filePath);
        
        expect(schema).toBeDefined();
        expect(schema.fields).toBeDefined();
      });

      it('should handle dataset ID input', async () => {
        // First initialize datasets
        await service._initializeDatasets();
        
        const schema = await service._inferSchemaForDataset('products');
        expect(schema).toBeDefined();
        expect(schema.fields).toBeDefined();
      });

      it('should create CSVStreamer for schema inference', async () => {
        const { CSVStreamer } = require('../src/csv-streamer.js');
        
        const filePath = path.join(testDataDir, 'products.csv');
        await service._inferSchemaForDataset(filePath);
        
        expect(CSVStreamer).toHaveBeenCalledWith(
          filePath,
          expect.objectContaining({
            batchSize: 1,
            delimiter: ',',
            headers: true,
            skipEmptyLines: true
          })
        );
      });

      it('should read minimal data for schema (1 batch)', async () => {
        const { CSVStreamer } = require('../src/csv-streamer.js');
        
        const filePath = path.join(testDataDir, 'products.csv');
        await service._inferSchemaForDataset(filePath);
        
        expect(CSVStreamer).toHaveBeenCalledWith(
          filePath,
          expect.objectContaining({ batchSize: 1 })
        );
      });

      it('should convert CSV schema to Arrow schema', async () => {
        const { CSVArrowBuilder } = require('../src/csv-arrow-builder.js');
        
        // Mock schema event
        const { CSVStreamer } = require('../src/csv-streamer.js');
        CSVStreamer.mockImplementation(() => ({
          on: jest.fn((event, callback) => {
            if (event === 'schema') {
              setTimeout(() => callback({
                fields: [
                  { name: 'id', type: 'integer' },
                  { name: 'name', type: 'string' }
                ]
              }), 10);
            }
          }),
          start: jest.fn(),
          stop: jest.fn()
        }));
        
        const filePath = path.join(testDataDir, 'products.csv');
        await service._inferSchemaForDataset(filePath);
        
        expect(CSVArrowBuilder).toHaveBeenCalled();
      });

      it('should handle schema inference errors', async () => {
        const { CSVStreamer } = require('../src/csv-streamer.js');
        CSVStreamer.mockImplementation(() => ({
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('Schema inference failed')), 10);
            }
          }),
          start: jest.fn(),
          stop: jest.fn()
        }));
        
        const filePath = path.join(testDataDir, 'products.csv');
        
        await expect(service._inferSchemaForDataset(filePath))
          .rejects.toThrow('Schema inference failed');
      });

      it('should stop streaming after schema detected', async () => {
        const mockStop = jest.fn();
        const { CSVStreamer } = require('../src/csv-streamer.js');
        CSVStreamer.mockImplementation(() => ({
          on: jest.fn((event, callback) => {
            if (event === 'schema') {
              setTimeout(() => callback({ fields: [] }), 10);
            }
          }),
          start: jest.fn(),
          stop: mockStop
        }));
        
        const filePath = path.join(testDataDir, 'products.csv');
        await service._inferSchemaForDataset(filePath);
        
        expect(mockStop).toHaveBeenCalled();
      });
    });

    describe('schema conversion', () => {
      it('should use CSVArrowBuilder for conversion', async () => {
        const { CSVArrowBuilder } = require('../src/csv-arrow-builder.js');
        
        const filePath = path.join(testDataDir, 'products.csv');
        await service._inferSchemaForDataset(filePath);
        
        expect(CSVArrowBuilder).toHaveBeenCalled();
      });

      it('should preserve field names from CSV headers', async () => {
        const { CSVStreamer } = require('../src/csv-streamer.js');
        const { CSVArrowBuilder } = require('../src/csv-arrow-builder.js');
        
        const mockSchema = {
          fields: [
            { name: 'product_id', type: 'integer' },
            { name: 'product_name', type: 'string' }
          ]
        };
        
        CSVStreamer.mockImplementation(() => ({
          on: jest.fn((event, callback) => {
            if (event === 'schema') {
              setTimeout(() => callback(mockSchema), 10);
            }
          }),
          start: jest.fn(),
          stop: jest.fn()
        }));
        
        const filePath = path.join(testDataDir, 'products.csv');
        await service._inferSchemaForDataset(filePath);
        
        expect(CSVArrowBuilder).toHaveBeenCalledWith(mockSchema);
      });
    });
  });

  describe('data streaming', () => {
    let mockCall;
    let mockDataset;

    beforeEach(() => {
      service = new CSVFlightService({ dataDirectory: testDataDir });
      mockCall = {
        write: jest.fn(),
        end: jest.fn(),
        emit: jest.fn()
      };
      mockDataset = {
        id: 'products',
        filePath: path.join(testDataDir, 'products.csv'),
        schema: { fields: [] }
      };
    });

    describe('_streamDataset', () => {
      it('should create CSVStreamer with configured options', async () => {
        const { CSVStreamer } = require('../src/csv-streamer.js');
        
        await service._streamDataset(mockCall, mockDataset);
        
        expect(CSVStreamer).toHaveBeenCalledWith(
          mockDataset.filePath,
          expect.objectContaining({
            batchSize: 10000,
            delimiter: ',',
            headers: true,
            skipEmptyLines: true
          })
        );
      });

      it('should use proper batch size from options', async () => {
        service = new CSVFlightService({
          dataDirectory: testDataDir,
          batchSize: 5000
        });
        
        const { CSVStreamer } = require('../src/csv-streamer.js');
        
        await service._streamDataset(mockCall, mockDataset);
        
        expect(CSVStreamer).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ batchSize: 5000 })
        );
      });

      it('should apply CSV parsing options', async () => {
        service = new CSVFlightService({
          dataDirectory: testDataDir,
          delimiter: '|',
          headers: false
        });
        
        const { CSVStreamer } = require('../src/csv-streamer.js');
        
        await service._streamDataset(mockCall, mockDataset);
        
        expect(CSVStreamer).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            delimiter: '|',
            headers: false
          })
        );
      });

      it('should create CSVArrowBuilder for data conversion', async () => {
        const { CSVArrowBuilder } = require('../src/csv-arrow-builder.js');
        
        // Mock schema event
        const { CSVStreamer } = require('../src/csv-streamer.js');
        CSVStreamer.mockImplementation(() => ({
          on: jest.fn((event, callback) => {
            if (event === 'schema') {
              setTimeout(() => callback({ fields: [] }), 10);
            }
          }),
          start: jest.fn()
        }));
        
        await service._streamDataset(mockCall, mockDataset);
        
        expect(CSVArrowBuilder).toHaveBeenCalled();
      });
    });

    describe('streaming events', () => {
      let mockStreamer;

      beforeEach(() => {
        mockStreamer = {
          on: jest.fn(),
          start: jest.fn()
        };
        
        const { CSVStreamer } = require('../src/csv-streamer.js');
        CSVStreamer.mockReturnValue(mockStreamer);
      });

      it('should handle schema events from streamer', async () => {
        await service._streamDataset(mockCall, mockDataset);
        
        // Verify schema event handler was registered
        expect(mockStreamer.on).toHaveBeenCalledWith('schema', expect.any(Function));
      });

      it('should handle batch events from streamer', async () => {
        await service._streamDataset(mockCall, mockDataset);
        
        // Verify batch event handler was registered
        expect(mockStreamer.on).toHaveBeenCalledWith('batch', expect.any(Function));
      });

      it('should handle streaming errors', async () => {
        await service._streamDataset(mockCall, mockDataset);
        
        // Verify error event handler was registered
        expect(mockStreamer.on).toHaveBeenCalledWith('error', expect.any(Function));
      });
    });
  });

  describe('public API', () => {
    beforeEach(() => {
      service = new CSVFlightService({ dataDirectory: testDataDir });
    });

    describe('initialize', () => {
      it('should wait for async initialization to complete', async () => {
        // Initialize should complete without hanging
        await expect(service.initialize()).resolves.toBeUndefined();
      });

      it('should be idempotent (safe to call multiple times)', async () => {
        await service.initialize();
        await service.initialize(); // Second call should not cause issues
        
        expect(service._initialized).toBe(true);
      });

      it('should return when already initialized', async () => {
        service._initialized = true;
        
        const start = Date.now();
        await service.initialize();
        const elapsed = Date.now() - start;
        
        expect(elapsed).toBeLessThan(50); // Should return quickly
      });
    });

    describe('getCSVStats', () => {
      beforeEach(async () => {
        await service._initializeDatasets();
      });

      it('should return CSV-specific statistics', () => {
        const stats = service.getCSVStats();
        
        expect(stats).toHaveProperty('csvFiles');
        expect(stats).toHaveProperty('totalDatasets');
        expect(stats).toHaveProperty('dataDirectory');
      });

      it('should include file count information', () => {
        const stats = service.getCSVStats();
        
        expect(stats.csvFiles).toBeGreaterThanOrEqual(2);
        expect(stats.totalDatasets).toBeGreaterThanOrEqual(2);
      });

      it('should include dataset information', () => {
        const stats = service.getCSVStats();
        
        expect(stats.dataDirectory).toBe(testDataDir);
        expect(Array.isArray(stats.datasets)).toBe(true);
      });
    });
  });
}); 