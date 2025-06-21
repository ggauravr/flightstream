---
layout: page
title: Examples
permalink: /examples/
---

# 💡 Examples

Real-world examples and patterns for building Arrow Flight servers.

## 🎯 Basic Examples

### Simple CSV Server

```javascript
// basic-csv-server.js
import { FlightServer } from '@ggauravr/arrow-flight-node-core';
import { CSVFlightService } from '@ggauravr/arrow-flight-node-csv-adapter';

const server = new FlightServer({ port: 8080 });
const csvService = new CSVFlightService({ dataDirectory: './data' });

server.setFlightService(csvService);
await server.start();
console.log('🚀 CSV server running on port 8080');
```

### Custom Configuration

```javascript
// configured-server.js
import { FlightServer } from '@ggauravr/arrow-flight-node-core';
import { CSVFlightService } from '@ggauravr/arrow-flight-node-csv-adapter';

const server = new FlightServer({
  host: '0.0.0.0',  // Accept external connections
  port: 8080,
  maxReceiveMessageLength: 200 * 1024 * 1024,  // 200MB
  maxSendMessageLength: 200 * 1024 * 1024,
});

const csvService = new CSVFlightService({
  dataDirectory: './data',
  batchSize: 100000,    // Large batches for performance
  delimiter: '|',       // Pipe-separated values
  headers: true,
  skipEmptyLines: true,
});

await csvService.initialize();
server.setFlightService(csvService);
await server.start();

console.log('🚀 Configured server running');
console.log(`📊 Serving ${csvService.getDatasets().length} datasets`);
```

## 🗄️ Database Integration

### SQLite Adapter

```javascript
// sqlite-adapter.js
import { FlightServiceBase } from '@ggauravr/arrow-flight-node-core';
import { ArrowBuilder } from '@ggauravr/arrow-flight-node-utils';
import Database from 'better-sqlite3';

export class SQLiteFlightService extends FlightServiceBase {
  constructor(options = {}) {
    super(options);
    this.dbPath = options.dbPath || './database.db';
    this.db = null;
  }

  async _initialize() {
    // Open SQLite database
    this.db = new Database(this.dbPath, { readonly: true });
    
    // Get all table names
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    // Register each table as a dataset
    for (const table of tables) {
      const tableName = table.name;
      const schema = await this._inferSchemaForDataset(tableName);
      
      this.datasets.set(tableName, {
        id: tableName,
        schema: schema,
        metadata: {
          type: 'sqlite',
          table: tableName,
          rowCount: this._getRowCount(tableName)
        }
      });
    }
  }

  async _inferSchemaForDataset(tableName) {
    // Get table info to understand column types
    const pragma = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    const csvSchema = {};
    for (const col of pragma) {
      csvSchema[col.name] = this._mapSQLiteType(col.type);
    }

    const arrowBuilder = new ArrowBuilder(csvSchema);
    return arrowBuilder.getSchema();
  }

  _mapSQLiteType(sqliteType) {
    const type = sqliteType.toUpperCase();
    if (type.includes('INT')) return 'int64';
    if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) return 'float64';
    if (type.includes('BOOL')) return 'boolean';
    return 'string';
  }

  async _streamDataset(call, dataset) {
    const tableName = dataset.id;
    const batchSize = 50000;
    let offset = 0;
    
    const arrowBuilder = new ArrowBuilder(dataset.schema);

    while (true) {
      const rows = this.db.prepare(`
        SELECT * FROM ${tableName} 
        LIMIT ${batchSize} OFFSET ${offset}
      `).all();

      if (rows.length === 0) break;

      // Convert to Arrow and stream
      const recordBatch = arrowBuilder.createRecordBatch(rows);
      const serialized = arrowBuilder.serializeRecordBatch(recordBatch);

      call.write({
        flight_descriptor: { type: 1, path: [tableName] },
        app_metadata: Buffer.alloc(0),
        data_header: serialized.header,
        data_body: serialized.body
      });

      offset += batchSize;
    }

    call.end();
  }

  _getRowCount(tableName) {
    const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    return result.count;
  }
}

// Usage example
const server = new FlightServer({ port: 8080 });
const sqliteService = new SQLiteFlightService({ 
  dbPath: './mydata.db' 
});

server.setFlightService(sqliteService);
await server.start();
```

## 🌐 Client Examples

### Python Client

