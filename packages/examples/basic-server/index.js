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

/**
 * @fileoverview Basic Arrow Flight CSV Server Example
 * 
 * This example demonstrates how to create a complete Arrow Flight server
 * that serves CSV files using the @arrow-flight packages. This is a reference
 * implementation showing all the key concepts and patterns.
 */

// Import the Arrow Flight server framework
import { FlightServer } from '@ggauravr/arrow-flight-server-node-core/flight-server';

// Import the CSV adapter
import { CSVFlightService } from '@ggauravr/arrow-flight-server-node-csv-adapter';

/**
 * Basic Arrow Flight CSV Server
 * 
 * This server automatically discovers CSV files in the data directory
 * and makes them available via the Arrow Flight protocol with automatic
 * schema inference and efficient streaming.
 */
class BasicCSVServer {
  constructor(options = {}) {
    this.options = {
      host: options.host || process.env.FLIGHT_HOST || 'localhost',
      port: options.port || process.env.FLIGHT_PORT || 8080,
      dataDirectory: options.dataDirectory || process.env.DATA_DIRECTORY || './data',
      ...options
    };
    
    // Create the generic Flight server
    this.flightServer = new FlightServer({
      host: this.options.host,
      port: this.options.port,
      maxReceiveMessageLength: 100 * 1024 * 1024, // 100MB
      maxSendMessageLength: 100 * 1024 * 1024,    // 100MB
    });
    
    // Create the CSV adapter service
    this.csvService = new CSVFlightService({
      dataDirectory: this.options.dataDirectory,
      batchSize: parseInt(process.env.CSV_BATCH_SIZE) || 10000,
      delimiter: process.env.CSV_DELIMITER || ',',
      headers: process.env.CSV_HEADERS !== 'false',
    });
  }
  
  async start() {
    try {
      console.log('🚀 Starting Arrow Flight CSV Server...');
      console.log(`📁 Data directory: ${this.options.dataDirectory}`);
      
      // Initialize the CSV service (discover datasets)
      await this.csvService.initialize();
      
      // Register the CSV service with the Flight server
      this.flightServer.setFlightService(this.csvService);
      
      // Start the server
      const port = await this.flightServer.start();
      
      console.log(`✅ Server started successfully!`);
      console.log(`🌐 Arrow Flight Server listening on ${this.options.host}:${port}`);
      
      // Display available datasets
      const datasetIds = this.csvService.getDatasets();
      console.log(`📊 Available datasets: ${datasetIds.length}`);
      if (datasetIds.length > 0) {
        console.log('\n📋 Available datasets:');
        datasetIds.forEach(datasetId => {
          console.log(`  • ${datasetId}`);
        });
      } else {
        console.log(`\n⚠️  No CSV files found in ${this.options.dataDirectory}`);
        console.log('   Add some .csv files to start serving data!');
      }
      
      console.log('\n🔗 Test with:');
      console.log(`   npm run test`);
      console.log('   or connect with any Arrow Flight client\n');
      
      return port;
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }
  
  async stop() {
    try {
      console.log('🛑 Stopping server...');
      await this.flightServer.stop();
      console.log('✅ Server stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping server:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const server = new BasicCSVServer();
  
  // Graceful shutdown handling
  const gracefulShutdown = async (signal) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    try {
      await server.stop();
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
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BasicCSVServer };
export default BasicCSVServer; 