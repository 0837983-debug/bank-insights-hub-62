# План выполнения: Инкрементальные миграции (migrate / seed / reset)

> **Создан**: 2026-06-08  
> **Статус**: ✅ Завершено  
> **Roadmap**: Блок C.1 — подготовка к prod  
> **Приоритет**: P1 (после APP_SHELL_NAV)  
> **Зависимости**: Docker bootstrap работает (C.0 ✅)

---

## Контекст

Сейчас `bootstrap-local-db.ts` всегда делает `DROP SCHEMA` + все 79 миграций + seed. Для prod нужно **разделить**:

| Команда | Назначение | Данные mart |
|---------|------------|-------------|
| `db:migrate` | Только **новые** SQL по `schema_migrations` | Не трогает (если миграция не DELETE) |
| `db:seed` | Загрузка тестовых CSV через Upload API | Перезапись по периоду upload |
| `db:reset` | DROP + migrate + seed | Полный снос dev-схем |

**Проблемы сейчас:**
- 4 runner'а: `bootstrap-local-db.ts`, `run-migrations.ts` (устарел ~018), `run-field-type-migrations.ts`, `run-single-migration.ts`
- Нет таблицы учёта применённых миграций

**Единый источник порядка:** `backend/src/scripts/bootstrapCuratedMigrations.ts`

**Файлы для изучения:**
- `backend/src/scripts/bootstrap-local-db.ts`
- `backend/src/scripts/bootstrapCuratedMigrations.ts`
- `scripts/bootstrap-local-db.sh`
- `docker-compose.dev.yml`, `docker-compose.prod.yml`
- `docs/guides/docker.md`, `docs/guides/customer-docker-run.md`
- `docs/context/backend.md`, `docs/context/database.md`

---

## Этап 1: Backend — runner + schema_migrations ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:

- [x] Миграция `080_create_schema_migrations_table.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS public.schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [x] Создать `backend/src/scripts/runCuratedMigrations.ts`:
  - читает `BOOTSTRAP_CURATED_MIGRATIONS`
  - для каждого файла: если нет в `schema_migrations` → выполнить SQL → INSERT
  - compatibility fixes из bootstrap (021, 028, 051) — вынести в общую функцию или вызывать из migrate
  - **без** `DROP SCHEMA`
  - транзакция на файл (rollback при ошибке, не записывать в schema_migrations)
- [x] Рефакторинг `bootstrap-local-db.ts`:
  - `runMigrations()` → вызывает `runCuratedMigrations` **после** DROP (reset path)
  - вынести upload/verify в отдельные функции для seed
- [x] Создать `backend/src/scripts/seed-local-db.ts`:
  - `ensureBackendForUpload()` + upload balance/fin_results + `verifyHeaderDatesContract()`
  - **без** DROP, **без** migrate (предполагает схема уже есть)
- [x] Создать `backend/src/scripts/reset-local-db.ts`:
  - проверка `ALLOW_DATA_RESET=true`
  - DROP SCHEMA → `runCuratedMigrations` → seed
- [x] Обновить `backend/package.json`:
  ```json
  "db:migrate": "tsx src/scripts/runCuratedMigrations.ts",
  "db:seed": "tsx src/scripts/seed-local-db.ts",
  "db:reset": "tsx src/scripts/reset-local-db.ts",
  "bootstrap:local-db": "tsx src/scripts/reset-local-db.ts"
  ```
  (`bootstrap:local-db` — алиас reset для обратной совместимости docker db-bootstrap)
- [x] **Удалить** deprecated runners (не оставлять fallback):
  - `backend/src/scripts/run-migrations.ts`
  - `backend/src/scripts/run-field-type-migrations.ts`
  - обновить `run-single-migration.ts` → пометить dev-only или удалить если не используется
- [x] Unit-тесты: `runCuratedMigrations` — skip applied, apply new, record filename
- [x] Обновить `docs/context/backend.md`, `docs/context/database.md`

### Файлы:

- `backend/src/migrations/080_create_schema_migrations_table.sql` *(новый)*
- `backend/src/scripts/runCuratedMigrations.ts` *(новый)*
- `backend/src/scripts/seed-local-db.ts` *(новый)*
- `backend/src/scripts/reset-local-db.ts` *(новый)*
- `backend/src/scripts/bootstrap-local-db.ts` *(рефакторинг — thin wrapper или удалить в пользу reset)*
- `backend/src/scripts/bootstrapCuratedMigrations.ts` *(добавить 080)*
- `backend/package.json`
- `backend/src/scripts/__tests__/runCuratedMigrations.test.ts` *(новый)*

### Критерии завершения:

- [x] Повторный `npm run db:migrate` — 0 новых миграций, exit 0
- [x] Новая тестовая миграция 081 — применяется один раз
- [x] `ALLOW_DATA_RESET=true npm run db:reset` — DROP + full migrate + seed
- [x] `npm run db:seed` на уже мигрированной БД — upload без DROP
- [x] `cd backend && npm run build && npm test` проходит

---

## Этап 2: Backend — Docker + bash sync ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] `docker-compose.dev.yml` / `prod.yml`: `db-bootstrap` → `npm run db:reset` (или env `BOOTSTRAP_MODE=reset`)
- [x] Добавить compose-сервис или документировать `db-migrate` one-shot для prod:
  ```bash
  docker compose -f docker-compose.prod.yml run --rm db-migrate
  ```
- [x] Синхронизировать `scripts/bootstrap-local-db.sh` с новыми npm scripts
- [x] Обновить `bootstrapCuratedMigrations.ts` + bash curated list (+080)
- [x] Обновить `docs/guides/docker.md`, `docs/guides/customer-docker-run.md`

### Критерии завершения:

- [x] Docker bootstrap по-прежнему поднимает полный дашборд
- [x] Документация описывает migrate/seed/reset отдельно

---

## Этап 3: QA ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] E2E/smoke: после `db:reset` в Docker — dashboard OK (расширить docker-smoke или отдельный script test)
- [x] Сценарий: `db:migrate` дважды — второй раз без ошибок
- [x] Отчёт `docs/plans/reports/DB_MIGRATE_INCREMENTAL_QA.md`

---

## Этап 4: Product Owner Acceptance ✅

**Субагент**: `product-owner-agent`  
**Зависимости**: Этап 3 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] Подтвердить: dev reset не сломал дашборд; документация понятна заказчику
- [x] `docs/plans/reports/PO_DB_MIGRATE_INCREMENTAL_ACCEPTANCE.md`

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-06-30 | Этап 4 | ✅ Завершено | PO ACCEPTED: bootstrap OK, дашборд после reset, docs понятны заказчику |
| 2026-06-30 | Этап 3 | ✅ Завершено | docker-smoke db:reset test, migrate×2 idempotent, QA report |
| 2026-06-30 | Этап 2 | ✅ Завершено | Docker db:reset/db-migrate, bash → npm, docs |
| 2026-06-30 | Этап 1 | ✅ Завершено | runCuratedMigrations, schema_migrations 080, db:migrate/seed/reset |
| 2026-06-08 | — | План создан | Разделение bootstrap |