```python
# python-client.py
import pyarrow.flight as flight
import pandas as pd

# Connect to server
client = flight.FlightClient("grpc://localhost:8080")

# List all available datasets
print("Available datasets:")
for flight_info in client.list_flights():
    descriptor = flight_info.descriptor
    if descriptor.descriptor_type == flight.DescriptorType.PATH:
        dataset_name = descriptor.path[0].decode('utf-8')
        print(f"  - {dataset_name} ({flight_info.total_records} records)")

# Get specific dataset
dataset_name = "employees"  # Replace with your dataset
descriptor = flight.FlightDescriptor.for_path(dataset_name.encode('utf-8'))

try:
    # Get flight info
    flight_info = client.get_flight_info(descriptor)
    print(f"\nDataset: {dataset_name}")
    print(f"Records: {flight_info.total_records}")
    print(f"Schema: {flight_info.schema}")
    
    # Read data
    for endpoint in flight_info.endpoints:
        reader = client.do_get(endpoint.ticket)
        table = reader.read_all()
        df = table.to_pandas()
        
        print(f"\nFirst 5 rows:")
        print(df.head())
        
        print(f"\nData types:")
        print(df.dtypes)
        
except Exception as e:
    print(f"Error: {e}")
```

### JavaScript/Node.js Client

```javascript
// js-client.js
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';

class FlightClient {
  constructor(host = 'localhost', port = 8080) {
    // Load Flight service proto
    const protoPath = path.join(process.cwd(), 'packages/core/proto/flight.proto');
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const flightProto = grpc.loadPackageDefinition(packageDefinition).arrow.flight.protocol;
    this.client = new flightProto.FlightService(
      `${host}:${port}`,
      grpc.credentials.createInsecure()
    );
  }

  async listFlights() {
    return new Promise((resolve, reject) => {
      const flights = [];
      const call = this.client.listFlights({});
      
      call.on('data', (flightInfo) => {
        flights.push({
          descriptor: flightInfo.flight_descriptor,
          endpoints: flightInfo.endpoint,
          totalRecords: flightInfo.total_records,
          totalBytes: flightInfo.total_bytes
        });
      });
      
      call.on('end', () => resolve(flights));
      call.on('error', reject);
    });
  }

  async getFlightInfo(datasetName) {
    return new Promise((resolve, reject) => {
      const descriptor = {
        type: 1, // PATH
        path: [datasetName]
      };
      
      this.client.getFlightInfo({ flight_descriptor: descriptor }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }
}

// Usage
async function demo() {
  const client = new FlightClient();
  
  try {
    // List datasets
    console.log('🔍 Listing available flights...');
    const flights = await client.listFlights();
    console.log(`✅ Found ${flights.length} flights`);
    
    flights.forEach((flight, index) => {
      const path = flight.descriptor.path[0];
      console.log(`  ${index + 1}. ${path} (${flight.totalRecords} records)`);
    });
    
    // Get specific dataset info
    if (flights.length > 0) {
      const firstDataset = flights[0].descriptor.path[0];
      console.log(`\n📊 Getting info for: ${firstDataset}`);
      const info = await client.getFlightInfo(firstDataset);
      console.log(`   Records: ${info.total_records}`);
      console.log(`   Bytes: ${info.total_bytes}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

demo();
```

## 🔧 Advanced Patterns

### Multi-Source Server

```javascript
// multi-source-server.js
import { FlightServer } from '@ggauravr/arrow-flight-node-core';
import { CSVFlightService } from '@ggauravr/arrow-flight-node-csv-adapter';

class MultiSourceFlightService {
  constructor() {
    this.services = new Map();
    this.datasets = new Map();
  }

  addSource(name, service) {
    this.services.set(name, service);
    return this;
  }

  async initialize() {
    // Initialize all services
    for (const [name, service] of this.services) {
      await service.initialize();
      
      // Prefix datasets with source name
      for (const [datasetId, dataset] of service.datasets) {
        const prefixedId = `${name}.${datasetId}`;
        this.datasets.set(prefixedId, {
          ...dataset,
          id: prefixedId,
          source: name,
          originalId: datasetId,
          service: service
        });
      }
    }
  }

  // Implement Flight service methods
  async listFlights(call) {
    for (const [datasetId, dataset] of this.datasets) {
      const flightInfo = {
        flight_descriptor: {
          type: 1,
          path: [datasetId]
        },
        total_records: dataset.metadata.totalRecords || -1,
        total_bytes: dataset.metadata.totalBytes || -1
      };
      call.write(flightInfo);
    }
    call.end();
  }

  async getFlightInfo(call) {
    const descriptor = call.request.flight_descriptor;
    const datasetId = descriptor.path[0];
    
    if (!this.datasets.has(datasetId)) {
      return call.callback(new Error(`Dataset not found: ${datasetId}`));
    }
    
    const dataset = this.datasets.get(datasetId);
    call.callback(null, {
      flight_descriptor: descriptor,
      total_records: dataset.metadata.totalRecords || -1,
      total_bytes: dataset.metadata.totalBytes || -1,
      endpoint: [{
        ticket: { ticket: Buffer.from(datasetId) }
      }]
    });
  }

