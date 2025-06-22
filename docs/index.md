---
layout: home
title: Home
---

# Arrow Flight Server Node.js

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub](https://img.shields.io/github/stars/ggauravr/arrow-flight-node?style=social)](https://github.com/ggauravr/arrow-flight-node)

Production-ready Apache Arrow Flight server framework with plugin architecture for Node.js. Build high-performance data streaming services with ease.

## ⚡ Quick Start

```bash
# Clone and install
git clone https://github.com/ggauravr/arrow-flight-node.git
cd arrow-flight-node
npm install

# Start the example server
npm start

# Test with the client
npm test
```

The server automatically discovers CSV files in the `data/` directory and serves them via Arrow Flight protocol.

## 🚀 Features

<div class="feature-grid">
  <div class="feature">
    <h3>🏗️ Plugin Architecture</h3>
    <p>Extensible adapter system for any data source - CSV, databases, cloud storage</p>
  </div>
  
  <div class="feature">
    <h3>⚡ High Performance</h3>
    <p>Efficient gRPC streaming with Apache Arrow's columnar data format</p>
  </div>
  
  <div class="feature">
    <h3>🔧 Production Ready</h3>
    <p>Comprehensive error handling, monitoring hooks, and Docker support</p>
  </div>
  
  <div class="feature">
    <h3>👥 Multi-Language</h3>
    <p>Connect from Python, Java, C++, JavaScript using standard Arrow Flight clients</p>
  </div>
</div>

## 📦 Packages

The monorepo contains focused, reusable packages:

| Package | Description | Status |
|---------|-------------|--------|
| **[@ggauravr/arrow-flight-node-core](https://www.npmjs.com/package/@ggauravr/arrow-flight-node-core)** | Generic Flight server framework | ✅ Ready |
| **[@ggauravr/arrow-flight-node-csv-service](https://www.npmjs.com/package/@ggauravr/arrow-flight-node-csv-service)** | CSV file adapter with streaming | ✅ Ready |
| **[@ggauravr/arrow-flight-node-utils](https://www.npmjs.com/package/@ggauravr/arrow-flight-node-utils)** | Arrow utilities and schema inference | ✅ Ready |
| **[@ggauravr/arrow-flight-node-examples](https://www.npmjs.com/package/@ggauravr/arrow-flight-node-examples)** | Reference implementations | ✅ Ready |

## 🎯 Use Cases

- **Data Lakes**: Serve files efficiently from S3, GCS, Snowflake, or local storage
- **Analytics Pipelines**: Stream data to Apache Spark, DuckDB, or custom analytics  
- **Real-time ETL**: High-performance data transformation and streaming
- **API Modernization**: Replace REST APIs with efficient columnar data transfer
- **Multi-language Integration**: Connect Python, Java, C++, and JavaScript applications

## 📚 Documentation

<div class="docs-grid">
  <a href="{{ '/getting-started/' | relative_url }}" class="doc-card">
    <h3>🚀 Getting Started</h3>
    <p>Installation, basic concepts, and your first server</p>
  </a>
  
  <a href="{{ '/tutorial/' | relative_url }}" class="doc-card">
    <h3>📖 Tutorial</h3>
    <p>Step-by-step guide to build a custom CSV server</p>
  </a>
  
  <a href="{{ '/api-reference/' | relative_url }}" class="doc-card">
    <h3>📋 API Reference</h3>
    <p>Complete API documentation and examples</p>
  </a>
  
  <a href="{{ '/examples/' | relative_url }}" class="doc-card">
    <h3>💡 Examples</h3>
    <p>Working examples and reference implementations</p>
  </a>
</div>

## 🤝 Community

- **GitHub**: [ggauravr/arrow-flight-node](https://github.com/ggauravr/arrow-flight-node)
- **Issues**: [Report bugs and request features](https://github.com/ggauravr/arrow-flight-node/issues)
- **Discussions**: [Community discussions](https://github.com/ggauravr/arrow-flight-node/discussions)

## 📄 License

This project is licensed under the [Apache License 2.0](https://github.com/ggauravr/arrow-flight-node/blob/main/LICENSE).

<style>
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.feature {
  padding: 1.5rem;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  background: #f8f9fa;
}

.feature h3 {
  margin-top: 0;
  color: #0366d6;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.doc-card {
  display: block;
  padding: 1.5rem;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  background: white;
}

.doc-card:hover {
  border-color: #0366d6;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.doc-card h3 {
  margin-top: 0;
  color: #0366d6;
}

.doc-card p {
  margin-bottom: 0;
  color: #586069;
}
</style> 