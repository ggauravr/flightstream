// gRPC imports - gRPC is Google's high-performance RPC framework that uses HTTP/2 
// and Protocol Buffers for communication between services
import grpc from '@grpc/grpc-js';

// Protocol Buffer loader - Protocol Buffers (protobuf) define the structure and 
// interface of gRPC services using a language-neutral schema (.proto files)
import protoLoader from '@grpc/proto-loader';

import path from 'path';
import { fileURLToPath } from 'url';

// Arrow Flight Service - contains the business logic for Arrow Flight operations
import FlightService from './flight-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Arrow Flight Server
 * 
 * Arrow Flight is a high-performance data transport protocol built on top of gRPC
 * designed for fast data transfer between systems. It's specifically optimized for
 * columnar data in Apache Arrow format.
 * 
 * This class wraps a gRPC server and implements the Arrow Flight protocol by:
 * 1. Loading Arrow Flight protocol definitions from .proto files
 * 2. Creating a gRPC server instance
 * 3. Mapping Flight protocol methods to actual implementation handlers
 */
export class FlightServer {
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 8080,
      // Large message limits are important for Arrow Flight since it transfers
      // potentially large columnar datasets in binary format
      maxReceiveMessageLength: options.maxReceiveMessageLength || 100 * 1024 * 1024, // 100MB
      maxSendMessageLength: options.maxSendMessageLength || 100 * 1024 * 1024, // 100MB
      dataDirectory: options.dataDirectory || './data',
      ...options
    };
    
    // The underlying gRPC server instance that handles network communication
    this.server = null;
    
    // Arrow Flight service that contains the actual Flight protocol logic
    this.flightService = null;
    
    // Initialize the gRPC service with Arrow Flight protocol definitions
    this._initializeGrpcService();
  }

  /**
   * Initialize gRPC Service with Arrow Flight Protocol
   * 
   * This method:
   * 1. Loads the Arrow Flight protocol definition from .proto file
   * 2. Creates a gRPC server configured for large message handling
   * 3. Binds Arrow Flight protocol methods to our implementation handlers
   */
  _initializeGrpcService() {
    // Load the Arrow Flight protocol definition
    // The .proto file defines the gRPC service interface for Arrow Flight
    const PROTO_PATH = path.join(__dirname, '../proto/flight.proto');
    
    // Parse the protocol buffer definition with specific options:
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,     // Preserve field name casing from proto file
      longs: String,      // Convert 64-bit integers to strings for JavaScript compatibility
      enums: String,      // Convert enums to string values
      defaults: true,     // Include default values for optional fields
      oneofs: true,       // Support oneof field declarations
    });

    // Extract the Arrow Flight service definition from the loaded protobuf
    // This gives us the typed gRPC service interface with all Flight methods
    const flightProto = grpc.loadPackageDefinition(packageDefinition).arrow.flight.protocol;

    // Create the gRPC server instance with large message support
    // Arrow Flight often transfers large datasets, so we configure generous limits
    this.server = new grpc.Server({
      'grpc.max_receive_message_length': this.options.maxReceiveMessageLength,
      'grpc.max_send_message_length': this.options.maxSendMessageLength,
    });

    // Initialize the Flight service that implements the actual Arrow Flight operations
    this.flightService = new FlightService({
      dataDirectory: this.options.dataDirectory,
      host: this.options.host,
      port: this.options.port
    });

    // Register the Arrow Flight service with the gRPC server
    // This maps each Flight protocol method to our implementation handlers
    this.server.addService(flightProto.FlightService.service, {
      // Core Arrow Flight Protocol Methods:
      
      handshake: this._handshake.bind(this),           // Client-server authentication/negotiation
      listFlights: this._listFlights.bind(this),       // Discovery: list available datasets
      getFlightInfo: this._getFlightInfo.bind(this),   // Metadata: get info about specific dataset
      getSchema: this._getSchema.bind(this),           // Schema: get Arrow schema for dataset
      doGet: this._doGet.bind(this),                   // Data transfer: stream dataset to client
      doPut: this._doPut.bind(this),                   // Data upload: receive dataset from client
      doAction: this._doAction.bind(this),             // Custom operations: server-specific actions
      listActions: this._listActions.bind(this),       // Discovery: list available custom actions
    });
  }

  // ===== ARROW FLIGHT PROTOCOL HANDLERS =====
  // These methods implement the standard Arrow Flight protocol operations

  /**
   * Handshake Handler
   * 
   * Arrow Flight handshake is used for:
   * - Authentication between client and server
   * - Protocol version negotiation  
   * - Session establishment
   * 
   * This is a bidirectional streaming RPC where client and server
   * exchange handshake messages until they reach agreement.
   */
  _handshake(call) {
    console.log('Handshake called');
    
    // Handle incoming handshake requests from client
    call.on('data', (request) => {
      console.log('Handshake request received:', request);
      
      // Send handshake response back to client
      // In a production system, this would include authentication validation
      call.write({
        protocol_version: request.protocol_version || 1,
        payload: Buffer.from('handshake-response')
      });
    });
    
    // Client has finished sending handshake data
    call.on('end', () => {
      call.end();
    });
    
    // Handle handshake errors
    call.on('error', (error) => {
      console.error('Handshake error:', error);
    });
  }

  /**
   * ListFlights Handler
   * 
   * Arrow Flight's discovery mechanism - allows clients to find available datasets.
   * This is a server streaming RPC that returns a stream of FlightInfo objects,
   * each describing an available dataset.
   * 
   * FlightInfo contains:
   * - Dataset schema (Arrow schema in binary format)
   * - Flight descriptor (how to identify/request this dataset)
   * - Endpoints (where to get the data - server locations)
   * - Statistics (total records, total bytes)
   */
  _listFlights(call) {
    console.log('ListFlights called');
    // Delegate to FlightService which will stream FlightInfo objects to client
    this.flightService.listFlights(call);
  }

  /**
   * GetFlightInfo Handler
   * 
   * Gets detailed metadata about a specific dataset identified by FlightDescriptor.
   * This is a unary RPC (single request, single response).
   * 
   * FlightDescriptor can identify datasets by:
   * - PATH: hierarchical path (e.g., ["database", "table"])  
   * - CMD: opaque command string (e.g., SQL query)
   */
  _getFlightInfo(call, callback) {
    console.log('GetFlightInfo called');
    // gRPC unary calls use callbacks, so we pass the callback to FlightService
    const callWithCallback = { ...call, callback };
    this.flightService.getFlightInfo(callWithCallback);
  }

  /**
   * GetSchema Handler
   * 
   * Returns just the Arrow schema for a dataset, without any data.
   * This is useful for clients that need to prepare for data processing
   * without actually retrieving the full dataset.
   * 
   * Returns SchemaResult containing the binary-encoded Arrow schema.
   */
  _getSchema(call, callback) {
    console.log('GetSchema called');
    // gRPC unary calls use callbacks, so we pass the callback to FlightService
    const callWithCallback = { ...call, callback };
    this.flightService.getSchema(callWithCallback);
  }

  /**
   * DoGet Handler
   * 
   * The main data transfer method in Arrow Flight. Streams dataset contents
   * to the client as a series of FlightData messages.
   * 
   * This is a server streaming RPC where:
   * - Client sends a Ticket (identifies what data to retrieve)
   * - Server responds with stream of FlightData messages
   * 
   * FlightData messages contain:
   * - data_header: Arrow IPC metadata (RecordBatch headers)
   * - data_body: Arrow IPC data (actual columnar data in binary format)
   * - app_metadata: Application-specific metadata
   */
  _doGet(call) {
    console.log('DoGet called');
    // Delegate to FlightService which will stream Arrow data to client
    this.flightService.doGet(call);
  }

  /**
   * DoPut Handler
   * 
   * Arrow Flight's data upload mechanism. Allows clients to send datasets
   * to the server as a stream of FlightData messages.
   * 
   * This is a bidirectional streaming RPC where:
   * - Client streams FlightData messages (containing Arrow data)
   * - Server responds with PutResult messages (acknowledgments)
   * 
   * Currently not implemented - just acknowledges received data.
   */
  _doPut(call) {
    console.log('DoPut called - not implemented');
    
    // Handle incoming data from client
    call.on('data', (request) => {
      console.log('DoPut data received');
      // Send acknowledgment back to client
      // PutResult message with empty metadata
      call.write({ app_metadata: Buffer.alloc(0) });
    });
    
    // Client finished sending data
    call.on('end', () => {
      call.end();
    });
    
    // Handle upload errors
    call.on('error', (error) => {
      console.error('DoPut error:', error);
    });
  }

  /**
   * DoAction Handler
   * 
   * Arrow Flight's extension mechanism for custom server operations.
   * Allows servers to expose application-specific functionality beyond
   * the standard data transfer operations.
   * 
   * This is a bidirectional streaming RPC where:
   * - Client sends Action message (type + body)
   * - Server responds with stream of Result messages
   * 
   * Examples: refresh metadata, run analytics, trigger data processing
   */
  _doAction(call) {
    console.log('DoAction called');
    
    try {
      // Extract the action from the gRPC request
      const action = call.request;
      console.log('Action type:', action.type);
      
      // Route to appropriate action handler based on action type
      switch (action.type) {
        case 'refresh-datasets':
          this._handleRefreshDatasets(call);
          break;
        case 'get-server-info':
          this._handleGetServerInfo(call);
          break;
        default:
          // Return gRPC UNIMPLEMENTED error for unknown actions
          const error = new Error(`Unknown action type: ${action.type}`);
          error.code = 12; // gRPC status code for UNIMPLEMENTED
          throw error;
      }
    } catch (error) {
      console.error('DoAction error:', error);
      // Emit gRPC error to client
      call.emit('error', error);
    }
  }

  /**
   * ListActions Handler
   * 
   * Discovery mechanism for custom actions - tells clients what
   * custom operations this server supports.
   * 
   * This is a server streaming RPC that returns ActionType messages
   * describing each available custom action.
   */
  _listActions(call) {
    console.log('ListActions called');
    
    try {
      // Define available custom actions for this server
      const actions = [
        {
          type: 'refresh-datasets',
          description: 'Refresh available datasets from data directory'
        },
        {
          type: 'get-server-info',
          description: 'Get server information and statistics'
        }
      ];
      
      // Stream each action type to the client
      for (const action of actions) {
        call.write(action);
      }
      
      // Signal end of action list
      call.end();
    } catch (error) {
      console.error('ListActions error:', error);
      call.emit('error', error);
    }
  }

  // ===== CUSTOM ACTION HANDLERS =====
  // These implement the server-specific actions exposed via DoAction

  /**
   * Refresh Datasets Action Handler
   * 
   * Custom action to refresh the server's dataset registry by
   * re-scanning the data directory for new/changed files.
   */
  async _handleRefreshDatasets(call) {
    try {
      // Tell FlightService to refresh its dataset registry
      await this.flightService.refreshDatasets();
      
      // Return success result to client
      const result = {
        body: Buffer.from(JSON.stringify({
          success: true,
          message: 'Datasets refreshed successfully',
          count: this.flightService.getDatasets().length
        }))
      };
      
      call.write(result);
      call.end();
    } catch (error) {
      console.error('Error refreshing datasets:', error);
      call.emit('error', error);
    }
  }

  /**
   * Get Server Info Action Handler
   * 
   * Custom action to return server status and configuration information.
   */
  _handleGetServerInfo(call) {
    try {
      // Collect server information
      const serverInfo = {
        host: this.options.host,
        port: this.options.port,
        dataDirectory: this.options.dataDirectory,
        datasets: this.flightService.getDatasets().map(d => ({
          id: d.id,
          name: d.metadata.name,
          totalBytes: d.metadata.totalBytes,
          schema: Object.keys(d.schema)
        })),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      };
      
      // Return server info as JSON in Result message
      const result = {
        body: Buffer.from(JSON.stringify(serverInfo))
      };
      
      call.write(result);
      call.end();
    } catch (error) {
      console.error('Error getting server info:', error);
      call.emit('error', error);
    }
  }

  // ===== SERVER LIFECYCLE MANAGEMENT =====

  /**
   * Start the Arrow Flight Server
   * 
   * Binds the gRPC server to the specified host:port and starts
   * accepting Arrow Flight client connections.
   */
  async start() {
    return new Promise((resolve, reject) => {
      const address = `${this.options.host}:${this.options.port}`;
      
      // Bind gRPC server to network address
      // Using insecure credentials (no TLS) for development
      this.server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
          console.error('Failed to bind server:', error);
          reject(error);
          return;
        }
        
        // Start accepting connections
        this.server.start();
        console.log(`🚀 Arrow Flight Server started on ${address}`);
        console.log(`📊 Loaded ${this.flightService.getDatasets().length} datasets`);
        console.log(`📁 Data directory: ${this.options.dataDirectory}`);
        
        // Log available datasets for debugging
        const datasets = this.flightService.getDatasets();
        if (datasets.length > 0) {
          console.log('\n📋 Available datasets:');
          datasets.forEach(dataset => {
            console.log(`  - ${dataset.id} (${dataset.metadata.name})`);
            console.log(`    Schema: ${Object.keys(dataset.schema).join(', ')}`);
          });
        }
        
        resolve(port);
      });
    });
  }

  /**
   * Stop the Arrow Flight Server
   * 
   * Gracefully shuts down the gRPC server, allowing existing
   * connections to complete before closing.
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        // Graceful shutdown - waits for active calls to complete
        this.server.tryShutdown(() => {
          console.log('🛑 Arrow Flight Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // ===== UTILITY METHODS =====
  
  /**
   * Get Server Status Information
   * 
   * Returns basic server status for monitoring/debugging.
   */
  getServerInfo() {
    return {
      host: this.options.host,
      port: this.options.port,
      running: this.server ? true : false,
      datasets: this.flightService ? this.flightService.getDatasets().length : 0
    };
  }
}

export default FlightServer; 