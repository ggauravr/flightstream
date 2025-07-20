import { EventEmitter } from 'events';
import { DEFAULT_FLIGHT_CONFIG } from '@flightstream/core-shared';

/**
 * Connection Manager for Flight Clients
 *
 * This utility class manages connection health monitoring, automatic
 * reconnection, and connection pooling for Flight clients.
 */
export class ConnectionManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 1000,
      connectionTimeout: options.connectionTimeout || DEFAULT_FLIGHT_CONFIG.connectionTimeout,
      logger: options.logger || console,
      ...options
    };

    this.isHealthy = false;
    this.reconnectAttempts = 0;
    this.healthCheckTimer = null;
    this.client = null;
  }

  /**
   * Set the client instance to manage
   * @param {FlightClient} client - The Flight client instance
   */
  setClient(client) {
    this.client = client;
    
    // Listen to client events
    client.on('connected', () => {
      this.isHealthy = true;
      this.reconnectAttempts = 0;
      this.emit('healthy');
      this._startHealthCheck();
    });

    client.on('disconnected', () => {
      this.isHealthy = false;
      this.emit('unhealthy');
      this._stopHealthCheck();
    });

    client.on('connectionError', (error) => {
      this.isHealthy = false;
      this.emit('error', error);
      this._handleConnectionError();
    });
  }

  /**
   * Start health monitoring
   */
  _startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this._performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  _stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Perform a health check
   * @private
   */
  async _performHealthCheck() {
    if (!this.client) {
      return;
    }

    try {
      const isConnected = await this.client.testConnection();
      
      if (isConnected !== this.isHealthy) {
        this.isHealthy = isConnected;
        
        if (isConnected) {
          this.emit('healthy');
        } else {
          this.emit('unhealthy');
          this._handleConnectionError();
        }
      }
    } catch (error) {
      this.options.logger.warn('Health check failed:', error);
      this.isHealthy = false;
      this.emit('unhealthy');
      this._handleConnectionError();
    }
  }

  /**
   * Handle connection errors and attempt reconnection
   * @private
   */
  async _handleConnectionError() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    // Wait before attempting reconnection
    await new Promise(resolve => 
      setTimeout(resolve, this.options.reconnectDelay * this.reconnectAttempts)
    );

    try {
      await this.client.connect();
      this.reconnectAttempts = 0;
      this.emit('reconnected');
    } catch (error) {
      this.options.logger.error('Reconnection attempt failed:', error);
      this.emit('reconnectFailed', error);
    }
  }

  /**
   * Get connection health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.options.maxReconnectAttempts,
      healthCheckInterval: this.options.healthCheckInterval
    };
  }

  /**
   * Stop the connection manager
   */
  stop() {
    this._stopHealthCheck();
    this.removeAllListeners();
  }
} 