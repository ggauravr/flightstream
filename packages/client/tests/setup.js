/**
 * Test setup file for @flightstream/client
 * Sets up browser environment mocks and utilities
 */

import { jest } from '@jest/globals';

// Mock browser APIs that might not be available in test environment
global.URL = global.URL || (await import('url')).URL;

// Mock WebSocket for stream testing
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
  }
  
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Mock Buffer if not available
if (typeof Buffer === 'undefined') {
  global.Buffer = {
    from: (data, encoding) => {
      if (encoding === 'utf8') {
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    }
  };
}

// Mock setTimeout/clearTimeout for controlled testing
jest.useFakeTimers();

// Global test utilities
global.createMockFlightResponse = (data = {}) => ({
  getFlightInfo: () => ({
    descriptor: { path: ['test-dataset'] },
    endpoints: [{ location: 'http://localhost:8080' }],
    totalRecords: 1000,
    totalBytes: 50000,
    ...data
  })
});

global.createMockRecordBatch = (numRows = 10) => ({
  getDataHeader: () => new Uint8Array([1, 2, 3]),
  getDataBody: () => new Uint8Array([4, 5, 6]),
  numRows
});

// Helper for creating mock gRPC streams
global.createMockGrpcStream = () => {
  const mockStream = {
    on: jest.fn(),
    cancel: jest.fn(),
    _eventHandlers: {}
  };
  
  // Setup event handling
  mockStream.on.mockImplementation((event, handler) => {
    if (!mockStream._eventHandlers[event]) {
      mockStream._eventHandlers[event] = [];
    }
    mockStream._eventHandlers[event].push(handler);
  });
  
  // Helper to emit events
  mockStream._emit = (event, ...args) => {
    const handlers = mockStream._eventHandlers[event] || [];
    handlers.forEach(handler => handler(...args));
  };
  
  return mockStream;
};

// Console warning suppression for expected test warnings
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings during tests
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('Received empty data chunk') ||
    message.includes('Error during disconnection')
  )) {
    return;
  }
  originalConsoleWarn(...args);
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
}); 