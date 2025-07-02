# FlightStream

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

High-performance Apache Arrow Flight streaming framework with a plugin architecture for Node.js and browser environments. This monorepo will house a complete ecosystem for building high-performance data streaming services and clients using the Arrow Flight protocol.

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/ggauravr/flightstream.git
cd flightstream
npm install

# Start a sample Flight server with the CSV adapter
npm start

# Test with the included sample client
npm test
```

The server will automatically discover CSV files in the `data/` directory and serve the first dataset found in Apache Arrow format in a streaming manner

## 📦 Package Structure

This monorepo is organized by domain for maximum scalability and extensibility:

### Core Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@flightstream/core-server`](packages/core/server/) | Core Arrow Flight NodeJS server | ![npm](https://img.shields.io/npm/v/@flightstream/core-server) |
| [`@flightstream/core-client-engine`](packages/core/client-engine/) | Core framework-agnostic client engine with DuckDB WASM (planned) | - |

### Adapters

| Package | Description | Version |
|---------|-------------|---------|
| [`@flightstream/adapters-csv`](packages/adapters/csv/) | CSV file adapter with streaming support | ![npm](https://img.shields.io/npm/v/@flightstream/adapters-csv) |
| [`@flightstream/adapters-parquet`](packages/adapters/parquet/) | Parquet file adapter (planned) | - |

### Framework Integrations

| Package | Description | Version |
|---------|-------------|---------|
| [`@flightstream/frameworks-react`](packages/frameworks/react/) | React hooks and components (planned) | - |
| [`@flightstream/frameworks-svelte`](packages/frameworks/svelte/) | Svelte stores and components (planned) | - |
| [`@flightstream/frameworks-vue`](packages/frameworks/vue/) | Vue composables (planned) | - |
| [`@flightstream/frameworks-vanilla`](packages/frameworks/vanilla/) | Vanilla JS utilities (planned) | - |
| [`@flightstream/frameworks-fastify`](packages/frameworks/vanilla/) | Fastify server plugin for Flight/gRPC-based data streaming (planned) | - |
| [`@flightstream/frameworks-express`](packages/frameworks/vanilla/) | Express server plugin for Flight/gRPC-based data streaming (planned) | - |

### Utilities

| Package | Description | Version |
|---------|-------------|---------|
| [`@flightstream/utils-arrow`](packages/utils/arrow/) | Arrow utilities and schema inference | ![npm](https://img.shields.io/npm/v/@flightstream/utils-arrow) |
| [`@flightstream/utils-streaming`](packages/utils/streaming/) | Streaming utilities (planned) | - |
| [`@flightstream/utils-storage`](packages/utils/storage/) | Storage utilities (planned) | - |

### Examples & Tools

| Package | Description |
|---------|-------------|
| [`@flightstream/examples-server`](packages/examples/server/) | Server examples and reference implementations |
| [`@flightstream/examples-client`](packages/examples/client/) | Client examples and demos |
| [`@flightstream/tools-cli`](packages/tools/cli/) | Command-line tools (planned) |
| [`@flightstream/tools-dev`](packages/tools/dev/) | Development utilities (planned) |

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │───▶│  FlightStream   │───▶│     Clients     │
│  (CSV, DB, S3)  │    │   Framework     │    │ (React, Svelte) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Plugin Adapters │
                       │ (Extensible)    │
                       └─────────────────┘
```

The framework uses a domain-driven architecture where:
- **Core packages** provide fundamental server and client functionality
- **Adapters** connect to different data sources (CSV, databases, cloud storage)
- **Framework integrations** provide framework-specific APIs
- **Utilities** provide shared functionality across packages
- **Examples** demonstrate usage patterns and best practices

## 🎯 Use Cases

### Server-Side
- **Data Lakes**: Serve files from S3, GCS, or local storage
- **Analytics Pipelines**: Stream data to Apache Spark, DuckDB, or custom analytics
- **Real-time ETL**: High-performance data transformation and streaming
- **API Modernization**: Replace REST APIs with efficient columnar data transfer
- **Multi-language Integration**: Connect Python, Java, C++, and JavaScript applications

### Client-Side
- **Real-time Dashboards**: Live data visualization with React, Svelte, or Vue
- **Offline Analytics**: Local data analysis with DuckDB WASM
- **Progressive Web Apps**: Efficient data streaming for PWA applications
- **Data Science Tools**: Interactive data exploration in the browser
- **Collaborative Applications**: Shared data streaming across multiple clients

## 📊 Features

### Comprehensiveness
- ✅ High-performance gRPC streaming
- ✅ Memory-efficient batch processing  
- ✅ Automatic schema inference
- ✅ Error handling

### Developer-friendly
- ✅ Domain-driven package architecture
- ✅ Framework-agnostic client engine
- ✅ TypeScript definitions
- ✅ Comprehensive documentation
- ✅ Example implementations
- ✅ Test clients in multiple languages

### Arrow Flight Protocol Abstractions
- ✅ All major Flight operations (ListFlights, GetFlightInfo, DoGet, etc.)
- ✅ Efficient binary data transfer
- ✅ Schema discovery and validation
- ✅ Streaming with backpressure handling

### Framework-specific Features (Planned)
- ✅ DuckDB WASM integration
- ✅ OPFS storage support
- ✅ Framework adapters (React, Svelte, Vue)
- ✅ Offline data persistence
- ✅ Real-time streaming updates
- ✅ Fastify/Express plugins

## 🛠️ Installation & Usage

### Server-Side Development

```bash
# Core server framework
npm install @flightstream/core-server

# CSV adapter
npm install @flightstream/adapters-csv

# Arrow utilities
npm install @flightstream/utils-arrow
```

```javascript
import { FlightServer } from '@flightstream/core-server';
import { CSVFlightService } from '@flightstream/adapters-csv';

// Create server
const server = new FlightServer({ port: 8080 });

// Create CSV service
const csvService = new CSVFlightService({
  dataDirectory: './data'
});

// Register adapter and start
server.setFlightService(csvService);
await server.start();
```

### Client-Side Development (Planned)

```bash
# Core client engine
npm install @flightstream/core-client-engine

# React integration
npm install @flightstream/frameworks-react

# Arrow utilities
npm install @flightstream/utils-arrow
```

```javascript
import { useFlightStream } from '@flightstream/frameworks-react';

// React hook for streaming data
const { data, loading, error, query } = useFlightStream(
  'ws://localhost:8080', 
  'covid-19-hospitalizations'
);

// Execute SQL queries on local DuckDB
const results = await query('SELECT * FROM data WHERE state = "CA"');
```

## 🔧 Configuration

Configure via environment variables:

```bash
# Server settings
export FLIGHT_HOST=localhost
export FLIGHT_PORT=8080

# Data settings  
export DATA_DIRECTORY=./data
export CSV_BATCH_SIZE=10000

# Performance tuning
export MAX_RECEIVE_MESSAGE_LENGTH=104857600  # 100MB
export MAX_SEND_MESSAGE_LENGTH=104857600     # 100MB
```

## 🧪 Development

### Prerequisites
- Node.js ≥ 18.0.0
- npm ≥ 8.0.0

### Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint

# Build packages
npm run build
```

### Domain-Specific Commands

```bash
# Server packages
npm run test:server
npm run build:server
npm run lint:server

# Client packages (when available)
npm run test:client
npm run build:client
npm run lint:client

# Utility packages
npm run test:utils
npm run build:utils
npm run lint:utils

# Examples
npm run test:examples
```

### Package Development

```bash
# Test specific package
npm run test:server

# Build specific package
npm run build:server

# Lint specific package
npm run lint:server
```

## 📈 Roadmap

### Phase 1: Server Ecosystem ✅
- [x] Core server framework
- [x] CSV adapter
- [x] Arrow utilities
- [x] Server examples

### Phase 2: Client Ecosystem 🚧
- [ ] Core client engine with DuckDB WASM
- [ ] OPFS storage integration
- [ ] WebSocket transport layer
- [ ] Client examples

### Phase 3: Framework Integrations 📋
- [ ] React hooks and components
- [ ] Svelte stores and components
- [ ] Vue composables
- [ ] Vanilla JS utilities

### Phase 4: Advanced Features 📋
- [ ] Additional data source adapters
- [ ] Authentication and security
- [ ] Performance monitoring
- [ ] Development tools

## 🤝 Contributing

I welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Package Development

When adding new packages:

1. **Choose the right domain**: Core, Adapters, Frameworks, Utils, Examples, or Tools
2. **Follow naming conventions**: `@flightstream/{domain}-{name}`
3. **Update dependencies**: Use peer dependencies for shared packages
4. **Add tests**: Include comprehensive test coverage
5. **Update documentation**: Document the new package and its usage

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Apache Arrow](https://arrow.apache.org/) for the columnar data format
- [DuckDB](https://duckdb.org/) for the embedded analytical database and the mind-blowing single-node performance
- [gRPC](https://grpc.io/) for the high-performance RPC framework 
- [Apache Arrow Flight](https://arrow.apache.org/docs/format/Flight.html) for the amazing message transfer protocol