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
      const tables = [];
      
      // Use immediate processing approach
      await this.processDataset(datasetId, async (table) => {
        // Collect tables directly
        tables.push(table);
      });

      if (tables.length === 0) {
        throw new Error(`No data available for dataset: ${datasetId}`);
      }

      // Concatenate tables directly (much more efficient)
      if (tables.length === 1) {
        return tables[0];
      } else {
        return tables.reduce((acc, table) => acc.concat(table));
      }
    });
  }

  /**
   * Stream a dataset as raw IPC buffers (fastest)
   * @param {string} datasetId - The dataset identifier
   * @returns {AsyncGenerator} Async generator yielding raw IPC buffers
   */
  async *streamRawData(datasetId) {
    await this.connect();

    for await (const dataBody of this.protocolClient.streamData(datasetId)) {
      yield dataBody; // Yield raw buffer without any processing
    }
  }

  /**
   * Stream a dataset as record batches with backpressure control
   * @param {string} datasetId - The dataset identifier
   * @returns {AsyncGenerator} Async generator yielding Arrow record batches
   */
  async *streamDataset(datasetId) {
    await this.connect();

    for await (const dataBody of this.protocolClient.streamData(datasetId)) {
      try {
        // Track IPC processing time
        const ipcStartTime = performance.now();
        
        // Process IPC data immediately without buffering
        const table = arrow.tableFromIPC(dataBody);
        
        const ipcTime = performance.now() - ipcStartTime;
        
        // Log timing if it's significant
        if (ipcTime > 50) { // Log if IPC processing takes more than 50ms
          this.options.logger.debug(`IPC processing took ${ipcTime.toFixed(2)}ms for ${dataBody.length} bytes`);
        }
        
        // Yield all record batches from this table
        for (const recordBatch of table.batches) {
          yield recordBatch;
        }
      } catch (error) {
        this.options.logger.error('Error processing record batch:', error);
        throw error;
      }
    }
  }

  /**
   * Stream a dataset as tables with backpressure control (most efficient)
   * @param {string} datasetId - The dataset identifier
   * @returns {AsyncGenerator} Async generator yielding Arrow tables
   */
  async *streamDatasetAsTables(datasetId) {
    await this.connect();

    for await (const dataBody of this.protocolClient.streamData(datasetId)) {
      try {
        // Track IPC processing time
        const ipcStartTime = performance.now();
        
        // Process IPC data immediately without buffering
        const table = arrow.tableFromIPC(dataBody);
        
        const ipcTime = performance.now() - ipcStartTime;
        
        // Log timing if it's significant
        if (ipcTime > 50) { // Log if IPC processing takes more than 50ms
          this.options.logger.debug(`IPC processing took ${ipcTime.toFixed(2)}ms for ${dataBody.length} bytes`);
        }
        
        yield table;
      } catch (error) {
        this.options.logger.error('Error processing table:', error);
        throw error;
      }
    }
  }

  /**
   * Stream a dataset as record batches (less efficient - use streamDatasetAsTables instead)
   * @param {string} datasetId - The dataset identifier
   * @returns {AsyncGenerator} Async generator yielding Arrow record batches
   */
  async *streamDataset(datasetId) {
    await this.connect();

    for await (const dataBody of this.protocolClient.streamData(datasetId)) {
      try {
        // Track IPC processing time
        const ipcStartTime = performance.now();
        
        // Process IPC data immediately without buffering
        const table = arrow.tableFromIPC(dataBody);
        
        const ipcTime = performance.now() - ipcStartTime;
        
        // Log timing if it's significant
        if (ipcTime > 50) { // Log if IPC processing takes more than 50ms
          this.options.logger.debug(`IPC processing took ${ipcTime.toFixed(2)}ms for ${dataBody.length} bytes`);
        }
        
        // Yield all record batches from this table
        for (const recordBatch of table.batches) {
          yield recordBatch;
        }
      } catch (error) {
        this.options.logger.error('Error processing record batch:', error);
        throw error;
      }
    }
  }

  /**
   * Process dataset with minimal overhead (fastest processing)
   * @param {string} datasetId - The dataset identifier
   * @param {Function} processor - Function to process each table
   */
  async processDataset(datasetId, processor) {
    await this.connect();

    for await (const dataBody of this.protocolClient.streamData(datasetId)) {
      try {
        // Track IPC processing time
        const ipcStartTime = performance.now();
        
        // Process IPC data immediately
        const table = arrow.tableFromIPC(dataBody);
        
        const ipcTime = performance.now() - ipcStartTime;
        
        // Log timing if it's significant
        if (ipcTime > 50) { // Log if IPC processing takes more than 50ms
          this.options.logger.debug(`IPC processing took ${ipcTime.toFixed(2)}ms for ${dataBody.length} bytes`);
        }
        
        // Process the table immediately
        await processor(table);
      } catch (error) {
        this.options.logger.error('Error processing table:', error);
        throw error;
      }
    }
  }

  /**
   * Get dataset as streaming tables (memory efficient)
   * @param {string} datasetId - The dataset identifier
   * @returns {Promise<AsyncGenerator>} Async generator yielding Arrow tables
   */
  async getDatasetAsStream(datasetId) {
    await this.connect();
    
    return this.streamDatasetAsTables(datasetId);
  }

  /**
   * Process dataset with progress tracking
   * @param {string} datasetId - The dataset identifier
   * @param {Function} processor - Function to process each table
   * @param {Function} progressCallback - Optional progress callback
   */
  async processDatasetWithProgress(datasetId, processor, progressCallback = null) {
    await this.connect();

    let totalTables = 0;
    let totalRows = 0;

    for await (const dataBody of this.protocolClient.streamData(datasetId)) {
      try {
        // Process IPC data immediately
        const table = arrow.tableFromIPC(dataBody);
        
        // Process the table immediately
        await processor(table);
        
        totalTables++;
        totalRows += table.numRows;
        
        // Report progress if callback provided
        if (progressCallback) {
          progressCallback({
            tablesProcessed: totalTables,
            totalRows: totalRows,
            currentTableRows: table.numRows
          });
        }
      } catch (error) {
        this.options.logger.error('Error processing table:', error);
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