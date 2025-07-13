/**
 * @fileoverview Streaming CSV Parser
 * 
 * Memory-efficient CSV parser that streams data row by row with automatic
 * header detection and configurable parsing options.
 */

import fs from 'fs';
import { Transform } from 'stream';
import { parse } from 'fast-csv';

/**
 * Streaming CSV Parser
 * 
 * Parses CSV data from files, strings, or streams with configurable options.
 * Emits events for headers, rows, and errors with proper backpressure handling.
 */
export class CSVParser extends Transform {
  constructor(options = {}) {
    super({
      objectMode: true,
      highWaterMark: options.highWaterMark || 1000
    });

    this.options = {
      delimiter: options.delimiter || ',',
      headers: options.headers !== false, // default true
      skipEmptyLines: options.skipEmptyLines !== false, // default true
      trim: options.trim !== false, // default true
      ignoreEmpty: options.ignoreEmpty !== false, // default true
      ...options
    };

    this.headers = null;
    this.rowCount = 0;
    this.isFirstRow = true;
  }

  /**
   * Parse CSV from a file path
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Object>} Parsing result with headers and row count
   */
  async parseFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = {
        headers: null,
        rowCount: 0,
        rows: [],
        errors: []
      };

      const stream = fs.createReadStream(filePath)
        .pipe(parse(this.options))
        .on('data', (row) => {
          if (this.isFirstRow && this.options.headers) {
            this.headers = Object.keys(row);
            this.isFirstRow = false;
            results.headers = this.headers;
            this.emit('headers', this.headers);
          } else {
            this.rowCount++;
            results.rowCount++;
            const rowArray = Object.values(row);
            this.emit('row', rowArray);
            this.push(rowArray);
          }
        })
        .on('error', (error) => {
          results.errors.push(error);
          this.emit('error', error);
          reject(error);
        })
        .on('end', () => {
          this.emit('end', results);
          resolve(results);
        });
    });
  }

  /**
   * Parse CSV from a string
   * @param {string} csvString - CSV data as string
   * @returns {Promise<Object>} Parsing result
   */
  async parseString(csvString) {
    return new Promise((resolve, reject) => {
      const results = {
        headers: null,
        rowCount: 0,
        rows: [],
        errors: []
      };

      const stream = parse(this.options)
        .on('data', (row) => {
          if (this.isFirstRow && this.options.headers) {
            this.headers = Object.keys(row);
            this.isFirstRow = false;
            results.headers = this.headers;
            this.emit('headers', this.headers);
            // Don't count header row
          } else {
            this.rowCount++;
            results.rowCount++;
            const rowArray = Object.values(row);
            this.emit('row', rowArray);
            this.push(rowArray);
          }
        })
        .on('error', (error) => {
          results.errors.push(error);
          this.emit('error', error);
          reject(error);
        })
        .on('end', () => {
          this.emit('end', results);
          resolve(results);
        });

      stream.write(csvString);
      stream.end();
    });
  }

  /**
   * Parse CSV from a readable stream
   * @param {ReadableStream} inputStream - Input stream
   * @returns {Promise<Object>} Parsing result
   */
  async parseStream(inputStream) {
    return new Promise((resolve, reject) => {
      const results = {
        headers: null,
        rowCount: 0,
        rows: [],
        errors: []
      };

      const stream = inputStream
        .pipe(parse(this.options))
        .on('data', (row) => {
          if (this.isFirstRow && this.options.headers) {
            this.headers = Object.keys(row);
            this.isFirstRow = false;
            results.headers = this.headers;
            this.emit('headers', this.headers);
          } else {
            this.rowCount++;
            results.rowCount++;
            const rowArray = Object.values(row);
            this.emit('row', rowArray);
            this.push(rowArray);
          }
        })
        .on('error', (error) => {
          results.errors.push(error);
          this.emit('error', error);
          reject(error);
        })
        .on('end', () => {
          this.emit('end', results);
          resolve(results);
        });
    });
  }

  /**
   * Parse CSV from a file path with streaming callbacks
   * @param {string} filePath - Path to CSV file
   * @param {Function} onRow - Callback for each row (row, rowIndex)
   * @param {Function} onHeaders - Callback for headers (headers)
   * @returns {Promise<Object>} Parsing result with metadata
   */
  async parseFileWithCallbacks(filePath, onRow, onHeaders) {
    return new Promise((resolve, reject) => {
      const results = {
        headers: null,
        rowCount: 0,
        errors: []
      };

      const stream = fs.createReadStream(filePath)
        .pipe(parse(this.options))
        .on('data', (row) => {
          if (this.isFirstRow && this.options.headers) {
            this.headers = Object.keys(row);
            this.isFirstRow = false;
            results.headers = this.headers;
            this.emit('headers', this.headers);
            if (onHeaders) {
              onHeaders(this.headers);
            }
          } else {
            this.rowCount++;
            results.rowCount++;
            const rowArray = Object.values(row);
            this.emit('row', rowArray);
            this.push(rowArray);
            if (onRow) {
              onRow(rowArray, results.rowCount - 1);
            }
          }
        })
        .on('error', (error) => {
          results.errors.push(error);
          this.emit('error', error);
          reject(error);
        })
        .on('end', () => {
          this.emit('end', results);
          resolve(results);
        });
    });
  }

  /**
   * Get current headers
   * @returns {Array<string>|null} Headers array or null if not yet parsed
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
   * Reset parser state
   */
  reset() {
    this.headers = null;
    this.rowCount = 0;
    this.isFirstRow = true;
  }
} 