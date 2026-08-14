/**
 * Удаление демонстрационных данных из БД разработки (dev, порт 5433),
 * добавленных скриптом seed-dev-demo-periods.ts.
 *
 * Скрипт удаляет ТОЛЬКО строки, помеченные демо-upload_id (100/101),
 * и записи ing.uploads с этими id. Реальные данные (upload_id 1..81)
 * не затрагиваются. После очистки витрины пересчитываются, чтобы
 * интерфейс снова показывал только реальные месяцы.
 *
 * Безопасен для повторного запуска (идемпотентен).
 *
 * Запуск (из каталога backend/):
 *   npx tsx src/scripts/cleanup-dev-demo-periods.ts
 */
import { Client } from "pg";

// Параметры подключения к БД разработки (dev, порт смещён на 5433).
const DB_PORT = Number(process.env.DEV_DB_PORT ?? "5433");
const DB_USER = process.env.DEV_DB_USER ?? "bank_local_user";
const DB_PASSWORD = process.env.DEV_DB_PASSWORD ?? "g0ScuyUGMwx8";
const DB_NAME = process.env.DEV_DB_NAME ?? "bankdb_local";
const DB_HOST = process.env.DEV_DB_HOST ?? "127.0.0.1";

// Демо-upload_id, созданные скриптом наполнения.
const DEMO_BALANCE_UPLOAD_ID = 100;
const DEMO_FIN_UPLOAD_ID = 101;
const DEMO_UPLOAD_IDS = [DEMO_BALANCE_UPLOAD_ID, DEMO_FIN_UPLOAD_ID];

// Витрины, которые пересчитываются после очистки данных.
const VIEWS_TO_REFRESH = [
  "mart.balance",
  "mart.mv_kpi_balance",
  "mart.fin_results",
  "mart.mv_kpi_fin_results",
  "mart.mv_kpi_derived",
];

/** Главная функция: удаляет демо-данные и пересчитывает витрины. */
async function main(): Promise<void> {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();

  // Считаем количество удаляемых строк до очистки (для отчёта).
  const balCount = await client.query(
    "SELECT COUNT(*) AS c FROM ods.balance WHERE upload_id = ANY($1::int[])",
    [DEMO_UPLOAD_IDS]
  );
  const finCount = await client.query(
    "SELECT COUNT(*) AS c FROM ods.fin_results WHERE upload_id = ANY($1::int[])",
    [DEMO_UPLOAD_IDS]
  );

  console.log(
    `Найдено демо-строк: balance=${balCount.rows[0].c}, fin_results=${finCount.rows[0].c}.`
  );

  // Удаляем только демо-строки.
  await client.query("DELETE FROM ods.balance WHERE upload_id = ANY($1::int[])", [DEMO_UPLOAD_IDS]);
  await client.query("DELETE FROM ods.fin_results WHERE upload_id = ANY($1::int[])", [
    DEMO_UPLOAD_IDS,
  ]);

  // Удаляем демо-загрузки из реестра (после удаления связанных строк ODS).
  await client.query("DELETE FROM ing.uploads WHERE id = ANY($1::int[])", [DEMO_UPLOAD_IDS]);

  // Пересчитываем витрины, чтобы интерфейс вернулся к реальным данным.
  console.log("Пересчёт витрин...");
  for (const view of VIEWS_TO_REFRESH) {
    await client.query(`REFRESH MATERIALIZED VIEW ${view}`);
  }
  console.log("Витрины пересчитаны.");

  // Контроль: какие месяцы остались в витрине KPI.
  const months = await client.query(
    "SELECT DISTINCT to_char(period_date, 'YYYY-MM') AS p FROM mart.v_kpi_all ORDER BY p"
  );
  console.log("Оставшиеся месяцы в mart.v_kpi_all:", months.rows.map((r) => r.p).join(", "));

  await client.end();
  console.log("Готово. Демо-данные удалены из dev-БД.");
}

// Запускаем, если скрипт вызван напрямую.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Ошибка очистки:", err);
    process.exit(1);
  });
}
