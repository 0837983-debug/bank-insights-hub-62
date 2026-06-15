# QA Report: Docker Smoke E2E (Этап 5)

**Дата**: 2026-06-09  
**План**: `docs/plans/current/DOCKER_CROSS_PLATFORM_SETUP.md` — Этап 5  
**Субагент**: qa-agent

## Созданные / изменённые файлы

| Файл | Изменение |
|------|-----------|
| `e2e/docker-smoke.spec.ts` | Новый smoke-тест Docker dev stack |
| `playwright.config.ts` | Skip webServer для docker-smoke / `E2E_DOCKER_MODE`; API-only backend; Windows `FRONTEND_URL` для health |
| `e2e/api.integration.spec.ts` | Fix: `getHeaderDates` вынесен на уровень describe (ReferenceError) |
| `docs/guides/docker.md` | Документация `E2E_DOCKER_MODE=true` |
| `public/.gitkeep` | Пустой `public/` для сборки `frontend/Dockerfile.dev` |

## E2E_DOCKER_MODE

```bash
# Предусловие
cp .env.docker.example .env   # COMPOSE_PROFILES=full
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml run --rm db-bootstrap

# Smoke
E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
```

Без `E2E_DOCKER_MODE=true` — **3 skipped** (graceful skip).

## Результаты тестов (Windows dev machine)

### `e2e/docker-smoke.spec.ts`

| Режим | Результат |
|-------|-----------|
| Без `E2E_DOCKER_MODE` | **3 skipped** ✅ |
| `E2E_DOCKER_MODE=true` + Docker backend + bootstrap | **2 passed**, 1 failed (frontend) |

Пройдено:
- `GET /api/health` — backend ok (status `degraded` без frontend контейнера допустим)
- `GET /api/data?query_id=layout` — sections возвращаются

Не пройдено:
- `frontend loads at :8080` — порт **8080 занят `java.exe` (PID 9644)**, frontend-контейнер не смог стартовать

### `npm run test:e2e:api`

| Окружение | passed | failed | skipped |
|-----------|--------|--------|---------|
| `E2E_DOCKER_MODE=true` + Docker backend | 9 | 5 | 3 |
| Local webServer (npm backend) | 1 | 13 | 3 |

Причины падений на текущей машине (не регресс от нового smoke-файла):
1. **Health** — 503 `degraded` без frontend (ожидает 200 `ok` в `api.integration`)
2. **header_dates p2/p3** — bootstrap загрузил 1 balance-период; тесты ожидают 3
3. **layout header section** — отсутствует в минимальном bootstrap dataset
4. **Host psql → 127.0.0.1:5432** — локальный PostgreSQL перехватывает порт; `bank_local_user` недоступен с хоста (Docker internal network работает)

Исправление в тестах: `getHeaderDates` scope bug (ReferenceError в Table Data) — **исправлено**.

## Баги / блокеры (для других агентов)

### Баг: frontend Docker не стартует при занятом 8080

**Где**: `docker compose -f docker-compose.dev.yml up -d`  
**Шаги**: порт 8080 занят другим процессом  
**Ожидание**: frontend container healthy  
**Факт**: `bind: Only one usage of each socket address`

### Баг: `frontend/Dockerfile.dev` требует `public/`

**Где**: `COPY public ./public`  
**Решение QA**: добавлен `public/.gitkeep`  
**Рекомендация**: закрепить в репозитории или сделать COPY опциональным

### Баг: bootstrap seed — один период balance

**Где**: `bootstrap-local-db.ts` / Upload API seed  
**Влияние**: `header_dates` без p2/p3 → падение KPI/table API E2E

## Критерии Этапа 5

| Критерий | Статус |
|----------|--------|
| Smoke-тест создан | ✅ |
| Graceful skip без Docker | ✅ |
| Smoke API при поднятом compose | ✅ (health + layout) |
| Frontend smoke | ⚠️ blocked (port 8080) |
| `npm run test:e2e:api` без новых падений | ⚠️ env/data на Windows; fix getHeaderDates применён |

## Рекомендации

1. Освободить порт 8080 или задать `HTTP_PORT` / mapping для frontend dev
2. Для полного API регресса: 3 balance-периода (`sanitize-and-seed-dev-db.sh` или расширить bootstrap seed)
3. На Windows с локальным PostgreSQL: использовать `DB_PORT=5433` в `.env` для Docker postgres
