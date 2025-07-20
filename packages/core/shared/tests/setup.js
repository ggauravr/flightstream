/**
 * Test setup for core-shared package
 */

// Global test utilities
global.TestUtils = {
  /**
   * Create a test schema
   */
  createTestSchema() {
    return {
      id: 'integer',
      name: 'string',
      active: 'boolean',
      score: 'float',
      created_at: 'date'
    };
  },

  /**
   * Create test data
   */
  createTestData(count = 5) {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        id: i + 1,
        name: `User${i + 1}`,
        active: i % 2 === 0,
        score: 80 + (i * 2.5),
        created_at: new Date(2023, 0, i + 1)
      });
    }
    return data;
  },

  /**
   * Create column data for testing
   */
  createColumnData() {
    return {
      id: [1, 2, 3, 4, 5],
      name: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
      active: [true, false, true, false, true],
      score: [95.5, 87.2, 92.8, 78.9, 88.1],
      created_at: [
        new Date('2023-01-01'),
        new Date('2023-01-02'),
        new Date('2023-01-03'),
        new Date('2023-01-04'),
        new Date('2023-01-05')
      ]
    };
  }
}; 