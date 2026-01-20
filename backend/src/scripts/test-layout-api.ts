async function testLayoutAPI() {
  try {
    const port = process.env.PORT || 3001;
    // Используем новый endpoint /api/data вместо /api/layout
    const params = encodeURIComponent(JSON.stringify({ layout_id: "main_dashboard" }));
    const url = `http://localhost:${port}/api/data?query_id=layout&component_Id=layout&parametrs=${params}`;
    
    console.log(`Testing API endpoint: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response:');
    
    // Новая структура: { sections: [...] }
    if (data.sections) {
      console.log('Sections count:', data.sections.length);
      
      // Ищем секцию formats
      const formatsSection = data.sections.find((s: any) => s.id === 'formats');
      if (formatsSection && formatsSection.formats) {
        console.log('Total formats:', Object.keys(formatsSection.formats).length);
        console.log('Format IDs:', Object.keys(formatsSection.formats));
        
        console.log('\nDetailed formats:');
        for (const [id, format] of Object.entries(formatsSection.formats)) {
          console.log(`\n${id}:`, JSON.stringify(format, null, 2));
        }
      }
      
      console.log('\n\nSections:');
      data.sections.forEach((s: any) => {
        console.log(`  - ${s.id}: ${s.title}`);
        if (s.components) {
          console.log(`    Components: ${s.components.length}`);
        }
      });
    } else {
      console.log('Unexpected response structure:', JSON.stringify(data, null, 2));
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
