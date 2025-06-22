/**
 * Tests for FlightServer
 * @fileoverview Comprehensive test suite for Arrow Flight server functionality
 */

import { FlightServer } from '../src/flight-server.js';
import { FlightServiceBase } from '../src/flight-service-base.js';
import { CoreTestUtils } from './setup.js';

// Mock grpc module
jest.mock('@grpc/grpc-js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    addService: jest.fn(),
    bindAsync: jest.fn((address, credentials, callback) => {
      // Simulate successful binding
      setTimeout(() => callback(null, 8080), 10);
    }),
    start: jest.fn(),
    tryShutdown: jest.fn((callback) => {
      setTimeout(() => callback(null), 10);
    }),
    forceShutdown: jest.fn()
  })),
  ServerCredentials: {
    createInsecure: jest.fn()
  },
  loadPackageDefinition: jest.fn(() => ({
    arrow: {
      flight: {
        protocol: {
          FlightService: {
            service: {}
          }
        }
      }
    }
  }))
}));

jest.mock('@grpc/proto-loader', () => ({
  loadSync: jest.fn(() => ({}))
}));

// Mock flight service for testing
class MockFlightService extends FlightServiceBase {
  async _initialize() {
    // Mock initialization
  }

  async _initializeDatasets() {
    // Mock dataset initialization
  }

  async _inferSchemaForDataset(datasetId) {
    return { fields: [] };
  }

  async _streamDataset(call, dataset) {
    // Mock streaming
  }
}

