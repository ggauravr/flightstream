import path from 'path';
import fs from 'fs';

// CSV data source streaming - converts CSV files into batched data streams
import CSVStreamer from './csv-streamer.js';

// Arrow data structure builder - converts CSV data into Apache Arrow format
import ArrowBuilder from './arrow-builder.js';

/**
 * Arrow Flight Service
 * 
 * This class implements the core business logic for Arrow Flight protocol operations.
 * It acts as the bridge between the gRPC Flight server and the actual data management:
 * 
 * 1. Dataset Discovery: Scans file system for CSV files and registers them as Flight datasets
 * 2. Schema Management: Infers and manages Arrow schemas for each dataset
 * 3. Metadata Operations: Provides dataset information via FlightInfo structures
 * 4. Data Streaming: Converts CSV data to Arrow format and streams via Flight protocol
 * 
 * Arrow Flight Key Concepts:
 * - Dataset: A logical collection of data (here: CSV files)
 * - FlightDescriptor: Identifies datasets (PATH or CMD based)
 * - FlightInfo: Metadata about datasets (schema, endpoints, statistics)
 * - Ticket: Identifies specific data to retrieve
 * - FlightData: Stream messages containing Arrow data in IPC format
 */
export class FlightService {
  constructor(options = {}) {
    this.options = {
      dataDirectory: options.dataDirectory || './data',
      host: options.host || 'localhost',
      port: options.port || 8080,
      ...options
    };
    
    // Dataset registry: Maps dataset IDs to their metadata and schema information
    // This serves as the "catalog" for Flight discovery operations
    this.datasets = new Map(); // dataset_id -> { filePath, schema, metadata }
    
    // Initialize the dataset catalog by scanning the data directory
    this._initializeDatasets();
  }

