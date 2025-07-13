/**
 * @fileoverview Utility Functions for CSV to Arrow Conversion
 * 
 * Common utility functions for performance monitoring, data validation,
 * and helper operations for the CSV to Arrow streaming package.
 */

import fs from 'fs';
import path from 'path';

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      rowCount: 0,
      batchCount: 0,
      memoryUsage: [],
      processingTimes: []
    };
  }

  /**
   * Start performance monitoring
   */
  start() {
    this.metrics.startTime = Date.now();
    this.metrics.memoryUsage.push(process.memoryUsage());
  }

  /**
   * End performance monitoring
   */
  end() {
    this.metrics.endTime = Date.now();
    this.metrics.memoryUsage.push(process.memoryUsage());
  }

  /**
   * Record batch processing
   * @param {number} batchSize - Size of the batch
   * @param {number} processingTime - Time taken to process batch
   */
  recordBatch(batchSize, processingTime) {
    this.metrics.batchCount++;
    this.metrics.rowCount += batchSize;
    this.metrics.processingTimes.push(processingTime);
  }

  /**
   * Get performance summary
   * @returns {Object} Performance metrics
   */
  getSummary() {
    const totalTime = this.metrics.endTime - this.metrics.startTime;
    const avgProcessingTime = this.metrics.processingTimes.length > 0 
      ? this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length
      : 0;

    const initialMemory = this.metrics.memoryUsage[0];
    const finalMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const memoryIncrease = finalMemory ? {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    } : null;

    return {
      totalTime: totalTime,
      totalRows: this.metrics.rowCount,
      totalBatches: this.metrics.batchCount,
      rowsPerSecond: totalTime > 0 ? (this.metrics.rowCount / totalTime) * 1000 : 0,
      avgBatchProcessingTime: avgProcessingTime,
      memoryIncrease: memoryIncrease,
      memoryUsage: this.metrics.memoryUsage
    };
  }

  /**
   * Reset performance metrics
   */
  reset() {
    this.metrics = {
      startTime: null,
      endTime: null,
      rowCount: 0,
      batchCount: 0,
      memoryUsage: [],
      processingTimes: []
    };
  }
}

/**
 * Data validation utilities
 */
export class DataValidator {
  /**
   * Validate CSV file exists and is readable
   * @param {string} filePath - Path to CSV file
   * @returns {Object} Validation result
   */
  static validateFile(filePath) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      if (!fs.existsSync(filePath)) {
        result.valid = false;
        result.errors.push(`File does not exist: ${filePath}`);
        return result;
      }

      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        result.valid = false;
        result.errors.push(`Path is not a file: ${filePath}`);
        return result;
      }

      if (stats.size === 0) {
        result.warnings.push(`File is empty: ${filePath}`);
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.csv') {
        result.warnings.push(`File extension is not .csv: ${ext}`);
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Error accessing file: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate CSV data structure
   * @param {Array<Array<any>>} rows - CSV rows
   * @param {Array<string>} headers - Column headers
   * @returns {Object} Validation result
   */
  static validateDataStructure(rows, headers) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!headers || headers.length === 0) {
      result.valid = false;
      result.errors.push('No headers provided');
      return result;
    }

    if (!rows || rows.length === 0) {
      result.warnings.push('No data rows provided');
      return result;
    }

    const expectedColumns = headers.length;
    let inconsistentRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length !== expectedColumns) {
        result.errors.push(`Row ${i + 1}: Expected ${expectedColumns} columns, got ${row.length}`);
        result.valid = false;
        inconsistentRows++;
      }
    }

    if (inconsistentRows > 0) {
      result.warnings.push(`${inconsistentRows} rows have inconsistent column counts`);
    }

    return result;
  }

  /**
   * Validate CSV options
   * @param {Object} options - CSV parsing options
   * @returns {Object} Validation result
   */
  static validateOptions(options) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (options.batchSize && (typeof options.batchSize !== 'number' || options.batchSize <= 0)) {
      result.valid = false;
      result.errors.push('batchSize must be a positive number');
    }

    if (options.sampleSize && (typeof options.sampleSize !== 'number' || options.sampleSize <= 0)) {
      result.valid = false;
      result.errors.push('sampleSize must be a positive number');
    }

    if (options.delimiter && typeof options.delimiter !== 'string') {
      result.valid = false;
      result.errors.push('delimiter must be a string');
    }

    return result;
  }
}

/**
 * File utilities
 */
