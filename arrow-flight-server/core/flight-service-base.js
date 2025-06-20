import { EventEmitter } from 'events';

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
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 8080,
      ...options
    };
    
    // Dataset registry: Maps dataset IDs to their metadata and schema information
    this.datasets = new Map();
    
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
      console.error('Error during service initialization:', error);
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
  async _inferSchemaForDataset(datasetId) {
    throw new Error('_inferSchemaForDataset() must be implemented by subclass');
  }

  /**
   * Stream dataset data as Arrow record batches
   * @param {Object} call - gRPC call object
   * @param {Object} dataset - Dataset metadata
   * @returns {Promise<void>}
   */
  async _streamDataset(call, dataset) {
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
    console.log('ListFlights called');
    
    try {
      // Stream FlightInfo for each registered dataset
      for (const [datasetId, dataset] of this.datasets) {
        const flightInfo = await this._createFlightInfo(datasetId, dataset);
        call.write(flightInfo);
      }
      call.end();
    } catch (error) {
      console.error('Error in listFlights:', error);
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
      console.log('GetFlightInfo called with request:', call.request);
      
      const descriptor = call.request;
      const datasetId = this._extractDatasetId(descriptor);
      
      console.log('Available datasets:', Array.from(this.datasets.keys()));
      console.log('Requested dataset ID:', datasetId);

      if (!this.datasets.has(datasetId)) {
        const error = new Error(`Dataset not found: ${datasetId}`);
        error.code = 5; // gRPC NOT_FOUND status code
        throw error;
      }
      
      const dataset = this.datasets.get(datasetId);
      const flightInfo = await this._createFlightInfo(datasetId, dataset);
      
      call.callback(null, flightInfo);
    } catch (error) {
      console.error('Error in getFlightInfo:', error);
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
      console.log('GetSchema called');
      
      const descriptor = call.request;
      const datasetId = this._extractDatasetId(descriptor);
      
      if (!this.datasets.has(datasetId)) {
        const error = new Error(`Dataset not found: ${datasetId}`);
        error.code = 5; // gRPC NOT_FOUND status code
        throw error;
      }
      
      const dataset = this.datasets.get(datasetId);
      const schemaResult = {
        schema: dataset.schema.serialize()
      };
      
      call.callback(null, schemaResult);
    } catch (error) {
      console.error('Error in getSchema:', error);
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
      console.log('DoGet called');
      
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
      console.error('Error in doGet:', error);
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
    console.log('ListActions called');
    
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
      console.error('Error in listActions:', error);
      call.emit('error', error);
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Create FlightInfo structure for a dataset
   */
  async _createFlightInfo(datasetId, dataset) {
    return {
      schema: dataset.schema.serialize(),
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
    console.log('Refreshing datasets...');
    this.datasets.clear();
    await this._initializeDatasets();
    console.log(`Refreshed ${this.datasets.size} datasets`);
  }
}

export default FlightServiceBase;