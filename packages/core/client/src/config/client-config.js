/**
 * Client Configuration Management
 *
 * This module provides centralized configuration management for the Flight client,
 * including default values, validation, and environment variable handling.
 */

/**
 * Default client configuration
 */
export const DEFAULT_CLIENT_CONFIG = {
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

  // Logging
  logger: console,
};

/**
 * Validate client configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateClientConfig(config) {
  const errors = [];
  const warnings = [];

  // Validate required fields
  if (!config.host) {
    errors.push('host is required');
  }

  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push('port must be between 1 and 65535');
  }

  if (config.maxReceiveMessageLength < 1024) {
    warnings.push('maxReceiveMessageLength is very small, may cause issues');
  }

  if (config.maxSendMessageLength < 1024) {
    warnings.push('maxSendMessageLength is very small, may cause issues');
  }

  if (config.retryAttempts < 0) {
    errors.push('retryAttempts must be non-negative');
  }

  if (config.retryDelay < 0) {
    errors.push('retryDelay must be non-negative');
  }

  if (config.connectionTimeout < 0) {
    errors.push('connectionTimeout must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Merge user configuration with defaults
 * @param {Object} userConfig - User-provided configuration
 * @returns {Object} Merged configuration
 */
export function createClientConfig(userConfig = {}) {
  const config = {
    ...DEFAULT_CLIENT_CONFIG,
    ...userConfig
  };

  // Validate configuration
  const validation = validateClientConfig(config);

  if (!validation.isValid) {
    throw new Error(`Invalid client configuration: ${validation.errors.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    config.logger.warn('Client configuration warnings:', validation.warnings);
  }

  return config;
}

/**
 * Get configuration for specific environment
 * @param {string} environment - Environment name (development, production, test)
 * @returns {Object} Environment-specific configuration
 */
export function getEnvironmentConfig(environment = 'development') {
  const baseConfig = { ...DEFAULT_CLIENT_CONFIG };

  switch (environment) {
  case 'production':
    return {
      ...baseConfig,
      retryAttempts: 5,
      retryDelay: 2000,
      connectionTimeout: 10000,
    };

  case 'test':
    return {
      ...baseConfig,
      retryAttempts: 1,
      retryDelay: 100,
      connectionTimeout: 1000,
    };

  case 'development':
  default:
    return {
      ...baseConfig,
      retryAttempts: 3,
      retryDelay: 1000,
      connectionTimeout: 5000,
    };
  }
} 