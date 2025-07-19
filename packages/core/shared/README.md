# @flightstream/core-shared

Shared utilities for FlightStream core packages.

This package provides common utilities, constants, and protocol handling for the FlightStream core server and client packages to ensure consistency and reduce code duplication.

## Features

- **Shared Constants**: Common configuration values, protocol constants, and environment variables
- **Protocol Utilities**: gRPC and Arrow Flight protocol handling functions
- **Configuration Management**: Default configurations and utility functions
- **Error Handling**: Standardized error conversion and validation

## Installation

```bash
npm install @flightstream/core-shared
```

## Usage

### Importing Constants

```javascript
import { 
  DEFAULT_FLIGHT_CONFIG, 
  FLIGHT_PROTOCOL, 
  GRPC_CONFIG 
} from '@flightstream/core-shared';
```

### Using Protocol Utilities

```javascript
import { 
  loadFlightProto, 
  createServerOptions, 
  createClientOptions,
  createFlightDescriptor,
  createFlightTicket 
} from '@flightstream/core-shared';

// Load protocol definition
const flightProto = loadFlightProto('./flight.proto');

// Create server options
const serverOptions = createServerOptions(config);

// Create client options
const clientOptions = createClientOptions(config);

// Create Flight objects
const descriptor = createFlightDescriptor('my-dataset');
const ticket = createFlightTicket('my-dataset');
```

### Configuration

```javascript
import { DEFAULT_FLIGHT_CONFIG } from '@flightstream/core-shared';

const config = {
  ...DEFAULT_FLIGHT_CONFIG,
  host: 'localhost',
  port: 8080,
  // Override defaults as needed
};
```

## API Reference

### Constants

#### `DEFAULT_FLIGHT_CONFIG`
Default configuration values for FlightStream components:
- Connection settings (host, port)
- Message size limits
- Reliability settings (retry attempts, delays)
- Advanced settings (keep-alive, timeouts)

#### `FLIGHT_PROTOCOL`
Arrow Flight protocol constants:
- Protocol version
- Descriptor types
- Action types
- Error codes

#### `GRPC_CONFIG`
gRPC configuration constants:
- Proto loader options
- Server options
- Client options

#### `FILE_CONSTANTS`
File and path constants:
- Default file names
- Directory paths
- Batch sizes

#### `ENV_VARS`
Environment variable names for configuration.

#### `LOG_LEVELS`
Logging level constants.

#### `CONNECTION_EVENTS`
Event names for connection state changes.

### Protocol Utilities

#### `loadFlightProto(protoPath)`
Load Arrow Flight protocol definition from proto file.

#### `getDefaultProtoPath()`
Get default proto file path relative to the shared package.

#### `createServerOptions(config)`
Create gRPC server options from configuration.

#### `createClientOptions(config)`
Create gRPC client options from configuration.

#### `createFlightDescriptor(datasetId, type)`
Create a Flight descriptor for a dataset.

#### `createFlightTicket(datasetId)`
Create a Flight ticket for data retrieval.

#### `createFlightAction(actionType, actionBody)`
Create a Flight action.

#### `convertToGrpcError(error)`
Convert error to gRPC error format.

#### `validateFlightDescriptor(descriptor)`
Validate Flight descriptor.

#### `validateFlightTicket(ticket)`
Validate Flight ticket.

#### `validateFlightAction(action)`
Validate Flight action.

#### `createServerCredentials(options)`
Create server credentials.

#### `createClientCredentials(options)`
Create client credentials.

#### `mergeConfig(userConfig, defaultConfig)`
Merge configuration with defaults.

## Dependencies

- `@grpc/grpc-js`: gRPC implementation
- `@grpc/proto-loader`: Protocol buffer loader

## License

MIT 