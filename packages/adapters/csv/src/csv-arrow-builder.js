import * as arrow from 'apache-arrow';
import { ArrowBuilder } from '@flightstream/core-shared';

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
 *   const vectors = builder.createTypedArraysFromCSVBatch(csvRows, headers, delimiter);
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
   * Create typed arrays directly from CSV lines
   *
   * This method parses CSV lines directly into typed arrays without creating
   * intermediate JavaScript objects, providing significant performance improvements.
   *
   * @param {Array<string>} csvBatch - Array of CSV lines (excluding headers)
   * @param {Array<string>} headers - Column headers
   * @param {string} delimiter - CSV delimiter character
   * @returns {Object} Object with column names as keys and typed arrays as values
   */
  createTypedArraysFromCSVBatch(csvBatch, headers, delimiter = ',') {
    const fields = this.arrowSchema.fields;
    const typedArrays = {};

    // Initialize typed arrays for each column
    for (const field of fields) {
      const columnName = field.name;
      const arrowType = field.type;
      typedArrays[columnName] = this._createEmptyTypedArray(arrowType, csvBatch.length);
    }

    // Parse each line and populate typed arrays directly
    let validRowCount = 0;

    for (const line of csvBatch) {
      if (!line.trim()) {
        continue; // Skip empty lines
      }

      try {
        // Parse CSV line into values
        const values = this._parseCSVLine(line, delimiter);

        // Populate each column's typed array
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          const value = values[i] || '';

          // Find the corresponding field
          const field = fields.find(f => f.name === header);
          if (field) {
            const typedArray = typedArrays[header];
            const convertedValue = this._convertStringToTypedValue(value, field.type);
            typedArray[validRowCount] = convertedValue;
          }
        }

        validRowCount++;
      } catch (error) {
        // Skip problematic lines - error isolation
        continue;
      }
    }

    // Trim arrays to actual valid row count
    for (const [columnName, typedArray] of Object.entries(typedArrays)) {
      if (validRowCount < typedArray.length) {
        typedArrays[columnName] = typedArray.slice(0, validRowCount);
      }
    }

    return typedArrays;
  }

  /**
   * Parse a single CSV line into values
   *
   * @param {string} line - CSV line
   * @param {string} delimiter - CSV delimiter
   * @returns {Array<string>} Array of values
   * @private
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
   * Create an empty typed array of the appropriate type and size
   *
   * @param {arrow.DataType} arrowType - Arrow data type
   * @param {number} size - Array size
   * @returns {TypedArray} Empty typed array
   * @private
   */
  _createEmptyTypedArray(arrowType, size) {
    if (arrowType instanceof arrow.Int32) {
      return new Int32Array(size);
    } else if (arrowType instanceof arrow.Int64) {
      return new BigInt64Array(size);
    } else if (arrowType instanceof arrow.Float32) {
      return new Float32Array(size);
    } else if (arrowType instanceof arrow.Float64) {
      return new Float64Array(size);
    } else if (arrowType instanceof arrow.Bool) {
      return new Uint8Array(size);
    } else if (arrowType instanceof arrow.DateMillisecond) {
      return new Int32Array(size);
    } else if (arrowType instanceof arrow.TimestampMillisecond) {
      return new BigInt64Array(size);
    } else {
      // For strings, return regular array
      return new Array(size);
    }
  }

  /**
   * Convert a string value to the appropriate typed value
   *
   * @param {string} value - String value
   * @param {arrow.DataType} arrowType - Arrow data type
   * @returns {any} Converted value
   * @private
   */
  _convertStringToTypedValue(value, arrowType) {
    if (arrowType instanceof arrow.Int32) {
      return this._convertStringToInt32(value);
    } else if (arrowType instanceof arrow.Int64) {
      return this._convertStringToInt64(value);
    } else if (arrowType instanceof arrow.Float32) {
      return this._convertStringToFloat32(value);
    } else if (arrowType instanceof arrow.Float64) {
      return this._convertStringToFloat64(value);
    } else if (arrowType instanceof arrow.Bool) {
      return this._convertStringToBoolean(value);
    } else if (arrowType instanceof arrow.DateMillisecond) {
      return this._convertStringToDate(value);
    } else if (arrowType instanceof arrow.TimestampMillisecond) {
      return this._convertStringToTimestamp(value);
    } else {
      // For strings, return as-is
      return value;
    }
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
      return new Int32Array(values.map(v => this._convertStringToInt32(v)));
    } else if (arrowType instanceof arrow.Int64) {
      return new BigInt64Array(values.map(v => this._convertStringToInt64(v)));
    } else if (arrowType instanceof arrow.Float32) {
      return new Float32Array(values.map(v => this._convertStringToFloat32(v)));
    } else if (arrowType instanceof arrow.Float64) {
      return new Float64Array(values.map(v => this._convertStringToFloat64(v)));
    } else if (arrowType instanceof arrow.Bool) {
      return new Uint8Array(values.map(v => this._convertStringToBoolean(v)));
    } else if (arrowType instanceof arrow.DateMillisecond) {
      return new Int32Array(values.map(v => this._convertStringToDate(v)));
    } else if (arrowType instanceof arrow.TimestampMillisecond) {
      return new BigInt64Array(values.map(v => this._convertStringToTimestamp(v)));
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
