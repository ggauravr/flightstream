import grpc from '@grpc/grpc-js';

// Shared utilities
import { 
  loadFlightProto, 
  createClientOptions, 
  createClientCredentials,
  getDefaultProtoPath 
} from '@flightstream/core-shared';

// Client configuration
import { createClientConfig } from './config/client-config.js';

/**
 * Low-level Arrow Flight Protocol Client
 *
 * This class handles the gRPC protocol operations for Arrow Flight,
 * including connection management, data serialization/deserialization,
 * and raw Flight protocol operations.
 */
export class FlightProtocolClient {
  constructor(options = {}) {
    this.options = createClientConfig({
      protoPath: options.protoPath || getDefaultProtoPath(),
      logger: options.logger || console,
      ...options
    });

    this.client = null;
    this.flightProto = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the gRPC client
   * @private
   */
  _initializeClient() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load the Arrow Flight protocol definition using shared utilities
      this.flightProto = loadFlightProto(this.options.protoPath);

      // Create the gRPC client with shared options
      const serverAddress = `${this.options.host}:${this.options.port}`;
      this.client = new this.flightProto.FlightService(
        serverAddress,
        createClientCredentials(),
        createClientOptions(this.options)
      );

      this.isInitialized = true;
      this.options.logger.debug('Flight protocol client initialized');
    } catch (error) {
      this.options.logger.error('Failed to initialize Flight protocol client:', error);
      throw error;
    }
  }

  /**
   * List available flights
   * @returns {Promise<Array>} List of flight information
   */
  async listFlights() {
    this._initializeClient();

    return new Promise((resolve, reject) => {
      const flights = [];
      const call = this.client.listFlights({});

      call.on('data', (flightInfo) => {
        flights.push(flightInfo);
      });

      call.on('end', () => {
        resolve(flights);
      });

      call.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Get flight information
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<Object>} Flight information
   */
  async getFlightInfo(datasetId) {
    this._initializeClient();

    return new Promise((resolve, reject) => {
      const descriptor = {
        type: 1, // PATH
        path: [datasetId]
      };

      this.client.getFlightInfo(descriptor, (error, flightInfo) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(flightInfo);
      });
    });
  }

  /**
   * Get schema for a dataset
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<Object>} Schema result
   */
  async getSchema(datasetId) {
    this._initializeClient();

    return new Promise((resolve, reject) => {
      const descriptor = {
        type: 1, // PATH
        path: [datasetId]
      };

      this.client.getSchema(descriptor, (error, schemaResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(schemaResult);
      });
    });
  }

  /**
   * Stream data from a dataset
   * @param {string} datasetId - The dataset identifier
   * @returns {AsyncGenerator} Async generator yielding Arrow record batches
   */
  async *streamData(datasetId) {
    this._initializeClient();

    const ticket = {
      ticket: Buffer.from(datasetId)
    };

    const call = this.client.doGet(ticket);

    // Create a promise that resolves when the stream ends
    const streamPromise = new Promise((resolve, reject) => {
      call.on('end', () => resolve());
      call.on('error', (error) => reject(error));
    });

    // Create a queue to store data chunks
    const dataQueue = [];
    let resolveNext = null;
    let rejectNext = null;
    let isStreamEnded = false;

    // Set up data handler
    call.on('data', (flightData) => {
      if (flightData.data_body && flightData.data_body.length > 0) {
        dataQueue.push(flightData.data_body);
        
        // If there's a waiting promise, resolve it
        if (resolveNext) {
          resolveNext();
        }
      }
    });

    // Set up end handler
    call.on('end', () => {
      isStreamEnded = true;
      if (resolveNext) {
        resolveNext();
      }
    });

    // Set up error handler
    call.on('error', (error) => {
      isStreamEnded = true;
      if (rejectNext) {
        rejectNext(error);
      }
    });

    // Yield data as it becomes available
    while (!isStreamEnded || dataQueue.length > 0) {
      if (dataQueue.length > 0) {
        yield dataQueue.shift();
      } else {
        // Wait for more data or stream to end
        await new Promise((resolve, reject) => {
          resolveNext = resolve;
          rejectNext = reject;
        });
      }
    }
  }

  /**
   * Execute a custom action
   * @param {string} actionType - The action type
   * @param {Object} actionBody - The action body
   * @returns {Promise<Array>} Action results
   */
  async doAction(actionType, actionBody = {}) {
    this._initializeClient();

    return new Promise((resolve, reject) => {
      const action = {
        type: actionType,
        body: Buffer.from(JSON.stringify(actionBody))
      };

      const call = this.client.doAction(action);
      const results = [];

      call.on('data', (result) => {
        try {
          const data = JSON.parse(result.body.toString());
          results.push(data);
        } catch (error) {
          // If not JSON, add raw result
          results.push({ raw: result.body.toString() });
        }
      });

      call.on('end', () => {
        resolve(results);
      });

      call.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * List available actions
   * @returns {Promise<Array>} List of available actions
   */
  async listActions() {
    this._initializeClient();

    return new Promise((resolve, reject) => {
      const call = this.client.listActions({});
      const actions = [];

      call.on('data', (actionType) => {
        actions.push(actionType);
      });

      call.on('end', () => {
        resolve(actions);
      });

      call.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Close the client connection
   */
  close() {
    if (this.client) {
      this.client.close();
      this.client = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if the client is ready
   * @returns {boolean} True if client is initialized
   */
  isReady() {
    return this.isInitialized && this.client !== null;
  }
} 