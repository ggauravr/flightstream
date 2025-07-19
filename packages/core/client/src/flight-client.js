import * as arrow from 'apache-arrow';
import { FlightClientBase } from './flight-client-base.js';
import { FlightProtocolClient } from './flight-protocol-client.js';

/**
 * High-level Arrow Flight Client
 *
 * This class provides a simple and powerful interface for connecting to
 * Arrow Flight servers. It abstracts away the complexity of gRPC and
 * Arrow protocol handling, providing a clean API for data access.
 *
 * @example
 * ```javascript
 * import { FlightClient } from '@flightstream/core-client';
 *
 * const client = new FlightClient({
 *   host: 'localhost',
 *   port: 8080
 * });
 *
 * await client.connect();
 * const datasets = await client.listDatasets();
 * const table = await client.getDataset('my-dataset');
 * ```
 */
export class FlightClient extends FlightClientBase {
  constructor(options = {}) {
    super(options);

    // Create the protocol client
    this.protocolClient = new FlightProtocolClient({
      host: this.options.host,
      port: this.options.port,
      maxReceiveMessageLength: this.options.maxReceiveMessageLength,
      maxSendMessageLength: this.options.maxSendMessageLength,
      logger: this.options.logger,
      ...options
    });
  }

  /**
   * Internal connection implementation
   * @protected
   * @returns {Promise<void>}
   */
  async _connectInternal() {
    // The protocol client is lazy-initialized, so we just need to ensure
    // we can reach the server by making a simple call
    await this._executeWithRetry(async () => {
      await this.protocolClient.listFlights();
    });
  }

  /**
   * Internal disconnection implementation
   * @protected
   * @returns {Promise<void>}
   */
  async _disconnectInternal() {
    this.protocolClient.close();
  }

  /**
   * List available datasets
   * @returns {Promise<Array>} List of available dataset information
   */
  async listDatasets() {
    await this.connect();

    return this._executeWithRetry(async () => {
      const flights = await this.protocolClient.listFlights();
      
      return flights.map(flight => ({
        id: flight.flight_descriptor?.path?.[0] || 'unknown',
        description: flight.flight_descriptor?.path?.[0] || 'No description available',
        totalRecords: flight.total_records || 0,
        totalBytes: flight.total_bytes || 0,
        schema: flight.schema
      }));
    });
  }

  /**
   * Get information about a specific dataset
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<Object>} Dataset information
   */
  async getDatasetInfo(datasetId) {
    await this.connect();

    return this._executeWithRetry(async () => {
      const flightInfo = await this.protocolClient.getFlightInfo(datasetId);
      
      return {
        id: datasetId,
        totalRecords: flightInfo.total_records || 0,
        totalBytes: flightInfo.total_bytes || 0,
        schema: flightInfo.schema,
        descriptor: flightInfo.flight_descriptor
      };
    });
  }

  /**
   * Get the schema for a dataset
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<Object>} Arrow schema
   */
  async getSchema(datasetId) {
    await this.connect();

    return this._executeWithRetry(async () => {
      const schemaResult = await this.protocolClient.getSchema(datasetId);
      
      if (schemaResult.schema && schemaResult.schema.length > 0) {
        // Deserialize Arrow schema from IPC format
        const table = arrow.tableFromIPC(schemaResult.schema);
        return table.schema;
      }
      
      throw new Error(`No schema available for dataset: ${datasetId}`);
    });
  }

  /**
   * Get a dataset as an Arrow table
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<Object>} Arrow table
   */
  async getDataset(datasetId) {
    await this.connect();

    return this._executeWithRetry(async () => {
      const recordBatches = [];
      
      for await (const dataBody of this.protocolClient.streamData(datasetId)) {
        try {
          // Deserialize Arrow record batch from IPC format
          const reader = arrow.RecordBatchReader.from(dataBody);
          
          for (const recordBatch of reader) {
            recordBatches.push(recordBatch);
          }
        } catch (error) {
          this.options.logger.error('Error processing record batch:', error);
          throw error;
        }
      }

      if (recordBatches.length === 0) {
        throw new Error(`No data available for dataset: ${datasetId}`);
      }

      // Create table from record batches
      return new arrow.Table(recordBatches);
    });
  }

  /**
   * Stream a dataset as record batches
   * @param {string} datasetId - The dataset identifier
   * @returns {AsyncGenerator} Async generator yielding Arrow record batches
   */
  async *streamDataset(datasetId) {
    await this.connect();

    for await (const dataBody of this.protocolClient.streamData(datasetId)) {
      try {
        // Deserialize Arrow record batch from IPC format
        const reader = arrow.RecordBatchReader.from(dataBody);
        
        for (const recordBatch of reader) {
          yield recordBatch;
        }
      } catch (error) {
        this.options.logger.error('Error processing record batch:', error);
        throw error;
      }
    }
  }

  /**
   * Execute a custom action on the server
   * @param {string} actionType - The action type
   * @param {Object} actionBody - The action body
   * @returns {Promise<Array>} Action results
   */
  async doAction(actionType, actionBody = {}) {
    await this.connect();

    return this._executeWithRetry(async () => {
      return await this.protocolClient.doAction(actionType, actionBody);
    });
  }

  /**
   * List available actions
   * @returns {Promise<Array>} List of available actions
   */
  async listActions() {
    await this.connect();

    return this._executeWithRetry(async () => {
      const actions = await this.protocolClient.listActions();
      
      return actions.map(action => ({
        type: action.type,
        description: action.description || 'No description available'
      }));
    });
  }

  /**
   * Get detailed information about the server and available datasets
   * @returns {Promise<Object>} Server information
   */
  async getServerInfo() {
    await this.connect();

    return this._executeWithRetry(async () => {
      const [datasets, actions] = await Promise.all([
        this.listDatasets(),
        this.listActions()
      ]);

      return {
        connection: this.getConnectionStatus(),
        datasets: {
          count: datasets.length,
          list: datasets
        },
        actions: {
          count: actions.length,
          list: actions
        }
      };
    });
  }

  /**
   * Test the connection to the server
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      await this.connect();
      await this.listDatasets();
      return true;
    } catch (error) {
      this.options.logger.error('Connection test failed:', error);
      return false;
    }
  }
} 