function createQueryHandler(flightClient, options = {}) {
    const logger = options.logger || console;

    return (req, res, next) => {
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
    };
}

module.exports = createQueryHandler; 