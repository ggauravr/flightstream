const { status: grpcStatus } = require('@grpc/grpc-js');

function errorHandler(err, req, res, next) {
    console.error(err);

    let statusCode = 500;
    let message = 'Internal Server Error';

    if (err.code) { // Check if it's a gRPC error
        switch (err.code) {
            case grpcStatus.NOT_FOUND:
                statusCode = 404;
                message = 'Resource not found';
                break;
            case grpcStatus.INVALID_ARGUMENT:
                statusCode = 400;
                message = 'Invalid argument provided';
                break;
            case grpcStatus.UNAUTHENTICATED:
                statusCode = 401;
                message = 'Unauthenticated';
                break;
            case grpcStatus.PERMISSION_DENIED:
                statusCode = 403;
                message = 'Permission denied';
                break;
            default:
                statusCode = 500;
                message = 'An unexpected error occurred with the data service.';
        }
    }

    if (res.headersSent) {
        return next(err);
    }

    res.status(statusCode).json({ error: message, details: err.details });
}

module.exports = errorHandler; 