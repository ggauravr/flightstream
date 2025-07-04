import { TypeTransformer } from './type-transformer.js';

/**
 * TypeRegistry - Maintains mappings between logical types, Arrow types, and transformer functions
 *
 * This class provides a central registry for type mapping and extensibility.
 * It maps logical type names to Arrow types and provides transformer functions
 * for converting values to Arrow-compatible formats.
 */
export class TypeRegistry {
  constructor() {
    this.transformer = new TypeTransformer();
    this.typeMappings = new Map();
    this.arrowTransformers = new Map();

    this._initializeDefaultMappings();
  }

  /**
   * Initialize default type mappings
   * @private
   */
  _initializeDefaultMappings() {
    // Logical type to Arrow type mappings
    const defaultTypeMappings = {
      'boolean': 'bool',
      'int8': 'int8',
      'int16': 'int16',
      'int32': 'int32',
      'int64': 'int64',
      'uint8': 'uint8',
      'uint16': 'uint16',
      'uint32': 'uint32',
      'uint64': 'uint64',
      'float16': 'float16',
      'float32': 'float32',
      'float64': 'float64',
      'date': 'date32',
      'timestamp': 'timestamp',
      'time': 'time32',
      'string': 'utf8',
      'binary': 'binary'
    };

    for (const [logicalType, arrowType] of Object.entries(defaultTypeMappings)) {
      this.typeMappings.set(logicalType, arrowType);
    }

    // Arrow type transformers
    this._initializeArrowTransformers();
  }

  /**
   * Initialize Arrow type transformers
   * @private
   */
  _initializeArrowTransformers() {
    const transformers = {
      // Boolean types
      'Bool': (v) => v === null ? null : Boolean(v),

      // Integer types
      'Int8': (v) => v === null ? null : this.transformer.safeParseInt(v),
      'Int16': (v) => v === null ? null : this.transformer.safeParseInt(v),
      'Int32': (v) => v === null ? null : this.transformer.safeParseInt(v),
      'Int64': (v) => {
        if (v === null) return null;
        const parsed = this.transformer.safeParseInt(v);
        return parsed === null ? null : BigInt(parsed);
      },
      'Uint8': (v) => v === null ? null : this.transformer.safeParseInt(v),
      'Uint16': (v) => v === null ? null : this.transformer.safeParseInt(v),
      'Uint32': (v) => v === null ? null : this.transformer.safeParseInt(v),
      'Uint64': (v) => {
        if (v === null) return null;
        const parsed = this.transformer.safeParseInt(v);
        return parsed === null ? null : BigInt(parsed);
      },

      // Float types
      'Float16': (v) => v === null ? null : this.transformer.safeParseFloat(v),
      'Float32': (v) => v === null ? null : this.transformer.safeParseFloat(v),
      'Float64': (v) => v === null ? null : this.transformer.safeParseFloat(v),

      // Date and time types
      'DateDay': (v) => v === null ? null : this.transformer.safeParseDateDays(v),
      'DateMillisecond': (v) => v === null ? null : this.transformer.safeParseDateMillis(v),
      'TimestampSecond': (v) => v === null ? null : this.transformer.safeParseTimestamp(v, 1000),
      'TimestampMillisecond': (v) => v === null ? null : this.transformer.safeParseTimestamp(v, 1),
      'TimestampMicrosecond': (v) => v === null ? null : this.transformer.safeParseTimestamp(v, 0.001),
      'TimestampNanosecond': (v) => v === null ? null : this.transformer.safeParseTimestamp(v, 0.000001),
      'TimeSecond': (v) => v === null ? null : this.transformer.safeParseTime(v, 1000),
      'TimeMillisecond': (v) => v === null ? null : this.transformer.safeParseTime(v, 1),
      'TimeMicrosecond': (v) => v === null ? null : this.transformer.safeParseTime(v, 0.001),
      'TimeNanosecond': (v) => v === null ? null : this.transformer.safeParseTime(v, 0.000001),

      // String types
      'Utf8': (v) => v === null ? null : String(v),
      'LargeUtf8': (v) => v === null ? null : String(v),
      'Binary': (v) => v === null ? null : this.transformer.safeParseBinary(v),
      'LargeBinary': (v) => v === null ? null : this.transformer.safeParseBinary(v),

      // Decimal types
      'Decimal': (v, arrowType) => v === null ? null : this.transformer.safeParseDecimal(v, arrowType),
      'Decimal128': (v, arrowType) => v === null ? null : this.transformer.safeParseDecimal(v, arrowType),
      'Decimal256': (v, arrowType) => v === null ? null : this.transformer.safeParseDecimal(v, arrowType),

      // List and nested types
      'List': (v) => v === null ? null : this.transformer.safeParseList(v),
      'LargeList': (v) => v === null ? null : this.transformer.safeParseList(v),
      'FixedSizeList': (v) => v === null ? null : this.transformer.safeParseList(v),

      // Struct and map types
      'Struct': (v) => v === null ? null : this.transformer.safeParseStruct(v),
      'Map': (v) => v === null ? null : this.transformer.safeParseMap(v),

      // Union types
      'Union': (v) => v === null ? null : v, // Union types are complex, pass through
      'DenseUnion': (v) => v === null ? null : v,
      'SparseUnion': (v) => v === null ? null : v,

      // Dictionary types
      'Dictionary': (v) => v === null ? null : v, // Dictionary encoding handled by Arrow

      // Fixed-size types
      'FixedSizeBinary': (v) => v === null ? null : this.transformer.safeParseBinary(v),

      // Interval types
      'IntervalDayTime': (v) => v === null ? null : this.transformer.safeParseInterval(v),
      'IntervalYearMonth': (v) => v === null ? null : this.transformer.safeParseInterval(v),
      'IntervalMonthDayNano': (v) => v === null ? null : this.transformer.safeParseInterval(v),

      // Duration types
      'DurationSecond': (v) => v === null ? null : this.transformer.safeParseDuration(v, 1000),
      'DurationMillisecond': (v) => v === null ? null : this.transformer.safeParseDuration(v, 1),
      'DurationMicrosecond': (v) => v === null ? null : this.transformer.safeParseDuration(v, 0.001),
      'DurationNanosecond': (v) => v === null ? null : this.transformer.safeParseDuration(v, 0.000001),
    };

    for (const [typeName, transformer] of Object.entries(transformers)) {
      this.arrowTransformers.set(typeName, transformer);
    }
  }

