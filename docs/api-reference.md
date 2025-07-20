---
layout: page
title: API Reference
permalink: /api-reference/
---

# 📋 API Reference

Complete API documentation for all packages in the Arrow Flight Server Node.js framework.

## 🏗️ Core Server Package (@flightstream/core-server)

### FlightServer Class

The main server class that handles gRPC connections and Flight protocol implementation.

#### Constructor

```javascript
new FlightServer(options)
```

**Parameters:**
- `options.host` (string, default: 'localhost') - Server host
- `options.port` (number, default: 8080) - Server port  
- `options.maxReceiveMessageLength` (number, default: 100MB) - Max incoming message size
- `options.maxSendMessageLength` (number, default: 100MB) - Max outgoing message size

**Example:**
```javascript
const server = new FlightServer({
  host: '0.0.0.0',
  port: 8080,
  maxReceiveMessageLength: 200 * 1024 * 1024,
  maxSendMessageLength: 200 * 1024 * 1024
});
```

#### Methods

##### `setFlightService(service)`
Registers a Flight service implementation with the server.

**Parameters:**
- `service` (FlightServiceBase) - Service implementation

**Returns:** `void`

**Example:**
```javascript
const csvService = new CSVFlightService({ dataDirectory: './data' });
server.setFlightService(csvService);
```

##### `start()`
Starts the Flight server.

**Returns:** `Promise<number>` - The port the server is listening on

**Example:**
```javascript
const port = await server.start();
console.log(`Server started on port ${port}`);
```

##### `stop()`
Stops the Flight server gracefully.

**Returns:** `Promise<void>`

**Example:**
```javascript
await server.stop();
```

---

## 🏗️ Core Client Package (@flightstream/core-client)

### FlightClient Class

The main client class that handles gRPC connections to Flight servers.

#### Constructor

```javascript
new FlightClient(options)
```

**Parameters:**
- `options.host` (string, default: 'localhost') - Server host
- `options.port` (number, default: 8080) - Server port
- `options.retryAttempts` (number, default: 3) - Connection retry attempts
- `options.retryDelay` (number, default: 1000) - Delay between retries in ms
- `options.connectionTimeout` (number, default: 5000) - Connection timeout in ms

**Example:**
```javascript
const client = new FlightClient({
  host: 'localhost',
  port: 8080,
  retryAttempts: 5,
  retryDelay: 2000,
  connectionTimeout: 10000
});
```

#### Methods

##### `connect()`
Connects to the Flight server.

**Returns:** `Promise<void>`

**Example:**
```javascript
await client.connect();
```

##### `disconnect()`
Disconnects from the Flight server.

**Returns:** `Promise<void>`

**Example:**
```javascript
await client.disconnect();
```

##### `listDatasets()`
Lists available datasets from the server.

**Returns:** `Promise<Array>` - Array of dataset information objects

**Example:**
```javascript
const datasets = await client.listDatasets();
console.log('Available datasets:', datasets);
```

##### `getDataset(datasetId)`
Retrieves a complete dataset as an Arrow table.

**Parameters:**
- `datasetId` (string) - Dataset identifier

**Returns:** `Promise<Arrow.Table>` - Arrow table containing the dataset

**Example:**
```javascript
const table = await client.getDataset('my-dataset');
console.log(`Retrieved ${table.numRows} rows`);
```

##### `streamDataset(datasetId)`
Streams a dataset as Arrow record batches.

**Parameters:**
- `datasetId` (string) - Dataset identifier

**Returns:** `AsyncIterator<Arrow.RecordBatch>` - Iterator for record batches

**Example:**
```javascript
for await (const batch of client.streamDataset('my-dataset')) {
  console.log(`Received batch with ${batch.numRows} rows`);
}
```

##### `getSchema(datasetId)`
Gets the Arrow schema for a dataset.

**Parameters:**
- `datasetId` (string) - Dataset identifier

**Returns:** `Promise<Arrow.Schema>` - Arrow schema

**Example:**
```javascript
const schema = await client.getSchema('my-dataset');
console.log('Schema:', schema);
```

---

## 🏗️ Core Shared Package (@flightstream/core-shared)

### Protocol Utilities

Shared utilities for working with Flight protocol.

#### `createProtocolHandlers(flightService)`

Creates gRPC protocol handlers for a Flight service.

**Parameters:**
- `flightService` (FlightServiceBase) - Flight service implementation

**Returns:** `Object` - Protocol handlers object

---

## 📊 CSV Adapter Package (@flightstream/adapters-csv)

### CSVFlightService Class

Extends `FlightServiceBase` to provide CSV file support.

#### Constructor

```javascript
new CSVFlightService(options)
```

**Parameters:**
- `options.dataDirectory` (string, default: './data') - Directory containing CSV files
- `options.batchSize` (number, default: 10000) - Records per batch
- `options.delimiter` (string, default: ',') - CSV delimiter
- `options.headers` (boolean, default: true) - Whether first row contains headers
- `options.skipEmptyLines` (boolean, default: true) - Skip empty rows

**Example:**
```javascript
const csvService = new CSVFlightService({
  dataDirectory: './data/csv',
  batchSize: 50000,
  delimiter: '|',
  headers: true,
  skipEmptyLines: true
});
```

#### Methods

##### `initialize()`
Public method to ensure service is fully initialized.

**Returns:** `Promise<void>`

**Example:**
```javascript
await csvService.initialize();
```

##### `getDatasets()`
Gets list of available dataset IDs.

**Returns:** `Array<string>` - Array of dataset IDs

