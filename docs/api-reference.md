---
layout: page
title: API Reference
permalink: /api-reference/
---

# 📋 API Reference

Complete API documentation for all packages in the Arrow Flight Server Node.js framework.

## 🏗️ Core Package (@flightstream/core)

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

### FlightServiceBase Class

Abstract base class for implementing Flight service adapters for custom data sources

#### Constructor

```javascript
new FlightServiceBase(options)
```

**Parameters:**
- `options.host` (string, default: 'localhost') - Service host
- `options.port` (number, default: 8080) - Service port

#### Abstract Methods

These methods must be implemented by subclasses:

##### `_initialize()`
Initialize the service and discover datasets.

**Returns:** `Promise<void>`

##### `_initializeDatasets()`  
Discover and register datasets from the data source.

**Returns:** `Promise<void>`

##### `_inferSchemaForDataset(datasetId)`
Infer Arrow schema from a dataset.

**Parameters:**
- `datasetId` (string) - Dataset identifier

**Returns:** `Promise<Object>` - Arrow schema

##### `_streamDataset(call, dataset)`
Stream dataset data as Arrow record batches.

**Parameters:**
- `call` (Object) - gRPC call object
- `dataset` (Object) - Dataset metadata

**Returns:** `Promise<void>`

#### Implemented Methods

##### `listFlights(call)`
Flight protocol implementation for listing available datasets.

##### `getFlightInfo(call)`
Flight protocol implementation for getting dataset information.

##### `getSchema(call)`
Flight protocol implementation for getting dataset schema.

##### `doGet(call)`
Flight protocol implementation for streaming dataset data.

#### Properties

##### `datasets` (Map)
Registry of discovered datasets. Each entry contains:
- `id` (string) - Dataset identifier
- `schema` (Object) - Arrow schema
- `metadata` (Object) - Additional metadata

**Example:**
```javascript
class MyAdapter extends FlightServiceBase {
  async _initialize() {
    this.datasets.set('mydata', {
      id: 'mydata',
      schema: arrowSchema,
      metadata: { 
        type: 'custom',
        totalRecords: 1000
      }
    });
  }
}
```

---

## 📊 CSV Service Package (@flightstream/csv-service)

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

##### `getDatasets()`
Get list of discovered dataset IDs.

**Returns:** `string[]` - Array of dataset IDs

##### `hasDataset(datasetId)`
Check if a dataset exists.

**Parameters:**
- `datasetId` (string) - Dataset ID to check

**Returns:** `boolean`

##### `refreshDatasets()`
Re-scan the data directory for new CSV files.

**Returns:** `Promise<void>`

##### `getCSVStats()`
Get CSV-specific statistics.

**Returns:** `Object` - Statistics object

**Example:**
```javascript
const stats = csvService.getCSVStats();
console.log(`Processing ${stats.filesProcessed} CSV files`);
```

---

### CSVStreamer Class

Low-level CSV streaming utility.

#### Constructor

```javascript
new CSVStreamer(filePath, options)
```

**Parameters:**
- `filePath` (string) - Path to CSV file
- `options.batchSize` (number, default: 10000) - Records per batch
- `options.delimiter` (string, default: ',') - CSV delimiter
- `options.headers` (boolean, default: true) - First row contains headers
- `options.skipEmptyLines` (boolean, default: true) - Skip empty rows

#### Methods

##### `start()`
Start streaming the CSV file.

**Returns:** `Promise<void>`

##### `stop()`
Stop streaming.

**Returns:** `void`

#### Events

##### `'schema'`
Emitted when CSV schema is inferred.

**Callback:** `(schema) => void`
- `schema` (Object) - Inferred schema

##### `'batch'`
Emitted for each batch of CSV data.

**Callback:** `(batch) => void`
- `batch` (Array) - Array of CSV rows

##### `'end'`
Emitted when streaming completes.

##### `'error'`
Emitted on errors.

**Callback:** `(error) => void`

**Example:**
```javascript
const streamer = new CSVStreamer('./data.csv', { batchSize: 5000 });

streamer.on('schema', (schema) => {
  console.log('Schema:', schema);
});

streamer.on('batch', (batch) => {
  console.log(`Received ${batch.length} rows`);
});

await streamer.start();
```

---

### CSVArrowBuilder Class

CSV-specific Arrow builder that extends the abstract `ArrowBuilder` class.

#### Constructor

```javascript
new CSVArrowBuilder(csvSchema, options)
```

**Parameters:**
- `csvSchema` (Object) - Schema mapping column names to CSV types
- `options.recordBatchSize` (number, default: 65536) - Default batch size
- `options.nullValue` (any, default: null) - Value to use for nulls

**Example:**
```javascript
import { CSVArrowBuilder } from '@flightstream/csv-service';

const csvSchema = {
  id: 'int64',
  name: 'string', 
  price: 'float64',
  active: 'boolean'
};

const builder = new CSVArrowBuilder(csvSchema);
```

#### Methods

