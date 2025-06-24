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
git clone https://github.com/ggauravr/flightstream.git
cd flightstream

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
import { FlightServer } from '@flightstream/core';
import { CSVFlightService } from '@flightstream/csv-service';

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

Want to serve data from a database instead of CSV? You'll need to create two classes: a custom ArrowBuilder for your data format and a FlightService for your data source.

### Step 5.1: Create a SQLite Arrow Builder

First, create a custom `SQLiteArrowBuilder` that extends the abstract `ArrowBuilder`:

```javascript
// sqlite-arrow-builder.js
import * as arrow from 'apache-arrow';
import { ArrowBuilder } from '@flightstream/utils';

/**
 * SQLite-specific Arrow Builder
 * 
 * Extends the abstract ArrowBuilder to provide SQLite-specific data type
 * mapping and row format conversion to Arrow format.
 */
export class SQLiteArrowBuilder extends ArrowBuilder {
  constructor(sqliteSchema, options = {}) {
    super(sqliteSchema, options);
  }

  /**
   * Build Arrow schema from SQLite column information
   * Required implementation of abstract method
   */
  _buildArrowSchema() {
    const fields = [];
    
    for (const [columnName, sqliteType] of Object.entries(this.sourceSchema)) {
      const arrowType = this._mapSourceTypeToArrow(sqliteType);
      fields.push(arrow.Field.new(columnName, arrowType, true)); // nullable = true
    }
    
    this.arrowSchema = new arrow.Schema(fields);
  }

  /**
   * Transform SQLite rows to column-oriented data
   * Required implementation of abstract method
   */
  _transformDataToColumns(sqliteRows) {
    if (!Array.isArray(sqliteRows) || sqliteRows.length === 0) {
      return {};
    }

    const columnData = {};
    
    // Initialize column arrays
    for (const field of this.arrowSchema.fields) {
      columnData[field.name] = [];
    }
    
    // Convert row-oriented data to column-oriented
    for (const row of sqliteRows) {
      for (const field of this.arrowSchema.fields) {
        const columnName = field.name;
        const value = row[columnName];
        columnData[columnName].push(value);
      }
    }
    
    return columnData;
  }

  /**
   * Map SQLite types to Arrow types
   * Required implementation of abstract method
   */
  _mapSourceTypeToArrow(sqliteType) {
    const type = sqliteType.toLowerCase();
    
    if (type.includes('int')) {
      return new arrow.Int64();
    } else if (type.includes('real') || type.includes('float') || type.includes('double')) {
      return new arrow.Float64();
    } else if (type.includes('text') || type.includes('char') || type.includes('varchar')) {
      return new arrow.Utf8();
    } else if (type.includes('blob')) {
      return new arrow.Binary();
    } else if (type.includes('boolean') || type.includes('bool')) {
      return new arrow.Bool();
    } else {
      // Default to string for unknown types
      return new arrow.Utf8();
    }
  }

  /**
   * SQLite-specific helper: Get schema from table info
   */
  static createSchemaFromTableInfo(tableInfo) {
    const schema = {};
    for (const column of tableInfo) {
      schema[column.name] = column.type;
    }
    return schema;
  }
}
```

### Step 5.2: Create a SQLite Flight Service

Next, create a `SQLiteFlightService` that extends `FlightServiceBase`:

