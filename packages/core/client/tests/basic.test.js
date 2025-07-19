import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FlightClient } from '../src/flight-client.js';
import { FlightClientBase } from '../src/flight-client-base.js';
import { FlightProtocolClient } from '../src/flight-protocol-client.js';

describe('FlightClient', () => {
  let client;

  beforeEach(() => {
    client = new FlightClient({
      host: 'localhost',
      port: 8080,
      logger: console
    });
  });

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create a client with default options', () => {
      const defaultClient = new FlightClient();
      expect(defaultClient.options.host).toBe('localhost');
      expect(defaultClient.options.port).toBe(8080);
    });

    it('should create a client with custom options', () => {
      const customClient = new FlightClient({
        host: 'example.com',
        port: 9090,
        retryAttempts: 5
      });
      
      expect(customClient.options.host).toBe('example.com');
      expect(customClient.options.port).toBe(9090);
      expect(customClient.options.retryAttempts).toBe(5);
    });
  });

  describe('connection management', () => {
    it('should have initial disconnected state', () => {
      expect(client.isConnected).toBe(false);
      expect(client.isConnecting).toBe(false);
    });

    it('should emit connection events', async () => {
      const events = [];
      
      client.on('connecting', () => events.push('connecting'));
      client.on('connected', () => events.push('connected'));
      client.on('disconnected', () => events.push('disconnected'));

      // Mock the protocol client to avoid actual connection
      client.protocolClient.listFlights = jest.fn().mockResolvedValue([]);
      
      await client.connect();
      expect(events).toContain('connecting');
      expect(events).toContain('connected');
    });

    it('should get connection status', () => {
      const status = client.getConnectionStatus();
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('isConnecting');
      expect(status).toHaveProperty('host');
      expect(status).toHaveProperty('port');
    });
  });

  describe('API methods', () => {
    beforeEach(() => {
      // Mock the protocol client methods
      client.protocolClient.listFlights = jest.fn().mockResolvedValue([
        {
          flight_descriptor: { path: ['test-dataset'] },
          total_records: 100,
          total_bytes: 1024
        }
      ]);
      
      client.protocolClient.getFlightInfo = jest.fn().mockResolvedValue({
        total_records: 100,
        total_bytes: 1024,
        schema: Buffer.from([])
      });
      
      client.protocolClient.getSchema = jest.fn().mockResolvedValue({
        schema: Buffer.from([])
      });
      
      client.protocolClient.streamData = jest.fn().mockImplementation(async function* () {
        // Mock empty stream
      });
      
      client.protocolClient.doAction = jest.fn().mockResolvedValue([]);
      client.protocolClient.listActions = jest.fn().mockResolvedValue([]);
    });

    it('should list datasets', async () => {
      const datasets = await client.listDatasets();
      expect(Array.isArray(datasets)).toBe(true);
      expect(datasets.length).toBeGreaterThan(0);
      expect(datasets[0]).toHaveProperty('id');
      expect(datasets[0]).toHaveProperty('totalRecords');
    });

    it('should get dataset info', async () => {
      const info = await client.getDatasetInfo('test-dataset');
      expect(info).toHaveProperty('id', 'test-dataset');
      expect(info).toHaveProperty('totalRecords');
      expect(info).toHaveProperty('totalBytes');
    });

    it('should get schema', async () => {
      // Mock arrow.tableFromIPC to return a mock schema
      const mockSchema = { fields: [] };
      const mockTable = { schema: mockSchema };
      
      jest.doMock('apache-arrow', () => ({
        tableFromIPC: jest.fn().mockReturnValue(mockTable)
      }));

      const schema = await client.getSchema('test-dataset');
      expect(schema).toBeDefined();
    });

    it('should list actions', async () => {
      const actions = await client.listActions();
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should get server info', async () => {
      const info = await client.getServerInfo();
      expect(info).toHaveProperty('connection');
      expect(info).toHaveProperty('datasets');
      expect(info).toHaveProperty('actions');
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      client.protocolClient.listFlights = jest.fn().mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(client.connect()).rejects.toThrow('Connection failed');
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      client.protocolClient.listFlights = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve([]);
      });

      const datasets = await client.listDatasets();
      expect(attempts).toBe(3);
      expect(Array.isArray(datasets)).toBe(true);
    });
  });
});

describe('FlightClientBase', () => {
  it('should be an abstract base class', () => {
    const base = new FlightClientBase();
    expect(base).toBeInstanceOf(FlightClientBase);
    expect(() => base.listDatasets()).rejects.toThrow('listDatasets() must be implemented by subclass');
  });
});

describe('FlightProtocolClient', () => {
  it('should create a protocol client', () => {
    const protocolClient = new FlightProtocolClient({
      host: 'localhost',
      port: 8080
    });
    
    expect(protocolClient).toBeInstanceOf(FlightProtocolClient);
    expect(protocolClient.options.host).toBe('localhost');
    expect(protocolClient.options.port).toBe(8080);
  });
}); 