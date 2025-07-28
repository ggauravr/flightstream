import fs from 'fs';
import { EventEmitter } from 'events';

/**
 * Ultra-Fast CSV Streamer with Chunk-Based Processing
 *
 * This class uses chunk-based CSV processing for maximum performance.
 * Instead of reading row-by-row, it processes large chunks of data at once.
 *
 * STREAMING MECHANICS:
 * - Uses Node.js fs.createReadStream() for memory-efficient file reading
 * - Processes data in chunks rather than loading entire file into memory
 * - Uses EventEmitter pattern for asynchronous, non-blocking data flow
 * - Implements backpressure handling through chunked processing
 *
 * BATCH PROCESSING BENEFITS:
 * - Reduces memory pressure by processing data in manageable chunks
 * - Improves performance by reducing function call overhead
 * - Allows for better error isolation (one bad row doesn't stop entire process)
 * - Enables parallel processing opportunities downstream
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - highWaterMark: Controls internal buffer size for optimal I/O efficiency
 * - batchSize: Balances memory usage vs processing overhead
 * - Object pooling: Reuses arrays to reduce garbage collection
 * - Line buffering: Handles incomplete lines across chunk boundaries
 *
 * Features:
 * 1. Chunk-based CSV processing for maximum performance
 * 2. Automatic schema inference from headers and data
 * 3. Efficient batch processing with larger chunks
 * 4. Configurable batch processing
 * 5. Memory efficient chunked processing
 */
export class CSVStreamer extends EventEmitter {
  constructor(filePath, options = {}) {
    super();
    this.filePath = filePath;
    console.log('options -->', options);

    // CONFIGURATION OPTIONS EXPLANATION:
    // delimiter: Character used to separate CSV columns (default: comma)
    // headers: Whether first row contains column names (default: true)
    // skipEmptyLines: Whether to ignore empty lines (default: true)
    // batchSize: Number of rows to process before emitting a batch event
    //   - Larger batches = better performance but more memory usage
    //   - Smaller batches = less memory but more frequent event emissions
    this.options = {
      delimiter: options.delimiter || ',',
      headers: options.headers !== false,
      skipEmptyLines: options.skipEmptyLines !== false,
      batchSize: options.batchSize || 10000,
      ...options
    };

    // STATE MANAGEMENT:
    // These properties track the current state of the streaming process
    this.totalRows = 0;           // Total rows processed so far
    this.schema = null;           // Inferred data schema (set after headers)
    this.isReading = false;       // Whether streaming is currently active
    this.currentChunk = [];       // Accumulated lines for current batch
    this.headers = null;          // Column headers from first row
    this.lineBuffer = '';         // Incomplete line from previous chunk
  }

  /**
   * Starts the CSV streaming process
   *
   * STREAMING FLOW:
   * 1. Creates a readable stream from the file
   * 2. Sets up event handlers for data, error, and end events
   * 3. Processes data chunks as they arrive
   * 4. Emits events for schema, microbatches, and completion
   *
   * WHY PROMISE-BASED:
   * - Allows caller to wait for completion
   * - Provides clean error handling
   * - Returns final statistics and schema
   */
  async start() {
    if (this.isReading) {
      throw new Error('CSV streaming is already in progress');
    }

    this.isReading = true;
    this.emit('start');

    return new Promise((resolve, reject) => {
      // HIGH WATER MARK EXPLANATION:
      // - Controls the internal buffer size of the readable stream
      // - 64KB provides good balance between memory usage and I/O efficiency
      // - Larger values = more memory but potentially better I/O performance
      // - Smaller values = less memory but more frequent system calls
      // - 1MB in this case produces a much worse performance than 64KB
      // - Potentially because of the CPU time spent processing the bigger chunks, and hence blocking the event loop
      const stream = fs.createReadStream(this.filePath, {
        // highWaterMark: 64 * 1024,
        encoding: 'utf8'
      });

      // ERROR HANDLING:
      // Stream errors (file not found, permission denied, etc.) are caught here
      stream.on('error', (error) => {
        this.isReading = false;
        this.emit('error', error);
        reject(error);
      });

      // DATA PROCESSING:
      // This is where the actual streaming happens
      // 'data' events fire whenever new data is available from the file
      stream.on('data', (chunk) => {
        try {
          this._processChunk(chunk);
        } catch (error) {
          this.emit('error', error);
        }
      });

      // STREAM COMPLETION:
      // Fired when the entire file has been read
      stream.on('end', () => {
        // Process any remaining data in buffers
        this._processRemainingData();

        this.isReading = false;
        this.emit('end', { totalRows: this.totalRows });
        resolve({ totalRows: this.totalRows, schema: this.schema });
      });
    });
  }

