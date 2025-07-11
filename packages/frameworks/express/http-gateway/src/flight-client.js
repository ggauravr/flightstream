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
                
                /**
                 * TODO: 
                 * Not ideal. We're collecting all batches in memory.
                 * We should write them to a file or something, but previous attempts have not worked.
                 * What's interesting is that the frontend client reports getting data in batches, despite
                 * writing all the data to the stream at once.
                 */
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

    function listFlights() {
        return new Promise((resolve, reject) => {
            const criteria = {}; // Empty criteria to list all flights
            const flights = [];

            logger.info('📋 Listing available flights');

            const stream = client.listFlights(criteria);

            stream.on('data', (flightInfo) => {
                const flight = {
                    descriptor: flightInfo.flight_descriptor ? {
                        type: flightInfo.flight_descriptor.type,
                        cmd: flightInfo.flight_descriptor.cmd ? flightInfo.flight_descriptor.cmd.toString() : null,
                        path: flightInfo.flight_descriptor.path || []
                    } : null,
                    endpoints: flightInfo.endpoint || [],
                    total_records: flightInfo.total_records || -1,
                    total_bytes: flightInfo.total_bytes || -1
                };

                flights.push(flight);
                logger.debug(`📄 Found flight: ${flight.descriptor?.cmd || 'unnamed'}`);
            });

            stream.on('end', () => {
                logger.info(`✅ Listed ${flights.length} available flights`);
                resolve(flights);
            });

            stream.on('error', (err) => {
                logger.error(`❌ Error listing flights:`, err.message);
                reject(err);
            });
        });
    }

    function listActions() {
        return new Promise((resolve, reject) => {
            logger.info('📋 Listing available actions');
            
            const actions = [];
            const stream = client.listActions({});
            
            stream.on('data', (actionType) => {
                const action = {
                    type: actionType.type,
                    description: actionType.description
                };
                actions.push(action);
                logger.debug(`📄 Found action: ${action.type} - ${action.description}`);
            });
            
            stream.on('end', () => {
                logger.info(`✅ Listed ${actions.length} available actions`);
                resolve(actions);
            });
            
            stream.on('error', (err) => {
                logger.error('❌ Error listing actions:', err.message);
                reject(err);
            });
        });
    }

    function getFlightInfo(flightDescriptor) {
        return new Promise((resolve, reject) => {
            const resourceId = flightDescriptor.cmd || flightDescriptor.path?.join('/') || 'unknown';
            logger.info(`📋 Getting flight info for: ${resourceId}`);
            
            const descriptor = {
                type: flightDescriptor.type || 2, // CMD type
                cmd: flightDescriptor.cmd ? Buffer.from(flightDescriptor.cmd) : null,
                path: flightDescriptor.path || []
            };
            
            client.getFlightInfo(descriptor, (error, flightInfo) => {
                if (error) {
                    logger.error(`❌ Error getting flight info for ${resourceId}:`, error.message);
                    reject(error);
                    return;
                }
                
                const info = {
                    schema: flightInfo.schema,
                    flight_descriptor: flightInfo.flight_descriptor ? {
                        type: flightInfo.flight_descriptor.type,
                        cmd: flightInfo.flight_descriptor.cmd ? flightInfo.flight_descriptor.cmd.toString() : null,
                        path: flightInfo.flight_descriptor.path || []
                    } : null,
                    endpoints: flightInfo.endpoint || [],
                    total_records: flightInfo.total_records || -1,
                    total_bytes: flightInfo.total_bytes || -1
                };
                
                logger.info(`✅ Flight info retrieved for ${resourceId}: ${info.total_records} records, ${info.total_bytes} bytes`);
                resolve(info);
            });
        });
    }

    function getSchema(flightDescriptor) {
        return new Promise((resolve, reject) => {
            const resourceId = flightDescriptor.cmd || flightDescriptor.path?.join('/') || 'unknown';
            logger.info(`📐 Getting schema for: ${resourceId}`);
            
            const descriptor = {
                type: flightDescriptor.type || 2, // CMD type
                cmd: flightDescriptor.cmd ? Buffer.from(flightDescriptor.cmd) : null,
                path: flightDescriptor.path || []
            };
            
            client.getSchema(descriptor, (error, schemaResult) => {
                if (error) {
                    logger.error(`❌ Error getting schema for ${resourceId}:`, error.message);
                    reject(error);
                    return;
                }
                
                logger.info(`✅ Schema retrieved for ${resourceId}`);
                resolve({
                    schema: schemaResult.schema
                });
            });
        });
    }

    return {
        getFlightStream,
        listFlights,
        getFlightInfo,
        getSchema
    };
}

module.exports = createFlightClient; 
// Export for debugging
module.exports.PROTO_PATH = PROTO_PATH; 