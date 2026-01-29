---
title: Структура проекта
description: Описание организации файлов и папок проекта Bank Insights Hub
---

# Структура проекта

## Общая структура

```
bank-insights-hub-62/
├── src/                    # Frontend исходный код
├── backend/                # Backend исходный код
├── docs/                   # Документация (VitePress)
├── e2e/                    # E2E тесты (Playwright)
├── scripts/                # Утилитарные скрипты
├── public/                 # Статические файлы
├── archive/                # Архивированные файлы
└── package.json           # Frontend зависимости
```

## Frontend структура (`src/`)

```
src/
├── pages/                 # Страницы приложения
│   ├── DynamicDashboard.tsx    # Главная страница дашборда
│   ├── DevTools.tsx            # Инструменты разработчика
│   └── NotFound.tsx            # Страница 404
│
├── components/             # React компоненты
│   ├── ui/                # UI компоненты (shadcn/ui)
│   ├── report/             # Компоненты отчетов
│   ├── KPICard.tsx         # Карточка KPI
│   ├── FinancialTable.tsx  # Таблица финансовых данных
│   ├── Header.tsx          # Шапка приложения
│   └── NavLink.tsx         # Навигационная ссылка
│
├── hooks/                 # Custom React hooks
│   ├── useAPI.ts           # Хук для работы с API
│   └── use-table-sort.ts   # Хук для сортировки таблиц
│
├── lib/                   # Утилиты и библиотеки
│   ├── api.ts              # API клиент
│   ├── formatters.ts       # Форматирование данных
│   └── utils.ts            # Общие утилиты
│
├── App.tsx                 # Главный компонент приложения
├── main.tsx                # Точка входа
└── index.css               # Глобальные стили
```

## Backend структура (`backend/`)

```
backend/
├── src/
│   ├── config/            # Конфигурация
│   │   └── database.ts    # Настройки подключения к БД
│   │
│   ├── migrations/        # SQL миграции
│   │   ├── 001_create_schemas.sql
│   │   ├── 002_insert_initial_data.sql
│   │   └── ...
│   │
│   ├── routes/            # API routes
│   │   ├── index.ts       # Главный роутер
│   │   ├── dataRoutes.ts  # Универсальный endpoint /api/data (SQL Builder)
│   │   ├── uploadRoutes.ts # Загрузка файлов
│   │   └── tableDataRoutes.ts  # Table data endpoints (legacy)
│   │
│   ├── services/          # Бизнес-логика
│   │   ├── queryBuilder/  # SQL Builder - универсальный сервис
│   │   │   ├── builder.ts # Построение SQL из конфигов
│   │   │   ├── validator.ts # Валидация параметров
│   │   │   └── queryLoader.ts # Загрузка конфигов из БД
│   │   ├── config/        # Сервисы для работы с config схемой
│   │   │   └── layoutService.ts  # (устаревший, используется через SQL Builder)
│   │   └── mart/          # Data Mart сервисы (mart схема)
│   │       ├── balanceService.ts  # (устаревший, используется через SQL Builder)
│   │       ├── kpiService.ts  # (устаревший, используется через SQL Builder)
│   │       ├── base/
│   │       └── types.ts
│   │
│   ├── middleware/        # Express middleware
│   │   └── errorHandler.ts
│   │
│   ├── scripts/           # Утилитарные скрипты
│   │   ├── run-migrations.ts
│   │   ├── check-db-connection.ts
│   │   └── ...
│   │
│   └── server.ts          # Главный файл сервера
│
└── package.json           # Backend зависимости
```

## Документация (`docs/`)

```
docs/
├── .vitepress/            # Конфигурация VitePress
│   └── config.ts
│
├── getting-started/       # Начало работы
├── architecture/         # Архитектура
├── api/                   # API документация
├── development/           # Разработка
├── database/              # База данных
├── deployment/            # Деплой
├── guides/                # Руководства
└── reference/            # Справочник
```

## Тесты

```
e2e/                      # E2E тесты (Playwright)
├── api.integration.spec.ts
├── basic.spec.ts
└── security.spec.ts
```

## Скрипты (`scripts/`)

```
scripts/
├── start-servers.sh      # Запуск обоих серверов
└── validate.sh           # Валидация проекта
```

## Ключевые файлы

- `package.json` - Frontend зависимости и скрипты
- `backend/package.json` - Backend зависимости и скрипты
- `vite.config.ts` - Конфигурация Vite
- `tsconfig.json` - Конфигурация TypeScript
- `tailwind.config.ts` - Конфигурация Tailwind CSS
- `playwright.config.ts` - Конфигурация Playwright
- `vitest.config.ts` - Конфигурация Vitest

## Схемы базы данных

Проект использует несколько схем PostgreSQL:

- `dashboard` - Основные данные дашборда
- `config` - Конфигурация и метаданные
- `mart` - Data Mart для агрегированных данных
- `sec` - Безопасность (users, roles)
- `dict` - Справочники
- `stg` - Staging (сырые данные)
- `ods` - Operational Data Store
- `ing` - Ingestion (управление загрузкой)
- `log` - Логирование

Подробнее в разделе [База данных](/database/).