  /**
   * Stops the streaming process
   *
   * This allows for graceful termination of streaming
   * Useful for implementing pause/resume functionality
   */
  stop() {
    if (this.isReading) {
      this.isReading = false;
      this.emit('stop');
    }
  }

  /**
   * Process a chunk of data from the stream
   *
   * CHUNK PROCESSING MECHANICS:
   * 1. Combines new chunk with any leftover data from previous chunk
   * 2. Splits into lines (handles incomplete lines across chunk boundaries)
   * 3. Processes each complete line
   * 4. Buffers incomplete lines for next chunk
   *
   * WHY LINE BUFFERING IS NECESSARY:
   * - File chunks don't align with line boundaries
   * - A line might be split across multiple chunks
   * - Without buffering, we'd lose data or create malformed lines
   *
   * @param {string} chunk - Data chunk from stream (raw bytes converted to string)
   */
  _processChunk(chunk) {
    // COMBINE WITH PREVIOUS BUFFER:
    // This handles cases where a line spans multiple chunks
    const data = this.lineBuffer + chunk;
    const lines = data.split('\n');

    // BUFFER INCOMPLETE LINE:
    // The last line might be incomplete, so we save it for the next chunk
    this.lineBuffer = lines.pop() || '';

    // PROCESS COMPLETE LINES:
    for (const line of lines) {
      // Skip empty lines if configured to do so
      if (!line.trim() && this.options.skipEmptyLines) {
        continue;
      }

      // HEADER PROCESSING:
      // First non-empty line becomes headers (if headers option is enabled)
      if (this.headers === null && this.options.headers) {
        this.headers = this._parseCSVLine(line, this.options.delimiter);
        continue;
      }

      // ACCUMULATE LINES FOR BATCHING:
      // Add line to current chunk instead of processing immediately
      this.currentChunk.push(line);

      // BATCH PROCESSING TRIGGER:
      // When we reach the target batch size, process the entire batch
      // This reduces function call overhead and improves performance
      if (this.currentChunk.length >= this.options.batchSize) {
        // Infer schema from first batch if not already done
        if (!this.schema) {
          this.schema = this._inferSchemaFromLines(this.currentChunk);
          this.emit('schema', this.schema);
        }

        this._processChunkBatch();
      }
    }
  }

  /**
   * Process the current chunk of lines into a batch
   *
   * BATCH PROCESSING BENEFITS:
   * - Reduces event emission frequency (better performance)
   * - Allows downstream processors to work on larger datasets
   * - Improves memory locality and cache efficiency
   * - Reduces garbage collection pressure
   */
  _processChunkBatch() {
    if (this.currentChunk.length === 0) return;

    // Emit raw CSV lines for direct processing
    this.emit('batch', this.currentChunk);
    this.totalRows += this.currentChunk.length;

    // OBJECT POOLING:
    // Clear the array instead of creating a new one
    // This reduces garbage collection pressure
    this.currentChunk.length = 0;
  }

  /**
   * Process any remaining data after stream ends
   *
   * This handles the final incomplete line that might be in the buffer
   * when the stream completes
   */
  _processRemainingData() {
    // Process any remaining complete lines
    if (this.lineBuffer.trim()) {
      this.currentChunk.push(this.lineBuffer);
    }

    // Process final chunk
    this._processChunkBatch();
  }

