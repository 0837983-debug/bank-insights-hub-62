import { pool } from "../config/database.js";

async function checkViews() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка view в схеме config ===\n");

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'config'
      ORDER BY table_name
    `);

    console.log(`Найдено view: ${result.rows.length}`);
    result.rows.forEach((row, idx) => {
      console.log(`  [${idx + 1}] ${row.table_name}`);
    });

    const expectedViews = ['layout_sections_agg_view', 'layout_sections_json_view'];
    const foundViews = result.rows.map(r => r.table_name);
    
    console.log("\nОжидаемые view:");
    expectedViews.forEach(v => {
      const exists = foundViews.includes(v);
      console.log(`  ${exists ? '✅' : '❌'} ${v}`);
    });

    const unexpectedViews = foundViews.filter(v => !expectedViews.includes(v));
    if (unexpectedViews.length > 0) {
      console.log("\n⚠️  Неожиданные view:");
      unexpectedViews.forEach(v => {
        console.log(`  - ${v}`);
      });
    }
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

checkViews().catch(console.error);
