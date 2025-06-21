---
layout: page
title: Tutorial
permalink: /tutorial/
---

# 📖 Complete Tutorial: Build Your First Arrow Flight CSV Server

In this tutorial, you'll learn how to set up and run an Arrow Flight server that serves CSV data, and then customize it for your own data sources.

## 🎯 What You'll Build

By the end of this tutorial, you'll have:
- A running Arrow Flight server serving CSV data
- Understanding of the plugin architecture
- A custom CSV server for your own data
- Knowledge to build adapters for other data sources

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Basic JavaScript knowledge**
- **5-10 minutes** of your time

## 🚀 Step 1: Quick Start

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/ggauravr/arrow-flight-node.git
cd arrow-flight-node

# Install dependencies
npm install
```

### Start the Example Server

```bash
# Start the server (serves sample data)
npm start
```

You should see:
```
🚀 Starting Arrow Flight CSV Server...
📁 Data directory: ./data
Registered CSV dataset: sample (sample.csv)
✅ Server started successfully!
🌐 Arrow Flight Server listening on localhost:8080
📊 Available datasets: 1

📋 Available datasets:
  • sample
```

### Test the Server

In another terminal:

```bash
# Test the server with the included client
npm test
```

You should see data streaming output! 🎉

## 📊 Step 2: Add Your Own CSV Data

### Create Your CSV File

```bash
# Create a new CSV file in the data directory
cat > data/employees.csv << 'EOF'
id,name,department,salary,hire_date
1,Alice Johnson,Engineering,95000,2022-01-15
2,Bob Smith,Marketing,72000,2021-06-01
3,Carol Brown,Engineering,88000,2020-11-30
4,David Wilson,Sales,65000,2023-02-14
5,Eva Davis,Engineering,102000,2019-08-22
EOF
```

### Restart the Server

```bash
# Stop the server (Ctrl+C) and restart
npm start
```

You should now see two datasets:
```
📋 Available datasets:
  • sample
  • employees
```

### Test Your New Data

The server automatically discovered your CSV file and inferred its schema! Test it:

```bash
npm test
```

## 🔧 Step 3: Customize Your Server

Let's create a custom server script for your specific needs.

### Create a Custom Server

```bash
# Create a new file
cat > my-csv-server.js << 'EOF'
import { FlightServer } from '@ggauravr/arrow-flight-node-core';
import { CSVFlightService } from '@ggauravr/arrow-flight-node-csv-adapter';

class MyCustomCSVServer {
  constructor() {
    // Configure your server
    this.server = new FlightServer({
      host: 'localhost',
      port: 8080,
      // Increase message size for large datasets
      maxReceiveMessageLength: 100 * 1024 * 1024, // 100MB
      maxSendMessageLength: 100 * 1024 * 1024,
    });

    // Configure CSV processing
    this.csvService = new CSVFlightService({
      dataDirectory: './data',
      batchSize: 50000,        // Process 50k rows at a time
      delimiter: ',',          // CSV delimiter
      headers: true,           // First row contains headers
      skipEmptyLines: true,    // Skip empty rows
    });
  }

  async start() {
    console.log('🚀 Starting My Custom CSV Server...');
    
    // Initialize CSV service (discover files)
    await this.csvService.initialize();
    
    // Register with Flight server
    this.server.setFlightService(this.csvService);
    
    // Start server
    const port = await this.server.start();
    console.log(`✅ Server running on port ${port}`);
    
    // Show discovered datasets
    const datasets = this.csvService.getDatasets();
    console.log(`📊 Serving ${datasets.length} datasets:`);
    datasets.forEach(id => console.log(`  • ${id}`));
    
    return port;
  }

  async stop() {
    await this.server.stop();
    console.log('🛑 Server stopped');
  }
}

// Run the server
const server = new MyCustomCSVServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 Shutting down...');
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch(console.error);
EOF
```

### Run Your Custom Server

```bash
node my-csv-server.js
```

## 🌐 Step 4: Connect from Different Languages

### Python Client

```python
# pip install pyarrow
import pyarrow.flight as flight

# Connect to your server
client = flight.FlightClient("grpc://localhost:8080")

# List available datasets
flights = list(client.list_flights())
print(f"Available datasets: {len(flights)}")

