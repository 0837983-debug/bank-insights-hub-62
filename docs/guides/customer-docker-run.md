---
title: Запуск для заказчика — dev и prod
description: Пошаговая инструкция локального запуска из git и через Docker Hub (macOS / Windows / Linux)
---

# Запуск для заказчика — dev и prod

Пошаговое руководство: как поднять Bank Insights Hub локально **из исходников** (dev) и **через образы Docker Hub** (prod-like). Подходит для macOS, Windows и Linux.

Техническая документация по compose-профилям и RDS: [Docker: dev и prod](/guides/docker).

---

## Что установить

| Компонент | Нужен | Зачем |
|-----------|-------|-------|
| **Git** | ✅ | Клонировать репозиторий |
| **Docker Desktop** (macOS/Windows) или **Docker Engine + Compose** (Linux) | ✅ | Postgres, backend, frontend в контейнерах |
| **Аккаунт Docker Hub** | ⚪ | Только для `docker pull` **private**-репозиториев; для dev из git не нужен |
| **PostgreSQL на хосте** | ❌ | БД в контейнере |
| **Node.js / npm** | ❌ | Для полного Docker-стека не нужны |

Проверка:

```bash
git --version
docker compose version
docker info
```

Docker Desktop должен быть запущен (статус **Docker is running**).

### macOS

- Установить [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/).
- Терминал: встроенный Terminal или iTerm.

### Windows

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) с **WSL2 backend**.
- Терминал: Git Bash или WSL.

Если порт **5432** занят локальным PostgreSQL — в `.env` задайте `DB_PORT=5433`.

---

## Какой `.env` в каком случае

В корне проекта создаётся **один** файл `.env` (не коммитится в git).

| Сценарий | Шаблон | Compose-файл |
|----------|--------|--------------|
| **A. Dev из исходников** (рекомендуется для первого демо) | `.env.docker.example` | `docker-compose.dev.yml` |
| **B. Prod-like / образы Docker Hub** | `.env.prod.example` | `docker-compose.prod.yml` |

```bash
cp .env.docker.example .env    # вариант A
# или
cp .env.prod.example .env      # вариант B
```

---

## Вариант A — dev из git (сборка локально)

Полный дашборд на **тестовых CSV** из `test-data/uploads/`. Рекомендуется для первого знакомства с проектом.

### A.1. Клонирование

```bash
git clone <URL-репозитория>
cd bank-insights-hub-62
git fetch origin
git switch feature/infra
```

> После merge Docker-инфраструктуры в `main` можно использовать `git switch main`.

| Команда | Что делает |
|---------|------------|
| `git clone` | Скачивает репозиторий |
| `git switch feature/infra` | Ветка с Docker, миграцией 079 и полным bootstrap |

### A.2. Настройка `.env`

```bash
cp .env.docker.example .env
```

Ключевые переменные:

```env
# Обязательно — без этого up -d не поднимет postgres/backend/frontend
COMPOSE_PROFILES=full

# PostgreSQL в контейнере
DB_HOST=postgres
DB_PORT=5432
DB_NAME=bankdb_local
DB_USER=bank_local_user
DB_PASSWORD=bank_local_password

# Тестовые датасеты (3 периода для header_dates и KPI)
BALANCE_DATASET_FILES=capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv
FIN_RESULTS_DATASET_FILES=fin_results_2024-12.csv,fin_results_2025-01.csv,fin_results_2025-02.csv

# Браузер обращается к API на хосте
VITE_API_URL=http://localhost:3001/api
```

**macOS / Linux** — проверка занятости порта 5432:

```bash
lsof -i :5432
```

Если порт занят — добавьте в `.env`: `DB_PORT=5433`, затем перезапустите стек.

### A.3. Сборка и запуск

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

| Сервис | URL | Описание |
|--------|-----|----------|
| Frontend (Vite dev) | `http://localhost:8080` | Дашборд |
| Backend API | `http://localhost:3001/api` | REST API |
| PostgreSQL | localhost:5432 (или 5433) | Данные в volume `pgdata` |

