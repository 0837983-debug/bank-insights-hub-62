import { pool } from '../config/database';

async function main() {
  const client = await pool.connect();
  try {
    // 1. KPI карточки с data_source_key
    console.log('=== 1. KPI карточки (component_type = card) ===');
    const cards = await client.query(`
      SELECT id, title, data_source_key, query_id
      FROM config.components 
      WHERE component_type = 'card' 
        AND deleted_at IS NULL 
        AND is_active = TRUE
      ORDER BY id
    `);
    console.table(cards.rows);

    // 2. Уникальные KPI names из v_kpi_all (только верхнего уровня без ::)
    console.log('\n=== 2. Основные KPI names (без ::) ===');
    const kpiNames = await client.query(`
      SELECT DISTINCT kpi_name 
      FROM mart.v_kpi_all 
      WHERE kpi_name NOT LIKE '%::%'
      ORDER BY kpi_name
    `);
    kpiNames.rows.forEach((r: { kpi_name: string }) => console.log(`  ${r.kpi_name}`));

    // 3. Проверить v_kpi_all - есть ли component_id
    console.log('\n=== 3. v_kpi_all с component_id ===');
    const kpiWithComponent = await client.query(`
      SELECT kpi_name, component_id, COUNT(*) as cnt
      FROM mart.v_kpi_all 
      WHERE component_id IS NOT NULL
      GROUP BY kpi_name, component_id
      ORDER BY kpi_name
    `);
    if (kpiWithComponent.rows.length === 0) {
      console.log('  Нет записей с component_id (JOIN не работает!)');
    } else {
      console.table(kpiWithComponent.rows);
    }

    // 4. Проверить определение v_kpi_all
    console.log('\n=== 4. Определение mart.v_kpi_all ===');
    const viewDef = await client.query(`
      SELECT pg_get_viewdef('mart.v_kpi_all', true) as definition
    `);
    console.log(viewDef.rows[0].definition);

    // 5. Проверить query config для kpis
    console.log('\n=== 5. Query config для kpis ===');
    const queryConfig = await client.query(`
      SELECT query_id, config_json 
      FROM config.component_queries 
      WHERE query_id = 'kpis'
    `);
    if (queryConfig.rows.length > 0) {
      console.log(JSON.stringify(queryConfig.rows[0].config_json, null, 2));
    } else {
      console.log('  Не найден query_id = kpis');
    }

    // 6. Тестовый запрос к kpis
    console.log('\n=== 6. Тестовый SELECT из v_kpi_all с component_id ===');
    const testQuery = await client.query(`
      SELECT 
        component_id as "componentId",
        kpi_name,
        period_date,
        value
      FROM mart.v_kpi_all
      WHERE component_id IS NOT NULL
      ORDER BY component_id, period_date DESC
      LIMIT 20
    `);
    console.table(testQuery.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
