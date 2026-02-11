import { pool } from "../config/database.js";

async function check() {
  const client = await pool.connect();
  try {
    // Все компоненты
    const components = await client.query("SELECT id, component_type, title FROM config.components ORDER BY component_type, id");
    console.log('=== All Components ===');
    for (const r of components.rows) console.log(r.component_type + ' | ' + r.id + ' -> ' + r.title);
    
    // Layout mappings
    const mappings = await client.query("SELECT layout_id, component_id, parent_component_id, display_order FROM config.layout_component_mapping ORDER BY layout_id, parent_component_id, display_order");
    console.log('\n=== Layout Mappings ===');
    for (const r of mappings.rows) console.log(r.layout_id + ' | ' + (r.parent_component_id || 'ROOT') + ' -> ' + r.component_id + ' (order: ' + r.display_order + ')');
    
    // kpis_view структура
    const kpisViewStruct = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'mart' AND table_name = 'kpis_view' ORDER BY ordinal_position");
    console.log('\n=== mart.kpis_view columns ===');
    for (const r of kpisViewStruct.rows) console.log(r.column_name);
    
    // Пример данных из kpis_view
    const kpisViewData = await client.query("SELECT * FROM mart.kpis_view LIMIT 5");
    console.log('\n=== mart.kpis_view sample ===');
    console.log(JSON.stringify(kpisViewData.rows, null, 2));
    
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
