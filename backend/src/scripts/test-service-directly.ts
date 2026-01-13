import { buildLayoutFromDB } from "../services/layoutService.js";

async function testService() {
  try {
    console.log("Testing layoutService directly...\n");
    
    const layout = await buildLayoutFromDB();
    
    console.log("Formats returned:");
    console.log("Total:", Object.keys(layout.formats).length);
    console.log("IDs:", Object.keys(layout.formats));
    
    // Also check what the API would return
    const response = JSON.stringify(layout, null, 2);
    const parsed = JSON.parse(response);
    console.log("\nParsed formats count:", Object.keys(parsed.formats || {}).length);
    
  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

testService();
