/**
 * @fileoverview Tests for FlightClient class
 */

import { FlightClient } from '../src/flight-client.js';
import { FlightClientError, ConnectionError } from '../src/errors.js';

describe('FlightClient', () => {
  let client;
  
  beforeEach(() => {
    client = new FlightClient({
      endpoint: 'http://localhost:8080'
    });
  });
  
  afterEach(() => {
    if (client && client.isConnected) {
      client.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create a FlightClient with default options', () => {
      expect(client).toBeInstanceOf(FlightClient);
      expect(client.options.endpoint).toBe('http://localhost:8080');
      expect(client.options.timeout).toBe(30000);
      expect(client.options.enableCompression).toBe(true);
      expect(client.options.enableRetry).toBe(true);
      expect(client.options.maxRetries).toBe(3);
    });

    it('should throw error if no endpoint provided', () => {
      expect(() => {
        new FlightClient({});
      }).toThrow(FlightClientError);
    });

    it('should merge custom options with defaults', () => {
      const customClient = new FlightClient({
        endpoint: 'http://example.com:9090',
        timeout: 60000,
        enableCompression: false,
        headers: { 'X-Custom': 'value' }
      });

      expect(customClient.options.endpoint).toBe('http://example.com:9090');
      expect(customClient.options.timeout).toBe(60000);
      expect(customClient.options.enableCompression).toBe(false);
      expect(customClient.options.headers['X-Custom']).toBe('value');
    });
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      await expect(client.connect()).resolves.not.toThrow();
      expect(client.isConnected).toBe(true);
      expect(client.isConnecting).toBe(false);
    });

    it('should not connect if already connected', async () => {
      await client.connect();
      // Second connect should return without error
      await expect(client.connect()).resolves.not.toThrow();
      expect(client.isConnected).toBe(true);
    });

    it('should throw error if connect while connecting', async () => {
      // Start connection but don't await
      const connectPromise = client.connect();
      
      // Try to connect again while first is in progress
      await expect(client.connect()).rejects.toThrow(ConnectionError);
      
      // Complete first connection
      await connectPromise;
    });

    it('should disconnect successfully', async () => {
      await client.connect();
      await expect(client.disconnect()).resolves.not.toThrow();
      expect(client.isConnected).toBe(false);
    });

    it('should not error on disconnect when not connected', async () => {
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });

  describe('flight operations', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should list flights', async () => {
      const flights = await client.listFlights();
      expect(Array.isArray(flights)).toBe(true);
      expect(flights.length).toBeGreaterThan(0);
      expect(flights[0]).toHaveProperty('descriptor');
      expect(flights[0]).toHaveProperty('endpoints');
    });

    it('should get flight info', async () => {
      const info = await client.getFlightInfo('test-dataset');
      expect(info).toHaveProperty('descriptor');
      expect(info).toHaveProperty('totalRecords');
      expect(info).toHaveProperty('totalBytes');
    });

    it('should get schema', async () => {
      const schema = await client.getSchema('test-dataset');
      expect(schema).toHaveProperty('fields');
      expect(Array.isArray(schema.fields)).toBe(true);
    });

    it('should throw error when not connected', async () => {
      await client.disconnect();
      
      await expect(client.listFlights()).rejects.toThrow();
      await expect(client.getFlightInfo('test')).rejects.toThrow();
      await expect(client.getSchema('test')).rejects.toThrow();
    });
  });

  describe('streaming', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should create a stream', () => {
      const stream = client.getStream('test-dataset', { autoStart: false });
      expect(stream).toBeDefined();
      expect(typeof stream.on).toBe('function');
      expect(typeof stream.start).toBe('function');
    });

    it('should throw error when creating stream without connection', async () => {
      await client.disconnect();
      
      expect(() => {
        client.getStream('test-dataset');
      }).toThrow(ConnectionError);
    });

    it('should get complete data', async () => {
      const data = await client.getData('test-dataset', { timeout: 5000 });
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should add and remove event listeners', () => {
      const mockListener = jest.fn();
      
      client.on('connect', mockListener);
      expect(client.eventListeners.get('connect')).toContain(mockListener);
      
      client.off('connect', mockListener);
      expect(client.eventListeners.get('connect')).not.toContain(mockListener);
    });

    it('should call connection event handlers', async () => {
      const connectHandler = jest.fn();
      const disconnectHandler = jest.fn();
      
      client.on('connect', connectHandler);
      client.on('disconnect', disconnectHandler);
      
      await client.connect();
      expect(connectHandler).toHaveBeenCalled();
      
      await client.disconnect();
      expect(disconnectHandler).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newOptions = {
        timeout: 45000,
        enableRetry: false
      };
      
      client.updateConfig(newOptions);
      expect(client.options.timeout).toBe(45000);
      expect(client.options.enableRetry).toBe(false);
    });

    it('should get status information', () => {
      const status = client.getStatus();
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('isConnecting');
      expect(status).toHaveProperty('endpoint');
      expect(status).toHaveProperty('connectionInfo');
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Create client with invalid endpoint to force error
      const badClient = new FlightClient({
        endpoint: 'invalid://endpoint'
      });
      
      await expect(badClient.connect()).rejects.toThrow(ConnectionError);
    });

    it('should call global error handler on errors', async () => {
      const errorHandler = jest.fn();
      const errorClient = new FlightClient({
        endpoint: 'http://localhost:8080',
        onError: errorHandler
      });
      
      // Force an error by connecting to invalid endpoint
      try {
        await errorClient.connect();
      } catch (error) {
        // Expected to fail
      }
      
      // Global error handler should have been called
      expect(errorHandler).toHaveBeenCalled();
    });
  });
}); 