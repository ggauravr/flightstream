import { RecordBatchStreamWriter, tableFromArrays } from 'apache-arrow';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testCompression() {
  try {
    console.log('🧪 Testing RecordBatchStreamWriter compression...');
    
    // Create test data
    const testData = {
      name: Array.from({ length: 1000 }, (_, i) => `Person${i}`),
      age: Array.from({ length: 1000 }, (_, i) => 20 + (i % 50)),
      city: Array.from({ length: 1000 }, (_, i) => `City${i % 10}`),
      salary: Array.from({ length: 1000 }, (_, i) => 50000 + (i * 1000))
    };
    
    const table = tableFromArrays(testData);
    console.log('📊 Created test table with 1000 rows');
    
    // Test without compression
    console.log('\n🔍 Testing WITHOUT compression...');
    const uncompressedPath = path.join(__dirname, 'test-uncompressed.arrow');
    const uncompressedStream = fs.createWriteStream(uncompressedPath);
    
    const uncompressedWriter = RecordBatchStreamWriter.throughNode({
      autoDestroy: false
    });
    uncompressedWriter.pipe(uncompressedStream);
    
    await new Promise((resolve, reject) => {
      uncompressedStream.on('finish', resolve);
      uncompressedStream.on('error', reject);
      uncompressedWriter.on('error', reject);
      
      uncompressedWriter.write(table);
      uncompressedWriter.end();
    });
    
    // Wait a moment for file to be written
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const uncompressedSize = fs.statSync(uncompressedPath).size;
    console.log(`📦 Uncompressed size: ${uncompressedSize} bytes`);
    
    // Test with compression
    console.log('\n🔍 Testing WITH compression...');
    const compressedPath = path.join(__dirname, 'test-compressed.arrow');
    const compressedStream = fs.createWriteStream(compressedPath);
    
    const compressedWriter = RecordBatchStreamWriter.throughNode({
      compression: 'gzip',
      autoDestroy: false
    });
    compressedWriter.pipe(compressedStream);
    
    await new Promise((resolve, reject) => {
      compressedStream.on('finish', resolve);
      compressedStream.on('error', reject);
      compressedWriter.on('error', reject);
      
      compressedWriter.write(table);
      compressedWriter.end();
    });
    
    // Wait a moment for file to be written
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const compressedSize = fs.statSync(compressedPath).size;
    console.log(`📦 Compressed size: ${compressedSize} bytes`);
    
    // Compare sizes
    const difference = uncompressedSize - compressedSize;
    const percentage = ((difference / uncompressedSize) * 100).toFixed(2);
    
    console.log('\n📊 Compression Results:');
    console.log(`   Uncompressed: ${uncompressedSize} bytes`);
    console.log(`   Compressed:   ${compressedSize} bytes`);
    console.log(`   Difference:   ${difference} bytes`);
    console.log(`   Percentage:   ${percentage}%`);
    
    if (compressedSize === uncompressedSize) {
      console.log('\n❌ WARNING: Compression is NOT working! Sizes are identical.');
      console.log('   This suggests the compression option is not being applied.');
    } else if (compressedSize > uncompressedSize) {
      console.log('\n⚠️ WARNING: Compression made the file LARGER!');
      console.log('   This can happen with small datasets due to compression overhead.');
    } else {
      console.log('\n✅ Compression is working! File size was reduced.');
    }
    
    // Clean up
    fs.unlinkSync(uncompressedPath);
    fs.unlinkSync(compressedPath);
    console.log('\n🧹 Cleaned up test files');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCompression(); 