```javascript
// sqlite-flight-service.js
import { FlightServiceBase } from '@flightstream/core';
import { SQLiteArrowBuilder } from './sqlite-arrow-builder.js';
import Database from 'better-sqlite3';

/**
 * SQLite Flight Service
 * 
 * Extends FlightServiceBase to provide SQLite database support.
 * Discovers tables automatically and streams them via Arrow Flight.
 */
export class SQLiteFlightService extends FlightServiceBase {
  constructor(options = {}) {
    super(options);
    
    this.dbPath = options.dbPath || './data.db';
    this.batchSize = options.batchSize || 10000;
    this.db = null;
  }

  /**
   * Initialize the SQLite service
   * Required implementation of abstract method
   */
  async _initialize() {
    try {
      console.log(`🗄️  Connecting to SQLite database: ${this.dbPath}`);
      this.db = new Database(this.dbPath);
      
      // Discover and register tables
      await this._initializeDatasets();
      
      console.log(`✅ SQLite service initialized with ${this.datasets.size} tables`);
    } catch (error) {
      console.error('❌ Error initializing SQLite service:', error);
      throw error;
    }
  }

  /**
   * Discover and register database tables as datasets
   * Required implementation of abstract method  
   */
  async _initializeDatasets() {
    // Get all user tables (exclude SQLite system tables)
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    console.log(`📋 Found ${tables.length} tables in database`);

    for (const table of tables) {
      try {
        const tableName = table.name;
        
        // Infer Arrow schema from table structure
        const schema = await this._inferSchemaForDataset(tableName);
        
        // Get table metadata
        const rowCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
        
        // Register the table as a dataset
        this.datasets.set(tableName, {
          id: tableName,
          schema: schema,
          metadata: { 
            type: 'sqlite-table',
            tableName: tableName,
            totalRecords: rowCount,
            totalBytes: -1 // Unknown for database tables
          }
        });
        
        console.log(`📊 Registered table: ${tableName} (${rowCount} rows)`);
        
      } catch (error) {
        console.warn(`⚠️  Failed to register table ${table.name}:`, error.message);
      }
    }
  }

  /**
   * Infer Arrow schema from SQLite table structure
   * Required implementation of abstract method
   */
  async _inferSchemaForDataset(tableName) {
    // Get column information using SQLite PRAGMA
    const tableInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    if (tableInfo.length === 0) {
      throw new Error(`Table ${tableName} has no columns`);
    }
    
    // Convert SQLite column info to schema format
    const sqliteSchema = SQLiteArrowBuilder.createSchemaFromTableInfo(tableInfo);
    
    // Create Arrow schema using our custom builder
    const arrowBuilder = new SQLiteArrowBuilder(sqliteSchema);
    return arrowBuilder.getSchema();
  }

  /**
   * Stream table data as Arrow record batches
   * Required implementation of abstract method
   */
  async _streamDataset(call, dataset) {
    const tableName = dataset.id;
    console.log(`🚀 Streaming SQLite table: ${tableName}`);
    
    try {
      let offset = 0;
      let totalBatches = 0;
      let totalRows = 0;
      const startTime = Date.now();

      // Get table schema for Arrow builder
      const tableInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
      const sqliteSchema = SQLiteArrowBuilder.createSchemaFromTableInfo(tableInfo);
      const arrowBuilder = new SQLiteArrowBuilder(sqliteSchema);

      // Stream data in batches
      while (true) {
        // Fetch next batch from database
        const rows = this.db.prepare(`
          SELECT * FROM ${tableName} 
          LIMIT ${this.batchSize} OFFSET ${offset}
        `).all();

        // No more data
        if (rows.length === 0) break;

        // Convert SQLite rows to Arrow record batch
        const recordBatch = arrowBuilder.createRecordBatch(rows);
        if (!recordBatch) {
          console.warn('⚠️  Failed to create record batch, skipping');
          break;
        }

        // Serialize record batch for Flight protocol
        const serializedBatch = arrowBuilder.serializeRecordBatch(recordBatch);
        if (!serializedBatch) {
          console.warn('⚠️  Failed to serialize record batch, skipping');
          break;
        }

        // Send Flight data message to client
        call.write({
          flight_descriptor: {
            type: 1, // PATH descriptor type
            path: [tableName]
          },
          data_header: serializedBatch.slice(0, 4), // IPC message header
          data_body: serializedBatch.slice(4)      // IPC message body
        });

        // Update progress
        totalBatches++;
        totalRows += rows.length;
        offset += this.batchSize;

        console.log(`📦 Sent batch ${totalBatches}: ${rows.length} rows (total: ${totalRows})`);
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Completed streaming ${tableName}: ${totalRows} rows in ${totalBatches} batches (${processingTime}ms)`);
      
      // Signal end of stream
      call.end();
      
    } catch (error) {
      console.error(`❌ Error streaming table ${tableName}:`, error);
      call.emit('error', error);
    }
  }

  /**
   * Clean up database connection
   */
  async stop() {
    if (this.db) {
      console.log('🔌 Closing SQLite database connection');
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get SQLite-specific statistics
   */
  getSQLiteStats() {
    if (!this.db) return null;
    
    const stats = {
      dbPath: this.dbPath,
      totalTables: this.datasets.size,
      batchSize: this.batchSize,
      tables: []
    };

    for (const [tableName, dataset] of this.datasets) {
      stats.tables.push({
        name: tableName,
        rows: dataset.metadata.totalRecords,
        columns: dataset.schema.fields.length,
        schema: dataset.schema.fields.map(f => ({
          name: f.name,
          type: f.type.toString()
        }))
      });
    }

    return stats;
  }
}
```

### Step 5.3: Use Your Custom Adapter

Now use your custom SQLite adapter in a server:

```javascript
// my-sqlite-server.js
import { FlightServer } from '@flightstream/core';
import { SQLiteFlightService } from './sqlite-flight-service.js';

const server = new FlightServer({
  host: 'localhost',
  port: 8080,
  maxReceiveMessageLength: 100 * 1024 * 1024,
  maxSendMessageLength: 100 * 1024 * 1024
});

const sqliteService = new SQLiteFlightService({
  dbPath: './my-database.db',
  batchSize: 50000
});

// Wait for service to initialize, then start server
sqliteService.initialize().then(() => {
  server.setFlightService(sqliteService);
  return server.start();
}).then((port) => {
  console.log(`🚀 SQLite Flight Server running on port ${port}`);
  
  // Show available tables
  const stats = sqliteService.getSQLiteStats();
  console.log(`📊 Serving ${stats.totalTables} tables:`);
  stats.tables.forEach(table => {
    console.log(`  • ${table.name} (${table.rows} rows, ${table.columns} columns)`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await sqliteService.stop();
  await server.stop();
  process.exit(0);
});
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
- **GitHub Issues**: [Report bugs or ask questions](https://github.com/ggauravr/flightstream/issues)
- **Discussions**: [Community discussions](https://github.com/ggauravr/flightstream/discussions)

## 🎉 You Did It!

You've successfully:
- ✅ Set up an Arrow Flight server
- ✅ Added your own CSV data  
- ✅ Created a custom server
- ✅ Learned about adapters and plugins
- ✅ Seen multi-language client examples

Happy streaming! 🚀 