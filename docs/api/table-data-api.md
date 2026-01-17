---
title: Table Data API
description: Документация API для получения данных таблиц
related:
  - /api/data-models
  - /api/examples
---

# Table Data API

API для получения данных таблиц с поддержкой группировки и фильтрации по периодам.

## Endpoint

### Получить данные таблицы

```http
GET /api/table-data/:tableId
```

**Path параметры:**
- `tableId` (string, required) - ID таблицы

**Query параметры:**
- `groupBy` (string, опционально) - Поле для группировки (например: 'cfo', 'client_segment', 'fot')
- `periodDate` (string, опционально) - Дата периода в формате `YYYY-MM-DD`
- `dateFrom` (string, опционально) - Начальная дата (для будущего использования)
- `dateTo` (string, опционально) - Конечная дата (для будущего использования)

## Поддерживаемые tableId

### Новые MART table IDs (рекомендуется)

- `financial_results_income` - Доходы финансовых результатов
- `financial_results_expenses` - Расходы финансовых результатов
- `balance_assets` - Активы баланса
- `balance_liabilities` - Обязательства баланса

### Legacy table IDs (поддерживаются для обратной совместимости)

- `income` → маппится на `financial_results_income`
- `income_structure` → маппится на `financial_results_income`
- `expenses` → маппится на `financial_results_expenses`
- `assets` → маппится на `balance_assets`
- `liabilities` → маппится на `balance_liabilities`

## Примеры запросов

### Базовый запрос

```bash
curl "http://localhost:3001/api/table-data/financial_results_income"
```

### С группировкой

```bash
curl "http://localhost:3001/api/table-data/financial_results_income?groupBy=cfo"
```

### С периодом

```bash
curl "http://localhost:3001/api/table-data/financial_results_income?periodDate=2024-01-15"
```

### Комбинированный запрос

```bash
curl "http://localhost:3001/api/table-data/financial_results_income?groupBy=client_segment&periodDate=2024-01-15"
```

## Структура ответа

```json
{
  "tableId": "financial_results_income",
  "rows": [
    {
      "id": "income_total",
      "name": "Доходы всего",
      "value": 1000000000,
      "percentage": 100,
      "change": 5.2,
      "changeYtd": 12.5,
      "isTotal": true,
      "sortOrder": 1
    },
    {
      "id": "interest_income",
      "name": "Процентные доходы",
      "value": 800000000,
      "percentage": 80,
      "change": 4.8,
      "parentId": "income_total",
      "sortOrder": 2
    }
  ],
  "groupBy": ["cfo"]
}
```

## Модель данных

### TableRowData

```typescript
interface TableRowData {
  id: string;              // Уникальный идентификатор строки
  name: string;            // Название строки
  description?: string;    // Описание
  value: number;          // Числовое значение
  percentage?: number;    // Процент от общего
  change?: number;        // Изменение в процентах
  changeYtd?: number;     // Изменение с начала года
  isGroup?: boolean;      // Является ли группой
  isTotal?: boolean;      // Является ли итоговой строкой
  parentId?: string;      // ID родительской строки
  sortOrder: number;      // Порядок сортировки
}
```

### TableData Response

```typescript
interface TableData {
  tableId: string;        // ID таблицы
  rows: TableRowData[];   // Массив строк данных
  groupBy?: string[];     // Примененные группировки
}
```

## Группировка данных

Группировка позволяет агрегировать данные по определенным полям. Доступные опции группировки зависят от таблицы и определяются в layout конфигурации через поле `groupableFields`.

### Примеры группировки

**По CFO:**
```bash
GET /api/table-data/financial_results_income?groupBy=cfo
```

**По сегменту клиентов:**
```bash
GET /api/table-data/financial_results_income?groupBy=client_segment
```

**По ФОТ:**
```bash
GET /api/table-data/financial_results_expenses?groupBy=fot
```

## Фильтрация по периоду

Параметр `periodDate` позволяет получить данные за конкретный период:

```bash
GET /api/table-data/financial_results_income?periodDate=2024-01-15
```

Формат даты: `YYYY-MM-DD`

## Обработка ошибок

### 400 - Неверный формат даты

```json
{
  "error": "Invalid periodDate format. Use YYYY-MM-DD"
}
```

### 404 - Таблица не найдена

```json
{
  "error": "Table data not found for tableId: unknown_table. Use MART table IDs: financial_results_income, financial_results_expenses, balance_assets, balance_liabilities"
}
```

### 500 - Внутренняя ошибка

```json
{
  "error": "Failed to fetch income data"
}
```

## Миграция с legacy IDs

Старые tableId автоматически маппятся на новые:

- `income` → `financial_results_income`
- `expenses` → `financial_results_expenses`
- `assets` → `balance_assets`
- `liabilities` → `balance_liabilities`

Рекомендуется использовать новые MART table IDs для лучшей производительности и функциональности.

## См. также

- [Data Models](/api/data-models) - детальные модели данных
- [Examples](/api/examples) - примеры использования
- [Layout API](/api/layout-api) - получение структуры layout
