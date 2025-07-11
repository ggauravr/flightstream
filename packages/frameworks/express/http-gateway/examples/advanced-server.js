require('dotenv').config();
const express = require('express');
const pino = require('pino');
const { 
  createFlightClient, 
  createQueryHandler, 
  createListHandler, 
  createFlightInfoHandler,
  createSchemaHandler,
  createErrorHandler 
} = require('../src');

const app = express();
const port = process.env.PORT || 3002;
const flightServerUrl = process.env.FLIGHT_SERVER_URL || 'grpc://localhost:8080';

// Create a pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  }
});

// Advanced usage - use individual components for more control
const flightClient = createFlightClient(flightServerUrl, { logger });
const queryHandler = createQueryHandler(flightClient, { logger });
const listHandler = createListHandler(flightClient, { logger });
const flightInfoHandler = createFlightInfoHandler(flightClient, { logger });
const schemaHandler = createSchemaHandler(flightClient, { logger });
const errorHandler = createErrorHandler({ logger });

// Custom middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    }, 'Request completed');
  });
  next();
});

// Parse JSON bodies
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Flightstream HTTP Gateway - Advanced Example',
    endpoints: {
      list: 'GET /api/v1/list',
      query: 'POST /api/v1/query',
      health: 'GET /health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Flight endpoints
app.get('/api/v1/list', listHandler);
app.post('/api/v1/query', queryHandler);
app.post('/api/v1/info', flightInfoHandler);
app.post('/api/v1/schema', schemaHandler);

// Custom error handling
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Advanced HTTP Gateway example listening at http://localhost:${port}`);
}); 