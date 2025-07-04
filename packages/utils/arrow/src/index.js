/**
 * @fileoverview FlightStream Utilities Package
 *
 * This package provides utilities for working with Arrow data and Flight protocol
 * in FlightStream. It includes schema inference, arrow building, and type system
 * components.
 */

// Core utilities
export { ArrowBuilder } from './arrow-builder.js';
export { inferSchema, inferColumnType, normalizeSchema, generateArrowSchema } from './schema-inference.js';
export { default as streamingUtils } from './streaming-utils.js';

// Type system (modular)
export * from './type-system/index.js';
