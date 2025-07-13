import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance, PerformanceObserver } from 'perf_hooks';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      memoryUsage: [],
      processingTimes: [],
      gcStats: [],
      cpuUsage: [],
      performanceMarks: []
    };
    
    // Set up performance observer for CPU monitoring
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.performanceMarks.push({
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime
        });
      });
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }

  start() {
    this.metrics.startTime = Date.now();
    this.metrics.memoryUsage.push(process.memoryUsage());
    this.metrics.cpuUsage.push(process.cpuUsage());
    
    // Mark the start
    performance.mark('start');
    
    // Capture initial GC stats if available
    if (global.gc) {
      const gcStats = global.gc();
      this.metrics.gcStats.push(gcStats);
    }
  }

  end() {
    this.metrics.endTime = Date.now();
    this.metrics.memoryUsage.push(process.memoryUsage());
    this.metrics.cpuUsage.push(process.cpuUsage());
    
    // Mark the end and measure
    performance.mark('end');
    performance.measure('total', 'start', 'end');
    
    // Capture final GC stats if available
    if (global.gc) {
      const gcStats = global.gc();
      this.metrics.gcStats.push(gcStats);
    }
  }

  recordProcessing(processingTime) {
    this.metrics.processingTimes.push(processingTime);
  }

  getSystemCPUUsage() {
    try {
      // Get system CPU usage using top command (macOS/Linux)
      const result = execSync('top -l 1 -n 0 | grep "CPU usage"', { encoding: 'utf8' });
      return result.trim();
    } catch (error) {
      return 'CPU usage unavailable';
    }
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

    // Calculate CPU usage
    const initialCPU = this.metrics.cpuUsage[0];
    const finalCPU = this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1];
    const cpuUsage = initialCPU && finalCPU ? {
      user: finalCPU.user - initialCPU.user,
      system: finalCPU.system - initialCPU.system,
      total: (finalCPU.user + finalCPU.system) - (initialCPU.user + initialCPU.system)
    } : null;

    // Get performance measures
    const performanceMeasures = this.metrics.performanceMarks.filter(mark => mark.name === 'total');
    const avgPerformanceTime = performanceMeasures.length > 0 
      ? performanceMeasures.reduce((sum, mark) => sum + mark.duration, 0) / performanceMeasures.length
      : 0;

    return {
      totalTime,
      avgProcessingTime,
      memoryIncrease,
      cpuUsage,
      performanceTime: avgPerformanceTime,
      memoryUsage: this.metrics.memoryUsage,
      gcStats: this.metrics.gcStats,
      systemCPU: this.getSystemCPUUsage()
    };
  }

  dispose() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function streamData(endpoint, filename, baseUrl) {
  console.log(`🔍 Testing ${endpoint} streaming...`);
  
  const startTime = Date.now();
  const response = await fetch(`${baseUrl}/${endpoint}/${filename}`);
  
  if (!response.ok) {
    throw new Error(`${endpoint} request failed: ${response.status} ${response.statusText}`);
  }
  
  const chunks = [];
  const reader = response.body;
  
  for await (const chunk of reader) {
    chunks.push(chunk);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  
  return {
    time: totalTime,
    bytes: totalBytes,
    throughput: (totalBytes / (totalTime / 1000) / 1024 / 1024).toFixed(2)
  };
}

async function compareStreamingPerformance() {
  const testFile = 'MARC2020-County-01.csv';
  const baseUrl = 'http://localhost:4000';
  
  console.log('🏁 Starting comprehensive Arrow vs JSON streaming comparison...\n');
  
  // Test Arrow streaming
  console.log('='.repeat(60));
  console.log('📊 PHASE 1: ARROW STREAMING');
  console.log('='.repeat(60));
  
  const arrowMonitor = new PerformanceMonitor();
  arrowMonitor.start();
  
  const arrowResults = await streamData('stream', testFile, baseUrl);
  arrowMonitor.recordProcessing(arrowResults.time);
  
  console.log(`✅ Arrow streaming completed:`);
  console.log(`   - Time: ${arrowResults.time}ms`);
  console.log(`   - Size: ${arrowResults.bytes} bytes`);
  console.log(`   - Throughput: ${arrowResults.throughput} MB/s`);
  
  arrowMonitor.end();
  const arrowSummary = arrowMonitor.getSummary();
  
  console.log('\n🔍 Arrow Profiling Summary:');
  console.log(`   - Total time: ${arrowSummary.totalTime}ms`);
  console.log(`   - Performance time: ${arrowSummary.performanceTime.toFixed(2)}ms`);
  console.log(`   - Memory RSS increase: ${(arrowSummary.memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Memory heap used: ${(arrowSummary.memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Memory heap total: ${(arrowSummary.memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Memory external: ${(arrowSummary.memoryIncrease.external / 1024 / 1024).toFixed(2)} MB`);
  
  if (arrowSummary.cpuUsage) {
    console.log(`   - CPU user time: ${(arrowSummary.cpuUsage.user / 1000).toFixed(2)}ms`);
    console.log(`   - CPU system time: ${(arrowSummary.cpuUsage.system / 1000).toFixed(2)}ms`);
    console.log(`   - CPU total time: ${(arrowSummary.cpuUsage.total / 1000).toFixed(2)}ms`);
    console.log(`   - CPU utilization: ${((arrowSummary.cpuUsage.total / arrowSummary.totalTime) * 100).toFixed(2)}%`);
  }
  
  console.log(`   - System CPU: ${arrowSummary.systemCPU}`);
  
  // Clean up arrow monitor
  arrowMonitor.dispose();
  
  // Sleep to reset resources
  console.log('\n😴 Sleeping for 10 seconds to reset resources...');
  await sleep(10000);
  
  // Force garbage collection if available
  if (global.gc) {
    console.log('🧹 Forcing garbage collection...');
    global.gc();
  }
  
  console.log('✅ Resources reset complete\n');
  
  // Test JSON streaming
  console.log('='.repeat(60));
  console.log('📊 PHASE 2: JSON STREAMING');
  console.log('='.repeat(60));
  
  const jsonMonitor = new PerformanceMonitor();
  jsonMonitor.start();
  
  const jsonResults = await streamData('json', testFile, baseUrl);
  jsonMonitor.recordProcessing(jsonResults.time);
  
  console.log(`✅ JSON streaming completed:`);
  console.log(`   - Time: ${jsonResults.time}ms`);
  console.log(`   - Size: ${jsonResults.bytes} bytes`);
  console.log(`   - Throughput: ${jsonResults.throughput} MB/s`);
  
  jsonMonitor.end();
  const jsonSummary = jsonMonitor.getSummary();
  
  console.log('\n🔍 JSON Profiling Summary:');
  console.log(`   - Total time: ${jsonSummary.totalTime}ms`);
  console.log(`   - Performance time: ${jsonSummary.performanceTime.toFixed(2)}ms`);
  console.log(`   - Memory RSS increase: ${(jsonSummary.memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Memory heap used: ${(jsonSummary.memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Memory heap total: ${(jsonSummary.memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Memory external: ${(jsonSummary.memoryIncrease.external / 1024 / 1024).toFixed(2)} MB`);
  
  if (jsonSummary.cpuUsage) {
    console.log(`   - CPU user time: ${(jsonSummary.cpuUsage.user / 1000).toFixed(2)}ms`);
    console.log(`   - CPU system time: ${(jsonSummary.cpuUsage.system / 1000).toFixed(2)}ms`);
    console.log(`   - CPU total time: ${(jsonSummary.cpuUsage.total / 1000).toFixed(2)}ms`);
    console.log(`   - CPU utilization: ${((jsonSummary.cpuUsage.total / jsonSummary.totalTime) * 100).toFixed(2)}%`);
  }
  
  console.log(`   - System CPU: ${jsonSummary.systemCPU}`);
  
  // Clean up json monitor
  jsonMonitor.dispose();
  
  // Compare results
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE COMPARISON RESULTS');
  console.log('='.repeat(60));
  
  const timeDifference = jsonResults.time - arrowResults.time;
  const timePercentage = ((timeDifference / arrowResults.time) * 100).toFixed(2);
  
  const sizeDifference = jsonResults.bytes - arrowResults.bytes;
  const sizePercentage = ((sizeDifference / arrowResults.bytes) * 100).toFixed(2);
  
  console.log('\n⏱️  TIME COMPARISON:');
  console.log(`   Arrow:  ${arrowResults.time}ms`);
  console.log(`   JSON:   ${jsonResults.time}ms`);
  console.log(`   Diff:   ${timeDifference > 0 ? '+' : ''}${timeDifference}ms (${timePercentage}%)`);
  
  console.log('\n📦 SIZE COMPARISON:');
  console.log(`   Arrow:  ${arrowResults.bytes} bytes`);
  console.log(`   JSON:   ${jsonResults.bytes} bytes`);
  console.log(`   Diff:   ${sizeDifference > 0 ? '+' : ''}${sizeDifference} bytes (${sizePercentage}%)`);
  
  console.log('\n🚀 THROUGHPUT COMPARISON:');
  console.log(`   Arrow:  ${arrowResults.throughput} MB/s`);
  console.log(`   JSON:   ${jsonResults.throughput} MB/s`);
  
  console.log('\n🧠 MEMORY COMPARISON:');
  console.log('   RSS Memory Increase:');
  console.log(`     Arrow:  ${(arrowSummary.memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`     JSON:   ${(jsonSummary.memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`     Diff:   ${((jsonSummary.memoryIncrease.rss - arrowSummary.memoryIncrease.rss) / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('   Heap Used Memory:');
  console.log(`     Arrow:  ${(arrowSummary.memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`     JSON:   ${(jsonSummary.memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`     Diff:   ${((jsonSummary.memoryIncrease.heapUsed - arrowSummary.memoryIncrease.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('   Heap Total Memory:');
  console.log(`     Arrow:  ${(arrowSummary.memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`     JSON:   ${(jsonSummary.memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`     Diff:   ${((jsonSummary.memoryIncrease.heapTotal - arrowSummary.memoryIncrease.heapTotal) / 1024 / 1024).toFixed(2)} MB`);
  
  // CPU Comparison
  if (arrowSummary.cpuUsage && jsonSummary.cpuUsage) {
    console.log('\n🖥️  CPU COMPARISON:');
    console.log('   CPU User Time:');
    console.log(`     Arrow:  ${(arrowSummary.cpuUsage.user / 1000).toFixed(2)}ms`);
    console.log(`     JSON:   ${(jsonSummary.cpuUsage.user / 1000).toFixed(2)}ms`);
    console.log(`     Diff:   ${((jsonSummary.cpuUsage.user - arrowSummary.cpuUsage.user) / 1000).toFixed(2)}ms`);
    
    console.log('   CPU System Time:');
    console.log(`     Arrow:  ${(arrowSummary.cpuUsage.system / 1000).toFixed(2)}ms`);
    console.log(`     JSON:   ${(jsonSummary.cpuUsage.system / 1000).toFixed(2)}ms`);
    console.log(`     Diff:   ${((jsonSummary.cpuUsage.system - arrowSummary.cpuUsage.system) / 1000).toFixed(2)}ms`);
    
    console.log('   CPU Total Time:');
    console.log(`     Arrow:  ${(arrowSummary.cpuUsage.total / 1000).toFixed(2)}ms`);
    console.log(`     JSON:   ${(jsonSummary.cpuUsage.total / 1000).toFixed(2)}ms`);
    console.log(`     Diff:   ${((jsonSummary.cpuUsage.total - arrowSummary.cpuUsage.total) / 1000).toFixed(2)}ms`);
    
    console.log('   CPU Utilization:');
    const arrowCPUUtil = ((arrowSummary.cpuUsage.total / arrowSummary.totalTime) * 100).toFixed(2);
    const jsonCPUUtil = ((jsonSummary.cpuUsage.total / jsonSummary.totalTime) * 100).toFixed(2);
    console.log(`     Arrow:  ${arrowCPUUtil}%`);
    console.log(`     JSON:   ${jsonCPUUtil}%`);
    console.log(`     Diff:   ${(parseFloat(jsonCPUUtil) - parseFloat(arrowCPUUtil)).toFixed(2)}%`);
  }
  
  // Performance API Comparison
  console.log('\n⚡ PERFORMANCE API COMPARISON:');
  console.log(`   Arrow performance time: ${arrowSummary.performanceTime.toFixed(2)}ms`);
  console.log(`   JSON performance time: ${jsonSummary.performanceTime.toFixed(2)}ms`);
  console.log(`   Diff: ${(jsonSummary.performanceTime - arrowSummary.performanceTime).toFixed(2)}ms`);
  
  // Determine winners
  console.log('\n🏆 PERFORMANCE ANALYSIS:');
  if (arrowResults.time < jsonResults.time) {
    console.log(`   ⚡ Arrow is ${Math.abs(timePercentage)}% faster`);
  } else {
    console.log(`   ⚡ JSON is ${Math.abs(timePercentage)}% faster`);
  }
  
  if (arrowResults.bytes < jsonResults.bytes) {
    console.log(`   📦 Arrow is ${Math.abs(sizePercentage)}% smaller`);
  } else {
    console.log(`   📦 JSON is ${Math.abs(sizePercentage)}% smaller`);
  }
  
  // CPU efficiency analysis
  if (arrowSummary.cpuUsage && jsonSummary.cpuUsage) {
    const arrowCPUEfficiency = arrowResults.bytes / arrowSummary.cpuUsage.total;
    const jsonCPUEfficiency = jsonResults.bytes / jsonSummary.cpuUsage.total;
    
    console.log('\n📈 CPU EFFICIENCY (bytes/ms of CPU time):');
    console.log(`   Arrow:  ${arrowCPUEfficiency.toFixed(2)}`);
    console.log(`   JSON:   ${jsonCPUEfficiency.toFixed(2)}`);
    
    if (arrowCPUEfficiency > jsonCPUEfficiency) {
      console.log(`   🎯 Arrow is more CPU efficient`);
    } else {
      console.log(`   🎯 JSON is more CPU efficient`);
    }
  }
  
  // Memory efficiency
  const arrowMemoryEfficiency = arrowResults.bytes / arrowSummary.memoryIncrease.heapUsed;
  const jsonMemoryEfficiency = jsonResults.bytes / jsonSummary.memoryIncrease.heapUsed;
  
  console.log('\n📈 MEMORY EFFICIENCY (bytes/byte of heap):');
  console.log(`   Arrow:  ${arrowMemoryEfficiency.toFixed(2)}`);
  console.log(`   JSON:   ${jsonMemoryEfficiency.toFixed(2)}`);
  
  if (arrowMemoryEfficiency > jsonMemoryEfficiency) {
    console.log(`   🎯 Arrow is more memory efficient`);
  } else {
    console.log(`   🎯 JSON is more memory efficient`);
  }
  
  // Calculate overall efficiency score
  const arrowEfficiency = arrowResults.bytes / arrowResults.time;
  const jsonEfficiency = jsonResults.bytes / jsonResults.time;
  
  console.log('\n📊 OVERALL EFFICIENCY (bytes/ms):');
  console.log(`   Arrow:  ${arrowEfficiency.toFixed(2)}`);
  console.log(`   JSON:   ${jsonEfficiency.toFixed(2)}`);
  
  if (arrowEfficiency > jsonEfficiency) {
    console.log(`   🎯 Arrow is more efficient overall`);
  } else {
    console.log(`   🎯 JSON is more efficient overall`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPARISON COMPLETE');
  console.log('='.repeat(60));
}

// Run comparison if server is available
async function runComparison() {
  try {
    // Check if server is running
    const response = await fetch('http://localhost:4000/datasets');
    if (!response.ok) {
      throw new Error('Server not running');
    }
    
    await compareStreamingPerformance();
    
  } catch (error) {
    console.error('❌ Cannot connect to server. Make sure it\'s running on http://localhost:4000');
    console.error('   Start the server with: npm start');
    process.exit(1);
  }
}

runComparison(); 