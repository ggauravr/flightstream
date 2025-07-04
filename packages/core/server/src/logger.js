import pino from 'pino';

/**
 * Create a configured pino logger instance
 * @param {Object} options - Logger options
 * @returns {Object} Pino logger instance
 */
export const createLogger = (options = {}) => {
  const env = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || 'info';
  const logFormat = process.env.LOG_FORMAT || (env === 'development' ? 'pretty' : 'json');
  const logSilent = process.env.LOG_SILENT === 'true';

  const config = {
    level: logLevel,
    silent: logSilent,
    timestamp: pino.stdTimeFunctions.isoTime,
    ...options
  };

  // Use pretty printing for development
  if (logFormat === 'pretty' && !logSilent) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    };
  }

  return pino(config);
};

export default createLogger;
