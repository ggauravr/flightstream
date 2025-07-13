/**
 * @fileoverview CSV to Arrow Streaming Converter
 * 
 * High-performance streaming CSV to Apache Arrow converter with automatic
 * schema inference and memory-efficient processing.
 */

import { Transform } from 'stream';
import { CSVParser } from './parser.js';
import { ArrowConverter } from './converter.js';
import { SchemaInference } from './schema.js';

/**
 * CSV to Arrow Streaming Converter
 * 
 * Complete streaming solution that parses CSV data and converts it to
 * Apache Arrow format with automatic schema inference and batch processing.
 */
export class CSVArrowStreamer extends Transform {
  constructor(options = {}) {
    super({
      objectMode: true,
      highWaterMark: options.highWaterMark || 1000
    });

    this.options = {
      batchSize: options.batchSize || 1000,
      sampleSize: options.sampleSize || 1000,
      delimiter: options.delimiter || ',',
      headers: options.headers !== false, // default true
      skipEmptyLines: options.skipEmptyLines !== false, // default true
      trim: options.trim !== false, // default true
      validateData: options.validateData !== false, // default true
      optimizeMemory: options.optimizeMemory !== false, // default true
      ...options
    };

    this.parser = new CSVParser(this.options);
    this.converter = new ArrowConverter(this.options);
    this.schemaInference = new SchemaInference(this.options);

    this.schema = null;
    this.headers = null;
    this.currentBatch = [];
    this.rowCount = 0;
    this.isFirstRow = true;
    this.isProcessing = false;
  }

