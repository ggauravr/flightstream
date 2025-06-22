/**
 * Jest setup for @flightstream/utils package
 */

// Set test timeout for Arrow operations
jest.setTimeout(30000);

// Mock console.warn to avoid noise in tests unless explicitly testing warnings
global.originalConsoleWarn = console.warn;
beforeEach(() => {
  console.warn = jest.fn();
});

afterEach(() => {
  console.warn = global.originalConsoleWarn;
});

// Test utilities for Arrow operations
const TestUtils = {
  /**
   * Create a test schema for Arrow operations
   */
  createTestSchema() {
    return {
      fields: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'active', type: 'boolean' },
        { name: 'score', type: 'float' },
        { name: 'created_at', type: 'date' }
      ]
    };
  },

  /**
   * Create test data matching the test schema
   */
  createTestData(count = 10) {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Test Item ${i + 1}`,
      active: i % 2 === 0,
      score: (Math.random() * 100).toFixed(2),
      created_at: new Date(Date.now() - i * 86400000).toISOString()
    }));
  },

  /**
   * Create test CSV data as arrays
   */
  createTestCSVData(count = 10) {
    const headers = ['id', 'name', 'active', 'score', 'created_at'];
    const rows = Array.from({ length: count }, (_, i) => [
      String(i + 1),
      `Test Item ${i + 1}`,
      i % 2 === 0 ? 'true' : 'false',
      (Math.random() * 100).toFixed(2),
      new Date(Date.now() - i * 86400000).toISOString()
    ]);
    return { headers, rows };
  }
};

// Make available globally for tests
global.TestUtils = TestUtils; 