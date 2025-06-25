# 🧪 FlightStream BDD Test Plan

## Overview
This document outlines the Behavior-Driven Development (BDD) test scenarios for the FlightStream project. Each scenario is written in human-readable `describe` statements to provide clear understanding of what functionality will be tested without the cognitive load of parsing test implementation details.

---

## 📦 Package: @flightstream/utils

### ArrowBuilder (Abstract Base Class)

#### Construction and Abstract Method Validation
```javascript
describe('ArrowBuilder', () => {
  describe('when constructed directly', () => {
    it('should throw an error since it is abstract')
  })
  
  describe('when constructed by a subclass', () => {
    it('should initialize with default options')
    it('should accept and merge custom options')
    it('should require sourceSchema parameter')
    it('should set recordBatchSize to default 65536')
    it('should allow custom recordBatchSize')
  })
})
```

#### Abstract Method Contract
```javascript
describe('ArrowBuilder abstract methods', () => {
  describe('_buildArrowSchema', () => {
    it('should throw error when not implemented by subclass')
  })
  
  describe('_transformDataToColumns', () => {
    it('should throw error when not implemented by subclass')
  })
  
  describe('_mapSourceTypeToArrow', () => {
    it('should throw error when not implemented by subclass')
  })
})
```

#### Record Batch Creation
```javascript
describe('ArrowBuilder record batch operations', () => {
  describe('createRecordBatch', () => {
    it('should return null for null input')
    it('should return null for empty array input')
    it('should delegate to _transformDataToColumns for data conversion')
    it('should call createRecordBatchFromColumns with transformed data')
  })
  
  describe('createRecordBatchFromColumns', () => {
    it('should return null for empty column data')
    it('should create vectors for each schema field')
    it('should handle missing columns by using empty arrays')
    it('should create proper RecordBatch with schema and data')
  })
})
```

#### Vector Creation and Type Handling
```javascript
describe('ArrowBuilder vector creation', () => {
  describe('_createVector', () => {
    describe('for Boolean type', () => {
      it('should convert truthy values to true')
      it('should convert falsy values to false')
      it('should preserve null values')
    })
    
    describe('for Int64 type', () => {
      it('should convert numeric strings to BigInt')
      it('should handle null values')
      it('should use _safeParseInt for conversion')
    })
    
    describe('for Int32 type', () => {
      it('should convert numeric strings to integers')
      it('should handle null values')
      it('should use _safeParseInt for conversion')
    })
    
    describe('for Float64 type', () => {
      it('should convert numeric strings to float')
      it('should handle null values')
      it('should use _safeParseFloat for conversion')
    })
    
    describe('for DateMillisecond type', () => {
      it('should parse date strings to milliseconds')
      it('should handle null values')
      it('should use _safeParseDateMillis for conversion')
    })
    
    describe('for Utf8 type (default)', () => {
      it('should convert all values to strings')
      it('should preserve null values')
    })
  })
})
```

#### Safe Parsing Methods
```javascript
describe('ArrowBuilder safe parsing', () => {
  describe('_safeParseInt', () => {
    it('should parse valid integer strings')
    it('should return null for invalid input')
    it('should handle negative numbers')
    it('should handle zero')
  })
  
  describe('_safeParseFloat', () => {
    it('should parse valid float strings')
    it('should return null for invalid input')
    it('should handle negative numbers')
    it('should handle scientific notation')
  })
  
  describe('_safeParseDateMillis', () => {
    it('should parse ISO date strings')
    it('should return null for invalid dates')
    it('should handle timestamps')
    it('should handle various date formats')
  })
})
```

#### Table and Schema Operations
```javascript
describe('ArrowBuilder table operations', () => {
  describe('createTable', () => {
    it('should create Table from array of RecordBatches')
    it('should handle empty array')
    it('should preserve schema consistency')
  })
  
  describe('getSchema', () => {
    it('should return the Arrow schema')
  })
  
  describe('serializeRecordBatch', () => {
    it('should serialize RecordBatch to buffer')
    it('should handle empty RecordBatch')
  })
  
  describe('serializeSchema', () => {
    it('should serialize schema to buffer')
  })
})
```

