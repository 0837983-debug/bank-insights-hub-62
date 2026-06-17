# Настройка Backend для handoff

Этот документ описывает безопасный запуск backend/dev БД для передачи внешнему разработчику без real data.

## Что запрещено передавать

- Реальные банковские данные (`ods.*`, `stg.*`, артефакты из `backend/row/processed`).
- Любые секреты: `.env`, пароли, токены, credentials, private keys.
- Prod dumps и экспортированные файлы из production.

Для handoff допускаются только технические конфиги (`config.*`, `dict.*`) и синтетический dataset из `test-data/uploads`.

## Быстрый сценарий: Docker (рекомендуется)

Кроссплатформенный путь для Windows, macOS и Linux. Подробности — в [руководстве по Docker](/guides/docker).

### 1) Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) или Docker Engine (Linux)
- Git-клон репозитория

### 2) Подготовить переменные

```bash
cp .env.docker.example .env
```

Файл `.env.docker.example` задаёт `COMPOSE_PROFILES=full`, дефолты локальной БД (`bankdb_local`, `bank_local_user`) и **3 balance-файла** для bootstrap:

```env
BALANCE_DATASET_FILES=capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv
```

На **Windows**, если порт 5432 занят локальным PostgreSQL, добавьте в `.env`: `DB_PORT=5433`.

### 3) Поднять стек

```bash
docker compose -f docker-compose.dev.yml up -d
```

`up -d` поднимает postgres, backend и frontend. Сервис `db-bootstrap` **не** запускается автоматически.

### 4) Bootstrap (миграции + seed)

```bash
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
```

> **⚠️ Деструктивно:** bootstrap выполняет `DROP SCHEMA` для managed-схем (`sec`, `config`, `dict`, `stg`, `ods`, `mart`, `ing`, `log`) и заново накатывает миграции + загрузку тестовых CSV. Подходит для чистого dev-окружения; не запускайте на prod-like БД.

Сервис `db-bootstrap` запускает `npm run bootstrap:local-db` (`backend/src/scripts/bootstrap-local-db.ts`):
1. Ждёт готовности PostgreSQL в контейнере.
2. Сбрасывает managed-схемы и применяет curated migrations (001–078).
3. Загружает **3** balance CSV и fin_results через `POST /api/upload`.
4. Проверяет контракт `header_dates` (p1, p2, p3 на разных датах).

### 5) Пересанитизировать и пересеять dev-данные (обязательный шаг для handoff)

```bash
ALLOW_DATA_RESET=true bash scripts/sanitize-and-seed-dev-db.sh
```

Скрипт безопасен по умолчанию:
- не запускается без `ALLOW_DATA_RESET=true`;
- блокируется при `NODE_ENV=production`;
- блокируется на prod-like host/db;
- очищает только `log/upload`, `stg`, `ods` и ingestion-слой;
- повторно загружает только тестовые CSV из `test-data/uploads`;
- обновляет все MART materialized views.

> Для sanitize/seed backend должен быть доступен на `localhost:3001`. При полном Docker-стеке backend уже запущен в контейнере.

### 6) Проверить API

```bash
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D"
curl "http://localhost:3001/api/data?query_id=header_dates"
curl "http://localhost:3001/api/data?query_id=kpis"
```

Frontend: `http://localhost:8080`

### Debug-профиль (только БД в Docker, app через npm)

Если нужен hot-reload IDE без контейнеров backend/frontend:

```bash
# Уберите COMPOSE_PROFILES=full из .env или закомментируйте строку
docker compose -f docker-compose.dev.yml --profile debug up -d postgres
cd backend && npm install && npm run dev
# В другом терминале из корня репозитория:
npm install && npm run dev
```

Bootstrap в debug-режиме (backend на хосте):

```bash
cd backend && npm run bootstrap:local-db
```

## Legacy: bash + npm (macOS/Linux)

Альтернативный путь без Docker. На Windows не поддерживается (требует `brew`/`apt` и `sudo -u postgres`).

### 1) Установить зависимости

```bash
cd backend && npm install
cd ..
```

### 2) Подготовить переменные подключения

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=bankdb_local
DB_USER=bank_local_user
DB_PASSWORD=bank_local_password
```

Опционально для bootstrap:

```env
DB_ADMIN_USER=postgres
DB_ADMIN_PASSWORD=postgres
BOOTSTRAP_PORT=3001
BALANCE_DATASET_FILES=capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv
FIN_RESULTS_DATASET_FILE=fin_results_2025-01.csv
```

### 3) Поднять БД и базовый dataset

```bash
bash scripts/bootstrap-local-db.sh
```

Скрипт:
1. Устанавливает/запускает PostgreSQL (Homebrew или apt).
2. Создаёт/обновляет роль и БД.
3. Применяет миграции.
4. Загружает тестовые CSV через `POST /api/upload`.

### 4) Пересанитизировать и пересеять dev-данные

```bash
ALLOW_DATA_RESET=true bash scripts/sanitize-and-seed-dev-db.sh
```

### 5) Запустить backend и проверить API

```bash
cd backend && npm run dev
```

## Соответствие Docker ↔ legacy bash

| Задача | Docker (основной) | Legacy bash |
|--------|-------------------|-------------|
| Установка PostgreSQL | Контейнер `postgres:16-alpine` | `bootstrap-local-db.sh` (brew/apt) |
| Миграции + seed | `docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap` / `npm run bootstrap:local-db` | `bootstrap-local-db.sh` |
| Запуск backend | Контейнер или `npm run dev` | `npm run dev` / `start-servers.sh` |
| Запуск frontend | Контейнер или `npm run dev` | `npm run dev` / `start-servers.sh` |
| Sanitize/reseed | `sanitize-and-seed-dev-db.sh` (без изменений) | то же |

Bash-скрипты **не удаляются** — они остаются для macOS/Linux без Docker и для sanitize/reseed.

## Короткий checklist перед передачей

- [ ] Выполнен bootstrap (`--profile bootstrap run --rm db-bootstrap` или `bootstrap-local-db.sh`) без ошибок.
- [ ] Выполнен `sanitize-and-seed-dev-db.sh` c `ALLOW_DATA_RESET=true`.
- [ ] В проекте нет real data/secrets.
- [ ] Backend отвечает на базовые `api/data` запросы.
- [ ] UI открывается (`http://localhost:8080` в Docker или `http://localhost:5173` при npm dev).

## См. также

- [Docker: dev и prod](/guides/docker)
- [Локальная БД и sanitize/seed](/guides/local-db)
- [Восстановление и архив](/guides/restoration)
- [Структура файлов и зоны риска](/reference/file-structure)
