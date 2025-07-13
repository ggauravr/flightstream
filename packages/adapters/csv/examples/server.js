import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CSVArrowStreamer } from '../src/index.js';
import { RecordBatchStreamWriter } from 'apache-arrow';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../../../data');

app.use(cors());

// List available CSV datasets
app.get('/datasets', (req, res) => {
  fs.readdir(DATA_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read data directory', details: err.message });
    }
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    res.json({ datasets: csvFiles });
  });
});

// Stream CSV as JSON for performance comparison
app.get('/json/:filename', async (req, res) => {
  const { filename } = req.params;
  const requestStartTime = Date.now();

  console.log(`🚀 [${new Date().toISOString()}] JSON stream request received for file: ${filename}`);

  const filePath = path.join(DATA_DIR, filename);

  if (!filename.endsWith('.csv')) {
    return res.status(400).json({ error: 'Only CSV files are supported' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/\.csv$/, '.json')}"`);

  let isResponseClosed = false;

  try {
    console.log('📊 Starting direct CSV to JSON streaming...');
    
    // Use direct CSV parsing for JSON streaming
    const { parse } = await import('fast-csv');
    const csvStream = fs.createReadStream(filePath);
    const parser = parse({ headers: true });
    
    let rowCount = 0;
    let totalBytesWritten = 0;
    let isFirstRow = true;
    
    // Handle response close events
    res.on('close', () => {
      console.log('⚠️ JSON response closed by client');
      isResponseClosed = true;
    });

    res.on('error', (err) => {
      console.error('❌ JSON response error:', err);
      isResponseClosed = true;
    });

    // Start JSON array
    res.write('[\n');
    
    // Handle parser events
    parser.on('data', (row) => {
      if (isResponseClosed) {
        return;
      }
      
      try {
        // Convert row to JSON
        const jsonRow = JSON.stringify(row);
        const prefix = isFirstRow ? '' : ',\n';
        const rowData = prefix + jsonRow;
        
        if (!res.write(rowData)) {
          // Handle backpressure
          parser.pause();
          res.once('drain', () => parser.resume());
        }
        
        totalBytesWritten += rowData.length;
        rowCount++;
        isFirstRow = false;
        
        // Log progress for large files
        if (rowCount % 1000 === 0) {
          console.log(`📦 JSON: Written ${rowCount} rows`);
        }
        
      } catch (error) {
        console.error('❌ Error processing row:', error);
      }
    });
    
    parser.on('end', () => {
      if (!isResponseClosed) {
        res.write('\n]'); // End JSON array
        res.end(); // Explicitly end the response
        
        const requestEndTime = Date.now();
        const totalTime = requestEndTime - requestStartTime;
        console.log(`✅ [${new Date().toISOString()}] JSON stream completed:`);
        console.log(`   - Total time: ${totalTime}ms`);
        console.log(`   - Processing rate: ${(rowCount / (totalTime / 1000)).toFixed(2)} rows/s`);
        console.log(`   - Total bytes written: ${totalBytesWritten}`);
        console.log(`   - Total rows: ${rowCount}`);
      }
    });
    
    parser.on('error', (error) => {
      console.error('❌ CSV parsing error:', error);
      if (!isResponseClosed) {
        res.status(500).json({ error: 'CSV parsing error', details: error.message });
      }
    });
    
    // Pipe CSV stream to parser
    csvStream.pipe(parser);
    
  } catch (err) {
    const requestEndTime = Date.now();
    const totalTime = requestEndTime - requestStartTime;
    
    console.error(`❌ [${new Date().toISOString()}] Error streaming JSON data (${totalTime}ms):`, err);
    
    if (!isResponseClosed) {
      res.status(500).json({ error: 'Failed to stream JSON data', details: err.message });
    }
  }
});

// Stream a specified CSV file as an Arrow stream
app.get('/stream/:filename', async (req, res) => {
  const { filename } = req.params;
  const requestStartTime = Date.now();

  console.log(`🚀 [${new Date().toISOString()}] Request received for file: ${filename}`);

  console.log('🚀 Streaming file', filename);
  const filePath = path.join(DATA_DIR, filename);

  if (!filename.endsWith('.csv')) {
    return res.status(400).json({ error: 'Only CSV files are supported' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.setHeader('Content-Type', 'application/vnd.apache.arrow.stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/\.csv$/, '.arrow')}"`);

  let writer = null;
  let isResponseClosed = false;

  try {
    console.log('📊 Starting CSV to Arrow conversion...');
    const streamer = new CSVArrowStreamer({
      batchSize: 10000,
    });
    const result = await streamer.streamFromFile(filePath);
    
    console.log('📈 Conversion result:', {
      rowCount: result.rowCount,
      batches: result.batches.length,
      schema: result.schema ? 'defined' : 'undefined',
      errors: result.errors.length
    });
    
    if (result.errors.length > 0) {
      console.log('❌ Errors during conversion:', result.errors);
    }
    
    if (result.batches.length === 0) {
      console.log('⚠️ No batches created, returning 204');
      return res.status(204).end();
    }
    
    // Use RecordBatchStreamWriter with compression
    console.log('🚀 Streaming with RecordBatchStreamWriter and compression...');
    
    writer = RecordBatchStreamWriter.throughNode({
      // compression: 'gzip',
      autoDestroy: false // Don't auto-destroy to prevent AsyncQueue closed errors
    });
    writer.pipe(res);

    // Robust backpressure-aware batch writing with proper error handling
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
          
          // Log progress for large files
          if (i % 10 === 0) {
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

    // Handle response close events
    res.on('close', () => {
      console.log('⚠️ Response closed by client');
      isResponseClosed = true;
      if (writer && !writer.destroyed) {
        writer.destroy();
      }
    });

    res.on('error', (err) => {
      console.error('❌ Response error:', err);
      isResponseClosed = true;
      if (writer && !writer.destroyed) {
        writer.destroy();
      }
    });

    // Handle writer errors
    writer.on('error', (err) => {
      console.error('❌ Writer error:', err);
      if (!isResponseClosed) {
        res.status(500).json({ error: 'Streaming error', details: err.message });
      }
    });

    writer.on('finish', () => {
      console.log('✅ Writer finished successfully');
    });

    try {
      await writeBatches(writer, result.batches);
      const requestEndTime = Date.now();
      const totalTime = requestEndTime - requestStartTime;
      console.log(`✅ [${new Date().toISOString()}] Arrow stream completed:`);
      console.log(`   - Total time: ${totalTime}ms`);
      console.log(`   - Processing rate: ${(result.rowCount / (totalTime / 1000)).toFixed(2)} rows/s`);
    } catch (err) {
      console.error('❌ Error in writeBatches:', err);
      if (!isResponseClosed) {
        res.status(500).json({ error: 'Failed to write Arrow data', details: err.message });
      }
    }
    
  } catch (err) {
    const requestEndTime = Date.now();
    const totalTime = requestEndTime - requestStartTime;
    
    console.error(`❌ [${new Date().toISOString()}] Error streaming Arrow data (${totalTime}ms):`, err);
    
    // Clean up writer if it exists
    if (writer && !writer.destroyed) {
      writer.destroy();
    }
    
    if (!isResponseClosed) {
      res.status(500).json({ error: 'Failed to stream Arrow data', details: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`CSV Arrow Express server running at http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
}); 