function createSchemaHandler(flightClient, options = {}) {
    const logger = options.logger || console;

    return async (req, res, next) => {
        try {
            const { resource, type, format } = req.body;
            if (!resource) {
                return res.status(400).json({ error: 'Missing "resource" in request body' });
            }

            logger.info({
                resource: resource,
                type: type,
                format: format,
                request_method: req.method,
                request_url: req.url
            }, 'HTTP Request for schema');

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

            const schemaResult = await flightClient.getSchema(flightDescriptor);

            // Handle different response formats
            if (format === 'binary' || format === 'arrow') {
                // Return raw Arrow schema binary
                res.setHeader('Content-Type', 'application/vnd.apache.arrow.stream');
                res.setHeader('Content-Disposition', `attachment; filename="${resource}-schema.arrow"`);
                res.send(schemaResult.schema);
            } else {
                // Default: try to parse as JSON for human-readable format
                let schemaInfo;
                try {
                    // Try to parse as JSON first (fallback schema format)
                    schemaInfo = JSON.parse(schemaResult.schema.toString());
                } catch (parseError) {
                    // If it's binary Arrow schema, indicate that
                    schemaInfo = {
                        format: 'binary_arrow_schema',
                        size_bytes: schemaResult.schema.length,
                        note: 'Use format=binary query parameter to download raw schema'
                    };
                }

                logger.info({
                    resource: resource,
                    schema_format: typeof schemaInfo === 'object' ? 'json' : 'binary',
                    schema_size: schemaResult.schema.length
                }, 'Schema response prepared');

                res.json({
                    resource: resource,
                    schema: schemaInfo
                });
            }

        } catch (error) {
            next(error);
        }
    };
}

module.exports = createSchemaHandler; 