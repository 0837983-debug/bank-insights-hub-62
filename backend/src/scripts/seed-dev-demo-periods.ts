/**
 * Наполнение БД разработки (dev, порт 5433) демонстрационными данными
 * для проверки календаря гибких периодов (1..6 месяцев).
 *
 * Реальные данные dev покрывают только 3 месяца (2024-12..2025-02),
 * поэтому календарь на фронтенде показывает лишь эти месяцы. Данный скрипт
 * добавляет синтетические данные за последующие месяцы, чтобы можно было
 * наглядно проверить выбор любого числа периодов (вплоть до 6).
 *
 * ВАЖНО: синтетика в точности повторяет структуру реальных данных dev —
 * те же class/section/item (английские коды баланса assets/liabilities,
 * investments/loans/deposits) и те же финпоказатели (ЧПД/ЧКД/Резервы/
 * Операционные расходы). Значения — в том же масштабе (баланс в миллиардах,
 * финпоказатели в миллионах) с плавным ростом по месяцам. Это гарантирует,
 * что витрины и графики считаются корректно, а не искажаются лишними
 * категориями.
 *
 * Все демо-строки пишутся с фиксированными upload_id (100/101), отличными
 * от реальных загрузок (1..81), поэтому скрипт удаления
 * (cleanup-dev-demo-periods.ts) может безопасно убрать ТОЛЬКО эти данные,
 * не затрагивая реальные.
 *
 * Запуск (из каталога backend/):
 *   npx tsx src/scripts/seed-dev-demo-periods.ts
 */
import { Client } from "pg";
import { createRequire } from "node:module";

// pg-copy-streams — CommonJS-модуль, импортируем через require для совместимости.
const require = createRequire(import.meta.url);
const copyStreams = require("pg-copy-streams") as {
  from: (sql: string) => NodeJS.WritableStream;
};
const copyFrom = copyStreams.from;

// Параметры подключения к БД разработки (dev, порт смещён на 5433).
const DB_PORT = Number(process.env.DEV_DB_PORT ?? "5433");
const DB_USER = process.env.DEV_DB_USER ?? "bank_local_user";
const DB_PASSWORD = process.env.DEV_DB_PASSWORD ?? "g0ScuyUGMwx8";
const DB_NAME = process.env.DEV_DB_NAME ?? "bankdb_local";
const DB_HOST = process.env.DEV_DB_HOST ?? "127.0.0.1";

// Идентификаторы загрузок для демо-данных (не пересекаются с реальными 1..81).
const DEMO_BALANCE_UPLOAD_ID = 100;
const DEMO_FIN_UPLOAD_ID = 101;

// Начало демо-данных: месяц, следующий за последним реальным (2025-02).
const DEMO_START_MONTH = 3; // март
const DEMO_START_YEAR = 2025;

// Витрины, которые пересчитываются после наполнения/очистки данных.
const VIEWS_TO_REFRESH = [
  "mart.balance",
  "mart.mv_kpi_balance",
  "mart.fin_results",
  "mart.mv_kpi_fin_results",
  "mart.mv_kpi_derived",
];

// Базовые балансовые статьи (реальная структура dev-данных) в рублях.
// value — БАЗОВОЕ значение в период демо-старта; trend — прирост за месяц.
interface BalanceItem {
  class: string;
  section: string;
  item: string;
  baseValue: number;
  trend: number;
}

const BALANCE_ITEMS: BalanceItem[] = [
  // Активы (отрицательные значения в ODS, витрина инвертирует знак).
  {
    class: "assets",
    section: "investments",
    item: "government_bonds",
    baseValue: -3_600_000_000,
    trend: -50_000_000,
  },
  {
    class: "assets",
    section: "loans",
    item: "corporate_loans",
    baseValue: -4_700_000_000,
    trend: -60_000_000,
  },
  {
    class: "assets",
    section: "loans",
    item: "retail_loans",
    baseValue: -5_200_000_000,
    trend: -70_000_000,
  },
  // Пассивы (положительные значения).
  {
    class: "liabilities",
    section: "deposits",
    item: "term_deposits_corpo",
    baseValue: 7_000_000_000,
    trend: 55_000_000,
  },
  {
    class: "liabilities",
    section: "deposits",
    item: "term_deposits_individual",
    baseValue: 4_500_000_000,
    trend: 45_000_000,
  },
];

// Базовые финансовые показатели (реальная структура dev-данных) в рублях.
interface FinItem {
  class: string;
  category: string;
  item: string;
  subitem: string;
  clientType: string | null;
  currencyCode: string;
  dataSource: string;
  baseValue: number;
  trend: number;
}

