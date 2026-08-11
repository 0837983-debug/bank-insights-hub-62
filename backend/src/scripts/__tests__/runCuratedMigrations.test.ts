import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "pg";
import {
  applySingleMigration,
  ensureSchemaMigrationsTable,
  getAppliedMigrations,
} from "../runCuratedMigrations.js";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(async () => "SELECT 1;"),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
}));

function createMockClient(queryImpl?: (sql: string, params?: unknown[]) => unknown) {
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    if (queryImpl) {
      return queryImpl(sql, params);
    }
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes("CREATE TABLE IF NOT EXISTS public.schema_migrations")) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith("SELECT filename FROM public.schema_migrations")) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith("INSERT INTO public.schema_migrations")) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });

  return { query } as unknown as Client & { query: ReturnType<typeof vi.fn> };
}

describe("runCuratedMigrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates schema_migrations tracking table", async () => {
    const client = createMockClient();

    await ensureSchemaMigrationsTable(client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS public.schema_migrations")
    );
  });

  it("returns applied migration filenames from schema_migrations", async () => {
    const client = createMockClient((sql) => {
      if (sql.startsWith("SELECT filename FROM public.schema_migrations")) {
        return {
          rows: [{ filename: "001_create_schemas.sql" }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const applied = await getAppliedMigrations(client);

    expect(applied).toEqual(new Set(["001_create_schemas.sql"]));
  });

  it("records filename after applying a migration in a transaction", async () => {
    const client = createMockClient();
    const log = vi.fn();

    await applySingleMigration(
      client,
      "081_test_migration.sql",
      "CREATE TABLE test_example(id int);",
      log
    );

    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("CREATE TABLE test_example(id int);");
    expect(client.query).toHaveBeenCalledWith(
      "INSERT INTO public.schema_migrations (filename) VALUES ($1)",
      ["081_test_migration.sql"]
    );
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("rolls back and does not record filename when migration fails", async () => {
    const client = createMockClient((sql) => {
      if (sql === "BEGIN" || sql === "ROLLBACK") {
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith("INSERT INTO public.schema_migrations")) {
        throw new Error("should not insert on failure");
      }
      throw new Error("migration failed");
    });

    await expect(
      applySingleMigration(client, "081_test_migration.sql", "INVALID SQL;", vi.fn())
    ).rejects.toThrow("migration failed");

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith(
      "INSERT INTO public.schema_migrations (filename) VALUES ($1)",
      ["081_test_migration.sql"]
    );
  });
});
