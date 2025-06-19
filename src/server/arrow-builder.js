import * as arrow from 'apache-arrow';
import { vectorFromArray, makeData } from 'apache-arrow';

export class ArrowBuilder {
  constructor(csvSchema, options = {}) {
    this.csvSchema = csvSchema;
    this.options = {
      recordBatchSize: options.recordBatchSize || 65536,
      nullValue: options.nullValue || null,
      ...options
    };
    
    this.arrowSchema = null;
    this._buildArrowSchema();
  }

  _buildArrowSchema() {
    const fields = [];
    
    for (const [columnName, csvType] of Object.entries(this.csvSchema)) {
      const arrowType = this._mapCSVTypeToArrow(csvType);
      fields.push(arrow.Field.new(columnName, arrowType, true)); // nullable = true
    }
    
    this.arrowSchema = new arrow.Schema(fields);
  }

  _mapCSVTypeToArrow(csvType) {
    switch (csvType) {
      case 'boolean':
        return new arrow.Bool();
      case 'int64':
        return new arrow.Int64();
      case 'float64':
        return new arrow.Float64();
      case 'date':
        return new arrow.DateMillisecond();
      case 'string':
      default:
        return new arrow.Utf8();
    }
  }

  createRecordBatch(csvBatch) {
    if (!csvBatch || csvBatch.length === 0) {
      return null;
    }

    // Group data by columns
    const columnData = this._groupByColumns(csvBatch);
    
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

  _groupByColumns(csvBatch) {
    const columnData = {};
    
    // Initialize columns
    for (const field of this.arrowSchema.fields) {
      columnData[field.name] = [];
    }
    
    // Fill column data
    for (const row of csvBatch) {
      for (const field of this.arrowSchema.fields) {
        const columnName = field.name;
        const value = row[columnName];
        columnData[columnName].push(value);
      }
    }
    
    return columnData;
  }

  _createVector(field, data) {
    const arrowType = field.type;
    
    try {
      switch (arrowType.constructor) {
        case arrow.Bool:
          return vectorFromArray(
            data.map(v => v === null ? null : Boolean(v)),
            arrowType
          );
          
        case arrow.Int64:
          return vectorFromArray(
            data.map(v => {
              if (v === null) return null;
              const parsed = this._safeParseInt(v);
              return parsed === null ? null : BigInt(parsed);
            }),
            arrowType
          );
          
        case arrow.Float64:
          return vectorFromArray(
            data.map(v => v === null ? null : this._safeParseFloat(v)),
            arrowType
          );
          
        case arrow.DateMillisecond:
          return vectorFromArray(
            data.map(v => v === null ? null : this._safeParseDateMillis(v)),
            arrowType
          );
          
        case arrow.Utf8:
        default:
          return vectorFromArray(
            data.map(v => v === null ? null : String(v)),
            arrowType
          );
      }
    } catch (error) {
      console.warn(`Error creating vector for field ${field.name}:`, error);
      // Fallback to string vector
      return vectorFromArray(
        data.map(v => v === null ? null : String(v)),
        new arrow.Utf8()
      );
    }
  }

  _safeParseInt(value) {
    if (value === null || value === undefined) return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  _safeParseFloat(value) {
    if (value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  _safeParseDateMillis(value) {
    if (value === null || value === undefined) return null;
    try {
      const date = value instanceof Date ? value : new Date(value);
      return isNaN(date.getTime()) ? null : date.getTime();
    } catch (error) {
      return null;
    }
  }

  createTable(recordBatches) {
    if (!Array.isArray(recordBatches) || recordBatches.length === 0) {
      return null;
    }
    
    return new arrow.Table(this.arrowSchema, recordBatches);
  }

  getSchema() {
    return this.arrowSchema;
  }

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
      // Fallback: return schema as JSON
      return Buffer.from(JSON.stringify({
        fields: this.arrowSchema.fields.map(f => ({
          name: f.name,
          type: f.type.toString(),
          nullable: f.nullable
        }))
      }));
    }
  }

  _createSimpleRecordBatchBuffer(recordBatch) {
    // Simple fallback: serialize as JSON for now
    const data = {
      schema: {
        fields: recordBatch.schema.fields.map(f => ({
          name: f.name,
          type: f.type.toString()
        }))
      },
      data: recordBatch.toArray()
    };
    return Buffer.from(JSON.stringify(data));
  }

  getStats(recordBatch) {
    if (!recordBatch) {
      return { numRows: 0, numColumns: 0, schema: this.arrowSchema };
    }
    
    return {
      numRows: recordBatch.numRows,
      numColumns: recordBatch.numCols,
      schema: this.arrowSchema,
      columnNames: this.arrowSchema.fields.map(f => f.name)
    };
  }
}

export default ArrowBuilder; 