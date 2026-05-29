---
title: Локальная БД и sanitize/seed
description: Безопасный запуск локальной базы и пересев тестовых данных
---

# Локальная БД и sanitize/seed

Гайд для запуска dev/test контура без real data.

## Принцип

1. `bootstrap-local-db.sh` создает локальную инфраструктуру и загружает базовый тестовый dataset.
2. `sanitize-and-seed-dev-db.sh` очищает потенциально чувствительные данные и заново загружает только тестовые CSV.

## Предусловия

- Установлены `node`, `npm`, `curl`.
- Доступен локальный PostgreSQL.
- В `backend/.env` или shell заданы `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

## Шаг 1. Bootstrap

```bash
bash scripts/bootstrap-local-db.sh
```

Ожидаемый маркер успеха:

```text
[bootstrap-local-db] Bootstrap completed successfully
```

## Шаг 2. Sanitization + reseed

```bash
ALLOW_DATA_RESET=true bash scripts/sanitize-and-seed-dev-db.sh
```

Что делает скрипт:
- проверяет защитные условия от запуска в prod;
- очищает только данные в `log`, `stg`, `ods`, `ing`;
- не трогает `config.*` и `dict.*`;
- загружает:
  - `test-data/uploads/capital_2025-01.csv`
  - `test-data/uploads/fin_results_2025-01.csv`
- выполняет refresh всех MART materialized views.

## Быстрая проверка после reseed

```bash
cd backend && npm run dev
```

Проверьте:
- `http://localhost:3001/api/data?query_id=layout`
- `http://localhost:3001/api/data?query_id=header_dates`
- `http://localhost:3001/api/data?query_id=kpis`

## Что нельзя делать

- Нельзя запускать sanitize/reseed без `ALLOW_DATA_RESET=true`.
- Нельзя использовать production credentials для локального контура.
- Нельзя добавлять в репозиторий реальные CSV/XLSX, SQL dumps, `.env` и секреты.

## Troubleshooting

- Если `pg_isready` не проходит, проверьте запущен ли PostgreSQL и корректен ли `DB_PORT`.
- Если скрипт останавливается с prod-like warning, проверьте `DB_HOST`/`DB_NAME` и `NODE_ENV`.
- Если нет dataset-файлов, проверьте наличие CSV в `test-data/uploads/`.