  /**
   * Dataset Initialization and Discovery
   * 
   * Scans the configured data directory for CSV files and registers each as a Flight dataset.
   * For each CSV file:
   * 1. Infers the schema by sampling the data
   * 2. Creates dataset metadata (size, creation time, etc.)
   * 3. Registers in the datasets Map for Flight discovery
   * 
   * This enables Arrow Flight's listFlights() operation to discover available data.
   */
  async _initializeDatasets() {
    try {
      const dataDir = this.options.dataDirectory;
      if (!fs.existsSync(dataDir)) {
        console.warn(`Data directory ${dataDir} does not exist`);
        return;
      }

      const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.csv'));
      
      for (const file of files) {
        const filePath = path.join(dataDir, file);
        const datasetId = path.basename(file, '.csv');
        
        try {
          // Schema inference: Sample the CSV to determine column types
          // This creates the Arrow schema that will be used for all Flight operations
          const schema = await this._inferSchemaFromFile(filePath);
          
          // Register dataset in the Flight catalog
          this.datasets.set(datasetId, {
            id: datasetId,
            filePath: filePath,
            schema: schema,              // Arrow schema for this dataset
            metadata: {
              name: file,
              totalRecords: -1,          // Unknown until full scan (lazy evaluation)
              totalBytes: fs.statSync(filePath).size,
              created: fs.statSync(filePath).birthtime
            }
          });
          
          console.log(`Registered dataset: ${datasetId} (${file})`);
        } catch (error) {
          console.warn(`Failed to register dataset ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error initializing datasets:', error);
    }
  }

  /**
   * Schema Inference from CSV Data
   * 
   * Uses CSVStreamer to read a small sample of the CSV file and infer the Arrow schema.
   * This is crucial for Arrow Flight because:
   * 1. Clients need to know the schema before processing data
   * 2. Arrow requires strongly-typed columnar data
   * 3. Schema is included in FlightInfo responses for dataset discovery
   */
  async _inferSchemaFromFile(filePath) {
    return new Promise((resolve, reject) => {
      // Create a streamer that reads just 1 batch for schema inference
      const streamer = new CSVStreamer(filePath, { batchSize: 1 });
      
      // When schema is inferred from CSV headers and first rows
      streamer.on('schema', (schema) => {
        streamer.stop();  // Stop after getting schema
        resolve(schema);
      });
      
      streamer.on('error', (error) => {
        reject(error);
      });
      
      streamer.start().catch(reject);
    });
  }

  // ===== ARROW FLIGHT PROTOCOL IMPLEMENTATION =====
  // These methods implement the core Arrow Flight operations

  /**
   * ListFlights Implementation
   * 
   * Arrow Flight discovery mechanism - returns information about all available datasets.
   * This is a server streaming RPC that sends FlightInfo objects for each dataset.
   * 
   * Each FlightInfo contains:
   * - Serialized Arrow schema (binary format)
   * - FlightDescriptor (how to identify this dataset)
   * - FlightEndpoint (where to get the data - server location + ticket)
   * - Statistics (total records, total bytes)
   * 
   * Clients use this to discover what data is available before requesting specific datasets.
   */
  async listFlights(call) {
    console.log('ListFlights called');
    
    try {
      // Stream FlightInfo for each registered dataset
      for (const [datasetId, dataset] of this.datasets) {
        const flightInfo = await this._createFlightInfo(datasetId, dataset);
        call.write(flightInfo);  // Send FlightInfo to client via gRPC stream
      }
      call.end();  // Signal end of flight list
    } catch (error) {
      console.error('Error in listFlights:', error);
      call.emit('error', error);  // Send gRPC error to client
    }
  }

  /**
   * GetFlightInfo Implementation
   * 
   * Returns detailed information about a specific dataset identified by FlightDescriptor.
   * This is a unary RPC (single request, single response).
   * 
   * FlightDescriptor identifies datasets via:
   * - PATH: hierarchical identifier (e.g., ["database", "table"])
   * - CMD: command string (e.g., SQL query, JSON command)
   * 
   * Returns the same FlightInfo structure as listFlights, but for one specific dataset.
   */
  async getFlightInfo(call) {
    
    try {
      console.log('GetFlightInfo called with request:', call.request);
      
      // Extract FlightDescriptor from gRPC request
      const descriptor = call.request;
      const datasetId = this._extractDatasetId(descriptor);
      
      console.log('Available datasets:', this.datasets.keys());
      console.log('Requested dataset ID:', datasetId);

      // Validate dataset exists in our catalog
      if (!this.datasets.has(datasetId)) {
        const error = new Error(`Dataset not found: ${datasetId}`);
        error.code = 5; // gRPC NOT_FOUND status code
        throw error;
      }
      
      // Create and return FlightInfo for the requested dataset
      const dataset = this.datasets.get(datasetId);
      console.log('Dataset:', dataset);
      const flightInfo = await this._createFlightInfo(datasetId, dataset);
      console.log('FlightInfo:', flightInfo);
      console.log('Calling callback with flightInfo:', call.callback);
      
      // gRPC unary response via callback
      call.callback(null, flightInfo);
    } catch (error) {
      console.error('Error in getFlightInfo:', error);
      call.callback(error);  // Send error via gRPC callback
    }
  }

  /**
   * GetSchema Implementation
   * 
   * Returns only the Arrow schema for a dataset, without any actual data.
   * This is useful for clients that need to prepare data processing pipelines
   * or allocate memory before retrieving the full dataset.
   * 
   * Returns SchemaResult containing the binary-serialized Arrow schema.
   * The schema is in Arrow IPC format, which can be deserialized by Arrow clients.
   */
  async getSchema(call) {
    console.log('GetSchema called');
    
    try {
      // Extract dataset identifier from FlightDescriptor
      const descriptor = call.request;
      const datasetId = this._extractDatasetId(descriptor);
      
      // Validate dataset exists
      if (!this.datasets.has(datasetId)) {
        const error = new Error(`Dataset not found: ${datasetId}`);
        error.code = 5; // gRPC NOT_FOUND status code
        throw error;
      }
      
      // Serialize the Arrow schema for this dataset
      const dataset = this.datasets.get(datasetId);
      const arrowBuilder = new ArrowBuilder(dataset.schema);
      const serializedSchema = arrowBuilder.serializeSchema();
      console.log('Serialized schema:', serializedSchema);
      
      // Return SchemaResult via gRPC callback
      call.callback(null, {
        schema: serializedSchema  // Binary Arrow IPC schema
      });
    } catch (error) {
      console.error('Error in getSchema:', error);
      call.callback(error);
    }
  }

  /**
   * DoGet Implementation
   * 
   * The core data transfer operation in Arrow Flight. Streams dataset contents
   * to the client as Arrow RecordBatches in FlightData messages.
   * 
   * Process:
   * 1. Client provides a Ticket identifying what data to retrieve
   * 2. Server streams FlightData messages containing Arrow data
   * 3. Each FlightData contains serialized RecordBatches in Arrow IPC format
   * 
   * This is a server streaming RPC - the most performance-critical operation in Flight.
   */
  async doGet(call) {
    console.log('DoGet called');
    
    try {
      // Extract and parse the Ticket from gRPC request
      const ticket = call.request;
      const ticketData = JSON.parse(ticket.ticket.toString());
      const datasetId = ticketData.dataset_id;
      
      // Validate dataset exists
      if (!this.datasets.has(datasetId)) {
        const error = new Error(`Dataset not found: ${datasetId}`);
        error.code = 5; // gRPC NOT_FOUND status code
        throw error;
      }
      
      // Stream the dataset contents to the client
      const dataset = this.datasets.get(datasetId);
      await this._streamDataset(call, dataset);
      
    } catch (error) {
      console.error('Error in doGet:', error);
      call.emit('error', error);  // Send gRPC streaming error
    }
  }

  /**
   * Dataset Streaming Implementation
   * 
   * Converts CSV data to Arrow format and streams it via Flight protocol.
   * This is the heart of the data transfer operation:
   * 
   * 1. Use CSVStreamer to read CSV in batches
   * 2. Convert each CSV batch to Arrow RecordBatch
   * 3. Serialize RecordBatch to Arrow IPC format
   * 4. Send as FlightData message via gRPC stream
   * 
   * Arrow IPC (Inter-Process Communication) format is the standard binary
   * serialization for Arrow data, optimized for high-performance transfers.
   */
  async _streamDataset(call, dataset) {
    return new Promise((resolve, reject) => {
      // Create CSV streamer for the dataset file
      const streamer = new CSVStreamer(dataset.filePath);
      let arrowBuilder = null;
      
      // Initialize Arrow builder when schema is available
      streamer.on('schema', (schema) => {
        arrowBuilder = new ArrowBuilder(schema);
        console.log(`Starting to stream dataset: ${dataset.id}`);
      });
      
      // Process each CSV batch and convert to Arrow
      streamer.on('batch', (csvBatch) => {
        try {
          if (!arrowBuilder) {
            console.warn('Arrow builder not initialized, skipping batch');
            return;
          }
          
          // Convert CSV batch to Arrow RecordBatch
          const recordBatch = arrowBuilder.createRecordBatch(csvBatch);
          if (recordBatch) {
            // Serialize RecordBatch to Arrow IPC binary format
            const serializedBatch = arrowBuilder.serializeRecordBatch(recordBatch);
            
            // Create FlightData message for Arrow Flight protocol
            const flightData = {
              flight_descriptor: null,                    // Optional dataset identifier
              data_header: Buffer.alloc(0),              // Arrow IPC metadata header
              app_metadata: Buffer.alloc(0),             // Application-specific metadata
              data_body: serializedBatch                 // Arrow IPC data (RecordBatch)
            };

            console.log('Writing flight data:', flightData);
            
            // Stream FlightData to client via gRPC
            call.write(flightData);
          }
        } catch (error) {
          console.error('Error processing batch:', error);
          call.emit('error', error);  // Send streaming error to client
        }
      });
      
      // Handle end of dataset streaming
      streamer.on('end', (stats) => {
        console.log(`Finished streaming dataset: ${dataset.id}, total rows: ${stats.totalRows}`);
        call.end();  // Signal end of gRPC stream
        resolve();
      });
      
      // Handle CSV streaming errors
      streamer.on('error', (error) => {
        console.error('Error streaming CSV:', error);
        call.emit('error', error);  // Propagate error to gRPC client
        reject(error);
      });
      
      // Start the CSV streaming process
      streamer.start().catch(reject);
    });
  }

  /**
   * FlightInfo Creation
   * 
   * Creates a FlightInfo object that describes a dataset for Arrow Flight clients.
   * This is the metadata structure that clients receive from listFlights and getFlightInfo.
   * 
   * FlightInfo contains all information needed for clients to:
   * 1. Understand the data structure (schema)
   * 2. Request the data (ticket + endpoint)
   * 3. Optimize processing (statistics)
   * 
   * Arrow Flight uses this metadata-first approach to enable efficient data discovery
   * and processing pipeline preparation.
   */
  async _createFlightInfo(datasetId, dataset) {
    // Serialize the Arrow schema for this dataset
    const arrowBuilder = new ArrowBuilder(dataset.schema);
    const serializedSchema = arrowBuilder.serializeSchema();
    
    // Create FlightDescriptor (how clients identify this dataset)
    // Using PATH type with the dataset ID as the path
    const descriptor = {
      type: 1, // PATH type (vs CMD type)
      path: [datasetId]  // Hierarchical path identifier
    };
    
    // Create Ticket (what clients send to doGet to retrieve this data)
    // Encoding dataset identification as JSON in the ticket
    const ticket = {
      ticket: Buffer.from(JSON.stringify({ dataset_id: datasetId }))
    };
    
    // Create FlightEndpoint (where clients can get this data)
    // Specifies the server location and the ticket to use
    const endpoint = {
      ticket: ticket,
      location: [{
        uri: `grpc://${this.options.host}:${this.options.port}`  // gRPC server address
      }]
    };
    
    // Return complete FlightInfo structure
    return {
      schema: serializedSchema,           // Binary Arrow schema (IPC format)
      flight_descriptor: descriptor,      // Dataset identifier
      endpoint: [endpoint],               // Array of endpoints (can have multiple replicas)
      total_records: dataset.metadata.totalRecords,  // Row count (-1 if unknown)
      total_bytes: dataset.metadata.totalBytes       // Dataset size in bytes
    };
  }

  /**
   * FlightDescriptor Parsing
   * 
   * Extracts the dataset identifier from a FlightDescriptor.
   * Arrow Flight supports two identification methods:
   * 
   * 1. PATH: Hierarchical identifiers like ["database", "table", "partition"]
   * 2. CMD: Opaque command strings (e.g., SQL queries, JSON commands)
   * 
   * This implementation primarily uses PATH-based identification,
   * with fallback to CMD for flexibility.
   */
  _extractDatasetId(descriptor) {
    console.log('Extracting dataset ID from descriptor:', descriptor);
    
    // Handle PATH-based descriptors (preferred)
    if (descriptor.type === 'PATH' && descriptor.path && descriptor.path.length > 0) {
      return descriptor.path[0];  // Use first path element as dataset ID
    }
    
    // Handle CMD-based descriptors (fallback)
    if (descriptor.cmd) {
      try {
        // Try to parse CMD as JSON
        const cmd = JSON.parse(descriptor.cmd.toString());
        return cmd.dataset_id;
      } catch (error) {
        // Fall back to using CMD as raw string identifier
        return descriptor.cmd.toString();
      }
    }
    
    throw new Error('Invalid flight descriptor');
  }

  // ===== DATASET MANAGEMENT UTILITIES =====
  
  /**
   * Get all registered datasets
   * Used by server info operations and debugging
   */
  getDatasets() {
    return Array.from(this.datasets.values());
  }
  
  /**
   * Check if a dataset exists in the catalog
   */
  hasDataset(datasetId) {
    return this.datasets.has(datasetId);
  }
  
  /**
   * Refresh dataset catalog
   * Re-scans the data directory for new/changed files
   * Useful for dynamic data environments
   */
  async refreshDatasets() {
    this.datasets.clear();              // Clear existing catalog
    await this._initializeDatasets();   // Re-scan data directory
    console.log(`Refreshed ${this.datasets.size} datasets`);
  }
}

export default FlightService; 