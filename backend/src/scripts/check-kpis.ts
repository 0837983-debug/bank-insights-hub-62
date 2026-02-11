import { pool } from "../config/database.js";

async function check() {
  const client = await pool.connect();
  try {
    const kpis = await client.query('SELECT DISTINCT kpi_name FROM mart.v_kpi_all ORDER BY kpi_name');
    console.log('=== KPI Names from v_kpi_all ===');
    for (const r of kpis.rows) console.log(r.kpi_name);
    
    const cards = await client.query("SELECT id, data_source_key FROM config.components WHERE component_type = 'card' ORDER BY id");
    console.log('\n=== Existing Cards ===');
    for (const r of cards.rows) console.log(r.id + ' -> ' + r.data_source_key);
    
    const sections = await client.query("SELECT id, title FROM config.components WHERE component_type = 'section' ORDER BY id");
    console.log('\n=== Layout Sections ===');
    for (const r of sections.rows) console.log(r.id + ' -> ' + r.title);
    
    const query = await client.query("SELECT query_id, config_json FROM config.component_queries WHERE query_id = 'kpis'");
    console.log('\n=== Current kpis query config ===');
    if (query.rows.length > 0) {
      console.log(JSON.stringify(query.rows[0].config_json, null, 2));
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
