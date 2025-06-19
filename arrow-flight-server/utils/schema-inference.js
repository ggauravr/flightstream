/**
 * Generic Schema Inference Utilities
 * 
 * This module provides utilities for inferring Arrow schemas from various data formats.
 * It supports multiple data types and provides extensible type inference patterns.
 * 
 * Key features:
 * 1. Type inference from sample data
 * 2. Support for multiple data formats (CSV, JSON, etc.)
 * 3. Configurable type detection rules
 * 4. Arrow schema generation
 * 5. Schema validation and normalization
 */

/**
 * Infer data types from sample values
 * @param {*} value - Sample value to analyze
 * @param {Object} options - Type inference options
 * @returns {string} Inferred type name
 */
export function inferType(value, options = {}) {
  const {
    strictMode = false,
    dateFormats = ['YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss'],
    integerThreshold = Number.MAX_SAFE_INTEGER
  } = options;

  if (value === null || value === undefined || value === '') {
    return 'string'; // default to string for null/empty values
  }

  const strValue = String(value).trim();
  
  // Boolean detection
  if (isBooleanValue(strValue)) {
    return 'boolean';
  }
  
  // Numeric detection
  const numericType = inferNumericType(strValue, { strictMode, integerThreshold });
  if (numericType) {
    return numericType;
  }
  
  // Date detection
  if (isDateValue(strValue, dateFormats)) {
    return 'date';
  }
  
  // Timestamp detection
  if (isTimestampValue(strValue)) {
    return 'timestamp';
  }
  
  // Default to string
  return 'string';
}

/**
 * Infer schema from a collection of sample data
 * @param {Array} samples - Array of sample records
 * @param {Object} options - Schema inference options
 * @returns {Object} Inferred schema
 */
export function inferSchema(samples, options = {}) {
  const {
    sampleSize = Math.min(samples.length, 1000),
    confidenceThreshold = 0.8,
    nullThreshold = 0.5,
    ...typeOptions
  } = options;

  if (!samples || samples.length === 0) {
    return {};
  }

  // Use subset of samples for performance
  const sampleData = samples.slice(0, sampleSize);
  
  // Extract all column names from samples
  const columnNames = new Set();
  sampleData.forEach(record => {
    if (record && typeof record === 'object') {
      Object.keys(record).forEach(key => columnNames.add(key));
    }
  });

  const schema = {};
  
  // Infer type for each column
  for (const columnName of columnNames) {
    const columnValues = sampleData
      .map(record => record && record[columnName])
      .filter(value => value !== undefined);
    
    const inferredType = inferColumnType(columnValues, {
      confidenceThreshold,
      nullThreshold,
      ...typeOptions
    });
    
    schema[columnName] = inferredType;
  }

  return schema;
}

/**
 * Infer type for a specific column based on its values
 * @param {Array} values - Column values to analyze
 * @param {Object} options - Type inference options
 * @returns {string} Inferred column type
 */
export function inferColumnType(values, options = {}) {
  const { confidenceThreshold = 0.8, nullThreshold = 0.5 } = options;
  
  if (!values || values.length === 0) {
    return 'string';
  }

  // Count null values
  const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
  const nullRatio = nullCount / values.length;
  
  // If too many nulls, default to string
  if (nullRatio > nullThreshold) {
    return 'string';
  }

  // Get non-null values for type inference
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonNullValues.length === 0) {
    return 'string';
  }

  // Count types for each value
  const typeCounts = {};
  nonNullValues.forEach(value => {
    const type = inferType(value, options);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  // Find the most common type
  const sortedTypes = Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a);
  
  const [mostCommonType, count] = sortedTypes[0];
  const confidence = count / nonNullValues.length;

  // If confidence is high enough, use the most common type
  if (confidence >= confidenceThreshold) {
    return mostCommonType;
  }

  // Otherwise, use string as fallback
  return 'string';
}

/**
 * Check if a value represents a boolean
 * @param {string} value - String value to check
 * @returns {boolean}
 */
function isBooleanValue(value) {
  const lowerValue = value.toLowerCase();
  return ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(lowerValue);
}

/**
 * Infer numeric type from string value
 * @param {string} value - String value to analyze
 * @param {Object} options - Numeric inference options
 * @returns {string|null} Numeric type or null if not numeric
 */