Первый запуск: **10–20 минут** (скачивание базовых образов + сборка).

Проверка:

```bash
docker compose -f docker-compose.dev.yml ps
```

Ожидание: `postgres`, `backend`, `frontend` — **Up**. Сервис `db-bootstrap` **не** должен быть в списке running.

### A.4. Bootstrap (полный reset + тестовые данные)

```bash
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
```

| Что происходит |
|----------------|
| `ALLOW_DATA_RESET=true` + `npm run db:reset` |
| Сброс dev-схем (`config`, `mart`, `stg`, …) |
| Применение миграций 001–080 (учёт в `schema_migrations`) |
| Загрузка 3 balance + 3 fin_results CSV |
| Проверка контракта дат p1/p2/p3 |

::: warning Деструктивная операция
Bootstrap **удаляет** данные в dev-схемах и заливает тестовый seed. **Не запускайте** на production-БД с реальными данными.
:::

Успех: в конце сообщение `Verified strict header_dates contract`, exit code 0.

### A.5. Открыть приложение

```bash
# macOS
open http://localhost:8080

# Windows / Linux — откройте в браузере вручную
```

Проверка API:

```bash
curl -s http://localhost:3001/api/health
```

### A.6. Остановка

```bash
# Остановить контейнеры (данные БД сохраняются)
docker compose -f docker-compose.dev.yml down

# Полная очистка БД
docker compose -f docker-compose.dev.yml down -v
```

### A.7. Только пересев CSV (без reset)

Если схема уже создана (bootstrap или migrate выполнен), но нужно **перезалить** тестовые CSV из `test-data/uploads/` — без DROP и без повторных миграций:

```bash
docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed
```

| Что происходит |
|----------------|
| `npm run db:seed` — upload balance + fin_results через Upload API |
| Volume `./test-data` монтируется из compose-файла (канонический путь) |
| При необходимости поднимается временный backend |
| Успех: `Seed completed successfully`, exit code 0 |

::: tip Реальные данные заказчика
Для production-файлов используйте UI **`/upload`** в приложении — там полная валидация формата, дат и mapping. `db-seed` — только для тестовых CSV из репозитория.
:::

::: info Windows
Путь `./test-data` в `docker-compose.dev.yml` работает на macOS, Linux и Windows (Docker Desktop + WSL2). **Не добавляйте** вручную `-v ./test-data` в CLI — в Git Bash это ненадёжно. Используйте только `db-seed` через compose.
:::

### A.8. Только миграции (без reset)

Если БД **уже инициализирована** (bootstrap выполнялся ранее, volume `pgdata` на месте) и вы обновили код (`git pull`) с **новыми SQL-миграциями** — примените только их. **Не запускайте** `db-bootstrap`: он выполняет деструктивный `db:reset` (DROP схем) и удалит ваши данные.

```bash
git pull
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml --profile migrate run --rm db-migrate
```

| Что происходит |
|----------------|
| `npm run db:migrate` — только файлы, которых ещё нет в `public.schema_migrations` |
| Существующие mart-данные и upload-история **не удаляются** |
| Повторный запуск безопасен: `0 applied, N skipped`, если новых миграций нет |

Успех: в логах `Migrations complete`, exit code 0. Если новых `.sql` не было — `0 applied`.

::: warning Не путать с bootstrap
| Ситуация | Команда |
|----------|---------|
| Пустая БД / первый запуск / после `down -v` | A.4 — `db-bootstrap` |
| БД есть, новые миграции из git | **A.8** — `db-migrate` |
| БД есть, перезалить тестовые CSV | A.7 — `db-seed` |
:::

---

## Вариант B — prod-like через Docker Hub

Готовые образы `ayreon208/bank-insights-backend` и `ayreon208/bank-insights-frontend`. Nginx отдаёт статику и проксирует `/api/` на backend.

