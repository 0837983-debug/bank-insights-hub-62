/**
 * Проверка кнопок-компонентов
 */

import { pool } from "../config/database.js";

async function checkButtons() {
  const client = await pool.connect();
  try {
    // Проверяем кнопки в components
    const buttonsResult = await client.query(
      `SELECT id, component_type, title, data_source_key, settings
       FROM config.components
       WHERE component_type = 'button'
         AND deleted_at IS NULL
       ORDER BY id`
    );
    console.log("Buttons in components:", JSON.stringify(buttonsResult.rows, null, 2));

    // Проверяем привязку кнопок к таблицам
    const mappingsResult = await client.query(
      `SELECT 
        lcm.layout_id,
        lcm.component_id as button_id,
        lcm.parent_component_id as table_id,
        lcm.display_order,
        c.title as button_title,
        parent_c.title as table_title
       FROM config.layout_component_mapping lcm
       INNER JOIN config.components c ON lcm.component_id = c.id
       INNER JOIN config.components parent_c ON lcm.parent_component_id = parent_c.id
       WHERE c.component_type = 'button'
         AND lcm.deleted_at IS NULL
       ORDER BY lcm.layout_id, lcm.parent_component_id, lcm.display_order`
    );
    console.log("\nButton mappings to tables:", JSON.stringify(mappingsResult.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

checkButtons().catch(console.error);
