/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// gRPC imports
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

import path from 'path';
import { fileURLToPath } from 'url';

// Protocol handlers for Arrow Flight operations
import { createProtocolHandlers } from './protocol-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 8080,
      // Large message limits for Arrow data transfer
      maxReceiveMessageLength: options.maxReceiveMessageLength || 100 * 1024 * 1024, // 100MB
      maxSendMessageLength: options.maxSendMessageLength || 100 * 1024 * 1024, // 100MB
      // Proto file location (default to bundled proto)
      protoPath: options.protoPath || path.join(__dirname, '../proto/flight.proto'),
      ...options
    };

    // The underlying gRPC server instance
    this.server = null;

    // Flight service adapter (CSV, Parquet, Database, etc.)
    this.flightService = null;

    // Protocol handlers
    this.protocolHandlers = null;
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

    // Load the Arrow Flight protocol definition
    const PROTO_PATH = this.options.protoPath;

    // Parse the protocol buffer definition
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,     // Preserve field name casing from proto file
      longs: String,      // Convert 64-bit integers to strings for JavaScript compatibility
      enums: String,      // Convert enums to string values
      defaults: true,     // Include default values for optional fields
      oneofs: true,       // Support oneof field declarations
    });

    // Extract the Arrow Flight service definition
    const flightProto = grpc.loadPackageDefinition(packageDefinition).arrow.flight.protocol;

    // Create the gRPC server instance with large message support
    this.server = new grpc.Server({
      'grpc.max_receive_message_length': this.options.maxReceiveMessageLength,
      'grpc.max_send_message_length': this.options.maxSendMessageLength,
    });

    // Store the flight proto for service registration
    this.flightProto = flightProto;
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

      this.server.bindAsync(serverAddress, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
          console.error('Failed to bind server:', error);
          reject(error);
          return;
        }

        console.log(`🚀 Arrow Flight Server bound to ${serverAddress}`);

        // Start the server
        this.server.start();

        console.log(`✅ Arrow Flight Server started on port ${port}`);
        resolve(port);
      });
    });
  }

  /**
   * Stop the Flight server gracefully
   * @returns {Promise<void>}
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      console.log('🛑 Stopping Arrow Flight Server...');

      // Try graceful shutdown first
      this.server.tryShutdown((error) => {
        if (error) {
          console.warn('Graceful shutdown failed, forcing shutdown:', error);
          // Force shutdown
          this.server.forceShutdown();
        }

        console.log('✅ Arrow Flight Server stopped');
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