**Example:**
```javascript
const datasets = csvService.getDatasets();
console.log('Available datasets:', datasets);
```

##### `getCSVStats()`
Gets statistics about CSV files.

**Returns:** `Object` - Statistics object

**Example:**
```javascript
const stats = csvService.getCSVStats();
console.log('CSV stats:', stats);
```

---

## 🔧 Arrow Utils Package (@flightstream/utils-arrow)

### ArrowBuilder Class

Utility for building Arrow data structures.

#### Constructor

```javascript
new ArrowBuilder()
```

#### Methods

##### `fromCSV(filePath, options)`
Creates an Arrow table from a CSV file.

**Parameters:**
- `filePath` (string) - Path to CSV file
- `options` (Object, optional) - CSV parsing options

**Returns:** `Promise<Arrow.Table>` - Arrow table

**Example:**
```javascript
const builder = new ArrowBuilder();
const table = await builder.fromCSV('./data/sample.csv');
console.log(`Created table with ${table.numRows} rows`);
```

### Schema Inference

#### `inferSchema(filePath, options)`

Infers Arrow schema from a CSV file.

**Parameters:**
- `filePath` (string) - Path to CSV file
- `options` (Object, optional) - Inference options

**Returns:** `Promise<Arrow.Schema>` - Inferred schema

**Example:**
```javascript
import { inferSchema } from '@flightstream/utils-arrow/schema-inference';

const schema = await inferSchema('./data/sample.csv');
console.log('Inferred schema:', schema);
```

### Streaming Utilities

#### `createStreamFromCSV(filePath, options)`

Creates a readable stream from a CSV file.

**Parameters:**
- `filePath` (string) - Path to CSV file
- `options` (Object, optional) - Streaming options

**Returns:** `ReadableStream` - Stream of Arrow record batches

**Example:**
```javascript
import { streamingUtils } from '@flightstream/utils-arrow/streaming-utils';

const stream = streamingUtils.createStreamFromCSV('./data/large-file.csv');

stream.on('data', (batch) => {
  console.log(`Received batch with ${batch.numRows} rows`);
});

stream.on('end', () => {
  console.log('Stream completed');
});
```

---

## 📋 Type System (@flightstream/utils-arrow)

### Type Detector

Advanced type detection utilities for Arrow data.

#### `detectType(value)`

Detects the appropriate Arrow type for a value.

**Parameters:**
- `value` (any) - Value to detect type for

**Returns:** `Arrow.Type` - Detected Arrow type

**Example:**
```javascript
import { detectType } from '@flightstream/utils-arrow/type-system';

const type = detectType(42);
console.log('Detected type:', type);
```

### Type Registry

#### `registerCustomType(name, type)`

Registers a custom Arrow type.

**Parameters:**
- `name` (string) - Type name
- `type` (Arrow.Type) - Arrow type

**Returns:** `void`

**Example:**
```javascript
import { registerCustomType } from '@flightstream/utils-arrow/type-system';

registerCustomType('custom_timestamp', new Arrow.Timestamp(Arrow.TimeUnit.MILLISECOND));
```

---

## 🔧 Error Handling

### Common Error Types

#### `FlightConnectionError`
Thrown when connection to Flight server fails.

#### `FlightProtocolError`
Thrown when Flight protocol errors occur.

#### `FlightServiceError`
Thrown when Flight service errors occur.

### Error Handling Example

```javascript
import { FlightClient } from '@flightstream/core-client';

async function handleErrors() {
  const client = new FlightClient({ host: 'localhost', port: 8080 });
  
  try {
    await client.connect();
    const datasets = await client.listDatasets();
    console.log('Datasets:', datasets);
  } catch (error) {
    if (error.name === 'FlightConnectionError') {
      console.error('Connection failed:', error.message);
    } else if (error.name === 'FlightProtocolError') {
      console.error('Protocol error:', error.message);
    } else {
      console.error('Unexpected error:', error.message);
    }
  } finally {
    await client.disconnect();
  }
}
```

---

## 📊 Performance Considerations

### Server Configuration

For high-performance servers:

```javascript
const server = new FlightServer({
  host: '0.0.0.0',
  port: 8080,
  maxReceiveMessageLength: 500 * 1024 * 1024,  // 500MB
  maxSendMessageLength: 500 * 1024 * 1024,     // 500MB
});
```

### CSV Service Configuration

For large CSV files:

```javascript
const csvService = new CSVFlightService({
  dataDirectory: './data',
  batchSize: 100000,        // Larger batches for better performance
  delimiter: ',',
  headers: true,
  skipEmptyLines: true,
});
```

### Client Configuration

For reliable connections:

```javascript
const client = new FlightClient({
  host: 'localhost',
  port: 8080,
  retryAttempts: 5,         // More retries for reliability
  retryDelay: 2000,         // Longer delay between retries
  connectionTimeout: 10000,  // Longer timeout
});
```

---

## 🔧 Development Tools

### Debugging

Enable debug logging:

```javascript
const server = new FlightServer({
  port: 8080,
  debug: true  // Enable debug logging
});
```

### Monitoring

Add monitoring hooks:

```javascript
server.on('request', (request) => {
  console.log('Request received:', request.type);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});
```

---

## 📚 Examples

See the `examples/` directory for complete working examples:

- `examples/basic-server/` - Complete server implementation
- `examples/basic-client/` - Complete client implementation

For more examples and use cases, check the [Tutorial]({{ '/tutorial/' | relative_url }}) and [Core Architecture]({{ '/core-architecture/' | relative_url }}) documentation. 