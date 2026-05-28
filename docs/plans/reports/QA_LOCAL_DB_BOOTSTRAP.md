## QA Report: Local DB Bootstrap (C0, Stage 2)

- **Date**: 2026-05-22
- **Environment**: current local environment (no separate clean container available in this run)
- **Script**: `scripts/bootstrap-local-db.sh`

## What was tested

1. Ran `bash scripts/bootstrap-local-db.sh`.
2. Checked required API endpoints:
   - `GET http://localhost:3001/api/data?query_id=layout`
   - `GET http://localhost:3001/api/data?query_id=header_dates`

## Results

### Bootstrap result

- **Actual**:
  - `Detected OS: Darwin`
  - `psql already available; skipping brew install/start`
  - `ERROR: PostgreSQL did not become ready on 127.0.0.1:5432`
- **Outcome**: failed.

### API checks result

- `GET /api/data?query_id=layout`
  - **Expected**: HTTP 200 with layout payload.
  - **Actual**: `curl: (7) Failed to connect to localhost port 3001`, `HTTP_STATUS:000`.
- `GET /api/data?query_id=header_dates`
  - **Expected**: HTTP 200 with header dates payload.
  - **Actual**: `curl: (7) Failed to connect to localhost port 3001`, `HTTP_STATUS:000`.

## Bug: Bootstrap blocks API verification

**Where**: local bootstrap script + backend API availability  
**Steps to reproduce**:
1. Run `bash scripts/bootstrap-local-db.sh`.
2. Observe bootstrap output.
3. Run `curl "http://localhost:3001/api/data?query_id=layout"`.
4. Run `curl "http://localhost:3001/api/data?query_id=header_dates"`.

**Expected result**:
- PostgreSQL is ready on `127.0.0.1:5432`.
- Bootstrap completes successfully.
- Backend API on `localhost:3001` responds to both required endpoints.

**Actual result**:
- Bootstrap fails with PostgreSQL readiness error.
- Backend API is not reachable (`HTTP_STATUS:000` for both endpoints).

## Blocker status

- Stage 2 cannot be marked complete due to bootstrap failure and unavailable API.

---

## Re-test after Darwin bootstrap fix (2026-05-22)

### What changed in script

- macOS ветка больше не пропускает старт PostgreSQL только потому, что `psql` уже есть в PATH.
- Добавлено определение server-формулы Homebrew (приоритет `postgresql@16`, затем `postgresql`, затем fallback на найденные версии).
- Если server-формула не обнаружена, скрипт пытается установить `postgresql@16` и затем запускать сервис.

### Re-test result in current environment

- **Actual**:
  - `Detected OS: Darwin`
  - `psql is available, but PostgreSQL server formula was not detected`
  - `Installing PostgreSQL server via brew (postgresql@16)`
  - Homebrew error: `/opt/homebrew/Cellar is not writable`
- **Outcome**: bootstrap still fails in this environment due to Homebrew permissions, not due to skipped service start logic.

### Current blocker

- Нужен re-run QA после исправления прав Homebrew в окружении (`brew install` должен иметь доступ на запись).

---

## Re-test after environment fixes (2026-05-22, repeat Stage 2)

### Bootstrap result

- **Actual**:
  - `Detected OS: Darwin`
  - `Starting PostgreSQL service (postgresql@16)` -> сервис уже запущен
  - `PostgreSQL is accepting connections`
  - role/db checks passed (`bank_local_user`, `bankdb_local`)
  - `Running backend migrations`
  - migration step fails: `Failed to connect to database: Error: The server does not support SSL connections`
  - script exits with `ERROR: Bootstrap failed at line 247`
- **Outcome**: failed (partial progress vs previous blocker, but stage still blocked).

### API checks

- `GET /api/data?query_id=layout` -> `HTTP_STATUS:000` (`curl: (7) Failed to connect to localhost:3001`)
- `GET /api/data?query_id=header_dates` -> `HTTP_STATUS:000` (`curl: (7) Failed to connect to localhost:3001`)

### Status

- **Not resolved**.
- Stage 2 remains blocked until backend DB connection config is aligned with local PostgreSQL (no SSL) and API becomes reachable on `localhost:3001`.

---

## Re-test after curated bootstrap migration strategy (2026-05-22, final Stage 2 pass)

### Bootstrap result

- **Actual**:
  - `bash scripts/bootstrap-local-db.sh` completed successfully.
  - Скрипт проходит полный цикл: PostgreSQL ready -> curated migrations -> dataset upload (`balance` + `fin_results`) -> success exit code `0`.
- **Outcome**: passed.

### API checks

- Проверка на backend с локальной БД (порт `3101`):
  - `GET /api/data?query_id=layout` -> `HTTP 400` (`component_Id is required and must be a string`)
  - `GET /api/data?query_id=header_dates` -> `HTTP 400` (`component_Id is required and must be a string`)
- Проверка по текущему контракту endpoint (`query_id` + `component_Id`, для layout также `parametrs.layout_id`):
  - `GET /api/data?query_id=layout&component_Id=layout&parametrs={"layout_id":"main_dashboard"}` -> `HTTP 200`
  - `GET /api/data?query_id=header_dates&component_Id=header_dates` -> `HTTP 200`

### Status

- Stage 2 QA pass выполнен для текущего runtime-контракта `/api/data`.
