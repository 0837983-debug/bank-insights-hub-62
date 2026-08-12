/**
 * Тесты загрузчика конфигов запросов (queryLoader).
 *
 * ВАЖНО: доступ к реальной БД здесь замокан. Проект отказывается от подключений
 * к внешним БД в тестах — тесты должны работать без сети и БД.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadQueryConfig } from "../queryLoader.js";
import * as database from "../../../config/database.js";

/** Мокаем пул БД, чтобы тесты не обращались к реальной БД. */
vi.mock("../../../config/database.js", () => ({
  pool: {
    connect: vi.fn(),
  },
}));

/** Упрощённый тип строки, возвращаемой моком пула. */
type QueryRow = { config_json: unknown; wrap_json: boolean };

/** Подготавливает мок-пул, который вернёт переданные строки. */
function mockRows(rows: QueryRow[]) {
  const connect = vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows }),
    release: vi.fn(),
  });
  (database.pool.connect as ReturnType<typeof vi.fn>).mockImplementation(connect);
}

describe("queryLoader.loadQueryConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("возвращает конфиг и wrapJson для найденного query_id", async () => {
    const row: QueryRow = {
      config_json: { from: { schema: "mart", table: "balance" } },
      wrap_json: true,
    };
    mockRows([row]);

    const result = await loadQueryConfig("table_balance");

    expect(result).not.toBeNull();
    expect(result?.config).toHaveProperty("from");
    expect(result?.config.from).toHaveProperty("schema");
    expect(result?.wrapJson).toBe(true);
  });

  it("возвращает null для несуществующего query_id", async () => {
    mockRows([]);

    const result = await loadQueryConfig("non_existent_query_id_12345");

    expect(result).toBeNull();
  });

  it("корректно трактует wrap_json=false", async () => {
    const row: QueryRow = {
      config_json: { from: { schema: "mart", table: "fin_results" } },
      wrap_json: false,
    };
    mockRows([row]);

    const result = await loadQueryConfig("fin_results");

    expect(result).not.toBeNull();
    expect(result?.wrapJson).toBe(false);
  });

  it("выполняет SQL с переданным query_id", async () => {
    const connect = vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    });
    (database.pool.connect as ReturnType<typeof vi.fn>).mockImplementation(connect);

    await loadQueryConfig("some_id");

    const client = await (database.pool.connect as ReturnType<typeof vi.fn>).mock.results[0]
      .value;
    const sql = (client.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const param = (client.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(String(sql)).toContain("query_id = $1");
    expect(param).toEqual(["some_id"]);
  });
});
