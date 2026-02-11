import { pool } from '../config/database';

async function main() {
  const client = await pool.connect();
  try {
    // 1. Все kpi_name
    const kpis = await client.query('SELECT DISTINCT kpi_name FROM mart.v_kpi_all ORDER BY kpi_name');
    console.log('=== KPI Names ===');
    kpis.rows.forEach((r: { kpi_name: string }) => console.log(r.kpi_name));
    
    // 2. Layout sections для карточек
    const sections = await client.query(`
      SELECT id, component_type, title 
      FROM config.components 
      WHERE component_type = 'section' AND is_active = TRUE
      ORDER BY id
    `);
    console.log('\n=== Sections ===');
    sections.rows.forEach((r: { id: string; title: string }) => console.log(r.id, r.title));
    
    // 3. Текущие карточки
    const cards = await client.query(`
      SELECT id, title, data_source_key 
      FROM config.components 
      WHERE component_type = 'card'
      ORDER BY id
    `);
    console.log('\n=== Current Cards ===');
    cards.rows.forEach((r: { id: string; title: string; data_source_key: string }) => 
      console.log(r.id, r.title, r.data_source_key));
    
    // 4. Layout mapping
    const layout = await client.query(`
      SELECT layout_id, component_id, parent_component_id, display_order 
      FROM config.layout_component_mapping 
      WHERE parent_component_id LIKE 'section%'
      ORDER BY parent_component_id, display_order
    `);
    console.log('\n=== Layout Mapping ===');
    layout.rows.forEach((r: { parent_component_id: string; component_id: string; display_order: number }) => 
      console.log(r.parent_component_id, '->', r.component_id, '(order:', r.display_order + ')'));
    
    // 5. Query config kpis
    const query = await client.query(`
      SELECT query_id, source_config 
      FROM config.component_queries 
      WHERE query_id = 'kpis'
    `);
    console.log('\n=== Query Config kpis ===');
    if (query.rows.length > 0) {
      console.log(JSON.stringify(query.rows[0].source_config, null, 2));
    } else {
      console.log('No kpis query found');
    }
    
    // 6. Check if kpis_view exists
    const kpisView = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.views 
      WHERE table_name = 'kpis_view'
    `);
    console.log('\n=== kpis_view exists? ===');
    console.log(kpisView.rows.length > 0 ? 'Yes: ' + kpisView.rows[0].table_schema + '.' + kpisView.rows[0].table_name : 'No');
    
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
