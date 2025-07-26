// gRPC imports
import grpc from '@grpc/grpc-js';

// Shared utilities from the core-shared package
// These provide common functionality used across client and server
import { 
  loadFlightProto,        
  createServerOptions,    
  createServerCredentials,
  getDefaultProtoPath,    
} from '@flightstream/core-shared';

// Configuration management from the server package
// Handles server-specific configuration like ports, message limits, etc.
import { createServerConfig } from './config/server-config.js';

// Protocol handlers from the server package
// These implement the actual Arrow Flight protocol operations (GetFlightInfo, DoGet, etc.)
import { createProtocolHandlers } from './protocol/handlers.js';

// Logger utilities from the server package
// Provides structured logging for the server operations
import { setLogger, getLogger } from './utils/logger.js';

/**
 * Generic Arrow Flight Server
 *
 * This class provides a generic gRPC server for Arrow Flight protocol that works
 * with any Flight service adapter. It uses a plugin architecture where the actual
 * data management is handled by pluggable service adapters (CSV, Parquet, Database, etc.)
 *
 * ARCHITECTURE OVERVIEW:
 * 
 * 1. FlightServer (this class) - Main server orchestrator
 *    - Manages gRPC server lifecycle (start/stop)
 *    - Coordinates between different components
 *    - Handles configuration and logging
 * 
 * 2. Protocol Handlers (from ./protocol/handlers.js)
 *    - Implement Arrow Flight protocol operations
 *    - Handle client requests (GetFlightInfo, DoGet, DoPut, etc.)
 *    - Delegate actual data operations to Flight Service
 * 
 * 3. Flight Service Adapter (injected via setFlightService)
 *    - Handles actual data source operations
 *    - Examples: CSV adapter, Parquet adapter, Database adapter
 *    - Implements data reading, writing, and metadata operations
 * 
 * 4. Shared Utilities (from @flightstream/core-shared)
 *    - Common protocol definitions and utilities
 *    - Used by both client and server packages
 * 
 * DATA FLOW:
 * Client Request → gRPC Server → Protocol Handlers → Flight Service Adapter → Data Source
 * 
 * Key features:
 * 1. Generic gRPC server setup with Arrow Flight protocol
 * 2. Plugin architecture for data source adapters
 * 3. Standard protocol handler delegation
 * 4. Configurable server options (ports, message limits, etc.)
 * 5. Lifecycle management (start, stop, graceful shutdown)
 */
export class FlightServer {
  /**
   * Set the logger for the entire Flight Server package
   * This allows external applications to inject their own logging system
   * @param {Object} logger - Logger instance with debug, info, warn, error methods
   */
  static setLogger(logger) {
    setLogger(logger);
  }

  /**
   * Constructor - Initializes the Flight Server with configuration
   * 
   * @param {Object} options - Server configuration options
   * @param {string} options.protoPath - Path to the Arrow Flight protocol definition file
   * @param {string} options.host - Server host (default: '0.0.0.0')
   * @param {number} options.port - Server port (default: 50051)
   * @param {number} options.maxReceiveMessageLength - Max message size for receiving
   * @param {number} options.maxSendMessageLength - Max message size for sending
   * @param {Object} options.logger - Logger instance for server operations
   */
  constructor(options = {}) {
    // Create server configuration using the server-config module
    // This validates and sets default values for all server options
    this.options = createServerConfig({
      protoPath: options.protoPath || getDefaultProtoPath(),
      ...options
    });

    // The underlying gRPC server instance
    this.server = null;

    // Flight service adapter (CSV, Parquet, Database, etc.)
    // This is the plugin that handles actual data operations
    // It's injected via setFlightService() method
    this.flightService = null;

    // Protocol handlers that implement Arrow Flight operations
    // These are created when a flight service is set
    // They delegate operations to the flight service adapter
    this.protocolHandlers = null;

    // Set package logger if provided
    // This allows external applications to inject their logging system
    if (options.logger) {
      setLogger(options.logger);
    }

    // Use package logger for all server operations
    this.logger = getLogger();
  }

  /**
   * Set the Flight service adapter
   * 
   * This is the key method that connects the server to a specific data source.
   * The flight service adapter is responsible for:
   * - Reading data from the data source (CSV files, databases, etc.)
   * - Providing metadata about available datasets
   * - Handling data transformations and streaming
   * 
   * @param {FlightServiceBase} flightService - Service adapter instance
   * 
   * Example adapters:
   * - CSVService: Reads data from CSV files
   * - ParquetService: Reads data from Parquet files
   * - DatabaseService: Reads data from databases
   */
  setFlightService(flightService) {
    this.flightService = flightService;
    
    // Create protocol handlers that will delegate to this flight service
    // The handlers implement the Arrow Flight protocol operations
    this.protocolHandlers = createProtocolHandlers(flightService);
    
    // Register the gRPC service with the protocol handlers
    // This connects the gRPC server to the actual data operations
    this._registerGrpcService();
  }

