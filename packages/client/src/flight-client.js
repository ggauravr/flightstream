/**
 * @fileoverview Main FlightClient class for connecting to Arrow Flight servers from browsers
 */

import { ConnectionManager } from './connection-manager.js';
import { DataHandler } from './data-handler.js';
import { FlightClientError, ConnectionError } from './errors.js';

/**
 * Framework-agnostic client for Arrow Flight servers
 * 
 * @example
 * ```javascript
 * import { FlightClient } from '@flightstream/client';
 * 
 * const client = new FlightClient({
 *   endpoint: 'http://localhost:8080',
 *   timeout: 30000
 * });
 * 
 * // List available datasets
 * const datasets = await client.listFlights();
 * 
 * // Stream data from a dataset
 * const stream = client.getStream('my-dataset');
 * stream.on('data', (batch) => {
 *   console.log('Received batch:', batch);
 * });
 * ```
 */
export class FlightClient {
  /**
   * Create a new FlightClient instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.endpoint - Flight server endpoint URL
   * @param {number} [options.timeout=30000] - Request timeout in milliseconds
   * @param {Object} [options.headers={}] - Default headers to include with requests
   * @param {boolean} [options.enableCompression=true] - Enable gRPC compression
   * @param {boolean} [options.enableRetry=true] - Enable automatic retry on failures
   * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
   * @param {Function} [options.onError] - Global error handler function
   * @param {Function} [options.onConnect] - Connection established callback
   * @param {Function} [options.onDisconnect] - Connection lost callback
   */
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      headers: {},
      enableCompression: true,
      enableRetry: true,
      maxRetries: 3,
      ...options
    };

    if (!this.options.endpoint) {
      throw new FlightClientError('Endpoint URL is required');
    }

    // Initialize connection manager
    this.connectionManager = new ConnectionManager(this.options);
    
    // Initialize data handler
    this.dataHandler = new DataHandler();
    
    // Connection state
    this.isConnected = false;
    this.isConnecting = false;
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Setup connection event handlers
    this._setupConnectionHandlers();
  }

  /**
   * Connect to the Flight server
   * 
   * @returns {Promise<void>}
   * @throws {ConnectionError} If connection fails
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    if (this.isConnecting) {
      throw new ConnectionError('Connection already in progress');
    }

    try {
      this.isConnecting = true;
      await this.connectionManager.connect();
      this.isConnected = true;
      this.isConnecting = false;
      
      this._emit('connect');
      
      if (this.options.onConnect) {
        this.options.onConnect();
      }
    } catch (error) {
      this.isConnecting = false;
      const connectionError = new ConnectionError(`Failed to connect: ${error.message}`, error);
      
      if (this.options.onError) {
        this.options.onError(connectionError);
      }
      
      throw connectionError;
    }
  }

  /**
   * Disconnect from the Flight server
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.connectionManager.disconnect();
      this.isConnected = false;
      
      this._emit('disconnect');
      
      if (this.options.onDisconnect) {
        this.options.onDisconnect();
      }
    } catch (error) {
      // Log error but don't throw - disconnection should be best effort
      console.warn('Error during disconnection:', error);
    }
  }

  /**
   * List available flights (datasets) on the server
   * 
   * @param {Object} [criteria={}] - Filter criteria for flights
   * @returns {Promise<Array<Object>>} Array of flight descriptors
   * @throws {ConnectionError} If not connected to server
   */
  async listFlights(criteria = {}) {
    await this._ensureConnected();
    
    try {
      const flights = await this.connectionManager.listFlights(criteria);
      return flights.map(flight => this.dataHandler.parseFlightInfo(flight));
    } catch (error) {
      throw new FlightClientError(`Failed to list flights: ${error.message}`, error);
    }
  }

  /**
   * Get information about a specific flight
   * 
   * @param {string} flightDescriptor - Flight descriptor or dataset name
   * @returns {Promise<Object>} Flight information including schema
   */
  async getFlightInfo(flightDescriptor) {
    await this._ensureConnected();
    
    try {
      const info = await this.connectionManager.getFlightInfo(flightDescriptor);
      return this.dataHandler.parseFlightInfo(info);
    } catch (error) {
      throw new FlightClientError(`Failed to get flight info: ${error.message}`, error);
    }
  }

  /**
   * Get schema for a specific flight
   * 
   * @param {string} flightDescriptor - Flight descriptor or dataset name
   * @returns {Promise<Object>} Arrow schema object
   */
  async getSchema(flightDescriptor) {
    await this._ensureConnected();
    
    try {
      const schema = await this.connectionManager.getSchema(flightDescriptor);
      return this.dataHandler.parseSchema(schema);
    } catch (error) {
      throw new FlightClientError(`Failed to get schema: ${error.message}`, error);
    }
  }

  /**
   * Create a data stream for a specific flight
   * 
   * @param {string} flightDescriptor - Flight descriptor or dataset name
   * @param {Object} [options={}] - Stream options
   * @param {number} [options.batchSize] - Preferred batch size
   * @param {boolean} [options.autoStart=true] - Auto-start the stream
   * @returns {FlightDataStream} Data stream object
   */
  getStream(flightDescriptor, options = {}) {
    if (!this.isConnected) {
      throw new ConnectionError('Client must be connected before creating streams');
    }

    return this.connectionManager.createStream(flightDescriptor, {
      dataHandler: this.dataHandler,
      ...options
    });
  }

  /**
   * Execute a query and return results as a stream
   * 
   * @param {string} query - SQL query or command
   * @param {Object} [options={}] - Query options
   * @returns {FlightDataStream} Results stream
   */
  query(query, options = {}) {
    return this.getStream({ type: 'query', query }, options);
  }

  /**
   * Get data as a complete dataset (all batches collected)
   * 
   * @param {string} flightDescriptor - Flight descriptor or dataset name
   * @param {Object} [options={}] - Collection options
   * @param {number} [options.maxBatches] - Maximum number of batches to collect
   * @param {number} [options.timeout] - Timeout for data collection
   * @returns {Promise<Array<Object>>} Complete dataset as array of records
   */
  async getData(flightDescriptor, options = {}) {
    const stream = this.getStream(flightDescriptor, { autoStart: false });
    
    return new Promise((resolve, reject) => {
      const batches = [];
      let batchCount = 0;
      const maxBatches = options.maxBatches || Infinity;
      
      // Set timeout if specified
      let timeoutId;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          stream.cancel();
          reject(new FlightClientError(`Data collection timeout after ${options.timeout}ms`));
        }, options.timeout);
      }
      
      stream.on('data', (batch) => {
        batches.push(batch);
        batchCount++;
        
        if (batchCount >= maxBatches) {
          stream.cancel();
        }
      });
      
      stream.on('end', () => {
        if (timeoutId) clearTimeout(timeoutId);
        const data = this.dataHandler.combineBatches(batches);
        resolve(data);
      });
      
      stream.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new FlightClientError(`Data stream error: ${error.message}`, error));
      });
      
      // Start the stream
      stream.start();
    });
  }

  /**
   * Add event listener
   * 
   * @param {string} event - Event name ('connect', 'disconnect', 'error', 'data')
   * @param {Function} listener - Event listener function
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  /**
   * Remove event listener
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function to remove
   */
  off(event, listener) {
    if (!this.eventListeners.has(event)) {
      return;
    }
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Get current connection status
   * 
   * @returns {Object} Connection status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      endpoint: this.options.endpoint,
      connectionInfo: this.connectionManager.getConnectionInfo()
    };
  }

  /**
   * Update client configuration
   * 
   * @param {Object} newOptions - New configuration options
   */
  updateConfig(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.connectionManager.updateConfig(newOptions);
  }

  /**
   * Private method to ensure client is connected
   * 
   * @private
   */
  async _ensureConnected() {
    if (!this.isConnected && !this.isConnecting) {
      await this.connect();
    } else if (this.isConnecting) {
      // Wait for connection to complete
      await new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.isConnected) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new ConnectionError('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }
  }

  /**
   * Private method to setup connection event handlers
   * 
   * @private
   */
  _setupConnectionHandlers() {
    this.connectionManager.on('disconnect', () => {
      this.isConnected = false;
      this._emit('disconnect');
    });

    this.connectionManager.on('error', (error) => {
      this._emit('error', error);
      if (this.options.onError) {
        this.options.onError(error);
      }
    });
  }

  /**
   * Private method to emit events
   * 
   * @private
   */
  _emit(event, ...args) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
} 