const FIN_ITEMS: FinItem[] = [
  {
    class: "Операционные расходы",
    category: "Аренда",
    item: "Офисы",
    subitem: "Центральный офис",
    clientType: null,
    currencyCode: "RUB",
    dataSource: "учетные данные",
    baseValue: -5_800_000,
    trend: -200_000,
  },
  {
    class: "Операционные расходы",
    category: "Персонал",
    item: "ФОТ",
    subitem: "Заработная плата",
    clientType: null,
    currencyCode: "RUB",
    dataSource: "учетные данные",
    baseValue: -28_500_000,
    trend: -900_000,
  },
  {
    class: "Резервы",
    category: "Отчисления в резервы",
    item: "Корпоративные кредиты",
    subitem: "РВПС по просрочке",
    clientType: null,
    currencyCode: "RUB",
    dataSource: "управленческая корректировка",
    baseValue: -13_800_000,
    trend: -500_000,
  },
  {
    class: "ЧКД",
    category: "Комиссионный доход",
    item: "РКО",
    subitem: "Обслуживание счетов",
    clientType: null,
    currencyCode: "RUB",
    dataSource: "учетные данные",
    baseValue: 17_500_000,
    trend: 500_000,
  },
  {
    class: "ЧКД",
    category: "Комиссионный доход",
    item: "Переводы",
    subitem: "Валютные переводы",
    clientType: null,
    currencyCode: "USD",
    dataSource: "учетные данные",
    baseValue: 9_800_000,
    trend: 300_000,
  },
  {
    class: "ЧКД",
    category: "Комиссионный расход",
    item: "Эквайринг",
    subitem: "Торговый эквайринг",
    clientType: null,
    currencyCode: "RUB",
    dataSource: "учетные данные",
    baseValue: -4_000_000,
    trend: -150_000,
  },
  {
    class: "ЧПД",
    category: "Процентный доход",
    item: "Кредиты физ.лицам",
    subitem: "Ипотечные кредиты",
    clientType: "Ф",
    currencyCode: "RUB",
    dataSource: "учетные данные",
    baseValue: 95_000_000,
    trend: 3_000_000,
  },
  {
    class: "ЧПД",
    category: "Процентный доход",
    item: "Кредиты юр.лицам",
    subitem: "Корпоративные кредиты",
    clientType: "Ю",
    currencyCode: "RUB",
    dataSource: "учетные данные",
    baseValue: 138_000_000,
    trend: 4_000_000,
  },
  {
    class: "ЧПД",
    category: "Процентный расход",
    item: "Депозиты",
    subitem: "Срочные депозиты физ.лиц",
    clientType: "Ф",
    currencyCode: "RUB",
    dataSource: "учетные данные",
    baseValue: -37_000_000,
    trend: -1_200_000,
  },
  {
    class: "ЧПД",
    category: "Процентный расход",
    item: "Депозиты",
    subitem: "Срочные депозиты юр.лиц",
    clientType: "Ю",
    currencyCode: "RUB",
    dataSource: "учетные данные",
    baseValue: -52_000_000,
    trend: -1_600_000,
  },
];

/** Возвращает список первых чисел месяцев от старта до текущего месяца включительно. */
function buildMonthlyDates(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  for (let year = DEMO_START_YEAR; year <= endYear; year++) {
    const startMonth = year === DEMO_START_YEAR ? DEMO_START_MONTH : 1;
    const lastMonth = year === endYear ? endMonth : 12;
    for (let month = startMonth; month <= lastMonth; month++) {
      dates.push(new Date(Date.UTC(year, month - 1, 1)));
    }
  }
  return dates;
}

/** Экранирует значение для CSV. */
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Возвращает массив CSV-строк balance для одного месяца (индекс monthIdx от 0). */
function balanceRowsForMonth(iso: string, monthIdx: number): string[] {
  const rows: string[] = [];
  for (const item of BALANCE_ITEMS) {
    const value = (item.baseValue + item.trend * monthIdx).toFixed(2);
    rows.push(
      `${iso},${item.class},${item.section},${item.item},,${value},${DEMO_BALANCE_UPLOAD_ID}`
    );
  }
  return rows;
}

/** Возвращает массив CSV-строк fin_results для одного месяца (индекс monthIdx от 0). */
function finRowsForMonth(iso: string, monthIdx: number): string[] {
  const rows: string[] = [];
  for (const item of FIN_ITEMS) {
    const value = (item.baseValue + item.trend * monthIdx).toFixed(4);
    rows.push(
      `${iso},${csvEscape(item.class)},${csvEscape(item.category)},${csvEscape(item.item)},${csvEscape(item.subitem)},${item.clientType ?? ""},${item.currencyCode},${csvEscape(item.dataSource)},${value},${DEMO_FIN_UPLOAD_ID}`
    );
  }
  return rows;
}

