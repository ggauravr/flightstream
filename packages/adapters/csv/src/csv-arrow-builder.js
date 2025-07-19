import * as arrow from 'apache-arrow';
import { ArrowBuilder } from '@flightstream/core-shared';

/**
 * Optimized CSV-Specific Arrow Builder
 *
 * This class extends the optimized ArrowBuilder to provide efficient CSV processing
 * with minimal data copying and maximum use of Arrow's native capabilities.
 *
 * Key optimizations:
 * 1. Direct vector creation from CSV data without intermediate transformations
 * 2. Batch processing for better memory efficiency
 * 3. Native Arrow type conversion
 * 4. Zero-copy operations where possible
 *
 * Usage:
 *   const csvSchema = { id: 'int64', name: 'string', price: 'float64' };
 *   const builder = new CSVArrowBuilder(csvSchema);
 *   const recordBatch = builder.createRecordBatch(csvRows);
 */
export class CSVArrowBuilder extends ArrowBuilder {
  constructor(csvSchema, options = {}) {
    super(csvSchema, options);
    this.csvSchema = csvSchema;
  }

  // ===== IMPLEMENTATION OF ABSTRACT METHODS =====

  /**
   * Build Arrow schema from CSV schema format
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
   * Create Arrow vectors directly from CSV data
   * Optimized to eliminate intermediate data transformations
   * @param {Array<Object>} csvBatch - Array of CSV row objects
   * @returns {Array<arrow.Vector>} Array of Arrow vectors
   * @override
   */
  _createVectorsFromSource(csvBatch) {
    if (!Array.isArray(csvBatch) || csvBatch.length === 0) {
      return [];
    }

    const vectors = [];

    // Create vectors directly for each field without intermediate column arrays
    for (const field of this.arrowSchema.fields) {
      const columnName = field.name;
      const arrowType = field.type;

      // Extract column data directly from rows
      const columnData = csvBatch.map(row => row[columnName]);

      // Create vector directly using optimized method
      const vector = this._createOptimizedVector(arrowType, columnData);
      vectors.push(vector);
    }

    return vectors;
  }

  /**
   * Map CSV type names to Arrow types
   * @param {string} csvType - CSV type name
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

  // ===== CSV-SPECIFIC CONVENIENCE METHODS =====

  /**
   * Get the original CSV schema
   * @returns {Object} CSV schema object
   */
  getCSVSchema() {
    return this.csvSchema;
  }

  /**
   * Create record batch from CSV rows (alias for clarity)
   * @param {Array<Object>} csvRows - Array of CSV row objects
   * @returns {arrow.RecordBatch|null} Arrow record batch
   */
  createRecordBatchFromCSVRows(csvRows) {
    return this.createRecordBatch(csvRows);
  }

  /**
   * Validate CSV row against expected schema
   * @param {Object} csvRow - CSV row object to validate
   * @returns {boolean} Whether the row matches the schema
   */
  validateCSVRow(csvRow) {
    if (!csvRow || typeof csvRow !== 'object') {
      return false;
    }

    // Check if all required columns are present
    const expectedColumns = Object.keys(this.csvSchema);
    const actualColumns = Object.keys(csvRow);

    // Allow extra columns, but ensure all expected columns exist
    return expectedColumns.every(col => actualColumns.includes(col));
  }

  /**
   * Get CSV-specific statistics
   * @param {Array<Object>} csvRows - CSV rows to analyze
   * @returns {Object} CSV-specific statistics
   */
  getCSVStats(csvRows) {
    if (!Array.isArray(csvRows) || csvRows.length === 0) {
      return null;
    }

    const stats = {
      totalRows: csvRows.length,
      columns: Object.keys(this.csvSchema),
      columnTypes: { ...this.csvSchema },
      columnStats: {}
    };

    // Calculate per-column statistics
    for (const columnName of stats.columns) {
      const values = csvRows.map(row => row[columnName]).filter(v => v !== null && v !== undefined && v !== '');

      stats.columnStats[columnName] = {
        nullCount: csvRows.length - values.length,
        uniqueCount: new Set(values).size,
        sampleValues: values.slice(0, 5) // First 5 non-null values
      };
    }

    return stats;
  }

  /**
   * Create optimized record batch with batch processing
   * @param {Array<Object>} csvRows - Array of CSV row objects
   * @param {number} batchSize - Size of each batch
   * @returns {Array<arrow.RecordBatch>} Array of record batches
   */
  createRecordBatchesFromCSVRows(csvRows, batchSize = this.options.recordBatchSize) {
    if (!Array.isArray(csvRows) || csvRows.length === 0) {
      return [];
    }

    const batches = [];

    // Process data in batches for better memory efficiency
    for (let i = 0; i < csvRows.length; i += batchSize) {
      const batch = csvRows.slice(i, i + batchSize);
      const recordBatch = this.createRecordBatch(batch);

      if (recordBatch) {
        batches.push(recordBatch);
      }
    }

    return batches;
  }
}

export default CSVArrowBuilder;