### B.1. Клонирование

```bash
git clone <URL-репозитория>
cd bank-insights-hub-62
git switch feature/infra
```

Нужны `docker-compose.prod.yml`, каталог `test-data/` и шаблон `.env.prod.example`.

### B.2. Настройка `.env`

```bash
cp .env.prod.example .env
```

Рекомендуемые значения для **локального теста на Mac/Windows** (без root на порту 80):

```env
TAG=latest

# Postgres в compose (не RDS)
COMPOSE_PROFILES=local-postgres

# На Mac/Windows без sudo — 8080 вместо 80
HTTP_PORT=8080

DB_HOST=postgres
DB_PORT=5432
DB_NAME=bankdb_prod
DB_USER=bank_prod_user
DB_PASSWORD=<надёжный_пароль>

# Полный дашборд на 3 периодах (добавьте вручную в .env)
BALANCE_DATASET_FILES=capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv
FIN_RESULTS_DATASET_FILES=fin_results_2024-12.csv,fin_results_2025-01.csv,fin_results_2025-02.csv
```

| Переменная | Когда менять |
|------------|--------------|
| `COMPOSE_PROFILES=local-postgres` | Postgres в Docker (по умолчанию для VPS) |
| `COMPOSE_PROFILES=external-db` + `DB_HOST=...` | Внешняя БД (RDS) — bundled postgres не стартует |
| `TAG=latest` | Последняя сборка с Hub |
| `TAG=<git-commit-sha>` | Закрепить конкретную версию образа |
| `HTTP_PORT` | `8080` локально, `80` на VPS |
| `DB_PASSWORD` | **Обязательно** сменить с `change_me_prod_password` |

### B.3. Pull и запуск

```bash
# Только если репозитории private на Hub
docker login -u ayreon208

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml run --rm db-bootstrap
```

| Команда | Что делает |
|---------|------------|
| `pull` | Скачивает backend и frontend с Docker Hub |
| `up -d` | Postgres + backend + frontend (nginx) |
| `run db-bootstrap` | Полный reset + тестовый seed (`db:reset`, деструктивно) |

Открыть: `http://localhost:8080` (или порт из `HTTP_PORT`).

API через nginx: `http://localhost:8080/api/health`

### B.4. Fallback: образов на Hub ещё нет

Если `docker pull` возвращает `not found` или `denied`:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm db-bootstrap
```

Compose соберёт prod-образы **локально** из `backend/Dockerfile` и `frontend/Dockerfile`.

### B.5. Обновление только приложения (без пересоздания БД)

После публикации новых образов на Hub:

```bash
docker compose -f docker-compose.prod.yml pull backend frontend
docker compose -f docker-compose.prod.yml up -d backend frontend
```

Postgres-контейнер и volume `pgdata_prod` **не трогаются** — бизнес-данные сохраняются.

Если в релизе есть **новые SQL-миграции** — примените их отдельно (без DROP):

```bash
docker compose -f docker-compose.prod.yml run --rm db-migrate
```

Bootstrap (`db-bootstrap`) на prod с реальными данными **не используйте** — он выполняет деструктивный `db:reset`.

### B.6. Только пересев CSV (без reset)

Если схема уже есть и нужно обновить **тестовые** датасеты (например, после замены файлов в `test-data/uploads/`):

```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm db-seed
```

Для **реальных данных** — UI **`/upload`**, не `db-seed`.

---

## Сравнение вариантов

| | **A: Dev** | **B: Prod / Hub** |
|---|------------|-------------------|
| Шаблон `.env` | `.env.docker.example` | `.env.prod.example` |
| Compose | `docker-compose.dev.yml` | `docker-compose.prod.yml` |
| Сборка | Локально из исходников | `pull` с Hub или `--build` |
| UI | Vite dev `:8080` | Nginx `:80` / `:8080` |
| API в браузере | `http://localhost:3001/api` | `/api` через nginx |
| Docker Hub | Не нужен | Нужен после публикации |
| Hot-reload кода | ✅ (volume mount) | ❌ |