##### `getSchema()`
Get the Arrow schema object.

**Returns:** `arrow.Schema` - Arrow schema

##### `createRecordBatch(csvRows)`
Convert CSV row objects to Arrow RecordBatch.

**Parameters:**
- `csvRows` (Array) - Array of CSV row objects

**Returns:** `arrow.RecordBatch` - Arrow record batch

##### `createRecordBatchFromCSVRows(csvRows)`
Alias for `createRecordBatch` for clarity.

**Parameters:**
- `csvRows` (Array) - Array of CSV row objects

**Returns:** `arrow.RecordBatch` - Arrow record batch

##### `validateCSVRow(csvRow)`
Validate a CSV row against the expected schema.

**Parameters:**
- `csvRow` (Object) - CSV row object

**Returns:** `boolean` - Whether the row is valid

##### `getCSVSchema()`
Get the original CSV schema.

**Returns:** `Object` - CSV schema object

##### `getCSVStats(csvRows)`
Get CSV-specific statistics.

**Parameters:**
- `csvRows` (Array) - CSV rows to analyze

**Returns:** `Object` - Statistics object

**Example:**
```javascript
const builder = new CSVArrowBuilder({ id: 'int64', name: 'string' });
const batch = builder.createRecordBatch([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);
```

---

## 🔧 Utils Package (@flightstream/utils)

### ArrowBuilder Class (Abstract)

Abstract base class for building Arrow data structures from various data sources. This class cannot be instantiated directly and must be extended by concrete implementations.

#### Constructor

```javascript
new ArrowBuilder(sourceSchema, options)
```

**Parameters:**
- `sourceSchema` (Object) - Schema in source-specific format
- `options.recordBatchSize` (number, default: 65536) - Default batch size
- `options.nullValue` (any, default: null) - Value to use for nulls

**Note:** This class is abstract and cannot be instantiated directly. Use concrete implementations like `CSVArrowBuilder`.

#### Abstract Methods

These methods must be implemented by subclasses:

##### `_buildArrowSchema()`
Build Arrow schema from source-specific schema format.

**Returns:** `void` - Sets `this.arrowSchema`

##### `_transformDataToColumns(sourceData)`
Transform source data format to column arrays.

**Parameters:**
- `sourceData` (any) - Data in source-specific format

**Returns:** `Object` - Column data as `{ columnName: [values...] }`

##### `_mapSourceTypeToArrow(sourceType)`
Map source-specific type to Arrow type.

**Parameters:**
- `sourceType` (string) - Type name in source format

**Returns:** `arrow.DataType` - Arrow data type

#### Implemented Methods

##### `getSchema()`
Get the Arrow schema object.

**Returns:** `arrow.Schema` - Arrow schema

##### `createRecordBatch(sourceData)`
Convert source data to Arrow RecordBatch using abstract methods.

**Parameters:**
- `sourceData` (any) - Data in source-specific format

**Returns:** `arrow.RecordBatch` - Arrow record batch

##### `createRecordBatchFromColumns(columnData)`
Create record batch from column data arrays.

**Parameters:**
- `columnData` (Object) - Column data as `{ columnName: [values...] }`

**Returns:** `arrow.RecordBatch` - Arrow record batch

##### `createTable(recordBatches)`
Create Arrow Table from record batches.

**Parameters:**
- `recordBatches` (Array) - Array of RecordBatch objects

**Returns:** `arrow.Table` - Arrow table

##### `serializeRecordBatch(recordBatch)`
Serialize RecordBatch for Flight protocol.

**Parameters:**
- `recordBatch` (arrow.RecordBatch) - Record batch to serialize

**Returns:** `Buffer` - Serialized record batch

##### `serializeSchema()`
Serialize schema for Flight protocol.

**Returns:** `Buffer` - Serialized schema

##### `getStats(recordBatch)`
Get statistics for a record batch.

**Parameters:**
- `recordBatch` (arrow.RecordBatch) - Record batch

**Returns:** `Object` - Statistics

**Example:**
```javascript
import { ArrowBuilder } from '@flightstream/utils';

// Cannot instantiate directly - this would throw an error:
// const builder = new ArrowBuilder(schema); // ERROR!

// Instead, use a concrete implementation:
import { CSVArrowBuilder } from '@flightstream/csv-service';
const builder = new CSVArrowBuilder(csvSchema);
```

---

### Schema Inference Functions

#### `inferSchema(data, options)`
Automatically infer schema from sample data.

**Parameters:**
- `data` (Array) - Sample data rows
- `options.sampleSize` (number, default: 100) - Rows to sample
- `options.nullThreshold` (number, default: 0.1) - Null ratio threshold

**Returns:** `Object` - Inferred schema

**Example:**
```javascript
import { inferSchema } from '@flightstream/utils';

const data = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob', active: false }
];

const schema = inferSchema(data);
// Returns: { id: 'int64', name: 'string', active: 'boolean' }
```

#### `inferCSVSchema(filePath, options)`
Infer schema from CSV file.

