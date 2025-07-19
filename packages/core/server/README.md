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
- `maxReceiveMessageLength` (number) - Max message size for receiving
- `maxSendMessageLength` (number) - Max message size for sending

#### Instance Methods

- `setFlightService(flightService)` - Set the Flight service adapter
- `start()` - Start the server
- `stop()` - Stop the server gracefully
- `getServerInfo()` - Get server information
- `isRunning()` - Check if server is running

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
  }
  
  async _streamDataset(call, dataset) {
    // Stream dataset data
  }
}
```

## Examples

See the `examples/` directory for complete working examples.

## Contributing

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for development guidelines. 