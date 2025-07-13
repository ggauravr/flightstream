import { tableFromIPC } from 'apache-arrow';

async function simpleTest() {
  try {
    console.log('🔄 Simple test of Arrow stream...');
    
    const response = await fetch('http://localhost:4000/stream/sample.csv');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('📥 Response headers:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length')
    });
    
    // Collect all chunks first
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
    
    console.log('📦 Total Arrow bytes:', arrowData.length);
    
    // Parse Arrow data
    const table = tableFromIPC(arrowData);
    console.log('✅ Successfully parsed Arrow data:');
    console.log('  - Rows:', table.numRows);
    console.log('  - Columns:', table.numCols);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

simpleTest(); 