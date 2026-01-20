/**
 * Тестовый скрипт для проверки запросов Frontend к /api/data?query_id=layout
 * Имитирует запросы, которые делает Frontend
 */

import { pool } from "../config/database.js";

async function testLayoutFrontendRequest() {
  console.log("=== Тест запросов Frontend к /api/data?query_id=layout ===\n");

  // Тест 1: Пустой parametrs (как может отправлять Frontend при ошибке)
  console.log("Тест 1: Пустой parametrs {}");
  try {
    const paramsJson = JSON.stringify({});
    const url = `http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`  Статус: ${response.status}`);
    console.log(`  Ответ:`, JSON.stringify(data, null, 2));
    
    if (response.status === 400) {
      console.log(`  ✅ Ожидаемая ошибка 400: ${data.error}`);
    } else {
      console.log(`  ⚠️ Неожиданный статус: ${response.status}`);
    }
  } catch (error: any) {
    console.log(`  ❌ Ошибка: ${error.message}`);
  }

  // Тест 2: Правильный parametrs с layout_id
  console.log("\nТест 2: Правильный parametrs с layout_id");
  try {
    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const url = `http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`  Статус: ${response.status}`);
    
    if (response.ok()) {
      console.log(`  ✅ Успешный ответ`);
      console.log(`  Количество секций: ${data.sections?.length || 0}`);
      
      const formatsSection = data.sections?.find((s: any) => s.id === "formats");
      const headerSection = data.sections?.find((s: any) => s.id === "header");
      
      console.log(`  Секция formats: ${formatsSection ? "✅" : "❌"}`);
      console.log(`  Секция header: ${headerSection ? "✅" : "❌"}`);
    } else {
      console.log(`  ❌ Ошибка:`, JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.log(`  ❌ Ошибка: ${error.message}`);
  }

  // Тест 3: Без parametrs вообще
  console.log("\nТест 3: Без parametrs параметра");
  try {
    const url = `http://localhost:3001/api/data?query_id=layout&component_Id=layout`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`  Статус: ${response.status}`);
    console.log(`  Ответ:`, JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.log(`  ❌ Ошибка: ${error.message}`);
  }

  // Тест 4: Проверка конфига layout в БД
  console.log("\nТест 4: Проверка конфига layout в БД");
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT query_id, wrap_json, config_json->'params' as params FROM config.component_queries WHERE query_id = 'layout'"
    );
    
    if (result.rows.length > 0) {
      const config = result.rows[0];
      console.log(`  ✅ Конфиг найден`);
      console.log(`  wrap_json: ${config.wrap_json}`);
      console.log(`  params:`, JSON.stringify(config.params, null, 2));
      
      // Проверяем, требуется ли layout_id
      if (config.params && typeof config.params === 'object' && 'layout_id' in config.params) {
        console.log(`  ✅ layout_id требуется в params`);
        console.log(`  Значение по умолчанию: ${config.params.layout_id}`);
      } else {
        console.log(`  ⚠️ layout_id не найден в params конфига`);
      }
    } else {
      console.log(`  ❌ Конфиг layout не найден в БД`);
    }
  } catch (error: any) {
    console.log(`  ❌ Ошибка БД: ${error.message}`);
  } finally {
    client.release();
  }
}

testLayoutFrontendRequest()
  .then(() => {
    console.log("\n✅ Тесты завершены");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
