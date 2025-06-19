# Arrow Flight CSV Streaming Server

A high-performance Node.js server that streams CSV data as Apache Arrow tables via the Arrow Flight protocol. This implementation provides memory-efficient processing of large CSV files with real-time streaming capabilities.

## 🚀 Features

- **Streaming CSV Processing**: Memory-efficient processing of large CSV files in configurable batches
- **Arrow Flight Protocol**: High-performance data transport using gRPC
- **Schema Inference**: Automatic detection of data types from CSV files
- **Real-time Streaming**: Stream data to clients as Arrow record batches
- **Multiple Datasets**: Support for multiple CSV files as separate datasets
- **Type Conversion**: Automatic conversion from CSV strings to appropriate Arrow types
- **Error Handling**: Robust error handling for malformed data and network issues

## 📋 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Large CSV     │───▶│  Arrow Flight   │───▶│     Client      │
│     File        │    │     Server      │    │  Application    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Streaming CSV   │
                       │    Parser       │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Arrow Table     │
                       │  Conversion     │
                       └─────────────────┘
```

## 🛠️ Installation

1. **Clone or setup the project**:
```bash
npm install
```

2. **Prepare your data**:
   - Place CSV files in the `data/` directory
   - The server will automatically detect and register all `.csv` files

## 📊 Supported Data Types

The server automatically infers and converts CSV data to appropriate Arrow types:

- **String**: Text data (default fallback)
- **Int64**: Integer numbers (`123`, `-456`)  
- **Float64**: Decimal numbers (`123.45`, `-67.89`)
- **Boolean**: Boolean values (`true`, `false`)
- **Date**: Date strings in YYYY-MM-DD format (`2023-12-01`)

## 🚦 Quick Start

### Start the Server

```bash
# Start the server
npm start

# Or for development with auto-restart
npm run dev
```

The server will start on `localhost:8080` by default and automatically discover CSV files in the `data/` directory.

### Test with the Demo Client

```bash
# Run the test client
npm test
```

This will demonstrate all the available Flight protocol operations.

## 🔧 Configuration

Configure the server using environment variables:

```bash
# Server configuration
export FLIGHT_HOST=localhost
export FLIGHT_PORT=8080
export DATA_DIRECTORY=./data

# CSV processing
export CSV_BATCH_SIZE=10000
export CSV_DELIMITER=","
export CSV_HEADERS=true

# Arrow configuration  
export ARROW_RECORD_BATCH_SIZE=65536
export ARROW_COMPRESSION_TYPE=UNCOMPRESSED

# Message size limits (in bytes)
export MAX_RECEIVE_MESSAGE_LENGTH=104857600  # 100MB
export MAX_SEND_MESSAGE_LENGTH=104857600     # 100MB
```

## 📡 Flight Protocol Operations

### 1. ListFlights
Discover available datasets:

```javascript
const flights = await client.listFlights();
```

### 2. GetFlightInfo  
Get metadata about a specific dataset:

```javascript
const flightInfo = await client.getFlightInfo('sample');
```

### 3. GetSchema
Retrieve the Arrow schema for a dataset:

```javascript
const schema = await client.getSchema('sample');
```

### 4. DoGet
Stream dataset as Arrow record batches:

```javascript
const result = await client.getData('sample');
```

### 5. DoAction
Execute server actions:

```javascript
// Refresh datasets
await client.doAction('refresh-datasets');

// Get server information
await client.doAction('get-server-info');
```

### 6. ListActions
List available server actions:

```javascript
const actions = await client.listActions();
```

## 💻 Client Usage Example

```javascript
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import * as arrow from 'apache-arrow';

// Initialize client
const client = new FlightClient('localhost', 8080);

// Discover datasets
const flights = await client.listFlights();

// Get data for the first dataset
const datasetId = flights[0].flight_descriptor.path[0];
const result = await client.getData(datasetId);

// Process the Arrow table
console.log(`Received ${result.table.numRows} rows`);
console.log(`Columns: ${result.table.schema.fields.map(f => f.name).join(', ')}`);

// Access data
result.table.toArray().forEach((row, index) => {
  console.log(`Row ${index}:`, row);
});
```

## 📁 Project Structure

```
├── src/
│   ├── server/
│   │   ├── flight-server.js          # Main gRPC Flight server
│   │   ├── flight-service.js         # Flight protocol handlers  
│   │   ├── csv-streamer.js           # CSV streaming logic
│   │   └── arrow-builder.js          # Arrow table conversion
│   ├── proto/
│   │   └── flight.proto              # Arrow Flight protocol definitions
│   └── index.js                      # Server entry point
├── client/
│   └── test-client.js                # Demo client implementation
├── data/
│   └── sample.csv                    # Sample data file
└── package.json
```

## 🎯 Use Cases

- **Analytics Pipelines**: Stream large datasets to analytics engines
- **Data Lake Integration**: Serve data from files to multiple consumers
- **Real-time Processing**: Stream data for real-time analytics
- **Cross-Language Data Exchange**: Arrow format works across languages
- **Memory-Efficient Processing**: Handle datasets larger than available RAM

## ⚙️ Performance Tuning

### Memory Management
- Adjust `CSV_BATCH_SIZE` for memory vs. throughput tradeoff
- Configure `ARROW_RECORD_BATCH_SIZE` for optimal network utilization
- Monitor memory usage and adjust batch sizes accordingly

### Network Optimization
- Increase message size limits for large batches
- Use compression for network-constrained environments
- Consider concurrent client limits

### CSV Processing
- Optimize delimiter and parsing options
- Handle large files with appropriate batch sizes
- Monitor for malformed data and parsing errors

## 🔍 Monitoring

The server provides built-in monitoring through the `get-server-info` action:

```javascript
const serverInfo = await client.doAction('get-server-info');
```

Returns:
- Server configuration
- Available datasets
- Memory usage
- Uptime statistics

## 🐛 Troubleshooting

### Common Issues

1. **No datasets found**:
   - Ensure CSV files are in the configured data directory
   - Check file permissions and format

2. **Memory issues**:
   - Reduce `CSV_BATCH_SIZE` and `ARROW_RECORD_BATCH_SIZE`
   - Monitor system memory usage

3. **Connection errors**:
   - Verify server is running and accessible
   - Check firewall and network configuration
   - Ensure port is not in use by another process

4. **Schema inference problems**:
   - Verify CSV format and headers
   - Check for data type consistency
   - Review sample data for parsing issues

### Debug Mode

Enable debug logging:

```bash
export NODE_ENV=development
npm run dev
```

## 🔒 Security Considerations

- Server runs with insecure credentials (development only)
- For production, implement TLS/SSL encryption
- Add authentication and authorization as needed
- Validate and sanitize input data
- Monitor resource usage and implement rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Apache Arrow community for the excellent Arrow libraries
- gRPC team for the robust communication framework
- Node.js ecosystem for fast-csv and other utilities 