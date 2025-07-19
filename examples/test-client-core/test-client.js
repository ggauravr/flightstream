/**
 * @fileoverview Arrow Flight Test Client using @flightstream/core-client
 *
 * This test client demonstrates how to use the @flightstream/core-client package
 * to connect to Arrow Flight servers and perform various operations. It provides
 * the same functionality as the raw gRPC test client but with a much simpler API.
 */

import { FlightClient } from '@flightstream/core-client';

/**
 * Arrow Flight Test Client using Core Client Package
 *
 * This client demonstrates how easy it is to use the @flightstream/core-client
 * package to connect to Arrow Flight servers. It provides the same functionality
 * as the raw gRPC test client but with automatic connection management,
 * retry logic, and error handling.
 */
class FlightTestClient {
  constructor(options = {}) {
    this.options = {
      host: options.host || process.env.FLIGHT_HOST || 'localhost',
      port: options.port || process.env.FLIGHT_PORT || 8080,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      connectionTimeout: options.connectionTimeout || 5000,
      ...options
    };

    // Create the Flight client using the core-client package
    this.client = new FlightClient({
      host: this.options.host,
      port: this.options.port,
      retryAttempts: this.options.retryAttempts,
      retryDelay: this.options.retryDelay,
      connectionTimeout: this.options.connectionTimeout,
      logger: console
    });

    // Set up event listeners for connection state
    this._setupEventListeners();
  }

  /**
   * Set up event listeners for connection state changes
   * @private
   */
  _setupEventListeners() {
    this.client.on('connecting', () => {
      console.log('🔌 Connecting to Arrow Flight server...');
    });

    this.client.on('connected', () => {
      console.log('✅ Connected to Arrow Flight server');
    });

    this.client.on('disconnecting', () => {
      console.log('🛑 Disconnecting from Arrow Flight server...');
    });

    this.client.on('disconnected', () => {
      console.log('✅ Disconnected from Arrow Flight server');
    });

    this.client.on('connectionError', (error) => {
      console.error('❌ Connection error:', error.message);
    });
  }

