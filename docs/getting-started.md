---
layout: page
title: Getting Started
permalink: /getting-started/
---

# 🚀 Getting Started

Get up and running with Arrow Flight Server Node.js in minutes.

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm 8+** (comes with Node.js)
- **Basic JavaScript knowledge**

## ⚡ Quick Installation

### Option 1: Use the Complete Framework (Recommended)

```bash
# Clone the full repository
git clone https://github.com/ggauravr/flightstream.git
cd flightstream

# Install dependencies
npm install

# Start the example server
npm start
```

### Option 2: Install Individual Packages

```bash
# Create a new project
mkdir my-flight-server
cd my-flight-server
npm init -y

# Install the packages you need
npm install @flightstream/core
npm install @flightstream/csv-service
npm install apache-arrow
```

## 🎯 First Server (2 minutes)

### 1. Create Your Server File

```javascript
// server.js
import { FlightServer } from '@flightstream/core';
import { CSVFlightService } from '@flightstream/csv-service';

const server = new FlightServer({ port: 8080 });
const csvService = new CSVFlightService({ 
  dataDirectory: './data' 
});

server.setFlightService(csvService);
await server.start();

console.log('🚀 Flight server running on port 8080');
```

### 2. Add Some Data

```bash
# Create data directory
mkdir data

# Add sample CSV
cat > data/products.csv << 'EOF'
id,name,price,category
1,Laptop,999.99,Electronics
2,Coffee Mug,12.50,Kitchen
3,Book,24.95,Books
EOF
```

### 3. Run Your Server

```bash
node server.js
```

### 4. Test It

```bash
# Test with the included client (if using full repo)
npm test

# Or test with Python
python -c "
import pyarrow.flight as flight
client = flight.FlightClient('grpc://localhost:8080')
print('Datasets:', list(client.list_flights()))
"
```

## 📦 Package Overview

Understanding what each package does:

### Core Package
```javascript
import { 
  FlightServer,      // Main server class that serves data via Arrow Flight protocol
  FlightServiceBase  // Base class for services/adapters to convert data from various sources to Arrow Flight protocol
} from '@flightstream/core';
```

### CSV Service
```javascript
import { 
  CSVFlightService,  // Ready-to-use CSV service that reads data from CSV files and serves it via Arrow Flight protocol
  CSVStreamer        // Low-level CSV streaming
} from '@flightstream/csv-service';
```

### Utilities
```javascript
import {
  ArrowBuilder,       // Generic Arrow data builder
  CSVArrowBuilder,    // CSV-specific Arrow data builder
  inferSchema,        // Automatic schema inference
  StreamingUtils      // Streaming helpers for Arrow data
} from '@flightstream/utils';
```

## 🔧 Configuration

### Environment Variables

```bash
# Server configuration
export FLIGHT_HOST=localhost
export FLIGHT_PORT=8080

# CSV service configuration
export DATA_DIRECTORY=./data
export CSV_BATCH_SIZE=10000
export CSV_DELIMITER=,
export CSV_HEADERS=true

# Performance tuning
export MAX_RECEIVE_MESSAGE_LENGTH=104857600  # 100MB
export MAX_SEND_MESSAGE_LENGTH=104857600     # 100MB
```

### Programmatic Configuration

```javascript
const server = new FlightServer({
  host: 'localhost',
  port: 8080,
  maxReceiveMessageLength: 100 * 1024 * 1024,
  maxSendMessageLength: 100 * 1024 * 1024,
});

const csvService = new CSVFlightService({
  dataDirectory: './data',
  batchSize: 50000,
  delimiter: ',',
  headers: true,
  skipEmptyLines: true,
});
```

## 🌐 Client Connections

### Python Client

```python
import pyarrow.flight as flight
import pandas as pd

# Connect
client = flight.FlightClient("grpc://localhost:8080")

# List datasets
for flight_info in client.list_flights():
    print(f"Dataset: {flight_info.descriptor}")

# Get data
descriptor = flight.FlightDescriptor.for_path(b"products")
reader = client.do_get(client.get_flight_info(descriptor).endpoints[0].ticket)
table = reader.read_all()
df = table.to_pandas()
print(df)
```

### JavaScript Client

```javascript
// Using the test client from examples
import { FlightClient } from './packages/examples/test-client/test-client.js';

const client = new FlightClient('localhost', 8080);

// List datasets
const flights = await client.listFlights();
console.log('Available datasets:', flights);

// Get data (implementation depends on your client)
```

### Java Client

```java
// Maven dependency: org.apache.arrow:flight-core
import org.apache.arrow.flight.*;
import org.apache.arrow.memory.RootAllocator;

RootAllocator allocator = new RootAllocator();
FlightClient client = FlightClient.builder()
    .location(Location.forGrpcInsecure("localhost", 8080))
    .allocator(allocator)
    .build();

// List flights
for (FlightInfo info : client.listFlights(Criteria.ALL)) {
    System.out.println("Dataset: " + info.getDescriptor());
}
```

## 🚀 Next Steps

Now that you have a basic server running:

1. **📖 Follow the [Tutorial]({{ '/tutorial/' | relative_url }})** - Build a complete custom server
2. **🔍 Browse [Examples]({{ '/examples/' | relative_url }})** - for sample implementations
3. **📚 Check [API Reference]({{ '/api-reference/' | relative_url }})** - Complete documentation
4. **🛠️ Build a custom service/adapter** - Connect your own data sources

### Getting Help

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/ggauravr/flightstream/issues)
- **💬 Questions**: [GitHub Discussions](https://github.com/ggauravr/flightstream/discussions)
- **📖 Documentation**: [Full docs on this site]({{ '/' | relative_url }})

## 🎉 You're Ready!

You now have:
- ✅ A working Arrow Flight server
- ✅ Understanding of the package structure  
- ✅ Basic configuration knowledge
- ✅ Client connection examples

Ready to build something awesome? 🚀 