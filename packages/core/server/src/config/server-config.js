/**
 * Server Configuration Management
 *
 * This module provides centralized configuration management for the Flight server,
 * including default values, validation, and environment variable handling.
 */

import { DEFAULT_FLIGHT_CONFIG, ENV_VARS } from '@flightstream/core-shared';
import { getLogger } from '../utils/logger.js';

/**
 * Default server configuration
 */
export const DEFAULT_SERVER_CONFIG = {
  ...DEFAULT_FLIGHT_CONFIG,

  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  enableDebugLogging: process.env.DEBUG === 'true',

  // Performance settings
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 100,
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
};

/**
 * Validate server configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateServerConfig(config) {
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
export function createServerConfig(userConfig = {}) {
  const config = {
    ...DEFAULT_SERVER_CONFIG,
    ...userConfig
  };

  // Validate configuration
  const validation = validateServerConfig(config);

  if (!validation.isValid) {
    throw new Error(`Invalid server configuration: ${validation.errors.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    getLogger().warn('Server configuration warnings:', validation.warnings);
  }

  return config;
}

/**
 * Get configuration for specific environment
 * @param {string} environment - Environment name (development, production, test)
 * @returns {Object} Environment-specific configuration
 */
export function getEnvironmentConfig(environment = 'development') {
  const baseConfig = { ...DEFAULT_SERVER_CONFIG };

  switch (environment) {
  case 'production':
    return {
      ...baseConfig,
      logLevel: 'warn',
      enableDebugLogging: false,
      maxConcurrentRequests: 200,
      requestTimeout: 60000,
    };

  case 'test':
    return {
      ...baseConfig,
      logLevel: 'error',
      enableDebugLogging: false,
      maxConcurrentRequests: 10,
      requestTimeout: 5000,
    };

  case 'development':
  default:
    return {
      ...baseConfig,
      logLevel: 'debug',
      enableDebugLogging: true,
      maxConcurrentRequests: 50,
      requestTimeout: 30000,
    };
  }
}

/**
 * Load configuration from file
 * @param {string} configPath - Path to configuration file
 * @returns {Object} Configuration object
 */
export async function loadConfigFromFile(configPath) {
  try {
    const fs = await import('fs/promises');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    throw new Error(`Failed to load configuration from ${configPath}: ${error.message}`);
  }
}