### Schema Inference

#### Type Inference from Values
```javascript
describe('Schema Inference', () => {
  describe('inferType', () => {
    describe('for null/empty values', () => {
      it('should return string for null values')
      it('should return string for undefined values')
      it('should return string for empty strings')
    })
    
    describe('for boolean values', () => {
      it('should detect true/false strings')
      it('should detect yes/no strings')
      it('should detect 1/0 as boolean')
      it('should be case insensitive')
    })
    
    describe('for numeric values', () => {
      it('should detect integer strings')
      it('should detect float strings')
      it('should handle negative numbers')
      it('should handle scientific notation')
      it('should respect integerThreshold option')
    })
    
    describe('for date values', () => {
      it('should detect ISO date strings')
      it('should detect custom date formats')
      it('should handle various date patterns')
    })
    
    describe('for timestamp values', () => {
      it('should detect timestamp strings')
      it('should detect Unix timestamps')
    })
    
    describe('with strictMode option', () => {
      it('should be more restrictive in type detection')
      it('should default to string more often')
    })
  })
})
```

#### Schema Inference from Sample Data
```javascript
describe('Schema Inference from samples', () => {
  describe('inferSchema', () => {
    it('should return empty object for no samples')
    it('should extract all column names from samples')
    it('should infer type for each column')
    it('should use subset of samples for performance (sampleSize)')
    it('should handle mixed data types in samples')
    it('should ignore undefined values in samples')
  })
  
  describe('inferColumnType', () => {
    it('should return string for empty values array')
    it('should handle high null ratio (nullThreshold)')
    it('should find most common type in column')
    it('should require confidence threshold for type selection')
    it('should fallback to string for low confidence')
    it('should count type occurrences correctly')
  })
})
```

#### Type Detection Utilities
```javascript
describe('Schema Inference utilities', () => {
  describe('Boolean detection', () => {
    it('should detect standard boolean strings')
    it('should be case insensitive')
    it('should handle y/n variants')
  })
  
  describe('Numeric detection', () => {
    it('should detect integers with regex')
    it('should detect floats with decimal points')
    it('should handle negative numbers')
    it('should respect integer threshold limits')
  })
  
  describe('Date detection', () => {
    it('should detect standard ISO dates')
    it('should handle custom date formats')
    it('should validate date strings')
  })
  
  describe('Timestamp detection', () => {
    it('should detect ISO timestamps')
    it('should detect Unix timestamps')
    it('should handle timezone info')
  })
})
```

#### Schema Normalization and Arrow Generation
```javascript
describe('Schema normalization and Arrow generation', () => {
  describe('normalizeSchema', () => {
    it('should convert generic types to Arrow types')
    it('should handle invalid type names')
    it('should preserve valid Arrow types')
    it('should apply options for type mapping')
  })
  
  describe('generateArrowSchema', () => {
    it('should create Arrow Schema from type map')
    it('should handle field options (nullable, metadata)')
    it('should preserve field names')
    it('should create proper Arrow Field objects')
  })
  
  describe('Arrow type mapping', () => {
    it('should map string to Utf8')
    it('should map integer to Int64')
    it('should map float to Float64')
    it('should map boolean to Bool')
    it('should map date to DateMillisecond')
    it('should map timestamp to TimestampMillisecond')
  })
})
```

### Streaming Utils

#### StreamProcessor Base Class
```javascript
describe('Streaming Utils', () => {
  describe('StreamProcessor', () => {
    describe('construction', () => {
      it('should initialize with default options')
      it('should accept custom batch size')
      it('should accept custom concurrency limits')
      it('should accept custom error retry counts')
      it('should accept custom backpressure thresholds')
    })
    
    describe('lifecycle management', () => {
      it('should track processing state')
      it('should emit start event when processing begins')
      it('should emit complete event with statistics')
      it('should emit error events for failures')
      it('should emit stop event when stopped')
    })
    
    describe('batch management', () => {
      it('should add items to current batch')
      it('should flush batch when size limit reached')
      it('should emit batch events with data')
      it('should track total processed count')
    })
    
    describe('backpressure handling', () => {
      it('should detect when backpressure threshold exceeded')
      it('should emit backpressure events')
      it('should pause processing when overwhelmed')
      it('should resume when backpressure clears')
    })
    
    describe('statistics', () => {
      it('should provide processing statistics')
      it('should track error counts')
      it('should track batch sizes')
      it('should track pending batches')
    })
  })
})
```

