# Arrow Flight Server Framework

A modular, extensible Arrow Flight server framework built with Node.js that provides high-performance data streaming capabilities. This framework implements a plugin architecture that allows easy integration of different data sources while maintaining a consistent Flight protocol interface.

## 🏗️ Architecture

The framework is structured into three main components:

```
arrow-flight-server/
├── core/                 # Core Flight server infrastructure  
├── adapters/             # Data source adapters (plugins)
└── utils/                # Shared utilities
```

### Core Components

#### `core/flight-server.js`
Generic gRPC server that implements the Arrow Flight protocol. Features:
- Plugin architecture for data source adapters
- Configurable gRPC server options
- Lifecycle management (start, stop, graceful shutdown)
- Protocol buffer loading and service registration

#### `core/flight-service-base.js`
Abstract base class that defines the interface for all data source adapters:
- Standard Flight protocol implementations (ListFlights, GetFlightInfo, GetSchema, DoGet)
- Dataset registry management
- Error handling and gRPC status code mapping
- Common helper methods for Flight operations

#### `core/protocol-handlers.js`
Standard gRPC method handlers that bridge the gRPC server and Flight service implementations:
- Request validation and routing
- Error conversion to appropriate gRPC status codes
- Standard Flight protocol method implementations
- Custom action handlers (DoAction, ListActions)

### Data Source Adapters

#### `adapters/csv-adapter.js`
CSV file adapter that extends FlightServiceBase:
- Automatic CSV file discovery from directory
- Schema inference from CSV headers and data
- Streaming CSV data as Arrow record batches
- Configurable parsing options (delimiter, headers, etc.)
- Type conversion and error handling

#### `adapters/csv-streamer.js`
CSV streaming utility for efficient file processing:
- Memory-efficient streaming parsing
- Batch processing with configurable sizes
- Type inference and conversion
- Error recovery for malformed rows

### Utility Components

#### `utils/arrow-builder.js`
Arrow data structure builder:
- CSV schema to Arrow schema mapping
- Type-safe Arrow vector creation
- Record batch construction and serialization
- IPC format serialization for Flight protocol

#### `utils/schema-inference.js`
Generic schema inference utilities:
- Type inference from sample data
- Support for multiple data formats
- Configurable type detection rules
- Arrow schema generation

#### `utils/streaming-utils.js`
Common streaming patterns and utilities:
- Batch processing with backpressure handling
- Rate limiting and concurrency control
- Stream buffering and chunking
- Error recovery patterns

## 🚀 Getting Started

### Basic Usage

```javascript
import FlightServer from './core/flight-server.js';
import CSVFlightService from './adapters/csv-adapter.js';

// Create generic Flight server
const server = new FlightServer({
  host: 'localhost',
  port: 8080,
  maxReceiveMessageLength: 100 * 1024 * 1024, // 100MB
  maxSendMessageLength: 100 * 1024 * 1024,    // 100MB
});

// Create CSV adapter
const csvService = new CSVFlightService({
  dataDirectory: './data',
  batchSize: 10000,
  delimiter: ',',
  headers: true
});

// Attach adapter to server
server.setFlightService(csvService);

// Start server
await server.start();
```

### Configuration Options

#### Server Options
- `host`: Server hostname (default: 'localhost')
- `port`: Server port (default: 8080)
- `maxReceiveMessageLength`: Maximum incoming message size
- `maxSendMessageLength`: Maximum outgoing message size
- `protoPath`: Path to Flight protocol definition file

#### CSV Adapter Options
- `dataDirectory`: Directory containing CSV files
- `batchSize`: Number of rows per batch
- `delimiter`: CSV delimiter character
- `headers`: Whether CSV files have headers
- `skipEmptyLines`: Skip empty lines during parsing

## 🔌 Creating Custom Adapters

To create a custom data source adapter, extend `FlightServiceBase`:

```javascript
import FlightServiceBase from '../core/flight-service-base.js';

export class MyCustomAdapter extends FlightServiceBase {
  constructor(options = {}) {
    super(options);
    // Custom initialization
  }

  async _initialize() {
    // Initialize and discover datasets
    await this._initializeDatasets();
  }

  async _initializeDatasets() {
    // Discover datasets from your data source
    // Register them with this.datasets.set(id, dataset)
  }

  async _inferSchemaForDataset(datasetId) {
    // Return Arrow schema for the dataset
  }

  async _streamDataset(call, dataset) {
    // Stream dataset as Arrow record batches
    // Use call.write() to send FlightData messages
    // Call call.end() when complete
  }
}
```

