/**
 * Script to verify MART data and compare with expected format
 */

import { pool } from "../config/database.js";

async function verifyMartData() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка данных в MART ===\n");

    // 1. Check KPI metrics
    console.log("1. KPI Metrics (mart.kpi_metrics):");
    const kpiResult = await client.query(`
      SELECT 
        component_id,
        period_date,
        value,
        COUNT(*) as count
      FROM mart.kpi_metrics
      GROUP BY component_id, period_date, value
      ORDER BY period_date DESC, component_id
      LIMIT 20
    `);
    console.log(`   Найдено записей: ${kpiResult.rows.length}`);
    if (kpiResult.rows.length > 0) {
      console.log("   Примеры:");
      kpiResult.rows.slice(0, 5).forEach((row) => {
        console.log(`   - ${row.component_id}: ${row.value} (${row.period_date})`);
      });
    } else {
      console.log("   ⚠️  Данных нет! Загрузите данные через миграцию 011_insert_test_data_mart.sql");
    }

    // 2. Check Financial Results
    console.log("\n2. Financial Results (mart.financial_results):");
    const frResult = await client.query(`
      SELECT 
        report_class,
        COUNT(DISTINCT row_code) as unique_rows,
        COUNT(*) as total_records,
        MIN(period_date) as min_date,
        MAX(period_date) as max_date
      FROM mart.financial_results
      GROUP BY report_class
    `);
    console.log(`   Найдено классов: ${frResult.rows.length}`);
    frResult.rows.forEach((row) => {
      console.log(`   - ${row.report_class}: ${row.unique_rows} уникальных строк, ${row.total_records} записей`);
      console.log(`     Период: ${row.min_date} - ${row.max_date}`);
    });

    // 3. Check Balance
    console.log("\n3. Balance (mart.balance):");
    const balanceResult = await client.query(`
      SELECT 
        balance_class,
        COUNT(DISTINCT row_code) as unique_rows,
        COUNT(*) as total_records,
        MIN(period_date) as min_date,
        MAX(period_date) as max_date
      FROM mart.balance
      GROUP BY balance_class
    `);
    console.log(`   Найдено классов: ${balanceResult.rows.length}`);
    balanceResult.rows.forEach((row) => {
      console.log(`   - ${row.balance_class}: ${row.unique_rows} уникальных строк, ${row.total_records} записей`);
      console.log(`     Период: ${row.min_date} - ${row.max_date}`);
    });

    // 4. Check config.components for KPI cards
    console.log("\n4. Config Components (config.components - KPI cards):");
    const componentsResult = await client.query(`
      SELECT 
        id,
        data_source_key,
        title,
        category
      FROM config.components
      WHERE component_type = 'card'
        AND is_active = TRUE
        AND deleted_at IS NULL
      ORDER BY id
    `);
    console.log(`   Найдено компонентов: ${componentsResult.rows.length}`);
    if (componentsResult.rows.length > 0) {
      console.log("   Примеры:");
      componentsResult.rows.slice(0, 5).forEach((row) => {
        console.log(`   - ${row.id}: dataSourceKey="${row.data_source_key || row.id}", category="${row.category}"`);
      });
    }

    // 5. Verify data consistency
    console.log("\n5. Проверка соответствия данных:");
    
    // Check if component_ids in kpi_metrics match config.components
    const kpiComponents = await client.query(`
      SELECT DISTINCT km.component_id
      FROM mart.kpi_metrics km
      LEFT JOIN config.components c ON km.component_id = c.id
      WHERE c.id IS NULL
      LIMIT 10
    `);
    if (kpiComponents.rows.length > 0) {
      console.log(`   ⚠️  Найдено ${kpiComponents.rows.length} component_id в kpi_metrics без соответствия в config.components:`);
      kpiComponents.rows.forEach((row) => {
        console.log(`   - ${row.component_id}`);
      });
    } else {
      console.log("   ✓ Все component_id из kpi_metrics имеют соответствие в config.components");
    }

    // Check latest period
    const latestKpi = await client.query(`
      SELECT MAX(period_date) as latest_date, COUNT(*) as count
      FROM mart.kpi_metrics
    `);
    if (latestKpi.rows[0].latest_date) {
      console.log(`\n   Последний период KPI: ${latestKpi.rows[0].latest_date} (${latestKpi.rows[0].count} записей)`);
    }

    const latestFr = await client.query(`
      SELECT MAX(period_date) as latest_date, COUNT(*) as count
      FROM mart.financial_results
    `);
    if (latestFr.rows[0].latest_date) {
      console.log(`   Последний период Financial Results: ${latestFr.rows[0].latest_date} (${latestFr.rows[0].count} записей)`);
    }

    const latestBalance = await client.query(`
      SELECT MAX(period_date) as latest_date, COUNT(*) as count
      FROM mart.balance
    `);
    if (latestBalance.rows[0].latest_date) {
      console.log(`   Последний период Balance: ${latestBalance.rows[0].latest_date} (${latestBalance.rows[0].count} записей)`);
    }

    console.log("\n=== Проверка завершена ===");
  } catch (error) {
    console.error("Ошибка при проверке данных:", error);
    throw error;
  } finally {
    client.release();
  }
}

verifyMartData()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