  /**
   * Stream CSV from file to Arrow format
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Object>} Streaming result with metadata
   */
  async streamFromFile(filePath) {
    return new Promise(async (resolve, reject) => {
      const results = {
        schema: null,
        rowCount: 0,
        batches: [],
        errors: []
      };

      try {
        // Use streaming parser with callbacks to avoid memory accumulation
        await this.parser.parseFileWithCallbacks(
          filePath,
          (row, rowIndex) => {
            // Process row immediately
            this.currentBatch.push(row);
            this.rowCount++;
            results.rowCount++;

            // Infer schema from first batch
            if (!this.schema && this.currentBatch.length >= Math.min(this.options.sampleSize, this.options.batchSize)) {
              this.inferSchema(results);
            }

            // Process batch if it reaches the batch size
            if (this.currentBatch.length >= this.options.batchSize) {
              const batch = this.processBatchImmediate(results);
              if (batch) {
                results.batches.push(batch);
              }
            }
          },
          (headers) => {
            this.headers = headers;
            this.emit('headers', headers);
          }
        );

        // Process final batch
        if (this.currentBatch.length > 0) {
          const batch = this.processBatchImmediate(results);
          if (batch) {
            results.batches.push(batch);
          }
        }
        
        this.emit('end', results);
        resolve(results);
      } catch (error) {
        results.errors.push(error);
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * Stream CSV from string to Arrow format
   * @param {string} csvString - CSV data as string
   * @returns {Promise<Object>} Streaming result with metadata
   */
  async streamFromString(csvString) {
    return new Promise(async (resolve, reject) => {
      const results = {
        schema: null,
        rowCount: 0,
        batches: [],
        errors: []
      };

      try {
        const parserResult = await this.parser.parseString(csvString);
        
        if (parserResult.headers) {
          this.headers = parserResult.headers;
          this.emit('headers', this.headers);
        }

        // Process rows from the parser result
        if (parserResult.rows) {
          for (const row of parserResult.rows) {
            this.processRow(row, results);
          }
        }

        // Process final batch
        if (this.currentBatch.length > 0) {
          this.processBatch(results);
        }
        
        this.emit('end', results);
        resolve(results);
      } catch (error) {
        results.errors.push(error);
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * Stream CSV from readable stream to Arrow format
   * @param {ReadableStream} inputStream - Input stream
   * @returns {Promise<Object>} Streaming result with metadata
   */
  async streamFromStream(inputStream) {
    return new Promise(async (resolve, reject) => {
      const results = {
        schema: null,
        rowCount: 0,
        batches: [],
        errors: []
      };

      try {
        const parserResult = await this.parser.parseStream(inputStream);
        
        if (parserResult.headers) {
          this.headers = parserResult.headers;
          this.emit('headers', this.headers);
        }

        // Process rows from the parser result
        if (parserResult.rows) {
          for (const row of parserResult.rows) {
            this.processRow(row, results);
          }
        }

        // Process final batch
        if (this.currentBatch.length > 0) {
          this.processBatch(results);
        }
        
        this.emit('end', results);
        resolve(results);
      } catch (error) {
        results.errors.push(error);
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * Process a single row of CSV data
   * @param {Array<any>} row - CSV row data
   * @param {Object} results - Results object to update
   */
  processRow(row, results) {
    this.currentBatch.push(row);
    this.rowCount++;
    results.rowCount++;

    // Infer schema from first batch
    if (!this.schema && this.currentBatch.length >= Math.min(this.options.sampleSize, this.options.batchSize)) {
      this.inferSchema(results);
    }

    // Process batch if it reaches the batch size
    if (this.currentBatch.length >= this.options.batchSize) {
      this.processBatch(results);
    }

    this.emit('row', row);
    this.push(row);
  }

  /**
   * Process current batch of rows
   * @param {Object} results - Results object to update
   */
  processBatch(results) {
    if (this.currentBatch.length === 0) {
      return;
    }

    try {
      let batch;
      
      if (this.schema) {
        batch = this.converter.convertToTableWithSchema(this.currentBatch, this.schema);
      } else {
        batch = this.converter.convertToTable(this.currentBatch, this.headers);
      }

      results.batches.push(batch);
      this.emit('batch', batch);
      
      // Clear current batch
      this.currentBatch = [];
    } catch (error) {
      results.errors.push(error);
      this.emit('error', error);
    }
  }

  /**
   * Infer schema from sample data
   * @param {Object} results - Results object to update
   */
  inferSchema(results) {
    try {
      const sampleData = this.currentBatch.slice(0, this.options.sampleSize);
      this.schema = this.schemaInference.inferSchema(this.headers, sampleData);
      results.schema = this.schema;
      this.emit('schema', this.schema);
    } catch (error) {
      results.errors.push(error);
      this.emit('error', error);
    }
  }

  /**
   * Get current schema
   * @returns {Schema|null} Current Apache Arrow schema
   */
  getSchema() {
    return this.schema;
  }

  /**
   * Get current headers
   * @returns {Array<string>|null} Current headers
   */
  getHeaders() {
    return this.headers;
  }

  /**
   * Get current row count
   * @returns {number} Number of rows processed
   */
  getRowCount() {
    return this.rowCount;
  }

  /**
   * Reset streamer state
   */
  reset() {
    this.schema = null;
    this.headers = null;
    this.currentBatch = [];
    this.rowCount = 0;
    this.isFirstRow = true;
    this.isProcessing = false;
  }

  /**
   * Create a streaming pipeline for file processing
   * @param {string} filePath - Path to CSV file
   * @param {Object} options - Streaming options
   * @returns {Transform} Transform stream
   */
  static createPipeline(filePath, options = {}) {
    const streamer = new CSVArrowStreamer(options);
    const fs = require('fs');
    
    return fs.createReadStream(filePath)
      .pipe(streamer);
  }

  /**
   * Create a streaming pipeline for string processing
   * @param {string} csvString - CSV data as string
   * @param {Object} options - Streaming options
   * @returns {Transform} Transform stream
   */
  static createStringPipeline(csvString, options = {}) {
    const streamer = new CSVArrowStreamer(options);
    const { Readable } = require('stream');
    
    const readable = new Readable({
      read() {
        this.push(csvString);
        this.push(null);
      }
    });
    
    return readable.pipe(streamer);
  }

  /**
   * Stream CSV from file to Arrow format with true streaming
   * @param {string} filePath - Path to CSV file
   * @param {Function} onBatch - Callback for each batch (batch, batchIndex)
   * @returns {Promise<Object>} Streaming result with metadata
   */
  async streamFromFileWithCallbacks(filePath, onBatch) {
    return new Promise(async (resolve, reject) => {
      const results = {
        schema: null,
        rowCount: 0,
        batchCount: 0,
        errors: []
      };

      try {
        const parserResult = await this.parser.parseFile(filePath);
        
        if (parserResult.headers) {
          this.headers = parserResult.headers;
          this.emit('headers', this.headers);
        }

        // Process rows with immediate batch emission
        if (parserResult.rows) {
          for (const row of parserResult.rows) {
            this.currentBatch.push(row);
            this.rowCount++;
            results.rowCount++;

            // Infer schema from first batch
            if (!this.schema && this.currentBatch.length >= Math.min(this.options.sampleSize, this.options.batchSize)) {
              this.inferSchema(results);
            }

            // Process batch if it reaches the batch size
            if (this.currentBatch.length >= this.options.batchSize) {
              const batch = this.processBatchImmediate(results);
              if (batch && onBatch) {
                onBatch(batch, results.batchCount);
              }
              results.batchCount++;
            }
          }
        }

        // Process final batch
        if (this.currentBatch.length > 0) {
          const batch = this.processBatchImmediate(results);
          if (batch && onBatch) {
            onBatch(batch, results.batchCount);
          }
          results.batchCount++;
        }
        
        this.emit('end', results);
        resolve(results);
      } catch (error) {
        results.errors.push(error);
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * Ultra-fast streaming CSV to Arrow with zero memory accumulation
   * @param {string} filePath - Path to CSV file
   * @param {Function} onBatch - Callback for each batch (batch, batchIndex)
   * @returns {Promise<Object>} Streaming result with metadata
   */
  async streamFromFileUltraFast(filePath, onBatch) {
    return new Promise(async (resolve, reject) => {
      const results = {
        schema: null,
        rowCount: 0,
        batchCount: 0,
        errors: []
      };

      try {
        // Use streaming parser with callbacks
        await this.parser.parseFileWithCallbacks(
          filePath,
          (row, rowIndex) => {
            // Process row immediately
            this.currentBatch.push(row);
            this.rowCount++;
            results.rowCount++;

            // Infer schema from first batch
            if (!this.schema && this.currentBatch.length >= Math.min(this.options.sampleSize, this.options.batchSize)) {
              this.inferSchema(results);
            }

            // Process batch if it reaches the batch size
            if (this.currentBatch.length >= this.options.batchSize) {
              const batch = this.processBatchImmediate(results);
              if (batch && onBatch) {
                onBatch(batch, results.batchCount);
              }
              results.batchCount++;
            }
          },
          (headers) => {
            this.headers = headers;
            this.emit('headers', headers);
          }
        );

        // Process final batch
        if (this.currentBatch.length > 0) {
          const batch = this.processBatchImmediate(results);
          if (batch && onBatch) {
            onBatch(batch, results.batchCount);
          }
          results.batchCount++;
        }
        
        this.emit('end', results);
        resolve(results);
      } catch (error) {
        results.errors.push(error);
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * Process current batch immediately and return the batch
   * @param {Object} results - Results object to update
   * @returns {Table|null} Arrow table or null if no batch
   */
  processBatchImmediate(results) {
    if (this.currentBatch.length === 0) {
      return null;
    }

    try {
      let batch;
      
      if (this.schema) {
        batch = this.converter.convertToTableWithSchema(this.currentBatch, this.schema);
      } else {
        batch = this.converter.convertToTable(this.currentBatch, this.headers);
      }

      // Validate the batch was created successfully
      if (!batch || !batch.schema) {
        throw new Error('Failed to create valid Arrow table from batch');
      }

      this.emit('batch', batch);
      
      // Clear current batch
      this.currentBatch = [];
      return batch;
    } catch (error) {
      results.errors.push(error);
      this.emit('error', error);
      
      // Clear current batch even on error to prevent memory leaks
      this.currentBatch = [];
      return null;
    }
  }
} 