describe('FlightServer', () => {
  let server;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (server && server.server) {
      await server.stop();
    }
  });

  describe('construction', () => {
    it('should initialize with default options', () => {
      server = new FlightServer();
      
      expect(server.options.host).toBe('localhost');
      expect(server.options.port).toBe(8080);
      expect(server.options.maxReceiveMessageLength).toBe(100 * 1024 * 1024);
      expect(server.options.maxSendMessageLength).toBe(100 * 1024 * 1024);
      expect(server.server).toBeNull();
      expect(server.flightService).toBeNull();
    });

    it('should accept custom host and port', () => {
      server = new FlightServer({
        host: '0.0.0.0',
        port: 9090
      });
      
      expect(server.options.host).toBe('0.0.0.0');
      expect(server.options.port).toBe(9090);
    });

    it('should set large message limits for Arrow data', () => {
      server = new FlightServer();
      
      const expectedLimit = 100 * 1024 * 1024; // 100MB
      expect(server.options.maxReceiveMessageLength).toBe(expectedLimit);
      expect(server.options.maxSendMessageLength).toBe(expectedLimit);
    });

    it('should accept custom proto file path', () => {
      const customProtoPath = '/custom/path/flight.proto';
      server = new FlightServer({ protoPath: customProtoPath });
      
      expect(server.options.protoPath).toBe(customProtoPath);
    });

    it('should initialize server state as null', () => {
      server = new FlightServer();
      
      expect(server.server).toBeNull();
      expect(server.flightService).toBeNull();
      expect(server.protocolHandlers).toBeNull();
    });
  });

  describe('configuration', () => {
    beforeEach(() => {
      server = new FlightServer();
    });

    it('should configure maxReceiveMessageLength', () => {
      const customLimit = 50 * 1024 * 1024;
      server = new FlightServer({ maxReceiveMessageLength: customLimit });
      
      expect(server.options.maxReceiveMessageLength).toBe(customLimit);
    });

    it('should configure maxSendMessageLength', () => {
      const customLimit = 200 * 1024 * 1024;
      server = new FlightServer({ maxSendMessageLength: customLimit });
      
      expect(server.options.maxSendMessageLength).toBe(customLimit);
    });

    it('should use default proto file location', () => {
      expect(server.options.protoPath).toContain('flight.proto');
    });

    it('should accept custom proto file path', () => {
      const customPath = '/test/custom.proto';
      server = new FlightServer({ protoPath: customPath });
      
      expect(server.options.protoPath).toBe(customPath);
    });
  });

  describe('service registration', () => {
    let mockService;

    beforeEach(() => {
      server = new FlightServer();
      mockService = new MockFlightService();
    });

    describe('setFlightService', () => {
      it('should accept FlightServiceBase instances', () => {
        server.setFlightService(mockService);
        
        expect(server.flightService).toBe(mockService);
      });

      it('should create protocol handlers for the service', () => {
        server.setFlightService(mockService);
        
        expect(server.protocolHandlers).toBeDefined();
        expect(typeof server.protocolHandlers).toBe('object');
      });

      it('should store service reference', () => {
        server.setFlightService(mockService);
        
        expect(server.flightService).toBe(mockService);
      });
    });

    describe('gRPC service initialization', () => {
      it('should load Arrow Flight protocol definition', () => {
        const protoLoader = require('@grpc/proto-loader');
        
        server.setFlightService(mockService);
        server._initializeGrpcServer();
        
        expect(protoLoader.loadSync).toHaveBeenCalledWith(
          server.options.protoPath,
          expect.objectContaining({
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
          })
        );
      });

      it('should parse proto file with correct options', () => {
        const protoLoader = require('@grpc/proto-loader');
        
        server._initializeGrpcServer();
        
        expect(protoLoader.loadSync).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
          })
        );
      });

      it('should create gRPC server with message limits', () => {
        const grpc = require('@grpc/grpc-js');
        
        server._initializeGrpcServer();
        
        expect(grpc.Server).toHaveBeenCalledWith({
          'grpc.max_receive_message_length': server.options.maxReceiveMessageLength,
          'grpc.max_send_message_length': server.options.maxSendMessageLength
        });
      });

      it('should store proto service definition', () => {
        server._initializeGrpcServer();
        
        expect(server.flightProto).toBeDefined();
        expect(server.flightProto.FlightService).toBeDefined();
      });
    });
  });

  describe('lifecycle', () => {
    let mockService;

    beforeEach(() => {
      server = new FlightServer();
      mockService = new MockFlightService();
    });

    describe('start', () => {
      it('should require flight service to be set', async () => {
        await expect(server.start()).rejects.toThrow('Flight service adapter not set');
      });

      it('should bind to specified host and port', async () => {
        const grpc = require('@grpc/grpc-js');
        server.setFlightService(mockService);
        
        await server.start();
        
        expect(server.server.bindAsync).toHaveBeenCalledWith(
          'localhost:8080',
          grpc.ServerCredentials.createInsecure(),
          expect.any(Function)
        );
      });

      it('should return actual port number', async () => {
        server.setFlightService(mockService);
        
        const port = await server.start();
        expect(port).toBe(8080);
      });

      it('should start gRPC server', async () => {
        server.setFlightService(mockService);
        
        await server.start();
        
        expect(server.server.start).toHaveBeenCalled();
      });

      it('should handle binding errors', async () => {
        const grpc = require('@grpc/grpc-js');
        server.setFlightService(mockService);
        
        // Mock binding error
        server.server.bindAsync.mockImplementation((address, credentials, callback) => {
          setTimeout(() => callback(new Error('Port in use')), 10);
        });
        
        await expect(server.start()).rejects.toThrow('Port in use');
      });
    });

    describe('stop', () => {
      beforeEach(async () => {
        server.setFlightService(mockService);
      });

      it('should gracefully shutdown server', async () => {
        await server.start();
        await server.stop();
        
        expect(server.server.tryShutdown).toHaveBeenCalled();
      });

      it('should force shutdown if graceful fails', async () => {
        await server.start();
        
        // Mock graceful shutdown failure
        server.server.tryShutdown.mockImplementation((callback) => {
          setTimeout(() => callback(new Error('Shutdown failed')), 10);
        });
        
        await server.stop();
        
        expect(server.server.tryShutdown).toHaveBeenCalled();
        expect(server.server.forceShutdown).toHaveBeenCalled();
      });

      it('should reset server instance to null', async () => {
        await server.start();
        await server.stop();
        
        expect(server.server).toBeNull();
      });

      it('should handle stop when not running', async () => {
        // Should not throw error
        await expect(server.stop()).resolves.toBeUndefined();
      });
    });

    describe('server state', () => {
      beforeEach(() => {
        server.setFlightService(mockService);
      });

      it('should track if server is running', async () => {
        expect(server.isRunning()).toBe(false);
        
        await server.start();
        expect(server.isRunning()).toBe(true);
        
        await server.stop();
        expect(server.isRunning()).toBe(false);
      });

      it('should provide server information', () => {
        const info = server.getServerInfo();
        
        expect(info).toHaveProperty('host', 'localhost');
        expect(info).toHaveProperty('port', 8080);
        expect(info).toHaveProperty('maxReceiveMessageLength');
        expect(info).toHaveProperty('maxSendMessageLength');
        expect(info).toHaveProperty('isRunning');
        expect(info).toHaveProperty('hasFlightService');
      });

      it('should handle multiple start/stop cycles', async () => {
        // First cycle
        await server.start();
        expect(server.isRunning()).toBe(true);
        await server.stop();
        expect(server.isRunning()).toBe(false);
        
        // Second cycle
        await server.start();
        expect(server.isRunning()).toBe(true);
        await server.stop();
        expect(server.isRunning()).toBe(false);
      });
    });
  });
}); 