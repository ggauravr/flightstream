import { EventEmitter } from 'events';
import { DEFAULT_FLIGHT_CONFIG } from '@flightstream/core-shared';

/**
 * Base Flight Client Interface
 *
 * This abstract class defines the standard interface for Arrow Flight clients.
 * It provides common functionality like event handling, configuration management,
 * and lifecycle management that all client implementations should have.
 */
export class FlightClientBase extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      ...DEFAULT_FLIGHT_CONFIG,
      logger: options.logger || console,
      ...options
    };

    // Connection state
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionError = null;

    // Internal state
    this._connectionPromise = null;
    this._disconnectPromise = null;
  }

  /**
   * Connect to the Flight server
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    if (this.isConnecting) {
      return this._connectionPromise;
    }

    this.isConnecting = true;
    this.connectionError = null;
    this.emit('connecting');

    this._connectionPromise = this._connectInternal()
      .then(() => {
        this.isConnected = true;
        this.isConnecting = false;
        this.emit('connected');
        this.options.logger.info('Connected to Flight server');
      })
      .catch((error) => {
        this.isConnecting = false;
        this.connectionError = error;
        this.emit('connectionError', error);
        this.options.logger.error('Failed to connect to Flight server:', error);
        throw error;
      });

    return this._connectionPromise;
  }

  /**
   * Disconnect from the Flight server
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    if (this._disconnectPromise) {
      return this._disconnectPromise;
    }

    this.emit('disconnecting');
    this.options.logger.info('Disconnecting from Flight server');

    this._disconnectPromise = this._disconnectInternal()
      .then(() => {
        this.isConnected = false;
        this.connectionError = null;
        this._disconnectPromise = null;
        this.emit('disconnected');
        this.options.logger.info('Disconnected from Flight server');
      })
      .catch((error) => {
        this._disconnectPromise = null;
        this.emit('disconnectError', error);
        this.options.logger.error('Error disconnecting from Flight server:', error);
        throw error;
      });

    return this._disconnectPromise;
  }

  /**
   * Get connection status
   * @returns {Object} Connection status information
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionError: this.connectionError,
      host: this.options.host,
      port: this.options.port
    };
  }

  /**
   * List available datasets
   * @returns {Promise<Array>} List of available dataset information
   */
  async listDatasets() {
    throw new Error('listDatasets() must be implemented by subclass');
  }

  /**
   * Get information about a specific dataset
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<Object>} Dataset information
   */
  async getDatasetInfo(datasetId) {
    throw new Error('getDatasetInfo() must be implemented by subclass');
  }

  /**
   * Get the schema for a dataset
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<Object>} Arrow schema
   */
  async getSchema(datasetId) {
    throw new Error('getSchema() must be implemented by subclass');
  }

  /**
   * Get a dataset as an Arrow table
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<Object>} Arrow table
   */
  async getDataset(datasetId) {
    throw new Error('getDataset() must be implemented by subclass');
  }

  /**
   * Stream a dataset as record batches
   * @param {string} datasetId - The dataset identifier
   * @returns {AsyncGenerator} Async generator yielding Arrow record batches
   */
  async *streamDataset(datasetId) {
    throw new Error('streamDataset() must be implemented by subclass');
  }

  /**
   * Execute a custom action on the server
   * @param {string} actionType - The action type
   * @param {Object} actionBody - The action body
   * @returns {Promise<Array>} Action results
   */
  async doAction(actionType, actionBody = {}) {
    throw new Error('doAction() must be implemented by subclass');
  }

  /**
   * List available actions
   * @returns {Promise<Array>} List of available actions
   */
  async listActions() {
    throw new Error('listActions() must be implemented by subclass');
  }

  /**
   * Internal connection implementation
   * @protected
   * @returns {Promise<void>}
   */
  async _connectInternal() {
    throw new Error('_connectInternal() must be implemented by subclass');
  }

  /**
   * Internal disconnection implementation
   * @protected
   * @returns {Promise<void>}
   */
  async _disconnectInternal() {
    throw new Error('_disconnectInternal() must be implemented by subclass');
  }

  /**
   * Execute an operation with retry logic
   * @protected
   * @param {Function} operation - The operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Operation result
   */
  async _executeWithRetry(operation, options = {}) {
    const maxAttempts = options.maxAttempts || this.options.retryAttempts;
    const delay = options.delay || this.options.retryDelay;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
} 