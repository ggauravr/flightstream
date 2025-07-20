import * as arrow from 'apache-arrow';
import { ArrowBuilder } from '@flightstream/core-shared';

/**
 * CSV-Specific Arrow Builder
 *
 * This class extends the streamlined ArrowBuilder to provide CSV-specific data processing.
 * It implements the abstract methods required by ArrowBuilder and adds CSV-specific
 * typed array creation for efficient streaming.
 *
 * Key features:
 * 1. CSV schema to Arrow schema conversion
 * 2. CSV type mapping to Arrow data types
 * 3. Optimized typed array creation from CSV batches
 * 4. Direct IPC serialization for streaming
 *
 * Usage:
 *   const csvSchema = { id: 'int64', name: 'string', price: 'float64' };
 *   const builder = new CSVArrowBuilder(csvSchema);
 *   const typedArrays = builder._createArrowTypedArrayFromCSVBatch(csvRows);
 *   const serialized = builder.serializeFromArrays(typedArrays);
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

  // ===== CUSTOM METHODS =====

  /**
   * Create typed arrays from CSV batch data
   * Optimized for direct serialization without intermediate record batch creation
   * @param {Array<Object>} csvBatch - Array of CSV row objects
   * @returns {Array} Array of typed arrays (Int32Array, Float64Array, etc.)
   */
  _createArrowTypedArrayFromCSVBatch(csvBatch) {
    const batchSize = csvBatch.length;
    const fields = this.arrowSchema.fields;
    const typedArrays = new Array(fields.length);
    
    // Pre-allocate column data arrays for single-pass extraction
    const columnData = {};
    for (const field of fields) {
      columnData[field.name] = new Array(batchSize);
    }
    
    // Single-pass extraction: extract all columns at once
    for (let i = 0; i < batchSize; i++) {
      const row = csvBatch[i];
      for (const field of fields) {
        columnData[field.name][i] = row[field.name];
      }
    }
    
    // Schema-aware optimization: process by type for better performance
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const arrowType = field.type;
      const data = columnData[field.name];
      
      // Type-specific optimizations
      if (arrowType instanceof arrow.Int32) {
        const typedArray = new Int32Array(batchSize);
        for (let j = 0; j < batchSize; j++) {
          typedArray[j] = data[j] === null || data[j] === undefined ? 0 : parseInt(data[j], 10);
        }
        typedArrays[i] = typedArray;
      } else if (arrowType instanceof arrow.Float64) {
        const typedArray = new Float64Array(batchSize);
        for (let j = 0; j < batchSize; j++) {
          typedArray[j] = data[j] === null || data[j] === undefined ? 0 : parseFloat(data[j]);
        }
        typedArrays[i] = typedArray;
      } else if (arrowType instanceof arrow.Bool) {
        const typedArray = new Uint8Array(batchSize);
        for (let j = 0; j < batchSize; j++) {
          typedArray[j] = data[j] === null || data[j] === undefined ? 0 : Boolean(data[j]) ? 1 : 0;
        }
        typedArrays[i] = typedArray;
      } else {
        // Fallback to utility method for other types
        typedArrays[i] = this._convertDataForArrowType(arrowType, data);
      }
    }

    return typedArrays;
  }
}

export default CSVArrowBuilder;
