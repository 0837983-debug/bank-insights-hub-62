import { buildLayoutFromDB } from "../services/config/layoutService.js";

async function checkLayoutFormats() {
  try {
    console.log("Checking layout formats...\n");
    
    const layout = await buildLayoutFromDB();
    
    console.log("Formats returned by layoutService:");
    console.log("Total formats:", Object.keys(layout.formats).length);
    console.log("\nFormat IDs:", Object.keys(layout.formats));
    
    console.log("\nDetailed formats:");
    for (const [id, format] of Object.entries(layout.formats)) {
      console.log(`\n${id}:`, JSON.stringify(format, null, 2));
    }
    
    console.log("\n\nSections count:", layout.sections.length);
    if (layout.sections.length > 0) {
      console.log("Section titles:", layout.sections.map(s => s.title));
    }
    
  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

checkLayoutFormats();
