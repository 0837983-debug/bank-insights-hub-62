/**
 * Бенчмарк производительности: пересчёт витрин и чтение данных.
 *
 * Замеряет два ключевых показателя после наполнения ODS синтетическими данными:
 *  1. Время пересчёта материализованных представлений (витрин MART).
 *  2. Время чтения данных за разное число периодов (1, 3, 6, 12) — как это
 *     делает график при выборе даты.
 *
 * Результаты выводятся в консоль и могут быть сохранены для сравнения с
 * будущими замерами после внедрения системы гибких периодов.
 *
 * Запуск (из каталога backend/):
 *   npx tsx src/scripts/benchmark-performance.ts
 */
import { Client } from "pg";

// Параметры подключения к тестовой базе.
const TEST_DB_PORT = Number(process.env.TEST_DB_PORT ?? "5436");
const DB_USER = process.env.TEST_DB_USER ?? "bank_test_user";
const DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? "bank_test_password";
const DB_NAME = process.env.TEST_DB_NAME ?? "bankdb_test";
const DB_HOST = process.env.TEST_DB_HOST ?? "127.0.0.1";

// Список витрин, которые пересчитываются при загрузке данных.
const VIEWS_TO_REFRESH = [
  "mart.balance",
  "mart.mv_kpi_balance",
  "mart.fin_results",
  "mart.mv_kpi_fin_results",
  "mart.mv_kpi_derived",
];

/** Замеряет время выполнения запроса и возвращает результат. */
async function timedQuery(client: Client, label: string, sql: string): Promise<void> {
  const start = Date.now();
  await client.query(sql);
  const sec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  ${label}: ${sec}с`);
}

/** Главная функция бенчмарка. */
async function main(): Promise<void> {
  const client = new Client({
    host: DB_HOST,
    port: TEST_DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();

  // Текущее количество строк в ODS.
  const bal = await client.query("SELECT COUNT(*) FROM ods.balance");
  const fin = await client.query("SELECT COUNT(*) FROM ods.fin_results");
  console.log(`Строк в ODS: balance=${bal.rows[0].count}, fin_results=${fin.rows[0].count}`);

  // ---- Часть 1. Пересчёт витрин (то, что происходит после загрузки файлов) ----
  console.log("\n=== Пересчёт витрин (MART) ===");
  const viewStart = Date.now();
  for (const view of VIEWS_TO_REFRESH) {
    await timedQuery(client, `REFRESH ${view}`, `REFRESH MATERIALIZED VIEW ${view}`);
  }
  console.log(`Итого пересчёт витрин: ${((Date.now() - viewStart) / 1000).toFixed(1)}с`);

  // ---- Часть 2. Чтение данных за разное число периодов ----
  // Определяем доступные даты периодов (последние даты из v_kpi_all).
  // Берём даты как текст в SQL — это исключает сдвиг часовых поясов при конвертации в JS.
  const datesRes = await client.query(
    "SELECT DISTINCT to_char(period_date, 'YYYY-MM-DD') AS d FROM mart.v_kpi_all ORDER BY d DESC"
  );
  const dates: string[] = datesRes.rows.map((r) => r.d as string);
  console.log(
    `\nДоступно дат периодов: ${dates.length} (от ${dates[dates.length - 1]} до ${dates[0]})`
  );

  // Тестовые сценарии: сколько последних периодов читаем.
  const scenarios = [1, 3, 6, 12];
  console.log("\n=== Чтение KPI за N периодов ===");
  for (const n of scenarios) {
    if (n > dates.length) continue;
    const chosen = dates.slice(0, n); // последние n дат
    const inClause = chosen.map((d) => `'${d}'`).join(", ");
    const sql = `SELECT period_date, kpi_name, value FROM mart.v_kpi_all WHERE period_date IN (${inClause}) ORDER BY period_date, kpi_name`;
    const start = Date.now();
    const res = await client.query(sql);
    const sec = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${n} период(ов): ${sec}с, строк=${res.rows.length}`);
  }

  // Тест: чтение детальных строк (как таблица) за 1 и 3 периода.
  console.log("\n=== Чтение детальных данных (таблица) за N периодов ===");
  for (const n of scenarios) {
    if (n > dates.length) continue;
    const chosen = dates.slice(0, n);
    const inClause = chosen.map((d) => `'${d}'`).join(", ");
    const sql = `SELECT * FROM mart.balance WHERE period_date IN (${inClause})`;
    const start = Date.now();
    const res = await client.query(sql);
    const sec = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${n} период(ов): ${sec}с, строк=${res.rows.length}`);
  }

  await client.end();
}

// Запускаем, если скрипт вызван напрямую.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Ошибка бенчмарка:", err);
    process.exit(1);
  });
}
