/**
 * Logger Context for Flight Server Package
 *
 * Provides a centralized logger that can be set once and used throughout
 * the entire package. Defaults to console if no logger is provided.
 */

let packageLogger = console;

/**
 * Set the logger for the entire package
 * @param {Object} logger - Logger instance with debug, info, warn, error methods
 */
export function setLogger(logger) {
  packageLogger = logger;
}

/**
 * Get the current package logger
 * @returns {Object} Current logger instance
 */
export function getLogger() {
  return packageLogger;
}
