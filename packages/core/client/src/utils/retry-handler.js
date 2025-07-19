/**
 * Retry Handler for Flight Client Operations
 *
 * This utility class provides sophisticated retry logic with exponential
 * backoff, circuit breaker patterns, and configurable retry strategies.
 */
export class RetryHandler {
  constructor(options = {}) {
    this.options = {
      maxAttempts: options.maxAttempts || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      backoffMultiplier: options.backoffMultiplier || 2,
      jitter: options.jitter !== false,
      retryableErrors: options.retryableErrors || [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'UNAVAILABLE',
        'DEADLINE_EXCEEDED'
      ],
      logger: options.logger || console,
      ...options
    };

    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.circuitBreakerState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  /**
   * Execute an operation with retry logic
   * @param {Function} operation - The operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Operation result
   */
  async execute(operation, options = {}) {
    const config = { ...this.options, ...options };
    let lastError;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // Check circuit breaker
        if (this.circuitBreakerState === 'OPEN') {
          if (Date.now() - this.lastFailureTime < config.circuitBreakerTimeout || 60000) {
            throw new Error('Circuit breaker is open');
          }
          this.circuitBreakerState = 'HALF_OPEN';
        }

        const result = await operation();
        
        // Success - reset circuit breaker
        this._onSuccess();
        return result;

      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this._isRetryableError(error)) {
          throw error;
        }

        // Check if we should stop retrying
        if (attempt === config.maxAttempts) {
          this._onFailure();
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this._calculateDelay(attempt, config);
        
        config.logger.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, error.message);
        
        // Wait before retrying
        await this._wait(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} True if error is retryable
   * @private
   */
  _isRetryableError(error) {
    const errorCode = error.code || error.message;
    
    return this.options.retryableErrors.some(retryableError => 
      errorCode.includes(retryableError) || 
      error.message.includes(retryableError)
    );
  }

  /**
   * Calculate delay for retry with exponential backoff
   * @param {number} attempt - Current attempt number
   * @param {Object} config - Retry configuration
   * @returns {number} Delay in milliseconds
   * @private
   */
  _calculateDelay(attempt, config) {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Cap at max delay
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitter = delay * 0.1; // 10% jitter
      delay += Math.random() * jitter - jitter / 2;
    }
    
    return Math.floor(delay);
  }

  /**
   * Wait for a specified delay
   * @param {number} delay - Delay in milliseconds
   * @returns {Promise<void>}
   * @private
   */
  _wait(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Handle successful operation
   * @private
   */
  _onSuccess() {
    this.failureCount = 0;
    this.circuitBreakerState = 'CLOSED';
  }

  /**
   * Handle failed operation
   * @private
   */
  _onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // Open circuit breaker if too many failures
    if (this.failureCount >= (this.options.circuitBreakerThreshold || 5)) {
      this.circuitBreakerState = 'OPEN';
    }
  }

  /**
   * Get retry statistics
   * @returns {Object} Retry statistics
   */
  getStats() {
    return {
      failureCount: this.failureCount,
      circuitBreakerState: this.circuitBreakerState,
      lastFailureTime: this.lastFailureTime,
      config: this.options
    };
  }

  /**
   * Reset retry handler state
   */
  reset() {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.circuitBreakerState = 'CLOSED';
  }
} 