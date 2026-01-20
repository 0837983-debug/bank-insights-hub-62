import { pool } from "../config/database.js";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";

async function testLayoutConfig() {
  const client = await pool.connect();
  try {
    console.log("=== Тест конфига layout ===\n");

    // Проверяем конфиг
    const configCheck = await client.query(`
      SELECT query_id, title, wrap_json, (config_json->'from'->>'table') as table_name
      FROM config.component_queries
      WHERE query_id = 'layout'
    `);

    if (configCheck.rows.length === 0) {
      console.log("❌ Конфиг 'layout' не найден");
      return;
    }

    const config = configCheck.rows[0];
    console.log("✅ Конфиг найден:");
    console.log("  - query_id:", config.query_id);
    console.log("  - title:", config.title);
    console.log("  - wrap_json:", config.wrap_json);
    console.log("  - table_name:", config.table_name);

    // Тестируем через SQL Builder
    console.log("\n=== Тест через SQL Builder ===");
    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    
    try {
      const sql = await buildQueryFromId("layout", paramsJson);
      console.log("✅ SQL сгенерирован:");
      console.log(sql.substring(0, 300) + "...\n");

      // Выполняем SQL
      const result = await client.query(sql);
      console.log("✅ Результат получен:");
      console.log("  - rows count:", result.rows.length);
      
      if (result.rows.length > 0 && result.rows[0].jsonb_agg) {
        const data = result.rows[0].jsonb_agg;
        console.log("  - jsonb_agg type:", typeof data);
        console.log("  - jsonb_agg is array:", Array.isArray(data));
        console.log("  - jsonb_agg length:", Array.isArray(data) ? data.length : 'N/A');
        
        if (Array.isArray(data) && data.length > 0) {
          console.log("  - first element keys:", Object.keys(data[0]));
          if (data[0].section) {
            const section = data[0].section;
            console.log("  - sections count:", data.length);
            console.log("  - first section id:", section.id);
            console.log("  - first section title:", section.title);
            console.log("  - first section components count:", section.components?.length || 0);
            
            // Показываем все sections
            const sections = data.map((row: any) => row.section);
            console.log("\n  - All sections:");
            sections.forEach((s: any, idx: number) => {
              console.log(`    [${idx}] ${s.id}: ${s.title} (${s.components?.length || 0} components)`);
            });
          } else {
            console.log("  - first element:", JSON.stringify(data[0], null, 2));
          }
        }
      } else {
        console.log("  - result:", JSON.stringify(result.rows[0], null, 2));
      }
    } catch (error: any) {
      console.error("❌ Ошибка:", error.message);
      throw error;
    }
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

testLayoutConfig().catch(console.error);
