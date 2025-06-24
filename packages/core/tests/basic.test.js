/**
 * Basic test to verify core test setup
 */

describe('Core Test Setup', () => {
  it('should be able to run tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support async tests', async () => {
    const result = await Promise.resolve('core-test');
    expect(result).toBe('core-test');
  });

  it('should have access to test utilities', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof beforeEach).toBe('function');
    expect(typeof afterEach).toBe('function');
    expect(global.CoreTestUtils).toBeDefined();
  });
}); 