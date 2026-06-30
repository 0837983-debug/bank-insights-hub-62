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
| Frontend (Vite dev) | http://localhost:8080 | Дашборд |
| Backend API | http://localhost:3001/api | REST API |
| PostgreSQL | localhost:5432 (или 5433) | Данные в volume `pgdata` |

Первый запуск: **10–20 минут** (скачивание базовых образов + сборка).

Проверка:

```bash
docker compose -f docker-compose.dev.yml ps
```

Ожидание: `postgres`, `backend`, `frontend` — **Up**. Сервис `db-bootstrap` **не** должен быть в списке running.

### A.4. Bootstrap (миграции + тестовые данные)

```bash
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
```

| Что происходит |
|----------------|
| Сброс dev-схем (`config`, `mart`, `stg`, …) |
| Применение миграций 001–079 |
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
| `run db-bootstrap` | Миграции + тестовый seed |

Открыть: http://localhost:8080 (или порт из `HTTP_PORT`).

API через nginx: http://localhost:8080/api/health

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

Если в релизе есть **новые SQL-миграции** — примените их отдельно (см. [Docker: dev и prod](/guides/docker)); bootstrap на prod с реальными данными **не используйте**.

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

## Чеклист перед демо (вариант A)

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

---

## Частые проблемы

| Симптом | Решение |
|---------|---------|
| `up -d` поднимает 0 сервисов | В `.env` должно быть `COMPOSE_PROFILES=full` (dev) или `local-postgres` (prod) |
| `Cannot connect to Docker daemon` | Запустить Docker Desktop |
| Порт 5432 занят | `DB_PORT=5433` в `.env`, затем `down` → `up -d` |
| Дашборд пустой / KPI `invalid config` | Не выполнен bootstrap — шаг A.4 / B.3 |
| `pull`: image not found | Образы ещё не в Hub — используйте `--build` или вариант A |
| `/api/health` → `degraded` в dev | Допустимо; дашборд при этом работает |
| Prod на Mac: порт 80 недоступен | `HTTP_PORT=8080` в `.env` |

---

## См. также

- [Docker: dev и prod](/guides/docker) — профили debug, RDS, troubleshooting
- [Настройка Backend](/BACKEND_SETUP)
- [Настройка окружения](/development/setup)
- [Локальная БД и sanitize/seed](/guides/local-db)
