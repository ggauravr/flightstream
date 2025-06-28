/**
 * @fileoverview Tests for error classes
 */

import {
  FlightClientError,
  ConnectionError,
  DataError,
  AuthError,
  StreamError,
  ConfigError,
  TimeoutError
} from '../src/errors.js';

describe('Error Classes', () => {
  describe('FlightClientError', () => {
    it('should create error with message', () => {
      const error = new FlightClientError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FlightClientError);
      expect(error.name).toBe('FlightClientError');
      expect(error.message).toBe('Test error');
      expect(error.cause).toBeNull();
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new FlightClientError('Wrapped error', cause);
      
      expect(error.cause).toBe(cause);
    });

    it('should serialize to JSON', () => {
      const cause = new Error('Original error');
      const error = new FlightClientError('Test error', cause);
      const json = error.toJSON();
      
      expect(json.name).toBe('FlightClientError');
      expect(json.message).toBe('Test error');
      expect(json.cause).toBe('Original error');
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });
  });

  describe('ConnectionError', () => {
    it('should extend FlightClientError', () => {
      const error = new ConnectionError('Connection failed');
      
      expect(error).toBeInstanceOf(FlightClientError);
      expect(error).toBeInstanceOf(ConnectionError);
      expect(error.name).toBe('ConnectionError');
      expect(error.message).toBe('Connection failed');
    });
  });

  describe('DataError', () => {
    it('should extend FlightClientError', () => {
      const error = new DataError('Data processing failed');
      
      expect(error).toBeInstanceOf(FlightClientError);
      expect(error).toBeInstanceOf(DataError);
      expect(error.name).toBe('DataError');
      expect(error.message).toBe('Data processing failed');
    });
  });

  describe('AuthError', () => {
    it('should extend FlightClientError', () => {
      const error = new AuthError('Authentication failed');
      
      expect(error).toBeInstanceOf(FlightClientError);
      expect(error).toBeInstanceOf(AuthError);
      expect(error.name).toBe('AuthError');
      expect(error.message).toBe('Authentication failed');
    });
  });

  describe('StreamError', () => {
    it('should extend FlightClientError', () => {
      const error = new StreamError('Stream error');
      
      expect(error).toBeInstanceOf(FlightClientError);
      expect(error).toBeInstanceOf(StreamError);
      expect(error.name).toBe('StreamError');
      expect(error.message).toBe('Stream error');
    });
  });

  describe('ConfigError', () => {
    it('should extend FlightClientError', () => {
      const error = new ConfigError('Configuration error');
      
      expect(error).toBeInstanceOf(FlightClientError);
      expect(error).toBeInstanceOf(ConfigError);
      expect(error.name).toBe('ConfigError');
      expect(error.message).toBe('Configuration error');
    });
  });

  describe('TimeoutError', () => {
    it('should extend FlightClientError with timeout info', () => {
      const error = new TimeoutError('Operation timed out', 5000);
      
      expect(error).toBeInstanceOf(FlightClientError);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Operation timed out');
      expect(error.timeout).toBe(5000);
    });

    it('should include timeout in JSON serialization', () => {
      const error = new TimeoutError('Timeout', 3000);
      const json = error.toJSON();
      
      expect(json.timeout).toBe(3000);
      expect(json.name).toBe('TimeoutError');
    });
  });

  describe('Error stack traces', () => {
    it('should capture proper stack traces', () => {
      const error = new FlightClientError('Test');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('FlightClientError');
    });

    it('should maintain stack trace through inheritance', () => {
      const error = new ConnectionError('Connection failed');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConnectionError');
    });
  });

  describe('Error chaining', () => {
    it('should chain errors properly', () => {
      const original = new Error('Network error');
      const wrapped = new ConnectionError('Failed to connect', original);
      
      expect(wrapped.cause).toBe(original);
      expect(wrapped.message).toBe('Failed to connect');
      expect(wrapped.toJSON().cause).toBe('Network error');
    });

    it('should handle null causes', () => {
      const error = new DataError('Processing failed', null);
      
      expect(error.cause).toBeNull();
      expect(error.toJSON().cause).toBeNull();
    });
  });
}); 