import * as arrow from 'apache-arrow';

/**
 * Streamlined Arrow Builder Base Class
 *
 * This class provides a minimal, focused interface for Apache Arrow data structure creation.
 * It serves as an abstract base class that must be extended by concrete implementations
 * for specific data sources (e.g., CSV, JSON, database).
 *
 * Key features:
 * 1. Abstract schema building from source-specific formats
 * 2. Type conversion utilities for Arrow data types
 * 3. Direct IPC serialization from typed arrays
 * 4. Minimal memory footprint with focused responsibility
 *
 * Usage:
 *   class MyArrowBuilder extends ArrowBuilder {
 *     _buildArrowSchema() { // implement schema building }
 *     _mapSourceTypeToArrow(type) { // implement type mapping }
 *   }
 */
export class ArrowBuilder {
  constructor(sourceSchema, options = {}) {
    if (this.constructor === ArrowBuilder) {
      throw new Error('ArrowBuilder is abstract and cannot be instantiated directly');
    }

    this.sourceSchema = sourceSchema;
    this.options = {
      nullValue: options.nullValue || null,
      ...options
    };

    this.arrowSchema = null;
    this._buildArrowSchema();
  }

  // ===== ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES =====

  /**
   * Build Arrow schema from source-specific schema format
   * Must be implemented by subclasses to convert their schema format to Arrow schema
   * @abstract
   */
  _buildArrowSchema() {
    throw new Error('_buildArrowSchema() must be implemented by subclass');
  }

  /**
   * Map source-specific type to Arrow type
   * Must be implemented by subclasses to convert their type names to Arrow data types
   * @param {string} sourceType - Type name in source format
   * @returns {arrow.DataType} Arrow data type
   * @abstract
   */
  _mapSourceTypeToArrow(_sourceType) {
    throw new Error('_mapSourceTypeToArrow() must be implemented by subclass');
  }

  // ===== UTILITY METHODS =====

  /**
   * Get the Arrow schema
   * @returns {arrow.Schema} Arrow schema
   */
  getSchema() {
    return this.arrowSchema;
  }

  /**
   * Serialize typed arrays directly to IPC format
   * Optimized for direct serialization without intermediate record batch creation
   * @param {Array} typedArrays - Array of typed arrays (e.g., Int32Array, Float64Array)
   * @returns {Buffer} Serialized IPC data
   */
  serializeFromArrays(typedArrays) {
    try {
      // Create record batch directly from typed arrays
      const recordBatch = arrow.RecordBatch.new(typedArrays, this.arrowSchema);
      
      // Serialize record batch to IPC format
      return arrow.RecordBatch.toIPC(recordBatch);
    } catch (error) {
      // Fallback to original method if direct serialization fails
      console.warn('Direct IPC serialization failed, using fallback:', error.message);
      return arrow.tableToIPC(arrow.tableFromArrays(typedArrays));
    }
  }
}

export default ArrowBuilder;
