/**
 * Jest setup for @flightstream/csv-service package
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set test timeout for file operations
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Mock console output to avoid noise
global.originalConsoleLog = console.log;
global.originalConsoleWarn = console.warn;
beforeEach(() => {
  if (typeof jest !== 'undefined') {
    console.log = jest.fn();
    console.warn = jest.fn();
  } else {
    console.log = () => {};
    console.warn = () => {};
  }
});

afterEach(() => {
  console.log = global.originalConsoleLog;
  console.warn = global.originalConsoleWarn;
});

// Test utilities for CSV operations
const CSVTestUtils = {
  /**
   * Create a temporary test CSV file
   */
  createTestCSVFile(filename, data, headers = null) {
    const testDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const filePath = path.join(testDir, filename);
    let csvContent = '';
    
    if (headers) {
      csvContent += headers.join(',') + '\n';
    }
    
    if (Array.isArray(data[0])) {
      // Array of arrays format
      csvContent += data.map(row => row.join(',')).join('\n');
    } else {
      // Array of objects format
      if (!headers && data.length > 0) {
        headers = Object.keys(data[0]);
        csvContent = headers.join(',') + '\n';
      }
      csvContent += data.map(row => 
        headers.map(h => row[h] || '').join(',')
      ).join('\n');
    }
    
    fs.writeFileSync(filePath, csvContent);
    return filePath;
  },

  /**
   * Create test data for CSV files
   */
  createTestData(count = 10) {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      price: (Math.random() * 100).toFixed(2),
      active: i % 2 === 0,
      category: ['Electronics', 'Books', 'Clothing'][i % 3],
      created_at: new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    }));
  },

  /**
   * Create malformed CSV test data
   */
  createMalformedCSVFile(filename) {
    const testDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const filePath = path.join(testDir, filename);
    const csvContent = `id,name,price
1,"Product 1",29.99
2,"Product with "quotes" and, comma",39.99
3,Product 3,invalid_price
4,"Unclosed quote,49.99
5,Product 5,59.99`;
    
    fs.writeFileSync(filePath, csvContent);
    return filePath;
  },

  /**
   * Clean up test files
   */
  cleanupTestFiles() {
    const testDir = path.join(__dirname, 'fixtures');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  },

  /**
   * Get test fixtures directory
   */
  getFixturesDir() {
    return path.join(__dirname, 'fixtures');
  }
};

// Make available globally for tests
global.CSVTestUtils = CSVTestUtils; 