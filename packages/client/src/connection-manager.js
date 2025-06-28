/**
 * @fileoverview Connection manager for handling gRPC-Web connections to Arrow Flight servers
 */

// NOTE: In a real implementation, this would import the generated gRPC-Web client stubs
// import { FlightServiceClient } from './generated/flight_grpc_web_pb.js';
import { ConnectionError } from './errors.js';
import { FlightDataStream } from './flight-data-stream.js';

/**
 * Manages connections to Arrow Flight servers using gRPC-Web
 */
export class ConnectionManager {
  /**
   * Create a new ConnectionManager instance
   * 
   * @param {Object} options - Connection options
   */
  constructor(options) {
    this.options = options;
    this.client = null;
    this.eventListeners = new Map();
    this.connectionInfo = {
      connectedAt: null,
      reconnectCount: 0,
      lastError: null
    };
    
    // Setup gRPC-Web client options
    this.grpcOptions = {
      'grpc-web.connection.timeout': options.timeout || 30000,
      'grpc-web.retry': options.enableRetry !== false,
      'grpc-web.max-retries': options.maxRetries || 3
    };

    if (options.enableCompression !== false) {
      this.grpcOptions['grpc-web.compression'] = 'gzip';
    }
  }

  /**
   * Establish connection to the Flight server
   * 
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      // Parse endpoint URL
      const url = new URL(this.options.endpoint);
      const endpoint = `${url.protocol}//${url.host}`;
      
      // Create gRPC-Web client stub
      // Note: In a real implementation, you'd import the generated Flight service stub
      // For now, we'll create a mock client structure
      this.client = new MockFlightServiceClient(endpoint, null, this.grpcOptions);
      
      // Test connection with a simple call
      await this._testConnection();
      
      this.connectionInfo.connectedAt = new Date();
      this.connectionInfo.lastError = null;
      
    } catch (error) {
      this.connectionInfo.lastError = error.message;
      throw new ConnectionError(`Failed to connect to ${this.options.endpoint}: ${error.message}`, error);
    }
  }

  /**
   * Disconnect from the Flight server
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.client) {
      // Close any active streams
      this._closeActiveStreams();
      
      // Clear client reference
      this.client = null;
      this.connectionInfo.connectedAt = null;
    }
  }

  /**
   * List available flights on the server
   * 
   * @param {Object} criteria - Filter criteria
   * @returns {Promise<Array>} List of flights
   */
  async listFlights(criteria = {}) {
    if (!this.client) {
      throw new ConnectionError('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      const request = this._createListFlightsRequest(criteria);
      
      const call = this.client.listFlights(request, this._getMetadata());
      
      const flights = [];
      
      call.on('data', (response) => {
        flights.push(response.getFlightInfo());
      });
      
      call.on('end', () => {
        resolve(flights);
      });
      
      call.on('error', (error) => {
        reject(new ConnectionError(`Failed to list flights: ${error.message}`, error));
      });
    });
  }

  /**
   * Get information about a specific flight
   * 
   * @param {string|Object} flightDescriptor - Flight descriptor
   * @returns {Promise<Object>} Flight information
   */
  async getFlightInfo(flightDescriptor) {
    if (!this.client) {
      throw new ConnectionError('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      const request = this._createFlightDescriptor(flightDescriptor);
      
      this.client.getFlightInfo(request, this._getMetadata(), (error, response) => {
        if (error) {
          reject(new ConnectionError(`Failed to get flight info: ${error.message}`, error));
        } else {
          resolve(response.toObject());
        }
      });
    });
  }

  /**
   * Get schema for a specific flight
   * 
   * @param {string|Object} flightDescriptor - Flight descriptor
   * @returns {Promise<Object>} Schema information
   */
  async getSchema(flightDescriptor) {
    if (!this.client) {
      throw new ConnectionError('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      const request = this._createFlightDescriptor(flightDescriptor);
      
      this.client.getSchema(request, this._getMetadata(), (error, response) => {
        if (error) {
          reject(new ConnectionError(`Failed to get schema: ${error.message}`, error));
        } else {
          resolve(response.getSchema());
        }
      });
    });
  }

  /**
   * Create a data stream for a flight
   * 
   * @param {string|Object} flightDescriptor - Flight descriptor
   * @param {Object} options - Stream options
   * @returns {FlightDataStream} Data stream
   */
  createStream(flightDescriptor, options = {}) {
    if (!this.client) {
      throw new ConnectionError('Not connected to server');
    }

    return new FlightDataStream(this.client, flightDescriptor, {
      ...options,
      metadata: this._getMetadata()
    });
  }

