# Настройка Backend для handoff

Этот документ описывает безопасный запуск backend/dev БД для передачи внешнему разработчику без real data.

## Что запрещено передавать

- Реальные банковские данные (`ods.*`, `stg.*`, артефакты из `backend/row/processed`).
- Любые секреты: `.env`, пароли, токены, credentials, private keys.
- Prod dumps и экспортированные файлы из production.

Для handoff допускаются только технические конфиги (`config.*`, `dict.*`) и синтетический dataset из `test-data/uploads`.

## Быстрый сценарий: чистый локальный контур

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
BALANCE_DATASET_FILE=capital_2025-01.csv
FIN_RESULTS_DATASET_FILE=fin_results_2025-01.csv
```

### 3) Поднять БД и базовый dataset

```bash
bash scripts/bootstrap-local-db.sh
```

Скрипт:
1. Поднимает PostgreSQL.
2. Создает/обновляет роль и БД.
3. Применяет миграции.
4. Загружает тестовые CSV через `POST /api/upload`.

### 4) Пересанитизировать и пересеять dev-данные (обязательный шаг для handoff)

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

### 5) Запустить backend и проверить API

```bash
cd backend && npm run dev
```

Smoke-check:
- `GET /api/data?query_id=layout`
- `GET /api/data?query_id=header_dates`
- `GET /api/data?query_id=kpis`

## Короткий checklist перед передачей

- [ ] Выполнен `bootstrap-local-db.sh` без ошибок.
- [ ] Выполнен `sanitize-and-seed-dev-db.sh` c `ALLOW_DATA_RESET=true`.
- [ ] В проекте нет real data/secrets.
- [ ] Backend поднимается и отвечает на базовые `api/data` запросы.

## См. также

- [Локальная БД и sanitize/seed](/guides/local-db)
- [Восстановление и архив](/guides/restoration)
- [Структура файлов и зоны риска](/reference/file-structure)

