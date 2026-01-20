/**
 * Script to test data_source_key in layout JSON
 */

import { pool } from "../config/database.js";

async function testLayoutDataSourceKey() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка data_source_key в layout ===\n");

    // 1. Check components with data_source_key in DB
    console.log("1. Проверка компонентов с data_source_key в БД:");
    const componentsCheck = await client.query(`
      SELECT id, component_type, title, data_source_key
      FROM config.components
      WHERE data_source_key IS NOT NULL
        AND deleted_at IS NULL
      ORDER BY id
    `);

    if (componentsCheck.rows.length === 0) {
      console.log("   ⚠️  Компоненты с data_source_key не найдены");
    } else {
      console.log(`   ✅ Найдено ${componentsCheck.rows.length} компонент(ов) с data_source_key:`);
      for (const comp of componentsCheck.rows) {
        console.log(`      - ${comp.id} (${comp.component_type}): ${comp.data_source_key}`);
      }
    }

    // 2. Check layout_component_mapping for components with data_source_key
    console.log("\n2. Проверка привязки компонентов с data_source_key к layout:");
    const mappingCheck = await client.query(`
      SELECT 
        lcm.layout_id,
        lcm.component_id,
        c.component_type,
        c.data_source_key
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE c.data_source_key IS NOT NULL
        AND lcm.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY lcm.layout_id, lcm.display_order
    `);

    if (mappingCheck.rows.length === 0) {
      console.log("   ⚠️  Компоненты с data_source_key не привязаны к layout");
    } else {
      console.log(`   ✅ Найдено ${mappingCheck.rows.length} привязок:`);
      for (const mapping of mappingCheck.rows) {
        console.log(`      - Layout: ${mapping.layout_id}, Component: ${mapping.component_id} (${mapping.component_type}), data_source_key: ${mapping.data_source_key}`);
      }
    }

    // 3. Test layoutService query structure
    console.log("\n3. Проверка структуры запроса layoutService:");
    const layoutServiceQuery = `
      SELECT 
        lcm.id,
        lcm.component_id,
        c.component_type,
        c.data_source_key as "component.dataSourceKey"
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.layout_id = $1
        AND lcm.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY lcm.display_order
    `;

    // Test with main_dashboard layout
    const testLayout = await client.query(layoutServiceQuery, ["main_dashboard"]);

    if (testLayout.rows.length === 0) {
      console.log("   ⚠️  Layout 'main_dashboard' не найден или не содержит компонентов");
    } else {
      console.log(`   ✅ Layout 'main_dashboard' содержит ${testLayout.rows.length} компонент(ов):`);
      
      const componentsWithDataSource = testLayout.rows.filter(
        (row) => row["component.dataSourceKey"]
      );
      
      console.log(`      - Компонентов с data_source_key: ${componentsWithDataSource.length}`);
      
      for (const row of componentsWithDataSource) {
        console.log(`        - ${row.component_id} (${row.component_type}): ${row["component.dataSourceKey"]}`);
      }
    }

    // 4. Summary
    console.log("\n=== Итоги ===");
    const allChecks = [
      componentsCheck.rows.length > 0,
      mappingCheck.rows.length > 0,
      testLayout.rows.length > 0,
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    console.log(`Пройдено проверок: ${passedChecks}/${allChecks.length}`);

    if (passedChecks === allChecks.length) {
      console.log("\n✅ Все проверки пройдены!");
      console.log("   data_source_key присутствует в компонентах и привязан к layout");
    } else {
      console.log("\n⚠️  Некоторые проверки не пройдены!");
    }

  } catch (error) {
    console.error("Ошибка при проверке:", error);
    throw error;
  } finally {
    client.release();
  }
}

testLayoutDataSourceKey()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
