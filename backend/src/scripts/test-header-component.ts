/**
 * Script to test header component and data_source_key
 */

import { pool } from "../config/database.js";

async function testHeaderComponent() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка header компонента ===\n");

    // 1. Check if header component exists
    console.log("1. Проверка наличия header компонента:");
    const componentCheck = await client.query(`
      SELECT id, component_type, title, data_source_key, is_active
      FROM config.components
      WHERE id = 'header'
        AND deleted_at IS NULL
    `);

    if (componentCheck.rows.length === 0) {
      console.log("   ❌ Компонент 'header' не найден!");
      return;
    }

    const headerComponent = componentCheck.rows[0];
    console.log("   ✅ Компонент 'header' найден:");
    console.log(`      - component_type: ${headerComponent.component_type}`);
    console.log(`      - title: ${headerComponent.title}`);
    console.log(`      - data_source_key: ${headerComponent.data_source_key || 'NULL'}`);
    console.log(`      - is_active: ${headerComponent.is_active}`);

    if (headerComponent.data_source_key !== "header_dates") {
      console.log(`   ❌ data_source_key должен быть 'header_dates', получен: '${headerComponent.data_source_key}'`);
    } else {
      console.log("   ✅ data_source_key = 'header_dates'");
    }

    // 2. Check layout_component_mapping
    console.log("\n2. Проверка привязки header к layout:");
    const mappingCheck = await client.query(`
      SELECT 
        lcm.layout_id,
        lcm.component_id,
        lcm.parent_component_id,
        lcm.display_order,
        lcm.is_visible,
        l.id as layout_id_full
      FROM config.layout_component_mapping lcm
      JOIN config.layouts l ON l.id = lcm.layout_id
      WHERE lcm.component_id = 'header'
        AND lcm.deleted_at IS NULL
        AND l.deleted_at IS NULL
      ORDER BY lcm.layout_id, lcm.display_order
    `);

    if (mappingCheck.rows.length === 0) {
      console.log("   ❌ Header не привязан ни к одному layout!");
    } else {
      console.log(`   ✅ Header привязан к ${mappingCheck.rows.length} layout(s):`);
      for (const mapping of mappingCheck.rows) {
        console.log(`      - Layout ID: ${mapping.layout_id}`);
        console.log(`        - parent_component_id: ${mapping.parent_component_id || 'NULL'}`);
        console.log(`        - display_order: ${mapping.display_order}`);
        console.log(`        - is_visible: ${mapping.is_visible}`);
        
        // Проверка, что header первый (display_order = 0)
        if (mapping.display_order !== 0) {
          console.log(`        ⚠️  Предупреждение: display_order должен быть 0 для header`);
        }
      }
    }

    // 3. Check data_source_key in component_queries
    console.log("\n3. Проверка наличия query 'header_dates':");
    const queryCheck = await client.query(`
      SELECT query_id, title, is_active
      FROM config.component_queries
      WHERE query_id = 'header_dates'
        AND deleted_at IS NULL
    `);

    if (queryCheck.rows.length === 0) {
      console.log("   ❌ Query 'header_dates' не найден!");
    } else {
      const query = queryCheck.rows[0];
      console.log("   ✅ Query 'header_dates' найден:");
      console.log(`      - title: ${query.title}`);
      console.log(`      - is_active: ${query.is_active}`);
    }

    // 4. Test getData call for header_dates
    console.log("\n4. Проверка возможности получения данных через getData:");
    try {
      const dataResult = await client.query(`
        SELECT config_json, wrap_json
        FROM config.component_queries
        WHERE query_id = 'header_dates'
          AND is_active = TRUE
          AND deleted_at IS NULL
      `);

      if (dataResult.rows.length > 0) {
        const config = dataResult.rows[0].config_json;
        console.log("   ✅ Конфиг header_dates доступен:");
        console.log(`      - from: ${config.from?.schema}.${config.from?.table}`);
        console.log(`      - select items: ${config.select?.length || 0}`);
        console.log(`      - wrap_json: ${dataResult.rows[0].wrap_json}`);
      } else {
        console.log("   ❌ Конфиг header_dates не найден или неактивен");
      }
    } catch (error: any) {
      console.log(`   ⚠️  Ошибка при проверке конфига: ${error.message}`);
    }

    // 5. Summary
    console.log("\n=== Итоги ===");
    const allChecks = [
      componentCheck.rows.length > 0,
      headerComponent.data_source_key === "header_dates",
      mappingCheck.rows.length > 0,
      queryCheck.rows.length > 0,
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    console.log(`Пройдено проверок: ${passedChecks}/${allChecks.length}`);

    if (passedChecks === allChecks.length) {
      console.log("\n✅ Все проверки пройдены!");
    } else {
      console.log("\n❌ Некоторые проверки не пройдены!");
    }

  } catch (error) {
    console.error("Ошибка при проверке:", error);
    throw error;
  } finally {
    client.release();
  }
}

testHeaderComponent()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
