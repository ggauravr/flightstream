const express = require('express');
const cors = require('cors');
const createFlightClient = require('./flight-client');
const errorHandler = require('./error-handler');

function createServer(flightServerUrl) {
    const app = express();
    const flightClient = createFlightClient(flightServerUrl);

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

            console.log(`🌐 HTTP Request for resource: ${resource}`);

            const stream = flightClient.getFlightStream(resource);

            const contentType = 'application/vnd.apache.arrow.stream';
            res.setHeader('Content-Type', contentType);
            
            console.log(`📋 HTTP Response headers set:`);
            console.log(`   Content-Type: ${contentType}`);
            console.log(`   Transfer-Encoding: chunked (Express default for streaming)`);

            stream.pipe(res);

            stream.on('error', (err) => {
                next(err);
            });

            stream.on('end', () => {
                console.log(`🏁 HTTP Response completed for resource: ${resource}`);
            });

        } catch (error) {
            next(error);
        }
    });

    app.use(errorHandler);

    return app;
}

module.exports = createServer; 