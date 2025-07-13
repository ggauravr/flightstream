import { RecordBatchStreamReader } from 'apache-arrow';

async function testArrowStream() {
  try {
    console.log('🔄 Testing Arrow stream from server...');
    
    // Download Arrow data from server
    const response = await fetch('http://localhost:4000/stream/sample.csv');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('📥 Response headers:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
      'content-disposition': response.headers.get('content-disposition')
    });
    
    // Get the response as a readable stream
    const reader = response.body.getReader();
    const chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const arrowData = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      arrowData.set(chunk, offset);
      offset += chunk.length;
    }
    
    console.log('📦 Received Arrow data, size:', arrowData.length, 'bytes');
    
    // Parse Arrow IPC stream with RecordBatchStreamReader
    const streamReader = await RecordBatchStreamReader.from(arrowData);
    
    console.log('✅ Successfully parsed Arrow IPC stream:');
    
    let batchCount = 0;
    let totalRows = 0;
    let schema = null;
    
    // Read all batches
    for await (const batch of streamReader) {
      if (!schema) {
        schema = batch.schema;
        console.log('  - Schema:', schema.fields.map(f => `${f.name}: ${f.type}`));
      }
      batchCount++;
      totalRows += batch.numRows;
      console.log(`  - Batch ${batchCount}: ${batch.numRows} rows`);
    }
    
    console.log(`  - Total batches: ${batchCount}`);
    console.log(`  - Total rows: ${totalRows}`);
    
  } catch (error) {
    console.error('❌ Error testing Arrow stream:', error);
  }
}

testArrowStream(); 