#### BatchProcessor
```javascript
describe('BatchProcessor', () => {
  describe('construction', () => {
    it('should require processor function')
    it('should inherit from StreamProcessor')
    it('should initialize active batches set')
  })
  
  describe('batch processing', () => {
    it('should process batches with provided function')
    it('should assign unique batch IDs')
    it('should emit batch lifecycle events')
    it('should track active batches')
    it('should handle processing errors')
  })
  
  describe('error handling and retry', () => {
    it('should retry failed batches')
    it('should respect retry limits')
    it('should emit error events after retry exhaustion')
    it('should track error counts')
  })
  
  describe('concurrent processing', () => {
    it('should process multiple batches concurrently')
    it('should respect concurrency limits')
    it('should handle parallel batch completion')
  })
})
```

#### DataChunker
```javascript
describe('DataChunker', () => {
  describe('construction', () => {
    it('should accept chunk size options')
    it('should accept overlap options')
    it('should set default chunk size')
  })
  
  describe('chunking operations', () => {
    it('should split arrays into chunks')
    it('should handle chunk size boundaries')
    it('should support overlapping chunks')
    it('should handle empty arrays')
    it('should handle arrays smaller than chunk size')
  })
  
  describe('streaming chunker', () => {
    it('should create streaming chunker with callback')
    it('should process data incrementally')
    it('should call callback for each chunk')
    it('should handle streaming completion')
  })
})
```

#### StreamBuffer
```javascript
describe('StreamBuffer', () => {
  describe('construction', () => {
    it('should initialize with buffer options')
    it('should set high water mark')
    it('should set low water mark')
  })
  
  describe('buffer operations', () => {
    it('should accept data writes')
    it('should emit drain events when space available')
    it('should emit data events when readable')
    it('should handle buffer overflow')
  })
  
  describe('read operations', () => {
    it('should read specified number of items')
    it('should return available items when less than requested')
    it('should handle empty buffer reads')
  })
  
  describe('backpressure management', () => {
    it('should detect when draining needed')
    it('should provide buffer statistics')
    it('should handle high water mark exceeded')
  })
})
```

#### RateLimiter
```javascript
describe('RateLimiter', () => {
  describe('construction', () => {
    it('should initialize with rate limits')
    it('should set token bucket parameters')
    it('should start with full token bucket')
  })
  
  describe('rate limiting', () => {
    it('should allow operations within rate limit')
    it('should deny operations exceeding rate limit')
    it('should refill tokens over time')
    it('should provide async acquisition with waiting')
  })
  
  describe('token management', () => {
    it('should consume tokens for operations')
    it('should refill tokens at specified rate')
    it('should handle token bucket overflow')
  })
})
```

---

## 📦 Package: @flightstream/core

### FlightServer

#### Server Construction and Configuration
```javascript
describe('FlightServer', () => {
  describe('construction', () => {
    it('should initialize with default options')
    it('should accept custom host and port')
    it('should set large message limits for Arrow data')
    it('should accept custom proto file path')
    it('should initialize server state as null')
  })
  
  describe('configuration', () => {
    it('should configure maxReceiveMessageLength')
    it('should configure maxSendMessageLength')
    it('should use default proto file location')
    it('should accept custom proto file path')
  })
})
```

#### Service Registration
```javascript
describe('FlightServer service registration', () => {
  describe('setFlightService', () => {
    it('should accept FlightServiceBase instances')
    it('should create protocol handlers for the service')
    it('should register gRPC service with handlers')
    it('should store service reference')
  })
  
  describe('gRPC service initialization', () => {
    it('should load Arrow Flight protocol definition')
    it('should parse proto file with correct options')
    it('should create gRPC server with message limits')
    it('should store proto service definition')
  })
})
```

