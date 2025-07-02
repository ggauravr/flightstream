/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import path from 'path';
import fs from 'fs';

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
        console.warn(`Data directory ${dataDir} does not exist - no CSV datasets will be loaded`);
        return;
      }

      // Check if data directory is actually a directory
      const stats = fs.statSync(dataDir);
      if (!stats.isDirectory()) {
        console.warn(`Data directory ${dataDir} is not a directory`);
        return;
      }

      const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.csv'));

      if (files.length === 0) {
        console.log(`No CSV files found in data directory: ${dataDir}`);
        return;
      }

      console.log(`Found ${files.length} CSV file(s) in ${dataDir}`);

      for (const file of files) {
        const filePath = path.join(dataDir, file);
        const datasetId = path.basename(file, '.csv');

        try {
          // Check if file exists before processing
          if (!fs.existsSync(filePath)) {
            console.warn(`CSV file not found: ${filePath}`);
            continue;
          }

          // Check if file is actually a file
          const fileStats = fs.statSync(filePath);
          if (!fileStats.isFile()) {
            console.warn(`CSV path is not a file: ${filePath}`);
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

          console.log(`Registered CSV dataset: ${datasetId} (${file})`);
        } catch (error) {
          console.warn(`Failed to register CSV dataset ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error initializing CSV datasets:', error);
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
    console.log(`Streaming CSV dataset: ${dataset.id}`);

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
        console.log(`CSV Schema inferred for ${dataset.id}:`, csvSchema);
        arrowBuilder = new CSVArrowBuilder(csvSchema);
      });

      // Handle data batches
      streamer.on('batch', (csvBatch) => {
        try {
          if (!arrowBuilder) {
            console.warn('Arrow builder not ready, skipping batch');
            return;
          }

          // Convert CSV batch to Arrow record batch
          const recordBatch = arrowBuilder.createRecordBatch(csvBatch);
          if (!recordBatch) {
            console.warn('Failed to create record batch');
            return;
          }

          // Serialize record batch for Flight protocol
          const serializedBatch = arrowBuilder.serializeRecordBatch(recordBatch);
          if (!serializedBatch) {
            console.warn('Failed to serialize record batch');
            return;
          }

          // Send Flight data message
          call.write({
            flight_descriptor: {
              type: 1, // PATH type
              path: [dataset.id]
            },
            data_header: serializedBatch.slice(0, 4), // IPC header
            data_body: serializedBatch.slice(4) // IPC body
          });

          totalBatches++;
          totalRows += csvBatch.length;

          console.log(`Sent batch ${totalBatches} with ${csvBatch.length} rows (total: ${totalRows})`);

        } catch (error) {
          console.error('Error processing batch:', error);
        }
      });

      // Handle streaming errors
      streamer.on('error', (error) => {
        console.error('CSV streaming error:', error);
        call.emit('error', error);
      });

      // Handle row-level errors (non-fatal)
      streamer.on('row-error', ({ row: _row, error }) => {
        console.warn(`Row error in ${dataset.id}:`, error);
      });

      // Handle streaming completion
      streamer.on('end', (stats) => {
        console.log(`CSV streaming completed for ${dataset.id}:`, {
          totalBatches,
          totalRows: stats.totalRows,
          processingTime: Date.now() - startTime
        });
        call.end();
      });

      // Start streaming
      const startTime = Date.now();
      await streamer.start();

    } catch (error) {
      console.error(`Error streaming CSV dataset ${dataset.id}:`, error);
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
