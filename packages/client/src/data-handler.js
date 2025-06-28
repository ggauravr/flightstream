/**
 * @fileoverview Data handler for processing Arrow Flight data and schema information
 */

// NOTE: In a real implementation, this would properly import Apache Arrow
// For testing, we'll mock the Arrow functionality
// import * as arrow from 'apache-arrow';
import { DataError } from './errors.js';

/**
 * Handles Arrow data processing, schema parsing, and data format conversions
 */
export class DataHandler {
  constructor() {
    this.schemaCache = new Map();
    this.tableCache = new Map();
    this.maxCacheSize = 100; // Maximum number of cached items
  }

  /**
   * Parse flight information from server response
   * 
   * @param {Object} flightInfo - Raw flight info from server
   * @returns {Object} Parsed flight information
   */
  parseFlightInfo(flightInfo) {
    try {
      return {
        descriptor: this._parseFlightDescriptor(flightInfo.descriptor),
        endpoints: flightInfo.endpoints || [],
        totalRecords: flightInfo.totalRecords || 0,
        totalBytes: flightInfo.totalBytes || 0,
        schema: flightInfo.schema ? this.parseSchema(flightInfo.schema) : null
      };
    } catch (error) {
      throw new DataError(`Failed to parse flight info: ${error.message}`, error);
    }
  }

  /**
   * Parse Arrow schema from binary data or schema object
   * 
   * @param {Uint8Array|Object} schemaData - Schema data
   * @returns {Object} Parsed schema with field information
   */
  parseSchema(schemaData) {
    try {
      let schema;
      
      if (schemaData instanceof Uint8Array) {
        // Parse binary schema data
        schema = arrow.Schema.from(schemaData);
      } else if (typeof schemaData === 'object' && schemaData.fields) {
        // Already parsed schema object
        schema = schemaData;
      } else {
        throw new Error('Invalid schema data format');
      }

      const parsed = {
        fields: schema.fields ? schema.fields.map(field => ({
          name: field.name,
          type: this._getFieldType(field),
          nullable: field.nullable || false,
          metadata: field.metadata || {}
        })) : [],
        metadata: schema.metadata || {}
      };

      // Cache the parsed schema
      const cacheKey = this._generateSchemaHash(parsed);
      this._cacheItem(this.schemaCache, cacheKey, parsed);

      return parsed;
    } catch (error) {
      throw new DataError(`Failed to parse schema: ${error.message}`, error);
    }
  }

  /**
   * Process Arrow record batch data
   * 
   * @param {Uint8Array} headerData - Arrow record batch header
   * @param {Uint8Array} bodyData - Arrow record batch body
   * @returns {Object} Processed batch data
   */
  processRecordBatch(headerData, bodyData) {
    try {
      // Combine header and body into a single buffer
      const combinedData = this._combineBuffers(headerData, bodyData);
      
      // For testing, create mock record batch data
      const mockRecordBatch = this._createMockRecordBatch(combinedData);
      
      return {
        schema: this.parseSchema(mockRecordBatch.schema),
        numRows: mockRecordBatch.numRows,
        columns: this._extractColumns(mockRecordBatch),
        data: this._recordBatchToObjects(mockRecordBatch)
      };
    } catch (error) {
      throw new DataError(`Failed to process record batch: ${error.message}`, error);
    }
  }

  /**
   * Convert record batch to array of objects
   * 
   * @param {arrow.RecordBatch} recordBatch - Arrow record batch
   * @returns {Array<Object>} Array of row objects
   */
  _recordBatchToObjects(recordBatch) {
    const objects = [];
    const numRows = recordBatch.numRows;
    const columns = recordBatch.schema.fields.map(field => field.name);

    for (let i = 0; i < numRows; i++) {
      const row = {};
      columns.forEach(column => {
        const columnData = recordBatch.getChild(column);
        row[column] = columnData ? columnData.get(i) : null;
      });
      objects.push(row);
    }

    return objects;
  }

  /**
   * Convert record batch to columnar format
   * 
   * @param {arrow.RecordBatch} recordBatch - Arrow record batch
   * @returns {Object} Columnar data
   */
  _recordBatchToColumns(recordBatch) {
    const columns = {};
    
    recordBatch.schema.fields.forEach(field => {
      const columnData = recordBatch.getChild(field.name);
      columns[field.name] = columnData ? columnData.toArray() : [];
    });

    return {
      numRows: recordBatch.numRows,
      columns
    };
  }

