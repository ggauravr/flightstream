const express = require('express');
const cors = require('cors');
const createFlightClient = require('./flight-client');
const createQueryHandler = require('./handlers/do-get');
const createListHandler = require('./handlers/list-flights');
const createFlightInfoHandler = require('./handlers/get-flight-info');
const createSchemaHandler = require('./handlers/get-schema');
const createErrorHandler = require('./error-handler');

function createFlightGateway(flightServerUrl, options = {}) {
    const router = express.Router();
    const flightClient = createFlightClient(flightServerUrl, options);
    const queryHandler = createQueryHandler(flightClient, options);
    const listHandler = createListHandler(flightClient, options);
    const flightInfoHandler = createFlightInfoHandler(flightClient, options);
    const schemaHandler = createSchemaHandler(flightClient, options);
    const errorHandler = createErrorHandler(options);

    // Middleware
    router.use(cors());
    router.use(express.json());

    // Routes
    // list datasets
    router.get('/list', listHandler);
    
    // fetch data by dataset identifier
    router.post('/query', queryHandler);
    
    // get flight info for a dataset
    router.post('/info', flightInfoHandler);
    
    // get schema for a dataset
    router.post('/schema', schemaHandler);

    // Error handling
    router.use(errorHandler);

    return router;
}

module.exports = createFlightGateway; 