  /**
   * Infer schema from a batch of CSV lines
   *
   * This method parses the first few lines to determine column types
   * and creates a schema for direct typed array conversion
   *
   * @param {Array<string>} lines - Array of CSV lines (excluding headers)
   * @returns {Object} Schema object with column names and types
   */
  _inferSchemaFromLines(lines) {
    if (!this.headers) {
      throw new Error('Headers must be set before inferring schema from lines');
    }

    const schema = {};
    const sampleSize = Math.min(100, lines.length); // Use up to 100 lines for inference

    // Initialize type counters for each column
    const typeCounters = {};
    for (const header of this.headers) {
      typeCounters[header] = {
        string: 0,
        int64: 0,
        float64: 0,
        boolean: 0,
        date: 0
      };
    }

    // Analyze sample lines to determine types
    for (let i = 0; i < sampleSize; i++) {
      const line = lines[i];
      if (!line.trim() && this.options.skipEmptyLines) {
        continue;
      }

      try {
        const values = this._parseCSVLine(line, this.options.delimiter);

        for (let j = 0; j < this.headers.length; j++) {
          const header = this.headers[j];
          const value = values[j] || '';
          const inferredType = this._inferType(value);
          typeCounters[header][inferredType]++;
        }
      } catch (error) {
        // Skip problematic lines during schema inference
        continue;
      }
    }

    // Determine the most common type for each column
    for (const [header, counters] of Object.entries(typeCounters)) {
      const totalSamples = Object.values(counters).reduce((sum, count) => sum + count, 0);

      if (totalSamples === 0) {
        schema[header] = 'string'; // Default if no valid samples
        continue;
      }

      // Find the most common type
      let maxCount = 0;
      let mostCommonType = 'string';

      for (const [type, count] of Object.entries(counters)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonType = type;
        }
      }

      // If the most common type represents less than 50% of samples, default to string
      if (maxCount / totalSamples < 0.5) {
        schema[header] = 'string';
      } else {
        schema[header] = mostCommonType;
      }
    }

    return schema;
  }

  /**
   * Parse a single CSV line into values
   *
   * CSV PARSING ALGORITHM:
   * - Handles quoted fields (text within double quotes)
   * - Respects delimiter characters only outside quotes
   * - Trims whitespace from values
   * - Handles edge cases like empty fields
   *
   * WHY CUSTOM PARSER:
   * - More control over error handling
   * - Better performance than regex-based parsing
   * - Handles edge cases more reliably
   *
   * @param {string} line - CSV line
   * @param {string} delimiter - CSV delimiter
   * @returns {Array<string>} Array of values
   */
  _parseCSVLine(line, delimiter) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    // CHARACTER-BY-CHARACTER PARSING:
    // This approach is more reliable than regex for complex CSV
    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        // QUOTE HANDLING:
        // Toggle quote state - everything between quotes is literal
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        // DELIMITER HANDLING:
        // Only treat as delimiter if not inside quotes
        values.push(current.trim());
        current = '';
      } else {
        // REGULAR CHARACTER:
        // Add to current field value
        current += char;
      }

      i++;
    }

    // ADD THE LAST VALUE:
    // Don't forget the final field in the line
    values.push(current.trim());

    return values;
  }

  /**
   * Infer type from value
   *
   * TYPE DETECTION RULES:
   * - Empty/null values default to string (safest choice)
   * - Boolean detection is case-insensitive
   * - Integer detection excludes decimals
   * - Float detection requires decimal point
   * - Date detection supports multiple formats
   *
   * @param {any} value - Value to infer type from
   * @returns {string} Inferred type string
   */
  _inferType(value) {
    if (value === null || value === undefined || value === '') {
      return 'string'; // default to string for null/empty values
    }

    const strValue = String(value).trim();

    // BOOLEAN DETECTION:
    // Case-insensitive true/false values
    if (strValue.toLowerCase() === 'true' || strValue.toLowerCase() === 'false') {
      return 'boolean';
    }

    // INTEGER DETECTION:
    // Whole numbers only (no decimal point)
    if (/^-?\d+$/.test(strValue)) {
      return 'int64';
    }

    // FLOAT DETECTION:
    // Numbers with decimal point
    if (/^-?\d*\.\d+$/.test(strValue)) {
      return 'float64';
    }

    // DATE DETECTION:
    // Multiple common date formats
    // YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
      return 'date';
    }

    // MM-DD-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(strValue)) {
      return 'date';
    }

    // DD-MM-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(strValue)) {
      return 'date';
    }

    // DEFAULT TO STRING:
    // Safest choice for unknown or complex data
    return 'string';
  }

  /**
   * Get current streaming statistics
   *
   * Useful for monitoring progress and debugging
   *
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      totalRows: this.totalRows,
      isReading: this.isReading,
      schema: this.schema
    };
  }
}

export default CSVStreamer;
