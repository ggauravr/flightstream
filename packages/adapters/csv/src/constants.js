/**
 * CSV Adapter Constants
 *
 * This module provides constants specific to the CSV adapter,
 * including default values and environment variable names.
 */

/**
 * Default CSV configuration values
 */
export const DEFAULT_CSV_CONFIG = {
  dataDirectory: './data',
  batchSize: 10000,
  delimiter: ',',
  headers: true,
  skipEmptyLines: true,
};

/**
 * CSV-specific environment variable names
 */
export const CSV_ENV_VARS = {
  DATA_DIRECTORY: 'DATA_DIRECTORY',
  CSV_BATCH_SIZE: 'CSV_BATCH_SIZE',
  CSV_DELIMITER: 'CSV_DELIMITER',
  CSV_HEADERS: 'CSV_HEADERS',
}; 