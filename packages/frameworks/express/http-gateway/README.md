# @flightstream/http-gateway

A flexible Express.js middleware for creating HTTP gateways to Apache Arrow Flight servers. This package bridges the gap between HTTP clients and Flight gRPC servers, enabling web applications to query Flight data services through familiar REST APIs.

## Purpose

The HTTP Gateway allows web applications to access Apache Arrow Flight servers without requiring gRPC clients. It:

- **Translates HTTP requests** to Flight gRPC calls
- **Streams Arrow data** directly to HTTP clients as Arrow binary stream
- **Handles Flight-specific errors** with proper HTTP status codes
- **Provides flexible integration** options for different use cases

## Quick Start

### Simple Usage

```javascript
const express = require('express');
const flightGateway = require('@flightstream/http-gateway');

const app = express();

// One-line integration
// Assuming the Flight server is running on localhost:8080
app.use('/api/v1', flightGateway('grpc://localhost:8080', { logger }));

app.listen(3000);
```

**Usage:**

```bash
# List available datasets
curl -X GET http://localhost:3000/api/v1/list

# Query a specific dataset
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"resource": "dataset-name"}' \
  --output data.arrow \
  http://localhost:3000/api/v1/query

# Get flight info for a dataset
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"resource": "dataset-name"}' \
  http://localhost:3000/api/v1/info

# Get schema for a dataset
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"resource": "dataset-name"}' \
  http://localhost:3000/api/v1/schema
```

### Advanced Usage

```javascript
const { createFlightClient, createQueryHandler, createListHandler, createFlightInfoHandler, createSchemaHandler, createErrorHandler } = require('@flightstream/http-gateway');

const flightClient = createFlightClient('grpc://localhost:8080', { logger });
const queryHandler = createQueryHandler(flightClient, { logger });
const listHandler = createListHandler(flightClient, { logger });
const flightInfoHandler = createFlightInfoHandler(flightClient, { logger });
const schemaHandler = createSchemaHandler(flightClient, { logger });
const errorHandler = createErrorHandler({ logger });

app.get('/api/v1/list', listHandler);
app.post('/api/v1/query', queryHandler);
app.post('/api/v1/info', flightInfoHandler);
app.post('/api/v1/schema', schemaHandler);
app.use(errorHandler);
```

## Architecture

The package uses a modular architecture that can be used as a complete solution or individual components:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HTTP Client   │───▶│   HTTP Gateway   │───▶│  Flight Server  │
│  (Web Browser)  │    │  (This Package)  │    │   (gRPC/Arrow)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Arrow Stream │
                       │   Response   │
                       └──────────────┘
```

## Components

### Core Components

#### 1. **Flight Client** (`src/flight-client.js`)
- **Purpose**: Handles gRPC communication with Flight servers
- **Features**: 
  - Automatic proto file resolution (local/remote packages)
  - Configurable logging
  - Stream processing and Arrow format conversion
  - Performance metrics and monitoring
- **Usage**: `createFlightClient(serverUrl, options)`

#### 2. **Query Handler** (`src/query-handler.js`)
- **Purpose**: Express middleware for handling query requests
- **Features**:
  - Request validation
  - Arrow stream response handling
  - Request/response logging
- **Usage**: `createQueryHandler(flightClient, options)`

#### 3. **List Handler** (`src/list-handler.js`)
- **Purpose**: Express middleware for listing available datasets
- **Features**:
  - Flight server dataset discovery
  - JSON response formatting
  - Request/response logging
- **Usage**: `createListHandler(flightClient, options)`

#### 4. **Error Handler** (`src/error-handler.js`)
- **Purpose**: Converts Flight gRPC errors to HTTP status codes
- **Features**:
  - gRPC status code mapping
  - Structured error responses
  - Configurable logging
- **Usage**: `createErrorHandler(options)`

#### 5. **Flight Gateway** (`src/flight-gateway.js`)
- **Purpose**: Complete router combining all components
- **Features**:
  - Express Router with all middleware
  - CORS support
  - JSON body parsing
  - Ready-to-use solution
- **Usage**: `createFlightGateway(serverUrl, options)`

### Main Entry Point (`src/index.js`)

Provides hybrid exports supporting both simple and advanced usage patterns:

```javascript
// Simple usage (default export)
const flightGateway = require('@flightstream/http-gateway');

// Advanced usage (named exports)
const { createFlightClient, createQueryHandler, createListHandler, createErrorHandler } = require('@flightstream/http-gateway');
```

## How Components Work Together

### Simple Integration Flow

1. **Flight Gateway** creates and configures all components
2. **Flight Client** establishes gRPC connection to Flight server
3. **Query Handler** processes incoming HTTP requests
4. **Error Handler** manages any failures

### Advanced Integration Flow

1. User creates **Flight Client** with custom configuration
2. **Query Handler** uses the client to process requests
3. **Error Handler** provides centralized error management
4. User assembles components into custom Express application

## API Reference

### HTTP Endpoints

#### GET `/list`
List all available datasets from the Flight server.

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/list
```

