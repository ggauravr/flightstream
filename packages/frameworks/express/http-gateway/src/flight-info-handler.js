function createFlightInfoHandler(flightClient, options = {}) {
    const logger = options.logger || console;

    return async (req, res, next) => {
        try {
            const { resource, type } = req.body;
            if (!resource) {
                return res.status(400).json({ error: 'Missing "resource" in request body' });
            }

            logger.info({
                resource: resource,
                type: type,
                request_method: req.method,
                request_url: req.url
            }, 'HTTP Request for flight info');

            // Create flight descriptor
            const flightDescriptor = {
                type: type || 2, // CMD type by default
                cmd: resource,
                path: []
            };

            // If resource contains path separators, treat as path
            if (resource.includes('/')) {
                flightDescriptor.type = 1; // PATH type
                flightDescriptor.path = resource.split('/').filter(p => p.length > 0);
                flightDescriptor.cmd = null;
            }

            const flightInfo = await flightClient.getFlightInfo(flightDescriptor);

            // Transform the response for JSON serialization
            const responseData = {
                flight_descriptor: flightInfo.flight_descriptor,
                endpoints: flightInfo.endpoints,
                total_records: flightInfo.total_records,
                total_bytes: flightInfo.total_bytes,
                schema_available: !!flightInfo.schema
            };

            logger.info({
                resource: resource,
                total_records: flightInfo.total_records,
                total_bytes: flightInfo.total_bytes,
                endpoints_count: flightInfo.endpoints.length
            }, 'Flight info response prepared');

            res.json(responseData);

        } catch (error) {
            next(error);
        }
    };
}

module.exports = createFlightInfoHandler; 