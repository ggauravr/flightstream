/**
 * @fileoverview Custom error classes for FlightStream client library
 */

/**
 * Base error class for FlightStream client errors
 */
export class FlightClientError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'FlightClientError';
    this.cause = cause;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FlightClientError);
    }
  }

  /**
   * Get error details as object
   * 
   * @returns {Object} Error details
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      cause: this.cause ? this.cause.message : null,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends FlightClientError {
  constructor(message, cause = null) {
    super(message, cause);
    this.name = 'ConnectionError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConnectionError);
    }
  }
}

/**
 * Data processing and parsing errors
 */
export class DataError extends FlightClientError {
  constructor(message, cause = null) {
    super(message, cause);
    this.name = 'DataError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataError);
    }
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends FlightClientError {
  constructor(message, cause = null) {
    super(message, cause);
    this.name = 'AuthError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

/**
 * Stream-related errors
 */
export class StreamError extends FlightClientError {
  constructor(message, cause = null) {
    super(message, cause);
    this.name = 'StreamError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StreamError);
    }
  }
}

/**
 * Configuration and validation errors
 */
export class ConfigError extends FlightClientError {
  constructor(message, cause = null) {
    super(message, cause);
    this.name = 'ConfigError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigError);
    }
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends FlightClientError {
  constructor(message, timeout, cause = null) {
    super(message, cause);
    this.name = 'TimeoutError';
    this.timeout = timeout;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      timeout: this.timeout
    };
  }
} 