---

## Публикация и обновление образов на Docker Hub

Образы:

- `ayreon208/bank-insights-backend`
- `ayreon208/bank-insights-frontend`

Теги: `:latest` и `:<git-commit-sha>` на каждый успешный CI-run.

### Автоматическая публикация (CI)

Workflow: `.github/workflows/docker-publish.yml`

**Триггер:** push в ветку `main` или тег `v*` (например `v1.0.0`).

**Предусловия (один раз):**

1. В GitHub: **Settings → Secrets and variables → Actions**
2. Добавить secrets:
   - `DOCKERHUB_USERNAME` — логин Hub (например `ayreon208`)
   - `DOCKERHUB_TOKEN` — [Access Token](https://hub.docker.com/settings/security) с Read & Write (не пароль аккаунта)
3. Смержить ветку с Docker-инфраструктурой в `main` и запушить

**Проверка после CI:**

```bash
docker pull ayreon208/bank-insights-backend:latest
docker pull ayreon208/bank-insights-frontend:latest
```

Или на странице Hub: https://hub.docker.com/u/ayreon208

### Ручная публикация (если CI ещё не настроен)

Из корня репозитория:

```bash
docker login -u ayreon208

# Backend
docker build -t ayreon208/bank-insights-backend:latest -f backend/Dockerfile backend
docker push ayreon208/bank-insights-backend:latest

# Frontend (VITE_API_URL=/api для prod nginx)
docker build -t ayreon208/bank-insights-frontend:latest \
  --build-arg VITE_API_URL=/api \
  -f frontend/Dockerfile .
docker push ayreon208/bank-insights-frontend:latest
```

Опционально — тег с SHA коммита:

```bash
export TAG=$(git rev-parse HEAD)
docker tag ayreon208/bank-insights-backend:latest ayreon208/bank-insights-backend:$TAG
docker push ayreon208/bank-insights-backend:$TAG
# то же для frontend
```

### Как заказчику протестировать обновление с Hub

```bash
cd bank-insights-hub-62
git pull

# Обновить .env при необходимости (TAG=latest или конкретный SHA)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Bootstrap — только для пустой / dev-like БД, не для prod с реальными данными
# docker compose -f docker-compose.prod.yml run --rm db-bootstrap
```

Закрепить версию:

```bash
TAG=<commit-sha-из-GitHub-Actions> docker compose -f docker-compose.prod.yml pull
TAG=<commit-sha> docker compose -f docker-compose.prod.yml up -d
```

---

## Чеклист перед демо (вариант A, первый запуск)

```bash
cd bank-insights-hub-62
git pull origin feature/infra
cp .env.docker.example .env
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
open http://localhost:8080   # macOS
```

На дашборде должны быть:

- Шапка с **3 периодами** (p1, p2, p3)
- Секция **Баланс** с таблицей
- **Финансовые результаты** — KPI и таблица ФинРез
- **P&L** с данными

## Чеклист после обновления кода (вариант A, БД уже есть)

Если вы уже работали с проектом и volume `pgdata` не удаляли (`down` без `-v`):

```bash
cd bank-insights-hub-62
git pull
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml --profile migrate run --rm db-migrate
open http://localhost:8080
```

**Bootstrap не нужен** — см. [A.8. Только миграции](#a-8-только-миграции-без-reset). Запускайте `db-bootstrap` только при пустой БД или осознанном полном сбросе dev.

---

## Шпаргалка команд (полные)

Все команды — из **корня репозитория** (`cd bank-insights-hub-62`). Перед первым запуском: `cp .env.docker.example .env` (dev) или `cp .env.prod.example .env` (prod).

| | Dev | Prod |
|---|-----|------|
| Compose-файл | `-f docker-compose.dev.yml` | `-f docker-compose.prod.yml` |
| В `.env` | `COMPOSE_PROFILES=full` | `COMPOSE_PROFILES=local-postgres` |
| UI | http://localhost:8080 | http://localhost:8080 (или `HTTP_PORT`) |
| Upload (реальные данные) | http://localhost:8080/upload | тот же путь через nginx |

### Dev — `docker-compose.dev.yml`

```bash
# Поднять приложение (postgres + backend + frontend). БД не инициализируется.
docker compose -f docker-compose.dev.yml up -d --build

# Первый запуск / пустая БД / полный reset dev (DROP + migrate + seed). ⚠️ Деструктивно!
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap

# Только новые SQL-миграции (после git pull). Без DROP, данные сохраняются.
docker compose -f docker-compose.dev.yml --profile migrate run --rm db-migrate

# Только пересев тестовых CSV из test-data/uploads (схема уже есть).
docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed

# Остановить контейнеры (данные в volume pgdata сохраняются).
docker compose -f docker-compose.dev.yml down

# Удалить контейнеры и БД полностью (volume pgdata).
docker compose -f docker-compose.dev.yml down -v
```

### Prod — `docker-compose.prod.yml`

```bash
# Поднять стек (postgres + backend + frontend через nginx).
docker compose -f docker-compose.prod.yml pull    # если образы на Docker Hub
docker compose -f docker-compose.prod.yml up -d

# Только новые SQL-миграции на живой БД. Без DROP.
docker compose -f docker-compose.prod.yml run --rm db-migrate

# Пустая / demo БД: полный reset + тестовый seed. ⚠️ Не на prod с реальными данными!
docker compose -f docker-compose.prod.yml run --rm db-bootstrap

# Пересев тестовых CSV (demo/staging).
docker compose -f docker-compose.prod.yml --profile seed run --rm db-seed

# Обновить только приложение, БД не трогать.
docker compose -f docker-compose.prod.yml pull backend frontend
docker compose -f docker-compose.prod.yml up -d backend frontend

# Остановить (volume pgdata_prod сохраняется).
docker compose -f docker-compose.prod.yml down
```

### Что когда (кратко)

| Задача | Dev | Prod |
|--------|-----|------|
| Поднять приложение | `up -d --build` | `pull` + `up -d` |
| Первый раз / пустая БД | `bootstrap` | `db-bootstrap` (только demo) |
| Новые миграции из git | `migrate` → `db-migrate` | `run db-migrate` |
| Тестовые CSV | `seed` → `db-seed` | `--profile seed` → `db-seed` |
| Реальные файлы заказчика | UI `/upload` | UI `/upload` |
| Полный сброс БД | `down -v` → `up` → `bootstrap` | не применимо к боевым данным |

---

## Частые проблемы

| Симптом | Решение |
|---------|---------|
| `up -d` поднимает 0 сервисов | В `.env` должно быть `COMPOSE_PROFILES=full` (dev) или `local-postgres` (prod) |
| `Cannot connect to Docker daemon` | Запустить Docker Desktop |
| Порт 5432 занят | `DB_PORT=5433` в `.env`, затем `down` → `up -d` |
| Дашборд пустой / KPI `invalid config` | Не выполнен bootstrap — шаг A.4 / B.3 |
| После `git pull` пропали данные | Ошибочно запущен `db-bootstrap` вместо `db-migrate` — см. A.8 |
| `pull`: image not found | Образы ещё не в Hub — используйте `--build` или вариант A |
| `/api/health` → `degraded` в dev | Допустимо; дашборд при этом работает |
| Prod на Mac: порт 80 недоступен | `HTTP_PORT=8080` в `.env` |

---

## См. также

- [Docker: dev и prod](/guides/docker) — профили debug, RDS, troubleshooting
- [Настройка Backend](/BACKEND_SETUP)
- [Настройка окружения](/development/setup)
- [Локальная БД и sanitize/seed](/guides/local-db)
