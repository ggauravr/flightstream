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
 * TypeTransformer - Handles all data transformation/parsing logic
 *
 * This class provides methods to safely convert raw values to Arrow-compatible
 * values. It handles null values, type conversion, and error recovery.
 */
export class TypeTransformer {
  constructor() {
    // No configuration needed for basic transformers
  }

  /**
   * Safe integer parsing with null handling
   * @param {*} value - Value to parse
   * @returns {number|null} Parsed integer or null
   */
  safeParseInt(value) {
    if (value === null || value === undefined) return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Safe float parsing with null handling
   * @param {*} value - Value to parse
   * @returns {number|null} Parsed float or null
   */
  safeParseFloat(value) {
    if (value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Safe date parsing to milliseconds with null handling
   * @param {*} value - Value to parse as date
   * @returns {number|null} Date in milliseconds or null
   */
  safeParseDateMillis(value) {
    if (value === null || value === undefined) return null;
    try {
      const date = value instanceof Date ? value : new Date(value);
      return isNaN(date.getTime()) ? null : date.getTime();
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe date parsing to days with null handling
   * @param {*} value - Value to parse as date
   * @returns {number|null} Date in days or null
   */
  safeParseDateDays(value) {
    if (value === null || value === undefined) return null;
    try {
      const date = value instanceof Date ? value : new Date(value);
      const timeMs = date.getTime();
      return isNaN(timeMs) ? null : Math.floor(timeMs / (1000 * 60 * 60 * 24));
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe timestamp parsing with unit conversion
   * @param {*} value - Value to parse as timestamp
   * @param {number} unitMultiplier - Multiplier for unit conversion
   * @returns {number|null} Timestamp in specified units or null
   */
  safeParseTimestamp(value, unitMultiplier) {
    if (value === null || value === undefined) return null;
    try {
      const date = value instanceof Date ? value : new Date(value);
      const timeMs = date.getTime();
      return isNaN(timeMs) ? null : Math.floor(timeMs * unitMultiplier);
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe time parsing with unit conversion
   * @param {*} value - Value to parse as time
   * @param {number} unitMultiplier - Multiplier for unit conversion
   * @returns {number|null} Time in specified units or null
   */
  safeParseTime(value, unitMultiplier) {
    if (value === null || value === undefined) return null;
    try {
      // Handle various time formats
      if (typeof value === 'string') {
        // Parse time strings like "12:30:45"
        const parts = value.split(':').map(Number);
        if (parts.length >= 3) {
          const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          return Math.floor(seconds * unitMultiplier);
        }
      }
      // Fallback to date parsing
      const date = value instanceof Date ? value : new Date(value);
      const timeMs = date.getTime();
      return isNaN(timeMs) ? null : Math.floor(timeMs * unitMultiplier);
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe binary parsing
   * @param {*} value - Value to parse as binary
   * @returns {Uint8Array|null} Binary data or null
   */
  safeParseBinary(value) {
    if (value === null || value === undefined) return null;
    try {
      if (value instanceof Uint8Array) return value;
      if (value instanceof Buffer) return new Uint8Array(value);
      if (typeof value === 'string') {
        // Try to parse as base64
        return new Uint8Array(Buffer.from(value, 'base64'));
      }
      if (Array.isArray(value)) return new Uint8Array(value);
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe decimal parsing
   * @param {*} value - Value to parse as decimal
   * @param {arrow.DataType} arrowType - Arrow decimal type
   * @returns {*} Decimal value or null
   */
  safeParseDecimal(value, _arrowType) {
    if (value === null || value === undefined) return null;
    try {
      // For now, return the value as-is and let Arrow handle the conversion
      // This is a simplified implementation - in practice, you might want
      // more sophisticated decimal handling based on precision/scale
      return value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe list parsing
   * @param {*} value - Value to parse as list
   * @returns {Array|null} List value or null
   */
  safeParseList(value) {
    if (value === null || value === undefined) return null;
    try {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Try to parse JSON string
        return JSON.parse(value);
      }
      return [value]; // Wrap single value in array
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe struct parsing
   * @param {*} value - Value to parse as struct
   * @returns {Object|null} Struct value or null
   */
  safeParseStruct(value) {
    if (value === null || value === undefined) return null;
    try {
      if (typeof value === 'object' && !Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Try to parse JSON string
        return JSON.parse(value);
      }
      return { value }; // Wrap single value in object
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe map parsing
   * @param {*} value - Value to parse as map
   * @returns {Array|null} Map entries or null
   */
  safeParseMap(value) {
    if (value === null || value === undefined) return null;
    try {
      if (Array.isArray(value)) return value;
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Convert object to key-value pairs
        return Object.entries(value);
      }
      if (typeof value === 'string') {
        // Try to parse JSON string
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          return Object.entries(parsed);
        }
        return parsed;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe interval parsing
   * @param {*} value - Value to parse as interval
   * @returns {*} Interval value or null
   */
  safeParseInterval(value) {
    if (value === null || value === undefined) return null;
    try {
      // For now, return the value as-is and let Arrow handle the conversion
      // This is a simplified implementation
      return value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Safe duration parsing with unit conversion
   * @param {*} value - Value to parse as duration
   * @param {number} unitMultiplier - Multiplier for unit conversion
   * @returns {number|null} Duration in specified units or null
   */
  safeParseDuration(value, unitMultiplier) {
    if (value === null || value === undefined) return null;
    try {
      if (typeof value === 'number') return Math.floor(value * unitMultiplier);
      if (typeof value === 'string') {
        // Try to parse duration strings like "1h30m" or "90s"
        const duration = this.parseDurationString(value);
        return duration ? Math.floor(duration * unitMultiplier) : null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse duration string to milliseconds
   * @param {string} durationStr - Duration string like "1h30m" or "90s"
   * @returns {number|null} Duration in milliseconds or null
   */
  parseDurationString(durationStr) {
    try {
      const regex = /(\d+)([dhms])/g;
      let totalMs = 0;
      let match;

      while ((match = regex.exec(durationStr)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
        case 'd': totalMs += value * 24 * 60 * 60 * 1000; break;
        case 'h': totalMs += value * 60 * 60 * 1000; break;
        case 'm': totalMs += value * 60 * 1000; break;
        case 's': totalMs += value * 1000; break;
        }
      }

      return totalMs > 0 ? totalMs : null;
    } catch (error) {
      return null;
    }
  }
}
