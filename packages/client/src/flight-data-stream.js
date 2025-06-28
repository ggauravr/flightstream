/**
 * @fileoverview FlightDataStream class for handling streaming data from Arrow Flight servers
 */

import { StreamError, TimeoutError } from './errors.js';

/**
 * Event-driven stream for receiving Arrow Flight data
 * 
 * @example
 * ```javascript
 * const stream = client.getStream('my-dataset');
 * 
 * stream.on('data', (batch) => {
 *   console.log('Received batch:', batch);
 * });
 * 
 * stream.on('end', () => {
 *   console.log('Stream completed');
 * });
 * 
 * stream.on('error', (error) => {
 *   console.error('Stream error:', error);
 * });
 * 
 * stream.start();
 * ```
 */
export class FlightDataStream {
  /**
   * Create a new FlightDataStream
   * 
   * @param {Object} client - gRPC client instance
   * @param {string|Object} flightDescriptor - Flight descriptor
   * @param {Object} options - Stream options
   */
  constructor(client, flightDescriptor, options = {}) {
    this.client = client;
    this.flightDescriptor = flightDescriptor;
    this.options = {
      autoStart: true,
      batchSize: null,
      timeout: null,
      metadata: {},
      ...options
    };

    // Stream state
    this.isActive = false;
    this.isPaused = false;
    this.isEnded = false;
    this.isCancelled = false;
    this.isStarted = false;

    // Statistics
    this.stats = {
      batchesReceived: 0,
      bytesReceived: 0,
      recordsReceived: 0,
      startTime: null,
      endTime: null,
      errors: []
    };

    // Event listeners
    this.eventListeners = new Map();

    // Internal stream reference
    this.grpcStream = null;
    this.timeoutId = null;

    // Data handler
    this.dataHandler = options.dataHandler;

    if (this.options.autoStart) {
      // Start on next tick to allow event listeners to be registered
      setTimeout(() => this.start(), 0);
    }
  }

