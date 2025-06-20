/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EventEmitter } from 'events';

/**
 * Streaming Utilities for Data Processing
 * 
 * This module provides common streaming patterns and utilities for processing
 * large datasets efficiently. It includes batching, backpressure handling,
 * error recovery, and memory management utilities.
 * 
 * Key features:
 * 1. Batch processing with configurable sizes
 * 2. Backpressure handling for stream control
 * 3. Error recovery and resilience patterns
 * 4. Memory-efficient data streaming
 * 5. Generic stream transformations
 */

/**
 * Base Stream Processor
 * 
 * Provides common streaming functionality that can be extended
 * by specific data source implementations.
 */
export class StreamProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      batchSize: options.batchSize || 10000,
      maxConcurrency: options.maxConcurrency || 1,
      errorRetries: options.errorRetries || 3,
      backpressureThreshold: options.backpressureThreshold || 50000,
      ...options
    };
    
    this.isProcessing = false;
    this.totalProcessed = 0;
    this.errorCount = 0;
    this.currentBatch = [];
    this.pendingBatches = [];
  }

  /**
   * Start processing stream
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isProcessing) {
      throw new Error('Stream processing already in progress');
    }

    this.isProcessing = true;
    this.totalProcessed = 0;
    this.errorCount = 0;
    this.emit('start');

    try {
      await this._process();
      this.emit('complete', { totalProcessed: this.totalProcessed, errorCount: this.errorCount });
    } catch (error) {
      this.emit('error', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Stop processing stream
   */
  stop() {
    if (this.isProcessing) {
      this.isProcessing = false;
      this.emit('stop');
    }
  }

  /**
   * Process data - to be implemented by subclasses
   * @private
   */
  async _process() {
    throw new Error('_process() must be implemented by subclass');
  }

  /**
   * Add item to current batch
   * @param {*} item - Item to add
   */
  addToBatch(item) {
    this.currentBatch.push(item);
    
    if (this.currentBatch.length >= this.options.batchSize) {
      this.flushBatch();
    }
  }

  /**
   * Flush current batch
   */
  flushBatch() {
    if (this.currentBatch.length > 0) {
      this.emit('batch', [...this.currentBatch]);
      this.totalProcessed += this.currentBatch.length;
      this.currentBatch = [];
    }
  }

  /**
   * Handle backpressure by pausing processing
   */
  async handleBackpressure() {
    if (this.pendingBatches.length > this.options.backpressureThreshold) {
      this.emit('backpressure', { pendingBatches: this.pendingBatches.length });
      
      // Wait for pending batches to clear
      while (this.pendingBatches.length > this.options.backpressureThreshold / 2 && this.isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      isProcessing: this.isProcessing,
      totalProcessed: this.totalProcessed,
      errorCount: this.errorCount,
      currentBatchSize: this.currentBatch.length,
      pendingBatches: this.pendingBatches.length,
      batchSize: this.options.batchSize
    };
  }
}

/**
 * Batch Processor
 * 
 * Processes data in configurable batches with memory management
 */
export class BatchProcessor extends StreamProcessor {
  constructor(processor, options = {}) {
    super(options);
    this.processor = processor;
    this.activeBatches = new Set();
  }

  /**
   * Process a batch of items
   * @param {Array} batch - Batch to process
   * @returns {Promise<*>} Processing result
   */
  async processBatch(batch) {
    const batchId = Math.random().toString(36).substr(2, 9);
    this.activeBatches.add(batchId);
    
    try {
      this.emit('batch-start', { batchId, size: batch.length });
      
      const result = await this.processor(batch);
      
      this.emit('batch-complete', { batchId, size: batch.length, result });
      return result;
      
    } catch (error) {
      this.errorCount++;
      this.emit('batch-error', { batchId, size: batch.length, error });
      
      // Retry logic
      if (this.errorCount <= this.options.errorRetries) {
        console.warn(`Batch processing failed, retrying (${this.errorCount}/${this.options.errorRetries}):`, error.message);
        return this.processBatch(batch);
      }
      
      throw error;
    } finally {
      this.activeBatches.delete(batchId);
    }
  }

