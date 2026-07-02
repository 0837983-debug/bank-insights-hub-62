import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import type { ClientConfig } from "pg";
import {
  createClientConfig,
  DB_ADMIN_PASSWORD,
  DB_ADMIN_USER,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
  dropManagedSchemas,
  runCuratedMigrations,
  withClient,
} from "./runCuratedMigrations.js";
import { seedLocalDb } from "./seed-local-db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKEND_DIR = join(__dirname, "../..");

function log(message: string): void {
  console.log(`[db:reset] ${message}`);
}

function fail(message: string): never {
  console.error(`[db:reset] ERROR: ${message}`);
  process.exit(1);
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function requireDataResetAllowed(): void {
  if (process.env.ALLOW_DATA_RESET !== "true") {
    fail(
      "Refusing to reset database. Set ALLOW_DATA_RESET=true to confirm destructive reset."
    );
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
        await client.query(`CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}"`);
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

async function resetSchemas(clientConfig: ClientConfig): Promise<void> {
  await withClient(clientConfig, async (client) => {
    await dropManagedSchemas(client, log);
  });
}

export async function resetLocalDb(): Promise<void> {
  requireDataResetAllowed();

  if (!existsSync(BACKEND_DIR)) {
    fail(`Backend directory not found: ${BACKEND_DIR}`);
  }

  await waitForPostgres();
  await ensureRoleAndDatabase();

  const clientConfig = createClientConfig();
  await resetSchemas(clientConfig);
  await runCuratedMigrations({ clientConfig, log });
  await seedLocalDb();

  log("Reset completed successfully");
  log("Connection settings:");
  log(`  DB_HOST=${DB_HOST}`);
  log(`  DB_PORT=${DB_PORT}`);
  log(`  DB_NAME=${DB_NAME}`);
  log(`  DB_USER=${DB_USER}`);
}

async function main(): Promise<void> {
  await resetLocalDb();
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error("[db:reset] ERROR:", error);
    process.exit(1);
  });
}
