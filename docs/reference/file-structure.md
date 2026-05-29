---
title: Структура файлов
description: Актуальная структура проекта для handoff
related:
  - /getting-started/project-structure
---

# Структура файлов

Актуальная структура проекта для передачи внешнему разработчику (без real data).

## Корневая структура

```text
bank-insights-hub-62/
├── src/                           # Frontend (React + TypeScript)
├── backend/                       # Backend (Express + TypeScript)
├── docs/                          # VitePress-документация
├── e2e/                           # Playwright E2E tests
├── scripts/                       # Скрипты bootstrap/sanitize
├── test-data/uploads/             # Синтетический dataset для dev/test
├── archive/                       # Архив файлов
├── package.json                   # Root scripts/deps
├── vite.config.ts                 # Vite config
└── playwright.config.ts           # Playwright config
```

## Backend runtime

```text
backend/
├── src/
│   ├── config/
│   │   └── database.ts            # Подключение к PostgreSQL
│   ├── routes/
│   │   ├── dataRoutes.ts          # /api/data
│   │   └── uploadRoutes.ts        # /api/upload
│   ├── services/
│   │   ├── queryBuilder/          # SQL Builder runtime
│   │   └── upload/                # Parsing/validation/ingestion
│   ├── migrations/                # SQL миграции
│   └── server.ts
└── package.json
```

## Скрипты handoff и локального контура

```text
scripts/
├── bootstrap-local-db.sh          # Поднятие локальной БД + базовый dataset
└── sanitize-and-seed-dev-db.sh    # Очистка stg/ods/ing/log + reseed test-data
```

## Документация handoff

```text
docs/
├── BACKEND_SETUP.md               # Пошаговый запуск backend/dev DB
├── guides/local-db.md             # Локальная БД и sanitize/seed
├── guides/restoration.md          # Восстановление из archive и dataset
├── reference/file-structure.md    # Этот файл
├── context/*.md                   # Контекстные снимки системы
└── plans/
    ├── current/                   # Активные execution планы
    └── reports/                   # Отчеты аудита/QA/acceptance
```

## Источники данных

- `test-data/uploads/*.csv` — разрешенный синтетический набор для разработки и тестов.
- `backend/row/processed/**/*.{csv,xlsx,xls}` — зона повышенного риска; не включать в handoff-пакет.

## Политика передачи

- Передавать можно только код, документацию и тестовые данные.
- Нельзя передавать real data, `.env`, credentials, keys, prod dumps.
- Для обновления dev dataset использовать только `sanitize-and-seed-dev-db.sh`.

## См. также

- [Настройка Backend](/BACKEND_SETUP)
- [Локальная БД и sanitize/seed](/guides/local-db)
- [Восстановление после cleanup](/guides/restoration)