  async doGet(call) {
    const ticket = call.request.ticket.toString();
    const dataset = this.datasets.get(ticket);
    
    if (!dataset) {
      return call.emit('error', new Error(`Dataset not found: ${ticket}`));
    }
    
    // Delegate to the appropriate service
    const originalDataset = {
      ...dataset,
      id: dataset.originalId
    };
    
    return dataset.service._streamDataset(call, originalDataset);
  }
}

// Usage
async function startMultiSourceServer() {
  const multiService = new MultiSourceFlightService();
  
  // Add CSV sources
  multiService.addSource('sales', new CSVFlightService({ 
    dataDirectory: './data/sales' 
  }));
  
  multiService.addSource('products', new CSVFlightService({ 
    dataDirectory: './data/products' 
  }));
  
  multiService.addSource('users', new CSVFlightService({ 
    dataDirectory: './data/users' 
  }));
  
  // Initialize all sources
  await multiService.initialize();
  
  // Start server
  const server = new FlightServer({ port: 8080 });
  server.setFlightService(multiService);
  await server.start();
  
  console.log('🚀 Multi-source server running');
  console.log('📊 Available datasets:');
  for (const datasetId of multiService.datasets.keys()) {
    console.log(`  • ${datasetId}`);
  }
}

startMultiSourceServer();
```

### Performance Monitoring

```javascript
// monitored-server.js
import { FlightServer } from '@ggauravr/arrow-flight-node-core';
import { CSVFlightService } from '@ggauravr/arrow-flight-node-csv-adapter';

class MonitoredFlightService extends CSVFlightService {
  constructor(options) {
    super(options);
    this.stats = {
      requestCount: 0,
      totalBytesServed: 0,
      totalRecordsServed: 0,
      averageResponseTime: 0,
      errors: 0
    };
  }

  async _streamDataset(call, dataset) {
    const startTime = Date.now();
    let recordCount = 0;
    let byteCount = 0;
    
    try {
      this.stats.requestCount++;
      
      // Override call.write to count records and bytes
      const originalWrite = call.write.bind(call);
      call.write = (data) => {
        byteCount += Buffer.byteLength(JSON.stringify(data));
        recordCount += data.data_body ? data.data_body.length : 0;
        return originalWrite(data);
      };
      
      // Call parent implementation
      await super._streamDataset(call, dataset);
      
      // Update stats
      const duration = Date.now() - startTime;
      this.stats.totalBytesServed += byteCount;
      this.stats.totalRecordsServed += recordCount;
      this.stats.averageResponseTime = (
        (this.stats.averageResponseTime * (this.stats.requestCount - 1) + duration) 
        / this.stats.requestCount
      );
      
      console.log(`📊 Served ${recordCount} records (${byteCount} bytes) in ${duration}ms`);
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error serving ${dataset.id}:`, error.message);
      throw error;
    }
  }

  getStats() {
    return {
      ...this.stats,
      datasets: this.datasets.size,
      uptime: process.uptime()
    };
  }
}

// Usage with stats endpoint
async function startMonitoredServer() {
  const service = new MonitoredFlightService({ dataDirectory: './data' });
  const server = new FlightServer({ port: 8080 });
  
  server.setFlightService(service);
  await server.start();
  
  // Print stats every 30 seconds
  setInterval(() => {
    const stats = service.getStats();
    console.log('\n📈 Server Statistics:');
    console.log(`  Requests: ${stats.requestCount}`);
    console.log(`  Records served: ${stats.totalRecordsServed.toLocaleString()}`);
    console.log(`  Bytes served: ${(stats.totalBytesServed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Average response time: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Uptime: ${Math.floor(stats.uptime)}s`);
  }, 30000);
  
  console.log('🚀 Monitored server running on port 8080');
}

startMonitoredServer();
```

## 🚀 Running the Examples

All examples are available in the repository:

```bash
# Clone the repository
git clone https://github.com/ggauravr/arrow-flight-node.git
cd arrow-flight-node
npm install

# Run the basic example
npm start

# Try with custom data
mkdir data/custom
echo "id,name,value\n1,Test,123\n2,Demo,456" > data/custom/test.csv
npm start

# Test with the client
npm test
```

## 📚 More Resources

- **[Tutorial]({{ '/tutorial/' | relative_url }})** - Step-by-step guide
- **[API Reference]({{ '/api-reference/' | relative_url }})** - Complete API docs  
- **[Getting Started]({{ '/getting-started/' | relative_url }})** - Quick setup
- **[GitHub Repository](https://github.com/ggauravr/arrow-flight-node)** - Source code and more examples

Happy coding! 🚀 