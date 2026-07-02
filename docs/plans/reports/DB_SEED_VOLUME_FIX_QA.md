# QA Report: DB_SEED_VOLUME_FIX (Этап 3)

**Дата**: 2026-07-02  
**План**: `docs/plans/current/DB_SEED_VOLUME_FIX.md` — Этап 3  
**Субагент**: qa-agent

## Созданные / изменённые файлы

| Файл | Изменение |
|------|-----------|
| `e2e/docker-db-seed.spec.ts` | Новый E2E: `db-seed` через compose без ручного `-v`, проверка `mart.fin_results` |
| `playwright.config.ts` | Skip webServer для `docker-db-seed` (как у `docker-smoke`) |

## Предусловия

```bash
cp .env.docker.example .env   # COMPOSE_PROFILES=full
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
```

## 1. E2E: db-seed через compose

Новый тест `e2e/docker-db-seed.spec.ts`:

1. Проверяет `GET /api/health` — стек поднят, backend ok
2. Запускает `docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed`
3. Проверяет вывод: `Seed completed successfully`
4. Проверяет `SELECT COUNT(*) FROM mart.fin_results` > 0 (через `docker compose exec postgres psql`)

Каноническая команда **без** ручного `-v ./test-data` — volume задаётся в `docker-compose.dev.yml`.

```bash
E2E_DOCKER_MODE=true npx playwright test e2e/docker-db-seed.spec.ts --reporter=list
```

### Результат

| Тест | Результат | Время |
|------|-----------|-------|
| `db-seed via compose exits 0 and mart.fin_results is not empty` | **passed** | 24.3s |

После seed: `mart.fin_results` = **30** строк.

### Graceful skip

```bash
npx playwright test e2e/docker-db-seed.spec.ts --reporter=list
```

| Результат |
|-----------|
| **1 skipped** (без `E2E_DOCKER_MODE=true`) |

## 2. Регресс: docker-smoke

```bash
E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
```

### Результат

| Тест | Результат | Время |
|------|-----------|-------|
| GET /api/health returns ok | **passed** | 435ms |
| GET /api/data?query_id=layout returns layout sections | **passed** | 651ms |
| GET /api/data?query_id=layout includes header section | **passed** | 626ms |
| GET /api/data?query_id=header_dates returns p1, p2, p3 periods | **passed** | 281ms |
| GET /api/data?query_id=kpis returns valid KPI data | **passed** | 154ms |
| GET /api/data?query_id=table_balance returns rows without wrap_json error | **passed** | 111ms |
| GET /api/data?query_id=layout includes fin_results_table with columns | **passed** | 224ms |
| GET /api/data?query_id=fin_results_table returns rows | **passed** | 62ms |
| GET /api/data?query_id=kpis returns fin_results card with non-null p1 value | **passed** | 204ms |
| frontend loads at :8080 | **passed** | 1.6s |
| after db:reset in Docker — dashboard APIs return valid data | **passed** | 22.4s |

**Итого: 11 passed** (25.7s). Регресс без новых падений.

## Вердикт

| Критерий | Статус |
|----------|--------|
| `db-seed` через compose без ручного `-v` | ✅ |
| `mart.fin_results` не пустой после seed | ✅ (30 rows) |
| Smoke/regress без новых падений | ✅ (11/11) |
| QA-отчёт создан | ✅ |

**Этап 3: PASS** — готов к Product Owner Acceptance (Этап 4).
