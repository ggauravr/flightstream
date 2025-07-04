/**
 * @fileoverview Main entry point for the Arrow Flight Server core package
 *
 * This package provides a generic Arrow Flight server framework with plugin architecture
 * for Node.js applications. It includes the core gRPC server, protocol handlers, and
 * base service classes for building Flight data services.
 */

// Core server components
export { FlightServer } from './flight-server.js';
export { FlightServiceBase } from './flight-service-base.js';
export { createProtocolHandlers } from './flight-protocol-handler.js';
