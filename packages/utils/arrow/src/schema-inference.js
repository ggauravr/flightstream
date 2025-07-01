/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { inferType, mapToArrowType, isValidArrowType } from './type-system/index.js';

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
 * Normalize schema by resolving type conflicts and applying rules
 * @param {Object} schema - Raw inferred schema
 * @param {Object} options - Normalization options
 * @returns {Object} Normalized schema
 */
export function normalizeSchema(schema, options = {}) {
  const {
    preferredTypes = {},
    typeRules = {},
    // strictMode: _strictMode = false  // Reserved for future use
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

export default {
  inferSchema,
  inferColumnType,
  normalizeSchema,
  generateArrowSchema
};
