import { CSVParser } from '../src/parser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../../../data');
const testFile = path.join(DATA_DIR, 'sample.csv');

console.log('🔍 Testing CSV Parser...');
console.log('📁 Test file:', testFile);

async function testParser() {
  try {
    const parser = new CSVParser({ headers: true });
    
    console.log('📊 Starting parsing...');
    const result = await parser.parseFile(testFile);
    
    console.log('📈 Parser result:', {
      headers: result.headers,
      rowCount: result.rowCount,
      rows: result.rows ? result.rows.length : 'no rows array',
      errors: result.errors.length
    });
    
    if (result.headers) {
      console.log('📋 Headers:', result.headers);
    }
    
    if (result.rows && result.rows.length > 0) {
      console.log('📝 First few rows:');
      result.rows.slice(0, 3).forEach((row, i) => {
        console.log(`  Row ${i + 1}:`, row);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('❌ Parser errors:', result.errors);
    }
    
  } catch (error) {
    console.error('💥 Parser error:', error);
  }
}

testParser(); 