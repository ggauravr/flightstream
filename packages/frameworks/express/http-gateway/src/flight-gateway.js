const express = require('express');
const cors = require('cors');
const createFlightClient = require('./flight-client');
const createQueryHandler = require('./query-handler');
const createErrorHandler = require('./error-handler');

function createFlightGateway(flightServerUrl, options = {}) {
    const router = express.Router();
    const flightClient = createFlightClient(flightServerUrl, options);
    const queryHandler = createQueryHandler(flightClient, options);
    const errorHandler = createErrorHandler(options);

    // Middleware
    router.use(cors());
    router.use(express.json());

    // Routes
    router.post('/query', queryHandler);

    // Error handling
    router.use(errorHandler);

    return router;
}

module.exports = createFlightGateway; 