# Get data from employees dataset
descriptor = flight.FlightDescriptor.for_path(b"employees")
flight_info = client.get_flight_info(descriptor)

# Read the data
for endpoint in flight_info.endpoints:
    reader = client.do_get(endpoint.ticket)
    df = reader.read_pandas()
    print(df.head())
```

### JavaScript Client (Browser/Node.js)

```javascript
// npm install apache-arrow @grpc/grpc-js
import { FlightClient } from './path/to/flight-client';

const client = new FlightClient('localhost:8080');

// List datasets
const flights = await client.listFlights();
console.log('Available datasets:', flights.length);

// Get employees data
const data = await client.getTable('employees');
console.log('Employees data:', data.toArray());
```

## 🔌 Step 5: Build a Custom Adapter

Want to serve data from a database instead of CSV? Here's how to build a custom adapter:

```javascript
// database-adapter.js
import { FlightServiceBase } from '@ggauravr/arrow-flight-node-core';
import { ArrowBuilder } from '@ggauravr/arrow-flight-node-utils';
import Database from 'better-sqlite3';

export class DatabaseFlightService extends FlightServiceBase {
  constructor(options = {}) {
    super(options);
    this.dbPath = options.dbPath || './data.db';
    this.db = null;
  }

  async _initialize() {
    // Connect to database
    this.db = new Database(this.dbPath);
    
    // Discover tables
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    for (const table of tables) {
      const schema = await this._inferSchemaForDataset(table.name);
      this.datasets.set(table.name, {
        id: table.name,
        schema: schema,
        metadata: { type: 'database', table: table.name }
      });
    }
  }

  async _inferSchemaForDataset(tableName) {
    // Query sample data to infer schema
    const sample = this.db.prepare(`SELECT * FROM ${tableName} LIMIT 1`).get();
    
    // Convert to CSV-like schema for ArrowBuilder
    const csvSchema = {};
    for (const [key, value] of Object.entries(sample)) {
      csvSchema[key] = typeof value === 'number' ? 'float64' : 'string';
    }
    
    const arrowBuilder = new ArrowBuilder(csvSchema);
    return arrowBuilder.getSchema();
  }

  async _streamDataset(call, dataset) {
    const tableName = dataset.id;
    const batchSize = 10000;
    let offset = 0;

    while (true) {
      // Get batch of data
      const rows = this.db.prepare(`
        SELECT * FROM ${tableName} 
        LIMIT ${batchSize} OFFSET ${offset}
      `).all();

      if (rows.length === 0) break;

      // Convert to Arrow and stream
      const arrowBuilder = new ArrowBuilder(dataset.schema);
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
}
```

## 🚀 Step 6: Production Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 8080

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t my-flight-server .
docker run -p 8080:8080 -v $(pwd)/data:/app/data my-flight-server
```

### Environment Configuration

```bash
# .env file
FLIGHT_HOST=0.0.0.0
FLIGHT_PORT=8080
DATA_DIRECTORY=/data/csv
CSV_BATCH_SIZE=100000
CSV_DELIMITER=,
```

## 🎯 Next Steps

Congratulations! You now have a working Arrow Flight server. Here's what to explore next:

### 📚 Learn More
- [API Reference]({{ '/api-reference/' | relative_url }}) - Complete API documentation
- [Examples]({{ '/examples/' | relative_url }}) - More advanced examples
- [Contributing]({{ '/contributing/' | relative_url }}) - Help improve the project

### 🔨 Build Something Cool
- **Database adapter** for PostgreSQL, MySQL, or MongoDB
- **Cloud storage adapter** for S3, GCS, or Azure Blob
- **Real-time adapter** for Kafka or streaming data
- **Analytics dashboard** that connects to your Flight server

### 🤝 Get Help
- **GitHub Issues**: [Report bugs or ask questions](https://github.com/ggauravr/arrow-flight-node/issues)
- **Discussions**: [Community discussions](https://github.com/ggauravr/arrow-flight-node/discussions)

## 🎉 You Did It!

You've successfully:
- ✅ Set up an Arrow Flight server
- ✅ Added your own CSV data  
- ✅ Created a custom server
- ✅ Learned about adapters and plugins
- ✅ Seen multi-language client examples

Happy streaming! 🚀 