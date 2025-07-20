/**
 * @fileoverview CSV service for Arrow Flight servers
 *
 * This package provides a complete CSV file adapter for Arrow Flight servers,
 * including streaming CSV parsing, automatic schema inference, and efficient
 * Arrow data conversion.
 */

// Main adapter
export { CSVFlightService } from './csv-service.js';

// CSV streaming utilities
export { CSVStreamer } from './csv-streamer.js';