/** Загружает массив CSV-строк в таблицу через COPY. */
async function copyRows(
  client: Client,
  table: string,
  columns: string,
  rows: string[]
): Promise<void> {
  if (rows.length === 0) return;
  const copySql = `COPY ${table} (${columns}) FROM STDIN WITH (FORMAT csv)`;
  const ingest = client.query(copyFrom(copySql) as unknown as Parameters<Client["query"]>[0]);
  const csv = rows.join("\n") + "\n";

  await new Promise<void>((resolve, reject) => {
    const writable = ingest as unknown as NodeJS.WritableStream;
    writable.on("error", reject);
    writable.on("finish", resolve);
    writable.write(csv, (err?: Error | null) => {
      if (err) reject(err);
      writable.end();
    });
  });
}

/** Создаёт запись в ing.uploads с указанным id, если её ещё нет. */
async function ensureUpload(
  client: Client,
  id: number,
  kind: "capital" | "fin_results"
): Promise<void> {
  const prefix = kind === "capital" ? "capital" : "fin_results";
  const exists = await client.query("SELECT 1 FROM ing.uploads WHERE id = $1", [id]);
  if (exists.rowCount === 0) {
    const filename = `${prefix}_demo_periods_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    const targetTable = kind === "capital" ? "ods.balance" : "ods.fin_results";
    // Заполняем все NOT NULL-поля, обязательные для таблицы ing.uploads.
    await client.query(
      `INSERT INTO ing.uploads
         (id, filename, original_filename, file_path, file_size, file_type, target_table, status)
       VALUES ($1, $2, $2, $2, $3, $4, $5, $6)`,
      [id, filename, 0, "text/csv", targetTable, "completed"]
    );
    console.log(`  создана загрузка ing.uploads id=${id} (${filename})`);
  }
}

/** Главная функция: наполняет dev-БД демо-данными. */
async function main(): Promise<void> {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();

  const dates = buildMonthlyDates();
  console.log(
    `Демо-данные за ${dates.length} месяцев (${dates[0].toISOString().slice(0, 7)}..${dates[dates.length - 1].toISOString().slice(0, 7)}).`
  );

  // Регистрируем загрузки, чтобы не нарушать FK-ограничения.
  await ensureUpload(client, DEMO_BALANCE_UPLOAD_ID, "capital");
  await ensureUpload(client, DEMO_FIN_UPLOAD_ID, "fin_results");

  // Предварительно чистим демо-данные (идемпотентность при повторном запуске).
  await client.query("DELETE FROM ods.balance WHERE upload_id = $1", [DEMO_BALANCE_UPLOAD_ID]);
  await client.query("DELETE FROM ods.fin_results WHERE upload_id = $1", [DEMO_FIN_UPLOAD_ID]);

  let totalBalance = 0;
  let totalFin = 0;

  for (let idx = 0; idx < dates.length; idx++) {
    const iso = dates[idx].toISOString().slice(0, 10);
    const balRows = balanceRowsForMonth(iso, idx);
    const finRows = finRowsForMonth(iso, idx);

    await copyRows(
      client,
      "ods.balance",
      "period_date,class,section,item,sub_item,value,upload_id",
      balRows
    );
    await copyRows(
      client,
      "ods.fin_results",
      "period_date,class,category,item,subitem,client_type,currency_code,data_source,value,upload_id",
      finRows
    );

    totalBalance += balRows.length;
    totalFin += finRows.length;
  }

  console.log(`Загружено: balance=${totalBalance}, fin_results=${totalFin} строк.`);

  // Пересчитываем витрины, чтобы данные стали видны в интерфейсе.
  console.log("Пересчёт витрин...");
  for (const view of VIEWS_TO_REFRESH) {
    await client.query(`REFRESH MATERIALIZED VIEW ${view}`);
  }
  console.log("Витрины пересчитаны.");

  // Контроль: какие месяцы теперь доступны в витрине KPI.
  const months = await client.query(
    "SELECT DISTINCT to_char(period_date, 'YYYY-MM') AS p FROM mart.v_kpi_all ORDER BY p"
  );
  console.log("Доступные месяцы в mart.v_kpi_all:", months.rows.map((r) => r.p).join(", "));

  // Контроль: итоги по классам за последний демо-месяц (проверка корректности расчёта).
  const lastIso = dates[dates.length - 1].toISOString().slice(0, 10);
  const kpi = await client.query(
    "SELECT kpi_name, value FROM mart.v_kpi_all WHERE to_char(period_date,'YYYY-MM-DD') = $1 AND kpi_name NOT LIKE '%::%' ORDER BY kpi_name",
    [lastIso]
  );
  console.log(`Итоги за ${lastIso} (без секций):`);
  for (const row of kpi.rows) {
    console.log(`  ${row.kpi_name}: ${Number(row.value).toLocaleString("ru-RU")}`);
  }

  await client.end();
  console.log("Готово. Демо-данные добавлены в dev-БД.");
}

// Запускаем, если скрипт вызван напрямую.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Ошибка наполнения:", err);
    process.exit(1);
  });
}
