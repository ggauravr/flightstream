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

/**
 * TypeDetector - Encapsulates all logic for inferring types from sample values
 * 
 * This class provides methods to analyze sample data and determine the most
 * appropriate data type. It handles boolean, numeric, date, timestamp, and
 * string detection with configurable options.
 */
export class TypeDetector {
  constructor(options = {}) {
    this.options = {
      strictMode: false,
      dateFormats: ['YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss'],
      integerThreshold: Number.MAX_SAFE_INTEGER,
      ...options
    };
  }

  /**
   * Infer data type from a sample value
   * @param {*} value - Sample value to analyze
   * @param {Object} options - Type inference options (overrides constructor options)
   * @returns {string} Inferred type name
   */
  inferType(value, options = {}) {
    const mergedOptions = { ...this.options, ...options };

    if (value === null || value === undefined || value === '') {
      return 'string'; // default to string for null/empty values
    }

    const strValue = String(value).trim();

    // Boolean detection
    if (this.isBooleanValue(strValue)) {
      return 'boolean';
    }

    // Numeric detection
    const numericType = this.inferNumericType(strValue, mergedOptions);
    if (numericType) {
      return numericType;
    }

    // Date detection
    if (this.isDateValue(strValue, mergedOptions.dateFormats)) {
      return 'date';
    }

    // Timestamp detection
    if (this.isTimestampValue(strValue)) {
      return 'timestamp';
    }

    // Default to string
    return 'string';
  }

  /**
   * Check if a value represents a boolean
   * @param {string} value - String value to check
   * @returns {boolean}
   */
  isBooleanValue(value) {
    const lowerValue = value.toLowerCase();
    return ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(lowerValue);
  }

  /**
   * Infer numeric type from string value
   * @param {string} value - String value to analyze
   * @param {Object} options - Numeric inference options
   * @returns {string|null} Numeric type or null if not numeric
   */
  inferNumericType(value, options = {}) {
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
    if (/^[$€£¥]\d+\.?\d*$/.test(value)) {
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
  isDateValue(value, dateFormats = []) {
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
  isTimestampValue(value) {
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
} 