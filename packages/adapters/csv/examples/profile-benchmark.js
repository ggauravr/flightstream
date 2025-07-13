import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      memoryUsage: [],
      processingTimes: []
    };
  }

  start() {
    this.metrics.startTime = Date.now();
    this.metrics.memoryUsage.push(process.memoryUsage());
  }

  end() {
    this.metrics.endTime = Date.now();
    this.metrics.memoryUsage.push(process.memoryUsage());
  }

  recordProcessing(processingTime) {
    this.metrics.processingTimes.push(processingTime);
  }

  getSummary() {
    const totalTime = this.metrics.endTime - this.metrics.startTime;
    const avgProcessingTime = this.metrics.processingTimes.length > 0 
      ? this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length
      : 0;

    const initialMemory = this.metrics.memoryUsage[0];
    const finalMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const memoryIncrease = finalMemory ? {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external
    } : null;

    return {
      totalTime,
      avgProcessingTime,
      memoryIncrease,
      memoryUsage: this.metrics.memoryUsage
    };
  }
}

async function benchmarkStreamingWithProfiling() {
  const monitor = new PerformanceMonitor();
  monitor.start();

  try {
    console.log('🏁 Starting Arrow vs JSON streaming benchmark with profiling...\n');
    
    const testFile = 'MARC2020-County-01.csv';
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
    
    monitor.recordProcessing(arrowTotalTime);
    
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
    
    monitor.recordProcessing(jsonTotalTime);
    
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
    
    monitor.end();
    const summary = monitor.getSummary();
    
    console.log('\n🔍 Profiling Summary:');
    console.log('='.repeat(50));
    console.log(`Total benchmark time: ${summary.totalTime}ms`);
    console.log(`Average processing time: ${summary.avgProcessingTime.toFixed(2)}ms`);
    
    if (summary.memoryIncrease) {
      console.log('\nMemory Usage:');
      console.log(`   RSS increase: ${(summary.memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap used increase: ${(summary.memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap total increase: ${(summary.memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   External memory increase: ${(summary.memoryIncrease.external / 1024 / 1024).toFixed(2)} MB`);
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
    
    await benchmarkStreamingWithProfiling();
    
  } catch (error) {
    console.error('❌ Cannot connect to server. Make sure it\'s running on http://localhost:4000');
    console.error('   Start the server with: npm start');
    process.exit(1);
  }
}

runBenchmark(); 