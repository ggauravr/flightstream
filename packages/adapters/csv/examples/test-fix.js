import { CSVArrowStreamer } from '../src/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testStreamingFix() {
  try {
    console.log('🧪 Testing CSV to Arrow streaming fix...');
    
    // Create a simple CSV file for testing
    const testCsvPath = path.join(__dirname, 'test-data.csv');
    const testCsvContent = `name,age,city
John,25,New York
Jane,30,Los Angeles
Bob,35,Chicago
Alice,28,Boston
Charlie,42,Seattle`;
    
    fs.writeFileSync(testCsvPath, testCsvContent);
    console.log('📝 Created test CSV file');
    
    // Test the streamer
    const streamer = new CSVArrowStreamer({
      batchSize: 2, // Small batch size for testing
      sampleSize: 3
    });
    
    console.log('🔄 Starting streaming test...');
    
    const result = await streamer.streamFromFile(testCsvPath);
    
    console.log('✅ Streaming completed successfully!');
    console.log('📊 Results:', {
      rowCount: result.rowCount,
      batches: result.batches.length,
      schema: result.schema ? 'defined' : 'undefined',
      errors: result.errors.length
    });
    
    if (result.errors.length > 0) {
      console.log('❌ Errors:', result.errors);
    }
    
    if (result.batches.length > 0) {
      console.log('📦 First batch info:', {
        numRows: result.batches[0].numRows,
        numCols: result.batches[0].numCols,
        schema: result.batches[0].schema.fields.map(f => `${f.name}: ${f.type}`)
      });
    }
    
    // Clean up
    fs.unlinkSync(testCsvPath);
    console.log('🧹 Cleaned up test file');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testStreamingFix(); 