function inferNumericType(value, options = {}) {
  const { strictMode = false, integerThreshold = Number.MAX_SAFE_INTEGER } = options;
  
  // Integer detection
  if (/^-?\d+$/.test(value)) {
    const intValue = parseInt(value, 10);
    if (Math.abs(intValue) <= integerThreshold) {
      return 'int64';
    } else {
      return 'string'; // Too large for safe integer
    }
  }
  
  // Float detection
  if (/^-?\d*\.\d+$/.test(value) || /^-?\d+\.?\d*[eE][+-]?\d+$/.test(value)) {
    return 'float64';
  }
  
  // Percentage
  if (/^-?\d*\.?\d+%$/.test(value)) {
    return strictMode ? 'string' : 'float64';
  }
  
  // Currency (simple detection)
  if (/^[\$€£¥]\d+\.?\d*$/.test(value)) {
    return strictMode ? 'string' : 'float64';
  }
  
  return null;
}

/**
 * Check if a value represents a date
 * @param {string} value - String value to check
 * @param {Array} dateFormats - Supported date formats
 * @returns {boolean}
 */
function isDateValue(value, dateFormats = []) {
  // Simple date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/,           // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/,         // YYYY/MM/DD
  ];

  // Check against patterns
  for (const pattern of datePatterns) {
    if (pattern.test(value)) {
      // Validate it's actually a valid date
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
  }

  return false;
}

/**
 * Check if a value represents a timestamp
 * @param {string} value - String value to check
 * @returns {boolean}
 */
function isTimestampValue(value) {
  // ISO timestamp
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  // Unix timestamp (seconds)
  if (/^\d{10}$/.test(value)) {
    const timestamp = parseInt(value, 10);
    // Check if it's a reasonable timestamp (between 1970 and 2050)
    return timestamp > 0 && timestamp < 2524608000;
  }

  // Unix timestamp (milliseconds)
  if (/^\d{13}$/.test(value)) {
    const timestamp = parseInt(value, 10);
    // Check if it's a reasonable timestamp
    return timestamp > 0 && timestamp < 2524608000000;
  }

  return false;
}

/**
 * Normalize schema by resolving type conflicts and applying rules
 * @param {Object} schema - Raw inferred schema
 * @param {Object} options - Normalization options
 * @returns {Object} Normalized schema
 */
export function normalizeSchema(schema, options = {}) {
  const {
    preferredTypes = {},
    typeRules = {},
    strictMode = false
  } = options;

  const normalizedSchema = {};

  for (const [columnName, type] of Object.entries(schema)) {
    let normalizedType = type;

    // Apply preferred types
    if (preferredTypes[columnName]) {
      normalizedType = preferredTypes[columnName];
    }

    // Apply type rules
    if (typeRules[type]) {
      normalizedType = typeRules[type];
    }

    // Validate type
    if (!isValidArrowType(normalizedType)) {
      console.warn(`Invalid Arrow type '${normalizedType}' for column '${columnName}', falling back to string`);
      normalizedType = 'string';
    }

    normalizedSchema[columnName] = normalizedType;
  }

  return normalizedSchema;
}

/**
 * Check if a type is valid for Arrow
 * @param {string} type - Type to validate
 * @returns {boolean}
 */
function isValidArrowType(type) {
  const validTypes = [
    'boolean', 'int8', 'int16', 'int32', 'int64',
    'uint8', 'uint16', 'uint32', 'uint64',
    'float32', 'float64', 'string', 'binary',
    'date', 'timestamp', 'time'
  ];
  return validTypes.includes(type);
}

/**
 * Generate Arrow schema from inferred schema
 * @param {Object} schema - Inferred schema
 * @param {Object} options - Arrow schema options
 * @returns {Object} Arrow schema configuration
 */
export function generateArrowSchema(schema, options = {}) {
  const { nullable = true } = options;
  
  const arrowFields = [];
  
  for (const [columnName, type] of Object.entries(schema)) {
    arrowFields.push({
      name: columnName,
      type: mapToArrowType(type),
      nullable: nullable
    });
  }
  
  return {
    fields: arrowFields,
    metadata: {
      inference_timestamp: new Date().toISOString(),
      source: 'schema-inference'
    }
  };
}

/**
 * Map inferred type to Arrow type
 * @param {string} type - Inferred type
 * @returns {string} Arrow type
 */
function mapToArrowType(type) {
  const typeMapping = {
    'boolean': 'bool',
    'int64': 'int64',
    'float64': 'float64',
    'date': 'date32',
    'timestamp': 'timestamp',
    'string': 'utf8'
  };
  
  return typeMapping[type] || 'utf8';
}

export default {
  inferType,
  inferSchema,
  inferColumnType,
  normalizeSchema,
  generateArrowSchema
}; 