**Parameters:**
- `filePath` (string) - Path to CSV file
- `options.sampleRows` (number, default: 100) - Rows to sample
- `options.delimiter` (string, default: ',') - CSV delimiter

**Returns:** `Promise<Object>` - Inferred schema

---

### Streaming Utilities

#### `createBatchStream(source, options)`
Create a batched stream from any data source.

**Parameters:**
- `source` (Iterable) - Data source
- `options.batchSize` (number, default: 1000) - Batch size

**Returns:** `AsyncIterable` - Batched stream

**Example:**
```javascript
import { createBatchStream } from '@flightstream/utils';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const batches = createBatchStream(data, { batchSize: 3 });

for await (const batch of batches) {
  console.log(batch); // [1,2,3], [4,5,6], [7,8,9], [10]
}
```

#### `createFlightStream(recordBatches, descriptor)`
Create Flight-compatible stream from record batches.

**Parameters:**
- `recordBatches` (Iterable) - Record batches
- `descriptor` (Object) - Flight descriptor

**Returns:** `AsyncIterable` - Flight messages

---

## 🔍 Type Mappings

### CSV to Arrow Type Mapping

| CSV Type | Arrow Type | Notes |
|----------|------------|-------|
| `'string'` | `Utf8` | Text data |
| `'int32'` | `Int32` | 32-bit integer numbers |
| `'int64'` | `Int64` | 64-bit integer numbers |
| `'float32'` | `Float32` | 32-bit decimal numbers |
| `'float64'` | `Float64` | 64-bit decimal numbers |
| `'boolean'` | `Bool` | true/false values |
| `'date'` | `DateMillisecond` | Date values |
| `'timestamp'` | `TimestampMillisecond` | Timestamp values |

### JavaScript to Arrow Type Mapping

| JavaScript Type | Arrow Type | Notes |
|-----------------|------------|-------|
| `string` | `Utf8` | Text strings |
| `number` (integer) | `Int64` | Whole numbers |
| `number` (decimal) | `Float64` | Decimal numbers |
| `boolean` | `Bool` | true/false |
| `Date` | `DateMillisecond` | Date objects |
| `BigInt` | `Int64` | Large integers |

---

## 🚨 Error Handling

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `5` | NOT_FOUND | Dataset not found |
| `3` | INVALID_ARGUMENT | Invalid request parameters |
| `16` | UNAUTHENTICATED | Authentication required |
| `7` | PERMISSION_DENIED | Access denied |
| `13` | INTERNAL | Internal server error |

### Error Examples

```javascript
// Dataset not found
const error = new Error('Dataset not found: missing-dataset');
error.code = 5; // NOT_FOUND
throw error;

// Invalid argument
const error = new Error('Invalid batch size: must be > 0');
error.code = 3; // INVALID_ARGUMENT
throw error;
```

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLIGHT_HOST` | `localhost` | Server host |
| `FLIGHT_PORT` | `8080` | Server port |
| `DATA_DIRECTORY` | `./data` | Data directory |
| `CSV_BATCH_SIZE` | `10000` | CSV batch size |
| `CSV_DELIMITER` | `,` | CSV delimiter |
| `CSV_HEADERS` | `true` | CSV has headers |
| `MAX_RECEIVE_MESSAGE_LENGTH` | `104857600` | Max receive size (bytes) |
| `MAX_SEND_MESSAGE_LENGTH` | `104857600` | Max send size (bytes) |

### Performance Tuning

#### Memory Usage
```javascript
// For large datasets, reduce batch size
const csvService = new CSVFlightService({
  batchSize: 5000  // Smaller batches use less memory
});

// Increase Node.js memory limit
// node --max-old-space-size=8192 server.js
```

#### Network Performance
```javascript
// Increase message limits for large transfers
const server = new FlightServer({
  maxReceiveMessageLength: 500 * 1024 * 1024, // 500MB
  maxSendMessageLength: 500 * 1024 * 1024
});
```

#### Disk I/O
```javascript
// Larger batches for better I/O performance
const csvService = new CSVFlightService({
  batchSize: 100000  // Larger batches, fewer I/O operations
});
```

---

## 🧪 Testing Utilities

### Test Client

```javascript
import { FlightClient } from '@flightstream/examples/test-client/test-client';

const client = new FlightClient('localhost', 8080);

// Test server connectivity
await client.testConnection();

// List available datasets
const flights = await client.listFlights();

// Get dataset data
const data = await client.getData('dataset-name');
```

### Mock Services

```javascript
import { FlightServiceBase } from '@flightstream/core';

class MockFlightService extends FlightServiceBase {
  async _initialize() {
    // Add test datasets
    this.datasets.set('test', {
      id: 'test',
      schema: testSchema,
      metadata: { type: 'mock' }
    });
  }

  async _streamDataset(call, dataset) {
    // Return test data
    const testData = [{ id: 1, name: 'test' }];
    // ... stream implementation
  }
}
```

Happy coding with Arrow Flight! 🚀 