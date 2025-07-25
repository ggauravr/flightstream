import * as arrow from 'apache-arrow';
import { ArrowBuilder } from '@flightstream/core-shared';
import { vectorFromArray } from 'apache-arrow';

/**
 * Optimized CSV-Specific Arrow Builder
 *
 * This class extends the streamlined ArrowBuilder to provide CSV-specific data processing.
 * It leverages Apache Arrow's native string-to-vector conversion for maximum performance.
 *
 * Key features:
 * 1. Direct CSV string to Arrow vector conversion using Arrow's built-in type conversion
 * 2. CSV type mapping to Arrow data types
 * 3. Zero-copy batch processing without intermediate conversions
 * 4. Direct IPC serialization for streaming
 *
 * Usage:
 *   const csvSchema = { id: 'int64', name: 'string', price: 'float64' };
 *   const builder = new CSVArrowBuilder(csvSchema);
 *   const vectors = builder.createTypedArraysFromStringBatch(csvRows);
 *   const serialized = builder.serializeFromArrays(vectors);
 */
export class CSVArrowBuilder extends ArrowBuilder {
  constructor(csvSchema, options = {}) {
    super(csvSchema, options);
    this.csvSchema = csvSchema;
  }

  // ===== IMPLEMENTATION OF ABSTRACT METHODS =====

  /**
   * Build Arrow schema from CSV schema format
   * Converts CSV column type names to Arrow field definitions
   * @override
   */
  _buildArrowSchema() {
    const fields = [];

    for (const [columnName, csvType] of Object.entries(this.sourceSchema)) {
      const arrowType = this._mapSourceTypeToArrow(csvType);
      fields.push(arrow.Field.new(columnName, arrowType, true)); // nullable = true
    }

    this.arrowSchema = new arrow.Schema(fields);
  }

  /**
   * Map CSV type names to Arrow types
   * Converts CSV type strings to corresponding Arrow data types
   * @param {string} csvType - CSV type name (e.g., 'int64', 'string', 'float64')
   * @returns {arrow.DataType} Arrow data type
   * @override
   */
  _mapSourceTypeToArrow(csvType) {
    switch (csvType) {
    case 'boolean':
      return new arrow.Bool();
    case 'int32':
      return new arrow.Int32();
    case 'int64':
      return new arrow.Int64();
    case 'float32':
      return new arrow.Float32();
    case 'float64':
      return new arrow.Float64();
    case 'date':
      return new arrow.DateMillisecond();
    case 'timestamp':
      return new arrow.TimestampMillisecond();
    case 'string':
    default:
      return new arrow.Utf8();
    }
  }

  // ===== OPTIMIZED METHODS =====

  /**
   * Create typed arrays directly from CSV string batch data
   * Optimized for direct string-to-typed-array conversion
   * @param {Array<Object>} csvBatch - Array of CSV row objects with string values
   * @returns {Object} Object with column names as keys and typed arrays as values
   */
  createTypedArraysFromStringBatch(csvBatch) {
    const fields = this.arrowSchema.fields;
    const typedArrays = {};

    // Extract column data efficiently
    for (const field of fields) {
      const columnName = field.name;
      const arrowType = field.type;
      
      // Extract column values
      const columnValues = csvBatch.map(row => row[columnName]);
      
      // Convert to typed arrays directly (much faster than vectorFromArray)
      typedArrays[columnName] = this._convertToTypedArray(columnValues, arrowType);
    }

    return typedArrays;
  }

