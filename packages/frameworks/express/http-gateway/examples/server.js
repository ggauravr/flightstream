require('dotenv').config();
const express = require('express');
const pino = require('pino');
const flightGateway = require('../src');

const app = express();
const port = process.env.PORT || 3001;
const flightServerUrl = process.env.FLIGHT_SERVER_URL || 'grpc://localhost:8080';

// Create a pino logger for the example
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

// Simple usage - just pass the flight server URL and logger
app.use('/api/v1', flightGateway(flightServerUrl, { logger }));

app.get('/api/v1/list', flightGateway.createListHandler());
app.post('/api/v1/query', flightGateway.createQueryHandler());
app.post('/api/v1/info', flightGateway.createFlightInfoHandler());
app.post('/api/v1/schema', flightGateway.createSchemaHandler());

// Basic route
app.get('/', (req, res) => {
  res.send('Flightstream HTTP Gateway Example');
});

app.listen(port, () => {
  logger.info(`HTTP Gateway example listening at http://localhost:${port}`);
}); 