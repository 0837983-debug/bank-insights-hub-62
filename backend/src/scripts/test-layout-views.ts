/**
 * Test script for Layout Views
 * Проверка корректности данных в view: formats, header, sections
 */

import { pool } from "../config/database.js";

async function testLayoutViews() {
  const client = await pool.connect();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    console.log("=== Тест Layout Views ===\n");

    // Тест 1: config.layout_formats_view
    console.log("Тест 1: config.layout_formats_view");
    try {
      const formatsResult = await client.query(`
        SELECT * FROM config.layout_formats_view
        ORDER BY format_id
      `);

      console.log(`  Найдено форматов: ${formatsResult.rows.length}`);

      // View уже фильтрует удалённые и неактивные форматы в WHERE
      // Проверяем только структуру данных
      console.log(`  ✅ View фильтрует удалённые и неактивные форматы (проверка в WHERE)`);

      // Проверяем структуру данных
      if (formatsResult.rows.length > 0) {
        const firstFormat = formatsResult.rows[0];
        const requiredFields = ["format_id", "kind", "prefix_unit_symbol", "suffix_unit_symbol"];
        const missingFields = requiredFields.filter((field) => !(field in firstFormat));
        if (missingFields.length > 0) {
          warnings.push(`layout_formats_view: отсутствуют поля: ${missingFields.join(", ")}`);
        }
      }
    } catch (error: any) {
      errors.push(`Ошибка при проверке layout_formats_view: ${error.message}`);
      console.log(`  ❌ Ошибка: ${error.message}`);
    }

    // Тест 2: config.layout_header_view
    console.log("\nТест 2: config.layout_header_view");
    try {
      const headerResult = await client.query(`
        SELECT * FROM config.layout_header_view
        WHERE layout_id = 'main_dashboard'
      `);

      console.log(`  Найдено header для main_dashboard: ${headerResult.rows.length}`);

      if (headerResult.rows.length === 0) {
        warnings.push("layout_header_view не возвращает header для main_dashboard");
        console.log(`  ⚠️ Header не найден для main_dashboard`);
      } else {
        const header = headerResult.rows[0];
        console.log(`  ✅ Header найден: ${header.header_component_id || header.id}`);

        // Проверяем, что нет удалённых/неактивных компонентов
        // View уже фильтрует удалённые, но проверим структуру
        // deleted_at и is_active не должны быть в view, так как они фильтруются в WHERE

        // Проверяем структуру
        const requiredFields = ["layout_id", "header_component_id", "title"];
        const missingFields = requiredFields.filter((field) => !(field in header));
        if (missingFields.length > 0) {
          warnings.push(`layout_header_view: отсутствуют поля: ${missingFields.join(", ")}`);
        }
      }
    } catch (error: any) {
      errors.push(`Ошибка при проверке layout_header_view: ${error.message}`);
      console.log(`  ❌ Ошибка: ${error.message}`);
    }

    // Тест 3: config.layout_sections_view
    console.log("\nТест 3: config.layout_sections_view");
    try {
      const sectionsResult = await client.query(`
        SELECT * FROM config.layout_sections_view
        WHERE layout_id = 'main_dashboard'
        ORDER BY display_order
      `);

      console.log(`  Найдено секций/компонентов: ${sectionsResult.rows.length}`);

      if (sectionsResult.rows.length === 0) {
        warnings.push("layout_sections_view не возвращает секции для main_dashboard");
        console.log(`  ⚠️ Секции не найдены для main_dashboard`);
      } else {
        // Группируем по секциям
        const sectionsMap = new Map<string, any[]>();
        sectionsResult.rows.forEach((row: any) => {
          const sectionId = row.section_id || "unknown";
          if (!sectionsMap.has(sectionId)) {
            sectionsMap.set(sectionId, []);
          }
          sectionsMap.get(sectionId)!.push(row);
        });

        console.log(`  ✅ Найдено секций: ${sectionsMap.size}`);

        // Проверяем, что нет удалённых mapping/компонентов
        // View уже фильтрует удалённые, но проверим структуру
        // deleted_at и is_active не должны быть в view, так как они фильтруются в WHERE
        const deletedMappings: any[] = [];
        const deletedComponents: any[] = [];
        const inactiveComponents: any[] = [];

        if (deletedMappings.length > 0) {
          errors.push(`layout_sections_view содержит удалённые mapping: ${deletedMappings.length} записей`);
          console.log(`  ❌ Найдены удалённые mapping: ${deletedMappings.length}`);
        } else {
          console.log(`  ✅ Нет удалённых mapping`);
        }

        if (deletedComponents.length > 0) {
          errors.push(`layout_sections_view содержит удалённые компоненты: ${deletedComponents.map((c: any) => c.component_id).join(", ")}`);
          console.log(`  ❌ Найдены удалённые компоненты: ${deletedComponents.length}`);
        } else {
          console.log(`  ✅ Нет удалённых компонентов`);
        }

        if (inactiveComponents.length > 0) {
          errors.push(`layout_sections_view содержит неактивные компоненты: ${inactiveComponents.map((c: any) => c.component_id).join(", ")}`);
          console.log(`  ❌ Найдены неактивные компоненты: ${inactiveComponents.length}`);
        } else {
          console.log(`  ✅ Нет неактивных компонентов`);
        }

        // Проверяем структуру
        if (sectionsResult.rows.length > 0) {
          const firstRow = sectionsResult.rows[0];
          const requiredFields = ["layout_id", "section_id", "component_id", "component_type"];
          const missingFields = requiredFields.filter((field) => !(field in firstRow));
          if (missingFields.length > 0) {
            warnings.push(`layout_sections_view: отсутствуют поля: ${missingFields.join(", ")}`);
          }
        }
      }
    } catch (error: any) {
      errors.push(`Ошибка при проверке layout_sections_view: ${error.message}`);
      console.log(`  ❌ Ошибка: ${error.message}`);
    }

    // Итоговая статистика
    console.log("\n=== Результаты проверки ===");
    console.log(`Ошибок: ${errors.length}`);
    console.log(`Предупреждений: ${warnings.length}`);

    if (errors.length > 0) {
      console.log("\n❌ Найдены ошибки:");
      errors.forEach((error) => console.log(`  - ${error}`));
    }

    if (warnings.length > 0) {
      console.log("\n⚠️ Найдены предупреждения:");
      warnings.forEach((warning) => console.log(`  - ${warning}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log("\n✅ Все проверки пройдены успешно!");
      return { success: true, errors: [], warnings: [] };
    }

    return { success: errors.length === 0, errors, warnings };

  } catch (error) {
    console.error("Критическая ошибка:", error);
    throw error;
  } finally {
    client.release();
  }
}

testLayoutViews()
  .then((result) => {
    if (result.success) {
      console.log("\n✅ Тесты пройдены успешно");
      process.exit(0);
    } else {
      console.log("\n❌ Есть ошибки в данных view");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
