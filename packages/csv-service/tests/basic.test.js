/**
 * Basic test to verify csv-service test setup
 */

describe('CSV Service Test Setup', () => {
  it('should be able to run tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support async tests', async () => {
    const result = await Promise.resolve('csv-service-test');
    expect(result).toBe('csv-service-test');
  });

  it('should have access to test utilities', () => {
    expect(jest).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(beforeEach).toBeDefined();
    expect(afterEach).toBeDefined();
  });
}); 