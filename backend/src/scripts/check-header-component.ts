/**
 * Проверка header компонента
 */

import { pool } from "../config/database.js";

async function checkHeaderComponent() {
  const client = await pool.connect();
  try {
    // Проверяем компонент header
    const componentResult = await client.query(
      `SELECT id, component_type, title, data_source_key, is_active 
       FROM config.components 
       WHERE id = 'header'`
    );
    console.log("Header component:", JSON.stringify(componentResult.rows, null, 2));

    // Проверяем привязку к layouts
    const mappingResult = await client.query(
      `SELECT lcm.layout_id, lcm.component_id, lcm.parent_component_id, lcm.display_order, lcm.is_visible,
              l.name as layout_name, l.is_default
       FROM config.layout_component_mapping lcm
       INNER JOIN config.layouts l ON lcm.layout_id = l.id
       WHERE lcm.component_id = 'header'
         AND lcm.deleted_at IS NULL
       ORDER BY lcm.layout_id`
    );
    console.log("\nHeader mappings to layouts:", JSON.stringify(mappingResult.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

checkHeaderComponent().catch(console.error);
