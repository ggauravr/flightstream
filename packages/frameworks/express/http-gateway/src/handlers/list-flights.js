function createListHandler(flightClient, options = {}) {
    const logger = options.logger || console;

    return async (req, res, next) => {
        try {
            logger.info({
                request_method: req.method,
                request_url: req.url
            }, 'HTTP Request for flight list');

            const flights = await flightClient.listFlights();
            
            // Transform flights into a more user-friendly format
            const datasets = flights.map(flight => {
                const descriptor = flight.descriptor;
                return {
                    name: descriptor?.cmd || 'unnamed',
                    path: descriptor?.path || [],
                    type: descriptor?.type || 'unknown',
                    total_records: flight.total_records,
                    total_bytes: flight.total_bytes,
                    endpoints: flight.endpoints.length
                };
            });

            logger.info({
                count: datasets.length
            }, 'Flight list response prepared');

            res.json({
                datasets: datasets,
                count: datasets.length
            });

        } catch (error) {
            next(error);
        }
    };
}

module.exports = createListHandler; 