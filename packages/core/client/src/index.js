/**
 * @flightstream/core-client
 * 
 * Core Apache Arrow Flight client framework for Node.js
 * 
 * This package provides a simple and powerful interface for connecting to
 * Arrow Flight servers, with automatic connection management, retry logic,
 * and efficient data streaming.
 */

// Main client class
export { FlightClient } from './flight-client.js';

// Base classes for extensibility
export { FlightClientBase } from './flight-client-base.js';
export { FlightProtocolClient } from './flight-protocol-client.js';

// Default export for convenience
export { FlightClient as default } from './flight-client.js'; 