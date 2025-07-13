import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function benchmarkStreaming() {
  try {
    console.log('🏁 Starting Arrow vs JSON streaming benchmark...\n');
    
    const testFile = 'MARC2020-County-01.csv'; // Change this to test different files
    const baseUrl = 'http://localhost:4000';
    
    // Test Arrow streaming
    console.log('🔍 Testing Arrow streaming...');
    const arrowStartTime = Date.now();
    const arrowResponse = await fetch(`${baseUrl}/stream/${testFile}`);
    
    if (!arrowResponse.ok) {
      throw new Error(`Arrow request failed: ${arrowResponse.status} ${arrowResponse.statusText}`);
    }
    
    const arrowChunks = [];
    const arrowReader = arrowResponse.body;
    
    for await (const chunk of arrowReader) {
      arrowChunks.push(chunk);
    }
    
    const arrowEndTime = Date.now();
    const arrowTotalTime = arrowEndTime - arrowStartTime;
    const arrowTotalBytes = arrowChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    
    console.log(`✅ Arrow streaming completed:`);
    console.log(`   - Time: ${arrowTotalTime}ms`);
    console.log(`   - Size: ${arrowTotalBytes} bytes`);
    console.log(`   - Throughput: ${(arrowTotalBytes / (arrowTotalTime / 1000) / 1024 / 1024).toFixed(2)} MB/s`);
    
    // Test JSON streaming
    console.log('\n🔍 Testing JSON streaming...');
    const jsonStartTime = Date.now();
    const jsonResponse = await fetch(`${baseUrl}/json/${testFile}`);
    
    if (!jsonResponse.ok) {
      throw new Error(`JSON request failed: ${jsonResponse.status} ${jsonResponse.statusText}`);
    }
    
    const jsonChunks = [];
    const jsonReader = jsonResponse.body;
    
    for await (const chunk of jsonReader) {
      jsonChunks.push(chunk);
    }
    
    const jsonEndTime = Date.now();
    const jsonTotalTime = jsonEndTime - jsonStartTime;
    const jsonTotalBytes = jsonChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    
    console.log(`✅ JSON streaming completed:`);
    console.log(`   - Time: ${jsonTotalTime}ms`);
    console.log(`   - Size: ${jsonTotalBytes} bytes`);
    console.log(`   - Throughput: ${(jsonTotalBytes / (jsonTotalTime / 1000) / 1024 / 1024).toFixed(2)} MB/s`);
    
    // Compare results
    console.log('\n📊 Benchmark Results:');
    console.log('='.repeat(50));
    
    const timeDifference = jsonTotalTime - arrowTotalTime;
    const timePercentage = ((timeDifference / arrowTotalTime) * 100).toFixed(2);
    
    const sizeDifference = jsonTotalBytes - arrowTotalBytes;
    const sizePercentage = ((sizeDifference / arrowTotalBytes) * 100).toFixed(2);
    
    console.log(`Time Comparison:`);
    console.log(`   Arrow:  ${arrowTotalTime}ms`);
    console.log(`   JSON:   ${jsonTotalTime}ms`);
    console.log(`   Diff:   ${timeDifference > 0 ? '+' : ''}${timeDifference}ms (${timePercentage}%)`);
    
    console.log(`\nSize Comparison:`);
    console.log(`   Arrow:  ${arrowTotalBytes} bytes`);
    console.log(`   JSON:   ${jsonTotalBytes} bytes`);
    console.log(`   Diff:   ${sizeDifference > 0 ? '+' : ''}${sizeDifference} bytes (${sizePercentage}%)`);
    
    console.log(`\nThroughput Comparison:`);
    const arrowThroughput = (arrowTotalBytes / (arrowTotalTime / 1000) / 1024 / 1024).toFixed(2);
    const jsonThroughput = (jsonTotalBytes / (jsonTotalTime / 1000) / 1024 / 1024).toFixed(2);
    console.log(`   Arrow:  ${arrowThroughput} MB/s`);
    console.log(`   JSON:   ${jsonThroughput} MB/s`);
    
    // Determine winner
    console.log('\n🏆 Performance Analysis:');
    if (arrowTotalTime < jsonTotalTime) {
      console.log(`   ⚡ Arrow is ${Math.abs(timePercentage)}% faster`);
    } else {
      console.log(`   ⚡ JSON is ${Math.abs(timePercentage)}% faster`);
    }
    
    if (arrowTotalBytes < jsonTotalBytes) {
      console.log(`   📦 Arrow is ${Math.abs(sizePercentage)}% smaller`);
    } else {
      console.log(`   📦 JSON is ${Math.abs(sizePercentage)}% smaller`);
    }
    
    // Calculate efficiency score
    const arrowEfficiency = arrowTotalBytes / arrowTotalTime;
    const jsonEfficiency = jsonTotalBytes / jsonTotalTime;
    
    console.log(`\n📈 Efficiency (bytes/ms):`);
    console.log(`   Arrow:  ${arrowEfficiency.toFixed(2)}`);
    console.log(`   JSON:   ${jsonEfficiency.toFixed(2)}`);
    
    if (arrowEfficiency > jsonEfficiency) {
      console.log(`   🎯 Arrow is more efficient`);
    } else {
      console.log(`   🎯 JSON is more efficient`);
    }
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run benchmark if server is available
async function runBenchmark() {
  try {
    // Check if server is running
    const response = await fetch('http://localhost:4000/datasets');
    if (!response.ok) {
      throw new Error('Server not running');
    }
    
    await benchmarkStreaming();
    
  } catch (error) {
    console.error('❌ Cannot connect to server. Make sure it\'s running on http://localhost:4000');
    console.error('   Start the server with: node examples/server.js');
    process.exit(1);
  }
}

runBenchmark(); 