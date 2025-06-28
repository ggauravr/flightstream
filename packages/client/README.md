# @flightstream/client

Framework-agnostic client library for connecting to FlightStream Arrow Flight servers from browser applications.

## Features

- 🌐 **Framework Agnostic**: Works with React, Vue, Svelte, Angular, or vanilla JavaScript
- 🔄 **Real-time Streaming**: Efficient streaming of large datasets using Arrow Flight protocol
- 🏃‍♂️ **High Performance**: Built on Apache Arrow for optimal data processing
- 🔒 **Type Safe**: Full TypeScript support with comprehensive type definitions
- 🌍 **Browser Compatible**: Uses gRPC-Web for browser-native Flight connections
- 📊 **Flexible Data Formats**: Support for multiple output formats (JSON, CSV, Arrow, Columnar)
- 🔧 **Configurable**: Extensive configuration options for different use cases
- 📈 **Observable**: Built-in statistics and monitoring capabilities

## Installation

```bash
npm install @flightstream/client
```

## Quick Start

### Basic Usage

```javascript
import { FlightClient } from '@flightstream/client';

// Create client instance
const client = new FlightClient({
  endpoint: 'http://localhost:8080'
});

// Connect to server
await client.connect();

// List available datasets
const datasets = await client.listFlights();
console.log('Available datasets:', datasets);

// Get data as complete dataset
const data = await client.getData('my-dataset');
console.log('Retrieved data:', data);
```

### Streaming Data

```javascript
// Stream data in real-time
const stream = client.getStream('large-dataset');

stream.on('data', (batch) => {
  console.log('Received batch:', batch.numRows, 'rows');
  // Process batch data
  batch.data.forEach(row => {
    // Handle each row
  });
});

stream.on('end', () => {
  console.log('Stream completed');
});

stream.on('error', (error) => {
  console.error('Stream error:', error);
});
```

### Framework Integration

#### React

```jsx
import React, { useState, useEffect } from 'react';
import { FlightClient } from '@flightstream/client';

function DataViewer() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = new FlightClient({
      endpoint: 'http://localhost:8080'
    });

    const loadData = async () => {
      try {
        await client.connect();
        const result = await client.getData('my-dataset');
        setData(result);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      client.disconnect();
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Dataset ({data.length} rows)</h2>
      <table>
        {/* Render data */}
      </table>
    </div>
  );
}
```

#### Vue

```vue
<template>
  <div>
    <h2>Dataset ({{ data.length }} rows)</h2>
    <div v-if="loading">Loading...</div>
    <table v-else>
      <!-- Render data -->
    </table>
  </div>
</template>

<script>
import { FlightClient } from '@flightstream/client';

export default {
  data() {
    return {
      data: [],
      loading: true,
      client: null
    };
  },

  async mounted() {
    this.client = new FlightClient({
      endpoint: 'http://localhost:8080'
    });

    try {
      await this.client.connect();
      this.data = await this.client.getData('my-dataset');
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      this.loading = false;
    }
  },

  beforeDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }
};
</script>
```

## API Reference

### FlightClient

The main client class for connecting to Arrow Flight servers.

#### Constructor

```javascript
const client = new FlightClient(options);
```

**Options:**
- `endpoint` (string, required): Flight server endpoint URL
- `timeout` (number, default: 30000): Request timeout in milliseconds
- `headers` (object, default: {}): Default headers for requests
- `enableCompression` (boolean, default: true): Enable gRPC compression
- `enableRetry` (boolean, default: true): Enable automatic retry on failures
- `maxRetries` (number, default: 3): Maximum retry attempts
- `onError` (function): Global error handler
- `onConnect` (function): Connection established callback
- `onDisconnect` (function): Connection lost callback

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

##### `listFlights(criteria?)`

List available flights (datasets) on the server.

```javascript
const flights = await client.listFlights();
// or with criteria
const filteredFlights = await client.listFlights({ pattern: 'sales*' });
```

##### `getFlightInfo(descriptor)`

Get information about a specific flight.

```javascript
const info = await client.getFlightInfo('my-dataset');
console.log('Schema:', info.schema);
console.log('Total records:', info.totalRecords);
```

##### `getSchema(descriptor)`

Get schema information for a specific flight.

