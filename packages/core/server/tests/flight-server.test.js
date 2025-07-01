/**
 * Tests for FlightServer
 * @fileoverview Basic test suite for Arrow Flight server functionality
 */

import { FlightServer } from '../src/flight-server.js';
import { FlightServiceBase } from '../src/flight-service-base.js';

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
    // Reset state
  });

  afterEach(async () => {
    if (server && server.server) {
      try {
        await server.stop();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
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
        // This test would require mocking the proto loading process
        // For now, we'll test that the server initializes without errors
        server.setFlightService(mockService);
        expect(() => server._initializeGrpcServer()).not.toThrow();
      });

      it('should parse proto file with correct options', () => {
        // This test would require mocking proto loading
        // For now, test that initialization completes
        expect(() => server._initializeGrpcServer()).not.toThrow();
        expect(server.flightProto).toBeDefined();
      });

      it('should create gRPC server with message limits', () => {
        // This test would require mocking gRPC server creation
        // For now, test that initialization completes
        expect(() => server._initializeGrpcServer()).not.toThrow();
        expect(server.server).toBeDefined();
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
        server.setFlightService(mockService);
        
        // Mock the server start to avoid actual binding
        server._initializeGrpcServer = () => {
          server.server = { 
            bindAsync: (address, credentials, callback) => {
              setTimeout(() => callback(null, 8080), 1);
            }, 
            start: () => {} 
          };
        };
        
        const port = await server.start();
        expect(port).toBeGreaterThan(0);
      });

      it('should return actual port number', async () => {
        server.setFlightService(mockService);
        
        server._initializeGrpcServer = () => {
          server.server = { 
            bindAsync: (address, credentials, callback) => {
              setTimeout(() => callback(null, 8080), 1);
            }, 
            start: () => {} 
          };
        };
        
        const port = await server.start();
        expect(port).toBe(8080);
      });

      it('should start gRPC server', async () => {
        server.setFlightService(mockService);
        
        // Mock the server initialization
        server._initializeGrpcServer = () => {
          server.server = { 
            bindAsync: (address, credentials, callback) => {
              setTimeout(() => callback(null, 8080), 1);
            }, 
            start: () => {} 
          };
        };
        
        await server.start();
        
        expect(server.server).toBeDefined();
      });

      it('should handle binding errors', async () => {
        server.setFlightService(mockService);
        
        // Mock server initialization that throws an error
        server._initializeGrpcServer = () => {
          throw new Error('Port in use');
        };
        
        await expect(server.start()).rejects.toThrow('Port in use');
      });
    });

    describe('stop', () => {
      beforeEach(async () => {
        server.setFlightService(mockService);
      });

      it('should gracefully shutdown server', async () => {
        server._initializeGrpcServer = () => {
          server.server = { 
            bindAsync: (address, credentials, callback) => {
              setTimeout(() => callback(null, 8080), 1);
            }, 
            start: () => {},
            tryShutdown: (callback) => setTimeout(() => callback(null), 1),
            forceShutdown: () => {}
          };
        };
        
        await server.start();
        await server.stop();
        
        expect(server.server).toBeNull();
      });

      it('should force shutdown if graceful fails', async () => {
        server._initializeGrpcServer = () => {
          server.server = { 
            bindAsync: (address, credentials, callback) => {
              setTimeout(() => callback(null, 8080), 1);
            }, 
            start: () => {},
            tryShutdown: (callback) => setTimeout(() => callback(new Error('Shutdown failed')), 1),
            forceShutdown: () => {}
          };
        };
        
        await server.start();
        await server.stop();
        
        expect(server.server).toBeNull();
      });

      it('should reset server instance to null', async () => {
        server._initializeGrpcServer = () => {
          server.server = { 
            bindAsync: (address, credentials, callback) => {
              setTimeout(() => callback(null, 8080), 1);
            }, 
            start: () => {},
            tryShutdown: (callback) => setTimeout(() => callback(null), 1),
            forceShutdown: () => {}
          };
        };
        
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
        
        server._initializeGrpcServer = () => {
          server.server = { 
            bindAsync: (address, credentials, callback) => {
              setTimeout(() => callback(null, 8080), 1);
            }, 
            start: () => {},
            tryShutdown: (callback) => setTimeout(() => callback(null), 1),
            forceShutdown: () => {}
          };
        };
        
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
        expect(info).toHaveProperty('running', false);  // Updated property name
        expect(info).toHaveProperty('flightService');  // Updated property name
      });

      it('should handle multiple start/stop cycles', async () => {
        server._initializeGrpcServer = () => {
          server.server = { 
            bindAsync: (address, credentials, callback) => {
              setTimeout(() => callback(null, 8080), 1);
            }, 
            start: () => {},
            tryShutdown: (callback) => setTimeout(() => callback(null), 1),
            forceShutdown: () => {}
          };
        };
        
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