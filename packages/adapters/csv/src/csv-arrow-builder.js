import * as arrow from 'apache-arrow';
import { ArrowBuilder } from '@flightstream/utils-arrow';

/**
 * CSV-Specific Arrow Builder
 *
 * This class extends the generic ArrowBuilder to provide CSV-specific functionality.
 * It handles CSV schema format conversion and transforms CSV row data into
 * Arrow-compatible column arrays.
 *
 * CSV-specific features:
 * 1. CSV schema to Arrow schema mapping
 * 2. CSV row objects to column arrays transformation
 * 3. CSV type inference integration
 * 4. Support for CSV-specific data patterns
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
   * Transform CSV row objects to column arrays
   * @param {Array<Object>} csvBatch - Array of CSV row objects
   * @returns {Object} Column data as { columnName: [values...] }
   * @override
   */
  _transformDataToColumns(csvBatch) {
    if (!Array.isArray(csvBatch) || csvBatch.length === 0) {
      return {};
    }

    const columnData = {};

    // Initialize columns
    for (const field of this.arrowSchema.fields) {
      columnData[field.name] = [];
    }

    // Transform rows to columns
    for (const row of csvBatch) {
      for (const field of this.arrowSchema.fields) {
        const columnName = field.name;
        const value = row[columnName];
        columnData[columnName].push(value);
      }
    }

    return columnData;
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
}
