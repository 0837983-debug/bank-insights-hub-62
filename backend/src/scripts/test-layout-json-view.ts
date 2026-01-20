import { pool } from "../config/database.js";

async function testView() {
  const client = await pool.connect();
  try {
    // Проверяем существование view
    const checkView = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'config' 
        AND table_name = 'layout_sections_json_view'
    `);
    
    if (checkView.rows.length === 0) {
      console.log("❌ View layout_sections_json_view не существует");
      return;
    }
    
    console.log("✅ View существует");
    
    // Пробуем сделать SELECT
    const result = await client.query(`
      SELECT layout_id, sections
      FROM config.layout_sections_json_view
      WHERE layout_id = 'main_dashboard'
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      console.log("\n✅ Данные получены:");
      console.log("Layout ID:", result.rows[0].layout_id);
      console.log("Sections count:", Array.isArray(result.rows[0].sections) ? result.rows[0].sections.length : 'N/A');
      console.log("First section:", JSON.stringify(result.rows[0].sections?.[0], null, 2));
    } else {
      console.log("\n⚠️  Данных нет для layout_id = 'main_dashboard'");
    }
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

testView().catch(console.error).finally(() => pool.end());