#### Server Lifecycle
```javascript
describe('FlightServer lifecycle', () => {
  describe('start', () => {
    it('should require flight service to be set')
    it('should bind to specified host and port')
    it('should return actual port number')
    it('should start gRPC server')
    it('should emit appropriate log messages')
    it('should handle binding errors')
  })
  
  describe('stop', () => {
    it('should gracefully shutdown server')
    it('should force shutdown if graceful fails')
    it('should reset server instance to null')
    it('should handle stop when not running')
    it('should emit appropriate log messages')
  })
  
  describe('server state', () => {
    it('should track if server is running')
    it('should provide server information')
    it('should handle multiple start/stop cycles')
  })
})
```

### FlightServiceBase (Abstract Base Class)

#### Abstract Service Construction
```javascript
describe('FlightServiceBase', () => {
  describe('construction', () => {
    it('should accept configuration options')
    it('should initialize dataset registry')
    it('should extend EventEmitter')
    it('should trigger async initialization')
  })
  
  describe('abstract method contract', () => {
    it('should require _initialize implementation')
    it('should require _initializeDatasets implementation')
    it('should require _inferSchemaForDataset implementation')
    it('should require _streamDataset implementation')
  })
})
```

#### Dataset Management
```javascript
describe('FlightServiceBase dataset management', () => {
  describe('dataset registry', () => {
    it('should maintain dataset Map')
    it('should provide dataset lookup methods')
    it('should support dataset refresh')
    it('should track dataset metadata')
  })
  
  describe('dataset operations', () => {
    it('should check if dataset exists')
    it('should return list of available datasets')
    it('should handle dataset registration')
    it('should handle dataset updates')
  })
})
```

#### Arrow Flight Protocol Implementation
```javascript
describe('FlightServiceBase Flight protocol', () => {
  describe('listFlights', () => {
    it('should stream FlightInfo for all datasets')
    it('should handle empty dataset list')
    it('should handle errors during streaming')
    it('should properly end the stream')
  })
  
  describe('getFlightInfo', () => {
    it('should return FlightInfo for specified dataset')
    it('should extract dataset ID from descriptor')
    it('should handle dataset not found errors')
    it('should create proper FlightInfo structure')
  })
  
  describe('getSchema', () => {
    it('should return Arrow schema for dataset')
    it('should serialize schema properly')
    it('should handle dataset not found errors')
    it('should use fallback serialization if needed')
  })
  
  describe('doGet', () => {
    it('should stream dataset data as Arrow batches')
    it('should extract dataset ID from ticket')
    it('should handle dataset not found errors')
    it('should delegate to _streamDataset implementation')
  })
  
  describe('listActions', () => {
    it('should return available server actions')
    it('should handle empty action list')
  })
})
```

#### Helper Methods
```javascript
describe('FlightServiceBase helpers', () => {
  describe('_createFlightInfo', () => {
    it('should create FlightInfo with schema')
    it('should set proper flight descriptor')
    it('should include dataset endpoints')
    it('should serialize schema correctly')
  })
  
  describe('_extractDatasetId', () => {
    it('should extract ID from flight descriptor path')
    it('should handle different descriptor formats')
    it('should provide meaningful error for invalid descriptors')
  })
})
```

### Protocol Handlers

#### Handler Creation and Binding
```javascript
describe('Protocol Handlers', () => {
  describe('createProtocolHandlers', () => {
    it('should create handlers for all Flight methods')
    it('should bind handlers to service instance')
    it('should handle null service gracefully')
    it('should return handler object with all methods')
  })
  
  describe('handler methods', () => {
    it('should include listFlights handler')
    it('should include getFlightInfo handler')
    it('should include getSchema handler')
    it('should include doGet handler')
    it('should include listActions handler')
  })
})
```

---

## 📦 Package: @flightstream/csv-service

### CSVFlightService

