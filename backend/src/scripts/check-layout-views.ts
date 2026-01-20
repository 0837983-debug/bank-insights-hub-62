import { pool } from "../config/database.js";

async function checkViews() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'config' 
        AND table_name LIKE 'layout%'
      ORDER BY table_name
    `);
    console.log('Views:', result.rows.map(r => r.table_name));
    
    // Проверяем новый view
    if (result.rows.some(r => r.table_name === 'layout_sections_agg_view')) {
      console.log('\n✅ layout_sections_agg_view создан!');
      
      // Пробуем сделать SELECT
      const testResult = await client.query(`
        SELECT COUNT(*) as cnt 
        FROM config.layout_sections_agg_view 
        LIMIT 1
      `);
      console.log('Тест SELECT:', testResult.rows[0]);
    } else {
      console.log('\n❌ layout_sections_agg_view не найден');
    }
  } finally {
    client.release();
  }
}

checkViews().catch(console.error).finally(() => pool.end());
