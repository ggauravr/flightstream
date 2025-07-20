/**
 * Basic tests for core-shared package
 */

import { ArrowBuilder } from '../src/arrow-builder.js';

describe('core-shared', () => {
  describe('ArrowBuilder', () => {
    it('should be available for import', () => {
      expect(ArrowBuilder).toBeDefined();
      expect(typeof ArrowBuilder).toBe('function');
    });

    it('should be an abstract class', () => {
      expect(() => {
        new ArrowBuilder({});
      }).toThrow('ArrowBuilder is abstract and cannot be instantiated directly');
    });
  });
}); 