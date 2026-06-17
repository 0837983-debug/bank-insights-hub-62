# QA Report: Docker Bootstrap Full Dashboard (Этап 2)

**Дата**: 2026-06-15  
**План**: `docs/plans/current/DOCKER_BOOTSTRAP_FULL_DASHBOARD.md` — Этап 2  
**Субагент**: qa-agent  
**Предшественник**: `docs/plans/reports/DOCKER_SMOKE_QA_REPORT.md`

## Созданные / изменённые файлы

| Файл | Изменение |
|------|-----------|
| `e2e/docker-smoke.spec.ts` | +3 smoke-кейса (KPI, header_dates p1/p2/p3, layout header); precondition `--profile bootstrap` |
| `e2e/api.integration.spec.ts` | Fix: `layout_id: "main_dashboard"` в params для KPI/table запросов (требование API после миграции 067) |

## Предусловия (выполнены перед прогоном)

```bash
cp .env.docker.example .env
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
```

Bootstrap exit 0: миграции 059–078, 3 balance CSV, verify p1/p2/p3.

## Результаты тестов

### `E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list`

| # | Тест | Результат |
|---|------|-----------|
| 1 | GET /api/health returns ok | ✅ passed |
| 2 | GET /api/data?query_id=layout returns layout sections | ✅ passed |
| 3 | GET /api/data?query_id=layout includes header section | ✅ passed |
| 4 | GET /api/data?query_id=header_dates returns p1, p2, p3 periods | ✅ passed |
| 5 | GET /api/data?query_id=kpis returns valid KPI data | ✅ passed |
| 6 | frontend loads at :8080 | ✅ passed |

**Итого: 6 passed, 0 failed, 0 skipped**

### `E2E_DOCKER_MODE=true npm run test:e2e:api -- --reporter=list`

| Категория | Тест | Результат |
|-----------|------|-----------|
| Health | should return health status | ❌ failed (503 degraded — frontend 403) |
| **KPI** | should fetch all KPIs via /api/data | ✅ passed |
| KPI | old endpoints 404 | ✅ passed |
| **Layout** | should fetch layout structure (formats + header) | ✅ passed |
| **header_dates** | via getHeaderDates in KPI/table tests | ✅ passed (p1/p2/p3) |
| Table Data | should handle table data request | ✅ passed |
| Table Data | should handle table data with groupBy param | ✅ passed |
| Chart / Error / Response | остальные | ✅ passed |
| — | skipped (deprecated endpoints) | 3 skipped |

**Итого: 13 passed, 1 failed, 3 skipped**

### KPI / header_dates / layout (целевые контракты)

| Контракт | Статус | Детали |
|----------|--------|--------|
| KPI `query_id=kpis` — 200, не `invalid config` | ✅ | 6 KPI cards, требует `p1,p2,p3,layout_id` |
| header_dates — p1, p2, p3 (3 разные даты) | ✅ | 2025-02-01, 2025-01-01, 2024-12-01 |
| layout — секция `header` (не только formats) | ✅ | `sections` содержит `id: "header"` |

**Целевой критерий «0 failed по KPI/header/layout»: ✅ выполнен**

## Исправления в тестах

### KPI params: обязателен `layout_id`

API после миграции 067 возвращает `400 invalid params: missing params: p1, p2, p3, layout_id` без `layout_id`.

Исправлено в:
- `e2e/docker-smoke.spec.ts` — KPI smoke
- `e2e/api.integration.spec.ts` — KPI и table data helpers

## Известные ограничения (не блокируют Этап 2)

### Health Check — 503 degraded

**Где**: `GET /api/health`  
**Причина**: backend health probe проверяет frontend; frontend container отвечает **403**  
**Влияние**: `api.integration` Health Check падает; docker-smoke принимает `ok|degraded`  
**Рекомендация**: отдельная задача — health probe в Docker dev или ослабить assertion в `api.integration` для `E2E_DOCKER_MODE`

## Критерии Этапа 2

| Критерий | Статус |
|----------|--------|
| docker-smoke ≥6 passed | ✅ 6/6 |
| test:e2e:api: 0 failed по KPI/header/layout | ✅ |
| QA отчёт создан | ✅ |
| precondition `--profile bootstrap` в комментарии | ✅ |

## Команды для воспроизведения

```bash
E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
E2E_DOCKER_MODE=true npm run test:e2e:api -- --reporter=list
```
