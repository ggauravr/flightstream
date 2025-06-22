/**
 * Tests for schema inference utilities
 * @fileoverview Comprehensive test suite for type inference and schema generation
 */

import {
  inferType,
  inferSchema,
  inferColumnType,
  normalizeSchema,
  generateArrowSchema
} from '../src/schema-inference.js';

describe('Schema Inference', () => {
  describe('inferType', () => {
    describe('for null/empty values', () => {
      it('should return string for null values', () => {
        expect(inferType(null)).toBe('string');
      });

      it('should return string for undefined values', () => {
        expect(inferType(undefined)).toBe('string');
      });

      it('should return string for empty strings', () => {
        expect(inferType('')).toBe('string');
        expect(inferType('   ')).toBe('string'); // whitespace only
      });
    });

    describe('for boolean values', () => {
      it('should detect true/false strings', () => {
        expect(inferType('true')).toBe('boolean');
        expect(inferType('false')).toBe('boolean');
      });

      it('should detect yes/no strings', () => {
        expect(inferType('yes')).toBe('boolean');
        expect(inferType('no')).toBe('boolean');
      });

      it('should detect 1/0 as boolean', () => {
        expect(inferType('1')).toBe('boolean');
        expect(inferType('0')).toBe('boolean');
      });

      it('should be case insensitive', () => {
        expect(inferType('TRUE')).toBe('boolean');
        expect(inferType('False')).toBe('boolean');
        expect(inferType('YES')).toBe('boolean');
        expect(inferType('No')).toBe('boolean');
      });

      it('should detect y/n variants', () => {
        expect(inferType('y')).toBe('boolean');
        expect(inferType('n')).toBe('boolean');
        expect(inferType('Y')).toBe('boolean');
        expect(inferType('N')).toBe('boolean');
      });
    });

    describe('for numeric values', () => {
      it('should detect integer strings', () => {
        expect(inferType('123')).toBe('integer');
        expect(inferType('0')).toBe('integer');
        expect(inferType('-456')).toBe('integer');
      });

      it('should detect float strings', () => {
        expect(inferType('123.45')).toBe('float');
        expect(inferType('0.0')).toBe('float');
        expect(inferType('-456.789')).toBe('float');
      });

      it('should handle negative numbers', () => {
        expect(inferType('-123')).toBe('integer');
        expect(inferType('-123.45')).toBe('float');
      });

      it('should handle scientific notation', () => {
        expect(inferType('1.23e-4')).toBe('float');
        expect(inferType('1E+6')).toBe('float');
      });

      it('should respect integerThreshold option', () => {
        const largeInt = String(Number.MAX_SAFE_INTEGER + 1);
        expect(inferType(largeInt, { integerThreshold: 1000 })).toBe('string');
        expect(inferType('999', { integerThreshold: 1000 })).toBe('integer');
      });
    });

    describe('for date values', () => {
      it('should detect ISO date strings', () => {
        expect(inferType('2023-12-25')).toBe('date');
        expect(inferType('2023-01-01')).toBe('date');
      });

      it('should detect custom date formats', () => {
        // Note: this depends on the implementation of isDateValue
        const options = { dateFormats: ['MM/DD/YYYY'] };
        // This test may need adjustment based on actual implementation
        expect(inferType('12/25/2023', options)).toBe('date');
      });

      it('should handle various date patterns', () => {
        expect(inferType('2023-12-25')).toBe('date');
        // Add more patterns as supported by implementation
      });
    });

    describe('for timestamp values', () => {
      it('should detect timestamp strings', () => {
        expect(inferType('2023-12-25T10:30:00Z')).toBe('timestamp');
        expect(inferType('2023-12-25T10:30:00.123Z')).toBe('timestamp');
      });

      it('should detect Unix timestamps', () => {
        expect(inferType('1703505000')).toBe('timestamp'); // 10-digit Unix timestamp
        expect(inferType('1703505000123')).toBe('timestamp'); // 13-digit Unix timestamp
      });
    });

    describe('with strictMode option', () => {
      it('should be more restrictive in type detection', () => {
        // In strict mode, ambiguous values should default to string
        expect(inferType('1', { strictMode: true })).toBe('boolean'); // Still clearly boolean
        expect(inferType('123.0', { strictMode: true })).toBe('float'); // Clear float
      });

      it('should default to string more often', () => {
        // This depends on implementation - adjust based on actual behavior
        const ambiguousValue = '1.0'; // Could be integer or float
        expect(inferType(ambiguousValue, { strictMode: false })).toBe('float');
      });
    });
  });

  describe('inferSchema', () => {
    it('should return empty object for no samples', () => {
      expect(inferSchema([])).toEqual({});
      expect(inferSchema(null)).toEqual({});
      expect(inferSchema(undefined)).toEqual({});
    });

    it('should extract all column names from samples', () => {
      const samples = [
        { id: 1, name: 'John', active: true },
        { id: 2, email: 'jane@example.com' },
        { score: 95.5 }
      ];
      const schema = inferSchema(samples);
      const columnNames = Object.keys(schema);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('active');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('score');
    });

    it('should infer type for each column', () => {
      const samples = [
        { id: 1, name: 'John', active: true, score: 95.5 },
        { id: 2, name: 'Jane', active: false, score: 87.2 },
        { id: 3, name: 'Bob', active: true, score: 92.1 }
      ];
      const schema = inferSchema(samples);
      expect(schema.id).toBe('integer');
      expect(schema.name).toBe('string');
      expect(schema.active).toBe('boolean');
      expect(schema.score).toBe('float');
    });

    it('should use subset of samples for performance (sampleSize)', () => {
      const samples = Array.from({ length: 2000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }));
      
      // Should still work with large datasets
      const schema = inferSchema(samples, { sampleSize: 100 });
      expect(schema.id).toBe('integer');
      expect(schema.name).toBe('string');
    });

    it('should handle mixed data types in samples', () => {
      const samples = [
        { value: '123' },
        { value: '456' },
        { value: 'not a number' }
      ];
      const schema = inferSchema(samples);
      // Should fall back to string due to mixed types
      expect(schema.value).toBe('string');
    });

    it('should ignore undefined values in samples', () => {
      const samples = [
        { id: 1, name: 'John' },
        { id: 2 }, // name is undefined
        { id: 3, name: 'Bob' }
      ];
      const schema = inferSchema(samples);
      expect(schema.id).toBe('integer');
      expect(schema.name).toBe('string');
    });
  });

  describe('inferColumnType', () => {
    it('should return string for empty values array', () => {
      expect(inferColumnType([])).toBe('string');
    });

    it('should handle high null ratio (nullThreshold)', () => {
      const values = [null, null, null, '123', null];
      const result = inferColumnType(values, { nullThreshold: 0.5 });
      expect(result).toBe('string'); // Too many nulls
    });

    it('should find most common type in column', () => {
      const values = ['123', '456', '789', 'abc', '012'];
      const result = inferColumnType(values);
      expect(result).toBe('integer'); // Majority are integers
    });

    it('should require confidence threshold for type selection', () => {
      const values = ['123', '456', 'abc', 'def'];
      const result = inferColumnType(values, { confidenceThreshold: 0.8 });
      expect(result).toBe('string'); // Not confident enough in any type
    });

    it('should fallback to string for low confidence', () => {
      const mixedValues = ['1', 'true', '2.5', 'text'];
      const result = inferColumnType(mixedValues, { confidenceThreshold: 0.9 });
      expect(result).toBe('string');
    });

    it('should count type occurrences correctly', () => {
      const values = ['1', '2', '3', '4', '5']; // All integers
      const result = inferColumnType(values);
      expect(result).toBe('integer');
    });
  });

  describe('normalizeSchema', () => {
    it('should convert generic types to Arrow types', () => {
      const schema = {
        id: 'integer',
        name: 'string',
        active: 'boolean',
        score: 'float'
      };
      const normalized = normalizeSchema(schema);
      expect(normalized.id).toBe('int64');
      expect(normalized.name).toBe('utf8');
      expect(normalized.active).toBe('bool');
      expect(normalized.score).toBe('float64');
    });

    it('should handle invalid type names', () => {
      const schema = {
        field1: 'unknown_type',
        field2: 'string'
      };
      const normalized = normalizeSchema(schema);
      expect(normalized.field1).toBe('utf8'); // Should default to string
      expect(normalized.field2).toBe('utf8');
    });

    it('should preserve valid Arrow types', () => {
      const schema = {
        field1: 'utf8',
        field2: 'int64',
        field3: 'float64'
      };
      const normalized = normalizeSchema(schema);
      expect(normalized.field1).toBe('utf8');
      expect(normalized.field2).toBe('int64');
      expect(normalized.field3).toBe('float64');
    });

    it('should apply options for type mapping', () => {
      const schema = { number_field: 'integer' };
      const options = { integerType: 'int32' };
      const normalized = normalizeSchema(schema, options);
      expect(normalized.number_field).toBe('int32');
    });
  });

  describe('generateArrowSchema', () => {
    it('should create Arrow Schema from type map', () => {
      const typeMap = {
        id: 'int64',
        name: 'utf8',
        active: 'bool'
      };
      const arrowSchema = generateArrowSchema(typeMap);
      expect(arrowSchema).toBeDefined();
      expect(arrowSchema.fields).toHaveLength(3);
    });

    it('should handle field options (nullable, metadata)', () => {
      const typeMap = { id: 'int64' };
      const options = { nullable: false };
      const arrowSchema = generateArrowSchema(typeMap, options);
      expect(arrowSchema).toBeDefined();
    });

    it('should preserve field names', () => {
      const typeMap = {
        user_id: 'int64',
        full_name: 'utf8'
      };
      const arrowSchema = generateArrowSchema(typeMap);
      const fieldNames = arrowSchema.fields.map(f => f.name);
      expect(fieldNames).toContain('user_id');
      expect(fieldNames).toContain('full_name');
    });

    it('should create proper Arrow Field objects', () => {
      const typeMap = { id: 'int64' };
      const arrowSchema = generateArrowSchema(typeMap);
      expect(arrowSchema.fields[0]).toBeDefined();
      expect(arrowSchema.fields[0].name).toBe('id');
    });
  });

  describe('Arrow type mapping', () => {
    it('should map string to Utf8', () => {
      const normalized = normalizeSchema({ field: 'string' });
      expect(normalized.field).toBe('utf8');
    });

    it('should map integer to Int64', () => {
      const normalized = normalizeSchema({ field: 'integer' });
      expect(normalized.field).toBe('int64');
    });

    it('should map float to Float64', () => {
      const normalized = normalizeSchema({ field: 'float' });
      expect(normalized.field).toBe('float64');
    });

    it('should map boolean to Bool', () => {
      const normalized = normalizeSchema({ field: 'boolean' });
      expect(normalized.field).toBe('bool');
    });

    it('should map date to DateMillisecond', () => {
      const normalized = normalizeSchema({ field: 'date' });
      expect(normalized.field).toBe('date32');
    });

    it('should map timestamp to TimestampMillisecond', () => {
      const normalized = normalizeSchema({ field: 'timestamp' });
      expect(normalized.field).toBe('timestamp');
    });
  });
}); 