```javascript
const schema = await client.getSchema('my-dataset');
console.log('Fields:', schema.fields);
```

##### `getStream(descriptor, options?)`

Create a data stream for a specific flight.

```javascript
const stream = client.getStream('my-dataset', {
  batchSize: 1000,
  autoStart: true
});
```

**Stream Options:**
- `batchSize` (number): Preferred batch size
- `autoStart` (boolean, default: true): Auto-start the stream
- `timeout` (number): Stream timeout

##### `getData(descriptor, options?)`

Get complete dataset as an array of objects.

```javascript
const data = await client.getData('my-dataset', {
  maxBatches: 10,
  timeout: 60000
});
```

**Options:**
- `maxBatches` (number): Maximum batches to collect
- `timeout` (number): Collection timeout

##### `query(sql, options?)`

Execute a SQL query and return results.

```javascript
const results = await client.query('SELECT * FROM my_table WHERE id > 100');
```

### FlightDataStream

Event-driven stream for receiving Flight data.

#### Events

- `start`: Stream started
- `data`: Data batch received
- `end`: Stream completed
- `error`: Stream error occurred
- `pause`: Stream paused
- `resume`: Stream resumed
- `cancel`: Stream cancelled

#### Methods

- `start()`: Start the stream
- `pause()`: Pause the stream
- `resume()`: Resume the stream
- `cancel()`: Cancel the stream
- `getStats()`: Get stream statistics
- `getState()`: Get current stream state

## Configuration

### Authentication

```javascript
const client = new FlightClient({
  endpoint: 'https://secure-flight-server.com',
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
});
```

### Custom Headers

```javascript
const client = new FlightClient({
  endpoint: 'http://localhost:8080',
  headers: {
    'X-Custom-Header': 'custom-value',
    'X-API-Version': '1.0'
  }
});
```

### Retry Configuration

```javascript
const client = new FlightClient({
  endpoint: 'http://localhost:8080',
  enableRetry: true,
  maxRetries: 5,
  timeout: 60000
});
```

## Error Handling

The library provides specific error types for different scenarios:

```javascript
import { FlightClientError, ConnectionError, DataError } from '@flightstream/client';

try {
  await client.connect();
} catch (error) {
  if (error instanceof ConnectionError) {
    console.error('Connection failed:', error.message);
  } else if (error instanceof DataError) {
    console.error('Data processing error:', error.message);
  } else {
    console.error('General error:', error.message);
  }
}
```

## Data Formats

### Output Formats

Convert data to different formats:

```javascript
const data = await client.getData('my-dataset');

// Convert to CSV
const csv = dataHandler.convertToFormat(data, 'csv');

// Convert to columnar format
const columnar = dataHandler.convertToFormat(data, 'columnar');

// Convert to Arrow Table
const arrowTable = dataHandler.convertToFormat(data, 'arrow');
```

### Schema Information

Access schema details:

```javascript
const schema = await client.getSchema('my-dataset');

schema.fields.forEach(field => {
  console.log(`Field: ${field.name}, Type: ${field.type}, Nullable: ${field.nullable}`);
});
```

## Performance Considerations

### Streaming vs Batch Loading

- Use streaming for large datasets that don't fit in memory
- Use `getData()` for smaller datasets that need to be processed as a whole
- Configure appropriate batch sizes for optimal performance

### Connection Management

- Reuse client instances when possible
- Properly disconnect when done to free resources
- Use connection pooling for multiple concurrent requests

### Memory Management

- Process streaming data in chunks to avoid memory issues
- Monitor stream statistics to track performance
- Cancel streams when no longer needed

## Examples

See the `examples/` directory for complete integration examples:

- React dashboard with real-time data streaming
- Vue.js data visualization components
- Vanilla JavaScript analytics application
- Node.js server-side data processing

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Requirements

- Modern browser with ES2020 support
- gRPC-Web proxy on the server side (e.g., Envoy)
- FlightStream or compatible Arrow Flight server

## License

Apache-2.0 - see [LICENSE](LICENSE) file for details.

## Contributing

Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/your-org/flightstream/issues)
- Documentation: [Full API documentation](https://flightstream.dev/docs)
- Examples: [Integration examples](https://github.com/your-org/flightstream/tree/main/examples) 