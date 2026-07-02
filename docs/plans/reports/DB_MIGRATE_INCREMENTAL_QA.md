# QA Report: Инкрементальные миграции (Этап 3)

**Дата**: 2026-06-30  
**План**: `docs/plans/current/DB_MIGRATE_INCREMENTAL.md` — Этап 3  
**Субагент**: qa-agent

## Созданные / изменённые файлы

| Файл | Изменение |
|------|-----------|
| `e2e/docker-smoke.spec.ts` | Тест `after db:reset in Docker — dashboard APIs return valid data`; хелперы `runDockerDbReset`, `assertDashboardApisOk` |

## Предусловия

```bash
cp .env.docker.example .env   # COMPOSE_PROFILES=full
docker compose -f docker-compose.dev.yml up -d
```

## 1. E2E: db:reset → dashboard OK

Новый тест запускает `docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap` (`npm run db:reset`) и проверяет:

- `GET /api/health` — backend ok
- `GET /api/data?query_id=layout` — sections > 0
- `GET /api/data?query_id=header_dates` — p1, p2, p3
- `GET /api/data?query_id=kpis` — KPI rows > 0
- `GET /api/data?query_id=table_balance` — rows > 0, без wrap_json
- `GET /api/data?query_id=fin_results_table` — rows > 0, без wrap_json

```bash
E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
```

### Результат

| Тест | Результат | Время |
|------|-----------|-------|
| Весь `docker-smoke.spec.ts` (11 тестов) | **11 passed** | 24.8s |
| `after db:reset in Docker — dashboard APIs return valid data` | **passed** | 21.4s |

## 2. db:migrate дважды — второй раз без ошибок

### Вариант A: через `db-migrate` сервис (документация)

> **Замечание**: `--profile migrate` без `full`/`bootstrap` падает — `postgres` не входит в profile `migrate`. Нужен запущенный postgres (`COMPOSE_PROFILES=full` в `.env`) **или** `--profile migrate --profile full`.

```bash
docker compose -f docker-compose.dev.yml --profile migrate --profile full run --rm db-migrate
docker compose -f docker-compose.dev.yml --profile migrate --profile full run --rm db-migrate
```

| Запуск | exit code | applied | skipped |
|--------|-----------|---------|---------|
| 1 | 0 | 0 | 70 |
| 2 | 0 | 0 | 70 |

Вывод: `Migrations complete: 0 applied, 70 skipped` / `No new migrations to apply`

### Вариант B: через backend one-shot (альтернатива из docker.md)

```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run db:migrate
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run db:migrate
```

| Запуск | exit code | applied | skipped |
|--------|-----------|---------|---------|
| 1 | 0 | 0 | 70 |
| 2 | 0 | 0 | 70 |

### Вариант C: только `--profile migrate` (без full)

```bash
docker compose -f docker-compose.dev.yml --profile migrate run --rm db-migrate
```

| Результат | exit code |
|-----------|-----------|
| **FAIL** | 15 — `service "db-migrate" depends on undefined service "postgres"` |

**Рекомендация для backend-agent**: добавить profile `migrate` к сервису `postgres` в `docker-compose.dev.yml` или обновить документацию на `--profile migrate --profile full`.

## 3. Полный smoke suite (без E2E_DOCKER_MODE)

При отсутствии `E2E_DOCKER_MODE=true` все 11 тестов **skipped** (graceful skip) — поведение сохранено.

## Вердикт

| Критерий | Статус |
|----------|--------|
| db:reset в Docker → dashboard API OK | ✅ |
| db:migrate × 2 без ошибок | ✅ |
| E2E docker-smoke | ✅ 11/11 |
| Идемпотентность migrate (0 applied, 70 skipped) | ✅ |

**Этап 3 QA: PASSED** — готов к Product Owner Acceptance (Этап 4).
