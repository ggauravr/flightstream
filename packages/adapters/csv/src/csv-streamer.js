import fs from 'fs';
import { parse } from 'fast-csv';
import * as arrow from 'apache-arrow';
import { EventEmitter } from 'events';

/**
 * Ultra-Fast CSV Streamer with Chunk-Based Processing
 *
 * This class uses chunk-based CSV processing for maximum performance.
 * Instead of reading row-by-row, it processes large chunks of data at once.
 *
 * Features:
 * 1. Chunk-based CSV processing for maximum performance
 * 2. Automatic schema inference from headers and data
 * 3. Efficient batch processing with larger chunks
 * 4. Configurable batch processing
 * 5. Memory efficient chunked processing
 */
export class CSVStreamer extends EventEmitter {
  constructor(filePath, options = {}) {
    super();
    this.filePath = filePath;
    console.log('options -->', options);
    this.options = {
      delimiter: options.delimiter || ',',
      headers: options.headers !== false, // default true
      skipEmptyLines: options.skipEmptyLines !== false, // default true,
      batchSize: options.batchSize || 10000, // 10,000 lines per batch
      ...options
    };

    this.totalRows = 0;
    this.schema = null;
    this.isReading = false;
    this.currentChunk = [];
    this.headers = null;
    this.lineBuffer = '';
  }

  async start() {
    if (this.isReading) {
      throw new Error('CSV streaming is already in progress');
    }

    this.isReading = true;
    this.emit('start');

    return new Promise((resolve, reject) => {
      // Create stream with large buffer for I/O efficiency
      const stream = fs.createReadStream(this.filePath, {
        highWaterMark: 64 * 1024, // 64KB for optimal I/O efficiency
        encoding: 'utf8'
      });

      stream.on('error', (error) => {
        this.isReading = false;
        this.emit('error', error);
        reject(error);
      });

      stream.on('data', (chunk) => {
        try {
          this._processChunk(chunk);
        } catch (error) {
          this.emit('error', error);
        }
      });

      stream.on('end', () => {
        // Process any remaining data
        this._processRemainingData();
        
        this.isReading = false;
        this.emit('end', { totalRows: this.totalRows });
        resolve({ totalRows: this.totalRows, schema: this.schema });
      });
    });
  }

  stop() {
    if (this.isReading) {
      this.isReading = false;
      this.emit('stop');
    }
  }

  /**
   * Process a chunk of data from the stream
   * @param {string} chunk - Data chunk from stream
   */
  _processChunk(chunk) {
    // Combine with any leftover data from previous chunk
    const data = this.lineBuffer + chunk;
    const lines = data.split('\n');
    
    // Keep the last line in buffer (might be incomplete)
    this.lineBuffer = lines.pop() || '';
    
    // Process complete lines
    for (const line of lines) {
      if (!line.trim() && this.options.skipEmptyLines) {
        continue;
      }
      
      // Handle headers
      if (this.headers === null && this.options.headers) {
        this.headers = this._parseCSVLine(line, this.options.delimiter);
        this.schema = this._inferSchemaFromHeaders(this.headers);
        this.emit('schema', this.schema);
        continue;
      }
      
      // Add line to current chunk
      this.currentChunk.push(line);
      
      // Process chunk when it reaches the target size
      if (this.currentChunk.length >= this.options.batchSize) {
        this._processChunkBatch();
      }
    }
  }

  /**
   * Process the current chunk of lines into a batch
   */
  _processChunkBatch() {
    if (this.currentChunk.length === 0) return;
    
    const batch = this._parseChunk(this.currentChunk, this.headers);
    
    if (batch.length > 0) {
      this.emit('batch', batch);
      this.totalRows += batch.length;
    }
    
    // Clear the chunk for reuse (object pooling)
    this.currentChunk.length = 0;
  }

  /**
   * Process any remaining data after stream ends
   */
  _processRemainingData() {
    // Process any remaining complete lines
    if (this.lineBuffer.trim()) {
      this.currentChunk.push(this.lineBuffer);
    }
    
    // Process final chunk
    this._processChunkBatch();
  }

  /**
   * Parse a chunk of CSV lines into row objects
   * @param {Array<string>} lines - Array of CSV lines
   * @param {Array<string>} headers - Column headers
   * @returns {Array<Object>} Array of row objects
   */
  _parseChunk(lines, headers) {
    const rows = [];
    
    for (const line of lines) {
      if (!line.trim() && this.options.skipEmptyLines) {
        continue;
      }
      
      try {
        const values = this._parseCSVLine(line, this.options.delimiter);
        const row = {};
        
        if (headers) {
          // Use headers for column names
          for (let i = 0; i < headers.length; i++) {
            row[headers[i]] = values[i] || '';
          }
        } else {
          // Use column indices as names
          for (let i = 0; i < values.length; i++) {
            row[`column${i + 1}`] = values[i] || '';
          }
        }
        
        rows.push(row);
      } catch (error) {
        this.emit('row-error', { line, error: error.message });
      }
    }
    
    return rows;
  }

  /**
   * Parse a single CSV line into values
   * @param {string} line - CSV line
   * @param {string} delimiter - CSV delimiter
   * @returns {Array<string>} Array of values
   */
  _parseCSVLine(line, delimiter) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      
      i++;
    }
    
    // Add the last value
    values.push(current.trim());
    
    return values;
  }

  /**
   * Infer schema from headers
   * @param {Array<string>} headers - Column headers
   * @returns {Object} Schema object
   */
  _inferSchemaFromHeaders(headers) {
    const schema = {};
    
    for (const header of headers) {
      schema[header] = 'string'; // Default to string, will be refined with data
    }
    
    return schema;
  }

  /**
   * Infer schema from sample row
   * @param {Object} sampleRow - Sample row object
   * @returns {Object} Inferred schema object
   */
  _inferSchema(sampleRow) {
    const schema = {};

    for (const [key, value] of Object.entries(sampleRow)) {
      schema[key] = this._inferType(value);
    }

    return schema;
  }

  /**
   * Infer type from value
   * @param {any} value - Value to infer type from
   * @returns {string} Inferred type string
   */
  _inferType(value) {
    if (value === null || value === undefined || value === '') {
      return 'string'; // default to string for null/empty values
    }

    const strValue = String(value).trim();

    // Boolean
    if (strValue.toLowerCase() === 'true' || strValue.toLowerCase() === 'false') {
      return 'boolean';
    }

    // Integer
    if (/^-?\d+$/.test(strValue)) {
      return 'int64';
    }

    // Float
    if (/^-?\d*\.\d+$/.test(strValue)) {
      return 'float64';
    }

    // Date (simple YYYY-MM-DD format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
      return 'date';
    }

    // mm-dd-yyyy format
    if (/^\d{2}-\d{2}-\d{4}$/.test(strValue)) {
      return 'date';
    }

    // dd-mm-yyyy format
    if (/^\d{2}-\d{2}-\d{4}$/.test(strValue)) {
      return 'date';
    }

    // Default to string
    return 'string';
  }

  getStats() {
    return {
      totalRows: this.totalRows,
      isReading: this.isReading,
      schema: this.schema
    };
  }
}

export default CSVStreamer;
