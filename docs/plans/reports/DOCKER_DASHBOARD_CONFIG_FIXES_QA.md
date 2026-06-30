# QA Report: Docker Dashboard Config Fixes (Этап 3)

**Дата**: 2026-06-15  
**План**: `docs/plans/current/DOCKER_DASHBOARD_CONFIG_FIXES.md` — Этап 3  
**Субагент**: qa-agent  
**Предшественник**: `docs/plans/reports/DOCKER_BOOTSTRAP_FULL_QA_REPORT.md`

## Созданные / изменённые файлы

| Файл | Изменение |
|------|-----------|
| `e2e/docker-smoke.spec.ts` | +4 smoke-кейса (table_balance, layout fin_results columns, fin_results_table, KPI fin_results p1); helper `getHeaderPeriods`, `assertNoWrapJsonError` |

## Предусловия (выполнены перед прогоном)

```bash
cp .env.docker.example .env   # COMPOSE_PROFILES=full
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
```

Bootstrap: миграция 079, 3 fin_results CSV (2024-12, 2025-01, 2025-02), 3 balance CSV.

## Результаты тестов

### `E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list`

| # | Тест | Результат |
|---|------|-----------|
| 1 | GET /api/health returns ok | ✅ passed |
| 2 | GET /api/data?query_id=layout returns layout sections | ✅ passed |
| 3 | GET /api/data?query_id=layout includes header section | ✅ passed |
| 4 | GET /api/data?query_id=header_dates returns p1, p2, p3 periods | ✅ passed |
| 5 | GET /api/data?query_id=kpis returns valid KPI data | ✅ passed |
| 6 | GET /api/data?query_id=table_balance returns rows without wrap_json error | ✅ passed |
| 7 | GET /api/data?query_id=layout includes fin_results_table with columns | ✅ passed |
| 8 | GET /api/data?query_id=fin_results_table returns rows | ✅ passed |
| 9 | GET /api/data?query_id=kpis returns fin_results card with non-null p1 value | ✅ passed |
| 10 | frontend loads at :8080 | ✅ passed |

**Итого: 10 passed, 0 failed, 0 skipped** (8.3s)

## Проверка контрактов (Этап 3)

| Контракт | Статус | Детали |
|----------|--------|--------|
| **3.1** `table_balance` — 200, rows не пустой, нет wrap_json error | ✅ | 5 rows; `wrap_json=true` после миграции 079 |
| **3.2** layout — секция `section_financial_results` содержит `fin_results_table` с `columns.length > 0` | ✅ | 5 колонок (class, category, item, subitem, value + sub_columns) |
| **3.3** `fin_results_table` — 200, rows не пустой | ✅ | 10 rows |
| **3.4** KPI fin_results — хотя бы одна карточка с non-null `value` (p1) | ✅ | 6 карточек в секции; все имеют non-null p1 (напр. `card_nii`: 144000000) |

### Периоды header_dates

| Период | Дата |
|--------|------|
| p1 | 2025-02-01 |
| p2 | 2025-01-01 |
| p3 | 2024-12-01 |

## Критерии Этапа 3

| Критерий | Статус |
|----------|--------|
| Все тесты `docker-smoke.spec.ts` проходят с `E2E_DOCKER_MODE=true` | ✅ 10/10 |
| QA-отчёт создан | ✅ |

## Команда для воспроизведения

```bash
E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
```
