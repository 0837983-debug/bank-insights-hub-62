---
title: Поток данных
description: Как данные проходят через систему от БД до UI
related:
  - /architecture/overview
  - /architecture/frontend
  - /architecture/backend
---

# Поток данных

Описание того, как данные проходят через систему от базы данных до пользовательского интерфейса.

## Общий поток

```
Database → Backend Service → API Route → HTTP Response → 
Frontend API Client → React Query → React Component → UI
```

## Детальный поток: KPI метрики

### 1. Инициация запроса

**Frontend:**
```typescript
const { data } = useAllKPIs();
```

**React Query:**
- Проверяет кэш
- Если данных нет или устарели → делает запрос

### 2. HTTP запрос

**API Client (`lib/api.ts`):**
```typescript
fetch('http://localhost:3001/api/kpis')
```

**Request:**
```
GET /api/kpis HTTP/1.1
Host: localhost:3001
```

### 3. Backend обработка

**Route (`routes/kpiRoutes.ts`):**
- Принимает запрос
- Извлекает query параметры (category, periodDate)
- Вызывает сервис

**Service (`services/mart/kpiService.ts`):**
- Определяет период (latest или указанный)
- SQL запрос к `mart.kpi_metrics`
- Расчет изменений (PPTD, YTD)
- Трансформация данных

**SQL запрос:**
```sql
SELECT 
  km.component_id,
  km.value,
  c.title,
  c.description
FROM mart.kpi_metrics km
JOIN config.components c ON km.component_id = c.id
WHERE km.period_date = $1
```

### 4. Формирование ответа

**Service возвращает:**
```typescript
[
  {
    id: "capital",
    title: "Капитал",
    value: 1500000000,
    change: 5.2,
    ytdChange: 12.5,
    ...
  }
]
```

**Route формирует JSON:**
```json
[
  {
    "id": "capital",
    "title": "Капитал",
    "value": 1500000000,
    "change": 5.2,
    "ytdChange": 12.5
  }
]
```

### 5. Frontend получение

**API Client:**
- Получает JSON
- Парсит ответ
- Возвращает данные

**React Query:**
- Кэширует данные
- Обновляет состояние
- Триггерит ре-рендер

### 6. Отображение

**React Component:**
- Получает данные из hook
- Рендерит `KPICard` компоненты
- Отображает в UI

## Детальный поток: Табличные данные

### 1. Инициация

**Frontend:**
```typescript
const { data } = useTableData('financial_results_income', {
  groupBy: 'cfo'
});
```

### 2. HTTP запрос

```
GET /api/table-data/financial_results_income?groupBy=cfo
```

### 3. Backend обработка

**Route:**
- Определяет tableId
- Проверяет маппинг legacy IDs
- Вызывает соответствующий сервис

**Service (`services/mart/financialResults/financialResultsService.ts`):**
- SQL запрос с группировкой
- Агрегация данных
- Формирование иерархии

**SQL запрос:**
```sql
SELECT 
  row_code,
  SUM(value) as value,
  cfo
FROM mart.financial_results
WHERE period_date = $1
GROUP BY row_code, cfo
```

### 4. Трансформация

**Service:**
- Группировка по полю
- Расчет процентов
- Формирование иерархии (группы, подгруппы)

**Ответ:**
```json
{
  "tableId": "financial_results_income",
  "rows": [
    {
      "id": "income_total",
      "name": "Доходы всего",
      "value": 1000000000,
      "isTotal": true
    }
  ],
  "groupBy": ["cfo"]
}
```

### 5. Frontend обработка

**Component:**
- Трансформация данных для таблицы
- Применение форматирования
- Рендеринг `FinancialTable`

## Детальный поток: Layout

### 1. Инициация

**Frontend:**
```typescript
const { data } = useLayout();
```

### 2. HTTP запрос

```
GET /api/layout
```

### 3. Backend обработка

**Service (`services/config/layoutService.ts`):**
- Загрузка форматов из `config.formats`
- Загрузка секций из `config.layouts`
- Загрузка компонентов из `config.components`
- Связывание через `config.layout_component_mapping`
- Построение JSON структуры

**SQL запросы:**
```sql
-- Форматы
SELECT * FROM config.formats WHERE id IN (...);

-- Секции
SELECT * FROM config.layouts WHERE id = $1;

-- Компоненты
SELECT c.* FROM config.components c
JOIN config.layout_component_mapping lcm ON c.id = lcm.component_id
WHERE lcm.layout_id = $1;
```

### 4. Формирование структуры

**Service строит:**
```json
{
  "formats": {
    "currency_rub": { ... }
  },
  "sections": [
    {
      "id": "balance",
      "title": "Баланс",
      "components": [
        {
          "id": "capital_card",
          "type": "card",
          "dataSourceKey": "capital",
          ...
        }
      ]
    }
  ]
}
```

### 5. Frontend использование

**DynamicDashboard:**
- Получает layout
- Итерирует по секциям
- Рендерит компоненты динамически
- Загружает данные для каждого компонента

## Кэширование

### React Query кэш

**Настройки:**
- Layout: 5 минут (production)
- KPIs: 1 минута (production)
- Table Data: 1 минута
- В dev режиме: 0 (всегда свежие данные)

**Преимущества:**
- Меньше запросов к серверу
- Быстрый отклик UI
- Фоновое обновление

### Database кэш

PostgreSQL использует:
- Buffer cache для часто используемых данных
- Query plan cache для оптимизации

## Оптимизация

### 1. Data Mart

Агрегированные данные предварительно рассчитаны:
- Быстрые запросы
- Меньше вычислений на лету

### 2. Индексы

Индексы на часто используемых полях:
- Быстрый поиск
- Оптимизированные JOIN

### 3. Connection Pooling

Переиспользование соединений:
- Меньше overhead
- Эффективное использование ресурсов

## Обработка ошибок

### Backend

- Валидация входных данных
- Try-catch блоки
- Стандартизированные ошибки

### Frontend

- React Query автоматически обрабатывает ошибки
- Отображение fallback UI
- Retry механизм

## См. также

- [Общая архитектура](/architecture/overview) - обзор системы
- [Frontend архитектура](/architecture/frontend) - детали frontend
- [Backend архитектура](/architecture/backend) - детали backend
