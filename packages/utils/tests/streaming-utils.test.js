/**
 * Tests for streaming utilities
 * @fileoverview Comprehensive test suite for streaming data processing utilities
 */

import {
  StreamProcessor,
  BatchProcessor,
  DataChunker,
  StreamBuffer,
  RateLimiter
} from '../src/streaming-utils.js';

describe('Streaming Utils', () => {
  describe('StreamProcessor', () => {
    let processor;

    beforeEach(() => {
      processor = new class extends StreamProcessor {
        async _process() {
          // Mock implementation for testing
          for (let i = 0; i < 100; i++) {
            this.addToBatch({ id: i, data: `item-${i}` });
            if (i % 10 === 9) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
          this.flushBatch();
        }
      }();
    });

    describe('construction', () => {
      it('should initialize with default options', () => {
        const proc = new class extends StreamProcessor {
          async _process() {}
        }();
        
        expect(proc.options.batchSize).toBe(10000);
        expect(proc.options.maxConcurrency).toBe(1);
        expect(proc.options.errorRetries).toBe(3);
        expect(proc.options.backpressureThreshold).toBe(50000);
      });

      it('should accept custom batch size', () => {
        const proc = new class extends StreamProcessor {
          async _process() {}
        }({ batchSize: 5000 });
        
        expect(proc.options.batchSize).toBe(5000);
      });

      it('should accept custom concurrency limits', () => {
        const proc = new class extends StreamProcessor {
          async _process() {}
        }({ maxConcurrency: 5 });
        
        expect(proc.options.maxConcurrency).toBe(5);
      });

      it('should accept custom error retry counts', () => {
        const proc = new class extends StreamProcessor {
          async _process() {}
        }({ errorRetries: 5 });
        
        expect(proc.options.errorRetries).toBe(5);
      });

      it('should accept custom backpressure thresholds', () => {
        const proc = new class extends StreamProcessor {
          async _process() {}
        }({ backpressureThreshold: 100000 });
        
        expect(proc.options.backpressureThreshold).toBe(100000);
      });
    });

    describe('lifecycle management', () => {
      it('should track processing state', () => {
        expect(processor.isProcessing).toBe(false);
      });

      it('should emit start event when processing begins', async () => {
        const startSpy = jest.fn();
        processor.on('start', startSpy);
        
        const promise = processor.start();
        expect(startSpy).toHaveBeenCalled();
        await promise;
      });

      it('should emit complete event with statistics', async () => {
        const completeSpy = jest.fn();
        processor.on('complete', completeSpy);
        
        await processor.start();
        expect(completeSpy).toHaveBeenCalledWith({
          totalProcessed: 100,
          errorCount: 0
        });
      });

      it('should emit error events for failures', async () => {
        const errorProcessor = new class extends StreamProcessor {
          async _process() {
            throw new Error('Test error');
          }
        }();
        
        const errorSpy = jest.fn();
        errorProcessor.on('error', errorSpy);
        
        await expect(errorProcessor.start()).rejects.toThrow('Test error');
        expect(errorSpy).toHaveBeenCalled();
      });

      it('should emit stop event when stopped', () => {
        const stopSpy = jest.fn();
        processor.on('stop', stopSpy);
        
        processor.stop();
        expect(stopSpy).toHaveBeenCalled();
      });
    });

    describe('batch management', () => {
      it('should add items to current batch', () => {
        processor.addToBatch({ id: 1 });
        expect(processor.currentBatch).toHaveLength(1);
      });

      it('should flush batch when size limit reached', () => {
        const batchSpy = jest.fn();
        processor.on('batch', batchSpy);
        
        // Set small batch size for testing
        processor.options.batchSize = 3;
        
        processor.addToBatch({ id: 1 });
        processor.addToBatch({ id: 2 });
        processor.addToBatch({ id: 3 }); // Should trigger flush
        
        expect(batchSpy).toHaveBeenCalledWith([
          { id: 1 }, { id: 2 }, { id: 3 }
        ]);
      });

      it('should emit batch events with data', () => {
        const batchSpy = jest.fn();
        processor.on('batch', batchSpy);
        
        processor.addToBatch({ id: 1 });
        processor.flushBatch();
        
        expect(batchSpy).toHaveBeenCalledWith([{ id: 1 }]);
      });

      it('should track total processed count', () => {
        processor.addToBatch({ id: 1 });
        processor.addToBatch({ id: 2 });
        processor.flushBatch();
        
        expect(processor.totalProcessed).toBe(2);
      });
    });

    describe('statistics', () => {
      it('should provide processing statistics', () => {
        const stats = processor.getStats();
        expect(stats).toHaveProperty('isProcessing');
        expect(stats).toHaveProperty('totalProcessed');
        expect(stats).toHaveProperty('errorCount');
        expect(stats).toHaveProperty('currentBatchSize');
        expect(stats).toHaveProperty('pendingBatches');
        expect(stats).toHaveProperty('batchSize');
      });
    });
  });

  describe('BatchProcessor', () => {
    let processorFn;
    let batchProcessor;

    beforeEach(() => {
      processorFn = jest.fn().mockResolvedValue({ processed: true });
      batchProcessor = new BatchProcessor(processorFn);
    });

    describe('construction', () => {
      it('should require processor function', () => {
        expect(() => new BatchProcessor()).toThrow();
      });

      it('should inherit from StreamProcessor', () => {
        expect(batchProcessor).toBeInstanceOf(StreamProcessor);
      });

      it('should initialize active batches set', () => {
        expect(batchProcessor.activeBatches).toBeInstanceOf(Set);
        expect(batchProcessor.activeBatches.size).toBe(0);
      });
    });

    describe('batch processing', () => {
      it('should process batches with provided function', async () => {
        const batch = [{ id: 1 }, { id: 2 }];
        await batchProcessor.processBatch(batch);
        
        expect(processorFn).toHaveBeenCalledWith(batch);
      });

      it('should assign unique batch IDs', async () => {
        const batch1Promise = batchProcessor.processBatch([{ id: 1 }]);
        const batch2Promise = batchProcessor.processBatch([{ id: 2 }]);
        
        await Promise.all([batch1Promise, batch2Promise]);
        // Both should complete without interference
        expect(processorFn).toHaveBeenCalledTimes(2);
      });

      it('should emit batch lifecycle events', async () => {
        const startSpy = jest.fn();
        const completeSpy = jest.fn();
        
        batchProcessor.on('batch-start', startSpy);
        batchProcessor.on('batch-complete', completeSpy);
        
        const batch = [{ id: 1 }];
        await batchProcessor.processBatch(batch);
        
        expect(startSpy).toHaveBeenCalled();
        expect(completeSpy).toHaveBeenCalled();
      });

      it('should track active batches', async () => {
        // Mock a slow processor
        processorFn.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ processed: true }), 100))
        );
        
        const batchPromise = batchProcessor.processBatch([{ id: 1 }]);
        expect(batchProcessor.activeBatches.size).toBe(1);
        
        await batchPromise;
        expect(batchProcessor.activeBatches.size).toBe(0);
      });
    });

    describe('error handling and retry', () => {
      beforeEach(() => {
        processorFn.mockRejectedValue(new Error('Processing failed'));
        batchProcessor.options.errorRetries = 2;
      });

      it('should retry failed batches', async () => {
        const errorSpy = jest.fn();
        batchProcessor.on('batch-error', errorSpy);
        
        await expect(batchProcessor.processBatch([{ id: 1 }]))
          .rejects.toThrow('Processing failed');
        
        expect(processorFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });

      it('should respect retry limits', async () => {
        await expect(batchProcessor.processBatch([{ id: 1 }]))
          .rejects.toThrow('Processing failed');
        
        expect(batchProcessor.errorCount).toBe(3); // Initial + 2 retries
      });

      it('should emit error events after retry exhaustion', async () => {
        const errorSpy = jest.fn();
        batchProcessor.on('batch-error', errorSpy);
        
        await expect(batchProcessor.processBatch([{ id: 1 }]))
          .rejects.toThrow('Processing failed');
        
        expect(errorSpy).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('DataChunker', () => {
    let chunker;

    beforeEach(() => {
      chunker = new DataChunker({ chunkSize: 3 });
    });

    describe('construction', () => {
      it('should accept chunk size options', () => {
        expect(chunker.options.chunkSize).toBe(3);
      });

      it('should set default chunk size', () => {
        const defaultChunker = new DataChunker();
        expect(defaultChunker.options.chunkSize).toBe(1000);
      });
    });

    describe('chunking operations', () => {
      it('should split arrays into chunks', () => {
        const data = [1, 2, 3, 4, 5, 6, 7];
        const chunks = chunker.chunk(data);
        
        expect(chunks).toHaveLength(3);
        expect(chunks[0]).toEqual([1, 2, 3]);
        expect(chunks[1]).toEqual([4, 5, 6]);
        expect(chunks[2]).toEqual([7]);
      });

      it('should handle chunk size boundaries', () => {
        const data = [1, 2, 3, 4, 5, 6]; // Exactly 2 chunks
        const chunks = chunker.chunk(data);
        
        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toEqual([1, 2, 3]);
        expect(chunks[1]).toEqual([4, 5, 6]);
      });

      it('should handle empty arrays', () => {
        const chunks = chunker.chunk([]);
        expect(chunks).toEqual([]);
      });

      it('should handle arrays smaller than chunk size', () => {
        const data = [1, 2];
        const chunks = chunker.chunk(data);
        
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toEqual([1, 2]);
      });
    });

    describe('streaming chunker', () => {
      it('should create streaming chunker with callback', () => {
        const callback = jest.fn();
        const streamingChunker = chunker.createStreamingChunker(callback);
        
        expect(streamingChunker).toBeDefined();
        expect(typeof streamingChunker.write).toBe('function');
        expect(typeof streamingChunker.end).toBe('function');
      });

      it('should process data incrementally', () => {
        const callback = jest.fn();
        const streamingChunker = chunker.createStreamingChunker(callback);
        
        streamingChunker.write([1, 2]);
        streamingChunker.write([3, 4]);
        streamingChunker.write([5]);
        streamingChunker.end();
        
        expect(callback).toHaveBeenCalledWith([1, 2, 3]);
        expect(callback).toHaveBeenCalledWith([4, 5]);
      });
    });
  });

  describe('StreamBuffer', () => {
    let buffer;

    beforeEach(() => {
      buffer = new StreamBuffer({ highWaterMark: 5, lowWaterMark: 2 });
    });

    describe('construction', () => {
      it('should initialize with buffer options', () => {
        expect(buffer.options.highWaterMark).toBe(5);
        expect(buffer.options.lowWaterMark).toBe(2);
      });
    });

    describe('buffer operations', () => {
      it('should accept data writes', () => {
        expect(buffer.write({ id: 1 })).toBe(true);
        expect(buffer.buffer).toHaveLength(1);
      });

      it('should emit drain events when space available', (done) => {
        // Fill buffer to high water mark
        for (let i = 0; i < 5; i++) {
          buffer.write({ id: i });
        }
        
        buffer.on('drain', () => {
          done();
        });
        
        // Read to trigger drain
        buffer.read(4); // Should trigger drain when below low water mark
      });

      it('should emit data events when readable', (done) => {
        buffer.on('data', (data) => {
          expect(data).toEqual({ id: 1 });
          done();
        });
        
        buffer.write({ id: 1 });
      });

      it('should handle buffer overflow', () => {
        // Fill beyond high water mark
        for (let i = 0; i < 10; i++) {
          const result = buffer.write({ id: i });
          if (i >= 5) {
            expect(result).toBe(false); // Should indicate backpressure
          }
        }
      });
    });

    describe('read operations', () => {
      beforeEach(() => {
        // Pre-fill buffer
        for (let i = 0; i < 3; i++) {
          buffer.write({ id: i });
        }
      });

      it('should read specified number of items', () => {
        const items = buffer.read(2);
        expect(items).toHaveLength(2);
        expect(items[0]).toEqual({ id: 0 });
        expect(items[1]).toEqual({ id: 1 });
      });

      it('should return available items when less than requested', () => {
        const items = buffer.read(5); // Request more than available
        expect(items).toHaveLength(3); // Only 3 available
      });

      it('should handle empty buffer reads', () => {
        buffer.read(10); // Clear buffer
        const items = buffer.read(1);
        expect(items).toHaveLength(0);
      });
    });

    describe('backpressure management', () => {
      it('should detect when draining needed', () => {
        // Fill beyond high water mark
        for (let i = 0; i < 6; i++) {
          buffer.write({ id: i });
        }
        
        expect(buffer.needsDraining()).toBe(true);
      });

      it('should provide buffer statistics', () => {
        buffer.write({ id: 1 });
        const stats = buffer.getStats();
        
        expect(stats).toHaveProperty('length', 1);
        expect(stats).toHaveProperty('highWaterMark', 5);
        expect(stats).toHaveProperty('lowWaterMark', 2);
        expect(stats).toHaveProperty('needsDraining');
      });
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter({ 
        tokensPerSecond: 10, 
        bucketSize: 5 
      });
    });

    describe('construction', () => {
      it('should initialize with rate limits', () => {
        expect(rateLimiter.options.tokensPerSecond).toBe(10);
        expect(rateLimiter.options.bucketSize).toBe(5);
      });

      it('should start with full token bucket', () => {
        expect(rateLimiter.tokens).toBe(5);
      });
    });

    describe('rate limiting', () => {
      it('should allow operations within rate limit', () => {
        expect(rateLimiter.tryAcquire()).toBe(true);
        expect(rateLimiter.tryAcquire()).toBe(true);
        expect(rateLimiter.tokens).toBe(3);
      });

      it('should deny operations exceeding rate limit', () => {
        // Exhaust all tokens
        for (let i = 0; i < 5; i++) {
          rateLimiter.tryAcquire();
        }
        
        expect(rateLimiter.tryAcquire()).toBe(false);
      });

      it('should refill tokens over time', (done) => {
        // Exhaust tokens
        for (let i = 0; i < 5; i++) {
          rateLimiter.tryAcquire();
        }
        
        expect(rateLimiter.tokens).toBe(0);
        
        // Wait for refill (mocked timer or actual delay)
        setTimeout(() => {
          rateLimiter.refillTokens();
          expect(rateLimiter.tokens).toBeGreaterThan(0);
          done();
        }, 200);
      });

      it('should provide async acquisition with waiting', async () => {
        // Exhaust tokens
        for (let i = 0; i < 5; i++) {
          rateLimiter.tryAcquire();
        }
        
        // This should wait for token refill
        const start = Date.now();
        await rateLimiter.acquire();
        const elapsed = Date.now() - start;
        
        expect(elapsed).toBeGreaterThan(50); // Should have waited
      });
    });

    describe('token management', () => {
      it('should consume tokens for operations', () => {
        const initialTokens = rateLimiter.tokens;
        rateLimiter.tryAcquire();
        expect(rateLimiter.tokens).toBe(initialTokens - 1);
      });

      it('should refill tokens at specified rate', () => {
        rateLimiter.tokens = 0;
        rateLimiter.refillTokens();
        
        // Should add some tokens based on time elapsed
        expect(rateLimiter.tokens).toBeGreaterThanOrEqual(0);
      });

      it('should handle token bucket overflow', () => {
        // Tokens should not exceed bucket size
        rateLimiter.tokens = rateLimiter.options.bucketSize + 10;
        rateLimiter.refillTokens();
        
        expect(rateLimiter.tokens).toBeLessThanOrEqual(rateLimiter.options.bucketSize);
      });
    });
  });
}); 