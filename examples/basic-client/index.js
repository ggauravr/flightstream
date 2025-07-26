/**
 * @fileoverview Basic Arrow Flight Client Example
 *
 * This example demonstrates how to create a complete Arrow Flight client
 * that connects to a Flight server using the @flightstream/core-client package.
 * This is a reference implementation showing all the key concepts and patterns.
 * 
 * Usage:
 *   node index.js                    # Uses first available dataset
 *   node index.js "dataset-id"      # Uses specified dataset ID
 */

// Import the Arrow Flight client framework
import { FlightClient } from '@flightstream/core-client';



/**
 * Basic Arrow Flight Client
 *
 * This client demonstrates how easy it is to connect to an Arrow Flight server
 * and access data with automatic connection management, retry logic, and
 * efficient streaming.
 */
class BasicFlightClient {
  constructor(options = {}) {
    this.options = {
      host: options.host || process.env.FLIGHT_HOST || 'localhost',
      port: options.port || process.env.FLIGHT_PORT || 8080,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      connectionTimeout: options.connectionTimeout || 5000,
      datasetId: options.datasetId || null, // Optional dataset ID parameter
      ...options
    };

    // Create the Flight client
    this.client = new FlightClient({
      host: this.options.host,
      port: this.options.port,
      retryAttempts: this.options.retryAttempts,
      retryDelay: this.options.retryDelay,
      connectionTimeout: this.options.connectionTimeout,
      logger: console
    });

    // Set up event listeners
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
   * Connect to the Flight server
   */
  async connect() {
    try {
      console.log('🚀 Starting Arrow Flight Client...');
      await this.client.connect();
      return true;
    } catch (error) {
      console.error('❌ Failed to connect:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from the Flight server
   */
  async disconnect() {
    try {
      await this.client.disconnect();
    } catch (error) {
      console.error('❌ Error disconnecting:', error.message);
      throw error;
    }
  }

  /**
   * List available datasets
   */
  async listDatasets() {
    try {
      console.log('📋 Listing available datasets...');
      const datasets = await this.client.listDatasets();
      
      console.log(`✅ Found ${datasets.length} datasets:`);
      datasets.forEach(dataset => {
        console.log(`  • ${dataset.id} (${dataset.totalRecords} rows, ${dataset.totalBytes} bytes)`);
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
    try {
      console.log(`📊 Getting info for dataset: ${datasetId}`);
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
    try {
      console.log(`📐 Getting schema for dataset: ${datasetId}`);
      const schema = await this.client.getSchema(datasetId);
      
      console.log(`✅ Schema for ${datasetId}:`);
      schema.fields.forEach(field => {
        console.log(`   • ${field.name}: ${field.type.toString()}`);
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
    try {
      console.log(`⬇️  Getting dataset: ${datasetId}`);
      const startTime = Date.now();
      
      const table = await this.client.getDataset(datasetId);
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ Retrieved dataset ${datasetId}:`);
      console.log(`   Rows: ${table.numRows}`);
      console.log(`   Columns: ${table.numCols}`);
      console.log(`   Duration: ${duration.toFixed(2)} seconds`);
      
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
    try {
      console.log(`🌊 Streaming dataset: ${datasetId}`);
      const startTime = Date.now();
      
      let totalRows = 0;
      let batchCount = 0;
      let totalBytes = 0;
      
      for await (const batch of this.client.streamDataset(datasetId)) {
        batchCount++;
        totalRows += batch.numRows;
        
        // Estimate bytes for this batch (rough calculation)
        const batchBytes = batch.numRows * batch.numCols * 8; // Rough estimate
        totalBytes += batchBytes;
        
        console.log(`📦 Batch ${batchCount}: ${batch.numRows} rows`);
        
        // Show sample data from first batch
        if (batchCount === 1 && batch.numRows > 0) {
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
      console.log(`   Total bytes: ${totalBytes}`);
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
    try {
      console.log('🎬 Listing available actions...');
      const actions = await this.client.listActions();
      
      console.log(`✅ Found ${actions.length} actions:`);
      actions.forEach(action => {
        console.log(`  • ${action.type}: ${action.description}`);
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
    try {
      console.log(`🎯 Executing action: ${actionType}`);
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
    try {
      console.log('ℹ️  Getting server information...');
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
   * Test connection to server
   */
  async testConnection() {
    try {
      console.log('🔍 Testing connection...');
      const isConnected = await this.client.testConnection();
      
      if (isConnected) {
        console.log('✅ Connection test successful');
      } else {
        console.log('❌ Connection test failed');
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ Connection test error:', error.message);
      return false;
    }
  }

  /**
   * Run a complete demo
   */
  async runDemo() {
    try {
      console.log('🎬 Starting Arrow Flight Client Demo\n');
      
      // Connect to server
      await this.connect();
      
      // Test connection
      await this.testConnection();
      console.log('');
      
      // Get server info
      await this.getServerInfo();
      console.log('');
      
      // List datasets
      const datasets = await this.listDatasets();
      console.log('');
      
      if (datasets.length > 0) {
        let datasetId = this.options.datasetId || datasets[0].id;
        
        // If a specific dataset ID was provided, verify it exists
        if (this.options.datasetId) {
          const datasetExists = datasets.some(dataset => dataset.id === this.options.datasetId);
          if (!datasetExists) {
            console.log(`⚠️  Specified dataset ID '${this.options.datasetId}' not found. Available datasets:`);
            datasets.forEach(dataset => {
              console.log(`   • ${dataset.id}`);
            });
            console.log(`📋 Using first available dataset: ${datasets[0].id}`);
            datasetId = datasets[0].id;
          } else {
            console.log(`✅ Using specified dataset: ${datasetId}`);
          }
        } else {
          console.log(`📋 Using first available dataset: ${datasetId}`);
        }
        
        // Get dataset info
        await this.getDatasetInfo(datasetId);
        console.log('');
        
        // Get schema
        await this.getSchema(datasetId);
        console.log('');
        
        // Stream dataset (for large datasets)
        await this.streamDataset(datasetId);
        console.log('');
      }
      
      // List actions
      await this.listActions();
      console.log('');
      
      console.log('🎉 Demo completed successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Main execution
async function main() {
  // Example: You can specify a dataset ID as a command line argument
  const datasetId = process.argv[2]; // e.g., node index.js "my-dataset-id"
  
  console.log('Running basic flight client for dataset:', datasetId);
  const client = new BasicFlightClient({
    datasetId: datasetId
  });

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
    await client.runDemo();
  } catch (error) {
    console.error('Failed to run demo:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BasicFlightClient };
export default BasicFlightClient; 