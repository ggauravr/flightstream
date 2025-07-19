/**
 * @flightstream/core-shared
 *
 * Shared utilities for FlightStream core packages
 *
 * This package provides common utilities, constants, and protocol handling
 * for the FlightStream core server and client packages.
 */

// Export all constants
export * from './constants.js';

// Export all protocol utilities
export * from './protocol-utils.js';

// Export Arrow utilities
export { ArrowBuilder } from './arrow-builder.js';

// Default export for convenience
export { DEFAULT_FLIGHT_CONFIG as default } from './constants.js';
