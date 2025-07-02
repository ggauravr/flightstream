---
layout: page
title: Getting Started
permalink: /getting-started/
---

# Getting Started with FlightStream

This guide will help you get started with FlightStream's alpha release. FlightStream is a high-performance Apache Arrow Flight streaming framework for Node.js.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Basic understanding of Apache Arrow and gRPC concepts

## Quick Start

### 1. Install FlightStream Packages

```bash
# Install core server framework (alpha)
npm install @flightstream/core-server@alpha

# Install CSV adapter for data sources
npm install @flightstream/adapters-csv@alpha

# Install Arrow utilities
npm install @flightstream/utils-arrow@alpha
```

### 2. Create a Simple Flight Server

#### Option A: Create Your Own Server

Create a file called `server.js`:

```javascript
import { FlightServer } from '@flightstream/core-server';
import { CSVFlightService } from '@flightstream/adapters-csv';

async function main() {
  // Create a Flight server
  const server = new FlightServer({ 
    port: 8080,
    host: 'localhost'
  });

  // Create a CSV service that serves data from a directory
  const csvService = new CSVFlightService({
    dataDirectory: './data'  // Directory containing CSV files
  });

  // Register the service with the server
  server.setFlightService(csvService);

  // Start the server
  await server.start();
  
  console.log('FlightStream server running on localhost:8080');
  console.log('Available datasets:');
  
  // List available datasets
  const datasets = await csvService.listDatasets();
  datasets.forEach(dataset => {
    console.log(`  - ${dataset.name} (${dataset.recordCount} records)`);
  });
}

main().catch(console.error);
```

#### Option B: Use the Sample Server (Recommended for Quick Start)

FlightStream includes a sample server that you can run immediately:

```bash
# Clone the FlightStream repository
git clone https://github.com/ggauravr/flightstream.git
cd flightstream

# Install dependencies
npm install

# Start the sample server
npm start
```

The sample server will:
- Automatically discover CSV files in the `data/` directory
- Start on `localhost:8080`
- Serve the first dataset found in Apache Arrow format
- Display available datasets in the console

**Sample server location**: `packages/examples/server/basic-server/index.js`

### 3. Prepare Your Data

Create a `data` directory and add some CSV files:

```bash
mkdir data
# Add your CSV files to the data directory
```

### 4. Run the Server

```bash
node server.js
```

### 5. Test with a Client

#### Option A: Use Any Arrow Flight Client

You can test the server using any Arrow Flight client. Here's a simple example using Python:

```python
import pyarrow.flight as flight

# Connect to the server
client = flight.FlightClient('grpc://localhost:8080')

# List available flights
flights = client.list_flights()
for flight_info in flights:
    print(f"Flight: {flight_info.descriptor}")

# Get data from a specific flight
flight_info = client.get_flight_info(flight.FlightDescriptor.for_path("your-dataset.csv"))
reader = client.do_get(flight_info.endpoints[0].ticket)
table = reader.read_all()
print(table)
```

#### Option B: Use the Sample Client (Recommended for Quick Start)

FlightStream includes a sample client that you can run to test the server:

```bash
# In a new terminal, from the FlightStream directory
npm test
```

The sample client will:
- Connect to the running server on `localhost:8080`
- List all available datasets
- Stream data from the first available dataset
- Display statistics about the received data

**Sample client location**: `packages/examples/server/test-client/test-client.js`

#### Option C: Use the Built-in Test Client

If you're running the sample server, you can also use the built-in test client:

```bash
# Start the server in one terminal
npm start

# In another terminal, run the test client
node packages/examples/server/test-client/test-client.js
```

## Working with Arrow Data

### Using Arrow Utilities

```javascript
import { ArrowBuilder, inferSchema } from '@flightstream/utils-arrow';

// Infer schema from CSV data
const schema = await inferSchema('./data/sample.csv');
console.log('Inferred schema:', schema);

// Build Arrow data
const builder = new ArrowBuilder();
const table = await builder.fromCSV('./data/sample.csv');
console.log('Arrow table:', table);
```

### Streaming Data

```javascript
import { streamingUtils } from '@flightstream/utils-arrow';

// Create a streaming pipeline
const stream = streamingUtils.createStreamFromCSV('./data/large-file.csv');

stream.on('data', (batch) => {
  console.log('Received batch:', batch.numRows, 'rows');
});

stream.on('end', () => {
  console.log('Stream completed');
});
```

## Configuration Options

### Server Configuration

```javascript
const server = new FlightServer({
  port: 8080,
  host: 'localhost',
  maxConcurrentStreams: 100,
  keepAliveTimeMs: 30000,
  keepAliveTimeoutMs: 5000
});
```

### CSV Service Configuration

```javascript
const csvService = new CSVFlightService({
  dataDirectory: './data',
  maxBatchSize: 10000,
  enableCaching: true,
  cacheSize: 1000
});
```

## Error Handling

### Basic Error Handling

```javascript
try {
  await server.start();
} catch (error) {
  console.error('Failed to start server:', error.message);
  process.exit(1);
}

// Handle service errors
csvService.on('error', (error) => {
  console.error('CSV service error:', error);
});
```

## Development Tips

### Debugging

Enable debug logging:

```javascript
import { FlightServer } from '@flightstream/core-server';

const server = new FlightServer({
  port: 8080,
  debug: true  // Enable debug logging
});
```


## Next Steps

### What to Try Next

1. **Add More Data Sources**: Try different CSV files with various schemas
2. **Performance Testing**: Test with larger datasets to understand performance characteristics
3. **Client Integration**: Build a custom client using Arrow Flight protocol
4. **Plugin Development**: Create custom data source adapters

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check the API reference for detailed information
- **Examples**: Explore the examples directory for more use cases

### Contributing

FlightStream is in alpha, and we welcome contributions! See the [Contributing Guide](../CONTRIBUTING.md) for details.

## Troubleshooting

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/ggauravr/flightstream/issues)
2. Create a new issue with detailed information
3. Include error messages, system information, and steps to reproduce

---

**Note**: This is an alpha release. APIs may change, and some features are not yet implemented. For production use, consider waiting for the stable release. 