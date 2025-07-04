/**
 * @fileoverview FlightStream Type System
 *
 * This module provides a modular type system for FlightStream with clear
 * separation of concerns between type detection, transformation, and registry.
 */

// Import all classes first
import { TypeDetector } from './type-detector.js';
import { TypeTransformer } from './type-transformer.js';
import { TypeRegistry } from './type-registry.js';

// Export the main classes
export { TypeDetector } from './type-detector.js';
export { TypeTransformer } from './type-transformer.js';
export { TypeRegistry } from './type-registry.js';

// Create and export a default registry instance
export const defaultRegistry = new TypeRegistry();

// Export convenience functions that use the default registry
export const inferType = (value, options) => {
  const detector = new TypeDetector();
  return detector.inferType(value, options);
};

export const mapToArrowType = (type) => {
  return defaultRegistry.mapToArrowType(type);
};

export const isValidArrowType = (type) => {
  return defaultRegistry.isValidArrowType(type);
};

export const getTypeTransformer = (arrowType) => {
  return defaultRegistry.getTypeTransformer(arrowType);
};

// Export individual transformer methods for convenience
const transformer = new TypeTransformer();

export const safeParseInt = (value) => transformer.safeParseInt(value);
export const safeParseFloat = (value) => transformer.safeParseFloat(value);
export const safeParseDateMillis = (value) => transformer.safeParseDateMillis(value);
export const safeParseDateDays = (value) => transformer.safeParseDateDays(value);
export const safeParseTimestamp = (value, unitMultiplier) => transformer.safeParseTimestamp(value, unitMultiplier);
export const safeParseTime = (value, unitMultiplier) => transformer.safeParseTime(value, unitMultiplier);
export const safeParseBinary = (value) => transformer.safeParseBinary(value);
export const safeParseDecimal = (value, arrowType) => transformer.safeParseDecimal(value, arrowType);
export const safeParseList = (value) => transformer.safeParseList(value);
export const safeParseStruct = (value) => transformer.safeParseStruct(value);
export const safeParseMap = (value) => transformer.safeParseMap(value);
export const safeParseInterval = (value) => transformer.safeParseInterval(value);
export const safeParseDuration = (value, unitMultiplier) => transformer.safeParseDuration(value, unitMultiplier);
export const parseDurationString = (durationStr) => transformer.parseDurationString(durationStr);
