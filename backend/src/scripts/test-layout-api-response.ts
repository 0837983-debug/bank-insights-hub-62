import { pool } from "../config/database.js";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";

async function testLayoutApiResponse() {
  const client = await pool.connect();
  try {
    console.log("=== Тест структуры ответа layout API ===\n");

    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const sql = await buildQueryFromId("layout", paramsJson);
    const result = await client.query(sql);
    
    // Симулируем обработку как в dataRoutes.ts
    if (result.rows.length === 1 && result.rows[0].jsonb_agg) {
      const data = result.rows[0].jsonb_agg;
      
      if (Array.isArray(data) && data.length > 0) {
        // Извлекаем section из каждого элемента массива
        const sections = data
          .map((row: any) => row.section)
          .filter((section: any) => section !== null && section !== undefined);
        
        console.log("✅ Sections count:", sections.length);
        console.log("\nSections:");
        sections.forEach((section: any, idx: number) => {
          console.log(`  [${idx}] ${section.id}: ${section.title}`);
          if (section.formats) {
            console.log(`      Formats: ${Object.keys(section.formats).length} formats`);
          } else if (section.components) {
            console.log(`      Components: ${section.components.length} components`);
          }
        });
        
        const response = { sections: sections };
        console.log("\n✅ Response structure:", JSON.stringify(response, null, 2).substring(0, 500));
      } else {
        console.log("❌ data is not array or empty");
      }
    } else {
      console.log("❌ Unexpected result structure");
      console.log("Result:", JSON.stringify(result.rows[0], null, 2));
    }
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

testLayoutApiResponse().catch(console.error);
