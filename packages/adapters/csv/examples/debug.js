import { CSVArrowStreamer } from '../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../../../data');
const testFile = path.join(DATA_DIR, 'sample.csv');

console.log('🔍 Testing CSV to Arrow conversion...');
console.log('📁 Test file:', testFile);

async function testConversion() {
  try {
    const streamer = new CSVArrowStreamer({ batchSize: 1000 });
    
    console.log('📊 Starting conversion...');
    const result = await streamer.streamFromFile(testFile);
    
    console.log('📈 Result:', {
      rowCount: result.rowCount,
      batches: result.batches.length,
      schema: result.schema ? 'defined' : 'undefined',
      errors: result.errors.length
    });
    
    if (result.errors.length > 0) {
      console.log('❌ Errors:', result.errors);
    }
    
    if (result.batches.length > 0) {
      const batch = result.batches[0];
      console.log('📦 First batch:', {
        numRows: batch.numRows,
        numCols: batch.numCols,
        schema: batch.schema ? batch.schema.fields.map(f => f.name) : 'no schema'
      });
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testConversion(); 