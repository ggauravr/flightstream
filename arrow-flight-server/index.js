// Core exports
export { FlightServer } from './core/flight-server.js';
export { FlightServiceBase } from './core/flight-service-base.js';
export { createProtocolHandlers } from './core/protocol-handlers.js';

// Adapter exports
export { CSVFlightService } from './adapters/csv-adapter.js';
export { CSVStreamer } from './adapters/csv-streamer.js';

// Utility exports
export { ArrowBuilder } from './utils/arrow-builder.js';
export {
  inferType,
  inferSchema,
  inferColumnType,
  normalizeSchema,
  generateArrowSchema
} from './utils/schema-inference.js';
export {
  StreamProcessor,
  BatchProcessor,
  DataChunker,
  StreamBuffer,
  RateLimiter
} from './utils/streaming-utils.js';

// Import all components for default export
import { FlightServer } from './core/flight-server.js';
import { FlightServiceBase } from './core/flight-service-base.js';
import { createProtocolHandlers } from './core/protocol-handlers.js';
import { CSVFlightService } from './adapters/csv-adapter.js';
import { CSVStreamer } from './adapters/csv-streamer.js';
import { ArrowBuilder } from './utils/arrow-builder.js';
import {
  inferType,
  inferSchema,
  inferColumnType,
  normalizeSchema,
  generateArrowSchema
} from './utils/schema-inference.js';
import {
  StreamProcessor,
  BatchProcessor,
  DataChunker,
  StreamBuffer,
  RateLimiter
} from './utils/streaming-utils.js';

// Default exports for common usage patterns
export default {
  // Core
  FlightServer,
  FlightServiceBase,
  createProtocolHandlers,
  
  // Adapters
  CSVFlightService,
  CSVStreamer,
  
  // Utils
  ArrowBuilder,
  
  // Schema inference
  inferType,
  inferSchema,
  inferColumnType,
  normalizeSchema,
  generateArrowSchema,
  
  // Streaming
  StreamProcessor,
  BatchProcessor,
  DataChunker,
  StreamBuffer,
  RateLimiter
}; 