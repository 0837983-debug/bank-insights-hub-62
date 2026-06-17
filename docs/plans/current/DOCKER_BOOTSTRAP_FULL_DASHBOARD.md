# План выполнения: Docker bootstrap — полный дашборд (migrations + 3 периода)

> **Создан**: 2026-06-08  
> **Статус**: ✅ Завершён  
> **Roadmap**: Блок C.0 — follow-up после `DOCKER_CROSS_PLATFORM_SETUP`  
> **Предшественник**: `docs/plans/archive/DOCKER_CROSS_PLATFORM_SETUP.md` (или current, если ещё не архивирован)

---

## Контекст

После Docker bootstrap дашборд **неполный**: layout возвращает только `formats`, KPI — `invalid config`, header_dates — только p1, UI — «Нет данных».

**Корневая причина:** `bootstrap-local-db.ts` применяет curated migrations только до `058`, не включает `059–078` (header, kpis query 067, balance section, table_balance и т.д.) и загружает **1** balance-файл вместо **3**.

**Согласованное решение (вариант A — рекомендуемый):**

Расширить **bootstrap** (TS + синхронизировать bash), не портировать `sanitize-and-seed-dev-db.sh` на этом этапе.

| Вариант | Суть | Решение |
|---------|------|---------|
| **A (выбран)** | Один полный bootstrap при первом запуске | Миграции 059–078 + 3 balance CSV + проверка p1/p2/p3 |
| B (отложен) | Портировать sanitize в TS | Отдельный план позже — для «пересев без DROP SCHEMA» |

**Файлы для изучения:**
- `backend/src/scripts/bootstrap-local-db.ts`
- `scripts/bootstrap-local-db.sh` — синхронизировать список миграций
- `scripts/sanitize-and-seed-dev-db.sh` — эталон для 3 balance-файлов и `verify_header_dates_contract`
- `docker-compose.dev.yml` — убрать db-bootstrap из профиля `full`
- `docs/plans/reports/DOCKER_SMOKE_QA_REPORT.md`

**Целевое поведение после плана:**

```bash
cp .env.docker.example .env
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
```

- Layout API: секции header, KPI, balance, fin_results (не только formats)
- KPI API: JSON без `invalid config`
- header_dates: p1, p2, p3 на разных датах
- Frontend: дашборд с данными, не «Нет данных»
- `db-bootstrap` **не** стартует при `up -d`

---

## Этап 1: Bootstrap — migrations 059–078 + 3 balance periods ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:

- [x] Вынести список curated migrations в **один модуль** `backend/src/scripts/bootstrapCuratedMigrations.ts` (export `BOOTSTRAP_CURATED_MIGRATIONS: readonly string[]`)
- [x] Добавить миграции **059–078** в правильном порядке (включая оба `063_*`):
  - `059_update_upload_mappings_allow_negative.sql`
  - `060_update_mart_balance_sign.sql`
  - `061_update_kpi_derived_sign.sql`
  - `062_fix_assets_sign_fallback_and_derived_refresh.sql`
  - `063_add_balance_section_and_balanc_table.sql`
  - `063_fix_assets_table_class_filter.sql`
  - `064_rename_assets_table_component_to_balance_table.sql`
  - `065_rename_balance_table_to_table_balance.sql`
  - `066_bind_header_to_main_dashboard.sql`
  - `067_upsert_kpis_query_config_from_v_kpi_all.sql`
  - `068_add_assets_button_for_table_balance.sql`
  - `069_add_liabilities_button_for_table_balance.sql`
  - `070_remove_class_column_from_balance_filter_buttons.sql`
  - `071_add_table_balance_change_subcolumns.sql`
  - `072_restore_assets_liabilities_query_ids.sql`
  - `073_remove_class_from_table_balance.sql`
  - `074_restore_class_and_cleanup_assets_liabilities.sql`
  - `075_add_table_pnl_configs.sql`
  - `076_bind_table_pnl_to_existing_section.sql`
  - `077_cleanup_legacy_and_add_pnl_cards.sql`
  - `078_move_table_pnl_to_fin_results_section.sql`
