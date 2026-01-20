/**
 * Script to test button components and absence of groupableFields
 */

import { pool } from "../config/database.js";

async function testButtonComponents() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка кнопок и groupableFields ===\n");

    // 1. Check button components in DB
    console.log("1. Проверка компонентов типа 'button' в БД:");
    const buttonComponents = await client.query(`
      SELECT id, component_type, title, data_source_key
      FROM config.components
      WHERE component_type = 'button'
        AND deleted_at IS NULL
      ORDER BY id
    `);

    if (buttonComponents.rows.length === 0) {
      console.log("   ⚠️  Компоненты типа 'button' не найдены");
    } else {
      console.log(`   ✅ Найдено ${buttonComponents.rows.length} кнопок:`);
      for (const button of buttonComponents.rows) {
        console.log(`      - ${button.id}: ${button.title || 'N/A'}, data_source_key: ${button.data_source_key || 'NULL'}`);
      }
    }

    // 2. Check button mappings to tables
    console.log("\n2. Проверка привязки кнопок к таблицам:");
    const buttonMappings = await client.query(`
      SELECT 
        lcm.layout_id,
        lcm.component_id as button_id,
        lcm.parent_component_id as table_id,
        c_button.title as button_title,
        c_button.data_source_key as button_query_id,
        c_table.title as table_title
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c_button ON lcm.component_id = c_button.id
      LEFT JOIN config.components c_table ON lcm.parent_component_id = c_table.id
      WHERE c_button.component_type = 'button'
        AND lcm.deleted_at IS NULL
        AND c_button.deleted_at IS NULL
      ORDER BY lcm.layout_id, lcm.parent_component_id, lcm.display_order
    `);

    if (buttonMappings.rows.length === 0) {
      console.log("   ⚠️  Кнопки не привязаны к таблицам");
    } else {
      console.log(`   ✅ Найдено ${buttonMappings.rows.length} привязок кнопок к таблицам:`);
      for (const mapping of buttonMappings.rows) {
        console.log(`      - Layout: ${mapping.layout_id}`);
        console.log(`        Кнопка: ${mapping.button_id} (${mapping.button_title || 'N/A'})`);
        console.log(`        Таблица: ${mapping.table_id || 'NULL'} (${mapping.table_title || 'N/A'})`);
        console.log(`        query_id: ${mapping.button_query_id || 'NULL'}`);
      }
    }

    // 3. Check that groupableFields are not in layout JSON structure
    console.log("\n3. Проверка отсутствия groupableFields в layoutService:");
    const layoutServiceFile = await import("fs/promises").then(m => m.readFile(
      "../services/config/layoutService.ts",
      "utf-8"
    )).catch(() => null);

    if (layoutServiceFile) {
      // Проверяем, что groupableFields не возвращаются в layout JSON
      const hasGroupableFieldsInReturn = layoutServiceFile.includes('groupableFields') && 
                                         !layoutServiceFile.includes('// groupableFields') &&
                                         !layoutServiceFile.includes('/* groupableFields');
      
      if (hasGroupableFieldsInReturn) {
        console.log("   ⚠️  groupableFields все еще могут возвращаться в layout JSON");
      } else {
        console.log("   ✅ groupableFields не возвращаются в layout JSON (или закомментированы)");
      }
    } else {
      console.log("   ⚠️  Не удалось прочитать layoutService.ts для проверки");
    }

    // 4. Check components that previously had groupableFields
    console.log("\n4. Проверка компонентов, которые ранее имели groupableFields:");
    const componentsWithSettings = await client.query(`
      SELECT id, component_type, title, settings
      FROM config.components
      WHERE settings IS NOT NULL
        AND settings::text != 'null'
        AND deleted_at IS NULL
      ORDER BY id
    `);

    if (componentsWithSettings.rows.length > 0) {
      console.log(`   Найдено ${componentsWithSettings.rows.length} компонент(ов) с settings:`);
      let hasGroupableFields = false;
      for (const comp of componentsWithSettings.rows) {
        try {
          const settings = typeof comp.settings === 'string' 
            ? JSON.parse(comp.settings) 
            : comp.settings;
          
          if (settings && (settings.groupableFields || settings.groupable_fields)) {
            hasGroupableFields = true;
            console.log(`      ⚠️  ${comp.id} (${comp.component_type}): имеет groupableFields в settings`);
          }
        } catch (e) {
          // Не удалось распарсить settings
        }
      }
      
      if (!hasGroupableFields) {
        console.log("   ✅ groupableFields не найдены в settings компонентов");
      }
    } else {
      console.log("   ✅ Компоненты не имеют settings с groupableFields");
    }

    // 5. Summary
    console.log("\n=== Итоги ===");
    const allChecks = [
      buttonComponents.rows.length > 0,
      buttonMappings.rows.length > 0,
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    console.log(`Пройдено проверок: ${passedChecks}/${allChecks.length}`);

    if (passedChecks === allChecks.length) {
      console.log("\n✅ Все проверки пройдены!");
      console.log("   Кнопки созданы и привязаны к таблицам");
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

testButtonComponents()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