#### Service Construction and Configuration
```javascript
describe('CSVFlightService', () => {
  describe('construction', () => {
    it('should extend FlightServiceBase')
    it('should accept CSV-specific options')
    it('should set default data directory to ./data')
    it('should set default batch size to 10000')
    it('should accept custom CSV parsing options')
  })
  
  describe('CSV options', () => {
    it('should configure delimiter (default comma)')
    it('should configure headers option (default true)')
    it('should configure skipEmptyLines (default true)')
    it('should merge custom CSV options')
  })
})
```

#### Dataset Discovery and Initialization
```javascript
describe('CSVFlightService dataset discovery', () => {
  describe('_initializeDatasets', () => {
    it('should scan data directory for CSV files')
    it('should handle missing data directory gracefully')
    it('should filter files by .csv extension')
    it('should infer schema for each CSV file')
    it('should register valid datasets')
    it('should skip files with schema inference errors')
    it('should log registration results')
  })
  
  describe('dataset registration', () => {
    it('should create dataset ID from filename')
    it('should store file path in dataset metadata')
    it('should include file statistics in metadata')
    it('should store inferred Arrow schema')
    it('should set dataset type to csv')
  })
})
```

#### Schema Inference for CSV
```javascript
describe('CSVFlightService schema inference', () => {
  describe('_inferSchemaForDataset', () => {
    it('should handle file path input')
    it('should handle dataset ID input')
    it('should create CSVStreamer for schema inference')
    it('should read minimal data for schema (1 batch)')
    it('should convert CSV schema to Arrow schema')
    it('should handle schema inference errors')
    it('should stop streaming after schema detected')
  })
  
  describe('schema conversion', () => {
    it('should use CSVArrowBuilder for conversion')
    it('should preserve field names from CSV headers')
    it('should map CSV types to Arrow types')
    it('should handle type inference failures')
  })
})
```

#### Data Streaming
```javascript
describe('CSVFlightService data streaming', () => {
  describe('_streamDataset', () => {
    it('should create CSVStreamer with configured options')
    it('should use proper batch size from options')
    it('should apply CSV parsing options')
    it('should create CSVArrowBuilder for data conversion')
    it('should handle schema inference during streaming')
  })
  
  describe('streaming events', () => {
    it('should handle schema events from streamer')
    it('should handle batch events from streamer')
    it('should convert CSV batches to Arrow batches')
    it('should write Arrow batches to gRPC stream')
    it('should handle streaming errors')
    it('should track streaming statistics')
  })
  
  describe('error handling', () => {
    it('should handle malformed CSV data')
    it('should handle file reading errors')
    it('should handle Arrow conversion errors')
    it('should propagate errors to gRPC stream')
  })
})
```

#### Public API Methods
```javascript
describe('CSVFlightService public API', () => {
  describe('initialize', () => {
    it('should wait for async initialization to complete')
    it('should be idempotent (safe to call multiple times)')
    it('should return when already initialized')
  })
  
  describe('getCSVStats', () => {
    it('should return CSV-specific statistics')
    it('should include file count information')
    it('should include dataset information')
  })
})
```

### CSVStreamer

#### Streamer Construction and Configuration
```javascript
describe('CSVStreamer', () => {
  describe('construction', () => {
    it('should accept file path parameter')
    it('should accept CSV parsing options')
    it('should set default batch size')
    it('should configure CSV parser options')
    it('should extend EventEmitter')
  })
  
  describe('CSV parser configuration', () => {
    it('should configure delimiter option')
    it('should configure headers detection')
    it('should configure empty line handling')
    it('should handle encoding options')
  })
})
```

#### CSV Reading and Parsing
```javascript
describe('CSVStreamer parsing', () => {
  describe('start', () => {
    it('should begin reading CSV file')
    it('should emit schema event with headers')
    it('should emit batch events with data rows')
    it('should handle file reading errors')
    it('should handle CSV parsing errors')
  })
  
  describe('schema detection', () => {
    it('should detect headers from first row')
    it('should infer column types from sample data')
    it('should emit schema event with field information')
    it('should handle headerless CSV files')
  })
  
  describe('batch processing', () => {
    it('should group rows into batches')
    it('should respect configured batch size')
    it('should emit complete batches')
    it('should handle final partial batch')
  })
  
  describe('stream control', () => {
    it('should support stopping stream')
    it('should support pausing stream')
    it('should support resuming stream')
    it('should handle backpressure')
  })
})
```

