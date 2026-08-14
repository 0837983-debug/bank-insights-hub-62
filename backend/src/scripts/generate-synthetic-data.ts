/**
 * Синтетический генератор тестовых данных для замеров производительности.
 *
 * Генерирует ~10 млн строк в ODS-таблицы (ods.balance, ods.fin_results)
 * тестовой базы данных за заданное число лет (по месяцам). Данные пишутся
 * напрямую в ODS через PostgreSQL COPY — самый быстрый способ массовой
 * загрузки. Запись ведётся побатчно (по одному месяцу за раз), чтобы не
 * перегружать память и корректно измерять скорость.
 *
 * Назначение: получить базовые замеры скорости загрузки ДО внедрения
 * системы гибких периодов.
 *
 * Запуск (из каталога backend/):
 *   npx tsx src/scripts/generate-synthetic-data.ts
 */
import { Client } from "pg";
import { createRequire } from "node:module";

// pg-copy-streams — CommonJS-модуль, импортируем через require для совместимости.
const require = createRequire(import.meta.url);
const copyStreams = require("pg-copy-streams") as { from: (sql: string) => NodeJS.WritableStream };
const copyFrom = copyStreams.from;

// Параметры подключения к тестовой базе (порт смещён на 5436).
const TEST_DB_PORT = Number(process.env.TEST_DB_PORT ?? "5436");
const DB_USER = process.env.TEST_DB_USER ?? "bank_test_user";
const DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? "bank_test_password";
const DB_NAME = process.env.TEST_DB_NAME ?? "bankdb_test";
const DB_HOST = process.env.TEST_DB_HOST ?? "127.0.0.1";

// Параметры генерации.
const YEARS = Number(process.env.SYNTH_YEARS ?? "3"); // глубина истории в годах
const TARGET_ROWS = Number(process.env.SYNTH_ROWS ?? "10000000"); // целевое число строк balance

// Классификаторы для баланса.
const CLASSES = ["Активы", "Пассивы", "Капитал"];
const SECTIONS = ["Денежные средства", "Кредиты", "Ценные бумаги", "Депозиты"];
const ITEMS_PER_SECTION = 20;
const FIN_CATEGORIES = ["Операционный доход", "Операционные расходы", "Резервы"];

/** Возвращает список первых чисел месяцев за диапазон лет. */
function buildMonthlyDates(years: number): Date[] {
  const dates: Date[] = [];
  const end = new Date();
  const startYear = end.getFullYear() - years + 1;
  for (let year = startYear; year <= end.getFullYear(); year++) {
    const maxMonth = year === end.getFullYear() ? end.getMonth() + 1 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      dates.push(new Date(Date.UTC(year, month - 1, 1)));
    }
  }
  return dates;
}

/** Вычисляет число подстатей на месяц для достижения целевого объёма. */
function subItemsPerMonth(totalMonths: number): number {
  const perMonth = Math.ceil(TARGET_ROWS / totalMonths);
  const base = CLASSES.length * SECTIONS.length * ITEMS_PER_SECTION;
  return Math.max(1, Math.ceil(perMonth / base));
}

/** Возвращает массив CSV-строк balance для одного месяца. */
function balanceRowsForMonth(iso: string, subPerMonth: number): string[] {
  const rows: string[] = [];
  for (const cls of CLASSES) {
    for (const section of SECTIONS) {
      for (let itemIdx = 0; itemIdx < ITEMS_PER_SECTION; itemIdx++) {
        const item = `${section} ${itemIdx + 1}`;
        for (let subIdx = 0; subIdx < subPerMonth; subIdx++) {
          const value = (Math.random() * 1_000_000).toFixed(2);
          rows.push(
            `${iso},${csvEscape(cls)},${csvEscape(section)},${csvEscape(item)},Статья ${subIdx + 1},${value},1`
          );
        }
      }
    }
  }
  return rows;
}

/** Возвращает массив CSV-строк fin_results для одного месяца. */
function finRowsForMonth(iso: string, totalMonths: number): string[] {
  const rows: string[] = [];
  const perMonth = Math.ceil(TARGET_ROWS / totalMonths / 2);
  const itemsCount = Math.max(1, Math.ceil(perMonth / FIN_CATEGORIES.length));
  for (const category of FIN_CATEGORIES) {
    for (let i = 0; i < itemsCount; i++) {
      const value = (Math.random() * 500_000 - 100_000).toFixed(2);
      rows.push(
        `${iso},Финансовые результаты,${csvEscape(category)},Строка ${i + 1},,Физлица,RUB,синтетика,${value},1`
      );
    }
  }
  return rows;
}

/** Экранирует значение для CSV. */
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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

  // Записываем CSV в поток COPY и дожидаемся завершения.
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

/** Главная функция: генерирует данные и замеряет время. */
async function main(): Promise<void> {
  const client = new Client({
    host: DB_HOST,
    port: TEST_DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();

  const dates = buildMonthlyDates(YEARS);
  const subPerMonth = subItemsPerMonth(dates.length);
  const balanceTotal =
    CLASSES.length * SECTIONS.length * ITEMS_PER_SECTION * subPerMonth * dates.length;
  const finTotal =
    FIN_CATEGORIES.length *
    Math.max(1, Math.ceil(TARGET_ROWS / dates.length / 2 / FIN_CATEGORIES.length)) *
    dates.length;

  console.log(`Генерация за ${YEARS} год(а): ${dates.length} месяцев.`);
  console.log(`  balance: ~${balanceTotal} строк (${subPerMonth} подстатей/месяц)`);
  console.log(`  fin_results: ~${finTotal} строк`);

  // Очищаем ODS перед загрузкой.
  console.log("Очистка ODS...");
  await client.query("DELETE FROM ods.balance WHERE upload_id = 1");
  await client.query("DELETE FROM ods.fin_results WHERE upload_id = 1");

  // Замер времени загрузки по месяцам.
  const loadStart = Date.now();
  let totalBalance = 0;
  let totalFin = 0;

  for (let m = 0; m < dates.length; m++) {
    const iso = dates[m].toISOString().slice(0, 10);
    const balRows = balanceRowsForMonth(iso, subPerMonth);
    const finRows = finRowsForMonth(iso, dates.length);

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

    if (m % 4 === 0 || m === dates.length - 1) {
      console.log(
        `  месяц ${m + 1}/${dates.length}: balance=${totalBalance}, fin=${totalFin}, прошло ${((Date.now() - loadStart) / 1000).toFixed(0)}с`
      );
    }
  }

  const loadSec = ((Date.now() - loadStart) / 1000).toFixed(1);
  console.log(
    `Загрузка завершена за ${loadSec}с. Всего: balance=${totalBalance}, fin_results=${totalFin}.`
  );

  // Проверка фактического количества строк.
  const balRes = await client.query("SELECT COUNT(*) FROM ods.balance");
  const finRes = await client.query("SELECT COUNT(*) FROM ods.fin_results");
  console.log(
    `Фактически строк: balance=${balRes.rows[0].count}, fin_results=${finRes.rows[0].count}`
  );

  await client.end();
}

// Запускаем, если скрипт вызван напрямую.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Ошибка генерации:", err);
    process.exit(1);
  });
}
