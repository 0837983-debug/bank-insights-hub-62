import { pool } from "../config/database.js";

async function check() {
  const client = await pool.connect();
  try {
    // Структура component_fields
    const cfStruct = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'config' AND table_name = 'component_fields' 
      ORDER BY ordinal_position
    `);
    console.log('=== component_fields columns ===');
    for (const r of cfStruct.rows) console.log(r.column_name + ' (' + r.data_type + ') default: ' + r.column_default);
    
    // Индексы
    const indexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'config' AND tablename = 'component_fields'
    `);
    console.log('\n=== component_fields indexes ===');
    for (const r of indexes.rows) console.log(r.indexname + ': ' + r.indexdef);
    
    // Текущий max id
    const maxId = await client.query("SELECT MAX(id) as max_id FROM config.component_fields");
    console.log('\n=== Max ID ===');
    console.log(maxId.rows[0].max_id);
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
