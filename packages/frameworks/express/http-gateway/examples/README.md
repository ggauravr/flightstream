# Flightstream HTTP Gateway Examples

This directory contains examples showing how to use the Flightstream HTTP Gateway in different ways.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file or set environment variables:
   ```env
   FLIGHT_SERVER_URL=grpc://localhost:8080
   PORT=3001
   LOG_LEVEL=info
   ```

## Examples

### Simple Usage (`server.js`)

Shows the most basic way to use the gateway:

```bash
npm run simple
```

This example demonstrates:
- Simple one-line integration
- Basic pino logging setup
- Minimal configuration

### Advanced Usage (`advanced-server.js`)

Shows how to use individual components for more control:

```bash
npm run advanced
```

This example demonstrates:
- Individual component usage
- Custom middleware
- Request timing
- Health check endpoint
- More sophisticated logging

## Usage

Both examples expose the same Flight endpoints:

### List Available Datasets

```bash
curl -X GET http://localhost:3001/api/v1/list
```

This returns a JSON response with all available datasets:

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

### Query a Dataset

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"resource": "your-resource-identifier"}' \
  --output response.arrow \
  http://localhost:3001/api/v1/query
```

The resource identifier is the name of the dataset that's exposed by the Flight server. The response will be an Apache Arrow stream with `Content-Type: application/vnd.apache.arrow.stream` saved to `response.arrow`.

### Get Dataset Info

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"resource": "your-resource-identifier"}' \
  http://localhost:3001/api/v1/info
```

This returns detailed metadata about the dataset including total records, total bytes, and endpoint information.

### Get Dataset Schema

```bash
# Get schema as JSON
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"resource": "your-resource-identifier"}' \
  http://localhost:3001/api/v1/schema

# Get schema as binary Arrow format
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"resource": "your-resource-identifier", "format": "binary"}' \
  --output schema.arrow \
  http://localhost:3001/api/v1/schema
```

The schema endpoint returns the Arrow schema information for the dataset, either as JSON or binary format.

## Environment Variables

- `FLIGHT_SERVER_URL`: gRPC URL of the Flight server (default: `grpc://localhost:8080`)
- `PORT`: HTTP port to listen on (default: `3001` for simple, `3002` for advanced)
- `LOG_LEVEL`: Log level for pino (default: `info`) 