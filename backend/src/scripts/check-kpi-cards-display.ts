/**
 * Скрипт для проверки отображения KPI карточек на фронтенде
 * Проверяет API и логику отображения без браузера
 */

import { pool } from "../config/database.js";

async function checkKPICardsDisplay() {
  console.log("=== Проверка отображения KPI карточек ===\n");

  const client = await pool.connect();
  try {
    // 1. Проверка данных в API
    console.log("1. Проверка API endpoint:");
    try {
      const response = await fetch(
        "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=" +
        encodeURIComponent(JSON.stringify({
          layout_id: "main_dashboard",
          p1: "2025-12-31",
          p2: "2025-11-30",
          p3: "2024-12-31",
        }))
      );
      
      if (response.ok) {
        const data = await response.json();
        const kpis = Array.isArray(data) ? data : (data.rows || []);
        console.log(`   ✅ API возвращает ${kpis.length} KPI`);
        console.log(`   KPI IDs: ${kpis.map((k: any) => k.id).join(", ")}`);
      } else {
        const error = await response.json();
        console.log(`   ❌ API ошибка: ${error.error || error.message}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Ошибка запроса: ${error.message}`);
    }

    // 2. Проверка компонентов в layout
    console.log("\n2. Проверка компонентов в layout:");
    const layoutQuery = await client.query(`
      SELECT 
        c.id,
        c.id as component_id,
        c.title,
        c.component_type,
        c.is_active,
        c.deleted_at
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.layout_id = 'main_dashboard'
        AND c.component_type = 'card'
        AND lcm.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND c.is_active = TRUE
      ORDER BY c.id
    `);

    console.log(`   Найдено карточек в layout: ${layoutQuery.rows.length}`);
    layoutQuery.rows.forEach((row) => {
      console.log(`   - ${row.component_id} (${row.title})`);
    });

    // 3. Проверка данных в mart.kpi_metrics
    console.log("\n3. Проверка данных в mart.kpi_metrics:");
    const kpiMetricsQuery = await client.query(`
      SELECT DISTINCT component_id
      FROM mart.kpi_metrics
      WHERE period_date IN ('2025-12-31', '2025-11-30', '2024-12-31')
      ORDER BY component_id
    `);

    console.log(`   Найдено компонентов в kpi_metrics: ${kpiMetricsQuery.rows.length}`);
    kpiMetricsQuery.rows.forEach((row) => {
      console.log(`   - ${row.component_id}`);
    });

    // 4. Сравнение: какие карточки должны отображаться
    console.log("\n4. Сравнение компонентов:");
    const layoutComponentIds = layoutQuery.rows.map((r) => r.component_id);
    const metricsComponentIds = kpiMetricsQuery.rows.map((r) => r.component_id);
    
    const shouldDisplay = layoutComponentIds.filter((id) => metricsComponentIds.includes(id));
    const missingInMetrics = layoutComponentIds.filter((id) => !metricsComponentIds.includes(id));
    const missingInLayout = metricsComponentIds.filter((id) => !layoutComponentIds.includes(id));

    console.log(`   ✅ Должны отображаться: ${shouldDisplay.join(", ")}`);
    if (missingInMetrics.length > 0) {
      console.log(`   ⚠️  В layout, но нет данных: ${missingInMetrics.join(", ")}`);
    }
    if (missingInLayout.length > 0) {
      console.log(`   ⚠️  Есть данные, но нет в layout: ${missingInLayout.join(", ")}`);
    }

    // 5. Проверка view kpis_view
    console.log("\n5. Проверка view config.kpis_view:");
    try {
      const viewQuery = await client.query(`
        SELECT DISTINCT component_id
        FROM config.kpis_view
        WHERE layout_id = 'main_dashboard'
        ORDER BY component_id
      `);

      console.log(`   Найдено компонентов в view: ${viewQuery.rows.length}`);
      viewQuery.rows.forEach((row) => {
        console.log(`   - ${row.component_id}`);
      });

      // Сравнение с ожидаемыми
      const viewComponentIds = viewQuery.rows.map((r) => r.component_id);
      const missingInView = shouldDisplay.filter((id) => !viewComponentIds.includes(id));
      
      if (missingInView.length > 0) {
        console.log(`   ❌ Отсутствуют в view: ${missingInView.join(", ")}`);
      } else {
        console.log(`   ✅ Все компоненты присутствуют в view`);
      }
    } catch (error: any) {
      console.log(`   ❌ Ошибка при запросе view: ${error.message}`);
    }

    // 6. Итоговый вывод
    console.log("\n=== Итоги ===");
    console.log(`Ожидается отображение: ${shouldDisplay.length} карточек`);
    console.log(`Компоненты: ${shouldDisplay.join(", ")}`);
    
    if (shouldDisplay.length === 0) {
      console.log("\n❌ ПРОБЛЕМА: Нет карточек для отображения!");
      console.log("   Возможные причины:");
      console.log("   - Компоненты не привязаны к layout");
      console.log("   - Нет данных в mart.kpi_metrics");
      console.log("   - Компоненты неактивны или удалены");
    } else {
      console.log("\n✅ Карточки должны отображаться на фронтенде");
    }

  } finally {
    client.release();
  }
}

checkKPICardsDisplay()
  .then(() => {
    console.log("\n✅ Проверка завершена");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
