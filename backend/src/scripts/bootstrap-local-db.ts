import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";
import { Client, type ClientConfig } from "pg";
import { BOOTSTRAP_CURATED_MIGRATIONS } from "./bootstrapCuratedMigrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKEND_DIR = join(__dirname, "../..");
const PROJECT_ROOT = join(BACKEND_DIR, "..");
const MIGRATION_DIR = join(BACKEND_DIR, "src/migrations");
const LOG_DIR = join(PROJECT_ROOT, ".tmp");
const BACKEND_BOOTSTRAP_LOG = join(LOG_DIR, "backend-bootstrap.log");

const DB_HOST = process.env.DB_HOST ?? "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT ?? "5432");
const DB_NAME = process.env.DB_NAME ?? "bankdb_local";
const DB_USER = process.env.DB_USER ?? "bank_local_user";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "bank_local_password";
const DB_ADMIN_USER =
  process.env.DB_ADMIN_USER ?? process.env.DB_USER ?? "postgres";
const DB_ADMIN_PASSWORD =
  process.env.DB_ADMIN_PASSWORD ?? process.env.DB_PASSWORD ?? "";
const BOOTSTRAP_PORT = Number(process.env.BOOTSTRAP_PORT ?? "3001");
const BOOTSTRAP_API_URL =
  process.env.BOOTSTRAP_API_URL ?? `http://127.0.0.1:${BOOTSTRAP_PORT}`;

const DATASET_DIR =
  process.env.DATASET_DIR ?? join(PROJECT_ROOT, "test-data/uploads");
const DEFAULT_BALANCE_DATASET_FILES =
  "capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv";
const BALANCE_DATASET_FILES = (
  process.env.BALANCE_DATASET_FILES ?? DEFAULT_BALANCE_DATASET_FILES
)
  .split(",")
  .map((file) => file.trim())
  .filter((file) => file.length > 0);
const DEFAULT_FIN_RESULTS_DATASET_FILES =
  "fin_results_2024-12.csv,fin_results_2025-01.csv,fin_results_2025-02.csv";
const FIN_RESULTS_DATASET_FILES =
  process.env.FIN_RESULTS_DATASET_FILE !== undefined
    ? [process.env.FIN_RESULTS_DATASET_FILE.trim()].filter(
        (file) => file.length > 0
      )
    : (process.env.FIN_RESULTS_DATASET_FILES ?? DEFAULT_FIN_RESULTS_DATASET_FILES)
        .split(",")
        .map((file) => file.trim())
        .filter((file) => file.length > 0);

let backendProcess: ChildProcess | null = null;
let ownsTemporaryBackend = false;

function log(message: string): void {
  console.log(`[bootstrap-local-db] ${message}`);
}

function fail(message: string): never {
  console.error(`[bootstrap-local-db] ERROR: ${message}`);
  process.exit(1);
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function createClientConfig(
  user: string,
  password: string,
  database: string
): ClientConfig {
  return {
    host: DB_HOST,
    port: DB_PORT,
    database,
    user,
    password,
  };
}

async function withClient<T>(
  config: ClientConfig,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function waitForPostgres(): Promise<void> {
  const attempts = 30;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await withClient(
        createClientConfig(DB_ADMIN_USER, DB_ADMIN_PASSWORD, "postgres"),
        async (client) => {
          await client.query("SELECT 1");
        }
      );
      log("PostgreSQL is accepting connections");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  fail(`PostgreSQL did not become ready on ${DB_HOST}:${DB_PORT}`);
}

async function ensureRoleAndDatabase(): Promise<void> {
  const escapedPassword = escapeSqlLiteral(DB_PASSWORD);

  log(`Ensuring role ${DB_USER} exists`);
  await withClient(
    createClientConfig(DB_ADMIN_USER, DB_ADMIN_PASSWORD, "postgres"),
    async (client) => {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
            CREATE ROLE "${DB_USER}" LOGIN PASSWORD '${escapedPassword}';
          ELSE
            ALTER ROLE "${DB_USER}" WITH LOGIN PASSWORD '${escapedPassword}';
          END IF;
        END
        $$;
      `);

      const dbExists = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [DB_NAME]
      );

      if (dbExists.rowCount === 0) {
        log(`Creating database ${DB_NAME}`);
        await client.query(
          `CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}"`
        );
      } else {
        log(`Database ${DB_NAME} already exists`);
      }
    }
  );

  log("Ensuring pgcrypto extension");
  await withClient(
    createClientConfig(DB_ADMIN_USER, DB_ADMIN_PASSWORD, DB_NAME),
    async (client) => {
      await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    }
  );
}

async function applyCompatibilityFix021(client: Client): Promise<void> {
  log("Applying compatibility fix for layout_component_mapping schema");
  await client.query(`
    ALTER TABLE config.layout_component_mapping
      ADD COLUMN IF NOT EXISTS parent_component_id VARCHAR(200);
    ALTER TABLE config.layout_component_mapping
      ALTER COLUMN instance_id DROP NOT NULL;
  `);
}

