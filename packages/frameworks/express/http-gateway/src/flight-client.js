const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { PassThrough } = require('stream');
const { RecordBatchReader, RecordBatchStreamWriter } = require('apache-arrow');

const PROTO_PATH = path.join(__dirname, '../../../../core/server/proto/flight.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const flightProto = grpc.loadPackageDefinition(packageDefinition).arrow.flight.protocol;

function createFlightClient(serverUrl) {
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

        console.log(`📡 Starting stream for resource: ${resourceIdentifier}`);

        grpcStream.on('data', async (flightData) => {
            if (flightData.data_body) {
                batchCount++;
                const batchSize = flightData.data_body.length;
                totalBytes += batchSize;
                
                console.log(`📦 Batch ${batchCount}: ${batchSize.toLocaleString()} bytes`);
                
                // Parse each Flight batch to RecordBatch and collect them
                const reader = RecordBatchReader.from(flightData.data_body);
                for (const recordBatch of reader) {
                    batches.push(recordBatch);
                    console.log(`📥 Collected batch with ${recordBatch.numRows.toLocaleString()} rows`);
                }
            }
        });

        grpcStream.on('end', async () => {
            try {
                console.log(`🔄 Processing ${batches.length} collected batches into Arrow stream`);
                
                // Create a properly formatted Arrow IPC stream from all batches
                const writer = RecordBatchStreamWriter.writeAll(batches);
                const properArrowStream = await writer.toUint8Array();
                
                console.log(`📤 Writing ${properArrowStream.length.toLocaleString()} bytes to HTTP stream`);
                
                const duration = Date.now() - startTime;
                const avgBatchSize = batchCount > 0 ? Math.round(totalBytes / batchCount) : 0;
                
                console.log(`✅ Stream completed for ${resourceIdentifier}:`);
                console.log(`   📊 Total batches: ${batchCount}`);
                console.log(`   📥 Record batches collected: ${batches.length}`);
                console.log(`   📏 Total bytes from gRPC: ${totalBytes.toLocaleString()}`);
                console.log(`   📏 Total bytes to HTTP: ${properArrowStream.length.toLocaleString()}`);
                console.log(`   ⏱️  Duration: ${duration}ms`);
                console.log(`   📈 Avg batch size: ${avgBatchSize.toLocaleString()} bytes`);
                console.log(`   🚀 Throughput: ${Math.round(totalBytes / 1024 / (duration / 1000)).toLocaleString()} KB/s`);
                
                // Write the complete Arrow stream to HTTP
                stream.write(properArrowStream);
                stream.end();
                
            } catch (error) {
                console.error(`❌ Error creating Arrow stream for ${resourceIdentifier}:`, error);
                stream.emit('error', error);
            }
        });

        grpcStream.on('error', (err) => {
            console.error(`❌ Stream error for ${resourceIdentifier}:`, err.message);
            stream.emit('error', err);
        });

        return stream;
    }

    return {
        getFlightStream
    };
}

module.exports = createFlightClient; 