import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Client, type ClientConfig } from "pg";
import { BOOTSTRAP_CURATED_MIGRATIONS } from "./bootstrapCuratedMigrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKEND_DIR = join(__dirname, "../..");
const MIGRATION_DIR = join(BACKEND_DIR, "src/migrations");

export const DB_HOST = process.env.DB_HOST ?? "127.0.0.1";
export const DB_PORT = Number(process.env.DB_PORT ?? "5432");
export const DB_NAME = process.env.DB_NAME ?? "bankdb_local";
export const DB_USER = process.env.DB_USER ?? "bank_local_user";
export const DB_PASSWORD = process.env.DB_PASSWORD ?? "bank_local_password";
export const DB_ADMIN_USER =
  process.env.DB_ADMIN_USER ?? process.env.DB_USER ?? "postgres";
export const DB_ADMIN_PASSWORD =
  process.env.DB_ADMIN_PASSWORD ?? process.env.DB_PASSWORD ?? "";

export const SCHEMA_MIGRATIONS_DDL = `
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

export type LogFn = (message: string) => void;

export interface MigrationRunResult {
  applied: number;
  skipped: number;
}

export function createClientConfig(
  user: string = DB_USER,
  password: string = DB_PASSWORD,
  database: string = DB_NAME
): ClientConfig {
  return {
    host: DB_HOST,
    port: DB_PORT,
    database,
    user,
    password,
  };
}

export async function withClient<T>(
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

function defaultLog(message: string): void {
  console.log(`[db:migrate] ${message}`);
}

export async function ensureSchemaMigrationsTable(client: Client): Promise<void> {
  await client.query(SCHEMA_MIGRATIONS_DDL);
}

export async function getAppliedMigrations(client: Client): Promise<Set<string>> {
  const result = await client.query<{ filename: string }>(
    "SELECT filename FROM public.schema_migrations"
  );
  return new Set(result.rows.map((row) => row.filename));
}

export async function applyCompatibilityFix021(client: Client, log: LogFn): Promise<void> {
  log("Applying compatibility fix for layout_component_mapping schema");
  await client.query(`
    ALTER TABLE config.layout_component_mapping
      ADD COLUMN IF NOT EXISTS parent_component_id VARCHAR(200);
    ALTER TABLE config.layout_component_mapping
      ALTER COLUMN instance_id DROP NOT NULL;
  `);
}

export async function applyCompatibilityFix028(client: Client, log: LogFn): Promise<void> {
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

export async function applyCompatibilityFix051(client: Client, log: LogFn): Promise<void> {
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

export async function applyCompatibilityFixBeforeMigration(
  client: Client,
  migrationFile: string,
  log: LogFn = defaultLog
): Promise<void> {
  if (migrationFile === "021_add_header_component.sql") {
    await applyCompatibilityFix021(client, log);
  }
  if (migrationFile === "028_add_fin_results_to_dashboard.sql") {
    await applyCompatibilityFix028(client, log);
  }
  if (migrationFile === "051_create_kpi_cards.sql") {
    await applyCompatibilityFix051(client, log);
  }
}

export async function applyLocalSchemaOverrides(
  client: Client,
  log: LogFn = defaultLog
): Promise<void> {
  log("Applying local schema overrides for upload datasets");
  await client.query(`
    ALTER TABLE stg.fin_results_upload ALTER COLUMN data_source TYPE VARCHAR(255);
    ALTER TABLE ods.fin_results ALTER COLUMN data_source TYPE VARCHAR(255);
  `);
}

export async function dropManagedSchemas(client: Client, log: LogFn = defaultLog): Promise<void> {
  log("Resetting managed schemas for deterministic reset");
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
  await client.query("DROP TABLE IF EXISTS public.schema_migrations");
}

export async function applySingleMigration(
  client: Client,
  migrationFile: string,
  migrationSql?: string,
  log: LogFn = defaultLog
): Promise<void> {
  const sql =
    migrationSql ??
    (await readFile(join(MIGRATION_DIR, migrationFile), "utf-8"));

  await client.query("BEGIN");
  try {
    await applyCompatibilityFixBeforeMigration(client, migrationFile, log);
    await client.query(sql);
    await client.query(
      "INSERT INTO public.schema_migrations (filename) VALUES ($1)",
      [migrationFile]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export function validateCuratedMigrationFiles(): void {
  for (const migrationFile of BOOTSTRAP_CURATED_MIGRATIONS) {
    const migrationPath = join(MIGRATION_DIR, migrationFile);
    if (!existsSync(migrationPath)) {
      throw new Error(`Missing required curated migration: ${migrationFile}`);
    }
  }
}

export async function runCuratedMigrations(options: {
  clientConfig?: ClientConfig;
  log?: LogFn;
  applySchemaOverrides?: boolean;
} = {}): Promise<MigrationRunResult> {
  const log = options.log ?? defaultLog;
  const clientConfig = options.clientConfig ?? createClientConfig();
  const applySchemaOverrides = options.applySchemaOverrides ?? true;

  validateCuratedMigrationFiles();

  return withClient(clientConfig, async (client) => {
    await ensureSchemaMigrationsTable(client);
    const appliedMigrations = await getAppliedMigrations(client);

    let applied = 0;
    let skipped = 0;

    for (const migrationFile of BOOTSTRAP_CURATED_MIGRATIONS) {
      if (appliedMigrations.has(migrationFile)) {
        skipped += 1;
        log(`Skipping already applied: ${migrationFile}`);
        continue;
      }

      log(`Applying migration: ${migrationFile}`);
      await applySingleMigration(client, migrationFile, undefined, log);
      applied += 1;
    }

    if (applySchemaOverrides && applied > 0) {
      await applyLocalSchemaOverrides(client, log);
    }

    log(`Migrations complete: ${applied} applied, ${skipped} skipped`);
    return { applied, skipped };
  });
}

async function main(): Promise<void> {
  const result = await runCuratedMigrations();
  if (result.applied === 0) {
    console.log("[db:migrate] No new migrations to apply");
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error("[db:migrate] ERROR:", error);
    process.exit(1);
  });
}
