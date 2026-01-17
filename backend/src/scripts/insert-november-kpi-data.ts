/**
 * Script to insert test KPI data for November
 * Direct INSERT into mart.kpi_metrics (not via migrations)
 */

import { pool } from "../config/database.js";

async function insertNovemberKpiData() {
  const client = await pool.connect();
  try {
    console.log("=== Добавление тестовых данных за ноябрь в mart.kpi_metrics ===\n");

    // Get all active card components from config.components
    const componentsResult = await client.query(`
      SELECT id, title, category
      FROM config.components
      WHERE component_type = 'card'
        AND is_active = TRUE
        AND deleted_at IS NULL
      ORDER BY id
    `);

    if (componentsResult.rows.length === 0) {
      console.log("⚠️  Не найдено активных компонентов типа 'card'");
      return;
    }

    console.log(`Найдено компонентов: ${componentsResult.rows.length}\n`);

    // November 2024 date (2024-11-01)
    const novemberDate = new Date(2024, 10, 1); // Month is 0-indexed, so 10 = November
    const periodDateStr = `${novemberDate.getFullYear()}-${String(novemberDate.getMonth() + 1).padStart(2, '0')}-${String(novemberDate.getDate()).padStart(2, '0')}`;

    console.log(`Период: ${periodDateStr}\n`);

    // Check if data already exists for November
    const existingCheck = await client.query(
      `SELECT COUNT(*) as count 
       FROM mart.kpi_metrics 
       WHERE period_date = $1`,
      [periodDateStr]
    );

    if (parseInt(existingCheck.rows[0].count) > 0) {
      console.log(`⚠️  Данные за ${periodDateStr} уже существуют (${existingCheck.rows[0].count} записей)`);
      console.log("Удалить существующие данные и вставить заново? (y/n)");
      
      // For non-interactive mode, we'll just show a warning
      // In interactive mode, you would read from stdin
      console.log("Для удаления и вставки запустите:");
      console.log(`  DELETE FROM mart.kpi_metrics WHERE period_date = '${periodDateStr}';`);
      return;
    }

    // Get latest period data to use as reference for generating test values
    const latestDataResult = await client.query(`
      SELECT component_id, value
      FROM mart.kpi_metrics
      WHERE period_date = (
        SELECT MAX(period_date) FROM mart.kpi_metrics
      )
    `);

    const latestDataMap = new Map(
      latestDataResult.rows.map(row => [row.component_id, parseFloat(row.value) || 0])
    );

    // Insert data for each component
    let insertedCount = 0;
    const insertPromises = componentsResult.rows.map(async (component) => {
      // Generate test value: use latest value if available, otherwise random value
      const latestValue = latestDataMap.get(component.id) || 0;
      
      // Generate test value: add small random variation (±5%) to latest value, or use base values
      let testValue: number;
      if (latestValue > 0) {
        // Add random variation between -5% and +5%
        const variation = (Math.random() * 0.1 - 0.05); // -0.05 to +0.05
        testValue = latestValue * (1 + variation);
      } else {
        // Generate reasonable test values based on category
        const baseValues: Record<string, number> = {
          'financial': 1000000,
          'risk': 2.5,
          'strategy': 85,
          'technology': 99.5,
          'transaction': 50000,
        };
        const category = component.category?.toLowerCase() || 'financial';
        const baseValue = baseValues[category] || 1000;
        testValue = baseValue * (0.8 + Math.random() * 0.4); // 80% to 120% of base
      }

      // Round to 2 decimal places
      testValue = Math.round(testValue * 100) / 100;

      try {
        await client.query(
          `INSERT INTO mart.kpi_metrics (component_id, period_date, value)
           VALUES ($1, $2, $3)
           ON CONFLICT (component_id, period_date) DO UPDATE SET value = $3`,
          [component.id, periodDateStr, testValue]
        );
        insertedCount++;
        console.log(`✓ ${component.id}: ${testValue} (${component.title || component.id})`);
      } catch (error) {
        console.error(`✗ Ошибка при вставке ${component.id}:`, error);
      }
    });

    await Promise.all(insertPromises);

    console.log(`\n=== Завершено ===`);
    console.log(`Вставлено записей: ${insertedCount}`);
    console.log(`Период: ${periodDateStr}`);
  } catch (error) {
    console.error("Ошибка при добавлении данных:", error);
    throw error;
  } finally {
    client.release();
  }
}

insertNovemberKpiData()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