  /**
   * Process multiple batches with concurrency control
   * @param {Array} batches - Array of batches to process
   * @returns {Promise<Array>} Array of results
   */
  async processBatches(batches) {
    const results = [];
    const semaphore = new Semaphore(this.options.maxConcurrency);
    
    const promises = batches.map(async (batch, index) => {
      await semaphore.acquire();
      
      try {
        const result = await this.processBatch(batch);
        results[index] = result;
        return result;
      } finally {
        semaphore.release();
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  getStats() {
    return {
      ...super.getStats(),
      activeBatches: this.activeBatches.size
    };
  }
}

/**
 * Data Chunker
 * 
 * Splits data streams into configurable chunks
 */
export class DataChunker {
  constructor(options = {}) {
    this.options = {
      chunkSize: options.chunkSize || 1000,
      overlap: options.overlap || 0,
      ...options
    };
  }

  /**
   * Split array into chunks
   * @param {Array} data - Data to chunk
   * @returns {Array} Array of chunks
   */
  chunk(data) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    const chunks = [];
    const chunkSize = this.options.chunkSize;
    const overlap = this.options.overlap;
    const step = chunkSize - overlap;

    for (let i = 0; i < data.length; i += step) {
      const chunk = data.slice(i, i + chunkSize);
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Create streaming chunker
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Object} Chunker interface
   */
  createStreamingChunker(onChunk) {
    let buffer = [];
    
    return {
      add: (items) => {
        buffer.push(...items);
        
        while (buffer.length >= this.options.chunkSize) {
          const chunk = buffer.splice(0, this.options.chunkSize);
          onChunk(chunk);
        }
      },
      
      flush: () => {
        if (buffer.length > 0) {
          onChunk([...buffer]);
          buffer = [];
        }
      },
      
      getBufferSize: () => buffer.length
    };
  }
}

/**
 * Stream Buffer
 * 
 * Provides buffering for smooth data flow
 */
export class StreamBuffer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxSize: options.maxSize || 10000,
      lowWaterMark: options.lowWaterMark || 2000,
      highWaterMark: options.highWaterMark || 8000,
      ...options
    };
    
    this.buffer = [];
    this.isReading = false;
    this.isDraining = false;
  }

  /**
   * Write data to buffer
   * @param {*} data - Data to write
   * @returns {boolean} Whether more data can be written
   */
  write(data) {
    if (this.buffer.length >= this.options.maxSize) {
      this.emit('overflow', { bufferSize: this.buffer.length });
      return false;
    }

    this.buffer.push(data);
    
    if (this.buffer.length >= this.options.highWaterMark && !this.isDraining) {
      this.emit('drain-needed');
    }
    
    this.emit('data', data);
    return true;
  }

  /**
   * Read data from buffer
   * @param {number} count - Number of items to read
   * @returns {Array} Read items
   */
  read(count = 1) {
    const items = this.buffer.splice(0, count);
    
    if (this.buffer.length <= this.options.lowWaterMark && this.isDraining) {
      this.isDraining = false;
      this.emit('drained');
    }
    
    return items;
  }

  /**
   * Check if buffer needs draining
   * @returns {boolean}
   */
  needsDraining() {
    return this.buffer.length >= this.options.highWaterMark;
  }

  /**
   * Get buffer statistics
   * @returns {Object}
   */
  getStats() {
    return {
      size: this.buffer.length,
      maxSize: this.options.maxSize,
      utilizationPercent: (this.buffer.length / this.options.maxSize) * 100,
      needsDraining: this.needsDraining(),
      isDraining: this.isDraining
    };
  }
}

/**
 * Semaphore for concurrency control
 */
class Semaphore {
  constructor(count) {
    this.count = count;
    this.waiting = [];
  }

  async acquire() {
    if (this.count > 0) {
      this.count--;
      return;
    }

    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  release() {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      resolve();
    } else {
      this.count++;
    }
  }
}

/**
 * Rate Limiter for controlling processing speed
 */
export class RateLimiter {
  constructor(options = {}) {
    this.options = {
      requestsPerSecond: options.requestsPerSecond || 100,
      burstSize: options.burstSize || 10,
      ...options
    };
    
    this.tokens = this.options.burstSize;
    this.lastRefill = Date.now();
  }

  /**
   * Check if operation is allowed
   * @returns {boolean}
   */
  tryAcquire() {
    this.refillTokens();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  /**
   * Wait for permission to proceed
   * @returns {Promise<void>}
   */
  async acquire() {
    while (!this.tryAcquire()) {
      const waitTime = 1000 / this.options.requestsPerSecond;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Refill token bucket
   * @private
   */
  refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 1000) * this.options.requestsPerSecond);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.options.burstSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

export default {
  StreamProcessor,
  BatchProcessor,
  DataChunker,
  StreamBuffer,
  RateLimiter
}; 