- [x] `bootstrap-local-db.ts` импортирует список из `bootstrapCuratedMigrations.ts`
- [x] Заменить одиночный `BALANCE_DATASET_FILE` на **`BALANCE_DATASET_FILES`** (comma-separated), дефолт как в sanitize:
  - `capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv`
  - `FIN_RESULTS_DATASET_FILE=fin_results_2025-01.csv` без изменений
- [x] Загружать balance-файлы **последовательно** через Upload API (как sanitize)
- [x] После upload добавить **`verifyHeaderDatesContract()`** — порт логики из `sanitize-and-seed-dev-db.sh` (p1/p2/p3 в `mart.v_p_dates`, разные даты); при несоответствии — `fail` с понятным сообщением
- [x] Синхронизировать `scripts/bootstrap-local-db.sh` — тот же список миграций и 3 balance-файла (legacy parity)
- [x] Обновить `.env.docker.example`:
  ```env
  BALANCE_DATASET_FILES=capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv
  ```
- [x] Исправить `docker-compose.dev.yml`:
  - `db-bootstrap`: профиль **`bootstrap` only** (убрать из `full` и `debug`)
  - `postgres`: профили `debug`, `full`, **`bootstrap`**
  - `backend`/`frontend`: профиль `full` only
- [x] Обновить комментарии в compose:
  ```bash
  # up -d        → postgres + backend + frontend (без bootstrap)
  # bootstrap    → docker compose --profile bootstrap run --rm db-bootstrap
  ```
- [x] Обновить `docs/context/backend.md`, `docs/context/database.md`

### Файлы для изменения:

- `backend/src/scripts/bootstrapCuratedMigrations.ts` (новый)
- `backend/src/scripts/bootstrap-local-db.ts`
- `scripts/bootstrap-local-db.sh`
- `docker-compose.dev.yml`
- `.env.docker.example`
- `docs/context/backend.md`
- `docs/context/database.md`

### ⛔ ЗАПРЕЩЕНО:

- Редактировать `backend/src/services/`
- Портировать `sanitize-and-seed-dev-db.sh` в TS (отдельный план)
- Удалять bash-скрипты
- Дублировать список миграций в TS и bash без общего модуля (bash — копия с комментарием «sync with bootstrapCuratedMigrations.ts»)

### Критерии завершения:

- [x] `docker compose -f docker-compose.dev.yml up -d` — **не** поднимает `db-bootstrap`
- [x] `docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap` — exit 0
- [x] `curl ... query_id=kpis` — не `invalid config`
- [x] `curl ... query_id=header_dates` — 3 периода (p1, p2, p3)
- [x] `curl ... query_id=layout` — есть секция header (не только formats)
- [x] `SELECT COUNT(*) FROM mart.v_p_dates WHERE is_p1 OR is_p2 OR is_p3` — 3 разные даты

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Full dashboard bootstrap migrations+seed",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай контекст: docs/context/backend.md, docs/context/database.md
    2. Прочитай scripts/sanitize-and-seed-dev-db.sh — эталон для 3 balance и verify p1/p2/p3
    3. Редактируй ТОЛЬКО файлы из плана

    ⛔ ЗАПРЕЩЕНО:
    - Редактировать backend/src/services/
    - Портировать sanitize в TS
    - Удалять bash-скрипты

    Прочитай план: docs/plans/current/DOCKER_BOOTSTRAP_FULL_DASHBOARD.md, Этап 1

    После завершения:
    - docker compose -f docker-compose.dev.yml config
    - Прогон bootstrap на Docker (если доступен)
    - cd backend && npm run build && npm run test
    - Обнови context-файлы и статус этапа → ✅
  `
)
```

---

