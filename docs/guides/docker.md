---
title: Docker — dev и prod
description: Кроссплатформенный запуск через Docker Compose на Windows, macOS и Linux
---

# Docker — dev и prod

Единый путь запуска Bank Insights Hub на Windows, macOS и Linux. Bash-скрипты (`bootstrap-local-db.sh`, `start-servers.sh`) остаются как legacy для macOS/Linux без Docker.

## Требования

| Платформа | Что установить |
|-----------|----------------|
| Windows | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (WSL2 backend) |
| macOS | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| Linux (VPS/dev) | [Docker Engine](https://docs.docker.com/engine/install/) + [Compose plugin](https://docs.docker.com/compose/install/linux/) |

Проверка:

```bash
docker compose version
```

## Файлы и образы

| Файл | Назначение |
|------|------------|
| `docker-compose.dev.yml` | Dev: postgres + backend + frontend (профили `debug`, `bootstrap`, `migrate`, `seed`) |
| `docker-compose.prod.yml` | Prod: образы Docker Hub + postgres (или external RDS) |
| `.env.docker.example` | Шаблон `.env` для dev |
| `.env.prod.example` | Шаблон `.env` для prod |
| `backend/Dockerfile.dev` | Dev backend с hot-reload |
| `backend/Dockerfile` | Prod backend (multi-stage → `node dist/server.js`) |
| `frontend/Dockerfile.dev` | Dev frontend (Vite) |
| `frontend/Dockerfile` | Prod frontend (Vite build → nginx) |
| `frontend/nginx.conf` | Prod: static + `/api/` proxy на backend |

Образы в Docker Hub (CI публикует при push в `main`):

- `ayreon208/bank-insights-backend:latest` и `:<git-sha>`
- `ayreon208/bank-insights-frontend:latest` и `:<git-sha>`

---

## Dev: полный стек

Рекомендуемый режим по умолчанию — postgres, backend и frontend в контейнерах.

### 1. Подготовка

```bash
git clone <repo-url>
cd bank-insights-hub-62
cp .env.docker.example .env
```

В `.env` должно быть `COMPOSE_PROFILES=full` (уже задано в примере).

### 2. Запуск стека

```bash
docker compose -f docker-compose.dev.yml up -d
```

Команда `up -d` поднимает только **postgres**, **backend** и **frontend** (профиль `full`). Сервис `db-bootstrap` **не** стартует автоматически — его нужно запустить отдельно (шаг 3).

Проверка, что bootstrap не в списке running-сервисов:

```bash
docker compose -f docker-compose.dev.yml ps   # db-bootstrap не должен быть Up
```

### 3. Bootstrap (полный reset + seed)

```bash
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
```

Сервис `db-bootstrap` выполняет `npm run db:reset` с `ALLOW_DATA_RESET=true`: DROP managed schemas → инкрементальные миграции 001–080 → загрузка тестовых CSV.

> **⚠️ Деструктивная операция.** Reset удаляет данные в `sec`, `config`, `dict`, `stg`, `ods`, `mart`, `ing`, `log` и заново применяет curated migrations + загрузку тестовых CSV. Повторный bootstrap безопасен для dev, но **не запускайте** на prod-like БД с реальными данными.

### 3a. Только миграции (без DROP)

Для применения **новых** SQL после обновления кода (без сброса данных):

```bash
docker compose -f docker-compose.dev.yml --profile migrate run --rm db-migrate
```

Или через backend-образ:

```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run db:migrate
```

Повторный запуск безопасен: уже применённые файлы пропускаются по `public.schema_migrations`.

### Bootstrap vs migrate vs seed

| Команда | Сервис | Когда использовать | Деструктивно |
|---------|--------|-------------------|--------------|
| `--profile bootstrap run --rm db-bootstrap` | `db-bootstrap` | Пустая БД, первый запуск, полный reset dev | ✅ DROP схем + migrate + seed |
| `--profile migrate run --rm db-migrate` | `db-migrate` | После `git pull` с новыми SQL-миграциями | ❌ только новые файлы |
| `--profile seed run --rm db-seed` | `db-seed` | Схема уже есть, нужно перезалить тестовые CSV | ❌ upload по периоду |

**Реальные prod-данные** загружайте через UI **`/upload`** — там полная валидация (формат, даты, mapping). `db-seed` и `db-bootstrap` — только автоматизация dev/demo/CI из `test-data/uploads/`.

### 3b. Только seed (upload CSV)

Если схема уже есть, но нужно перезалить тестовые CSV:

```bash
docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed
```

Сервис `db-seed` монтирует `./test-data` из compose-файла (без ручного `-v`). Внутри контейнера `DATASET_DIR=/test-data/uploads`. При необходимости поднимает временный backend (`BOOTSTRAP_USE_TEMP_BACKEND=true`).

> **Windows:** путь `./test-data` в `docker-compose.dev.yml` работает на всех платформах. **Не используйте** CLI `-v ./test-data` в Git Bash — он ненадёжен; канонический путь — только `db-seed` через compose.

По умолчанию загружаются **3 balance-файла** (периоды p1/p2/p3 для header_dates) и **3 fin_results-файла** (те же периоды для KPI финансового результата):

```env
BALANCE_DATASET_FILES=capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv
FIN_RESULTS_DATASET_FILES=fin_results_2024-12.csv,fin_results_2025-01.csv,fin_results_2025-02.csv
```

Значения заданы в `.env.docker.example`; переопределите в `.env` при необходимости. Для загрузки одного fin_results-файла (legacy) задайте `FIN_RESULTS_DATASET_FILE` вместо `FIN_RESULTS_DATASET_FILES`.

### 4. Проверка

| Сервис | URL |
|--------|-----|
| Backend API | `http://localhost:3001/api/health` |
| Layout data | `http://localhost:3001/api/data?query_id=layout` |
| Frontend | `http://localhost:8080` |

**E2E smoke** (`e2e/docker-smoke.spec.ts`): тесты пропускаются по умолчанию. Предусловие: стек поднят и выполнен bootstrap (`--profile bootstrap run --rm db-bootstrap`):

```bash
E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
```

Без `E2E_DOCKER_MODE=true` файл не падает — все кейсы gracefully skip (удобно на машинах без Docker).

### 5. Остановка

```bash
docker compose -f docker-compose.dev.yml down
```

Данные PostgreSQL сохраняются в volume `pgdata`. Полная очистка: `docker compose -f docker-compose.dev.yml down -v`.

---

## Dev: debug-профиль

Только PostgreSQL в Docker; backend и frontend запускаются локально через `npm run dev` (удобно для отладки в IDE).

### 1. Настройка `.env`

Закомментируйте или удалите `COMPOSE_PROFILES=full` в `.env`, чтобы не поднимались backend/frontend контейнеры.

### 2. Запуск БД

```bash
docker compose -f docker-compose.dev.yml --profile debug up -d postgres
```

### 3. Bootstrap (backend на хосте)

```bash
cd backend && npm install
# В .env или shell: DB_HOST=127.0.0.1 DB_PORT=5432
ALLOW_DATA_RESET=true npm run db:reset
```

### 4. Запуск приложения

```bash
# Терминал 1
cd backend && npm run dev

# Терминал 2 (корень репозитория)
npm install && npm run dev
```

| Сервис | URL |
|--------|-----|
| Backend | `http://localhost:3001` |
| Frontend (Vite) | `http://localhost:5173` или `http://localhost:8080` |

`VITE_API_URL` для браузера: `http://localhost:3001/api` (задаётся в корневом `.env`).

---

## Prod: deploy на VPS

После публикации образов CI (`main` → Docker Hub) на VPS достаточно Docker Engine и compose-файлов.

### 1. Подготовка хоста

На Ubuntu/Debian VPS:

```bash
# Установка Docker (если ещё не установлен)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Перелогиньтесь для применения группы docker
```

Опционально — firewall и SSL остаются **на хосте** (см. таблицу ниже).

### 2. Конфигурация

```bash
git clone <repo-url>
cd bank-insights-hub-62
cp .env.prod.example .env
# Отредактируйте .env: DB_PASSWORD, HTTP_PORT и др.
```

По умолчанию `.env.prod.example` задаёт `COMPOSE_PROFILES=local-postgres` — bundled PostgreSQL в контейнере.

### 3. Deploy

```bash
docker login -u ayreon208
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml run --rm db-bootstrap
```

`db-bootstrap` — деструктивный reset (`npm run db:reset`, `ALLOW_DATA_RESET=true`). Используйте только для **пустой** или dev-like БД.

### 3a. Инкрементальные миграции на prod

После обновления образов, если в релизе есть новые SQL-миграции, примените их **без** DROP:

```bash
docker compose -f docker-compose.prod.yml run --rm db-migrate
```

Альтернатива (тот же образ backend):

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps backend npm run db:migrate
```

Повторный запуск безопасен: учёт в `public.schema_migrations`. **Не используйте** `db-bootstrap` на prod с реальными данными.

### 3b. Только seed (перезаливка тестовых CSV)

Если схема уже есть и нужно обновить тестовые датасеты без DROP:

```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm db-seed
```

Для **реальных данных заказчика** используйте UI **`/upload`**, а не `db-seed`.

Закрепить конкретную сборку:

```bash
TAG=<git-commit-sha> docker compose -f docker-compose.prod.yml pull
TAG=<git-commit-sha> docker compose -f docker-compose.prod.yml up -d
```

### 4. Проверка

```bash
curl -s http://localhost/api/health
curl -s "http://localhost/api/data?query_id=layout"
```

Nginx во frontend-контейнере слушает порт `HTTP_PORT` (по умолчанию 80) и проксирует `/api/` на backend.

---

## Миграция на RDS (external-db)

Переход с bundled Postgres на AWS RDS без смены образов backend/frontend.

### 1. Обновить `.env` на VPS

```env
COMPOSE_PROFILES=external-db
DB_HOST=your-rds-endpoint.eu-north-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=bankdb_prod
DB_USER=bank_prod_user
DB_PASSWORD=your_rds_password
```

Профиль `external-db` отключает сервис `postgres` в compose; backend читает `DB_HOST` из env.

### 2. Перезапуск

```bash
docker compose -f docker-compose.prod.yml --profile external-db up -d
docker compose -f docker-compose.prod.yml run --rm db-bootstrap
```

### 3. Проверка подключения

```bash
docker compose -f docker-compose.prod.yml exec backend node -e "
  const { Pool } = require('pg');
  const p = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
  p.query('SELECT 1').then(() => { console.log('OK'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
"
```

---

## Docker compose vs `setup-linux-vm.sh`

`scripts/setup-linux-vm.sh` — bare-metal установка на Ubuntu/Debian VM (Node, PostgreSQL, Nginx, PM2). **Не заменяется** полностью: compose закрывает app-слой, VM-скрипт — инфраструктуру хоста.

| Область | `docker compose prod` | `setup-linux-vm.sh` (остаётся на хосте) |
|---------|----------------------|-------------------------------------------|
| **PostgreSQL** | Контейнер `postgres:16-alpine` или RDS (`external-db`) | Системный PostgreSQL через `apt` |
| **Backend runtime** | Контейнер `ayreon208/bank-insights-backend` | PM2 + `node dist/server.js` на хосте |
| **Frontend** | Контейнер nginx со static build | Nginx + `rsync dist/` в `/var/www` |
| **Миграции + seed (dev reset)** | `db-bootstrap` (`npm run db:reset`, `ALLOW_DATA_RESET=true`) | `npm run db:reset` + ручной deploy |
| **Инкрементальные миграции (prod)** | `db-migrate` (`npm run db:migrate`) | `npm run db:migrate` |
| **Только seed (тестовые CSV)** | `db-seed` (`npm run db:seed`, профиль `seed`) | `npm run db:seed` на хосте |
| **Prod-данные заказчика** | UI `/upload` | UI `/upload` |
| **Deploy обновлений** | `docker compose pull && up -d` | `/usr/local/bin/bank-insights-deploy` (git pull, build) |
| **Переменные окружения** | `.env` в каталоге проекта | `/etc/bank-insights.env` |
| **Docker Engine** | Требуется на VPS | Не используется |
| **UFW (firewall)** | Настраивается на хосте вручную | `ENABLE_UFW=true` — порты 22/80/443 |
| **SSL / HTTPS** | Certbot или reverse proxy перед compose | `INSTALL_CERTBOT=true` — certbot + nginx на хосте |
| **Установка Docker** | `get.docker.com` или пакетный менеджер | Не входит в скрипт |
| **Linux app user** | Не нужен (контейнеры) | `bankapp` + права на `/opt/bank-insights` |

**Рекомендуемая схема для нового VPS:**

1. Установить Docker Engine на хосте.
2. Настроить UFW (22, 80, 443) и при необходимости Certbot **на хосте** или через внешний reverse proxy.
3. Deploy приложения через `docker-compose.prod.yml`.
4. `setup-linux-vm.sh` использовать только если нужен bare-metal без Docker.

---

## Связь с legacy bash-скриптами

| Скрипт | Роль при Docker |
|--------|-----------------|
| `bootstrap-local-db.sh` | Legacy (macOS/Linux без Docker). Устанавливает PostgreSQL, затем делегирует в `ALLOW_DATA_RESET=true npm run db:reset` |
| `sanitize-and-seed-dev-db.sh` | Актуален — запускается на хосте против работающего backend |
| `start-servers.sh` | Legacy — заменён `docker compose dev` или ручным `npm run dev` |
| `setup-linux-vm.sh` | Инфраструктура bare-metal VM; не заменяет UFW/SSL/Docker install |

---

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| `COMPOSE_PROFILES=full` поднимает лишние сервисы в debug | Уберите `COMPOSE_PROFILES=full` из `.env` |
| Bootstrap не может достучаться до API | В full stack дождитесь `backend` healthy; в debug запустите `npm run dev` в backend |
| Порт 5432 занят (часто на **Windows** — локальный PostgreSQL) | В `.env` задайте `DB_PORT=5433` (хост-порт; внутри контейнера postgres остаётся 5432). Перезапустите: `docker compose -f docker-compose.dev.yml down && docker compose -f docker-compose.dev.yml up -d` |
| `db-bootstrap` не найден при `run --rm` без профиля | Используйте `--profile bootstrap`: `docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap` |
| Дашборд пустой / KPI `invalid config` / header только p1 | Выполните bootstrap с 3 balance-файлами (`BALANCE_DATASET_FILES` в `.env`) |
| Prod frontend 502 на `/api` | Проверьте health backend: `docker compose -f docker-compose.prod.yml ps` |
| Windows: медленный volume mount | Используйте WSL2 backend в Docker Desktop |

## См. также

- [Запуск для заказчика — dev и prod](/guides/customer-docker-run) — пошаговая инструкция из git и через Docker Hub
- [Настройка Backend](/BACKEND_SETUP)
- [Локальная БД и sanitize/seed](/guides/local-db)
- [Настройка окружения](/development/setup)
- [План Docker bootstrap (полный дашборд)](/plans/current/DOCKER_BOOTSTRAP_FULL_DASHBOARD)
- [План Docker (кроссплатформенный setup)](/plans/current/DOCKER_CROSS_PLATFORM_SETUP)
