import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { GRPC_CONFIG, FLIGHT_PROTOCOL } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Shared protocol utilities for FlightStream core packages
 *
 * This module provides common utilities for gRPC and Arrow Flight
 * protocol operations used by both server and client packages.
 */

/**
 * Load Arrow Flight protocol definition from proto file
 * @param {string} protoPath - Path to the proto file
 * @returns {Object} Arrow Flight protocol definition
 */
export function loadFlightProto(protoPath) {
  try {
    // Parse the protocol buffer definition
    const packageDefinition = protoLoader.loadSync(protoPath, GRPC_CONFIG.PROTO_LOADER_OPTIONS);

    // Extract the Arrow Flight service definition
    const flightProto = grpc.loadPackageDefinition(packageDefinition).arrow.flight.protocol;

    return flightProto;
  } catch (error) {
    throw new Error(`Failed to load Flight protocol from ${protoPath}: ${error.message}`);
  }
}

/**
 * Get default proto file path relative to the shared package
 * @returns {string} Path to the default proto file
 */
export function getDefaultProtoPath() {
  return path.join(__dirname, '../../server/proto/flight.proto');
}

/**
 * Create gRPC server options from configuration
 * @param {Object} config - Server configuration
 * @returns {Object} gRPC server options
 */
export function createServerOptions(config) {
  return {
    'grpc.max_receive_message_length': config.maxReceiveMessageLength || GRPC_CONFIG.SERVER_OPTIONS['grpc.max_receive_message_length'],
    'grpc.max_send_message_length': config.maxSendMessageLength || GRPC_CONFIG.SERVER_OPTIONS['grpc.max_send_message_length'],
  };
}

/**
 * Create gRPC client options from configuration
 * @param {Object} config - Client configuration
 * @returns {Object} gRPC client options
 */
export function createClientOptions(config) {
  return {
    'grpc.max_receive_message_length': config.maxReceiveMessageLength || GRPC_CONFIG.CLIENT_OPTIONS['grpc.max_receive_message_length'],
    'grpc.max_send_message_length': config.maxSendMessageLength || GRPC_CONFIG.CLIENT_OPTIONS['grpc.max_send_message_length'],
    'grpc.keepalive_time_ms': config.keepAliveInterval || GRPC_CONFIG.CLIENT_OPTIONS['grpc.keepalive_time_ms'],
    'grpc.keepalive_timeout_ms': config.keepAliveTimeout || GRPC_CONFIG.CLIENT_OPTIONS['grpc.keepalive_timeout_ms'],
    'grpc.keepalive_permit_without_calls': GRPC_CONFIG.CLIENT_OPTIONS['grpc.keepalive_permit_without_calls'],
    'grpc.http2.max_pings_without_data': GRPC_CONFIG.CLIENT_OPTIONS['grpc.http2.max_pings_without_data'],
    'grpc.http2.min_time_between_pings_ms': GRPC_CONFIG.CLIENT_OPTIONS['grpc.http2.min_time_between_pings_ms'],
    'grpc.http2.min_ping_interval_without_data_ms': GRPC_CONFIG.CLIENT_OPTIONS['grpc.http2.min_ping_interval_without_data_ms'],
  };
}

/**
 * Create a Flight descriptor for a dataset
 * @param {string} datasetId - The dataset identifier
 * @param {number} type - Descriptor type (default: PATH)
 * @returns {Object} Flight descriptor
 */
export function createFlightDescriptor(datasetId, type = FLIGHT_PROTOCOL.DESCRIPTOR_TYPES.PATH) {
  return {
    type: type,
    path: [datasetId]
  };
}

/**
 * Create a Flight ticket for data retrieval
 * @param {string} datasetId - The dataset identifier
 * @returns {Object} Flight ticket
 */
export function createFlightTicket(datasetId) {
  return {
    ticket: Buffer.from(datasetId)
  };
}

/**
 * Create a Flight action
 * @param {string} actionType - The action type
 * @param {Object} actionBody - The action body
 * @returns {Object} Flight action
 */
export function createFlightAction(actionType, actionBody = {}) {
  return {
    type: actionType,
    body: Buffer.from(JSON.stringify(actionBody))
  };
}

/**
 * Convert error to gRPC error format
 * @param {Error} error - The error to convert
 * @returns {Object} gRPC error object
 */
export function convertToGrpcError(error) {
  return {
    code: grpc.status.INTERNAL,
    message: error.message || 'Internal server error',
    details: error.stack || ''
  };
}

/**
 * Validate Flight descriptor
 * @param {Object} descriptor - Flight descriptor to validate
 * @returns {boolean} True if valid
 */
export function validateFlightDescriptor(descriptor) {
  return descriptor && 
         typeof descriptor.type === 'number' && 
         Array.isArray(descriptor.path) &&
         descriptor.path.length > 0;
}

/**
 * Validate Flight ticket
 * @param {Object} ticket - Flight ticket to validate
 * @returns {boolean} True if valid
 */
export function validateFlightTicket(ticket) {
  return ticket && 
         ticket.ticket && 
         Buffer.isBuffer(ticket.ticket);
}

/**
 * Validate Flight action
 * @param {Object} action - Flight action to validate
 * @returns {boolean} True if valid
 */
export function validateFlightAction(action) {
  return action && 
         typeof action.type === 'string' && 
         action.type.length > 0;
}

/**
 * Create server credentials
 * @param {Object} options - Credential options
 * @returns {Object} gRPC server credentials
 */
export function createServerCredentials(options = {}) {
  if (options.secure) {
    // For secure connections, you would load certificates here
    throw new Error('Secure connections not yet implemented');
  }
  
  return grpc.ServerCredentials.createInsecure();
}

/**
 * Create client credentials
 * @param {Object} options - Credential options
 * @returns {Object} gRPC client credentials
 */
export function createClientCredentials(options = {}) {
  if (options.secure) {
    // For secure connections, you would load certificates here
    throw new Error('Secure connections not yet implemented');
  }
  
  return grpc.credentials.createInsecure();
}

/**
 * Merge configuration with defaults
 * @param {Object} userConfig - User configuration
 * @param {Object} defaultConfig - Default configuration
 * @returns {Object} Merged configuration
 */
export function mergeConfig(userConfig = {}, defaultConfig = {}) {
  return {
    ...defaultConfig,
    ...userConfig,
    // Deep merge for nested objects
    ...Object.keys(userConfig).reduce((acc, key) => {
      if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
        acc[key] = mergeConfig(userConfig[key], defaultConfig[key] || {});
      }
      return acc;
    }, {})
  };
} 