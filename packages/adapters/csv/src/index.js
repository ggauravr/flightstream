/**
 * @fileoverview CSV service for Arrow Flight servers
 *
 * This package provides a complete CSV file adapter for Arrow Flight servers,
 * including streaming CSV parsing, automatic schema inference, and efficient
 * Arrow data conversion.
 */

// Main adapter
export { CSVFlightService } from './csv-service.js';

// Streaming utilities
export { CSVStreamer } from './csv-streamer.js';

// Arrow conversion utilities
export { CSVArrowBuilder } from './csv-arrow-builder.js';

// Constants
export { DEFAULT_CSV_CONFIG, CSV_ENV_VARS } from './constants.js';
