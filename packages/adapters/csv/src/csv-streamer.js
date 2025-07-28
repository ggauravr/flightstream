import fs from 'fs';
import { parse } from 'fast-csv';
import { EventEmitter } from 'events';

/**
 * CSV Streamer
 *
 * This class handles streaming CSV files and converting them to structured data.
 * It provides batch processing, schema inference, and optimized string batch emission
 * specifically designed for CSV data sources.
 *
 * Features:
 * 1. Streaming CSV parsing for memory efficiency
 * 2. Automatic schema inference from headers and data
 * 3. String batch emission (type conversion handled by Arrow Builder)
 * 4. Configurable batch processing
 * 5. Error handling for malformed rows
 */
export class CSVStreamer extends EventEmitter {
  constructor(filePath, options = {}) {
    super();
    this.filePath = filePath;
    this.options = {
      batchSize: options.batchSize || 10000,
      delimiter: options.delimiter || ',',
      headers: options.headers !== false, // default true
      skipEmptyLines: options.skipEmptyLines !== false, // default true
      ...options
    };

    this.currentBatch = [];
    this.totalRows = 0;
    this.schema = null;
    this.isReading = false;
  }

  async start() {
    if (this.isReading) {
      throw new Error('CSV streaming is already in progress');
    }

    this.isReading = true;
    this.emit('start');

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filePath)
        .pipe(parse({
          headers: this.options.headers,
          delimiter: this.options.delimiter,
          skipEmptyLines: this.options.skipEmptyLines
        }));

      stream.on('error', (error) => {
        this.isReading = false;
        this.emit('error', error);
        reject(error);
      });

      stream.on('data', (row) => {
        try {
          // Infer schema from first row if not already done
          if (!this.schema && this.options.headers) {
            this.schema = this._inferSchema(row);
            this.emit('schema', this.schema);
          }

          // Store raw string row without type conversion
          this.currentBatch.push(row);
          this.totalRows++;

          // Emit batch when batch size is reached
          if (this.currentBatch.length >= this.options.batchSize) {
            this.emit('batch', [...this.currentBatch]);
            this.currentBatch = [];
          }
        } catch (error) {
          this.emit('row-error', { row, error: error.message });
          // Continue processing other rows
        }
      });

      stream.on('end', () => {
        // Emit final batch if there are remaining rows
        if (this.currentBatch.length > 0) {
          this.emit('batch', [...this.currentBatch]);
          this.currentBatch = [];
        }

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

  _inferSchema(sampleRow) {
    const schema = {};

    for (const [key, value] of Object.entries(sampleRow)) {
      schema[key] = this._inferType(value);
    }

    return schema;
  }

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
      schema: this.schema,
      batchSize: this.options.batchSize
    };
  }
}

export default CSVStreamer;