async function applyCompatibilityFix028(client: Client): Promise<void> {
  log("Seeding default main_dashboard layout for fin_results migration");
  await client.query(`
    INSERT INTO config.layouts (
      id, name, description, status, is_active, is_default, created_by, created_at
    ) VALUES (
      'main_dashboard',
      'Main Dashboard',
      'Bootstrap default layout',
      'published',
      TRUE,
      TRUE,
      'bootstrap',
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO UPDATE SET
      is_active = EXCLUDED.is_active,
      updated_at = CURRENT_TIMESTAMP;
  `);
}

async function applyCompatibilityFix051(client: Client): Promise<void> {
  log("Applying compatibility fix for component_fields constraints");
  await client.query(
    "ALTER TABLE config.component_fields ALTER COLUMN data_type DROP NOT NULL"
  );
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_lcm_layout_component'
      ) THEN
        ALTER TABLE config.layout_component_mapping
          ADD CONSTRAINT uq_lcm_layout_component UNIQUE (layout_id, component_id);
      END IF;
    END
    $$;
  `);
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('config.layout_component_mapping', 'id'),
      COALESCE((SELECT MAX(id) FROM config.layout_component_mapping), 0) + 1,
      false
    );
  `);
}

async function runMigrations(): Promise<void> {
  log("Running curated migration strategy for local bootstrap");

  for (const migrationFile of BOOTSTRAP_CURATED_MIGRATIONS) {
    const migrationPath = join(MIGRATION_DIR, migrationFile);
    if (!existsSync(migrationPath)) {
      fail(`Missing required curated migration: ${migrationFile}`);
    }
  }

  await withClient(
    createClientConfig(DB_USER, DB_PASSWORD, DB_NAME),
    async (client) => {
      log("Resetting managed schemas for deterministic bootstrap");
      await client.query(`
        DROP SCHEMA IF EXISTS sec CASCADE;
        DROP SCHEMA IF EXISTS config CASCADE;
        DROP SCHEMA IF EXISTS dict CASCADE;
        DROP SCHEMA IF EXISTS stg CASCADE;
        DROP SCHEMA IF EXISTS ods CASCADE;
        DROP SCHEMA IF EXISTS mart CASCADE;
        DROP SCHEMA IF EXISTS ing CASCADE;
        DROP SCHEMA IF EXISTS log CASCADE;
      `);

      for (const migrationFile of BOOTSTRAP_CURATED_MIGRATIONS) {
        if (migrationFile === "021_add_header_component.sql") {
          await applyCompatibilityFix021(client);
        }

        if (migrationFile === "028_add_fin_results_to_dashboard.sql") {
          await applyCompatibilityFix028(client);
        }

        if (migrationFile === "051_create_kpi_cards.sql") {
          await applyCompatibilityFix051(client);
        }

        log(`Applying migration: ${migrationFile}`);
        const sql = await readFile(join(MIGRATION_DIR, migrationFile), "utf-8");
        await client.query(sql);
      }

      log("Applying local schema overrides for upload datasets");
      await client.query(`
        ALTER TABLE stg.fin_results_upload ALTER COLUMN data_source TYPE VARCHAR(255);
        ALTER TABLE ods.fin_results ALTER COLUMN data_source TYPE VARCHAR(255);
      `);
    }
  );
}

async function isBackendReady(apiUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/api-docs`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(apiUrl: string): Promise<void> {
  const attempts = 45;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await isBackendReady(apiUrl)) {
      log(`Backend is ready at ${apiUrl}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  fail(
    `Backend did not become ready at ${apiUrl}. See ${BACKEND_BOOTSTRAP_LOG}`
  );
}

