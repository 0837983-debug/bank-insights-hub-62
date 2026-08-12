import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
  createClientConfig,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
  withClient,
} from "./runCuratedMigrations.js";
import { AUTH } from "../config/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKEND_DIR = join(__dirname, "../..");
const PROJECT_ROOT = join(BACKEND_DIR, "..");
const LOG_DIR = join(PROJECT_ROOT, ".tmp");
const BACKEND_BOOTSTRAP_LOG = join(LOG_DIR, "backend-bootstrap.log");

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
  console.log(`[db:seed] ${message}`);
}

function fail(message: string): never {
  console.error(`[db:seed] ERROR: ${message}`);
  process.exit(1);
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

  fail(`Backend did not become ready at ${apiUrl}. See ${BACKEND_BOOTSTRAP_LOG}`);
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

export async function ensureBackendForUpload(): Promise<string> {
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

/**
 * Выполняет вход супер-администратора и возвращает access-токен.
 * После внедрения авторизации загрузка данных через API требует аутентификации.
 * @param apiUrl - базовый URL API
 * @returns access-токен супер-администратора
 */
async function loginAndGetAccessToken(apiUrl: string): Promise<string> {
  const { username, password } = AUTH.superAdmin;
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    fail(
      `Login for seed failed with status ${response.status}. Response: ${body}`
    );
  }

  const payload = (await response.json()) as { accessToken?: string };
  if (!payload.accessToken) {
    fail("Login for seed did not return an access token.");
  }
  return payload.accessToken;
}

async function uploadDataset(
  apiUrl: string,
  accessToken: string,
  filePath: string,
  targetTable: string
): Promise<void> {
  if (!existsSync(filePath)) {
    fail(`Dataset file not found: ${filePath}`);
  }

  log(`Uploading ${basename(filePath)} as ${targetTable}`);

  const fileBuffer = await readFile(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer]), basename(filePath));
  formData.append("targetTable", targetTable);

  const response = await fetch(`${apiUrl}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
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

  const accessToken = await loginAndGetAccessToken(apiUrl);
  for (const datasetFile of BALANCE_DATASET_FILES) {
    await uploadDataset(apiUrl, accessToken, join(DATASET_DIR, datasetFile), "balance");
  }
}

async function uploadFinResultsDatasets(apiUrl: string): Promise<void> {
  const accessToken = await loginAndGetAccessToken(apiUrl);
  for (const datasetFile of FIN_RESULTS_DATASET_FILES) {
    await uploadDataset(apiUrl, accessToken, join(DATASET_DIR, datasetFile), "fin_results");
  }
}

export async function verifyHeaderDatesContract(): Promise<void> {
  const result = await withClient(
    createClientConfig(),
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

export async function seedLocalDb(): Promise<void> {
  try {
    const apiUrl = await ensureBackendForUpload();
    await uploadBalanceDatasets(apiUrl);
    await uploadFinResultsDatasets(apiUrl);
    await verifyHeaderDatesContract();
    log("Seed completed successfully");
  } finally {
    await stopTemporaryBackend();
  }
}

async function main(): Promise<void> {
  if (!existsSync(BACKEND_DIR)) {
    fail(`Backend directory not found: ${BACKEND_DIR}`);
  }

  await seedLocalDb();
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error("[db:seed] ERROR:", error);
    process.exit(1);
  });
}
