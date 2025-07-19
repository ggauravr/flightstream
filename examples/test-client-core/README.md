# Arrow Flight Test Client (Core Client)

This example demonstrates how to use the `@flightstream/core-client` package to create a comprehensive test client for Arrow Flight servers.

## Overview

The test client showcases the simplicity and power of the `@flightstream/core-client` package compared to raw gRPC implementations. It provides the same functionality as the raw gRPC test client but with:

- **Automatic connection management**
- **Built-in retry logic**
- **Event-driven architecture**
- **Error handling and recovery**
- **Performance benchmarking**

## Features

### Core Functionality
- **Connection Testing**: Validate server connectivity
- **Dataset Discovery**: List available datasets
- **Schema Inspection**: Get dataset schemas
- **Data Retrieval**: Get datasets as Arrow tables
- **Streaming**: Stream datasets as record batches
- **Action Testing**: Execute custom server actions
- **Server Information**: Get detailed server status

### Advanced Features
- **Performance Benchmarking**: Compare table vs streaming performance
- **Error Recovery**: Automatic retry with exponential backoff
- **Connection Monitoring**: Real-time connection state events
- **Memory Management**: Efficient handling of large datasets

## Usage

### Prerequisites

1. **Node.js**: Version 18 or higher
2. **Apache Arrow**: Required for data processing
3. **Flight Server**: A running Arrow Flight server (like the basic-server example)

### Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Start a Flight server** (in another terminal):
```bash
cd ../basic-server
npm start
```

3. **Run the test client**:
```bash
npm start
```

### Configuration

The test client can be configured using environment variables:

```bash
export FLIGHT_HOST=localhost
export FLIGHT_PORT=8080
export FLIGHT_RETRY_ATTEMPTS=3
export FLIGHT_RETRY_DELAY=1000
export FLIGHT_CONNECTION_TIMEOUT=5000
```

## API Reference

### FlightTestClient

The main test client class that wraps the `@flightstream/core-client` functionality.

#### Constructor

```javascript
new FlightTestClient(options)
```

**Options:**
- `host` (string): Server hostname (default: 'localhost')
- `port` (number): Server port (default: 8080)
- `retryAttempts` (number): Number of retry attempts (default: 3)
- `retryDelay` (number): Delay between retries in ms (default: 1000)
- `connectionTimeout` (number): Connection timeout in ms (default: 5000)

#### Methods

##### `testConnection()`
Test the connection to the server.

```javascript
const isConnected = await client.testConnection();
```

##### `listDatasets()`
List available datasets on the server.

```javascript
const datasets = await client.listDatasets();
```

##### `getDatasetInfo(datasetId)`
Get information about a specific dataset.

```javascript
const info = await client.getDatasetInfo('my-dataset');
```

##### `getSchema(datasetId)`
Get the Arrow schema for a dataset.

```javascript
const schema = await client.getSchema('my-dataset');
```

##### `getDataset(datasetId)`
Get a dataset as an Arrow table.

```javascript
const table = await client.getDataset('my-dataset');
```

##### `streamDataset(datasetId)`
Stream a dataset as record batches.

```javascript
for await (const batch of client.streamDataset('my-dataset')) {
  console.log('Batch rows:', batch.numRows);
}
```

##### `listActions()`
List available actions on the server.

```javascript
const actions = await client.listActions();
```

##### `doAction(actionType, actionBody)`
Execute a custom action on the server.

```javascript
const results = await client.doAction('custom-action', { param: 'value' });
```

##### `getServerInfo()`
Get detailed information about the server.

```javascript
const info = await client.getServerInfo();
```

##### `benchmark(datasetId)`
Run performance benchmarks on a dataset.

```javascript
await client.benchmark('my-dataset');
```

##### `disconnect()`
Disconnect from the server.

```javascript
await client.disconnect();
```

##### `runTestSuite()`
Run a complete test suite.

```javascript
await client.runTestSuite();
```

## Events

The test client emits the following events:

- `connecting`: Emitted when attempting to connect
- `connected`: Emitted when successfully connected
- `disconnecting`: Emitted when disconnecting
- `disconnected`: Emitted when disconnected
- `connectionError`: Emitted when connection fails

```javascript
client.on('connected', () => {
  console.log('Successfully connected to server');
});

client.on('connectionError', (error) => {
  console.error('Connection failed:', error.message);
});
```

## Comparison with Raw gRPC

### Raw gRPC Implementation
```javascript
// Complex setup
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import * as arrow from 'apache-arrow';

// Manual client initialization
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {...});
const flightProto = grpc.loadPackageDefinition(packageDefinition);
const client = new flightProto.FlightService(address, credentials);

// Manual connection management
// Manual error handling
// Manual retry logic
// Manual data serialization/deserialization
```

### Core Client Implementation
```javascript
// Simple setup
import { FlightClient } from '@flightstream/core-client';

// Automatic client initialization
const client = new FlightClient({ host: 'localhost', port: 8080 });

// Automatic connection management
await client.connect();

// Simple API calls
const datasets = await client.listDatasets();
const table = await client.getDataset('my-dataset');

// Automatic error handling and retry
await client.disconnect();
```

## Performance Features

### Benchmarking
The test client includes built-in performance benchmarking:

```javascript
await client.benchmark('my-dataset');
```

This will:
- Test table retrieval performance
- Test streaming performance
- Compare throughput rates
- Provide performance recommendations

### Memory Management
- **Efficient Streaming**: Process large datasets without loading everything into memory
- **Batch Processing**: Handle data in manageable chunks
- **Automatic Cleanup**: Proper resource management

## Error Handling

The test client includes robust error handling:

```javascript
try {
  const table = await client.getDataset('my-dataset');
} catch (error) {
  if (error.message.includes('UNAVAILABLE')) {
    console.log('Server is unavailable, retrying...');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection Failed**:
   - Ensure the Flight server is running
   - Check host and port configuration
   - Verify network connectivity

2. **No Datasets Found**:
   - Ensure CSV files are in the server's data directory
   - Check file permissions
   - Verify CSV format

3. **Performance Issues**:
   - Use streaming for large datasets
   - Monitor memory usage
   - Consider adjusting batch sizes

### Debug Mode

Enable debug logging:

```javascript
const client = new FlightTestClient({
  logger: {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error
  }
});
```

## Examples

### Basic Testing
```javascript
const client = new FlightTestClient();

try {
  await client.runTestSuite();
} finally {
  await client.disconnect();
}
```

### Custom Testing
```javascript
const client = new FlightTestClient();

try {
  await client.connect();
  
  const datasets = await client.listDatasets();
  if (datasets.length > 0) {
    const datasetId = datasets[0].id;
    
    // Test specific functionality
    await client.getDatasetInfo(datasetId);
    await client.getSchema(datasetId);
    await client.benchmark(datasetId);
  }
} finally {
  await client.disconnect();
}
```

## Contributing

When contributing to this test client:

1. **Follow the existing patterns** for structure and naming
2. **Add comprehensive error handling** for new features
3. **Include performance considerations** for large datasets
4. **Test thoroughly** with different server configurations
5. **Update documentation** when adding new features

This test client serves as both a demonstration of the `@flightstream/core-client` package capabilities and a practical tool for validating Arrow Flight server functionality. 