  /**
   * Convert string values to typed arrays efficiently
   * @param {Array<string>} values - Array of string values
   * @param {arrow.DataType} arrowType - Arrow data type
   * @returns {TypedArray} Typed array
   * @private
   */
  _convertToTypedArray(values, arrowType) {
    if (arrowType instanceof arrow.Int32) {
      return Int32Array.from(values, parseInt);
      // return new Int32Array(values.map(v => this._convertStringToInt32(v)));
    } else if (arrowType instanceof arrow.Int64) {
      return BigInt64Array.from(values, BigInt);
      // return new BigInt64Array(values.map(v => this._convertStringToInt64(v)));
    } else if (arrowType instanceof arrow.Float32) {
      return Float32Array.from(values, parseFloat);
      // return new Float32Array(values.map(v => this._convertStringToFloat32(v)));
    } else if (arrowType instanceof arrow.Float64) {
      return Float64Array.from(values, parseFloat);
      // return new Float64Array(values.map(v => this._convertStringToFloat64(v)));
    } else if (arrowType instanceof arrow.Bool) {
      return Uint8Array.from(values, v => v === 'true' ? 1 : 0);
      // return new Uint8Array(values.map(v => this._convertStringToBoolean(v)));
    } else if (arrowType instanceof arrow.DateMillisecond) {
      return Int32Array.from(values, v => new Date(v));
      // return new Int32Array(values.map(v => this._convertStringToDate(v)));
    } else if (arrowType instanceof arrow.TimestampMillisecond) {
      return BigInt64Array.from(values, v => new Date(v));
      // return new BigInt64Array(values.map(v => this._convertStringToTimestamp(v)));
    } else {
      // For strings, return as array (Arrow will handle conversion)
      return values;
    }
  }

  // ===== DIRECT CONVERSION METHODS =====

  /**
   * Convert string directly to Int32
   * @param {string} value - String value
   * @returns {number} Int32 value
   * @private
   */
  _convertStringToInt32(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const strValue = String(value).trim();
    return strValue === '' ? 0 : parseInt(strValue, 10) || 0;
  }

  /**
   * Convert string directly to Int64
   * @param {string} value - String value
   * @returns {bigint} Int64 value
   * @private
   */
  _convertStringToInt64(value) {
    if (value === null || value === undefined || value === '') {
      return BigInt(0);
    }
    const strValue = String(value).trim();
    return strValue === '' ? BigInt(0) : BigInt(strValue) || BigInt(0);
  }

  /**
   * Convert string directly to Float32
   * @param {string} value - String value
   * @returns {number} Float32 value
   * @private
   */
  _convertStringToFloat32(value) {
    if (value === null || value === undefined || value === '') {
      return 0.0;
    }
    const strValue = String(value).trim();
    return strValue === '' ? 0.0 : parseFloat(strValue) || 0.0;
  }

  /**
   * Convert string directly to Float64
   * @param {string} value - String value
   * @returns {number} Float64 value
   * @private
   */
  _convertStringToFloat64(value) {
    if (value === null || value === undefined || value === '') {
      return 0.0;
    }
    const strValue = String(value).trim();
    return strValue === '' ? 0.0 : parseFloat(strValue) || 0.0;
  }

  /**
   * Convert string directly to Boolean
   * @param {string} value - String value
   * @returns {number} Boolean as 0 or 1
   * @private
   */
  _convertStringToBoolean(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const strValue = String(value).trim().toLowerCase();
    return strValue === 'true' ? 1 : 0;
  }

  /**
   * Convert string directly to Date (milliseconds since epoch)
   * @param {string} value - String value
   * @returns {number} Date in milliseconds
   * @private
   */
  _convertStringToDate(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const strValue = String(value).trim();
    if (strValue === '') return 0;
    
    try {
      const date = new Date(strValue);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Convert string directly to Timestamp (milliseconds since epoch)
   * @param {string} value - String value
   * @returns {bigint} Timestamp in milliseconds as BigInt
   * @private
   */
  _convertStringToTimestamp(value) {
    if (value === null || value === undefined || value === '') {
      return BigInt(0);
    }
    const strValue = String(value).trim();
    if (strValue === '') return BigInt(0);
    
    try {
      const date = new Date(strValue);
      const timestamp = isNaN(date.getTime()) ? 0 : date.getTime();
      return BigInt(timestamp);
    } catch (error) {
      return BigInt(0);
    }
  }

}

export default CSVArrowBuilder;
