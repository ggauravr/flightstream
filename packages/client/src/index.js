/**
 * @fileoverview FlightStream Client Library - Framework-agnostic client for Arrow Flight servers
 * 
 * This library provides a clean, modern API for connecting to FlightStream servers
 * from any frontend framework (React, Vue, Svelte, etc.) or vanilla JavaScript.
 */

export { FlightClient } from './flight-client.js';
export { ConnectionManager } from './connection-manager.js';
export { DataHandler } from './data-handler.js';
export { FlightClientError, ConnectionError, DataError } from './errors.js';

/**
 * Default export for convenience
 */
export { FlightClient as default } from './flight-client.js';

/**
 * Library version and metadata
 */
export const VERSION = '1.0.0';
export const SUPPORTED_PROTOCOLS = ['grpc-web'];
export const BROWSER_SUPPORT = {
  chrome: '>=90',
  firefox: '>=88',
  safari: '>=14',
  edge: '>=90'
}; 