# @flightstream/core-client

Core Apache Arrow Flight client framework for Node.js

This package provides a simple and powerful interface for connecting to Arrow Flight servers, with automatic connection management, retry logic, and efficient data streaming.

## Features

- **Simple API**: Easy-to-use interface for connecting to Arrow Flight servers
- **Automatic Connection Management**: Handles connection lifecycle with retry logic
- **Efficient Streaming**: Memory-efficient streaming of large datasets
- **Error Handling**: Robust error handling with configurable retry strategies
- **Event-driven**: Built-in event system for connection state changes
- **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
npm install @flightstream/core-client
```

**Note**: This package requires `apache-arrow` as a peer dependency:

```bash
npm install apache-arrow
```

## Quick Start

```javascript
import { FlightClient } from '@flightstream/core-client';

// Create a client
const client = new FlightClient({
  host: 'localhost',
  port: 8080
});

// Connect to the server
await client.connect();

// List available datasets
const datasets = await client.listDatasets();
console.log('Available datasets:', datasets);

// Get data as Arrow table
const table = await client.getDataset('my-dataset');
console.log('Rows:', table.numRows);

// Disconnect when done
await client.disconnect();
```

## API Reference

### FlightClient

The main client class for connecting to Arrow Flight servers.

#### Constructor

```javascript
new FlightClient(options)
```

**Options:**
- `host` (string): Server hostname (default: 'localhost')
- `port` (number): Server port (default: 8080)
- `retryAttempts` (number): Number of retry attempts (default: 3)
- `retryDelay` (number): Delay between retries in ms (default: 1000)
- `connectionTimeout` (number): Connection timeout in ms (default: 5000)
- `maxReceiveMessageLength` (number): Max message size (default: 100MB)
- `maxSendMessageLength` (number): Max message size (default: 100MB)
- `logger` (object): Logger instance (default: console)

#### Methods

##### `connect()`
Connect to the Flight server.

```javascript
await client.connect();
```

##### `disconnect()`
Disconnect from the Flight server.

```javascript
await client.disconnect();
```

##### `listDatasets()`
Get a list of available datasets.

```javascript
const datasets = await client.listDatasets();
// Returns: [{ id: 'dataset1', description: '...', totalRecords: 1000, totalBytes: 1024 }]
```

##### `getDatasetInfo(datasetId)`
Get information about a specific dataset.

```javascript
const info = await client.getDatasetInfo('my-dataset');
// Returns: { id: 'my-dataset', totalRecords: 1000, totalBytes: 1024, schema: {...} }
```

##### `getSchema(datasetId)`
Get the Arrow schema for a dataset.

```javascript
const schema = await client.getSchema('my-dataset');
console.log('Fields:', schema.fields.map(f => f.name));
```

##### `getDataset(datasetId)`
Get a dataset as an Arrow table.

```javascript
const table = await client.getDataset('my-dataset');
console.log('Rows:', table.numRows);
console.log('Columns:', table.numCols);
```

##### `streamDataset(datasetId)`
Stream a dataset as record batches.

```javascript
for await (const batch of client.streamDataset('my-dataset')) {
  console.log('Batch rows:', batch.numRows);
  // Process each record batch
}
```

##### `doAction(actionType, actionBody)`
Execute a custom action on the server.

```javascript
const results = await client.doAction('custom-action', { param: 'value' });
```

##### `listActions()`
Get a list of available actions.

```javascript
const actions = await client.listActions();
// Returns: [{ type: 'action1', description: '...' }]
```

##### `getServerInfo()`
Get detailed information about the server.

```javascript
const info = await client.getServerInfo();
console.log('Connection:', info.connection);
console.log('Datasets:', info.datasets.count);
console.log('Actions:', info.actions.count);
```

##### `testConnection()`
Test the connection to the server.

```javascript
const isConnected = await client.testConnection();
console.log('Connected:', isConnected);
```

#### Events

The client extends EventEmitter and emits the following events:

- `connecting`: Emitted when attempting to connect
- `connected`: Emitted when successfully connected
- `disconnecting`: Emitted when disconnecting
- `disconnected`: Emitted when disconnected
- `connectionError`: Emitted when connection fails
- `disconnectError`: Emitted when disconnection fails

```javascript
client.on('connected', () => {
  console.log('Successfully connected to server');
});

