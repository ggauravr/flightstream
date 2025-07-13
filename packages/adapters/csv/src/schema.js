/**
 * @fileoverview Schema Inference for CSV Data
 * 
 * Automatically infers Apache Arrow schema from CSV headers and sample data.
 * Supports type detection, null handling, and schema validation.
 */

import { DataType, Field, Schema, Utf8, Bool, Int32, Int64, Float32, Float64 } from 'apache-arrow';

/**
 * Schema Inference Engine
 * 
 * Analyzes CSV data to automatically determine the appropriate Apache Arrow schema.
 * Uses sampling and type detection to create optimal schemas for performance.
 */
export class SchemaInference {
  constructor(options = {}) {
    this.options = {
      sampleSize: options.sampleSize || 1000,
      maxStringLength: options.maxStringLength || 1000,
      preferString: options.preferString || false,
      allowNulls: options.allowNulls !== false, // default true
      ...options
    };

    this.typeDetector = new TypeDetector(this.options);
  }

  /**
   * Infer schema from CSV headers and sample data
   * @param {Array<string>} headers - CSV column headers
   * @param {Array<Array<any>>} sampleData - Sample rows for type inference
   * @returns {Schema} Apache Arrow schema
   */
  inferSchema(headers, sampleData) {
    if (!headers || headers.length === 0) {
      throw new Error('Headers are required for schema inference');
    }

    const fields = headers.map((header, index) => {
      const columnData = sampleData.map(row => row[index]);
      const arrowType = this.typeDetector.detectType(columnData);
      
      return new Field(header, arrowType, this.options.allowNulls);
    });

    return new Schema(fields);
  }

  /**
   * Infer schema from CSV parser results
   * @param {Object} parserResult - Result from CSVParser
   * @returns {Schema} Apache Arrow schema
   */
  inferSchemaFromParser(parserResult) {
    if (!parserResult.headers) {
      throw new Error('Parser result must include headers');
    }

    // Collect sample data from parser events
    const sampleData = [];
    const maxSampleSize = Math.min(this.options.sampleSize, parserResult.rowCount || 0);

    return new Promise((resolve, reject) => {
      const parser = new CSVParser();
      
      parser.on('row', (row) => {
        if (sampleData.length < maxSampleSize) {
          sampleData.push(row);
        }
      });

      parser.on('end', () => {
        try {
          const schema = this.inferSchema(parserResult.headers, sampleData);
          resolve(schema);
        } catch (error) {
          reject(error);
        }
      });

      parser.on('error', reject);
    });
  }

  /**
   * Validate schema against data
   * @param {Schema} schema - Apache Arrow schema
   * @param {Array<Array<any>>} data - Data to validate
   * @returns {Object} Validation result with errors and warnings
   */
  validateSchema(schema, data) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!data || data.length === 0) {
      result.warnings.push('No data provided for validation');
      return result;
    }

    const fields = schema.fields;
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
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
    if (value === null || value === undefined) {
      if (!field.nullable) {
        throw new Error('Null value not allowed for non-nullable field');
      }
      return;
    }

    const type = field.type;
    
    switch (type.toString()) {
      case 'Int32':
      case 'Int64':
        if (!Number.isInteger(Number(value))) {
          throw new Error(`Expected integer, got ${typeof value}: ${value}`);
        }
        break;
      case 'Float32':
      case 'Float64':
        if (isNaN(Number(value))) {
          throw new Error(`Expected number, got ${typeof value}: ${value}`);
        }
        break;
      case 'Bool':
        if (typeof value !== 'boolean' && !['true', 'false', '0', '1'].includes(String(value).toLowerCase())) {
          throw new Error(`Expected boolean, got ${typeof value}: ${value}`);
        }
        break;
      case 'Utf8':
        if (typeof value !== 'string') {
          throw new Error(`Expected string, got ${typeof value}: ${value}`);
        }
        break;
      default:
        // For other types, just check if value exists
        break;
    }
  }
}

/**
 * Type Detection Engine
 * 
 * Analyzes column data to determine the most appropriate Apache Arrow data type.
 */
class TypeDetector {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Detect the best Arrow type for a column of data
   * @param {Array<any>} columnData - Column values
   * @returns {DataType} Apache Arrow data type
   */
  detectType(columnData) {
    if (!columnData || columnData.length === 0) {
      return new Utf8();
    }

    const nonNullValues = columnData.filter(value => 
      value !== null && value !== undefined && value !== ''
    );

    if (nonNullValues.length === 0) {
      return new Utf8();
    }

    // Check if all values are booleans
    if (this.isBooleanColumn(nonNullValues)) {
      return new Bool();
    }

    // Check if all values are integers
    if (this.isIntegerColumn(nonNullValues)) {
      return this.getIntegerType(nonNullValues);
    }

    // Check if all values are numbers
    if (this.isNumberColumn(nonNullValues)) {
      return this.getFloatType(nonNullValues);
    }

    // Default to string
    return new Utf8();
  }

  /**
   * Check if column contains only boolean values
   * @param {Array<any>} values - Column values
   * @returns {boolean} True if all values are boolean
   */
  isBooleanColumn(values) {
    return values.every(value => {
      if (typeof value === 'boolean') return true;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return ['true', 'false', '0', '1', 'yes', 'no'].includes(lower);
      }
      if (typeof value === 'number') {
        return value === 0 || value === 1;
      }
      return false;
    });
  }

  /**
   * Check if column contains only integer values
   * @param {Array<any>} values - Column values
   * @returns {boolean} True if all values are integers
   */
  isIntegerColumn(values) {
    return values.every(value => {
      const num = Number(value);
      return Number.isInteger(num) && !isNaN(num);
    });
  }

  /**
   * Check if column contains only numeric values
   * @param {Array<any>} values - Column values
   * @returns {boolean} True if all values are numbers
   */
  isNumberColumn(values) {
    return values.every(value => {
      const num = Number(value);
      return !isNaN(num);
    });
  }

  /**
   * Get appropriate integer type based on value range
   * @param {Array<any>} values - Column values
   * @returns {DataType} Integer data type
   */
  getIntegerType(values) {
    const numbers = values.map(v => Number(v));
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    if (min >= -2147483648 && max <= 2147483647) {
      return new Int32();
    } else {
      return new Int64();
    }
  }

  /**
   * Get appropriate float type based on precision needs
   * @param {Array<any>} values - Column values
   * @returns {DataType} Float data type
   */
  getFloatType(values) {
    // For now, default to Float64 for better precision
    // Could be optimized based on actual precision needs
    return new Float64();
  }
} 