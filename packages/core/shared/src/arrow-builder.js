import * as arrow from 'apache-arrow';
import { vectorFromArray, makeData } from 'apache-arrow';

/**
 * Optimized Arrow Builder Base Class
 *
 * This class provides efficient Apache Arrow data structure creation
 * with minimal data copying and maximum use of Arrow's native capabilities.
 *
 * Key optimizations:
 * 1. Direct Arrow vector creation without intermediate transformations
 * 2. Batch processing for better memory efficiency
 * 3. Native Arrow type inference and conversion
 * 4. Streamlined IPC serialization
 * 5. Zero-copy operations where possible
 */
export class ArrowBuilder {
  constructor(sourceSchema, options = {}) {
    if (this.constructor === ArrowBuilder) {
      throw new Error('ArrowBuilder is abstract and cannot be instantiated directly');
    }

    this.sourceSchema = sourceSchema;
    this.options = {
      recordBatchSize: options.recordBatchSize || 65536,
      nullValue: options.nullValue || null,
      ...options
    };

    this.arrowSchema = null;
    this._buildArrowSchema();
  }

  // ===== ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES =====

  /**
   * Build Arrow schema from source-specific schema format
   * Must be implemented by subclasses
   * @abstract
   */
  _buildArrowSchema() {
    throw new Error('_buildArrowSchema() must be implemented by subclass');
  }

  /**
   * Create Arrow vectors directly from source data
   * This replaces the old _transformDataToColumns method for better efficiency
   * @param {*} sourceData - Data in source-specific format
   * @returns {Array<arrow.Vector>} Array of Arrow vectors
   * @abstract
   */
  _createVectorsFromSource(_sourceData) {
    throw new Error('_createVectorsFromSource() must be implemented by subclass');
  }

  /**
   * Map source-specific type to Arrow type
   * @param {string} sourceType - Type name in source format
   * @returns {arrow.DataType} Arrow data type
   * @abstract
   */
  _mapSourceTypeToArrow(_sourceType) {
    throw new Error('_mapSourceTypeToArrow() must be implemented by subclass');
  }

  // ===== OPTIMIZED ARROW OPERATIONS =====

  /**
   * Create record batch directly from source data
   * Optimized to minimize data copying and transformations
   * @param {*} sourceData - Data in source-specific format
   * @returns {arrow.RecordBatch|null} Arrow record batch
   */
  createRecordBatch(sourceData) {
    if (!sourceData || (Array.isArray(sourceData) && sourceData.length === 0)) {
      return null;
    }

    try {
      // Create vectors directly from source data (no intermediate transformations)
      const vectors = this._createVectorsFromSource(sourceData);

      if (!vectors || vectors.length === 0) {
        return null;
      }

      // Create record batch using the correct API with makeData
      const data = makeData({
        type: new arrow.Struct(this.arrowSchema.fields),
        children: vectors.map(vector => vector.data[0])
      });

      return new arrow.RecordBatch(this.arrowSchema, data);
    } catch (error) {
      console.warn('Error creating record batch:', error);
      return null;
    }
  }

  /**
   * Create Arrow vector with optimized type handling
   * @param {arrow.DataType} arrowType - Arrow data type
   * @param {Array} data - Array of values
   * @returns {arrow.Vector} Arrow vector
   */
  _createOptimizedVector(arrowType, data) {
    try {
      // Handle type-specific conversions before creating vector
      const convertedData = this._convertDataForArrowType(arrowType, data);

      // Use Arrow's native vector creation with converted data
      return vectorFromArray(convertedData, arrowType);
    } catch (error) {
      console.warn(`Error creating vector with type ${arrowType}:`, error);

      // Fallback: convert to strings and create Utf8 vector
      const stringData = data.map(v => v === null ? null : String(v));
      return vectorFromArray(stringData, new arrow.Utf8());
    }
  }

  /**
   * Convert data for specific Arrow types
   * @param {arrow.DataType} arrowType - Arrow data type
   * @param {Array} data - Array of values
   * @returns {Array} Converted data array
   * @private
   */
  _convertDataForArrowType(arrowType, data) {
    // Handle specific type conversions
    if (arrowType instanceof arrow.Int64) {
      return data.map(v => {
        if (v === null || v === undefined) return null;
        return BigInt(v);
      });
    }

    if (arrowType instanceof arrow.Int32) {
      return data.map(v => {
        if (v === null || v === undefined) return null;
        return parseInt(v, 10);
      });
    }

    if (arrowType instanceof arrow.Float64) {
      return data.map(v => {
        if (v === null || v === undefined) return null;
        return parseFloat(v);
      });
    }

    if (arrowType instanceof arrow.Bool) {
      return data.map(v => {
        if (v === null || v === undefined) return null;
        return Boolean(v);
      });
    }

    if (arrowType instanceof arrow.DateMillisecond) {
      return data.map(v => {
        if (v === null || v === undefined) return null;
        return new Date(v);
      });
    }

    // Default: return as-is for strings and other types
    return data;
  }

  /**
   * Get the Arrow schema
   * @returns {arrow.Schema} Arrow schema
   */
  getSchema() {
    return this.arrowSchema;
  }

  /**
   * Serialize record batch directly to IPC format
   * Optimized to avoid unnecessary table creation
   * @param {arrow.RecordBatch} recordBatch - Record batch to serialize
   * @returns {Buffer|null} Serialized record batch
   */
  serializeRecordBatch(recordBatch) {
    if (!recordBatch) return null;

    try {
      // Create table directly from record batch and serialize
      const table = new arrow.Table([recordBatch]);
      return arrow.tableToIPC(table);
    } catch (error) {
      console.warn('Error serializing record batch:', error);
      return null;
    }
  }

  /**
   * Serialize schema to IPC format
   * @returns {Buffer|null} Serialized schema
   */
  serializeSchema() {
    if (!this.arrowSchema) return null;

    try {
      // Create empty table with schema and serialize
      const emptyTable = new arrow.Table(this.arrowSchema, []);
      return arrow.tableToIPC(emptyTable);
    } catch (error) {
      console.warn('Error serializing schema:', error);
      return null;
    }
  }

  /**
   * Get statistics for a record batch
   * @param {arrow.RecordBatch} recordBatch - Record batch
   * @returns {Object} Statistics object
   */
  getStats(recordBatch) {
    if (!recordBatch) return null;

    return {
      numRows: recordBatch.numRows,
      numCols: recordBatch.numCols,
      schema: recordBatch.schema,
      size: recordBatch.data.length
    };
  }

  /**
   * Create table from record batches (for compatibility)
   * @param {Array<arrow.RecordBatch>} recordBatches - Array of record batches
   * @returns {arrow.Table|null} Arrow table
   */
  createTable(recordBatches) {
    if (!Array.isArray(recordBatches) || recordBatches.length === 0) {
      return null;
    }

    return new arrow.Table(recordBatches);
  }
}

export default ArrowBuilder;
