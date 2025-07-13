/**
 * @fileoverview CSV to Apache Arrow Converter
 * 
 * Converts CSV data to Apache Arrow format with efficient memory usage
 * and streaming capabilities for large datasets.
 */

import { tableFromArrays, tableFromJSON } from 'apache-arrow';

/**
 * Arrow Converter
 * 
 * Converts CSV data to Apache Arrow format with support for streaming
 * and batch processing for memory efficiency.
 */
export class ArrowConverter {
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || 1000,
      validateData: options.validateData !== false, // default true
      optimizeMemory: options.optimizeMemory !== false, // default true
      ...options
    };
  }

  /**
   * Convert CSV rows to Arrow table
   * @param {Array<Array<any>>} rows - CSV rows
   * @param {Array<string>} headers - Column headers
   * @returns {Table} Apache Arrow table
   */
  convertToTable(rows, headers) {
    if (!headers || headers.length === 0) {
      throw new Error('Headers are required for conversion');
    }

    if (!rows || rows.length === 0) {
      return this.createEmptyTable(headers);
    }

    // Validate that all rows have the same number of columns as headers
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].length !== headers.length) {
        throw new Error(`Row ${i} has ${rows[i].length} columns but headers has ${headers.length} columns`);
      }
    }

    // Transpose rows to columns for Arrow
    const columns = {};
    headers.forEach((header, index) => {
      columns[header] = rows.map(row => row[index]);
    });

    try {
      return tableFromArrays(columns);
    } catch (error) {
      throw new Error(`Failed to create Arrow table: ${error.message}`);
    }
  }

  /**
   * Convert CSV rows to Arrow table with custom schema
   * @param {Array<Array<any>>} rows - CSV rows
   * @param {Schema} schema - Apache Arrow schema
   * @returns {Table} Apache Arrow table
   */
  convertToTableWithSchema(rows, schema) {
    if (!schema || !schema.fields) {
      throw new Error('Valid schema is required for conversion');
    }

    if (!rows || rows.length === 0) {
      return this.createEmptyTableWithSchema(schema);
    }

    // Validate that all rows have the same number of columns as schema fields
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].length !== schema.fields.length) {
        throw new Error(`Row ${i} has ${rows[i].length} columns but schema has ${schema.fields.length} fields`);
      }
    }

    // Validate data against schema if enabled
    if (this.options.validateData) {
      const validation = this.validateDataAgainstSchema(rows, schema);
      if (!validation.valid) {
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Convert data to Arrow format
    const columns = {};
    schema.fields.forEach((field, index) => {
      columns[field.name] = rows.map(row => this.convertValue(row[index], field.type));
    });

    try {
      return tableFromArrays(columns, { schema });
    } catch (error) {
      throw new Error(`Failed to create Arrow table with schema: ${error.message}`);
    }
  }

  /**
   * Convert CSV rows to Arrow record batches for streaming
   * @param {Array<Array<any>>} rows - CSV rows
   * @param {Array<string>} headers - Column headers
   * @returns {Array<RecordBatch>} Array of Arrow record batches
   */
  convertToBatches(rows, headers) {
    if (!headers || headers.length === 0) {
      throw new Error('Headers are required for conversion');
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    const batches = [];
    const batchSize = this.options.batchSize;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      const batch = this.convertToTable(batchRows, headers);
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Convert CSV rows to Arrow record batches with custom schema
   * @param {Array<Array<any>>} rows - CSV rows
   * @param {Schema} schema - Apache Arrow schema
   * @returns {Array<RecordBatch>} Array of Arrow record batches
   */
  convertToBatchesWithSchema(rows, schema) {
    if (!schema || !schema.fields) {
      throw new Error('Valid schema is required for conversion');
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    const batches = [];
    const batchSize = this.options.batchSize;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      const batch = this.convertToTableWithSchema(batchRows, schema);
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Convert a single value to Arrow-compatible format
   * @param {any} value - Value to convert
   * @param {DataType} type - Arrow data type
   * @returns {any} Converted value
   */
  convertValue(value, type) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const typeName = type.toString();

    switch (typeName) {
      case 'Bool':
        return this.convertToBoolean(value);
      case 'Int32':
      case 'Int64':
        return this.convertToInteger(value);
      case 'Float32':
      case 'Float64':
        return this.convertToFloat(value);
      case 'Utf8':
        return this.convertToString(value);
      default:
        return value;
    }
  }

  /**
   * Convert value to boolean
   * @param {any} value - Value to convert
   * @returns {boolean} Boolean value
   */
  convertToBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return ['true', '1', 'yes', 'on'].includes(lower);
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return Boolean(value);
  }

  /**
   * Convert value to integer
   * @param {any} value - Value to convert
   * @returns {number} Integer value
   */
  convertToInteger(value) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Cannot convert '${value}' to integer`);
    }
    return Math.floor(num);
  }

  /**
   * Convert value to float
   * @param {any} value - Value to convert
   * @returns {number} Float value
   */
  convertToFloat(value) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Cannot convert '${value}' to float`);
    }
    return num;
  }

  /**
   * Convert value to string
   * @param {any} value - Value to convert
   * @returns {string} String value
   */
  convertToString(value) {
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  }

  /**
   * Create empty Arrow table with headers
   * @param {Array<string>} headers - Column headers
   * @returns {Table} Empty Arrow table
   */
  createEmptyTable(headers) {
    const columns = {};
    headers.forEach(header => {
      columns[header] = [];
    });
    return tableFromArrays(columns);
  }

  /**
   * Create empty Arrow table with schema
   * @param {Schema} schema - Apache Arrow schema
   * @returns {Table} Empty Arrow table
   */
  createEmptyTableWithSchema(schema) {
    const columns = {};
    schema.fields.forEach(field => {
      columns[field.name] = [];
    });
    return tableFromArrays(columns, { schema });
  }

  /**
   * Validate data against schema
   * @param {Array<Array<any>>} rows - CSV rows
   * @param {Schema} schema - Apache Arrow schema
   * @returns {Object} Validation result
   */
  validateDataAgainstSchema(rows, schema) {
    const result = {
      valid: true,
      errors: []
    };

    const fields = schema.fields;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      if (row.length !== fields.length) {
        result.errors.push(`Row ${rowIndex}: Expected ${fields.length} columns, got ${row.length}`);
        result.valid = false;
        continue;
      }

      for (let colIndex = 0; colIndex < fields.length; colIndex++) {
        const value = row[colIndex];
        const field = fields[colIndex];

        try {
          this.validateValue(value, field);
        } catch (error) {
          result.errors.push(`Row ${rowIndex}, Column ${colIndex} (${field.name}): ${error.message}`);
          result.valid = false;
        }
      }
    }

    return result;
  }

  /**
   * Validate a single value against a field
   * @param {any} value - Value to validate
   * @param {Field} field - Arrow field definition
   * @throws {Error} If value is invalid for the field type
   */
  validateValue(value, field) {
    if (value === null || value === undefined || value === '') {
      if (!field.nullable) {
        throw new Error('Null value not allowed for non-nullable field');
      }
      return;
    }

    const type = field.type;
    const typeName = type.toString();

    try {
      switch (typeName) {
        case 'Bool':
          this.convertToBoolean(value);
          break;
        case 'Int32':
        case 'Int64':
          this.convertToInteger(value);
          break;
        case 'Float32':
        case 'Float64':
          this.convertToFloat(value);
          break;
        case 'Utf8':
          this.convertToString(value);
          break;
        default:
          // For other types, just check if value exists
          break;
      }
    } catch (error) {
      throw new Error(`Invalid value for type ${typeName}: ${error.message}`);
    }
  }
} 