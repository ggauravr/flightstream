# FlightStream

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Alpha Release](https://img.shields.io/badge/version-alpha-yellow.svg)](https://www.npmjs.com/package/@flightstream/core-server)

High-performance Apache Arrow Flight streaming framework with a plugin architecture for Node.js. This monorepo provides server-side streaming capabilities with plans for future client-side and framework integrations.

> **⚠️ Alpha Release**: This is currently in alpha. APIs may change between releases. This is not production-ready software. For production use, consider waiting for the stable release or pinning to a specific alpha version.

## 🚀 Quick Start

Get FlightStream running in under 2 minutes:

```bash
# Clone and install
git clone https://github.com/ggauravr/flightstream.git
cd flightstream
npm install

# Start the development server using data from the `data` directory and the CSV adapter (with auto-reload)
npm run dev
```

In a new terminal:
```bash
# Run the test client to stream data
npm test
```

### Expected Output

#### Server Terminal (`npm run dev`):
![FlightStream Server Running](docs/images/server-running.png)

#### Client Terminal (`npm test`):
![FlightStream Client Streaming Data](docs/images/client-streaming.png)

That's it! The server will automatically discover CSV files in the `data/` directory and stream them via Arrow Flight protocol. The test client will connect and display the streamed data in real-time. As you can see a CSV with ~41k rows is streamed to the client in .025s!

### What just happened?
- 🚀 **Flight Server**: Started on `localhost:8080` with CSV adapter
- 📊 **Sample Data**: Automatically discovered from `./data/` directory  
- 🔗 **Test Client**: Connected via gRPC and streamed Arrow data
- ⚡ **Live Reload**: Server restarts automatically when you modify code

## 📦 Package Structure

This monorepo is organized by domain for maximum scalability and extensibility:

### Core Packages ✅

| Package | Description | Version |
|---------|-------------|---------|
| [`@flightstream/core-server`](packages/core/server/) | Core Arrow Flight NodeJS server | ![npm](https://img.shields.io/npm/v/@flightstream/core-server) |

### Adapters ✅

| Package | Description | Version |
|---------|-------------|---------|
| [`@flightstream/adapters-csv`](packages/adapters/csv/) | CSV file adapter with streaming support | ![npm](https://img.shields.io/npm/v/@flightstream/adapters-csv) |

### Utilities ✅

| Package | Description | Version |
|---------|-------------|---------|
| [`@flightstream/utils-arrow`](packages/utils/arrow/) | Arrow utilities and schema inference | ![npm](https://img.shields.io/npm/v/@flightstream/utils-arrow) |


### Planned Packages 🚧

| Package | Description | Status |
|---------|-------------|--------|
| `@flightstream/core-client-engine` | Core framework-agnostic client engine with DuckDB WASM | Planned |
| `@flightstream/adapters-parquet` | Parquet file adapter | Planned |
| `@flightstream/frameworks-react` | React hooks and components | Planned |
| `@flightstream/frameworks-svelte` | Svelte stores and components | Planned |
| `@flightstream/frameworks-vue` | Vue composables | Planned |
| `@flightstream/frameworks-vanilla` | Vanilla JS utilities | Planned |
| `@flightstream/frameworks-fastify` | Fastify server plugin for Flight/gRPC-based data streaming | Planned |
| `@flightstream/frameworks-express` | Express server plugin for Flight/gRPC-based data streaming | Planned |
| `@flightstream/utils-streaming` | Streaming utilities | Planned |
| `@flightstream/utils-storage` | Storage utilities | Planned |
| `@flightstream/tools-cli` | Command-line tools | Planned |
| `@flightstream/tools-dev` | Development utilities | Planned |

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │───▶│  FlightStream   │───▶│     Clients     │
│      (CSV)      │    │   Framework     │    │ (gRPC clients)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Plugin Adapters │
                       │ (Extensible)    │
                       └─────────────────┘
```

The framework uses a domain-driven architecture where:
- **Core packages** provide fundamental server functionality
- **Adapters** connect to different data sources (CSV, databases, cloud storage)
- **Utilities** provide shared functionality across packages
- **Examples** demonstrate usage patterns and best practices
- **Framework integrations** (planned) will provide framework-specific APIs
- **Client engines** (planned) will provide client functionality

## 🎯 Use Cases

### Server-Side ✅ (Currently Implemented)
- **CSV Data Streaming**: Serve CSV files via Arrow Flight protocol
- **Analytics Pipelines**: Stream data to Apache Spark, DuckDB, or custom analytics
- **API Modernization**: Replace REST APIs with efficient columnar data transfer
- **Multi-language Integration**: Connect Python, Java, C++, and JavaScript applications

### Client-Side 🚧 (Planned)
- **Real-time Dashboards**: Live data visualization with React, Svelte, or Vue
- **Offline Analytics**: Local data analysis with DuckDB WASM
- **Progressive Web Apps**: Efficient data streaming for PWA applications
- **Data Science Tools**: Interactive data exploration in the browser
- **Collaborative Applications**: Shared data streaming across multiple clients

## 📊 Features

### Currently Implemented ✅
- ✅ High-performance gRPC streaming
- ✅ Memory-efficient batch processing  
- ✅ Automatic schema inference
- ✅ Error handling
- ✅ Domain-driven package architecture
- ✅ Comprehensive documentation
- ✅ Example implementations
- ✅ All major Flight operations (ListFlights, GetFlightInfo, DoGet, etc.)
- ✅ Efficient binary data transfer
- ✅ Schema discovery and validation
- ✅ Streaming with backpressure handling

### Planned Features 🚧
- 🚧 Framework-agnostic client engine
- 🚧 TypeScript definitions
- 🚧 Test clients in multiple languages
- 🚧 DuckDB WASM integration
- 🚧 OPFS storage support
- 🚧 Framework adapters (React, Svelte, Vue)
- 🚧 Offline data persistence
- 🚧 Real-time streaming updates
- 🚧 Fastify/Express plugins
- 🚧 Browser environment support

## 🛠️ Installation & Usage

### Alpha Release Status

FlightStream is currently in **alpha**. This means:

- ✅ Core server functionality is implemented and working
- ✅ CSV adapter with streaming support is available
- ✅ Plugin architecture supports extensible data source adapters
- ✅ Comprehensive server examples and test client included
- ⚠️ APIs may change between releases
- ⚠️ Not recommended for production use
- ⚠️ Client-side and framework integrations are planned but not implemented
- ⚠️ Limited error handling and edge cases
- ⚠️ Performance optimizations pending


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

### Phase 1: Server Ecosystem ✅ (Complete)
- [x] Core server framework
- [x] CSV adapter with streaming support
- [x] Arrow utilities and schema inference
- [x] Server examples and test client
- [x] Plugin architecture for extensible data sources

### Phase 2: Client Ecosystem 🚧 (Planned)
- [ ] Core client engine with DuckDB WASM
- [ ] OPFS storage integration
- [ ] WebSocket transport layer
- [ ] Browser-compatible client libraries
- [ ] Client examples and demos

### Phase 3: Framework Integrations 🚧 (Planned)
- [ ] React hooks and components
- [ ] Svelte stores and components
- [ ] Vue composables
- [ ] Vanilla JS utilities
- [ ] Express/Fastify server plugins

### Phase 4: Advanced Features 🚧 (Planned)
- [ ] Additional data source adapters (Parquet, PostgreSQL, etc.)
- [ ] TypeScript definitions
- [ ] Authentication and security
- [ ] Performance monitoring
- [ ] CLI development tools

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Apache Arrow](https://arrow.apache.org/) for the columnar data format
- [DuckDB](https://duckdb.org/) for the embedded analytical database and the mind-blowing single-node performance
- [gRPC](https://grpc.io/) for the high-performance RPC framework 
- [Apache Arrow Flight](https://arrow.apache.org/docs/format/Flight.html) for the amazing message transfer protocol