async function startTemporaryBackend(): Promise<void> {
  mkdirSync(LOG_DIR, { recursive: true });
  log("Starting temporary backend for upload pipeline");

  const logStream = await import("fs").then((fs) =>
    fs.createWriteStream(BACKEND_BOOTSTRAP_LOG, { flags: "w" })
  );

  backendProcess = spawn("npm", ["run", "dev"], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      DATABASE_URL: "",
      DB_HOST,
      DB_PORT: String(DB_PORT),
      DB_NAME,
      DB_USER,
      DB_PASSWORD,
      FRONTEND_URL: "http://127.0.0.1:65535",
      PORT: String(BOOTSTRAP_PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  ownsTemporaryBackend = true;
  backendProcess.stdout?.pipe(logStream);
  backendProcess.stderr?.pipe(logStream);

  await waitForBackend(`http://127.0.0.1:${BOOTSTRAP_PORT}`);
}

async function ensureBackendForUpload(): Promise<string> {
  if (process.env.BOOTSTRAP_USE_TEMP_BACKEND === "true") {
    await startTemporaryBackend();
    return `http://127.0.0.1:${BOOTSTRAP_PORT}`;
  }

  if (await isBackendReady(BOOTSTRAP_API_URL)) {
    log(`Using existing backend at ${BOOTSTRAP_API_URL}`);
    return BOOTSTRAP_API_URL;
  }

  await startTemporaryBackend();
  return `http://127.0.0.1:${BOOTSTRAP_PORT}`;
}

async function uploadDataset(
  apiUrl: string,
  filePath: string,
  targetTable: string
): Promise<void> {
  if (!existsSync(filePath)) {
    fail(`Dataset file not found: ${filePath}`);
  }

  log(`Uploading ${basename(filePath)} as ${targetTable}`);

  const fileBuffer = await readFile(filePath);
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([fileBuffer]),
    basename(filePath)
  );
  formData.append("targetTable", targetTable);

  const response = await fetch(`${apiUrl}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    fail(
      `Upload for ${targetTable} failed with status ${response.status}. Response: ${body}`
    );
  }

  const payload = (await response.json()) as { status?: string };
  if (payload.status !== "completed") {
    fail(
      `Upload for ${targetTable} did not complete successfully. Response: ${JSON.stringify(payload)}`
    );
  }

  log(`Upload completed for ${targetTable}`);
}

async function uploadBalanceDatasets(apiUrl: string): Promise<void> {
  if (BALANCE_DATASET_FILES.length < 3) {
    fail(
      `At least 3 BALANCE_DATASET_FILES are required to build strict p1/p2/p3 flow (configured: ${BALANCE_DATASET_FILES.length})`
    );
  }

  for (const datasetFile of BALANCE_DATASET_FILES) {
    await uploadDataset(apiUrl, join(DATASET_DIR, datasetFile), "balance");
  }
}

async function uploadFinResultsDatasets(apiUrl: string): Promise<void> {
  for (const datasetFile of FIN_RESULTS_DATASET_FILES) {
    await uploadDataset(apiUrl, join(DATASET_DIR, datasetFile), "fin_results");
  }
}

async function verifyHeaderDatesContract(): Promise<void> {
  const result = await withClient(
    createClientConfig(DB_USER, DB_PASSWORD, DB_NAME),
    async (client) =>
      client.query<{
        p1_date: string | null;
        p2_date: string | null;
        p3_date: string | null;
      }>(`
        WITH flags AS (
          SELECT
            MAX(CASE WHEN is_p1 THEN period_date END) AS p1_date,
            MAX(CASE WHEN is_p2 THEN period_date END) AS p2_date,
            MAX(CASE WHEN is_p3 THEN period_date END) AS p3_date
          FROM mart.v_p_dates
        )
        SELECT p1_date, p2_date, p3_date
        FROM flags
        WHERE p1_date IS NOT NULL
          AND p2_date IS NOT NULL
          AND p3_date IS NOT NULL
          AND p1_date <> p2_date
          AND p1_date <> p3_date
          AND p2_date <> p3_date;
      `)
  );

  if (result.rowCount === 0 || !result.rows[0]) {
    fail(
      "Strict header_dates contract is not satisfied (p1/p2/p3 must exist on different dates)"
    );
  }

  const { p1_date, p2_date, p3_date } = result.rows[0];
  log(`Verified strict header_dates contract: ${p1_date}|${p2_date}|${p3_date}`);
}

async function stopTemporaryBackend(): Promise<void> {
  if (!ownsTemporaryBackend || !backendProcess) {
    return;
  }

  log(`Stopping temporary backend process (${backendProcess.pid ?? "unknown"})`);
  backendProcess.kill();
  await new Promise<void>((resolve) => {
    if (!backendProcess) {
      resolve();
      return;
    }
    backendProcess.once("exit", () => resolve());
    setTimeout(resolve, 5000);
  });
  backendProcess = null;
  ownsTemporaryBackend = false;
}

async function main(): Promise<void> {
  try {
    if (!existsSync(BACKEND_DIR)) {
      fail(`Backend directory not found: ${BACKEND_DIR}`);
    }

    await waitForPostgres();
    await ensureRoleAndDatabase();
    await runMigrations();

    const apiUrl = await ensureBackendForUpload();
    await uploadBalanceDatasets(apiUrl);
    await uploadFinResultsDatasets(apiUrl);
    await verifyHeaderDatesContract();

    log("Bootstrap completed successfully");
    log("Connection settings:");
    log(`  DB_HOST=${DB_HOST}`);
    log(`  DB_PORT=${DB_PORT}`);
    log(`  DB_NAME=${DB_NAME}`);
    log(`  DB_USER=${DB_USER}`);
  } finally {
    await stopTemporaryBackend();
  }
}

main().catch((error: unknown) => {
  console.error("[bootstrap-local-db] ERROR:", error);
  process.exit(1);
});
