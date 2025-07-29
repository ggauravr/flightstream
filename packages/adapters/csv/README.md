# 📊 CSV Service for FlightStream

A powerful CSV file adapter for Arrow Flight servers that provides streaming CSV parsing, automatic schema inference, and efficient Arrow data conversion.

## ✨ Features

- **🚀 Streaming CSV Processing**: Memory-efficient streaming of large CSV files
- **🔍 Automatic Schema Inference**: Intelligent type detection from CSV headers and data
- **⚡ Arrow Flight Integration**: Seamless integration with Arrow Flight protocol
- **📈 Batch Processing**: Configurable batch sizes for optimal performance
- **🛡️ Error Handling**: Robust error handling for malformed CSV data
- **🎯 Type Conversion**: Automatic conversion between CSV and Arrow data types
- **📁 File Discovery**: Automatic discovery and registration of CSV datasets

## 📦 Installation

```bash
npm install @flightstream/adapters-csv
```

## 🚀 Quick Start

### Basic Usage

```javascript
import { CSVFlightService } from '@flightstream/adapters-csv';
import { FlightServer } from '@flightstream/core-server';

// Create CSV service
const csvService = new CSVFlightService({
  dataDirectory: './data',  // Directory containing CSV files
  batchSize: 10000,        // Records per batch
  delimiter: ',',          // CSV delimiter
  headers: true,           // First row contains headers
  skipEmptyLines: true     // Skip empty lines
});

// Create and start Flight server
const server = new FlightServer({
  port: 8080
});

// Register the CSV service
server.setFlightService(csvService);

await server.start();
console.log('CSV Flight server running on port 8080');
```

### Advanced Configuration

```javascript
const csvService = new CSVFlightService({
  dataDirectory: './data',
  batchSize: 5000,
  delimiter: ';',  // Use semicolon as delimiter
  headers: true,
  skipEmptyLines: true,
  csv: {
    // Additional CSV parsing options
    trim: true,
    skipRows: 1  // Skip first row if needed
  }
});
```

## 📚 API Reference

### CSVFlightService

The main service class that extends `FlightServiceBase` to provide CSV file support.

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataDirectory` | string | `'./data'` | Directory containing CSV files |
| `batchSize` | number | `10000` | Number of records per batch |
| `delimiter` | string | `','` | CSV delimiter character |
| `headers` | boolean | `true` | Whether first row contains headers |
| `skipEmptyLines` | boolean | `true` | Whether to skip empty lines |

#### Methods

- `initialize()`: Ensure service is fully initialized
- `getCSVStats()`: Get statistics about registered CSV datasets
- `getDatasets()`: Get list of available dataset IDs
- `hasDataset(datasetId)`: Check if a dataset exists

### CSVStreamer

A streaming CSV parser with schema inference capabilities.

```javascript
import { CSVStreamer } from '@flightstream/adapters-csv/csv-streamer';

const streamer = new CSVStreamer('./data/sample.csv', {
  batchSize: 1000,
  delimiter: ',',
  headers: true,
  skipEmptyLines: true
});

streamer.on('schema', (schema) => {
  console.log('Inferred schema:', schema);
});

streamer.on('batch', (batch) => {
  console.log('Received batch:', batch.length, 'records');
});

streamer.on('end', (stats) => {
  console.log('Streaming complete:', stats.totalRows, 'total rows');
});

await streamer.start();
```

#### Events

- `schema`: Emitted when schema is inferred from CSV headers
- `batch`: Emitted when a batch of records is ready
- `row-error`: Emitted when a row parsing error occurs
- `start`: Emitted when streaming starts
- `end`: Emitted when streaming completes
- `stop`: Emitted when streaming is stopped

#### Methods

- `start()`: Start the streaming process
- `stop()`: Stop the streaming process
- `getStats()`: Get streaming statistics

### CSVArrowBuilder

Converts CSV data to Arrow format with type mapping.

```javascript
import { CSVArrowBuilder } from '@flightstream/adapters-csv/csv-arrow-builder';

const csvSchema = {
  id: 'int64',
  name: 'string',
  price: 'float64',
  active: 'boolean'
};

const builder = new CSVArrowBuilder(csvSchema);

// Convert CSV batch to typed arrays
const typedArrays = builder.createTypedArraysFromCSVBatch(csvBatch, headers, delimiter);
```

#### Methods

- `createTypedArraysFromCSVBatch(csvBatch, headers, delimiter)`: Convert CSV batch to typed arrays
- `_convertStringToInt32(value)`: Convert string to Int32
- `_convertStringToInt64(value)`: Convert string to Int64
- `_convertStringToFloat32(value)`: Convert string to Float32
- `_convertStringToFloat64(value)`: Convert string to Float64
- `_convertStringToBoolean(value)`: Convert string to Boolean
- `_convertStringToDate(value)`: Convert string to Date
- `_convertStringToTimestamp(value)`: Convert string to Timestamp

## 🔧 Data Type Mapping

The service automatically maps CSV data types to Arrow types:

| CSV Type | Arrow Type | Description |
|----------|------------|-------------|
| `boolean` | `Bool` | True/false values |
| `int32` | `Int32` | 32-bit integers |
| `int64` | `Int64` | 64-bit integers |
| `float32` | `Float32` | 32-bit floating point |
| `float64` | `Float64` | 64-bit floating point |
| `date` | `DateMillisecond` | Date values |
| `timestamp` | `TimestampMillisecond` | Timestamp values |
| `string` | `Utf8` | Text strings (default) |

## 📁 File Structure

```
csv-service/
├── src/
│   ├── index.js              # Main exports
│   ├── csv-service.js        # Main CSV Flight service
│   ├── csv-streamer.js       # Streaming CSV parser
│   └── csv-arrow-builder.js  # Arrow data conversion
├── tests/                    # Test files
└── package.json
```

## 📦 Exports

The package exports the following modules:

- `CSVFlightService`: Main CSV Flight service
- `CSVStreamer`: Streaming CSV parser
- `CSVArrowBuilder`: Arrow data conversion utilities

```javascript
// Main service
import { CSVFlightService } from '@flightstream/adapters-csv';

// Individual components
import { CSVStreamer } from '@flightstream/adapters-csv/csv-streamer';
import { CSVArrowBuilder } from '@flightstream/adapters-csv/csv-arrow-builder';
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

The package includes comprehensive tests for:
- CSV service initialization and dataset discovery
- Streaming CSV parsing with various configurations
- Schema inference and type conversion
- Arrow data conversion and record batch creation
- Error handling for malformed CSV data

## 🔗 Dependencies

- `@flightstream/core-server`: Core FlightStream server functionality
- `@flightstream/core-shared`: Shared utilities and base classes
- `fast-csv`: High-performance CSV parsing
- `apache-arrow`: Arrow data format support (peer dependency)

## 📋 Requirements

- Node.js >= 18.0.0
- Apache Arrow >= 14.0.0

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

Licensed under the MIT License. See [LICENSE](../../LICENSE) for details.

## 🆘 Support

For issues and questions:
- Check the [documentation](../../docs/)
- Open an issue on GitHub
- Review the [API reference](../../docs/api-reference.md) 