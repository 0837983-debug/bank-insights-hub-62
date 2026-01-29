---
title: Data Marts
description: Структура Data Mart для агрегированных данных
related:
  - /database/schemas
  - /architecture/backend/
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
- Через `/api/data?query_id=kpis` (SQL Builder использует view `mart.kpis_view`)
- API возвращает только сырые значения (value, previousValue, ytdValue)
- Расчет изменений (ppChange, ytdChange) выполняется на фронтенде через `calculatePercentChange()`

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
- Через `/api/data?query_id=assets_table` или `/api/data?query_id=liabilities_table` (SQL Builder)
- API возвращает только сырые значения (value, previousValue, ytdValue)
- Расчет метрик (ppChange, ytdChange) выполняется на фронтенде через `calculatePercentChange()`
- Возврат плоских строк с иерархией (class, section, item, sub_item)

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

Все данные получаются через единый endpoint `/api/data` с использованием SQL Builder.

### Пример: Получение KPI метрик

**Frontend:**
```typescript
// Запрос к /api/data
const response = await fetch('/api/data?query_id=kpis&component_Id=kpis&parametrs={}');
const kpis = await response.json(); // [{ id, periodDate, value, previousValue, ytdValue }]
```

**Backend (`dataRoutes.ts`):**
```typescript
// SQL Builder загружает конфиг из config.component_queries где query_id='kpis'
// Строит SQL запрос через view mart.kpis_view
// Выполняет SQL и трансформирует данные
// Возвращает только сырые значения (value, previousValue, ytdValue)
```

**Frontend (расчеты):**
```typescript
import { calculatePercentChange } from '@/lib/calculations';

// Расчет изменений на фронтенде
const kpiWithChanges = kpis.map(kpi => {
  const changes = calculatePercentChange(kpi.value, kpi.previousValue, kpi.ytdValue);
  return {
    ...kpi,
    ppChange: changes.ppPercent,
    ppChangeAbsolute: changes.ppDiff,
    ytdChange: changes.ytdPercent,
    ytdChangeAbsolute: changes.ytdDiff,
  };
});
```

### Пример: Получение баланса

**Frontend:**
```typescript
// Запрос к /api/data
const response = await fetch('/api/data?query_id=assets_table&component_Id=assets_table&parametrs={"p1":"2025-12-31","class":"assets"}');
const data = await response.json(); // { componentId, type: "table", rows: [...] }
```

**Backend (`dataRoutes.ts`):**
```typescript
// SQL Builder загружает конфиг из config.component_queries где query_id='assets_table'
// Строит SQL запрос к mart.balance с подстановкой параметров
// Выполняет SQL и трансформирует данные (добавляет id, sortOrder)
// Возвращает только сырые значения (value, previousValue, ytdValue)
```

**Frontend (расчеты):**
```typescript
import { calculatePercentChange } from '@/lib/calculations';

// Расчет изменений на фронтенде для каждой строки
const rowsWithChanges = data.rows.map(row => {
  const changes = calculatePercentChange(row.value, row.previousValue, row.ytdValue);
  return {
    ...row,
    ppChange: changes.ppPercent,
    ppChangeAbsolute: changes.ppDiff,
    ytdChange: changes.ytdPercent,
    ytdChangeAbsolute: changes.ytdDiff,
  };
});
```

**Backend (SQL Builder):**
```typescript
// Запрос к mart.balance (строится из конфига)
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
- [Backend архитектура](/architecture/backend/) - использование Data Mart в сервисах
