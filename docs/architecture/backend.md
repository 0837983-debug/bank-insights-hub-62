---
title: Backend архитектура
description: Архитектура backend части приложения
related:
  - /architecture/overview
  - /architecture/database
  - /architecture/data-flow
---

# Backend архитектура

Backend построен на Node.js с Express, используя TypeScript для типобезопасности.

## Структура приложения

```
backend/
├── src/
│   ├── config/          # Конфигурация
│   │   └── database.ts  # Настройки подключения к БД
│   │
│   ├── routes/          # API routes
│   │   ├── index.ts     # Главный роутер
│   │   ├── kpiRoutes.ts      # KPI endpoints
│   │   └── tableDataRoutes.ts # Table data endpoints
│   │
│   ├── services/        # Бизнес-логика
│   │   ├── config/      # Сервисы для работы с config схемой
│   │   │   └── layoutService.ts
│   │   ├── mart/        # Data Mart сервисы (mart схема)
│   │   │   ├── balanceService.ts
│   │   │   ├── kpiService.ts
│   │   │   ├── base/    # Базовые сервисы
│   │   │   │   ├── periodService.ts
│   │   │   │   ├── calculationService.ts
│   │   │   │   ├── componentService.ts
│   │   │   │   └── rowNameMapper.ts
│   │   │   └── types.ts
│   │   ├── queryBuilder/ # SQL Builder
│   │   │   ├── builder.ts
│   │   │   ├── validator.ts
│   │   │   ├── queryLoader.ts
│   │   │   └── types.ts
│   │   └── upload/      # Сервисы загрузки файлов
│   │       ├── fileParserService.ts
│   │       ├── validationService.ts
│   │       ├── storageService.ts
│   │       ├── ingestionService.ts
│   │       └── rollbackService.ts
│   │
│   ├── middleware/      # Express middleware
│   │   └── errorHandler.ts
│   │
│   ├── migrations/      # SQL миграции
│   │   └── *.sql
│   │
│   ├── scripts/         # Утилитарные скрипты
│   │   └── ...
│   │
│   └── server.ts        # Главный файл сервера
│
└── package.json
```

## Архитектурные слои

### 1. Route Layer (Routes)