  /**
   * Test connection to the server
   */
  async testConnection() {
    console.log('🔍 Testing connection...');
    
    try {
      const isConnected = await this.client.testConnection();
      
      if (isConnected) {
        console.log('✅ Connection test successful');
        return true;
      } else {
        console.log('❌ Connection test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Connection test error:', error.message);
      return false;
    }
  }

  /**
   * List available datasets
   */
  async listDatasets() {
    console.log('🔍 Listing available datasets...');

    try {
      const datasets = await this.client.listDatasets();
      
      console.log(`✅ Found ${datasets.length} datasets:`);
      datasets.forEach(dataset => {
        console.log(`   • ${dataset.id} (${dataset.totalRecords} rows, ${dataset.totalBytes} bytes)`);
      });
      
      return datasets;
    } catch (error) {
      console.error('❌ Error listing datasets:', error.message);
      throw error;
    }
  }

  /**
   * Get dataset information
   * @param {string} datasetId - The dataset identifier
   */
  async getDatasetInfo(datasetId) {
    console.log(`📋 Getting dataset info for: ${datasetId}`);

    try {
      const info = await this.client.getDatasetInfo(datasetId);
      
      console.log(`✅ Dataset info for ${datasetId}:`);
      console.log(`   Total records: ${info.totalRecords}`);
      console.log(`   Total bytes: ${info.totalBytes}`);
      
      return info;
    } catch (error) {
      console.error(`❌ Error getting dataset info for ${datasetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get dataset schema
   * @param {string} datasetId - The dataset identifier
   */
  async getSchema(datasetId) {
    console.log(`📐 Getting schema for: ${datasetId}`);

    try {
      const schema = await this.client.getSchema(datasetId);
      
      console.log(`✅ Schema retrieved for ${datasetId}:`);
      console.log('   Fields:');
      schema.fields.forEach(field => {
        console.log(`     - ${field.name}: ${field.type.toString()}`);
      });
      
      return schema;
    } catch (error) {
      console.error(`❌ Error getting schema for ${datasetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get dataset as Arrow table
   * @param {string} datasetId - The dataset identifier
   */
  async getDataset(datasetId) {
    console.log(`⬇️  Getting dataset: ${datasetId}`);

    try {
      const startTime = Date.now();
      const table = await this.client.getDataset(datasetId);
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`✅ Retrieved dataset ${datasetId}:`);
      console.log(`   Rows: ${table.numRows}`);
      console.log(`   Columns: ${table.numCols}`);
      console.log(`   Duration: ${duration.toFixed(2)} seconds`);

      // Show sample data
      if (table.numRows > 0) {
        console.log('📄 Sample data:');
        const sampleRows = Math.min(3, table.numRows);
        for (let i = 0; i < sampleRows; i++) {
          const row = {};
          table.schema.fields.forEach((field, colIndex) => {
            const column = table.getChildAt(colIndex);
            row[field.name] = column.get(i);
          });
          console.log(`   Row ${i + 1}:`, row);
        }
        if (table.numRows > 3) {
          console.log(`   ... and ${table.numRows - 3} more rows`);
        }
      }

      return table;
    } catch (error) {
      console.error(`❌ Error getting dataset ${datasetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Stream dataset as record batches
   * @param {string} datasetId - The dataset identifier
   */
  async streamDataset(datasetId) {
    console.log(`🌊 Streaming dataset: ${datasetId}`);

    try {
      const startTime = Date.now();
      let totalRows = 0;
      let batchCount = 0;
      
      for await (const batch of this.client.streamDataset(datasetId)) {
        batchCount++;
        totalRows += batch.numRows;
        
        console.log(`📦 Batch ${batchCount}: ${batch.numRows} rows`);
        
        // Show sample data from first batch
        if (batchCount === 1 && batch.numRows > 0) {
          console.log('📄 Sample data from first batch:');
          const sampleRows = Math.min(3, batch.numRows);
          for (let i = 0; i < sampleRows; i++) {
            const row = {};
            batch.schema.fields.forEach((field, colIndex) => {
              const column = batch.getChildAt(colIndex);
              row[field.name] = column.get(i);
            });
            console.log(`   Row ${i + 1}:`, row);
          }
          if (batch.numRows > 3) {
            console.log(`   ... and ${batch.numRows - 3} more rows`);
          }
        }
      }
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ Streamed dataset ${datasetId}:`);
      console.log(`   Total batches: ${batchCount}`);
      console.log(`   Total rows: ${totalRows}`);
      console.log(`   Duration: ${duration.toFixed(2)} seconds`);
      
    } catch (error) {
      console.error(`❌ Error streaming dataset ${datasetId}:`, error.message);
      throw error;
    }
  }

  /**
   * List available actions
   */
  async listActions() {
    console.log('📋 Listing available actions...');

    try {
      const actions = await this.client.listActions();
      
      console.log(`✅ Found ${actions.length} actions:`);
      actions.forEach(action => {
        console.log(`   • ${action.type}: ${action.description}`);
      });
      
      return actions;
    } catch (error) {
      console.error('❌ Error listing actions:', error.message);
      throw error;
    }
  }

  /**
   * Execute a custom action
   * @param {string} actionType - The action type
   * @param {Object} actionBody - The action body
   */
  async doAction(actionType, actionBody = {}) {
    console.log(`🎬 Executing action: ${actionType}`);

    try {
      const results = await this.client.doAction(actionType, actionBody);
      
      console.log(`✅ Action ${actionType} completed:`);
      results.forEach((result, index) => {
        console.log(`   Result ${index + 1}:`, result);
      });
      
      return results;
    } catch (error) {
      console.error(`❌ Error executing action ${actionType}:`, error.message);
      throw error;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo() {
    console.log('ℹ️  Getting server information...');

    try {
      const info = await this.client.getServerInfo();
      
      console.log('✅ Server information:');
      console.log(`   Connection: ${info.connection.isConnected ? 'Connected' : 'Disconnected'}`);
      console.log(`   Datasets: ${info.datasets.count}`);
      console.log(`   Actions: ${info.actions.count}`);
      
      return info;
    } catch (error) {
      console.error('❌ Error getting server info:', error.message);
      throw error;
    }
  }

  /**
   * Run performance benchmark
   * @param {string} datasetId - The dataset identifier
   */
  async benchmark(datasetId) {
    console.log(`⚡ Running performance benchmark for: ${datasetId}`);

    try {
      // Test table retrieval
      console.log('\n📊 Testing table retrieval...');
      const tableStart = Date.now();
      const table = await this.client.getDataset(datasetId);
      const tableDuration = (Date.now() - tableStart) / 1000;
      
      console.log(`   Table retrieval: ${tableDuration.toFixed(2)}s (${table.numRows} rows)`);

      // Test streaming
      console.log('\n🌊 Testing streaming...');
      const streamStart = Date.now();
      let streamRows = 0;
      let streamBatches = 0;
      
      for await (const batch of this.client.streamDataset(datasetId)) {
        streamBatches++;
        streamRows += batch.numRows;
      }
      
      const streamDuration = (Date.now() - streamStart) / 1000;
      console.log(`   Streaming: ${streamDuration.toFixed(2)}s (${streamRows} rows, ${streamBatches} batches)`);

      // Calculate throughput
      const tableThroughput = table.numRows / tableDuration;
      const streamThroughput = streamRows / streamDuration;
      
      console.log('\n📈 Performance Summary:');
      console.log(`   Table throughput: ${tableThroughput.toFixed(0)} rows/sec`);
      console.log(`   Stream throughput: ${streamThroughput.toFixed(0)} rows/sec`);
      console.log(`   Speed difference: ${((streamThroughput / tableThroughput) * 100 - 100).toFixed(1)}%`);

    } catch (error) {
      console.error(`❌ Error running benchmark for ${datasetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect() {
    try {
      await this.client.disconnect();
      console.log('🔌 Client disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting:', error.message);
      throw error;
    }
  }

  /**
   * Run a complete test suite
   */
  async runTestSuite() {
    console.log('🧪 Starting Arrow Flight Test Suite\n');

    try {
      // Test connection
      console.log('='.repeat(50));
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.log('❌ Cannot proceed without connection');
        return;
      }

      // Get server info
      console.log('\n' + '='.repeat(50));
      await this.getServerInfo();

      // List datasets
      console.log('\n' + '='.repeat(50));
      const datasets = await this.listDatasets();

      if (datasets.length === 0) {
        console.log('⚠️  No datasets found. Make sure CSV files are in the data directory.');
        return;
      }

      // Test with first dataset
      const datasetId = datasets[0].id;

      // Get dataset info
      console.log('\n' + '='.repeat(50));
      await this.getDatasetInfo(datasetId);

      // Get schema
      console.log('\n' + '='.repeat(50));
      await this.getSchema(datasetId);

      // Test table retrieval
      console.log('\n' + '='.repeat(50));
      await this.getDataset(datasetId);

      // Test streaming
      console.log('\n' + '='.repeat(50));
      await this.streamDataset(datasetId);

      // Run benchmark
      console.log('\n' + '='.repeat(50));
      await this.benchmark(datasetId);

      // List actions
      console.log('\n' + '='.repeat(50));
      await this.listActions();

      console.log('\n🎉 Test suite completed successfully!');

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Demo function
async function demo() {
  console.log('🚀 Arrow Flight Test Client Demo (using @flightstream/core-client)\n');

  const client = new FlightTestClient();

  // Graceful shutdown handling
  const gracefulShutdown = async (signal) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    try {
      await client.disconnect();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  try {
    await client.runTestSuite();
  } catch (error) {
    console.error('💥 Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
demo().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 