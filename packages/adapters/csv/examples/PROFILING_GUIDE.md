# Profiling Guide: Arrow vs JSON Streaming Performance

This guide shows you how to use Clinic.js to profile and compare the performance of Arrow streaming vs JSON streaming.

## 🚀 Quick Start

### 1. Start the Server
```bash
# Terminal 1: Start the server
npm start
```

### 2. Run Basic Benchmark
```bash
# Terminal 2: Run basic benchmark
npm run benchmark
```

### 3. Run Profiled Benchmark
```bash
# Terminal 2: Run benchmark with detailed profiling
npm run benchmark:profile
```

## 🔍 Clinic.js Profiling Options

### CPU + Memory Profiling (Doctor)
```bash
# Profile the server with CPU and memory analysis
npm run profile:doctor
```

### Memory Profiling (Heap)
```bash
# Profile memory usage and allocation patterns
npm run profile:heap
```

### CPU Profiling (Flame)
```bash
# Profile CPU usage with flamegraphs
npm run profile:flame
```

### Benchmark Profiling
```bash
# Profile the benchmark script itself
npm run profile:benchmark

# Profile the detailed benchmark with memory tracking
npm run profile:benchmark-detailed
```

## 📊 Understanding the Results

### Clinic Doctor Output
- **CPU Usage**: Shows where CPU time is spent
- **Memory Usage**: Shows memory allocation patterns
- **Event Loop**: Shows event loop lag
- **Active Handles**: Shows active handles and timers

### Clinic Heap Output
- **Memory Allocation**: Shows where memory is allocated
- **Heap Growth**: Shows heap size over time
- **Object Retention**: Shows what objects are retained
- **Memory Leaks**: Identifies potential memory leaks

### Clinic Flame Output
- **CPU Flamegraph**: Shows CPU usage as a flamegraph
- **Function Calls**: Shows the call stack and time spent
- **Hot Paths**: Identifies the most CPU-intensive paths

## 🎯 Expected Performance Differences

### Arrow Streaming (Expected to be faster)
- **Lower CPU usage**: Binary format is more efficient
- **Less memory allocation**: Shared buffers reduce allocation
- **Fewer GC cycles**: Memory reuse reduces garbage collection
- **Higher throughput**: More efficient data transfer

### JSON Streaming (Expected to be slower)
- **Higher CPU usage**: JSON.stringify() is expensive
- **More memory allocation**: String operations create new objects
- **More GC cycles**: Frequent object creation/destruction
- **Lower throughput**: Text format is less efficient

## 🔧 Profiling Workflow

### Step 1: Baseline Performance
```bash
# Run basic benchmark to get baseline
npm run benchmark
```

### Step 2: Server Profiling
```bash
# Start server with profiling
npm run profile:doctor

# In another terminal, run benchmark
npm run benchmark
```

### Step 3: Memory Analysis
```bash
# Profile memory usage
npm run profile:heap

# In another terminal, run benchmark
npm run benchmark
```

### Step 4: CPU Analysis
```bash
# Profile CPU usage
npm run profile:flame

# In another terminal, run benchmark
npm run benchmark
```

### Step 5: Detailed Benchmark Profiling
```bash
# Profile the benchmark script itself
npm run profile:benchmark-detailed
```

## 📈 Interpreting Results

### Key Metrics to Compare

1. **Processing Time**
   - Arrow: Expected to be faster
   - JSON: Expected to be slower

2. **Memory Usage**
   - Arrow: Lower memory footprint
   - JSON: Higher memory usage

3. **Throughput**
   - Arrow: Higher MB/s
   - JSON: Lower MB/s

4. **CPU Usage**
   - Arrow: Lower CPU utilization
   - JSON: Higher CPU utilization

### Performance Indicators

- **Memory allocation rate**: Lower is better
- **Garbage collection frequency**: Lower is better
- **CPU utilization**: Lower is better
- **Throughput**: Higher is better

## 🛠️ Troubleshooting

### Common Issues

1. **Server not running**
   ```bash
   # Make sure server is started
   npm start
   ```

2. **Port already in use**
   ```bash
   # Check what's using port 4000
   lsof -i :4000
   ```

3. **Clinic.js not found**
   ```bash
   # Reinstall clinic
   npm install --save-dev clinic
   ```

4. **Permission issues**
   ```bash
   # Make sure you have write permissions
   chmod +w .
   ```

### Debug Commands

```bash
# Check if server is responding
curl http://localhost:4000/datasets

# Check available files
ls -la ../../../../data/

# Check memory usage
node -e "console.log(process.memoryUsage())"
```

## 📋 Sample Output

### Benchmark Results
```
🏁 Starting Arrow vs JSON streaming benchmark...

🔍 Testing Arrow streaming...
✅ Arrow streaming completed:
   - Time: 1250ms
   - Size: 2048576 bytes
   - Throughput: 1.64 MB/s

🔍 Testing JSON streaming...
✅ JSON streaming completed:
   - Time: 2450ms
   - Size: 4097152 bytes
   - Throughput: 1.67 MB/s

📊 Benchmark Results:
==================================================
Time Comparison:
   Arrow:  1250ms
   JSON:   2450ms
   Diff:   +1200ms (96.00%)

Size Comparison:
   Arrow:  2048576 bytes
   JSON:   4097152 bytes
   Diff:   +2048576 bytes (100.00%)

🏆 Performance Analysis:
   ⚡ Arrow is 96.00% faster
   📦 Arrow is 100.00% smaller
```

### Profiling Summary
```
🔍 Profiling Summary:
==================================================
Total benchmark time: 3700ms
Average processing time: 1850.00ms

Memory Usage:
   RSS increase: 45.23 MB
   Heap used increase: 12.45 MB
   Heap total increase: 15.67 MB
   External memory increase: 8.91 MB
```

## 🎯 Next Steps

1. **Run all profiling types** to get complete picture
2. **Compare results** between Arrow and JSON
3. **Analyze bottlenecks** in the slower approach
4. **Optimize based on findings**
5. **Document performance improvements**

## 📚 Additional Resources

- [Clinic.js Documentation](https://clinicjs.org/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/performance/)
- [Apache Arrow Performance](https://arrow.apache.org/docs/python/performance.html) 