## Этап 2: QA — усилить smoke + API regression в Docker ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] Расширить `e2e/docker-smoke.spec.ts`:
  - KPI API: `query_id=kpis` — 200, не `{ error: "invalid config" }`
  - header_dates: rows содержат p1, p2, p3 (3 разные `periodDate`)
  - layout: `sections` содержит секцию с `id` или компонентом `header` (не только `formats`)
- [x] Обновить precondition в комментарии: `--profile bootstrap run --rm db-bootstrap`
- [x] Запустить `E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts`
- [x] Запустить `E2E_DOCKER_MODE=true npm run test:e2e:api` — зафиксировать результат в отчёте
- [x] Создать/обновить `docs/plans/reports/DOCKER_BOOTSTRAP_FULL_QA_REPORT.md`

### Файлы для изменения:

- `e2e/docker-smoke.spec.ts`
- `docs/plans/reports/DOCKER_BOOTSTRAP_FULL_QA_REPORT.md` (новый)

### Критерии завершения:

- [x] docker-smoke: **≥6 passed** (или все новые кейсы passed)
- [x] `test:e2e:api` в Docker-режиме: **0 failed** по KPI/header/layout (допустимы skip по env)
- [x] QA отчёт создан

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "qa-agent",
  description: "Strengthen Docker smoke tests",
  prompt: `
    Прочитай план: docs/plans/current/DOCKER_BOOTSTRAP_FULL_DASHBOARD.md, Этап 2
    Усиль e2e/docker-smoke.spec.ts (KPI, header_dates p1/p2/p3, layout header)
    Прогони smoke и test:e2e:api с E2E_DOCKER_MODE=true
    Отчёт: docs/plans/reports/DOCKER_BOOTSTRAP_FULL_QA_REPORT.md
    Статус этапа → ✅
  `
)
```

---

## Этап 3: Документация ✅

**Субагент**: `docs-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] Обновить `docs/guides/docker.md`:
  - Команда bootstrap: `--profile bootstrap run --rm db-bootstrap`
  - `up -d` не запускает bootstrap
  - 3 balance-файла по умолчанию
  - Предупреждение: bootstrap = DROP SCHEMA (деструктивно)
  - Конфликт порта 5432 на Windows → `DB_PORT=5433`
- [x] Обновить `docs/BACKEND_SETUP.md` — те же команды
- [x] `npm run docs:build` — OK

### Файлы для изменения:

- `docs/guides/docker.md`
- `docs/BACKEND_SETUP.md`

### Критерии завершения:

- [x] Инструкция воспроизводима с нуля на Windows
- [x] `npm run docs:build` exit 0

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Update Docker bootstrap docs",
  prompt: `
    Прочитай план: docs/plans/current/DOCKER_BOOTSTRAP_FULL_DASHBOARD.md, Этап 3
    Обнови docs/guides/docker.md и docs/BACKEND_SETUP.md
    npm run docs:build
    Статус этапа → ✅
  `
)
```

---

## Финальная проверка (Executor)

```bash
cp .env.docker.example .env
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps   # db-bootstrap НЕ в списке Up

docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap

curl -s "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=%7B%7D"
curl -s "http://localhost:3001/api/data?query_id=header_dates&component_Id=header_dates&parametrs=%7B%7D"
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D"

E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
```

Открыть `http://localhost:8080` — дашборд с KPI и таблицами.

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-06-08 | — | План создан | Вариант A: расширить bootstrap |
| 2026-06-15 | 1 | ✅ Завершено | Миграции 059–078, 3 balance CSV, verify p1/p2/p3, compose profile bootstrap |
| 2026-06-15 | 2 | ✅ Завершено | docker-smoke 6/6, KPI/header/layout API OK, отчёт DOCKER_BOOTSTRAP_FULL_QA_REPORT |
| 2026-06-15 | 3 | ✅ Завершено | docs/guides/docker.md, BACKEND_SETUP.md — bootstrap profile, 3 balance, DROP SCHEMA warning, DB_PORT Windows |
