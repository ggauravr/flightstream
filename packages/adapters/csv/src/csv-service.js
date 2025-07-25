import path from 'path';
import fs from 'fs';
import * as arrow from 'apache-arrow';

// Import base service and utilities
import { FlightServiceBase } from '@flightstream/core-server';
import { CSVStreamer } from './csv-streamer.js';
import { CSVArrowBuilder } from './csv-arrow-builder.js';

/**
 * CSV Service for Arrow Flight Server
 *
 * This adapter extends FlightServiceBase to provide CSV file support.
 * It scans a directory for CSV files, infers their schemas, and streams
 * them as Arrow data via the Flight protocol.
 *
 * Features:
 * 1. Automatic CSV file discovery
 * 2. Schema inference from CSV headers and data
 * 3. Streaming CSV data as Arrow record batches
 * 4. Configurable batch sizes and CSV parsing options
 * 5. Error handling for malformed CSV data
 */
export class CSVFlightService extends FlightServiceBase {
  constructor(options = {}) {
    super(options);

    this.csvOptions = {
      dataDirectory: options.dataDirectory || './data',
      batchSize: options.batchSize || 10000,
      delimiter: options.delimiter || ',',
      headers: options.headers !== false, // default true
      skipEmptyLines: options.skipEmptyLines !== false, // default true
      ...(options.csv || {})
    };

    // Logger - accept from options or default to console
    this.logger = options.logger || console;
  }

  /**
   * Initialize the CSV service and discover datasets
   */
  async _initialize() {
    await this._initializeDatasets();
    this._initialized = true;
  }

  /**
   * Public initialize method that waits for initialization to complete
   * This can be called to ensure the service is fully initialized
   */
  async initialize() {
    // Wait for initialization to complete if not already done
    if (!this._initialized) {
      await new Promise((resolve) => {
        const checkInitialized = () => {
          if (this._initialized) {
            resolve();
          } else {
            setTimeout(checkInitialized, 10);
          }
        };
        checkInitialized();
      });
    }
  }

  /**
   * Discover and register CSV datasets from the data directory
   */
  async _initializeDatasets() {
    try {
      const dataDir = this.csvOptions.dataDirectory;

      // Check if data directory exists
      if (!fs.existsSync(dataDir)) {
        this.logger.warn({
          data_directory: dataDir
        }, 'Data directory does not exist - no CSV datasets will be loaded');
        return;
      }

      // Check if data directory is actually a directory
      const stats = fs.statSync(dataDir);
      if (!stats.isDirectory()) {
        this.logger.warn({
          data_directory: dataDir
        }, 'Data directory is not a directory');
        return;
      }

      const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.csv'));

      if (files.length === 0) {
        this.logger.info({
          data_directory: dataDir
        }, 'No CSV files found in data directory');
        return;
      }

      this.logger.info({
        data_directory: dataDir,
        file_count: files.length
      }, 'Found CSV files in data directory');

      for (const file of files) {
        const filePath = path.join(dataDir, file);
        const datasetId = path.basename(file, '.csv');

        try {
          // Check if file exists before processing
          if (!fs.existsSync(filePath)) {
            this.logger.warn({
              file_path: filePath
            }, 'CSV file not found');
            continue;
          }

          // Check if file is actually a file
          const fileStats = fs.statSync(filePath);
          if (!fileStats.isFile()) {
            this.logger.warn({
              file_path: filePath
            }, 'CSV path is not a file');
            continue;
          }

          // Infer schema from CSV file
          const schema = await this._inferSchemaForDataset(filePath);

          // Register dataset
          this.datasets.set(datasetId, {
            id: datasetId,
            filePath: filePath,
            schema: schema,
            metadata: {
              name: file,
              totalRecords: -1, // Unknown until full scan
              totalBytes: fileStats.size,
              created: fileStats.birthtime,
              type: 'csv'
            }
          });

          this.logger.info({
            dataset_id: datasetId,
            file_name: file,
            file_path: filePath,
            file_size: fileStats.size
          }, 'Registered CSV dataset');
        } catch (error) {
          this.logger.warn({
            file_name: file,
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            }
          }, 'Failed to register CSV dataset');
        }
      }
    } catch (error) {
      this.logger.error({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'Error initializing CSV datasets');
    }
  }

  /**
   * Infer Arrow schema from CSV file
   * @param {string} filePath - Path to CSV file (or dataset ID if called from base)
   * @returns {Promise<Object>} Arrow schema
   */
  async _inferSchemaForDataset(filePath) {
    // If filePath is actually a dataset ID, resolve to file path
    if (this.datasets.has(filePath)) {
      const dataset = this.datasets.get(filePath);
      filePath = dataset.filePath;
    }

    return new Promise((resolve, reject) => {
      // Create a streamer that reads just 1 batch for schema inference
      const streamer = new CSVStreamer(filePath, {
        batchSize: 1,
        delimiter: this.csvOptions.delimiter,
        headers: this.csvOptions.headers,
        skipEmptyLines: this.csvOptions.skipEmptyLines
      });

      // When schema is inferred from CSV headers and first rows
      streamer.on('schema', (csvSchema) => {
        streamer.stop();

        // Convert CSV schema to Arrow schema using CSVArrowBuilder
        const arrowBuilder = new CSVArrowBuilder(csvSchema);
        const arrowSchema = arrowBuilder.getSchema();

        resolve(arrowSchema);
      });

      streamer.on('error', (error) => {
        reject(error);
      });

      streamer.start().catch(reject);
    });
  }