  /**
   * Map inferred type to Arrow type
   * @param {string} type - Inferred type
   * @returns {string} Arrow type
   */
  mapToArrowType(type) {
    return this.typeMappings.get(type) || 'utf8';
  }

  /**
   * Check if a type is valid for Arrow
   * @param {string} type - Type to validate
   * @returns {boolean}
   */
  isValidArrowType(type) {
    const validTypes = [
      'boolean', 'int8', 'int16', 'int32', 'int64',
      'uint8', 'uint16', 'uint32', 'uint64',
      'float16', 'float32', 'float64', 'string', 'binary',
      'date', 'timestamp', 'time'
    ];
    return validTypes.includes(type);
  }

  /**
   * Get the appropriate data transformer for an Arrow type
   * @param {arrow.DataType} arrowType - Arrow data type
   * @returns {Function} Data transformation function
   */
  getTypeTransformer(arrowType) {
    const typeName = arrowType.constructor.name;
    const transformer = this.arrowTransformers.get(typeName);

    // Return the appropriate transformer, or default to string conversion
    return transformer || ((v) => v === null ? null : String(v));
  }

  /**
   * Register a new type mapping
   * @param {string} logicalType - Logical type name
   * @param {string} arrowType - Arrow type name
   */
  registerTypeMapping(logicalType, arrowType) {
    this.typeMappings.set(logicalType, arrowType);
  }

  /**
   * Register a new Arrow type transformer
   * @param {string} typeName - Arrow type name (constructor name)
   * @param {Function} transformer - Transformation function
   */
  registerArrowTransformer(typeName, transformer) {
    this.arrowTransformers.set(typeName, transformer);
  }

  /**
   * Register a complete type definition
   * @param {string} logicalType - Logical type name
   * @param {Object} definition - Type definition
   * @param {string} definition.arrowType - Arrow type name
   * @param {Function} definition.transformer - Transformation function
   * @param {Function} definition.detector - Detection function (optional)
   */
  registerType(logicalType, definition) {
    if (definition.arrowType) {
      this.registerTypeMapping(logicalType, definition.arrowType);
    }

    if (definition.transformer) {
      this.registerArrowTransformer(logicalType, definition.transformer);
    }
  }

  /**
   * Get all registered logical types
   * @returns {Array<string>} Array of logical type names
   */
  getRegisteredLogicalTypes() {
    return Array.from(this.typeMappings.keys());
  }

  /**
   * Get all registered Arrow transformers
   * @returns {Array<string>} Array of Arrow type names
   */
  getRegisteredArrowTransformers() {
    return Array.from(this.arrowTransformers.keys());
  }
}
