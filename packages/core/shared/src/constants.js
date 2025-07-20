/**
 * Shared constants for FlightStream core packages
 *
 * This module provides common constants used across the FlightStream
 * core server and client packages to ensure consistency.
 */

/**
 * Default configuration values for FlightStream components
 */
export const DEFAULT_FLIGHT_CONFIG = {
  // Connection settings
  host: 'localhost',
  port: 8080,
  
  // Message size limits (100MB default)
  maxReceiveMessageLength: 100 * 1024 * 1024,
  maxSendMessageLength: 100 * 1024 * 1024,
  
  // Reliability settings
  retryAttempts: 3,
  retryDelay: 1000,
  connectionTimeout: 5000,
  
  // Advanced settings
  keepAlive: true,
  keepAliveTimeout: 20000,
  keepAliveInterval: 10000,
};

/**
 * Arrow Flight protocol constants
 */
export const FLIGHT_PROTOCOL = {
  // Protocol version
  VERSION: 1,
  
  // Descriptor types
  DESCRIPTOR_TYPES: {
    PATH: 1,
    CMD: 2,
    UNKNOWN: 0,
  },
  
  // Action types
  ACTION_TYPES: {
    REFRESH_DATASETS: 'refresh-datasets',
    GET_SERVER_INFO: 'get-server-info',
  },
  
  // Error codes
  ERROR_CODES: {
    UNAVAILABLE: 'UNAVAILABLE',
    DEADLINE_EXCEEDED: 'DEADLINE_EXCEEDED',
    INVALID_ARGUMENT: 'INVALID_ARGUMENT',
    NOT_FOUND: 'NOT_FOUND',
  },
};

/**
 * gRPC configuration constants
 */
export const GRPC_CONFIG = {
  // Proto loader options
  PROTO_LOADER_OPTIONS: {
    keepCase: true,     // Preserve field name casing from proto file
    longs: String,      // Convert 64-bit integers to strings for JavaScript compatibility
    enums: String,      // Convert enums to string values
    defaults: true,     // Include default values for optional fields
    oneofs: true,       // Support oneof field declarations
  },
  
  // Server options
  SERVER_OPTIONS: {
    'grpc.max_receive_message_length': DEFAULT_FLIGHT_CONFIG.maxReceiveMessageLength,
    'grpc.max_send_message_length': DEFAULT_FLIGHT_CONFIG.maxSendMessageLength,
  },
  
  // Client options
  CLIENT_OPTIONS: {
    'grpc.max_receive_message_length': DEFAULT_FLIGHT_CONFIG.maxReceiveMessageLength,
    'grpc.max_send_message_length': DEFAULT_FLIGHT_CONFIG.maxSendMessageLength,
    'grpc.keepalive_time_ms': DEFAULT_FLIGHT_CONFIG.keepAliveInterval,
    'grpc.keepalive_timeout_ms': DEFAULT_FLIGHT_CONFIG.keepAliveTimeout,
    'grpc.keepalive_permit_without_calls': true,
    'grpc.http2.max_pings_without_data': 0,
    'grpc.http2.min_time_between_pings_ms': 10000,
    'grpc.http2.min_ping_interval_without_data_ms': 300000,
  },
};

/**
 * File and path constants
 */
export const FILE_CONSTANTS = {
  PROTO_FILE_NAME: 'flight.proto',
  DEFAULT_DATA_DIRECTORY: './data',
  DEFAULT_CSV_BATCH_SIZE: 10000,
  DEFAULT_CSV_DELIMITER: ',',
};

/**
 * Environment variable names
 */
export const ENV_VARS = {
  FLIGHT_HOST: 'FLIGHT_HOST',
  FLIGHT_PORT: 'FLIGHT_PORT',
  DATA_DIRECTORY: 'DATA_DIRECTORY',
  CSV_BATCH_SIZE: 'CSV_BATCH_SIZE',
  CSV_DELIMITER: 'CSV_DELIMITER',
  CSV_HEADERS: 'CSV_HEADERS',
  FLIGHT_RETRY_ATTEMPTS: 'FLIGHT_RETRY_ATTEMPTS',
  FLIGHT_RETRY_DELAY: 'FLIGHT_RETRY_DELAY',
  FLIGHT_CONNECTION_TIMEOUT: 'FLIGHT_CONNECTION_TIMEOUT',
};

/**
 * Logging constants
 */
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * Event names for connection state changes
 */
export const CONNECTION_EVENTS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
  CONNECTION_ERROR: 'connectionError',
  DISCONNECT_ERROR: 'disconnectError',
}; 