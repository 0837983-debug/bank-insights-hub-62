/**
 * Script to test component_queries table and verify configs
 */

import { pool } from "../config/database.js";

async function testComponentQueries() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка component_queries ===\n");

    // 1. Check if table exists
    console.log("1. Проверка существования таблицы:");
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'config' 
        AND table_name = 'component_queries'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log("   ❌ Таблица config.component_queries не существует!");
      return;
    }
    console.log("   ✅ Таблица config.component_queries существует\n");

    // 2. Check for required configs
    console.log("2. Проверка наличия конфигов:");
    const configsCheck = await client.query(`
      SELECT query_id, component_id, title, is_active, deleted_at
      FROM config.component_queries
      WHERE query_id IN ('header_dates', 'assets_table')
        AND deleted_at IS NULL
      ORDER BY query_id
    `);

    console.log(`   Найдено конфигов: ${configsCheck.rows.length}`);
    
    const requiredConfigs = ['header_dates', 'assets_table'];
    const foundConfigs = configsCheck.rows.map(row => row.query_id);
    
    for (const required of requiredConfigs) {
      if (foundConfigs.includes(required)) {
        const config = configsCheck.rows.find(r => r.query_id === required);
        console.log(`   ✅ ${required}:`);
        console.log(`      - component_id: ${config?.component_id || 'NULL'}`);
        console.log(`      - title: ${config?.title || 'NULL'}`);
        console.log(`      - is_active: ${config?.is_active}`);
      } else {
        console.log(`   ❌ ${required}: НЕ НАЙДЕН`);
      }
    }

    // 3. Check config_json structure
    console.log("\n3. Проверка структуры config_json:");
    for (const queryId of requiredConfigs) {
      if (foundConfigs.includes(queryId)) {
        const configJson = await client.query(`
          SELECT config_json
          FROM config.component_queries
          WHERE query_id = $1
            AND deleted_at IS NULL
        `, [queryId]);

        if (configJson.rows.length > 0) {
          const json = configJson.rows[0].config_json;
          console.log(`   ✅ ${queryId}:`);
          console.log(`      - from: ${json.from?.schema}.${json.from?.table || 'N/A'}`);
          console.log(`      - select items: ${json.select?.length || 0}`);
          console.log(`      - has where: ${!!json.where}`);
          console.log(`      - has groupBy: ${!!json.groupBy}`);
          console.log(`      - has orderBy: ${!!json.orderBy}`);
        }
      }
    }

    // 4. Test SQL generation (if builder is available)
    console.log("\n4. Проверка валидности JSON конфигов:");
    for (const queryId of requiredConfigs) {
      if (foundConfigs.includes(queryId)) {
        const configJson = await client.query(`
          SELECT config_json, wrap_json
          FROM config.component_queries
          WHERE query_id = $1
            AND deleted_at IS NULL
        `, [queryId]);

        if (configJson.rows.length > 0) {
          const json = configJson.rows[0].config_json;
          const wrapJson = configJson.rows[0].wrap_json;
          
          // Basic validation
          const isValid = json && 
                         json.from && 
                         json.select && 
                         Array.isArray(json.select) &&
                         json.select.length > 0 &&
                         json.params !== undefined;

          if (isValid) {
            console.log(`   ✅ ${queryId}: JSON валиден`);
            console.log(`      - wrap_json: ${wrapJson}`);
          } else {
            console.log(`   ❌ ${queryId}: JSON невалиден`);
          }
        }
      }
    }

    // 5. Summary
    console.log("\n=== Итоги ===");
    const allConfigs = await client.query(`
      SELECT COUNT(*) as count
      FROM config.component_queries
      WHERE deleted_at IS NULL
    `);
    
    console.log(`Всего конфигов в таблице: ${allConfigs.rows[0].count}`);
    console.log(`Требуемые конфиги найдены: ${foundConfigs.length === requiredConfigs.length ? '✅' : '❌'}`);

    if (foundConfigs.length === requiredConfigs.length) {
      console.log("\n✅ Все проверки пройдены!");
    } else {
      console.log("\n❌ Некоторые конфиги отсутствуют!");
    }

  } catch (error) {
    console.error("Ошибка при проверке:", error);
    throw error;
  } finally {
    client.release();
  }
}

testComponentQueries()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
