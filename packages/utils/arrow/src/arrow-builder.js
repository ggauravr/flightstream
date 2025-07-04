import * as arrow from 'apache-arrow';
import { vectorFromArray, makeData } from 'apache-arrow';
import { getTypeTransformer } from './type-system/index.js';

/**
 * Abstract Arrow Builder Base Class
 *
 * This abstract class provides the generic infrastructure for building Apache Arrow
 * data structures from various data sources. It handles the common Arrow operations
 * while requiring subclasses to implement data source-specific logic.
 *
 * Generic features provided:
 * 1. Arrow vector creation from column arrays
 * 2. Record batch construction with proper batching
 * 3. Type-safe data conversion utilities
 * 4. IPC serialization for Flight protocol
 * 5. Error handling for type conversion edge cases
 * 6. Table creation and schema management
 * 7. Dynamic type support with runtime extensibility
 *
 * Subclasses must implement:
 * - _buildArrowSchema(): Create Arrow schema from source schema
 * - _transformDataToColumns(): Convert source data format to column arrays
 * - _mapSourceTypeToArrow(): Map source types to Arrow types
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
   * Transform source-specific data structure to column arrays
   * @param {*} sourceData - Data in source-specific format (CSV rows, SQL result, etc.)
   * @returns {Object} Column data as { columnName: [values...] }
   * @abstract
   */
  _transformDataToColumns(_sourceData) {
    throw new Error('_transformDataToColumns() must be implemented by subclass');
  }

  /**
   * Map source-specific type to Arrow type
   * @param {string} sourceType - Type name in source format ('csv', 'postgresql', etc.)
   * @returns {arrow.DataType} Arrow data type
   * @abstract
   */
  _mapSourceTypeToArrow(_sourceType) {
    throw new Error('_mapSourceTypeToArrow() must be implemented by subclass');
  }

  // ===== GENERIC ARROW OPERATIONS - PROVIDED BY BASE CLASS =====

  /**
   * Create record batch from source data
   * Template method that uses abstract methods for source-specific transformations
   * @param {*} sourceData - Data in source-specific format
   * @returns {arrow.RecordBatch|null} Arrow record batch
   */
  createRecordBatch(sourceData) {
    if (!sourceData || (Array.isArray(sourceData) && sourceData.length === 0)) {
      return null;
    }

    // Use abstract method to transform source data to columns
    const columnData = this._transformDataToColumns(sourceData);

    // Create Arrow vectors using generic logic
    return this.createRecordBatchFromColumns(columnData);
  }

  /**
   * Create record batch from column data arrays
   * Generic method that can be used by any data source
   * @param {Object} columnData - Column data as { columnName: [values...] }
   * @returns {arrow.RecordBatch|null} Arrow record batch
   */
  createRecordBatchFromColumns(columnData) {
    if (!columnData || Object.keys(columnData).length === 0) {
      return null;
    }

    // Create Arrow vectors for each column
    const vectors = [];

    for (const field of this.arrowSchema.fields) {
      const columnName = field.name;
      const data = columnData[columnName] || [];
      const vector = this._createVector(field, data);
      vectors.push(vector);
    }

    // Create record batch using the correct API
    const data = makeData({
      type: new arrow.Struct(this.arrowSchema.fields),
      children: vectors.map(vector => vector.data[0])
    });

    return new arrow.RecordBatch(this.arrowSchema, data);
  }

  /**
   * Create Arrow vector from field definition and data array
   * Generic method that handles all Arrow types dynamically
   * @param {arrow.Field} field - Arrow field definition
   * @param {Array} data - Array of values for this column
   * @returns {arrow.Vector} Arrow vector
   */
  _createVector(field, data) {
    const arrowType = field.type;

    try {
      // Use the centralized type system for dynamic type handling
      const transformer = getTypeTransformer(arrowType);
      const transformedData = data.map(v => transformer(v));
      
      // Create vector using Arrow's vectorFromArray
      return vectorFromArray(transformedData, arrowType);
    } catch (error) {
      console.warn(`Error creating vector for field ${field.name}:`, error);
      // Fallback to string vector
      return vectorFromArray(
        data.map(v => v === null ? null : String(v)),
        new arrow.Utf8()
      );
    }
  }

  /**
   * Create Arrow table from record batches
   * @param {Array<arrow.RecordBatch>} recordBatches - Array of record batches
   * @returns {arrow.Table|null} Arrow table
   */
  createTable(recordBatches) {
    if (!Array.isArray(recordBatches) || recordBatches.length === 0) {
      return null;
    }

    // Correct usage: pass only the recordBatches array
    return new arrow.Table(recordBatches);
  }

  /**
   * Get the Arrow schema
   * @returns {arrow.Schema} Arrow schema
   */
  getSchema() {
    return this.arrowSchema;
  }

  /**
   * Serialize record batch to IPC format
   * @param {arrow.RecordBatch} recordBatch - Record batch to serialize
   * @returns {Buffer|null} Serialized record batch
   */
  serializeRecordBatch(recordBatch) {
    if (!recordBatch) return null;

    try {
      // Create a table from the record batch and serialize to IPC format
      const table = new arrow.Table([recordBatch]);
      return arrow.tableToIPC(table);
    } catch (error) {
      console.warn('Error serializing record batch:', error);
      // Fallback: create a simple buffer representation
      return this._createSimpleRecordBatchBuffer(recordBatch);
    }
  }

  /**
   * Serialize schema to IPC format
   * @returns {Buffer|null} Serialized schema
   */
  serializeSchema() {
    if (!this.arrowSchema) return null;

    try {
      // Create an empty table with just the schema and serialize
      const emptyVectors = this.arrowSchema.fields.map(field => {
        return this._createVector(field, []);
      });
      const emptyTable = new arrow.Table(this.arrowSchema, emptyVectors);
      return arrow.tableToIPC(emptyTable);
    } catch (error) {
      console.warn('Error serializing schema:', error);
      return null;
    }
  }

  /**
   * Create simple buffer representation as fallback
   * @private
   */
  _createSimpleRecordBatchBuffer(recordBatch) {
    const simpleData = {
      numRows: recordBatch.numRows,
      schema: recordBatch.schema.fields.map(f => ({ name: f.name, type: f.type.toString() }))
    };
    return Buffer.from(JSON.stringify(simpleData));
  }

  /**
   * Get statistics for a record batch
   * @param {arrow.RecordBatch} recordBatch - Record batch to analyze
   * @returns {Object} Statistics object
   */
  getStats(recordBatch) {
    if (!recordBatch) return null;

    return {
      numRows: recordBatch.numRows,
      numColumns: recordBatch.numCols,
      columns: recordBatch.schema.fields.map(field => field.name),
      types: recordBatch.schema.fields.map(field => field.type.toString())
    };
  }
}

export default ArrowBuilder;
