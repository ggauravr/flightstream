import { CSVArrowStreamer } from '../src/index.js';
import { RecordBatchStreamWriter } from 'apache-arrow';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testServerScenario() {
  try {
    console.log('🧪 Testing server scenario with RecordBatchStreamWriter...');
    
    // Create a larger CSV file for testing
    const testCsvPath = path.join(__dirname, 'test-large-data.csv');
    let csvContent = 'name,age,city,occupation,salary\n';
    
    // Generate 100 rows of test data
    for (let i = 1; i <= 100; i++) {
      csvContent += `Person${i},${20 + (i % 50)},City${i % 10},Job${i % 5},${50000 + (i * 1000)}\n`;
    }
    
    fs.writeFileSync(testCsvPath, csvContent);
    console.log('📝 Created test CSV file with 100 rows');
    
    // Test the streamer
    const streamer = new CSVArrowStreamer({
      batchSize: 10, // Small batch size for testing
      sampleSize: 20
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
      return;
    }
    
    if (result.batches.length === 0) {
      console.log('⚠️ No batches created');
      return;
    }
    
    // Test with RecordBatchStreamWriter (simulating server scenario)
    console.log('🚀 Testing with RecordBatchStreamWriter...');
    
    const writer = RecordBatchStreamWriter.throughNode({
      compression: 'gzip',
      autoDestroy: false // Don't auto-destroy to prevent AsyncQueue closed errors
    });
    
    // Create a mock response stream
    const mockResponse = new Readable({
      read() {
        // Mock response that just consumes data
      }
    });
    
    writer.pipe(mockResponse);
    
    let isResponseClosed = false;
    let writeErrors = [];
    
    // Handle response close events
    mockResponse.on('close', () => {
      console.log('⚠️ Mock response closed');
      isResponseClosed = true;
      if (writer && !writer.destroyed) {
        writer.destroy();
      }
    });
    
    // Handle writer errors
    writer.on('error', (err) => {
      console.error('❌ Writer error:', err);
      writeErrors.push(err);
    });
    
    writer.on('finish', () => {
      console.log('✅ Writer finished successfully');
    });
    
    // Write batches with proper error handling
    async function writeBatches(writer, batches) {
      try {
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          
          // Check if response is still open
          if (isResponseClosed) {
            console.log('⚠️ Response closed, stopping batch writing');
            break;
          }
          
          // Write batch with backpressure handling
          if (!writer.write(batch)) {
            await new Promise((resolve, reject) => {
              const onDrain = () => {
                writer.removeListener('error', onError);
                resolve();
              };
              const onError = (err) => {
                writer.removeListener('drain', onDrain);
                reject(err);
              };
              writer.once('drain', onDrain);
              writer.once('error', onError);
            });
          }
          
          // Log progress
          if (i % 5 === 0) {
            console.log(`📦 Written ${i + 1}/${batches.length} batches`);
          }
        }
        
        // Properly end the writer
        if (!isResponseClosed) {
          console.log('✅ All batches written, ending writer');
          writer.end();
        }
      } catch (error) {
        console.error('❌ Error writing batches:', error);
        throw error;
      }
    }
    
    try {
      await writeBatches(writer, result.batches);
      console.log('✅ All batches written successfully!');
      
      if (writeErrors.length > 0) {
        console.log('⚠️ Writer errors encountered:', writeErrors.length);
      } else {
        console.log('✅ No AsyncQueue closed errors detected!');
      }
      
    } catch (err) {
      console.error('❌ Error in writeBatches:', err);
    }
    
    // Clean up
    fs.unlinkSync(testCsvPath);
    console.log('🧹 Cleaned up test file');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testServerScenario(); 