import { pool } from "../config/database.js";

async function checkSectionDisplayOrder() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка display_order для секций ===\n");

    // Проверяем display_order в layout_component_mapping
    const mappingResult = await client.query(`
      SELECT 
        lcm.layout_id,
        lcm.component_id AS section_id,
        lcm.display_order,
        c.title AS section_title
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.layout_id = 'main_dashboard'
        AND lcm.parent_component_id IS NULL
        AND lcm.deleted_at IS NULL
        AND c.component_type = 'container'
      ORDER BY lcm.display_order, lcm.component_id
    `);

    console.log("1. display_order в layout_component_mapping:");
    mappingResult.rows.forEach((row, idx) => {
      console.log(`   [${idx}] section_id=${row.section_id}, display_order=${row.display_order}, title=${row.section_title}`);
    });

    // Проверяем display_order в view
    const viewResult = await client.query(`
      SELECT DISTINCT
        layout_id,
        section_id,
        section_display_order
      FROM config.layout_sections_agg_view
      WHERE layout_id = 'main_dashboard'
      ORDER BY layout_id, section_display_order, section_id
    `);

    console.log("\n2. section_display_order в layout_sections_agg_view:");
    viewResult.rows.forEach((row, idx) => {
      console.log(`   [${idx}] section_id=${row.section_id}, section_display_order=${row.section_display_order}`);
    });

    // Проверяем финальный результат из layout_sections_json_view
    const finalResult = await client.query(`
      SELECT 
        layout_id,
        section_id,
        section->>'id' AS section_id_from_json,
        section->>'title' AS section_title
      FROM config.layout_sections_json_view
      WHERE layout_id = 'main_dashboard'
      ORDER BY layout_id, section_display_order, section_id
    `);

    console.log("\n3. Финальный порядок из layout_sections_json_view:");
    finalResult.rows.forEach((row, idx) => {
      console.log(`   [${idx}] section_id=${row.section_id}, title=${row.section_title}`);
    });
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

checkSectionDisplayOrder().catch(console.error);