  /**
   * Stream CSV dataset as Arrow record batches
   * @param {Object} call - gRPC call object
   * @param {Object} dataset - Dataset metadata
   */
  async _streamDataset(call, dataset) {
    this.logger.info({
      dataset_id: dataset.id,
      file_path: dataset.filePath,
      batch_size: this.csvOptions.batchSize
    }, 'Streaming CSV dataset');

    try {
      // Create CSV streamer with configured options
      const streamer = new CSVStreamer(dataset.filePath, {
        batchSize: this.csvOptions.batchSize,
        delimiter: this.csvOptions.delimiter,
        headers: this.csvOptions.headers,
        skipEmptyLines: this.csvOptions.skipEmptyLines
      });

      // Create Arrow builder for this dataset
      let arrowBuilder = null;
      let totalBatches = 0;
      let totalRows = 0;

      // Handle schema inference
      streamer.on('schema', (csvSchema) => {
        this.logger.debug({
          dataset_id: dataset.id,
          csv_schema: csvSchema
        }, 'CSV Schema inferred');
        arrowBuilder = new CSVArrowBuilder(csvSchema);
      });

      // Handle data batches
      streamer.on('batch', (csvBatch) => {
        try {
          if (!arrowBuilder) {
            this.logger.warn({
              dataset_id: dataset.id
            }, 'Arrow builder not ready, skipping batch');
            return;
          }

          const typedArrays = arrowBuilder.createTypedArraysFromStringBatch(csvBatch);

          if (!typedArrays) {
            this.logger.warn({
              dataset_id: dataset.id
            }, 'Failed to create typed arrays');
            return;
          }

          // Create table from typed arrays (most efficient for streaming)
          const table = arrow.tableFromArrays(typedArrays);
          
          // Serialize table to IPC format
          const serializedBatch = arrow.tableToIPC(table);
          if (!serializedBatch) {
            this.logger.warn({
              dataset_id: dataset.id
            }, 'Failed to serialize table');
            return;
          }

          // Send Flight data message
          call.write({
            flight_descriptor: {
              type: 1, // PATH type
              path: [dataset.id]
            },
            // data_header: recordBatch.schema, // IPC header
            data_body: serializedBatch // IPC body
          });

          totalBatches++;
          totalRows += csvBatch.length;

          this.logger.debug({
            dataset_id: dataset.id,
            batch_number: totalBatches,
            batch_rows: csvBatch.length,
            total_rows: totalRows
          }, 'Sent batch');

        } catch (error) {
          this.logger.error({
            dataset_id: dataset.id,
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            }
          }, 'Error processing batch');
        }
      });

      // Handle streaming errors
      streamer.on('error', (error) => {
        this.logger.error({
          dataset_id: dataset.id,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        }, 'CSV streaming error');
        call.emit('error', error);
      });

      // Handle row-level errors (non-fatal)
      streamer.on('row-error', ({ row: _row, error }) => {
        this.logger.warn({
          dataset_id: dataset.id,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        }, 'Row error in CSV dataset');
      });

      // Handle streaming completion
      streamer.on('end', (stats) => {
        this.logger.info({
          dataset_id: dataset.id,
          streaming_stats: {
            total_batches: totalBatches,
            total_rows: stats.totalRows,
            processing_time: Date.now() - startTime
          }
        }, 'CSV streaming completed');
        call.end();
      });

      // Start streaming
      const startTime = Date.now();
      await streamer.start();

    } catch (error) {
      this.logger.error({
        dataset_id: dataset.id,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }, 'Error streaming CSV dataset');
      call.emit('error', error);
    }
  }

  /**
   * Get CSV-specific statistics
   * @returns {Object} CSV service statistics
   */
  getCSVStats() {
    const stats = {
      totalDatasets: this.datasets.size,
      dataDirectory: this.csvOptions.dataDirectory,
      batchSize: this.csvOptions.batchSize,
      delimiter: this.csvOptions.delimiter,
      datasets: []
    };

    for (const [id, dataset] of this.datasets) {
      stats.datasets.push({
        id,
        name: dataset.metadata.name,
        size: dataset.metadata.totalBytes,
        created: dataset.metadata.created,
        schema: dataset.schema ? dataset.schema.fields.map(f => ({
          name: f.name,
          type: f.type.toString()
        })) : null
      });
    }

    return stats;
  }
}

export default CSVFlightService;
