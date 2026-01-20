import { pool } from "../config/database.js";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";

async function testLayoutViewStructure() {
  const client = await pool.connect();
  try {
    console.log("=== Тест структуры layout_sections_json_view ===\n");

    // Проверяем view напрямую
    console.log("1. Проверка view напрямую:");
    const viewResult = await client.query(`
      SELECT layout_id, section_id, section
      FROM config.layout_sections_json_view
      WHERE layout_id = 'main_dashboard'
      ORDER BY section_id
    `);
    
    console.log(`   - Rows: ${viewResult.rows.length}`);
    viewResult.rows.forEach((row, idx) => {
      console.log(`   - Row ${idx}: layout_id=${row.layout_id}, section_id=${row.section_id}`);
      if (row.section) {
        console.log(`     Section keys: ${Object.keys(row.section).join(', ')}`);
        console.log(`     Section id: ${row.section.id}`);
        console.log(`     Section title: ${row.section.title}`);
        console.log(`     Components count: ${row.section.components?.length || 0}`);
      }
    });

    // Проверяем через SQL Builder
    console.log("\n2. Проверка через SQL Builder:");
    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const sql = await buildQueryFromId("layout", paramsJson);
    console.log(`   SQL: ${sql.substring(0, 200)}...\n`);

    const builderResult = await client.query(sql);
    console.log(`   - Rows: ${builderResult.rows.length}`);
    
    if (builderResult.rows.length > 0 && builderResult.rows[0].jsonb_agg) {
      const data = builderResult.rows[0].jsonb_agg;
      console.log(`   - jsonb_agg is array: ${Array.isArray(data)}`);
      console.log(`   - jsonb_agg length: ${Array.isArray(data) ? data.length : 'N/A'}`);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`   - First element keys: ${Object.keys(data[0]).join(', ')}`);
        if (data[0].section) {
          console.log(`   - First section id: ${data[0].section.id}`);
          console.log(`   - First section title: ${data[0].section.title}`);
          
          // Извлекаем все sections
          const sections = data.map((row: any) => row.section);
          console.log(`\n   - All sections (${sections.length}):`);
          sections.forEach((s: any, idx: number) => {
            console.log(`     [${idx}] ${s.id}: ${s.title} (${s.components?.length || 0} components)`);
          });
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

testLayoutViewStructure().catch(console.error);