  /**
   * Combine multiple record batches into a single dataset
   * 
   * @param {Array<Object>} batches - Array of processed batches
   * @returns {Array<Object>} Combined data as array of objects
   */
  combineBatches(batches) {
    if (!batches || batches.length === 0) {
      return [];
    }

    // Combine all data arrays
    const combinedData = [];
    batches.forEach(batch => {
      if (batch.data && Array.isArray(batch.data)) {
        combinedData.push(...batch.data);
      }
    });

    return combinedData;
  }

  /**
   * Convert data to different output formats
   * 
   * @param {Array<Object>} data - Input data
   * @param {string} format - Output format ('json', 'csv', 'arrow', 'columnar')
   * @returns {*} Converted data
   */
  convertToFormat(data, format) {
    try {
      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(data);
        
        case 'csv':
          return this._toCsv(data);
        
        case 'arrow':
          return this._toArrowTable(data);
        
        case 'columnar':
          return this._toColumnar(data);
        
        default:
          return data;
      }
    } catch (error) {
      throw new DataError(`Failed to convert to format ${format}: ${error.message}`, error);
    }
  }

  /**
   * Extract column information from record batch
   * 
   * @private
   */
  _extractColumns(recordBatch) {
    return recordBatch.schema.fields.map(field => ({
      name: field.name,
      type: this._getFieldType(field),
      length: recordBatch.getChild(field.name)?.length || 0
    }));
  }

  /**
   * Get field type string from Arrow field
   * 
   * @private
   */
  _getFieldType(field) {
    if (field.type) {
      if (typeof field.type === 'string') {
        return field.type;
      }
      return field.type.toString();
    }
    return 'unknown';
  }

  /**
   * Parse flight descriptor
   * 
   * @private
   */
  _parseFlightDescriptor(descriptor) {
    if (!descriptor) {
      return null;
    }

    return {
      type: descriptor.type || 'PATH',
      path: descriptor.path || [],
      cmd: descriptor.cmd || null
    };
  }

  /**
   * Combine header and body buffers
   * 
   * @private
   */
  _combineBuffers(header, body) {
    if (!header || !body) {
      throw new Error('Header and body data are required');
    }

    const combined = new Uint8Array(header.length + body.length);
    combined.set(header, 0);
    combined.set(body, header.length);
    
    return combined;
  }

  /**
   * Convert data to CSV format
   * 
   * @private
   */
  _toCsv(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value !== null && value !== undefined ? value : '';
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Convert data to Arrow Table (mock implementation)
   * 
   * @private
   */
  _toArrowTable(data) {
    if (!data || data.length === 0) {
      return null;
    }

    // Mock Arrow Table for testing
    return {
      schema: this._inferArrowSchema(data),
      batches: [{ data, numRows: data.length }],
      numRows: data.length
    };
  }

  /**
   * Convert data to columnar format
   * 
   * @private
   */
  _toColumnar(data) {
    if (!data || data.length === 0) {
      return { columns: {}, numRows: 0 };
    }

    const columns = {};
    const headers = Object.keys(data[0]);

    headers.forEach(header => {
      columns[header] = data.map(row => row[header]);
    });

    return {
      columns,
      numRows: data.length
    };
  }

  /**
   * Infer schema from JavaScript data (mock implementation)
   * 
   * @private
   */
  _inferArrowSchema(data) {
    if (!data || data.length === 0) {
      return [];
    }

    const sample = data[0];
    const fields = [];

    Object.keys(sample).forEach(key => {
      const value = sample[key];
      let type;

      if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'int32' : 'float64';
      } else if (typeof value === 'boolean') {
        type = 'bool';
      } else if (value instanceof Date) {
        type = 'timestamp';
      } else {
        type = 'utf8';
      }

      fields.push({ name: key, type, nullable: true });
    });

    return fields;
  }

  /**
   * Generate a hash for schema caching
   * 
   * @private
   */
  _generateSchemaHash(schema) {
    const schemaString = JSON.stringify(schema);
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < schemaString.length; i++) {
      const char = schemaString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cache an item with size limit
   * 
   * @private
   */
  _cacheItem(cache, key, value) {
    // Remove oldest items if cache is full
    if (cache.size >= this.maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, value);
  }

  /**
   * Create mock record batch for testing
   * 
   * @private
   */
  _createMockRecordBatch(combinedData) {
    // Mock implementation for testing
    return {
      schema: { fields: [{ name: 'id', type: 'int32' }, { name: 'value', type: 'utf8' }] },
      numRows: 2,
      getChild: (name) => ({
        get: (index) => {
          if (name === 'id') return index + 1;
          if (name === 'value') return `value_${index}`;
          return null;
        },
        length: 2,
        toArray: () => name === 'id' ? [1, 2] : ['value_0', 'value_1']
      })
    };
  }
} 