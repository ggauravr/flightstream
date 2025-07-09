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

Both examples expose the same Flight query endpoint:

```bash
POST /api/v1/query
Content-Type: application/json

{
  "resource": "your-resource-identifier"
}
```

The response will be an Apache Arrow stream with `Content-Type: application/vnd.apache.arrow.stream`.

## Environment Variables

- `FLIGHT_SERVER_URL`: gRPC URL of the Flight server (default: `grpc://localhost:8080`)
- `PORT`: HTTP port to listen on (default: `3001` for simple, `3002` for advanced)
- `LOG_LEVEL`: Log level for pino (default: `info`) 