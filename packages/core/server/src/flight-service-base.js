import { EventEmitter } from 'events';
import { createServerConfig } from './config/server-config.js';
import { getLogger } from './utils/logger.js';

/**
 * Abstract Base Class for Arrow Flight Services
 *
 * This class defines the standard interface that all Flight service implementations
 * must provide. It serves as the contract between the generic Flight server
 * and specific data source adapters (CSV, Parquet, Database, etc.)
 *
 * The plugin architecture allows:
 * 1. Easy addition of new data sources
 * 2. Consistent Flight protocol implementation
 * 3. Standardized error handling and logging
 * 4. Common lifecycle management
 */
export class FlightServiceBase extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = createServerConfig(options);

    // Dataset registry: Maps dataset IDs to their metadata and schema information
    this.datasets = new Map();

    // Use package logger
    this.logger = getLogger();

    // Initialize datasets after construction completes
    setImmediate(() => this._initializeAsync());
  }

  /**
   * Initialize the service and discover datasets asynchronously
   * This is called after construction to allow subclasses to complete their setup
   */
  async _initializeAsync() {
    try {
      await this._initialize();
    } catch (error) {
      this.logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'Error during service initialization');
      this.emit('error', error);
    }
  }

  /**
   * Initialize the service and discover datasets
   * Must be implemented by subclasses
   */
  async _initialize() {
    throw new Error('_initialize() must be implemented by subclass');
  }

  // ===== ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES =====

  /**
   * Discover and register datasets from the data source
   * @returns {Promise<void>}
   */
  async _initializeDatasets() {
    throw new Error('_initializeDatasets() must be implemented by subclass');
  }

  /**
   * Infer Arrow schema from a dataset
   * @param {string} datasetId - Dataset identifier
   * @returns {Promise<Object>} Arrow schema
   */
  async _inferSchemaForDataset(_datasetId) {
    throw new Error('_inferSchemaForDataset() must be implemented by subclass');
  }

  /**
   * Stream dataset data as Arrow record batches
   * @param {Object} call - gRPC call object
   * @param {Object} dataset - Dataset metadata
   * @returns {Promise<void>}
   */
  async _streamDataset(_call, _dataset) {
    throw new Error('_streamDataset() must be implemented by subclass');
  }

  // ===== STANDARD ARROW FLIGHT PROTOCOL IMPLEMENTATION =====
  // These methods provide standard implementations that work with any adapter

  /**
   * ListFlights Implementation
   *
   * Arrow Flight discovery mechanism - returns information about all available datasets.
   * This is a server streaming RPC that sends FlightInfo objects for each dataset.
   */
  async listFlights(call) {
    this.logger.debug('ListFlights called');

    try {
      // Stream FlightInfo for each registered dataset
      for (const [datasetId, dataset] of this.datasets) {
        const flightInfo = await this._createFlightInfo(datasetId, dataset);
        call.write(flightInfo);
      }
      call.end();
    } catch (error) {
      this.logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'Error in listFlights');
      call.emit('error', error);
    }
  }

  /**
   * GetFlightInfo Implementation
   *
   * Returns detailed information about a specific dataset identified by FlightDescriptor.
   */
  async getFlightInfo(call) {
    try {
      this.logger.debug({
        request: call.request
      }, 'GetFlightInfo called');

      const descriptor = call.request;
      const datasetId = this._extractDatasetId(descriptor);

      this.logger.debug({
        available_datasets: Array.from(this.datasets.keys()),
        requested_dataset_id: datasetId
      }, 'Flight info request details');

      if (!this.datasets.has(datasetId)) {
        const error = new Error(`Dataset not found: ${datasetId}`);
        error.code = 5; // gRPC NOT_FOUND status code
        throw error;
      }

      const dataset = this.datasets.get(datasetId);
      const flightInfo = await this._createFlightInfo(datasetId, dataset);

      call.callback(null, flightInfo);
    } catch (error) {
      this.logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'Error in getFlightInfo');
      call.callback(error);
    }
  }

  /**
   * GetSchema Implementation
   *
   * Returns just the Arrow schema for a dataset, without any data.
   */
  async getSchema(call) {
    try {
      this.logger.debug('GetSchema called');

      const descriptor = call.request;
      const datasetId = this._extractDatasetId(descriptor);

      if (!this.datasets.has(datasetId)) {
        const error = new Error(`Dataset not found: ${datasetId}`);
        error.code = 5; // gRPC NOT_FOUND status code
        throw error;
      }

      const dataset = this.datasets.get(datasetId);

      // Serialize Arrow schema using the proper Apache Arrow method
      let serializedSchema;
      try {
        // Import Apache Arrow for schema serialization
        const arrow = await import('apache-arrow');
        // Create an empty table to serialize the schema
        const emptyTable = new arrow.Table(dataset.schema, []);
        serializedSchema = arrow.tableToIPC(emptyTable);
      } catch (error) {
        this.logger.warn({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          dataset_id: datasetId
        }, 'Error serializing schema, using fallback');
        // Fallback: create a simple buffer representation
        const schemaInfo = {
          fields: dataset.schema.fields.map(f => ({
            name: f.name,
            type: f.type.toString()
          }))
        };
        serializedSchema = Buffer.from(JSON.stringify(schemaInfo));
      }

      const schemaResult = {
        schema: serializedSchema
      };

      call.callback(null, schemaResult);
    } catch (error) {
      this.logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'Error in getSchema');
      call.callback(error);
    }
  }

  /**
   * DoGet Implementation
   *
   * The main data streaming operation - streams dataset as Arrow record batches.
   */
  async doGet(call) {
    try {
      this.logger.debug('DoGet called');

      const ticket = call.request;
      const datasetId = ticket.ticket ? ticket.ticket.toString() : '';

      if (!this.datasets.has(datasetId)) {
        const error = new Error(`Dataset not found: ${datasetId}`);
        error.code = 5; // gRPC NOT_FOUND status code
        throw error;
      }

      const dataset = this.datasets.get(datasetId);
      await this._streamDataset(call, dataset);

    } catch (error) {
      this.logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'Error in doGet');
      call.emit('error', error);
    }
  }

  /**
   * ListActions Implementation
   *
   * Lists available custom actions that can be executed via DoAction.
   * This is a server streaming RPC that sends ActionType objects for each available action.
   */
  async listActions(call) {
    this.logger.debug('ListActions called');

    try {
      const actions = [
        {
          type: 'refresh-datasets',
          description: 'Refresh the dataset catalog by rescanning data sources'
        },
        {
          type: 'get-server-info',
          description: 'Get server information and statistics'
        }
      ];

      for (const action of actions) {
        call.write({
          type: action.type,
          description: action.description
        });
      }

      call.end();
    } catch (error) {
      this.logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'Error in listActions');
      call.emit('error', error);
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Create FlightInfo structure for a dataset
   */
  async _createFlightInfo(datasetId, dataset) {
    // Serialize Arrow schema using the proper Apache Arrow method
    let serializedSchema;
    try {
      // Import Apache Arrow for schema serialization
      const arrow = await import('apache-arrow');
      // Create an empty table to serialize the schema
      const emptyTable = new arrow.Table(dataset.schema, []);
      serializedSchema = arrow.tableToIPC(emptyTable);
    } catch (error) {
      this.logger.warn({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        dataset_id: datasetId
      }, 'Error serializing schema, using fallback');
      // Fallback: create a simple buffer representation
      const schemaInfo = {
        fields: dataset.schema.fields.map(f => ({
          name: f.name,
          type: f.type.toString()
        }))
      };
      serializedSchema = Buffer.from(JSON.stringify(schemaInfo));
    }

    return {
      schema: serializedSchema,
      flight_descriptor: {
        type: 1, // PATH type
        path: [datasetId]
      },
      endpoint: [{
        location: [{
          uri: `grpc://${this.options.host}:${this.options.port}`
        }],
        ticket: {
          ticket: Buffer.from(datasetId)
        }
      }],
      total_records: dataset.metadata.totalRecords || -1,
      total_bytes: dataset.metadata.totalBytes || -1
    };
  }

  /**
   * Extract dataset ID from FlightDescriptor
   */
  _extractDatasetId(descriptor) {
    if (descriptor.path && descriptor.path.length > 0) {
      return descriptor.path[0];
    } else if (descriptor.cmd) {
      // For CMD type descriptors, parse JSON command
      try {
        const command = JSON.parse(descriptor.cmd.toString());
        return command.dataset || command.table || command.path;
      } catch (error) {
        return descriptor.cmd.toString();
      }
    }
    throw new Error('Invalid FlightDescriptor: no path or cmd specified');
  }

  // ===== PUBLIC API =====

  /**
   * Get all registered datasets
   */
  getDatasets() {
    return Array.from(this.datasets.keys());
  }

  /**
   * Check if dataset exists
   */
  hasDataset(datasetId) {
    return this.datasets.has(datasetId);
  }

  /**
   * Refresh datasets from data source
   */
  async refreshDatasets() {
    this.logger.info('Refreshing datasets...');
    this.datasets.clear();
    await this._initializeDatasets();
    this.logger.info({
      dataset_count: this.datasets.size
    }, 'Refreshed datasets');
  }
}

export default FlightServiceBase;
