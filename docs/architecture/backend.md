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
│   │   └── mart/        # Data Mart сервисы (mart схема)
│   │       ├── balanceService.ts
│   │       ├── kpiService.ts
│   │       ├── base/
│   │       └── types.ts
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

**Основные сервисы:**

#### Config Services

**layoutService (`services/config/layoutService.ts`):**
Построение layout структуры из БД.

**Функции:**
- `buildLayoutFromDB()` - построение layout

**Процесс:**
1. Загрузка форматов из `config.formats`
2. Загрузка секций из `config.layouts`
3. Загрузка компонентов из `config.components`
4. Связывание через `config.layout_component_mapping`
5. Формирование JSON структуры

**Особенности:**
- Работа с `config` схемой PostgreSQL
- Динамическое построение структуры дашборда
- Фильтрация неактивных компонентов и форматов

#### Data Mart Services

Сервисы для работы с агрегированными данными:

**balanceService:**
- `getAssets()` - активы баланса
- `getLiabilities()` - обязательства баланса

**financialResultsService:**
- `getIncome()` - доходы
- `getExpenses()` - расходы

**kpiService (`services/mart/kpiService.ts`):**
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

**Base Services:**
- `periodService` - работа с периодами
- `calculationService` - расчеты (изменения, проценты)
- `componentService` - работа с компонентами
- `rowNameMapper` - маппинг названий строк

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