### Required Methods

- `_initialize()`: Initialize the adapter and discover datasets
- `_initializeDatasets()`: Scan and register available datasets
- `_inferSchemaForDataset(datasetId)`: Return Arrow schema for a dataset
- `_streamDataset(call, dataset)`: Stream dataset data via Flight protocol

### Dataset Registry

Each adapter maintains a dataset registry (`this.datasets Map`) with entries like:

```javascript
{
  id: 'dataset-id',
  schema: arrowSchema,          // Arrow schema object
  metadata: {
    name: 'display-name',
    totalRecords: 1000,         // -1 if unknown
    totalBytes: 50000,
    created: new Date(),
    type: 'csv'                 // adapter-specific type
  }
}
```

## 📊 Flight Protocol Operations

### Core Operations

- **ListFlights**: Discover available datasets
- **GetFlightInfo**: Get metadata for a specific dataset
- **GetSchema**: Get Arrow schema for a dataset
- **DoGet**: Stream dataset as Arrow record batches
- **DoAction**: Execute custom server actions
- **ListActions**: List available custom actions

### Custom Actions

The framework provides built-in actions:
- `refresh-datasets`: Refresh the dataset catalog
- `get-server-info`: Get server status and statistics

## 🔧 Utilities

### Arrow Builder

```javascript
import ArrowBuilder from './utils/arrow-builder.js';

const builder = new ArrowBuilder(csvSchema);
const recordBatch = builder.createRecordBatch(csvData);
const serialized = builder.serializeRecordBatch(recordBatch);
```

### Schema Inference

```javascript
import { inferSchema, inferType } from './utils/schema-inference.js';

const schema = inferSchema(sampleData);
const type = inferType('123'); // Returns 'int64'
```

### Streaming Utilities

```javascript
import { BatchProcessor, StreamBuffer } from './utils/streaming-utils.js';

const processor = new BatchProcessor(batchHandler, { batchSize: 1000 });
await processor.processBatches(dataBatches);
```

## 🎯 Features

### Performance
- Streaming data processing for memory efficiency
- Configurable batch sizes for optimal throughput
- Backpressure handling for large datasets
- Connection pooling and concurrency control

### Reliability
- Comprehensive error handling and recovery
- Graceful shutdown with cleanup
- Type-safe data conversion
- Input validation and sanitization

### Extensibility
- Plugin architecture for data sources
- Standardized adapter interface
- Reusable utility components
- Configuration-driven behavior

### Observability
- Comprehensive logging with context
- Performance metrics and statistics
- Error tracking and reporting
- Custom action endpoints for monitoring

## 📈 Performance Considerations

- Use appropriate batch sizes for your data and memory constraints
- Configure message size limits based on your dataset sizes
- Consider rate limiting for high-throughput scenarios
- Monitor memory usage with large datasets
- Use streaming patterns to avoid loading entire datasets in memory

## 🛠️ Development

### Running the Server

```bash
# Start with CSV adapter
npm run start:new

# Development mode with auto-reload
npm run dev:new

# Test with client
npm test
```

### Adding New Adapters

1. Create adapter class extending `FlightServiceBase`
2. Implement required abstract methods
3. Add adapter to server configuration
4. Test with Flight client

### Testing

The framework includes a test client that can be used to verify adapter functionality:

```bash
npm test
```

The test client will:
- Connect to the running server
- List available datasets
- Get schema information
- Stream data from datasets
- Execute custom actions

## 📝 License

This project is open source and available under the [Apache 2.0 License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Add sample data to `./data/` directory
4. Start the server: `npm run start:new`
5. Run tests: `npm test`

### Creating New Adapters

We welcome contributions of new data source adapters! Some ideas:

- **Parquet files**: High-performance columnar format
- **SQL databases**: PostgreSQL, MySQL, SQLite adapters  
- **Cloud storage**: S3, GCS, Azure Blob adapters
- **Streaming sources**: Kafka, Kinesis adapters
- **Time series**: InfluxDB, TimescaleDB adapters
- **NoSQL**: MongoDB, Elasticsearch adapters

Please follow the adapter interface defined in `FlightServiceBase` and include comprehensive tests. 