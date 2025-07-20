# Arrow Flight Server Core Package

A generic Apache Arrow Flight server framework with plugin architecture for Node.js applications.

## Features

- Generic gRPC server setup with Arrow Flight protocol
- Plugin architecture for data source adapters
- Standard protocol handler delegation
- Configurable server options
- Lifecycle management (start, stop, graceful shutdown)
- **Configurable logging system**

## Quick Start

```javascript
import { FlightServer } from '@flightstream/core-server';
import { MyFlightService } from './my-flight-service.js';

// Create server instance
const server = new FlightServer({
  host: 'localhost',
  port: 8080
});

// Set your flight service
server.setFlightService(new MyFlightService());

// Start the server
await server.start();
```

## Installation

```bash
npm install @flightstream/core-server
```

**Requirements:**
- Node.js >= 18.0.0
- Apache Arrow >= 14.0.0 (peer dependency)

## Logging Configuration

The Flight Server package supports configurable logging. You can set a custom logger once and it will be used throughout the entire package.

### Using a Custom Logger

```javascript
import { FlightServer } from '@flightstream/core-server';
import winston from 'winston';

// Create a custom logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'flight-server.log' }),
    new winston.transports.Console()
  ]
});

// Set the logger for the entire package
FlightServer.setLogger(logger);

// Now all Flight Server components will use your logger
const server = new FlightServer({
  host: 'localhost',
  port: 8080
});
```

### Using the Default Console Logger

If no custom logger is provided, the package defaults to using `console`:

```javascript
import { FlightServer } from '@flightstream/core-server';

// Uses console by default
const server = new FlightServer({
  host: 'localhost',
  port: 8080
});
```

### Logger Interface

Your custom logger should implement these methods:
- `debug(message, meta?)`
- `info(message, meta?)`
- `warn(message, meta?)`
- `error(message, meta?)`

## Configuration Options

**Note:** Data source specific configurations (like CSV settings) should be configured in the respective adapter packages, not in the core server configuration.

### Server Configuration

```javascript
const server = new FlightServer({
  // Connection settings
  host: 'localhost',                    // Server host
  port: 8080,                          // Server port
  
  // Message size limits (100MB default)
  maxReceiveMessageLength: 100 * 1024 * 1024,
  maxSendMessageLength: 100 * 1024 * 1024,
  

  
  // Advanced settings
  keepAlive: true,
  keepAliveTimeout: 20000,
  keepAliveInterval: 10000,
  

  
  // Performance settings
  maxConcurrentRequests: 100,
  requestTimeout: 30000,
  
  // Logging
  logLevel: 'info',
  enableDebugLogging: false,
  
  // Protocol
  protoPath: '/path/to/flight.proto'  // Custom proto file path
});
```

### Environment Variables

The server supports configuration via environment variables:

```bash
# Performance settings
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT=30000

# Logging
LOG_LEVEL=info
DEBUG=false
```

## API Reference

### FlightServer

The main server class that manages the gRPC server and Flight protocol.

#### Static Methods

- `FlightServer.setLogger(logger)` - Set the logger for the entire package

#### Constructor

```javascript
new FlightServer(options)
```

**Options:**
- `host` (string) - Server host (default: 'localhost')
- `port` (number) - Server port (default: 8080)
- `logger` (Object) - Custom logger instance
- `protoPath` (string) - Path to Flight protocol definition
- `maxReceiveMessageLength` (number) - Max message size for receiving (default: 100MB)
- `maxSendMessageLength` (number) - Max message size for sending (default: 100MB)

- `keepAlive` (boolean) - Enable keep-alive (default: true)
- `keepAliveTimeout` (number) - Keep-alive timeout in ms (default: 20000)
- `keepAliveInterval` (number) - Keep-alive interval in ms (default: 10000)

- `maxConcurrentRequests` (number) - Max concurrent requests (default: 100)
- `requestTimeout` (number) - Request timeout in ms (default: 30000)
- `logLevel` (string) - Log level (default: 'info')
- `enableDebugLogging` (boolean) - Enable debug logging (default: false)

#### Instance Methods

- `setFlightService(flightService)` - Set the Flight service adapter
- `start()` - Start the server (returns Promise<number> with port)
- `stop()` - Stop the server gracefully (returns Promise<void>)
- `getServerInfo()` - Get server information
- `isRunning()` - Check if server is running

#### Server Information

The `getServerInfo()` method returns an object with:

```javascript
{
  host: string,                    // Server host
  port: number,                    // Server port
  maxReceiveMessageLength: number, // Max receive message size
  maxSendMessageLength: number,    // Max send message size
  running: boolean,                // Whether server is running
  flightService: string,           // Flight service class name
  datasets: Array<string>          // Available dataset IDs
}
```

### FlightServiceBase

Abstract base class for Flight service implementations.

```javascript
import { FlightServiceBase } from '@flightstream/core-server';

class MyFlightService extends FlightServiceBase {
  async _initialize() {
    // Initialize your service
  }
  
  async _initializeDatasets() {
    // Discover and register datasets
  }
  
  async _inferSchemaForDataset(datasetId) {
    // Infer Arrow schema for dataset
    // Must return an Arrow Schema object
  }
  
  async _streamDataset(call, dataset) {
    // Stream dataset data as Arrow record batches
    // Use call.write() to send data
  }
}
```

#### Abstract Methods

- `_initialize()` - Initialize the service (called automatically)
- `_initializeDatasets()` - Discover and register datasets
- `_inferSchemaForDataset(datasetId)` - Infer Arrow schema for a dataset
- `_streamDataset(call, dataset)` - Stream dataset data

#### Utility Methods

- `getDatasets()` - Get list of available dataset IDs
- `hasDataset(datasetId)` - Check if dataset exists
- `refreshDatasets()` - Refresh dataset discovery

## Error Handling

The server uses standard gRPC error codes:

- `5` (NOT_FOUND) - Dataset not found
- `3` (INVALID_ARGUMENT) - Invalid request
- `14` (UNAVAILABLE) - Service unavailable
- `4` (DEADLINE_EXCEEDED) - Request timeout

## Examples

See the `examples/` directory for complete working examples.

## Contributing

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for development guidelines. 