const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { PassThrough } = require('stream');
const { RecordBatchReader, RecordBatchStreamWriter } = require('apache-arrow');

// Try to resolve the proto file from the core server package
function resolveProtoPath() {
    // Check for environment variable override first
    if (process.env.FLIGHT_PROTO_PATH) {
        console.log(`Using proto from environment variable: ${process.env.FLIGHT_PROTO_PATH}`);
        return process.env.FLIGHT_PROTO_PATH;
    }

    try {
        // Try to resolve from installed package first
        const packagePath = require.resolve('@flightstream/core-server/package.json');
        const protoPath = path.join(path.dirname(packagePath), 'proto/flight.proto');
        console.log(`Using proto from package: ${protoPath}`);
        return protoPath;
    } catch (error) {
        // Fallback to local monorepo path if package not found
        const localPath = path.join(__dirname, '../../../../core/server/proto/flight.proto');
        console.log(`Using proto from local monorepo: ${localPath}`);
        return localPath;
    }
}

const PROTO_PATH = resolveProtoPath();

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const flightProto = grpc.loadPackageDefinition(packageDefinition).arrow.flight.protocol;

function createFlightClient(serverUrl, options = {}) {
    const logger = options.logger || console;
    const url = serverUrl.replace(/^grpc:\/\//, '');
    const client = new flightProto.FlightService(url, grpc.credentials.createInsecure());

    function getFlightStream(resourceIdentifier) {
        const ticket = {
            ticket: Buffer.from(resourceIdentifier)
        };

        const stream = new PassThrough();
        const grpcStream = client.doGet(ticket);
        
        let batchCount = 0;
        let totalBytes = 0;
        const batches = [];
        const startTime = Date.now();

        logger.info(`📡 Starting stream for resource: ${resourceIdentifier}`);

        grpcStream.on('data', async (flightData) => {
            if (flightData.data_body) {
                batchCount++;
                const batchSize = flightData.data_body.length;
                totalBytes += batchSize;
                
                logger.debug(`📦 Batch ${batchCount}: ${batchSize.toLocaleString()} bytes`);
                
                // Parse each Flight batch to RecordBatch and collect them
                const reader = RecordBatchReader.from(flightData.data_body);
                for (const recordBatch of reader) {
                    batches.push(recordBatch);
                    logger.debug(`📥 Collected batch with ${recordBatch.numRows.toLocaleString()} rows`);
                }
            }
        });

        grpcStream.on('end', async () => {
            try {
                logger.debug(`🔄 Processing ${batches.length} collected batches into Arrow stream`);
                
                // Create a properly formatted Arrow IPC stream from all batches
                const writer = RecordBatchStreamWriter.writeAll(batches);
                const properArrowStream = await writer.toUint8Array();
                
                logger.debug(`📤 Writing ${properArrowStream.length.toLocaleString()} bytes to HTTP stream`);
                
                const duration = Date.now() - startTime;
                const avgBatchSize = batchCount > 0 ? Math.round(totalBytes / batchCount) : 0;
                
                logger.info(`✅ Stream completed for ${resourceIdentifier}:`);
                logger.info(`   📊 Total batches: ${batchCount}`);
                logger.info(`   📥 Record batches collected: ${batches.length}`);
                logger.info(`   📏 Total bytes from gRPC: ${totalBytes.toLocaleString()}`);
                logger.info(`   📏 Total bytes to HTTP: ${properArrowStream.length.toLocaleString()}`);
                logger.info(`   ⏱️  Duration: ${duration}ms`);
                logger.info(`   📈 Avg batch size: ${avgBatchSize.toLocaleString()} bytes`);
                logger.info(`   🚀 Throughput: ${Math.round(totalBytes / 1024 / (duration / 1000)).toLocaleString()} KB/s`);
                
                // Write the complete Arrow stream to HTTP
                stream.write(properArrowStream);
                stream.end();
                
            } catch (error) {
                logger.error(`❌ Error creating Arrow stream for ${resourceIdentifier}:`, error);
                stream.emit('error', error);
            }
        });

        grpcStream.on('error', (err) => {
            logger.error(`❌ Stream error for ${resourceIdentifier}:`, err.message);
            stream.emit('error', err);
        });

        return stream;
    }

    return {
        getFlightStream
    };
}

module.exports = createFlightClient;
// Export for debugging
module.exports.PROTO_PATH = PROTO_PATH; 