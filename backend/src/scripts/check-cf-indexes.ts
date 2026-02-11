import { pool } from "../config/database.js";

async function check() {
  const client = await pool.connect();
  try {
    // Check indexes on component_fields
    const indexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'component_fields' AND schemaname = 'config'
    `);
    console.log('=== Indexes on config.component_fields ===');
    for (const r of indexes.rows) {
      console.log(r.indexname + ': ' + r.indexdef);
    }

    // Check primary key and unique constraints
    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'config.component_fields'::regclass
    `);
    console.log('\n=== Constraints on config.component_fields ===');
    for (const r of constraints.rows) {
      console.log(r.conname + ' (' + r.contype + '): ' + r.def);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