**Response:**
```json
{
  "datasets": [
    {
      "name": "dataset-name",
      "path": [],
      "type": "unknown", 
      "total_records": -1,
      "total_bytes": -1,
      "endpoints": 1
    }
  ],
  "count": 1
}
```

#### POST `/query`
Query a Flight server resource and receive Arrow stream response.

**Request:**
```json
{
  "resource": "dataset-identifier"
}
```

**Response:**
- **Content-Type**: `application/vnd.apache.arrow.stream`
- **Body**: Apache Arrow IPC stream format

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"resource": "my-dataset"}' \
  --output data.arrow
```

#### POST `/info`
Get detailed metadata about a specific dataset.

**Request:**
```json
{
  "resource": "dataset-identifier",
  "type": 2
}
```

**Parameters:**
- `resource` (required): Dataset identifier (name or path)
- `type` (optional): Flight descriptor type (1 for PATH, 2 for CMD, defaults to 2)

**Response:**
```json
{
  "flight_descriptor": {
    "type": 2,
    "cmd": "dataset-identifier",
    "path": []
  },
  "endpoints": [
    {
      "location": [{"uri": "grpc://localhost:8080"}],
      "ticket": {"ticket": "..."}
    }
  ],
  "total_records": 1000,
  "total_bytes": 45000,
  "schema_available": true
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/info \
  -H "Content-Type: application/json" \
  -d '{"resource": "my-dataset"}'
```

#### POST `/schema`
Get the Arrow schema for a dataset.

**Request:**
```json
{
  "resource": "dataset-identifier",
  "type": 2,
  "format": "json"
}
```

**Parameters:**
- `resource` (required): Dataset identifier (name or path)
- `type` (optional): Flight descriptor type (1 for PATH, 2 for CMD, defaults to 2)
- `format` (optional): Response format ("json" for parsed schema, "binary" for raw Arrow schema)

**Response (JSON format):**
```json
{
  "resource": "dataset-identifier",
  "schema": {
    "fields": [
      {
        "name": "id",
        "type": "int64"
      },
      {
        "name": "name", 
        "type": "string"
      }
    ]
  }
}
```

**Response (Binary format):**
- **Content-Type**: `application/vnd.apache.arrow.stream`
- **Body**: Raw Arrow schema in binary format

**Examples:**
```bash
# Get schema as JSON
curl -X POST http://localhost:3000/api/v1/schema \
  -H "Content-Type: application/json" \
  -d '{"resource": "my-dataset"}'

# Get schema as binary Arrow format
curl -X POST http://localhost:3000/api/v1/schema \
  -H "Content-Type: application/json" \
  -d '{"resource": "my-dataset", "format": "binary"}' \
  --output schema.arrow
```

### Configuration Options

All components accept an `options` object with:

- **`logger`** (optional): Custom logger instance (defaults to `console`)
  - Must implement: `info()`, `debug()`, `error()` methods
  - Example: Pino, Winston, or custom logger

```javascript
const logger = require('pino')();
const gateway = flightGateway('grpc://localhost:8080', { logger });
```

## Examples

The `examples/` directory contains complete implementation references:

### Simple Server (`examples/server.js`)
- Basic integration with minimal configuration
- Pino logging setup
- Environment variable configuration

### Advanced Server (`examples/advanced-server.js`)
- Individual component usage
- Custom middleware integration
- Request timing and health checks
- Structured logging

### Running Examples

```bash
# Install example dependencies
cd examples && npm install

# Run simple example
npm run simple

# Run advanced example
npm run advanced
```

## Development

### Local vs Remote Core Server

The package supports switching between local development and published versions of the core server:

```bash
# Use local development version
npm run core:local

# Use published remote version
npm run core:remote

# Check current setup
npm run core:status
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development workflow.

### Testing

```bash
npm test
```

## Error Handling

The gateway automatically converts Flight gRPC errors to appropriate HTTP status codes:

| gRPC Status | HTTP Status | Description |
|-------------|-------------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_ARGUMENT` | 400 | Invalid request parameters |
| `UNAUTHENTICATED` | 401 | Authentication required |
| `PERMISSION_DENIED` | 403 | Access forbidden |
| Other errors | 500 | Internal server error |

## Performance Considerations

- **Streaming**: Arrow data is streamed directly to clients without buffering
- **Memory Usage**: Currently collects all batches in memory (see TODO in flight-client.js)
- **Logging**: Use appropriate log levels in production to avoid performance impact
- **Connection Pooling**: gRPC connections are reused across requests

## Dependencies

### Runtime Dependencies
- `@grpc/grpc-js` - gRPC client
- `@grpc/proto-loader` - Protocol buffer loading
- `apache-arrow` - Arrow data processing
- `cors` - CORS middleware
- `express` - Web framework

### Development Dependencies
- `jest` - Testing framework
- `pino` / `pino-pretty` - Logging (examples only)
- `dotenv` - Environment configuration (examples only)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This package is part of the Flightstream project. See the main repository for license information. 