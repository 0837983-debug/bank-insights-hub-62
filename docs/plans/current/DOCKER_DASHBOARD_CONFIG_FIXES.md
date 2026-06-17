# План выполнения: Docker Dashboard Config Fixes

> **Создан**: 2026-06-08  
> **Статус**: ✅ Завершено  
> **Roadmap**: Блок C.0 — [ROADMAP.md](../ROADMAP.md) (после `DOCKER_BOOTSTRAP_FULL_DASHBOARD`)

---

## Контекст

После успешного Docker bootstrap (`DOCKER_BOOTSTRAP_FULL_DASHBOARD`) дашборд частично работает, но остаются **gap'ы в конфигурации БД** (наследие миграций заказчика) и **неполный seed fin_results**.

### Подтверждённые проблемы (Windows / Docker dev)

| # | Симптом | Причина |
|---|---------|---------|
| 1 | Таблица «Баланс»: `wrap_json=false: query must have wrapJson=true` | `table_balance` унаследовал `wrap_json=FALSE` от `assets_table` (019→065), не исправлено в 073/074 |
| 2 | Таблица «ФинРез»: «Колонки не определены в layout» | Миграция 028 создала `fin_results_table`, но **не** добавила `config.component_fields` |
| 3 | KPI fin_results: `value`/`p3Value` = null, `p2Value` заполнен | Bootstrap грузит только `fin_results_2025-01.csv` (один период) |

### Цель

После выполнения плана локальный Docker dev stack показывает:
- рабочую таблицу **Баланс** (`table_balance`)
- рабочую таблицу **ФинРез** (`fin_results_table`) с колонками
- KPI fin_results с данными минимум для p2; опционально для p1/p3 при 3-period seed

**Файлы для изучения перед началом:**
- `docs/context/backend.md`
- `docs/context/database.md`
- `backend/src/migrations/028_add_fin_results_to_dashboard.sql` — query без fields
- `backend/src/migrations/075_add_table_pnl_configs.sql` — эталон `component_fields` для fin_results
- `backend/src/migrations/071_add_table_balance_change_subcolumns.sql` — эталон sub_columns
- `backend/src/scripts/bootstrapCuratedMigrations.ts`
- `backend/src/scripts/bootstrap-local-db.ts`
- `e2e/docker-smoke.spec.ts`

---

## Этап 1: Backend — миграции конфигурации ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:

- [x] Создать `backend/src/migrations/079_fix_dashboard_config_gaps.sql`:
  - **1.1** `UPDATE config.component_queries SET wrap_json = TRUE WHERE query_id = 'table_balance' AND deleted_at IS NULL`
  - **1.2** Выровнять `fin_results_table` query config: переименовать алиасы `ppValue` → `previousValue`, `pyValue` → `ytdValue` (как в `table_pnl` / `table_balance` — один контракт имён)
  - **1.3** Добавить `config.component_fields` для `fin_results_table` — зеркало `075_add_table_pnl_configs.sql`:
    - dimensions: `class`, `category`, `item`, `subitem`
    - measure: `value` (`currency_rub`)
    - calculated sub_columns под `value`: `ppChange`, `ytdChange`, `ppChangeAbsolute`, `ytdChangeAbsolute` с `calculation_config` на `previousValue` / `ytdValue`
  - Использовать `WHERE NOT EXISTS` + `UPDATE` normalize (как в 071/075), idempotent
- [x] Добавить `079_fix_dashboard_config_gaps.sql` в:
  - `backend/src/scripts/bootstrapCuratedMigrations.ts`
  - `scripts/bootstrap-local-db.sh` (curated list, sync comment)
- [x] Обновить `docs/context/database.md` — зафиксировать `wrap_json` для `table_balance`, fields `fin_results_table`
- [x] Обновить `docs/context/backend.md` — кратко описать миграцию 079

### Файлы для изменения:

- `backend/src/migrations/079_fix_dashboard_config_gaps.sql` *(новый)*
- `backend/src/scripts/bootstrapCuratedMigrations.ts`
- `scripts/bootstrap-local-db.sh`
- `docs/context/database.md`
- `docs/context/backend.md`

### Критерии завершения:

