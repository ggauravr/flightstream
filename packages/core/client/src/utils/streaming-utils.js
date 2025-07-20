import * as arrow from 'apache-arrow';

/**
 * Streaming Utilities for Arrow Flight Data
 *
 * This module provides utilities for efficient streaming data processing,
 * memory management, and data transformation for Arrow Flight clients.
 */
export class StreamingUtils {
  /**
   * Create a streaming data processor
   * @param {Object} options - Processing options
   * @returns {StreamingProcessor} Streaming processor instance
   */
  static createProcessor(options = {}) {
    return new StreamingProcessor(options);
  }

  /**
   * Process data in chunks to manage memory
   * @param {AsyncGenerator} dataStream - Stream of Arrow data
   * @param {Function} processor - Function to process each chunk
   * @param {Object} options - Processing options
   * @returns {AsyncGenerator} Processed data stream
   */
  static async *processInChunks(dataStream, processor, options = {}) {
    const chunkSize = options.chunkSize || 1000;
    let currentChunk = [];
    let totalProcessed = 0;

    for await (const recordBatch of dataStream) {
      for (let i = 0; i < recordBatch.numRows; i++) {
        const row = {};
        recordBatch.schema.fields.forEach((field, colIndex) => {
          const column = recordBatch.getChildAt(colIndex);
          row[field.name] = column.get(i);
        });
        
        currentChunk.push(row);
        
        if (currentChunk.length >= chunkSize) {
          yield await processor(currentChunk, totalProcessed);
          totalProcessed += currentChunk.length;
          currentChunk = [];
        }
      }
    }

    // Process remaining data
    if (currentChunk.length > 0) {
      yield await processor(currentChunk, totalProcessed);
    }
  }

  /**
   * Transform Arrow record batches to a specific format
   * @param {AsyncGenerator} dataStream - Stream of Arrow record batches
   * @param {string} format - Output format ('json', 'csv', 'arrow')
   * @returns {AsyncGenerator} Transformed data stream
   */
  static async *transformData(dataStream, format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        yield* this._toJson(dataStream);
        break;
      case 'csv':
        yield* this._toCsv(dataStream);
        break;
      case 'arrow':
        yield* dataStream;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert Arrow data to JSON format
   * @param {AsyncGenerator} dataStream - Stream of Arrow record batches
   * @returns {AsyncGenerator} JSON data stream
   * @private
   */
  static async *_toJson(dataStream) {
    for await (const recordBatch of dataStream) {
      const jsonData = [];
      
      for (let i = 0; i < recordBatch.numRows; i++) {
        const row = {};
        recordBatch.schema.fields.forEach((field, colIndex) => {
          const column = recordBatch.getChildAt(colIndex);
          row[field.name] = column.get(i);
        });
        jsonData.push(row);
      }
      
      yield jsonData;
    }
  }

  /**
   * Convert Arrow data to CSV format
   * @param {AsyncGenerator} dataStream - Stream of Arrow record batches
   * @returns {AsyncGenerator} CSV data stream
   * @private
   */
  static async *_toCsv(dataStream) {
    let isFirst = true;
    let headers = null;

    for await (const recordBatch of dataStream) {
      if (isFirst) {
        headers = recordBatch.schema.fields.map(field => field.name);
        yield headers.join(',') + '\n';
        isFirst = false;
      }

      for (let i = 0; i < recordBatch.numRows; i++) {
        const row = [];
        recordBatch.schema.fields.forEach((field, colIndex) => {
          const column = recordBatch.getChildAt(colIndex);
          const value = column.get(i);
          // Escape CSV values
          const escapedValue = typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          row.push(escapedValue);
        });
        yield row.join(',') + '\n';
      }
    }
  }

  /**
   * Create a memory-efficient data collector
   * @param {Object} options - Collector options
   * @returns {DataCollector} Data collector instance
   */
  static createCollector(options = {}) {
    return new DataCollector(options);
  }
}

/**
 * Streaming Data Processor
 */
class StreamingProcessor {
  constructor(options = {}) {
    this.options = {
      maxMemoryUsage: options.maxMemoryUsage || 100 * 1024 * 1024, // 100MB
      chunkSize: options.chunkSize || 1000,
      logger: options.logger || console,
      ...options
    };

    this.processedRows = 0;
    this.memoryUsage = 0;
  }

  /**
   * Process a stream of data with memory management
   * @param {AsyncGenerator} dataStream - Stream of Arrow data
   * @param {Function} processor - Processing function
   * @returns {AsyncGenerator} Processed data
   */
  async *process(dataStream, processor) {
    for await (const recordBatch of dataStream) {
      const result = await this._processBatch(recordBatch, processor);
      if (result) {
        yield result;
      }
    }
  }

  /**
   * Process a single record batch
   * @param {Object} recordBatch - Arrow record batch
   * @param {Function} processor - Processing function
   * @returns {any} Processing result
   * @private
   */
  async _processBatch(recordBatch, processor) {
    const data = [];
    
    for (let i = 0; i < recordBatch.numRows; i++) {
      const row = {};
      recordBatch.schema.fields.forEach((field, colIndex) => {
        const column = recordBatch.getChildAt(colIndex);
        row[field.name] = column.get(i);
      });
      data.push(row);
    }

    this.processedRows += data.length;
    this.memoryUsage += JSON.stringify(data).length;

    // Check memory usage
    if (this.memoryUsage > this.options.maxMemoryUsage) {
      this.options.logger.warn('Memory usage exceeded limit, processing current batch');
      this.memoryUsage = 0;
    }

    return await processor(data, this.processedRows);
  }

  /**
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getStats() {
    return {
      processedRows: this.processedRows,
      memoryUsage: this.memoryUsage,
      maxMemoryUsage: this.options.maxMemoryUsage
    };
  }
}

/**
 * Data Collector for accumulating results
 */
class DataCollector {
  constructor(options = {}) {
    this.options = {
      maxItems: options.maxItems || 10000,
      maxMemoryUsage: options.maxMemoryUsage || 50 * 1024 * 1024, // 50MB
      logger: options.logger || console,
      ...options
    };

    this.items = [];
    this.memoryUsage = 0;
  }

  /**
   * Add items to the collector
   * @param {Array} items - Items to add
   */
  add(items) {
    const itemsJson = JSON.stringify(items);
    const newMemoryUsage = this.memoryUsage + itemsJson.length;

    if (this.items.length + items.length > this.options.maxItems) {
      this.options.logger.warn('Max items exceeded, clearing collector');
      this.clear();
    }

    if (newMemoryUsage > this.options.maxMemoryUsage) {
      this.options.logger.warn('Memory usage exceeded, clearing collector');
      this.clear();
    }

    this.items.push(...items);
    this.memoryUsage = newMemoryUsage;
  }

  /**
   * Get all collected items
   * @returns {Array} Collected items
   */
  getAll() {
    return [...this.items];
  }

  /**
   * Clear the collector
   */
  clear() {
    this.items = [];
    this.memoryUsage = 0;
  }

  /**
   * Get collector statistics
   * @returns {Object} Collector statistics
   */
  getStats() {
    return {
      itemCount: this.items.length,
      memoryUsage: this.memoryUsage,
      maxItems: this.options.maxItems,
      maxMemoryUsage: this.options.maxMemoryUsage
    };
  }
} 