// gRPC imports
import grpc from '@grpc/grpc-js';

// Shared utilities
import { 
  loadFlightProto, 
  createServerOptions, 
  createServerCredentials,
  getDefaultProtoPath 
} from '@flightstream/core-shared';

// Configuration management
import { createServerConfig } from './config/server-config.js';

// Protocol handlers for Arrow Flight operations
import { createProtocolHandlers } from './protocol/handlers.js';

/**
 * Generic Arrow Flight Server
 *
 * This class provides a generic gRPC server for Arrow Flight protocol that works
 * with any Flight service adapter. It uses a plugin architecture where the actual
 * data management is handled by pluggable service adapters (CSV, Parquet, Database, etc.)
 *
 * Key features:
 * 1. Generic gRPC server setup with Arrow Flight protocol
 * 2. Plugin architecture for data source adapters
 * 3. Standard protocol handler delegation
 * 4. Configurable server options (ports, message limits, etc.)
 * 5. Lifecycle management (start, stop, graceful shutdown)
 */
export class FlightServer {
  constructor(options = {}) {
    this.options = createServerConfig({
      protoPath: options.protoPath || getDefaultProtoPath(),
      ...options
    });

    // The underlying gRPC server instance
    this.server = null;

    // Flight service adapter (CSV, Parquet, Database, etc.)
    this.flightService = null;

    // Protocol handlers
    this.protocolHandlers = null;

    // Logger - use provided logger or console
    this.logger = options.logger || console;
  }

  /**
   * Set the Flight service adapter
   * @param {FlightServiceBase} flightService - Service adapter instance
   */
  setFlightService(flightService) {
    this.flightService = flightService;
    this.protocolHandlers = createProtocolHandlers(flightService);
    this._registerGrpcService();
  }

  /**
   * Initialize gRPC Service with Arrow Flight Protocol
   */
  _initializeGrpcServer() {
    if (this.server) {
      return; // Already initialized
    }

    // Load the Arrow Flight protocol definition using shared utilities
    this.flightProto = loadFlightProto(this.options.protoPath);

    // Create the gRPC server instance with shared options
    this.server = new grpc.Server(createServerOptions(this.options));
  }

  /**
   * Register the gRPC service with protocol handlers
   */
  _registerGrpcService() {
    if (!this.server || !this.protocolHandlers || !this.flightProto) {
      return; // Not ready to register
    }

    // Register the Arrow Flight service with the gRPC server
    this.server.addService(this.flightProto.FlightService.service, this.protocolHandlers);
  }

  /**
   * Start the Flight server
   * @returns {Promise<number>} The port the server is listening on
   */
  async start() {
    return new Promise((resolve, reject) => {
      if (!this.flightService) {
        reject(new Error('Flight service adapter not set. Call setFlightService() first.'));
        return;
      }

      // Initialize gRPC server
      this._initializeGrpcServer();

      // Register the gRPC service (now that server is initialized)
      this._registerGrpcService();

      // Bind server to host and port
      const serverAddress = `${this.options.host}:${this.options.port}`;

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
      this.server.tryShutdown((error) => {
        if (error) {
          this.logger.warn({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            }
          }, 'Graceful shutdown failed, forcing shutdown');
          // Force shutdown
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
   * @returns {boolean}
   */
  isRunning() {
    return this.server !== null;
  }
}

export default FlightServer;
