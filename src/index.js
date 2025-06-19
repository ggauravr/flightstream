import path from 'path';
import { fileURLToPath } from 'url';

// Import the new modular components
import { FlightServer, CSVFlightService } from '../arrow-flight-server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  server: {
    host: process.env.FLIGHT_HOST || 'localhost',
    port: parseInt(process.env.FLIGHT_PORT) || 8080,
    maxConcurrentStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS) || 100,
    maxReceiveMessageLength: parseInt(process.env.MAX_RECEIVE_MESSAGE_LENGTH) || 100 * 1024 * 1024, // 100MB
    maxSendMessageLength: parseInt(process.env.MAX_SEND_MESSAGE_LENGTH) || 100 * 1024 * 1024, // 100MB,
    protoPath: path.join(__dirname, '../arrow-flight-server/proto/flight.proto')
  },
  data: {
    directory: process.env.DATA_DIRECTORY || path.join(__dirname, '../data')
  },
  csv: {
    batchSize: parseInt(process.env.CSV_BATCH_SIZE) || 10000,
    delimiter: process.env.CSV_DELIMITER || ',',
    headers: process.env.CSV_HEADERS !== 'false', // default true
    skipEmptyLines: process.env.CSV_SKIP_EMPTY_LINES !== 'false' // default true
  },
  arrow: {
    recordBatchSize: parseInt(process.env.ARROW_RECORD_BATCH_SIZE) || 65536,
    compressionType: process.env.ARROW_COMPRESSION_TYPE || 'UNCOMPRESSED'
  }
};

async function main() {
  console.log('🏗️  Initializing Arrow Flight Server...');
  console.log('⚙️  Configuration:');
  console.log(`   Server: ${config.server.host}:${config.server.port}`);
  console.log(`   Data Directory: ${config.data.directory}`);
  console.log(`   CSV Batch Size: ${config.csv.batchSize}`);
  console.log(`   Arrow Record Batch Size: ${config.arrow.recordBatchSize}`);
  
  // Create generic Flight server
  const server = new FlightServer({
    host: config.server.host,
    port: config.server.port,
    maxReceiveMessageLength: config.server.maxReceiveMessageLength,
    maxSendMessageLength: config.server.maxSendMessageLength,
    protoPath: config.server.protoPath
  });

  // Create CSV adapter service
  const csvService = new CSVFlightService({
    host: config.server.host,
    port: config.server.port,
    dataDirectory: config.data.directory,
    batchSize: config.csv.batchSize,
    delimiter: config.csv.delimiter,
    headers: config.csv.headers,
    skipEmptyLines: config.csv.skipEmptyLines
  });

  // Attach the CSV service to the server
  server.setFlightService(csvService);

  // Handle graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n🛡️  Received ${signal}. Shutting down gracefully...`);
    
    try {
      await server.stop();
      console.log('✅ Server stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  try {
    // Start the server
    const port = await server.start();
    
    console.log('\n✅ Server is ready to accept connections!');
    console.log('\n🔗 Connection examples:');
    console.log(`   gRPC: grpc://${config.server.host}:${port}`);
    console.log('\n📖 Available operations:');
    console.log('   • ListFlights - Discover available datasets');
    console.log('   • GetFlightInfo - Get dataset metadata');
    console.log('   • GetSchema - Get Arrow schema for dataset');
    console.log('   • DoGet - Stream dataset as Arrow record batches');
    console.log('   • DoAction - Execute server actions (refresh-datasets, get-server-info)');
    console.log('\n🎯 Try the test client: npm test');
    
    // Display CSV-specific information
    const csvStats = csvService.getCSVStats();
    console.log('\n📊 CSV Adapter Statistics:');
    console.log(`   • Total Datasets: ${csvStats.totalDatasets}`);
    console.log(`   • Data Directory: ${csvStats.dataDirectory}`);
    console.log(`   • Batch Size: ${csvStats.batchSize}`);
    console.log(`   • Delimiter: "${csvStats.delimiter}"`);
    
    if (csvStats.datasets.length > 0) {
      console.log('\n📋 Available Datasets:');
      csvStats.datasets.forEach(dataset => {
        console.log(`   • ${dataset.id} (${dataset.name}) - ${Math.round(dataset.size / 1024)}KB`);
      });
    } else {
      console.log('\n⚠️  No CSV files found in data directory');
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 