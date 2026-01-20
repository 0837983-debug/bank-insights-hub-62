/**
 * Проверка groupable полей для создания кнопок
 */

import { pool } from "../config/database.js";

async function checkGroupableFields() {
  const client = await pool.connect();
  try {
    // Находим все компоненты-таблицы с groupable полями
    const result = await client.query(`
      SELECT 
        c.id as component_id,
        c.title as component_title,
        cf.field_id,
        cf.label,
        cf.is_groupable,
        cf.display_order
      FROM config.components c
      INNER JOIN config.component_fields cf ON c.id = cf.component_id
      WHERE c.component_type = 'table'
        AND cf.is_groupable = TRUE
        AND c.deleted_at IS NULL
        AND cf.deleted_at IS NULL
        AND cf.is_active = TRUE
      ORDER BY c.id, cf.display_order
    `);
    console.log('Groupable fields:', JSON.stringify(result.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

checkGroupableFields().catch(console.error);
