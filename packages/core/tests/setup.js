/**
 * Jest setup for @flightstream/core package
 */

// Set test timeout for gRPC operations
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Mock console.log to avoid noise in tests unless explicitly testing logging
global.originalConsoleLog = console.log;
beforeEach(() => {
  if (typeof jest !== 'undefined') {
    console.log = jest.fn();
  } else {
    console.log = () => {};
  }
});

afterEach(() => {
  console.log = global.originalConsoleLog;
});

// Test utilities for gRPC and Flight operations
const CoreTestUtils = {
  /**
   * Create a mock gRPC call object
   */
  createMockCall(request = {}) {
    const mockFn = typeof jest !== 'undefined' ? jest.fn() : () => {};
    return {
      request,
      write: mockFn,
      end: mockFn,
      emit: mockFn,
      callback: mockFn
    };
  },

  /**
   * Create a mock flight descriptor
   */
  createMockFlightDescriptor(datasetId = 'test-dataset') {
    return {
      type: 0, // PATH type
      path: [datasetId]
    };
  },

  /**
   * Create a mock dataset for testing
   */
  createMockDataset(id = 'test-dataset') {
    return {
      id,
      schema: {
        fields: [
          { name: 'id', type: { typeId: 6 } }, // Int64
          { name: 'name', type: { typeId: 13 } } // Utf8
        ]
      },
      metadata: {
        name: `${id}.csv`,
        totalRecords: 100,
        totalBytes: 1024,
        type: 'test'
      }
    };
  },

  /**
   * Wait for async operations
   */
  async waitFor(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Make available globally for tests
global.CoreTestUtils = CoreTestUtils; 