  /**
   * Start the data stream
   * 
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isStarted) {
      throw new StreamError('Stream already started');
    }

    if (this.isEnded || this.isCancelled) {
      throw new StreamError('Cannot start ended or cancelled stream');
    }

    try {
      this.isStarted = true;
      this.isActive = true;
      this.stats.startTime = new Date();

      // Create flight ticket for the stream
      const ticket = this._createTicket();

      // Set up timeout if specified
      if (this.options.timeout) {
        this.timeoutId = setTimeout(() => {
          this._handleTimeout();
        }, this.options.timeout);
      }

      // Start the gRPC stream
      this.grpcStream = this.client.doGet(ticket, this.options.metadata);

      // Set up stream event handlers
      this._setupStreamHandlers();

      this._emit('start');

    } catch (error) {
      this._handleError(new StreamError(`Failed to start stream: ${error.message}`, error));
    }
  }

  /**
   * Pause the stream
   */
  pause() {
    if (!this.isActive || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this._emit('pause');
  }

  /**
   * Resume the stream
   */
  resume() {
    if (!this.isActive || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this._emit('resume');
  }

  /**
   * Cancel the stream
   */
  cancel() {
    if (this.isCancelled || this.isEnded) {
      return;
    }

    this.isCancelled = true;
    this.isActive = false;

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Cancel gRPC stream
    if (this.grpcStream && this.grpcStream.cancel) {
      this.grpcStream.cancel();
    }

    this.stats.endTime = new Date();
    this._emit('cancel');
  }

  /**
   * Get stream statistics
   * 
   * @returns {Object} Stream statistics
   */
  getStats() {
    const stats = { ...this.stats };
    
    if (stats.startTime && !stats.endTime && this.isActive) {
      stats.duration = Date.now() - stats.startTime.getTime();
    } else if (stats.startTime && stats.endTime) {
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
    }

    if (stats.duration && stats.bytesReceived > 0) {
      stats.throughput = (stats.bytesReceived / stats.duration) * 1000; // bytes per second
    }

    return stats;
  }

  /**
   * Get current stream state
   * 
   * @returns {Object} Stream state
   */
  getState() {
    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      isEnded: this.isEnded,
      isCancelled: this.isCancelled,
      isStarted: this.isStarted
    };
  }

  /**
   * Add event listener
   * 
   * @param {string} event - Event name ('start', 'data', 'end', 'error', 'pause', 'resume', 'cancel')
   * @param {Function} listener - Event listener function
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  /**
   * Remove event listener
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  off(event, listener) {
    if (!this.eventListeners.has(event)) {
      return;
    }

    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Add a one-time event listener
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  once(event, listener) {
    const onceListener = (...args) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
  }

  /**
   * Create a flight ticket for the stream
   * 
   * @private
   */
  _createTicket() {
    // Convert flight descriptor to ticket
    if (typeof this.flightDescriptor === 'string') {
      return {
        ticket: Buffer.from(this.flightDescriptor, 'utf8')
      };
    }

    if (this.flightDescriptor.path) {
      return {
        ticket: Buffer.from(this.flightDescriptor.path.join('/'), 'utf8')
      };
    }

    if (this.flightDescriptor.cmd) {
      return {
        ticket: this.flightDescriptor.cmd
      };
    }

    throw new StreamError('Invalid flight descriptor for creating ticket');
  }

  /**
   * Set up gRPC stream event handlers
   * 
   * @private
   */
  _setupStreamHandlers() {
    if (!this.grpcStream) {
      return;
    }

    this.grpcStream.on('data', (response) => {
      if (this.isPaused) {
        return; // Skip processing if paused
      }

      try {
        this._processDataChunk(response);
      } catch (error) {
        this._handleError(new StreamError(`Error processing data chunk: ${error.message}`, error));
      }
    });

    this.grpcStream.on('end', () => {
      this._handleEnd();
    });

    this.grpcStream.on('error', (error) => {
      this._handleError(new StreamError(`gRPC stream error: ${error.message}`, error));
    });
  }

  /**
   * Process incoming data chunk
   * 
   * @private
   */
  _processDataChunk(response) {
    try {
      // Extract header and body from response
      const header = response.getDataHeader ? response.getDataHeader() : null;
      const body = response.getDataBody ? response.getDataBody() : null;

      if (!header || !body) {
        console.warn('Received empty data chunk, skipping');
        return;
      }

      // Process with data handler if available
      let processedData;
      if (this.dataHandler) {
        processedData = this.dataHandler.processRecordBatch(header, body);
      } else {
        // Fallback: create basic data structure
        processedData = {
          header: header,
          body: body,
          size: header.length + body.length
        };
      }

      // Update statistics
      this.stats.batchesReceived++;
      this.stats.bytesReceived += (header.length + body.length);
      if (processedData.numRows) {
        this.stats.recordsReceived += processedData.numRows;
      }

      // Emit data event
      this._emit('data', processedData);

    } catch (error) {
      this._handleError(new StreamError(`Failed to process data chunk: ${error.message}`, error));
    }
  }

  /**
   * Handle stream end
   * 
   * @private
   */
  _handleEnd() {
    if (this.isEnded || this.isCancelled) {
      return;
    }

    this.isEnded = true;
    this.isActive = false;
    this.stats.endTime = new Date();

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this._emit('end');
  }

  /**
   * Handle stream errors
   * 
   * @private
   */
  _handleError(error) {
    this.stats.errors.push({
      error: error.message,
      timestamp: new Date().toISOString()
    });

    this._emit('error', error);

    // If error is unrecoverable, end the stream
    if (error instanceof StreamError) {
      this.cancel();
    }
  }

  /**
   * Handle stream timeout
   * 
   * @private
   */
  _handleTimeout() {
    const timeoutError = new TimeoutError(
      `Stream timeout after ${this.options.timeout}ms`,
      this.options.timeout
    );
    
    this.cancel();
    this._handleError(timeoutError);
  }

  /**
   * Emit an event to listeners
   * 
   * @private
   */
  _emit(event, ...args) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in stream event listener for ${event}:`, error);
        }
      });
    }
  }
} 