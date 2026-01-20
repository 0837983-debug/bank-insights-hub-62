import { pool } from "../config/database.js";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";

async function testFormatsInView() {
  const client = await pool.connect();
  try {
    console.log("=== Тест formats в view ===\n");

    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const sql = await buildQueryFromId("layout", paramsJson);
    const result = await client.query(sql);

    if (result.rows.length > 0 && result.rows[0].jsonb_agg) {
      const data = result.rows[0].jsonb_agg;
      console.log(`Total rows: ${data.length}\n`);

      data.forEach((row: any, idx: number) => {
        const section = row.section;
        console.log(`[${idx}] ${section.id}: ${section.title}`);
        
        if (section.id === 'formats') {
          console.log(`    Formats count: ${Object.keys(section.formats || {}).length}`);
          if (section.formats) {
            const formatIds = Object.keys(section.formats).slice(0, 5);
            console.log(`    First 5 formats: ${formatIds.join(', ')}`);
          }
        } else {
          console.log(`    Components count: ${section.components?.length || 0}`);
        }
      });
    }
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

testFormatsInView().catch(console.error);
