/**
 * Хелперы для ДЕСТРУКТИВНЫХ E2E-тестов (e2e/destructive/).
 *
 * Гарантируют ИДЕМПОТЕНТНОСТЬ загрузок: после каждого теста, который загружает
 * данные в БД, вызывается rollback — удаляются ТОЛЬКО записи, созданные этим
 * тестом. Реально загруженные банковские отчёты/данные при этом НЕ затрагиваются.
 */
import type { APIRequestContext } from "@playwright/test";

/** Максимальное число попыток дождаться завершения обработки загрузки. */
const MAX_STATUS_POLLS = 15;
/** Пауза между опросами статуса загрузки (мс). */
const STATUS_POLL_INTERVAL_MS = 1000;

/** Статусы загрузки, при которых обработка завершена (можно откатывать). */
const TERMINAL_STATUSES = ["completed", "failed", "rolled_back"];

/**
 * Откатывает загрузку по её идентификатору.
 * Безопасно вызывает повторно (идемпотентно): если загрузка уже откачена,
 * повторный rollback не приводит к ошибке теста.
 */
export async function rollbackUpload(
  authedRequest: APIRequestContext,
  apiBaseUrl: string,
  uploadId: number
): Promise<void> {
  if (!uploadId || uploadId <= 0) return;

  // Дожидаемся завершения обработки, чтобы rollback прошёл корректно.
  for (let i = 0; i < MAX_STATUS_POLLS; i++) {
    try {
      const res = await authedRequest.get(`${apiBaseUrl}/upload/${uploadId}`);
      if (res.ok()) {
        const data = await res.json();
        const status: string | undefined = data?.status;
        if (status && TERMINAL_STATUSES.includes(status)) break;
      }
    } catch {
      // Ошибка сети/чтения статуса — продолжаем опрос до лимита.
    }
    await new Promise((resolve) => setTimeout(resolve, STATUS_POLL_INTERVAL_MS));
  }

  // Выполняем откат. Если загрузка уже откачена — просто игнорируем статус.
  await authedRequest.post(`${apiBaseUrl}/upload/${uploadId}/rollback`);
}

/** Максимальный id загрузки для таблицы (по списку GET /uploads). */
export async function maxUploadIdForTable(
  authedRequest: APIRequestContext,
  apiBaseUrl: string,
  targetTable: string
): Promise<number> {
  const res = await authedRequest.get(`${apiBaseUrl}/uploads`);
  if (!res.ok()) return 0;
  const data = await res.json();
  const uploads: Array<{ id?: number; targetTable?: string; target_table?: string }> =
    Array.isArray(data) ? data : (data?.uploads ?? []);
  return uploads
    .filter((u) => (u.targetTable ?? u.target_table) === targetTable)
    .reduce((max, u) => (u.id && u.id > max ? u.id : max), 0);
}

/**
 * Откатывает загрузку, созданную во время теста, для заданной таблицы.
 * Идемпотентно: откатывается ТОЛЬКО загрузка с id, появившаяся после maxBeforeId
 * (т.е. созданная текущим тестом). Существующие загрузки/отчёты НЕ затрагиваются.
 */
export async function rollbackNewUploadsAfter(
  authedRequest: APIRequestContext,
  apiBaseUrl: string,
  targetTable: string,
  maxBeforeId: number
): Promise<void> {
  const res = await authedRequest.get(`${apiBaseUrl}/uploads`);
  if (!res.ok()) return;
  const data = await res.json();
  const uploads: Array<{ id?: number; targetTable?: string; target_table?: string }> =
    Array.isArray(data) ? data : (data?.uploads ?? []);
  const candidates = uploads.filter(
    (u) =>
      u.id &&
      u.id > maxBeforeId &&
      (u.targetTable ?? u.target_table) === targetTable
  );
  for (const u of candidates) {
    if (u.id) await rollbackUpload(authedRequest, apiBaseUrl, u.id);
  }
}
