import { tableFromIPC } from 'apache-arrow';
import { createGunzip } from 'zlib';
import { Transform } from 'stream';

class ArrowStreamProcessor extends Transform {
  constructor() {
    super();
    this.chunks = [];
    this.isProcessing = false;
  }

  _transform(chunk, encoding, callback) {
    this.chunks.push(chunk);
    callback();
  }

  _flush(callback) {
    if (this.chunks.length > 0) {
      const compressedData = Buffer.concat(this.chunks);
      
      // Decompress and process
      const gunzip = createGunzip();
      gunzip.on('data', (decompressedData) => {
        try {
          const table = tableFromIPC(decompressedData);
          console.log('✅ Successfully processed streaming Arrow data:');
          console.log('  - Schema:', table.schema.fields.map(f => `${f.name}: ${f.type}`));
          console.log('  - Rows:', table.numRows);
          console.log('  - Columns:', table.numCols);
          
          // Show first few rows
          console.log('\n📋 First 3 rows:');
          const firstRows = table.slice(0, 3);
          console.log(firstRows.toArray());
          
        } catch (error) {
          console.error('❌ Error processing Arrow data:', error);
        }
      });
      
      gunzip.on('error', (error) => {
        console.error('❌ Decompression error:', error);
      });
      
      gunzip.write(compressedData);
      gunzip.end();
    }
    callback();
  }
}

async function testStreamingCompressedArrow() {
  try {
    console.log('🔄 Testing streaming compressed Arrow data...');
    
    const response = await fetch('http://localhost:4000/stream/sample.csv');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('📥 Response headers:', {
      'content-type': response.headers.get('content-type'),
      'content-encoding': response.headers.get('content-encoding'),
      'content-length': response.headers.get('content-length')
    });
    
    // Get the response as a readable stream
    const reader = response.body.getReader();
    const processor = new ArrowStreamProcessor();
    
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        processor.end();
        break;
      }
      
      totalBytes += value.length;
      processor.write(value);
    }
    
    console.log(`📦 Total compressed bytes received: ${totalBytes}`);
    
  } catch (error) {
    console.error('❌ Error testing streaming compressed Arrow:', error);
  }
}

testStreamingCompressedArrow(); 