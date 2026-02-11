import { pool } from "../config/database.js";

async function check() {
  const client = await pool.connect();
  try {
    const sections = await client.query("SELECT id, title FROM config.components WHERE component_type = 'section' ORDER BY id");
    console.log('=== Layout Sections ===');
    for (const r of sections.rows) console.log(r.id + ' -> ' + r.title);
    
    // Проверим структуру component_queries
    const queryCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'config' AND table_name = 'component_queries' ORDER BY ordinal_position");
    console.log('\n=== component_queries columns ===');
    for (const r of queryCols.rows) console.log(r.column_name);
    
    // Получим kpis query если есть
    const query = await client.query("SELECT * FROM config.component_queries WHERE query_id = 'kpis'");
    console.log('\n=== kpis query ===');
    if (query.rows.length > 0) {
      console.log(JSON.stringify(query.rows[0], null, 2));
    } else {
      console.log('NOT FOUND');
    }
    
    // Проверим существует ли kpis_view
    const kpisView = await client.query("SELECT viewname FROM pg_views WHERE schemaname = 'mart' AND viewname = 'kpis_view'");
    console.log('\n=== mart.kpis_view exists? ===');
    console.log(kpisView.rows.length > 0 ? 'YES' : 'NO');
    
    // Проверим структуру v_kpi_all
    const vkpiStruct = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'mart' AND table_name = 'v_kpi_all' ORDER BY ordinal_position");
    console.log('\n=== v_kpi_all columns ===');
    for (const r of vkpiStruct.rows) console.log(r.column_name);
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
