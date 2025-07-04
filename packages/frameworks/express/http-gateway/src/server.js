const express = require('express');
const cors = require('cors');
const createFlightClient = require('./flight-client');
const errorHandler = require('./error-handler');
const pino = require('pino');

/**
 * Create a configured pino logger instance
 */
const createLogger = (options = {}) => {
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

function createServer(flightServerUrl) {
    const app = express();
    const flightClient = createFlightClient(flightServerUrl);
    const logger = createLogger({
        name: 'http-gateway',
        flight_server_url: flightServerUrl
    });

    app.use(cors());
    app.use(express.json());

    app.get('/', (req, res) => {
        res.send('Flightstream HTTP Gateway');
    });

    app.post('/api/v1/query', (req, res, next) => {
        try {
            const { resource } = req.body;
            if (!resource) {
                return res.status(400).json({ error: 'Missing "resource" in request body' });
            }

            logger.info({
                resource: resource,
                request_method: req.method,
                request_url: req.url
            }, 'HTTP Request for resource');

            const stream = flightClient.getFlightStream(resource);

            const contentType = 'application/vnd.apache.arrow.stream';
            res.setHeader('Content-Type', contentType);
            
            logger.debug({
                resource: resource,
                content_type: contentType,
                transfer_encoding: 'chunked'
            }, 'HTTP Response headers set');

            stream.pipe(res);

            stream.on('error', (err) => {
                next(err);
            });

            stream.on('end', () => {
                logger.info({
                    resource: resource
                }, 'HTTP Response completed');
            });

        } catch (error) {
            next(error);
        }
    });

    app.use(errorHandler);

    return app;
}

module.exports = createServer; 