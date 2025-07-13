/**
 * @fileoverview CSV to Apache Arrow Streaming Converter
 * 
 * High-performance streaming CSV to Apache Arrow converter with automatic schema inference.
 * This package provides a clean abstraction for converting CSV data to Apache Arrow format
 * with streaming capabilities for memory-efficient processing of large datasets.
 */

// Core streaming converter
export { CSVArrowStreamer } from './stream.js';

// Individual components for advanced usage
export { CSVParser } from './parser.js';
export { ArrowConverter } from './converter.js';
export { SchemaInference } from './schema.js';

// Utility functions
export * from './utils.js';

// Default export for convenience
export { CSVArrowStreamer as default } from './stream.js'; 