export class FileUtils {
  /**
   * Get file information
   * @param {string} filePath - Path to file
   * @returns {Object} File information
   */
  static getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      return {
        exists: true,
        isFile: stats.isFile(),
        size: stats.size,
        extension: ext,
        name: path.basename(filePath),
        directory: path.dirname(filePath),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Estimate file size in human readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Human readable size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if file is CSV based on content
   * @param {string} filePath - Path to file
   * @returns {Promise<boolean>} True if file appears to be CSV
   */
  static async isCSVFile(filePath) {
    return new Promise((resolve) => {
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      let firstChunk = '';
      
      stream.on('data', (chunk) => {
        firstChunk += chunk;
        if (firstChunk.length > 1024) {
          stream.destroy();
        }
      });
      
      stream.on('end', () => {
        // Simple heuristic: check for comma-separated values
        const lines = firstChunk.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          resolve(false);
          return;
        }
        
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;
        
        // If we have multiple commas or tabs, it's likely CSV
        resolve(commaCount > 0 || tabCount > 0);
      });
      
      stream.on('error', () => {
        resolve(false);
      });
    });
  }
}

/**
 * Data transformation utilities
 */
export class DataTransform {
  /**
   * Normalize column names
   * @param {Array<string>} headers - Raw headers
   * @returns {Array<string>} Normalized headers
   */
  static normalizeHeaders(headers) {
    return headers.map(header => {
      return header
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    });
  }

  /**
   * Clean CSV data
   * @param {Array<Array<any>>} rows - Raw CSV rows
   * @param {Object} options - Cleaning options
   * @returns {Array<Array<any>>} Cleaned rows
   */
  static cleanData(rows, options = {}) {
    const {
      trim = true,
      removeEmptyRows = true,
      removeNullColumns = false
    } = options;

    let cleanedRows = rows;

    if (trim) {
      cleanedRows = cleanedRows.map(row => 
        row.map(cell => typeof cell === 'string' ? cell.trim() : cell)
      );
    }

    if (removeEmptyRows) {
      cleanedRows = cleanedRows.filter(row => 
        row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );
    }

    if (removeNullColumns) {
      const columnHasData = new Array(cleanedRows[0]?.length || 0).fill(false);
      
      cleanedRows.forEach(row => {
        row.forEach((cell, index) => {
          if (cell !== null && cell !== undefined && cell !== '') {
            columnHasData[index] = true;
          }
        });
      });

      cleanedRows = cleanedRows.map(row => 
        row.filter((_, index) => columnHasData[index])
      );
    }

    return cleanedRows;
  }

  /**
   * Convert data types based on schema
   * @param {Array<Array<any>>} rows - CSV rows
   * @param {Array<string>} headers - Column headers
   * @param {Object} typeMap - Type mapping for columns
   * @returns {Array<Array<any>>} Converted rows
   */
  static convertDataTypes(rows, headers, typeMap) {
    return rows.map(row => 
      row.map((cell, index) => {
        const header = headers[index];
        const targetType = typeMap[header];
        
        if (!targetType) return cell;
        
        try {
          switch (targetType) {
            case 'number':
              return cell === '' ? null : Number(cell);
            case 'integer':
              return cell === '' ? null : Math.floor(Number(cell));
            case 'boolean':
              if (cell === '') return null;
              if (typeof cell === 'boolean') return cell;
              const lower = String(cell).toLowerCase();
              return ['true', '1', 'yes', 'on'].includes(lower);
            case 'string':
              return cell === null || cell === undefined ? '' : String(cell);
            default:
              return cell;
          }
        } catch (error) {
          return cell; // Return original value if conversion fails
        }
      })
    );
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  /**
   * Create a standardized error object
   * @param {Error} error - Original error
   * @param {string} context - Error context
   * @returns {Object} Standardized error object
   */
  static createError(error, context = '') {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle CSV parsing errors gracefully
   * @param {Error} error - Parsing error
   * @param {number} rowNumber - Row number where error occurred
   * @returns {Object} Error information
   */
  static handleParsingError(error, rowNumber) {
    return {
      type: 'parsing_error',
      row: rowNumber,
      message: error.message,
      recoverable: true
    };
  }

  /**
   * Handle schema inference errors
   * @param {Error} error - Schema error
   * @returns {Object} Error information
   */
  static handleSchemaError(error) {
    return {
      type: 'schema_error',
      message: error.message,
      recoverable: false
    };
  }
} 