  /**
   * Update connection configuration
   * 
   * @param {Object} newOptions - New options
   */
  updateConfig(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    // Update gRPC options
    if (newOptions.timeout) {
      this.grpcOptions['grpc-web.connection.timeout'] = newOptions.timeout;
    }
    
    if (newOptions.enableRetry !== undefined) {
      this.grpcOptions['grpc-web.retry'] = newOptions.enableRetry;
    }
    
    if (newOptions.maxRetries !== undefined) {
      this.grpcOptions['grpc-web.max-retries'] = newOptions.maxRetries;
    }
  }

  /**
   * Get connection information
   * 
   * @returns {Object} Connection info
   */
  getConnectionInfo() {
    return { ...this.connectionInfo };
  }

  /**
   * Add event listener
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
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
   * @param {Function} listener - Event listener
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
   * Test connection to server
   * 
   * @private
   */
  async _testConnection() {
    // Simple connection test by listing flights with empty criteria
    try {
      await this.listFlights({});
    } catch (error) {
      // If listing flights fails, try a simpler health check if available
      throw error;
    }
  }

  /**
   * Create gRPC metadata with headers
   * 
   * @private
   */
  _getMetadata() {
    const metadata = {};
    
    // Add default headers
    if (this.options.headers) {
      Object.assign(metadata, this.options.headers);
    }
    
    // Add authentication if available
    if (this.options.token) {
      metadata['authorization'] = `Bearer ${this.options.token}`;
    }
    
    return metadata;
  }

  /**
   * Create a ListFlights request
   * 
   * @private
   */
  _createListFlightsRequest(criteria) {
    // In a real implementation, this would create a proper protobuf request
    return {
      criteria: criteria || {}
    };
  }

  /**
   * Create a FlightDescriptor from string or object
   * 
   * @private
   */
  _createFlightDescriptor(descriptor) {
    if (typeof descriptor === 'string') {
      return {
        type: 'PATH',
        path: [descriptor]
      };
    }
    
    return descriptor;
  }

  /**
   * Close any active streams
   * 
   * @private
   */
  _closeActiveStreams() {
    // Implementation would track and close active streams
    // For now, this is a placeholder
  }

  /**
   * Emit an event
   * 
   * @private
   */
  _emit(event, ...args) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in connection manager event listener for ${event}:`, error);
        }
      });
    }
  }
}

/**
 * Mock Flight Service Client for development
 * In a real implementation, this would be the generated gRPC-Web client
 * 
 * @private
 */
class MockFlightServiceClient {
  constructor(endpoint, credentials, options) {
    this.endpoint = endpoint;
    this.credentials = credentials;
    this.options = options;
  }

  listFlights(request, metadata) {
    // Mock implementation - would be replaced by real gRPC-Web client
    return {
      on: (event, callback) => {
        if (event === 'data') {
          // Mock flight data
          setTimeout(() => {
            callback({
              getFlightInfo: () => ({
                descriptor: { path: ['sample-dataset'] },
                endpoints: [{ location: this.endpoint }],
                totalRecords: 1000,
                totalBytes: 50000
              })
            });
          }, 100);
        } else if (event === 'end') {
          setTimeout(callback, 200);
        }
      }
    };
  }

  getFlightInfo(request, metadata, callback) {
    // Mock implementation
    setTimeout(() => {
      callback(null, {
        toObject: () => ({
          descriptor: request,
          endpoints: [{ location: this.endpoint }],
          totalRecords: 1000,
          totalBytes: 50000,
          schema: 'mock-schema-data'
        })
      });
    }, 100);
  }

  getSchema(request, metadata, callback) {
    // Mock implementation
    setTimeout(() => {
      callback(null, {
        getSchema: () => ({
          fields: [
            { name: 'id', type: 'int64' },
            { name: 'name', type: 'utf8' },
            { name: 'value', type: 'float64' }
          ]
        })
      });
    }, 100);
  }

  doGet(ticket, metadata) {
    // Mock implementation for streaming data
    return {
      on: (event, callback) => {
        if (event === 'data') {
          // Mock streaming data
          let count = 0;
          const interval = setInterval(() => {
            if (count < 5) {
              callback({
                getDataHeader: () => new Uint8Array([1, 2, 3]),
                getDataBody: () => new Uint8Array([4, 5, 6])
              });
              count++;
            } else {
              clearInterval(interval);
            }
          }, 500);
        } else if (event === 'end') {
          setTimeout(callback, 3000);
        }
      },
      cancel: () => {
        // Mock cancel implementation
      }
    };
  }
} 