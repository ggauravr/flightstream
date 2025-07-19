/**
 * @fileoverview FlightStream Advanced Arrow Utilities Package
 *
 * This package provides advanced utilities for working with Arrow data and Flight protocol
 * in FlightStream. It includes advanced schema inference, streaming utilities, and type system
 * components.
 *
 * Note: Basic ArrowBuilder is now available in @flightstream/core-shared
 */

// Advanced schema inference utilities
export { inferSchema, inferColumnType, normalizeSchema, generateArrowSchema } from './schema-inference.js';

// Advanced streaming utilities
export { default as streamingUtils } from './streaming-utils.js';

// Advanced type system (modular)
export * from './type-system/index.js';
