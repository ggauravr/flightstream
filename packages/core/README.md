# 🚀 @flightstream/core

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Apache Arrow](https://img.shields.io/badge/Apache%20Arrow-%3E%3D14.0.0-orange.svg)](https://arrow.apache.org/)

Core Apache Arrow Flight server framework with plugin architecture for Node.js applications.

## 📋 Overview

The `@flightstream/core` package provides a generic, extensible framework for building Apache Arrow Flight servers in Node.js. It implements the Arrow Flight protocol using gRPC and provides a plugin architecture that allows you to easily add support for different data sources (CSV, Parquet, databases, etc.).

### Key Features

- **Generic Arrow Flight Server**: Complete implementation of the Arrow Flight protocol
- **Plugin Architecture**: Extensible design for data source adapters
- **gRPC Integration**: Built on top of gRPC for high-performance communication
- **Standard Protocol Support**: Full implementation of Arrow Flight RPC methods
- **Lifecycle Management**: Built-in server startup, shutdown, and health monitoring
- **Large Message Support**: Configurable message size limits for data transfer
- **Error Handling**: Comprehensive error handling with gRPC status codes

## 🏗️ Architecture

The core package follows a plugin architecture pattern:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   gRPC Client   │    │   FlightServer   │    │ FlightService   │
│                 │◄──►│                  │◄──►│   (Plugin)      │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │Protocol Handlers │
                       │                  │
                       └──────────────────┘
```

### Components

1. **FlightServer**: The main server class that manages gRPC connections and delegates to service plugins
2. **FlightServiceBase**: Abstract base class that defines the interface for data source plugins
3. **Protocol Handlers**: Standard implementations of Arrow Flight RPC methods
4. **Proto Definitions**: Arrow Flight protocol buffer definitions

## 📦 Installation

```bash
npm install @flightstream/core
```

### Peer Dependencies

This package requires Apache Arrow as a peer dependency:

```bash
npm install apache-arrow
```

## 🚀 Quick Start

### Basic Server Setup

```javascript
import { FlightServer, FlightServiceBase } from '@flightstream/core';

// Create a custom service implementation
class MyDataService extends FlightServiceBase {
  async _initialize() {
    // Initialize your data source
    await this._initializeDatasets();
  }

  async _initializeDatasets() {
    // Register your datasets
    this.datasets.set('my-dataset', {
      schema: /* Arrow schema */,
      metadata: { /* dataset metadata */ }
    });
  }

  async _inferSchemaForDataset(datasetId) {
    // Return Arrow schema for the dataset
    return /* Arrow schema */;
  }

  async _streamDataset(call, dataset) {
    // Stream data to the client
    // Implementation depends on your data source
  }
}

// Create and start the server
async function startServer() {
  const server = new FlightServer({
    host: 'localhost',
    port: 8080
  });

  const service = new MyDataService();
  server.setFlightService(service);

  const port = await server.start();
  console.log(`Server running on port ${port}`);
}

startServer().catch(console.error);
```

### Using with CSV Service

```javascript
import { FlightServer } from '@flightstream/core';
import { CsvFlightService } from '@flightstream/csv-service';

async function startCsvServer() {
  const server = new FlightServer({
    host: 'localhost',
    port: 8080
  });

  const csvService = new CsvFlightService({
    dataDirectory: './data'
  });

  server.setFlightService(csvService);
  
  const port = await server.start();
  console.log(`CSV Flight Server running on port ${port}`);
}
```

## 📚 API Reference

### FlightServer

The main server class that manages gRPC connections and Arrow Flight protocol handling.

#### Constructor

```javascript
new FlightServer(options)
```

**Options:**
- `host` (string): Server hostname (default: 'localhost')
- `port` (number): Server port (default: 8080)
- `maxReceiveMessageLength` (number): Maximum message size in bytes (default: 100MB)
- `maxSendMessageLength` (number): Maximum send message size in bytes (default: 100MB)
- `protoPath` (string): Path to Arrow Flight proto file

#### Methods

##### `setFlightService(flightService)`
Set the Flight service adapter that handles data operations.

**Parameters:**
- `flightService` (FlightServiceBase): Service implementation instance

##### `start()`
Start the Flight server.

**Returns:** Promise<number> - The port the server is listening on

##### `stop()`
Stop the Flight server gracefully.

**Returns:** Promise<void>

##### `isRunning()`
Check if the server is currently running.

**Returns:** boolean

##### `getServerInfo()`
Get server configuration information.

**Returns:** Object with server details

### FlightServiceBase

Abstract base class that defines the interface for Flight service implementations.

#### Constructor

```javascript
new FlightServiceBase(options)
```

**Options:**
- `host` (string): Service hostname
- `port` (number): Service port

#### Abstract Methods (Must be implemented by subclasses)

##### `_initialize()`
Initialize the service and discover datasets.

**Returns:** Promise<void>

##### `_initializeDatasets()`
Discover and register datasets from the data source.

**Returns:** Promise<void>

##### `_inferSchemaForDataset(datasetId)`
Infer Arrow schema from a dataset.

**Parameters:**
- `datasetId` (string): Dataset identifier

**Returns:** Promise<Object> - Arrow schema

##### `_streamDataset(call, dataset)`
Stream dataset data as Arrow record batches.

**Parameters:**
- `call` (Object): gRPC call object
- `dataset` (Object): Dataset metadata

**Returns:** Promise<void>

#### Standard Methods (Provided by base class)

##### `listFlights(call)`
List all available datasets (Arrow Flight protocol).

##### `getFlightInfo(call)`
Get detailed information about a specific dataset.

##### `getSchema(call)`
Get Arrow schema for a dataset.

##### `doGet(call)`
Stream dataset data to client.

##### `listActions(call)`
List available server actions.

##### `doAction(call)`
Execute server actions.

#### Utility Methods

##### `getDatasets()`
Get all registered datasets.

**Returns:** Map<string, Object>

##### `hasDataset(datasetId)`
Check if a dataset exists.

**Parameters:**
- `datasetId` (string): Dataset identifier

**Returns:** boolean

##### `refreshDatasets()`
Refresh the dataset registry.

**Returns:** Promise<void>

## 📡 Arrow Flight Protocol Support

The core package implements the complete Arrow Flight protocol:

### RPC Methods

- **Handshake**: Authentication and protocol negotiation
- **ListFlights**: Discover available datasets
- **GetFlightInfo**: Get dataset metadata
- **GetSchema**: Retrieve Arrow schema
- **DoGet**: Stream data to client
- **DoPut**: Receive data from client
- **DoAction**: Execute custom actions
- **ListActions**: List available actions

### Supported Actions

- `refresh-datasets`: Refresh the dataset registry
- `get-server-info`: Get server information

## 🛡️ Error Handling

The package provides comprehensive error handling with proper gRPC status codes:

- **NOT_FOUND** (5): Dataset not found
- **INVALID_ARGUMENT** (3): Invalid request parameters
- **INTERNAL** (13): Server internal errors
- **UNAVAILABLE** (14): Service unavailable

## ⚙️ Configuration

### Server Configuration

```javascript
const server = new FlightServer({
  host: '0.0.0.0',           // Listen on all interfaces
  port: 9090,                // Custom port
  maxReceiveMessageLength: 200 * 1024 * 1024,  // 200MB
  maxSendMessageLength: 200 * 1024 * 1024,     // 200MB
});
```

### Service Configuration

```javascript
const service = new MyFlightService({
  host: 'localhost',
  port: 8080,
  // Add your service-specific options
  dataDirectory: './data',
  cacheEnabled: true,
});
```

## 🛠️ Development

### Running Tests

```bash
npm test
```

### Test Structure

- `basic.test.js`: Basic test setup verification
- `flight-server.test.js`: Comprehensive server functionality tests
- `setup.js`: Test utilities and setup

### Building from Source

```bash
git clone <repository>
cd packages/core
npm install
npm test
```

## 📖 Examples

See the `packages/examples` directory for complete working examples:

- **Basic Server**: Minimal Flight server implementation
- **Test Client**: Client for testing Flight servers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

Apache License 2.0 - see [LICENSE](../../LICENSE) for details.

## 🔗 Related Packages

- `@flightstream/csv-service`: CSV data source adapter
- `@flightstream/utils`: Utility functions for Arrow data processing

## 💬 Support

For questions and support:

- [GitHub Issues](https://github.com/your-org/flightstream/issues)
- [Documentation](https://flightstream.dev)
- [Apache Arrow Flight Protocol](https://arrow.apache.org/docs/format/Flight.html) 