- [ ] После bootstrap: `SELECT wrap_json FROM config.component_queries WHERE query_id='table_balance'` → `t`
- [ ] После bootstrap: `SELECT COUNT(*) FROM config.component_fields WHERE component_id='fin_results_table' AND deleted_at IS NULL` ≥ 9
- [ ] После bootstrap: API `GET /api/data?query_id=table_balance&...` возвращает 200 и rows (не ошибку wrap_json)
- [ ] После bootstrap: API layout для `fin_results_table` содержит columns (не пустой массив)
- [x] `cd backend && npm run build` без ошибок

### 📋 Команда для Executor (Task tool):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Migration 079 dashboard config fixes",
  prompt: `
ПЕРЕД НАЧАЛОМ РАБОТЫ:
1. Прочитай контекст: docs/context/backend.md, docs/context/database.md
2. Проверь какие сервисы/файлы используются, а какие deprecated
3. Редактируй ТОЛЬКО файлы указанные в плане

⛔ ЗАПРЕЩЕНО:
- Редактировать сервисы/файлы НЕ указанные в плане
- Оставлять код для backward compatibility
- Добавлять fallback на старые механизмы
- Дублировать расчёты
- Хардкодить значения

Прочитай план: docs/plans/current/DOCKER_DASHBOARD_CONFIG_FIXES.md, раздел "Этап 1".

Выполни все задачи этапа 1:
- Создай backend/src/migrations/079_fix_dashboard_config_gaps.sql (wrap_json + fin_results_table fields + align query aliases)
- Добавь миграцию в bootstrapCuratedMigrations.ts и scripts/bootstrap-local-db.sh
- Обнови docs/context/database.md и docs/context/backend.md
- Проверь: cd backend && npm run build
- Обнови статус этапа 1 в плане на ✅
  `
)
```

---

## Этап 2: Backend — seed fin_results на 3 периода ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] Создать тестовые CSV (на основе `fin_results_2025-01.csv`):
  - `test-data/uploads/fin_results_2024-12.csv` — колонка «Месяц» = `2024-12-01`
  - `test-data/uploads/fin_results_2025-02.csv` — колонка «Месяц» = `2025-02-01`
  - Суммы можно масштабировать (±10–20%) для наглядности сравнения периодов
- [x] Расширить `bootstrap-local-db.ts`:
  - `FIN_RESULTS_DATASET_FILES` (comma-separated), default: `fin_results_2024-12.csv,fin_results_2025-01.csv,fin_results_2025-02.csv`
  - Загружать все файлы в цикле (как `BALANCE_DATASET_FILES`)
  - Сохранить backward compat: если задан старый `FIN_RESULTS_DATASET_FILE` — использовать его как единственный файл (или задокументировать замену в `.env.docker.example`)
- [x] Синхронизировать `scripts/bootstrap-local-db.sh` (env vars + upload loop) если там есть fin_results upload
- [x] Обновить `.env.docker.example` — `FIN_RESULTS_DATASET_FILES=...`
- [x] Обновить `docs/guides/docker.md` — упомянуть 3-period fin_results seed

### Файлы для изменения:

- `test-data/uploads/fin_results_2024-12.csv` *(новый)*
- `test-data/uploads/fin_results_2025-02.csv` *(новый)*
- `backend/src/scripts/bootstrap-local-db.ts`
- `scripts/bootstrap-local-db.sh` *(если содержит fin_results upload)*
- `.env.docker.example`
- `docs/guides/docker.md`

### Критерии завершения:

- [ ] После полного bootstrap: `SELECT DISTINCT period_date FROM mart.fin_results ORDER BY 1` — 3 даты (2024-12-01, 2025-01-01, 2025-02-01)
- [ ] KPI API с p1/p2/p3 возвращает не-null `value` и `p3Value` хотя бы для части fin_results карточек
- [x] `cd backend && npm run build` без ошибок

### 📋 Команда для Executor (Task tool):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "3-period fin_results bootstrap seed",
  prompt: `
ПЕРЕД НАЧАЛОМ РАБОТЫ:
1. Прочитай контекст: docs/context/backend.md
2. Редактируй ТОЛЬКО файлы указанные в плане

⛔ ЗАПРЕЩЕНО:
- Редактировать сервисы/файлы НЕ указанные в плане
- Оставлять backward compatibility костыли без необходимости

Прочитай план: docs/plans/current/DOCKER_DASHBOARD_CONFIG_FIXES.md, раздел "Этап 2".

Выполни все задачи этапа 2 (fin_results CSV + bootstrap multi-file upload).
Проверь: cd backend && npm run build
Обнови статус этапа 2 в плане на ✅
  `
)
```

---