[Перейти к разделу "Сервисы" →](#сервисы)

Обработка HTTP запросов и валидация входных данных.

**Основные routes:**

#### `/api/kpis` (kpiRoutes.ts)
- `GET /` - все KPI метрики
- `GET /:id` - конкретная метрика

#### `/api/table-data` (tableDataRoutes.ts)
- `GET /:tableId` - данные таблицы

#### `/api/layout` (index.ts)
- `GET /` - структура layout

**Обязанности:**
- Валидация параметров запроса
- Обработка query параметров
- Вызов соответствующих сервисов
- Формирование HTTP ответов
- Обработка ошибок

### 2. Service Layer

Бизнес-логика и работа с данными.

## Сервисы

### SQL Builder (`services/queryBuilder/`)

Библиотека для построения SQL запросов из JSON-конфигурации.

**Основные функции:**
- `buildQueryFromId(queryId, paramsJson)` - построение SQL по `query_id` из БД
- `buildQuery(config, params, wrapJson?)` - построение SQL из конфига

**Компоненты:**
- `builder.ts` - основная логика построения SQL
- `validator.ts` - валидация JSON-конфигов
- `queryLoader.ts` - загрузка конфигов из `config.component_queries`
- `types.ts` - TypeScript типы для конфигов

**Особенности:**
- Защита от SQL-инъекций через экранирование значений
- Строгая валидация параметров (missing/excess)
- Поддержка `wrapJson` для JSON агрегации
- Работа с одной таблицей (без JOIN)
- Поддержка CASE агрегаций, WHERE условий, GROUP BY, ORDER BY

**См. также:** [SQL Builder документация](/reference/sql-builder) - детальное описание формата конфигов и API

### Layout Service (`services/config/layoutService.ts`)

Построение layout структуры дашборда из БД.

**Функции:**
- `buildLayoutFromDB()` - построение полного layout

**Процесс:**
1. Загрузка форматов из `config.formats`
2. Загрузка секций из `config.layouts`
3. Загрузка компонентов из `config.components`
4. Связывание через `config.layout_component_mapping`
5. Формирование JSON структуры с `data_source_key`

**Особенности:**
- Работа с `config` схемой PostgreSQL
- Динамическое построение структуры дашборда
- Фильтрация неактивных компонентов и форматов
- Возврат `data_source_key` для компонентов

**См. также:** [Layout Architecture](/architecture/layout) - архитектура layout системы

### KPI Service (`services/mart/kpiService.ts`)

Работа с KPI метриками из Data Mart.

**Функции:**
- `getKPIMetrics()` - все метрики
- `getKPIMetricsByCategory()` - по категории
- `getKPIMetricById()` - по ID

**Особенности:**
- Работа с `mart.kpi_metrics` таблицей
- Расчет изменений (ppChange, ytdChange) на backend
- Расчет процентов (percentage) от общего
- Фильтрация по категориям из `config.components`
- Поддержка периодов (current, previous month, previous year)
- Все расчетные поля вычисляются на backend, frontend получает готовые значения

### Balance Service (`services/mart/balanceService.ts`)

Работа с данными баланса из Data Mart.

**Функции:**
- `getAssets()` - активы баланса
- `getLiabilities()` - обязательства баланса

**Особенности:**
- Работа с `mart.balance` таблицей
- Агрегация данных по периодам
- Поддержка группировки и фильтрации

### Base Services (`services/mart/base/`)

Вспомогательные сервисы для работы с данными:

**periodService:**
- `getHeaderDates()` - расчет дат периодов (current, previous month, previous year)
- Работа с периодами относительно `NOW()`

**calculationService:**
- Расчет изменений (ppChange, ytdChange)
- Расчет процентов (percentage)
- Абсолютные изменения

**componentService:**
- `getComponentById()` - метаданные компонента
- `getComponentsByType()` - компоненты по типу
- `getComponentFields()` - поля таблицы

**rowNameMapper:**
- Маппинг `row_code` в человекочитаемые названия
- Используется для отображения строк таблиц

### Upload Services (`services/upload/`)

Сервисы для загрузки и обработки файлов.

**fileParserService:**
- Парсинг CSV и XLSX файлов
- Валидация структуры файла
- Извлечение данных

**validationService:**
- Валидация данных перед загрузкой
- Проверка типов и форматов
- Проверка обязательных полей

**storageService:**
- Сохранение файлов в `row/processed/`
- Управление путями и именами файлов

**ingestionService:**
- Загрузка данных в STG схему
- Трансформация данных
- Загрузка в ODS и MART

**rollbackService:**
- Откат загруженных данных
- Удаление записей из STG, ODS, MART
- Очистка файлов

**См. также:** [File Upload API](/api/upload-api) - документация API загрузки файлов

### Formatter (Frontend)

**Расположение:** `src/lib/formatters.ts`

Утилиты форматирования чисел, валют и процентов на frontend.

**Функции:**
- `initializeFormats(formats)` - инициализация кэша форматов из layout API
- `formatValue(formatId, value)` - форматирование значения по формату

**Особенности:**
- Форматы загружаются из layout API
- Кэширование форматов в памяти
- Поддержка сокращений (K, M, B)
- Поддержка валютных символов и процентов

**См. также:** [Frontend Architecture](/architecture/frontend) - описание форматирования на frontend

### 3. Data Access Layer

Прямые SQL запросы к PostgreSQL через connection pool.

**Подключение:**
```typescript
import { pool } from '../config/database.js';
```

**Паттерны:**
- Параметризованные запросы (защита от SQL injection)
- Connection pooling для эффективности
- Транзакции где необходимо

## Middleware

### Error Handler

Централизованная обработка ошибок.

**Функциональность:**
- Логирование ошибок
- Формирование стандартизированных ответов
- Обработка различных типов ошибок
- Безопасность (не утечка чувствительной информации)

## Data Mart Pattern

### Концепция

Data Mart - схема с агрегированными данными для быстрого чтения.

**Преимущества:**
- Оптимизированные запросы
- Предварительно рассчитанные метрики
- Быстрый доступ к данным
- Разделение чтения и записи

### Структура

```
mart/
├── kpi_metrics          # KPI метрики по периодам
├── financial_results    # Финансовые результаты
└── balance              # Баланс
```

### Заполнение Data Mart

Данные попадают в Data Mart через:
- SQL миграции (начальные данные)
- ETL процессы (регулярное обновление)
- Скрипты загрузки данных

## Обработка запросов

### Типичный flow

1. **HTTP Request** → Route
2. **Route** → Валидация параметров
3. **Route** → Вызов Service
4. **Service** → SQL запрос к БД
5. **Service** → Трансформация данных
6. **Service** → Возврат данных
7. **Route** → Формирование JSON ответа
8. **HTTP Response** → Frontend

### Пример: Получение KPI метрик

```typescript
// Route
router.get("/", async (req, res) => {
  const { category, periodDate } = req.query;
  const metrics = await getKPIMetrics(category, periodDate);
  res.json(metrics);
});

// Service
export async function getKPIMetrics(category?: string, periodDate?: Date) {
  // SQL запрос к mart.kpi_metrics
  // Расчет изменений
  // Возврат данных
}
```

## Безопасность

### SQL Injection Protection

Все запросы используют параметризованные запросы:

```typescript
await pool.query(
  'SELECT * FROM table WHERE id = $1',
  [userId]
);
```

### Input Validation

Валидация на уровне routes:
- Проверка типов параметров
- Валидация форматов (даты, IDs)
- Ограничение размеров

### Error Handling

Безопасная обработка ошибок:
- Не утечка stack traces
- Стандартизированные сообщения
- Логирование для отладки

## Оптимизация

### Connection Pooling

Использование connection pool для эффективного управления соединениями.

### Query Optimization

- Индексы на часто используемых полях
- Оптимизированные JOIN запросы
- Использование Data Mart для агрегированных данных

### Caching

Кэширование на уровне:
- React Query (frontend)
- При необходимости: Redis (backend)

## Миграции

### SQL Migrations

Миграции в папке `src/migrations/`:
- Нумерованные файлы (001_, 002_, ...)
- Последовательное выполнение
- Откат при необходимости

### Выполнение

```bash
npm run migrate
```

## См. также

- [Общая архитектура](/architecture/overview) - обзор системы
- [База данных](/architecture/database) - структура БД
- [Поток данных](/architecture/data-flow) - детальный поток данных
- [SQL Builder](/reference/sql-builder) - документация SQL Builder
- [Component Queries](/reference/component-queries) - конфиги SQL запросов
- [File Upload API](/api/upload-api) - API загрузки файлов
