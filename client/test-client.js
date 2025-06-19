import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import * as arrow from 'apache-arrow';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FlightClient {
  constructor(host = 'localhost', port = 8080) {
    this.host = host;
    this.port = port;
    this.client = null;
    this._initializeClient();
  }

  _initializeClient() {
    // Load the proto file
    const PROTO_PATH = path.join(__dirname, '../src/proto/flight.proto');
    
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const flightProto = grpc.loadPackageDefinition(packageDefinition).arrow.flight.protocol;
    
    // Create client
    this.client = new flightProto.FlightService(
      `${this.host}:${this.port}`,
      grpc.credentials.createInsecure()
    );
  }

  async listFlights() {
    console.log('🔍 Listing available flights...');
    
    return new Promise((resolve, reject) => {
      const flights = [];
      const call = this.client.listFlights({});
      
      call.on('data', (flightInfo) => {
        console.log(`📊 Found flight: ${flightInfo.flight_descriptor.path[0]}`);
        flights.push(flightInfo);
      });
      
      call.on('end', () => {
        console.log(`✅ Found ${flights.length} flights total`);
        resolve(flights);
      });
      
      call.on('error', (error) => {
        console.error('❌ Error listing flights:', error);
        reject(error);
      });
    });
  }

  async getFlightInfo(datasetId) {
    console.log(`📋 Getting flight info for: ${datasetId}`);
    
    return new Promise((resolve, reject) => {
      const descriptor = {
        type: 1, // PATH
        path: [datasetId]
      };
      
      this.client.getFlightInfo(descriptor, (error, flightInfo) => {
        if (error) {
          console.error('❌ Error getting flight info:', error);
          reject(error);
          return;
        }
        
        console.log(`✅ Flight info retrieved for ${datasetId}`);
        console.log(`   Total records: ${flightInfo.total_records}`);
        console.log(`   Total bytes: ${flightInfo.total_bytes}`);
        resolve(flightInfo);
      });
    });
  }

  async getSchema(datasetId) {
    console.log(`📐 Getting schema for: ${datasetId}`);
    
    return new Promise((resolve, reject) => {
      const descriptor = {
        type: 1, // PATH
        path: [datasetId]
      };
      
      this.client.getSchema(descriptor, (error, schemaResult) => {
        if (error) {
          console.error('❌ Error getting schema:', error);
          reject(error);
          return;
        }
        
        try {
          // Deserialize Arrow schema from IPC format
          // The server sends an empty table with the schema
          const table = arrow.tableFromIPC(schemaResult.schema);
          const schema = table.schema;
          
          console.log(`✅ Schema retrieved for ${datasetId}`);
          console.log('Schema:', schema);
          console.log('   Fields:');
          schema.fields.forEach(field => {
            console.log(`     - ${field.name}: ${field.type.toString()}`);
          });
          
          resolve(schema);
        } catch (parseError) {
          console.error('❌ Error parsing schema:', parseError);
          reject(parseError);
        }
      });
    });
  }

  async getData(datasetId) {
    console.log(`⬇️  Streaming data for: ${datasetId}`);
    
    return new Promise((resolve, reject) => {
      const ticket = {
        ticket: Buffer.from(JSON.stringify({ dataset_id: datasetId }))
      };
      
      const call = this.client.doGet(ticket);
      const recordBatches = [];
      let totalRows = 0;
      
      call.on('data', (flightData) => {
        try {
          if (flightData.data_body && flightData.data_body.length > 0) {
            // Deserialize Arrow record batch
            const reader = arrow.RecordBatchReader.from(flightData.data_body);
            
            for (const recordBatch of reader) {
              recordBatches.push(recordBatch);
              totalRows += recordBatch.numRows;
              console.log(`📦 Received batch with ${recordBatch.numRows} rows`);
              
              // Print first few rows of first batch as sample
              if (recordBatches.length === 1 && recordBatch.numRows > 0) {
                console.log('📄 Sample data from first batch:');
                const sampleRows = Math.min(3, recordBatch.numRows);
                for (let i = 0; i < sampleRows; i++) {
                  const row = {};
                  recordBatch.schema.fields.forEach((field, colIndex) => {
                    const column = recordBatch.getChildAt(colIndex);
                    row[field.name] = column.get(i);
                  });
                  console.log(`   Row ${i + 1}:`, row);
                }
                if (recordBatch.numRows > 3) {
                  console.log(`   ... and ${recordBatch.numRows - 3} more rows`);
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Error processing flight data:', error);
          call.cancel();
          reject(error);
        }
      });
      
      call.on('end', () => {
        console.log(`✅ Streaming complete for ${datasetId}`);
        console.log(`   Total batches: ${recordBatches.length}`);
        console.log(`   Total rows: ${totalRows}`);
        
        // Create table from record batches
        if (recordBatches.length > 0) {
          try {
            const table = new arrow.Table(recordBatches);
            resolve({ table, recordBatches, totalRows });
          } catch (error) {
            console.error('❌ Error creating table:', error);
            reject(error);
          }
        } else {
          resolve({ table: null, recordBatches: [], totalRows: 0 });
        }
      });
      
      call.on('error', (error) => {
        console.error('❌ Error streaming data:', error);
        reject(error);
      });
    });
  }

  async doAction(actionType, actionBody = {}) {
    console.log(`🎬 Executing action: ${actionType}`);
    
    return new Promise((resolve, reject) => {
      const action = {
        type: actionType,
        body: Buffer.from(JSON.stringify(actionBody))
      };
      
      const call = this.client.doAction(action);
      const results = [];
      
      call.on('data', (result) => {
        try {
          const data = JSON.parse(result.body.toString());
          results.push(data);
          console.log(`📋 Action result:`, data);
        } catch (error) {
          console.warn('⚠️  Could not parse action result as JSON:', result.body.toString());
          results.push({ raw: result.body.toString() });
        }
      });
      
      call.on('end', () => {
        console.log(`✅ Action ${actionType} completed`);
        resolve(results);
      });
      
      call.on('error', (error) => {
        console.error(`❌ Error executing action ${actionType}:`, error);
        reject(error);
      });
    });
  }

  async listActions() {
    console.log('📋 Listing available actions...');
    
    return new Promise((resolve, reject) => {
      const call = this.client.listActions({});
      const actions = [];
      
      call.on('data', (actionType) => {
        console.log(`🎬 Available action: ${actionType.type} - ${actionType.description}`);
        actions.push(actionType);
      });
      
      call.on('end', () => {
        console.log(`✅ Found ${actions.length} available actions`);
        resolve(actions);
      });
      
      call.on('error', (error) => {
        console.error('❌ Error listing actions:', error);
        reject(error);
      });
    });
  }

  close() {
    if (this.client) {
      this.client.close();
      console.log('🔌 Client connection closed');
    }
  }
}

// Demo function
async function demo() {
  console.log('🚀 Arrow Flight Client Demo\n');
  
  const client = new FlightClient();
  
  try {
    // List available actions
    console.log('='.repeat(50));
    await client.listActions();
    
    // Get server info
    console.log('\n' + '='.repeat(50));
    await client.doAction('get-server-info');
    
    // List flights
    console.log('\n' + '='.repeat(50));
    const flights = await client.listFlights();
    
    if (flights.length === 0) {
      console.log('⚠️  No datasets found. Make sure CSV files are in the data directory.');
      return;
    }
    
    // Use the first available dataset
    const firstFlight = flights[0];
    const datasetId = firstFlight.flight_descriptor.path[0];
    
    // Get flight info
    console.log('\n' + '='.repeat(50));
    await client.getFlightInfo(datasetId);
    
    // Get schema
    console.log('\n' + '='.repeat(50));
    await client.getSchema(datasetId);
    
    // Stream data
    console.log('\n' + '='.repeat(50));
    const result = await client.getData(datasetId);
    
    if (result.table) {
      console.log('\n📊 Final table summary:');
      console.log(`   Rows: ${result.table.numRows}`);
      console.log(`   Columns: ${result.table.numCols}`);
      console.log(`   Column names: ${result.table.schema.fields.map(f => f.name).join(', ')}`);
    }
    
  } catch (error) {
    console.error('💥 Demo failed:', error);
  } finally {
    client.close();
  }
}

// Run the demo
demo().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 