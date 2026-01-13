async function testLayoutAPI() {
  try {
    const port = process.env.PORT || 3001;
    const url = `http://localhost:${port}/api/layout`;
    
    console.log(`Testing API endpoint: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response:');
    console.log('Total formats:', Object.keys(data.formats || {}).length);
    console.log('Format IDs:', Object.keys(data.formats || {}));
    
    console.log('\nDetailed formats:');
    if (data.formats) {
      for (const [id, format] of Object.entries(data.formats)) {
        console.log(`\n${id}:`, JSON.stringify(format, null, 2));
      }
    }
    
    console.log('\n\nSections count:', data.sections?.length || 0);
    if (data.sections && data.sections.length > 0) {
      console.log('Section titles:', data.sections.map((s: any) => s.title));
    }
    
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Backend server is not running on port 3001');
      console.error('Please start the server with: npm run dev');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testLayoutAPI();
