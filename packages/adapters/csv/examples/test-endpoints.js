import fetch from 'node-fetch';

async function testEndpoints() {
  try {
    console.log('🧪 Testing Arrow and JSON streaming endpoints...\n');
    
    const baseUrl = 'http://localhost:4000';
    const testFile = 'covid-19-hospitalizations.csv';
    
    // Test Arrow endpoint
    console.log('🔍 Testing Arrow endpoint...');
    const arrowResponse = await fetch(`${baseUrl}/stream/${testFile}`);
    
    if (!arrowResponse.ok) {
      console.error(`❌ Arrow endpoint failed: ${arrowResponse.status} ${arrowResponse.statusText}`);
    } else {
      console.log('✅ Arrow endpoint working');
      console.log(`   Content-Type: ${arrowResponse.headers.get('content-type')}`);
      console.log(`   Content-Disposition: ${arrowResponse.headers.get('content-disposition')}`);
      
      // Count bytes
      let arrowBytes = 0;
      for await (const chunk of arrowResponse.body) {
        arrowBytes += chunk.length;
      }
      console.log(`   Total bytes: ${arrowBytes}`);
    }
    
    // Test JSON endpoint
    console.log('\n🔍 Testing JSON endpoint...');
    const jsonResponse = await fetch(`${baseUrl}/json/${testFile}`);
    
    if (!jsonResponse.ok) {
      console.error(`❌ JSON endpoint failed: ${jsonResponse.status} ${jsonResponse.statusText}`);
    } else {
      console.log('✅ JSON endpoint working');
      console.log(`   Content-Type: ${jsonResponse.headers.get('content-type')}`);
      console.log(`   Content-Disposition: ${jsonResponse.headers.get('content-disposition')}`);
      
      // Count bytes and validate JSON
      let jsonBytes = 0;
      let jsonContent = '';
      for await (const chunk of jsonResponse.body) {
        jsonBytes += chunk.length;
        jsonContent += chunk.toString();
      }
      
      console.log(`   Total bytes: ${jsonBytes}`);
      
      // Try to parse JSON to validate
      try {
        const parsed = JSON.parse(jsonContent);
        console.log(`   JSON validation: ✅ Valid (${parsed.length} objects)`);
      } catch (error) {
        console.log(`   JSON validation: ❌ Invalid JSON`);
      }
    }
    
    console.log('\n🎉 Endpoint testing completed!');
    console.log('   Run the benchmark with: node examples/benchmark.js');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('   Make sure the server is running on http://localhost:4000');
  }
}

testEndpoints(); 