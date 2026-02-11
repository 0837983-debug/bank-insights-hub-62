---
title: Структура файлов
description: Детальная структура файлов проекта
related:
  - /getting-started/project-structure
---

# Структура файлов

Детальная структура файлов проекта Bank Insights Hub.

## Корневая структура

```
bank-insights-hub-62/
├── src/                    # Frontend исходный код
├── backend/                # Backend исходный код
├── docs/                   # Документация (VitePress)
├── e2e/                    # E2E тесты (Playwright)
├── scripts/                # Утилитарные скрипты
├── public/                 # Статические файлы
├── archive/                # Архивированные файлы
├── package.json            # Frontend зависимости
├── vite.config.ts          # Конфигурация Vite
├── tsconfig.json           # Конфигурация TypeScript
├── tailwind.config.ts      # Конфигурация Tailwind
├── playwright.config.ts    # Конфигурация Playwright
└── vitest.config.ts        # Конфигурация Vitest
```

## Frontend (src/)

```
src/
├── pages/                  # Страницы приложения
│   ├── DynamicDashboard.tsx   # Главная страница дашборда
│   ├── DevTools.tsx           # Инструменты разработчика
│   └── NotFound.tsx           # Страница 404
│
├── components/             # React компоненты
│   ├── ui/                 # Базовые UI компоненты (shadcn/ui)
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── report/             # Компоненты отчетов
│   │   └── CollapsibleSection.tsx
│   ├── KPICard.tsx         # Карточка KPI метрики
│   ├── FinancialTable.tsx  # Таблица финансовых данных
│   ├── Header.tsx          # Шапка приложения
│   ├── NavLink.tsx         # Навигационная ссылка
│   └── SortableHeader.tsx  # Сортируемый заголовок таблицы
│
├── hooks/                  # Custom React hooks
│   ├── useAPI.ts           # Hooks для работы с API (React Query)
│   ├── use-table-sort.ts   # Хук для сортировки таблиц
│   └── use-toast.ts        # Хук для уведомлений
│
├── lib/                    # Утилиты и библиотеки
│   ├── api.ts              # API клиент (fetch обертки)
│   ├── formatters.ts       # Форматирование данных (formatValue)
│   └── utils.ts            # Общие утилиты (cn, etc.)
│
├── App.tsx                 # Главный компонент приложения
├── main.tsx                # Точка входа
└── index.css               # Глобальные стили (Tailwind)
```

## Backend (backend/)

```
backend/
├── src/
│   ├── config/             # Конфигурация
│   │   └── database.ts     # Настройки подключения к БД
│   │
│   ├── routes/             # API routes (Express)
│   │   ├── index.ts        # Главный роутер
│   │   ├── dataRoutes.ts    # Универсальный endpoint /api/data
│   │   └── tableDataRoutes.ts  # Table data endpoints
│   │
│   ├── services/           # Бизнес-логика
│   │   ├── config/         # Сервисы для работы с config схемой
│   │   │   └── layoutService.ts  # Построение layout из БД (устаревший, используется через SQL Builder)
│   │   ├── queryBuilder/   # SQL Builder - универсальный сервис для построения SQL из конфигов
│   │   │   ├── builder.ts  # Основная логика построения SQL
│   │   │   ├── validator.ts # Валидация параметров
│   │   │   └── queryLoader.ts # Загрузка конфигов из БД
│   │   └── mart/           # Data Mart сервисы (mart схема)
│   │       ├── balanceService.ts      # Работа с балансом (устаревший, используется через SQL Builder)
│   │       ├── kpiService.ts          # Работа с KPI метриками (устаревший, используется через SQL Builder)
│   │       ├── types.ts               # Общие типы
│   │       └── base/                  # Базовые сервисы
│   │           ├── calculationService.ts  # Расчеты (ppChange, ytdChange)
│   │           ├── componentService.ts    # Работа с компонентами
│   │           └── rowNameMapper.ts       # Маппинг названий строк
│   │
│   ├── middleware/         # Express middleware
│   │   └── errorHandler.ts # Обработка ошибок
│   │
│   ├── migrations/         # SQL миграции
│   │   └── 000_initial_schema.sql  # Начальная миграция
│   │
│   ├── scripts/            # Утилитарные скрипты
│   │   ├── run-migrations.ts
│   │   ├── check-db-connection.ts
│   │   ├── test-layout-api.ts
│   │   └── ...
│   │
│   └── server.ts           # Главный файл сервера (Express app)
│
└── package.json            # Backend зависимости
```