  /**
   * Initialize gRPC Service with Arrow Flight Protocol
   * 
   * This method sets up the underlying gRPC server infrastructure:
   * 1. Loads the Arrow Flight protocol definition from the .proto file
   * 2. Creates the gRPC server instance with configured options
   * 
   * The protocol definition defines the available RPC methods that clients can call.
   */
  _initializeGrpcServer() {
    if (this.server) {
      return; // Already initialized
    }

    // Load the Arrow Flight protocol definition using shared utilities
    // This .proto file defines the gRPC service interface
    this.flightProto = loadFlightProto(this.options.protoPath);

    // Create the gRPC server instance with shared options
    // The options include message size limits, timeouts, etc.
    this.server = new grpc.Server(createServerOptions(this.options));
  }

  /**
   * Register the gRPC service with protocol handlers
   * 
   * This method connects the gRPC server to the actual implementation.
   * It maps the protocol definition to the handlers that implement the operations.
   * 
   * The protocol handlers delegate to the flight service adapter for actual data operations.
   */
  _registerGrpcService() {
    if (!this.server || !this.protocolHandlers || !this.flightProto) {
      return; // Not ready to register
    }

    // Register the Arrow Flight service with the gRPC server
    // This connects the protocol definition to the actual implementation
    // When clients make RPC calls, they'll be handled by our protocol handlers
    this.server.addService(this.flightProto.FlightService.service, this.protocolHandlers);
  }

  /**
   * Start the Flight server
   * 
   * This method performs the following steps:
   * 1. Validates that a flight service adapter is set
   * 2. Initializes the gRPC server infrastructure
   * 3. Registers the service with protocol handlers
   * 4. Binds the server to the configured host and port
   * 5. Starts listening for client connections
   * 
   * @returns {Promise<number>} The port the server is listening on
   */
  async start() {
    return new Promise((resolve, reject) => {
      // Validate that a flight service adapter is set
      // This is required because the protocol handlers need it to handle requests
      if (!this.flightService) {
        reject(new Error('Flight service adapter not set. Call setFlightService() first.'));
        return;
      }

      // Initialize gRPC server infrastructure
      // This loads the protocol definition and creates the server instance
      this._initializeGrpcServer();

      // Register the gRPC service (now that server is initialized)
      // This connects the protocol handlers to the server
      this._registerGrpcService();

      // Bind server to host and port
      // This makes the server listen for incoming connections
      const serverAddress = `${this.options.host}:${this.options.port}`;

      // Bind the server asynchronously
      // This is where the server actually starts listening for connections
      this.server.bindAsync(serverAddress, createServerCredentials(), (error, port) => {
        if (error) {
          this.logger.error({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            },
            server_address: serverAddress
          }, 'Failed to bind server');
          reject(error);
          return;
        }

        this.logger.info({
          server_address: serverAddress,
          port: port
        }, 'Arrow Flight Server bound');

        // Start the server
        // This begins accepting and processing client connections
        this.server.start();

        this.logger.info({
          port: port,
          host: this.options.host
        }, 'Arrow Flight Server started');
        resolve(port);
      });
    });
  }

  /**
   * Stop the Flight server gracefully
   * 
   * This method performs a graceful shutdown:
   * 1. Stops accepting new connections
   * 2. Waits for existing connections to complete
   * 3. If graceful shutdown fails, forces shutdown
   * 
   * @returns {Promise<void>}
   */
  async stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.logger.info('Stopping Arrow Flight Server...');

      // Try graceful shutdown first
      // This stops accepting new connections but allows existing ones to complete
      this.server.tryShutdown((error) => {
        if (error) {
          this.logger.warn({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            }
          }, 'Graceful shutdown failed, forcing shutdown');
          // Force shutdown if graceful shutdown fails
          // This immediately terminates all connections
          this.server.forceShutdown();
        }

        this.logger.info('Arrow Flight Server stopped');
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Get server information
   * 
   * Returns comprehensive information about the server state including:
   * - Network configuration (host, port)
   * - Message size limits
   * - Running status
   * - Connected flight service adapter
   * - Available datasets
   * 
   * @returns {Object} Server information
   */
  getServerInfo() {
    return {
      host: this.options.host,
      port: this.options.port,
      maxReceiveMessageLength: this.options.maxReceiveMessageLength,
      maxSendMessageLength: this.options.maxSendMessageLength,
      running: this.server !== null,
      flightService: this.flightService ? this.flightService.constructor.name : null,
      datasets: this.flightService ? this.flightService.getDatasets() : []
    };
  }

  /**
   * Check if server is running
   * 
   * @returns {boolean} True if server is running, false otherwise
   */
  isRunning() {
    return this.server !== null;
  }
}

export default FlightServer;
