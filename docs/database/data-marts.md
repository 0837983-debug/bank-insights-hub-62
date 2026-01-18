---
title: Data Marts
description: Структура Data Mart для агрегированных данных
related:
  - /database/schemas
  - /architecture/backend
---

# Data Marts

Структура Data Mart схемы для хранения агрегированных данных.

## Концепция Data Mart

Data Mart - схема с агрегированными и предварительно рассчитанными данными для быстрого чтения через API.

**Преимущества:**
- Оптимизированные запросы к БД
- Предварительно рассчитанные метрики на backend
- Быстрый доступ к данным для API
- Разделение чтения и записи

## Структура mart схемы

### mart.kpi_metrics

Универсальная таблица для всех KPI метрик.

**Структура:**
```sql
CREATE TABLE mart.kpi_metrics (
  id INTEGER PRIMARY KEY,
  component_id VARCHAR(200) NOT NULL,  -- Ссылка на config.components.id
  period_date DATE NOT NULL,
  value NUMERIC(18,6) NOT NULL,
  UNIQUE(component_id, period_date)
);
```

**Назначение:**
- Хранение значений KPI метрик по периодам
- Связь с config.components через component_id
- Поддержка временных срезов (period_date)

**Использование:**
- В `kpiService.ts` для получения метрик
- Расчет изменений (ppChange, ytdChange) на backend
- Расчет процентов от общего

### mart.balance

Данные баланса с иерархией статей и аналитическими разрезами.

**Структура:**
```sql
CREATE TABLE mart.balance (
  id INTEGER PRIMARY KEY,
  table_component_id VARCHAR(200) NOT NULL,  -- Ссылка на config.components.id
  row_code VARCHAR(100) NOT NULL,
  period_date DATE NOT NULL,
  value NUMERIC(20,2) NOT NULL,
  
  -- Иерархия (что учитываем)
  class VARCHAR(50) NOT NULL,      -- assets, liabilities, equity
  section VARCHAR(100),            -- Раздел баланса
  item VARCHAR(200),               -- Статья
  sub_item VARCHAR(200),           -- Подстатья
  
  -- Аналитика (как анализируем)
  client_type VARCHAR(50),
  client_segment VARCHAR(100),
  product_code VARCHAR(100),
  portfolio_code VARCHAR(100),
  currency_code VARCHAR(10) DEFAULT 'RUB',
  maturity_bucket VARCHAR(50),
  interest_type VARCHAR(50),
  collateral_type VARCHAR(100),
  risk_class VARCHAR(50),
  org_unit_code VARCHAR(100),
  region VARCHAR(100),
  
  UNIQUE(table_component_id, row_code, period_date, ...)
);
```

**Назначение:**
- Хранение данных баланса (активы, пассивы, капитал)
- Поддержка иерархии через поля class, section, item, sub_item
- Множественные аналитические разрезы для группировки

**Использование:**
- В `balanceService.ts` для получения активов и обязательств
- Расчет метрик (ppChange, ytdChange, percentage) на backend
- Возврат плоских строк с иерархией

### mart.financial_results

Финансовые результаты (P&L).

**Структура:**
```sql
CREATE TABLE mart.financial_results (
  id INTEGER PRIMARY KEY,
  table_component_id VARCHAR(200) NOT NULL,
  row_code VARCHAR(100) NOT NULL,
  period_date DATE NOT NULL,
  value NUMERIC(20,2) NOT NULL,
  
  -- Иерархия
  report_class VARCHAR(50) NOT NULL,  -- income, expense
  pl_section VARCHAR(100),            -- Раздел P&L
  line_item VARCHAR(200),             -- Статья
  sub_line_item VARCHAR(200),         -- Подстатья
  
  -- Аналитика
  cfo_code VARCHAR(100),
  product_code VARCHAR(100),
  client_segment VARCHAR(100),
  channel VARCHAR(100),
  region VARCHAR(100),
  project_code VARCHAR(100),
  currency_code VARCHAR(10) DEFAULT 'RUB',
  
  UNIQUE(...)
);
```

**Назначение:**
- Хранение данных финансовых результатов (доходы, расходы)
- Иерархия через report_class, pl_section, line_item, sub_line_item
- Аналитические разрезы для группировки

**Использование:**
- В `financialResultsService.ts` для получения доходов и расходов
- Расчет метрик на backend
- Группировка по аналитическим разрезам

## Как данные попадают в Data Mart

### 1. SQL миграции

Начальные данные загружаются через миграции:
- `011_insert_test_data_mart.sql` - тестовые данные

### 2. ETL процессы (будущее)

Регулярное обновление данных:
- Загрузка из источников
- Расчет агрегаций
- Обновление mart таблиц

### 3. Скрипты загрузки

Временная загрузка через скрипты:
```bash
npm run load-data
```

## Использование Data Mart в API

### Пример: Получение KPI метрик

**Backend (`kpiService.ts`):**
```typescript
// Запрос к mart.kpi_metrics
const query = `
  SELECT 
    km.component_id,
    km.value,
    km.period_date,
    c.title,
    c.description
  FROM mart.kpi_metrics km
  JOIN config.components c ON km.component_id = c.id
  WHERE km.period_date = $1
`;

// Расчет изменений на backend
const ppChange = calculateChange(currentValue, previousValue);
const ytdChange = calculateChange(currentValue, ytdValue);
const percentage = calculatePercentage(currentValue, total);
```

**Frontend:**
- Получает готовые значения с рассчитанными метриками
- Только форматирует для отображения
- Не делает расчеты

### Пример: Получение баланса

**Backend (`balanceService.ts`):**
```typescript
// Запрос к mart.balance
// Расчет метрик на backend
// Возврат плоских строк с иерархией через поля (class, section, item, sub_item)
```

**Frontend:**
- Получает плоские строки
- Строит иерархию из полей (transformTableData)
- Пересчитывает метрики для групп (агрегация)

## Оптимизация

### Индексы

Все таблицы имеют индексы для оптимизации:
- По внешним ключам (component_id, table_component_id)
- По датам (period_date) для временных запросов
- По аналитическим разрезам для группировки
- Составные индексы для частых комбинаций

### Партиционирование (будущее)

При большом объеме данных можно использовать партиционирование по:
- `period_date` - по периодам
- `component_id` - по компонентам

## См. также

- [Схемы БД](/database/schemas) - детальное описание всех таблиц
- [Миграции](/database/migrations) - работа с миграциями
- [Backend архитектура](/architecture/backend) - использование Data Mart в сервисах
