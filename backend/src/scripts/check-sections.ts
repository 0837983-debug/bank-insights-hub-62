import { pool } from "../config/database.js";

async function check() {
  const client = await pool.connect();
  try {
    const sections = await client.query(`
      SELECT id, title, component_type 
      FROM config.components 
      WHERE component_type IN ('section', 'container') 
      ORDER BY id
    `);
    console.log('=== Layout Sections/Containers ===');
    for (const r of sections.rows) {
      console.log(r.id + ' (' + r.component_type + ') -> ' + r.title);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