## Документация (docs/)

```
docs/
├── .vitepress/            # Конфигурация VitePress
│   └── config.ts          # Настройки VitePress
│
├── api/                   # API документация
│   ├── index.md
│   ├── endpoints.md
│   ├── get-data.md          # Единый endpoint для всех данных
│   ├── data-models.md
│   └── examples.md
│
├── architecture/          # Архитектура
│   ├── index.md
│   ├── overview.md
│   ├── frontend.md
│   ├── backend.md
│   ├── database.md
│   └── data-flow.md
│
├── development/           # Разработка
│   ├── index.md
│   ├── setup.md
│   ├── guidelines.md
│   ├── coding-standards.md
│   ├── testing.md
│   └── debugging.md
│
├── database/              # База данных
│   ├── index.md
│   ├── schemas.md
│   ├── migrations.md
│   └── data-marts.md
│
├── deployment/            # Деплой
│   ├── index.md
│   ├── ci-cd.md
│   ├── environment.md
│   └── production.md
│
├── getting-started/       # Начало работы
│   ├── index.md
│   ├── installation.md
│   ├── quick-start.md
│   └── project-structure.md
│
├── guides/                # Руководства
│   ├── index.md
│   ├── restoration.md
│   ├── layout-comparison.md
│   └── troubleshooting.md
│
├── reference/             # Справочник
│   ├── index.md
│   ├── commands.md
│   ├── file-structure.md
│   └── glossary.md
│
└── index.md               # Главная страница документации
```

## Тесты (e2e/)

```
e2e/
├── api.integration.spec.ts    # API интеграционные тесты
├── basic.spec.ts              # Базовые UI тесты
└── security.spec.ts           # Тесты безопасности
```

## Скрипты (scripts/)

```
scripts/
├── start-servers.sh       # Запуск обоих серверов
└── validate.sh            # Валидация проекта
```

## Конфигурационные файлы

### Корень проекта

- `package.json` - Frontend зависимости и скрипты
- `vite.config.ts` - Конфигурация Vite (dev сервер, build)
- `tsconfig.json` - Конфигурация TypeScript
- `tailwind.config.ts` - Конфигурация Tailwind CSS
- `playwright.config.ts` - Конфигурация Playwright (E2E тесты)
- `vitest.config.ts` - Конфигурация Vitest (unit тесты)
- `eslint.config.js` - Конфигурация ESLint
- `.gitignore` - Игнорируемые файлы git

### Backend

- `backend/package.json` - Backend зависимости и скрипты
- `backend/tsconfig.json` - Конфигурация TypeScript для backend

## Ключевые файлы

### Frontend

**Точка входа:**
- `src/main.tsx` - Инициализация React приложения

**Роутинг:**
- `src/App.tsx` - React Router настройка

**API:**
- `src/lib/api.ts` - API клиент с функциями fetch
- `src/hooks/useAPI.ts` - React Query hooks

**Форматирование:**
- `src/lib/formatters.ts` - Форматирование значений (formatValue, initializeFormats)

### Backend

**Сервер:**
- `backend/src/server.ts` - Express приложение, настройка middleware

**Routes:**
- `backend/src/routes/index.ts` - Главный роутер
- `backend/src/routes/dataRoutes.ts` - Универсальный endpoint /api/data (SQL Builder)
- `backend/src/routes/uploadRoutes.ts` - Загрузка файлов
- `backend/src/routes/tableDataRoutes.ts` - Table data endpoints (legacy)

**Services:**
- `backend/src/services/queryBuilder/` - SQL Builder (универсальный сервис для всех данных)
  - `builder.ts` - построение SQL из конфигов
  - `validator.ts` - валидация параметров
  - `queryLoader.ts` - загрузка конфигов из БД
- `backend/src/services/mart/base/calculationService.ts` - Расчеты (используется в transformKPIData)
- `backend/src/services/config/layoutService.ts` - Построение layout (устаревший, используется через SQL Builder)
- `backend/src/services/mart/kpiService.ts` - KPI метрики (устаревший, используется через SQL Builder)
- `backend/src/services/mart/balanceService.ts` - Баланс (устаревший, используется через SQL Builder)

## См. также

- [Структура проекта](/getting-started/project-structure) - обзор структуры
- [Архитектура](/architecture/overview) - архитектурные принципы