client.on('connectionError', (error) => {
  console.error('Connection failed:', error);
});
```

## Advanced Usage

### Streaming Large Datasets

For large datasets, use streaming to manage memory efficiently:

```javascript
let totalRows = 0;
for await (const batch of client.streamDataset('large-dataset')) {
  totalRows += batch.numRows;
  
  // Process each batch
  for (let i = 0; i < batch.numRows; i++) {
    const row = {};
    batch.schema.fields.forEach((field, colIndex) => {
      const column = batch.getChildAt(colIndex);
      row[field.name] = column.get(i);
    });
    // Process row...
  }
}
```

### Error Handling

The client includes robust error handling with automatic retries:

```javascript
try {
  const table = await client.getDataset('my-dataset');
  // Process data...
} catch (error) {
  if (error.message.includes('UNAVAILABLE')) {
    console.log('Server is unavailable, retrying...');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Custom Configuration

```javascript
const client = new FlightClient({
  host: 'flight-server.example.com',
  port: 9090,
  retryAttempts: 5,
  retryDelay: 2000,
  connectionTimeout: 10000,
  maxReceiveMessageLength: 200 * 1024 * 1024, // 200MB
  logger: {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  }
});
```

## Examples

### Basic Data Access

```javascript
import { FlightClient } from '@flightstream/core-client';

async function main() {
  const client = new FlightClient();
  
  try {
    await client.connect();
    
    // List available datasets
    const datasets = await client.listDatasets();
    console.log('Available datasets:', datasets.map(d => d.id));
    
    if (datasets.length > 0) {
      const datasetId = datasets[0].id;
      
      // Get dataset info
      const info = await client.getDatasetInfo(datasetId);
      console.log(`Dataset ${datasetId}: ${info.totalRecords} rows`);
      
      // Get schema
      const schema = await client.getSchema(datasetId);
      console.log('Schema fields:', schema.fields.map(f => f.name));
      
      // Get data
      const table = await client.getDataset(datasetId);
      console.log(`Retrieved ${table.numRows} rows`);
    }
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
```

### Streaming Processing

```javascript
import { FlightClient } from '@flightstream/core-client';

async function processLargeDataset() {
  const client = new FlightClient();
  
  try {
    await client.connect();
    
    let processedRows = 0;
    const startTime = Date.now();
    
    for await (const batch of client.streamDataset('large-dataset')) {
      // Process each batch
      for (let i = 0; i < batch.numRows; i++) {
        const row = {};
        batch.schema.fields.forEach((field, colIndex) => {
          const column = batch.getChildAt(colIndex);
          row[field.name] = column.get(i);
        });
        
        // Process row...
        processedRows++;
      }
      
      console.log(`Processed ${processedRows} rows so far`);
    }
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`Completed processing ${processedRows} rows in ${duration}s`);
  } finally {
    await client.disconnect();
  }
}
```

## Troubleshooting

### Connection Issues

If you're having trouble connecting:

1. **Check server status**: Ensure the Arrow Flight server is running
2. **Verify host/port**: Confirm the correct host and port
3. **Network connectivity**: Check if the server is reachable
4. **Firewall settings**: Ensure the port is not blocked

```javascript
// Test connection
const isConnected = await client.testConnection();
if (!isConnected) {
  console.log('Cannot connect to server');
}
```

### Performance Issues

For large datasets:

1. **Use streaming**: Instead of `getDataset()`, use `streamDataset()`
2. **Process in chunks**: Handle data in manageable batches
3. **Monitor memory**: Watch for memory usage patterns
4. **Adjust timeouts**: Increase timeouts for large data transfers

### Error Handling

Common error patterns:

```javascript
client.on('connectionError', (error) => {
  if (error.code === 'ECONNREFUSED') {
    console.log('Server is not running');
  } else if (error.code === 'ETIMEDOUT') {
    console.log('Connection timeout - check network');
  }
});
```

## Contributing

See the main project [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details. 