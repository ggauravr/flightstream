require('dotenv').config();

// Main gateway function for simple usage
const createFlightGateway = require('./flight-gateway');

// Individual components for advanced usage
const createFlightClient = require('./flight-client');
const createQueryHandler = require('./handlers/do-get');
const createListHandler = require('./handlers/list-flights');
const createFlightInfoHandler = require('./handlers/get-flight-info');
const createSchemaHandler = require('./handlers/get-schema');
const createErrorHandler = require('./error-handler');

// Simple usage: app.use('/api/v1', flightGateway(flightServerUrl, { logger }))
module.exports = createFlightGateway;

// Advanced usage: const { createFlightClient, createQueryHandler, createListHandler, createErrorHandler } = require(...)
module.exports.createFlightClient = createFlightClient;
module.exports.createQueryHandler = createQueryHandler;
module.exports.createListHandler = createListHandler;
module.exports.createFlightInfoHandler = createFlightInfoHandler;
module.exports.createSchemaHandler = createSchemaHandler;
module.exports.createErrorHandler = createErrorHandler;
module.exports.createFlightGateway = createFlightGateway; 