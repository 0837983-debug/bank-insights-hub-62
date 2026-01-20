import { pool } from "../config/database.js";

async function checkHeaderInView() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка header в view ===\n");

    // Проверяем header в layout_component_mapping
    const mappingResult = await client.query(`
      SELECT 
        lcm.layout_id,
        lcm.component_id,
        lcm.display_order,
        c.component_type,
        c.title
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.layout_id = 'main_dashboard'
        AND lcm.parent_component_id IS NULL
        AND lcm.deleted_at IS NULL
        AND c.component_type = 'header'
    `);

    console.log("1. Header в layout_component_mapping:");
    mappingResult.rows.forEach((row, idx) => {
      console.log(`   [${idx}] component_id=${row.component_id}, display_order=${row.display_order}, title=${row.title}`);
    });

    // Проверяем header в layout_sections_agg_view
    const aggViewResult = await client.query(`
      SELECT DISTINCT
        layout_id,
        section_id,
        section_title,
        section_display_order
      FROM config.layout_sections_agg_view
      WHERE layout_id = 'main_dashboard'
        AND section_id = 'header'
    `);

    console.log("\n2. Header в layout_sections_agg_view:");
    if (aggViewResult.rows.length === 0) {
      console.log("   ❌ Header не найден в layout_sections_agg_view");
    } else {
      aggViewResult.rows.forEach((row, idx) => {
        console.log(`   [${idx}] section_id=${row.section_id}, display_order=${row.section_display_order}`);
      });
    }

    // Проверяем header в layout_sections_json_view
    const jsonViewResult = await client.query(`
      SELECT 
        layout_id,
        section_id,
        section->>'id' AS section_id_from_json,
        section->>'title' AS section_title
      FROM config.layout_sections_json_view
      WHERE layout_id = 'main_dashboard'
        AND section_id = 'header'
    `);

    console.log("\n3. Header в layout_sections_json_view:");
    if (jsonViewResult.rows.length === 0) {
      console.log("   ❌ Header не найден в layout_sections_json_view");
    } else {
      jsonViewResult.rows.forEach((row, idx) => {
        console.log(`   [${idx}] section_id=${row.section_id}, title=${row.section_title}`);
        console.log(`       section JSON: ${JSON.stringify(row.section_id_from_json)}`);
      });
    }
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

checkHeaderInView().catch(console.error);