## Этап 3: QA — smoke-тесты дашборда ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] Расширить `e2e/docker-smoke.spec.ts`:
  - **3.1** `GET /api/data?query_id=table_balance` с p1/p2/p3 из header_dates → 200, rows не пустой, нет `wrap_json` error
  - **3.2** `GET /api/data?query_id=layout` → секция fin_results содержит `fin_results_table` с `columns.length > 0`
  - **3.3** `GET /api/data?query_id=fin_results_table` → 200, rows не пустой
  - **3.4** KPI test: хотя бы одна fin_results-карточка имеет non-null `value` (p1) после 3-period seed
- [x] Запустить smoke: `E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list`
- [x] Создать отчёт `docs/plans/reports/DOCKER_DASHBOARD_CONFIG_FIXES_QA.md`

### Файлы для изменения:

- `e2e/docker-smoke.spec.ts`
- `docs/plans/reports/DOCKER_DASHBOARD_CONFIG_FIXES_QA.md` *(новый)*

### Критерии завершения:

- [x] Все тесты в `docker-smoke.spec.ts` проходят с `E2E_DOCKER_MODE=true`
- [x] QA-отчёт создан

### 📋 Команда для Executor (Task tool):

```javascript
Task(
  subagent_type: "qa-agent",
  description: "Docker dashboard config smoke tests",
  prompt: `
Прочитай план: docs/plans/current/DOCKER_DASHBOARD_CONFIG_FIXES.md, раздел "Этап 3: QA".

Расширь e2e/docker-smoke.spec.ts тестами table_balance, fin_results_table, layout columns.
Запусти: E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
Создай отчёт docs/plans/reports/DOCKER_DASHBOARD_CONFIG_FIXES_QA.md
Обнови статус этапа 3 в плане на ✅
  `
)
```

---

## Этап 4: Product Owner Acceptance ✅

**Субагент**: `product-owner-agent`  
**Зависимости**: Этапы 1, 2, 3 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] Открыть `http://localhost:8080` после bootstrap
- [x] Проверить секцию **Баланс**: таблица загружается, нет ошибки wrap_json
- [x] Проверить секцию **Финансовые результаты**: таблица ФинРез с колонками и данными
- [x] Проверить KPI-карточки fin_results: цифры на p1/p2/p3 (не только прочерки)
- [x] Проверить P&L таблицу (table_pnl) — данные отображаются
- [x] Создать `docs/plans/reports/PO_DOCKER_DASHBOARD_CONFIG_FIXES_ACCEPTANCE.md`

### Критерии завершения:

- [x] Вердикт `ACCEPTED`, `CHANGES_REQUESTED` или `BLOCKED` зафиксирован
- [x] При `CHANGES_REQUESTED` — замечания как пользовательские требования

### 📋 Команда для Executor (Task tool):

```javascript
Task(
  subagent_type: "product-owner-agent",
  description: "PO acceptance dashboard config fixes",
  prompt: `
Прочитай план: docs/plans/current/DOCKER_DASHBOARD_CONFIG_FIXES.md, раздел "Этап 4".
Прочитай QA-отчёт: docs/plans/reports/DOCKER_DASHBOARD_CONFIG_FIXES_QA.md
Проведи пользовательскую приемку дашборда на Docker dev stack.
Создай docs/plans/reports/PO_DOCKER_DASHBOARD_CONFIG_FIXES_ACCEPTANCE.md
Обнови статус этапа 4 в плане на ✅
  `
)
```

---

## Финальная проверка (Executor)

После всех этапов:

```bash
# Пересоздать БД с новыми миграциями и seed
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap

# wrap_json
docker exec bank-insights-postgres-dev psql -U bank_local_user -d bankdb_local \
  -c "SELECT query_id, wrap_json FROM config.component_queries WHERE query_id LIKE 'table_balance%';"

# fin_results periods
docker exec bank-insights-postgres-dev psql -U bank_local_user -d bankdb_local \
  -c "SELECT DISTINCT period_date FROM mart.fin_results ORDER BY 1;"

# Smoke
E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-06-15 | 1 | ✅ Завершено | Migration 079: wrap_json table_balance, fin_results_table fields + query aliases |
| 2026-06-15 | 3 | ✅ Завершено | docker-smoke 10/10: table_balance, fin_results_table, layout columns, KPI p1 |
| 2026-06-15 | 4 | ✅ Завершено | PO ACCEPTED: Баланс, ФинРез, KPI p1/p2/p3, table_pnl — UI + API |