#### Event Handling
```javascript
describe('CSVStreamer events', () => {
  describe('schema event', () => {
    it('should emit after header detection')
    it('should include field names and types')
    it('should provide column metadata')
  })
  
  describe('batch event', () => {
    it('should emit for each batch of rows')
    it('should include row data as objects or arrays')
    it('should maintain field order')
  })
  
  describe('error events', () => {
    it('should emit for file access errors')
    it('should emit for CSV parsing errors')
    it('should emit for encoding errors')
  })
  
  describe('end event', () => {
    it('should emit when file reading complete')
    it('should include final statistics')
  })
})
```

### CSVArrowBuilder

#### CSV-Specific Arrow Builder
```javascript
describe('CSVArrowBuilder', () => {
  describe('construction', () => {
    it('should extend ArrowBuilder base class')
    it('should accept CSV schema parameter')
    it('should validate CSV schema format')
    it('should build Arrow schema from CSV schema')
  })
  
  describe('CSV schema processing', () => {
    it('should map CSV field names to Arrow fields')
    it('should infer Arrow types from CSV types')
    it('should handle CSV-specific type mappings')
    it('should preserve field metadata')
  })
})
```

#### CSV to Arrow Conversion
```javascript
describe('CSVArrowBuilder conversion', () => {
  describe('_transformDataToColumns', () => {
    it('should convert CSV rows to column arrays')
    it('should handle different CSV row formats')
    it('should preserve null values from CSV')
    it('should handle missing fields in rows')
  })
  
  describe('_mapSourceTypeToArrow', () => {
    it('should map csv string type to Arrow Utf8')
    it('should map csv number type to Arrow numeric types')
    it('should map csv boolean type to Arrow Bool')
    it('should map csv date type to Arrow Date')
    it('should handle unknown CSV types')
  })
  
  describe('CSV-specific processing', () => {
    it('should handle CSV null representations (empty strings)')
    it('should handle CSV boolean representations')
    it('should handle CSV numeric parsing')
    it('should handle CSV date parsing')
  })
})
```

---

## 🔧 Integration Test Scenarios

### End-to-End CSV Processing
```javascript
describe('End-to-End CSV Processing', () => {
  describe('complete workflow', () => {
    it('should discover CSV files in data directory')
    it('should infer schemas for all CSV files')
    it('should register datasets in flight service')
    it('should serve datasets via Flight protocol')
    it('should stream Arrow data for CSV datasets')
  })
  
  describe('client-server interaction', () => {
    it('should handle listFlights requests')
    it('should handle getFlightInfo requests')
    it('should handle getSchema requests')
    it('should handle doGet streaming requests')
    it('should handle multiple concurrent clients')
  })
})
```

### Error Scenarios and Recovery
```javascript
describe('Error Handling and Recovery', () => {
  describe('malformed CSV handling', () => {
    it('should handle files with inconsistent columns')
    it('should handle files with encoding issues')
    it('should handle files with invalid data types')
    it('should gracefully skip problematic files')
  })
  
  describe('server error conditions', () => {
    it('should handle port binding failures')
    it('should handle service initialization failures')
    it('should handle dataset discovery failures')
    it('should handle streaming interruptions')
  })
})
```

### Performance and Memory Management
```javascript
describe('Performance and Memory Management', () => {
  describe('large file handling', () => {
    it('should stream large CSV files without loading into memory')
    it('should maintain consistent memory usage during streaming')
    it('should handle files larger than available memory')
  })
  
  describe('concurrent operations', () => {
    it('should handle multiple simultaneous streams')
    it('should manage memory usage across concurrent operations')
    it('should implement backpressure when needed')
  })
})
``` 