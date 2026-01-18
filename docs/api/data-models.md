---
title: Модели данных
description: TypeScript интерфейсы и структуры данных API
related:
  - /api/endpoints
  - /api/kpi-api
  - /api/table-data-api
  - /api/layout-api
---

# Модели данных

Полное описание всех моделей данных, используемых в API.

## KPI Metric

Модель данных для KPI метрик. Все расчетные поля вычисляются на backend.

```typescript
interface KPIMetric {
  id: string;              // Уникальный идентификатор метрики
  title: string;           // Название метрики (из config.components)
  value: number;           // Числовое значение (из mart.kpi_metrics)
  previousValue: number;   // Значение предыдущего периода (рассчитано на backend)
  ytdValue?: number;       // Значение на конец прошлого года (рассчитано на backend)
  ppChange: number;        // Изменение относительно предыдущего периода в долях (0.05 = 5%) (рассчитано на backend)
  ppChangeAbsolute?: number; // Абсолютное изменение относительно предыдущего периода (рассчитано на backend)
  ytdChange?: number;      // Изменение YTD в долях (0.12 = 12%) (рассчитано на backend)
  ytdChangeAbsolute?: number; // Абсолютное изменение YTD (рассчитано на backend)
  description?: string;    // Описание метрики (из config.components)
  category: string;        // Категория метрики (из config.components)
  categoryId: string;      // ID категории
  iconName?: string;       // Название иконки (Lucide, из config.components)
  sortOrder: number;       // Порядок сортировки
  periodDate: string;      // Дата периода (YYYY-MM-DD)
}
```

**Пример JSON:**
```json
{
  "id": "capital",
  "title": "Капитал",
  "value": 1500000000,
  "description": "Собственный капитал банка",
  "change": 5.2,
  "ytdChange": 12.5,
  "category": "balance",
  "categoryId": "balance",
  "iconName": "Landmark",
  "sortOrder": 1
}
```

## Table Row Data

Модель данных для строк таблиц. Все расчетные поля вычисляются на backend.

```typescript
interface TableRowData {
  // Иерархические поля (для построения дерева на фронте)
  class?: string;          // Класс (баланс: assets/liabilities, P&L: income/expense)
  section?: string;        // Раздел
  item?: string;           // Статья
  sub_item?: string;       // Подстатья
  
  // Значения (рассчитаны на backend)
  value: number;           // Числовое значение
  previousValue?: number;  // Значение предыдущего периода (рассчитано на backend)
  ytdValue?: number;       // Значение на конец прошлого года (рассчитано на backend)
  percentage?: number;     // Процент от общего в долях (0.8 = 80%) (рассчитано на backend)
  ppChange?: number;       // Изменение относительно предыдущего периода в долях (0.05 = 5%) (рассчитано на backend)
  ppChangeAbsolute?: number; // Абсолютное изменение относительно предыдущего периода (рассчитано на backend)
  ytdChange?: number;      // Изменение YTD в долях (0.12 = 12%) (рассчитано на backend)
  ytdChangeAbsolute?: number; // Абсолютное изменение YTD (рассчитано на backend)
  
  // Аналитические разрезы
  client_type?: string;
  client_segment?: string;
  product_code?: string;
  portfolio_code?: string;
  currency_code?: string;
  
  // Служебные поля
  id: string;              // Уникальный идентификатор строки
  period_date?: string;    // Дата периода
  description?: string;    // Описание (из rowNameMapper)
  parentId?: string;       // ID родительской строки (для иерархии, добавляется на фронте)
  isGroup?: boolean;       // Является ли группой (добавляется на фронте при построении иерархии)
  isTotal?: boolean;       // Является ли итоговой строкой
  sortOrder?: number;      // Порядок сортировки
}
```

**Пример JSON:**
```json
{
  "id": "interest_income",
  "name": "Процентные доходы",
  "description": "Доходы от процентных операций",
  "value": 800000000,
  "percentage": 80,
  "change": 4.8,
  "changeYtd": 11.2,
  "isGroup": false,
  "parentId": "income_total",
  "sortOrder": 2
}
```

## Table Data Response

Ответ API для данных таблиц.

```typescript
interface TableData {
  tableId: string;        // ID таблицы
  rows: TableRowData[];   // Массив строк данных
  requestedPeriod?: string; // Запрошенный период
  groupBy?: string[];     // Примененные группировки
}
```

**Пример JSON:**
```json
{
  "tableId": "financial_results_income",
  "rows": [
    {
      "id": "income_total",
      "name": "Доходы всего",
      "value": 1000000000,
      "isTotal": true,
      "sortOrder": 1
    }
  ],
  "groupBy": ["cfo"]
}
```

## Layout Models

### Layout Format

Формат отображения значений.

```typescript
interface LayoutFormat {
  kind: string;                    // Тип формата: 'currency', 'percentage', 'number'
  prefixUnitSymbol?: string;       // Префикс (например, '₽')
  suffixUnitSymbol?: string;       // Суффикс (например, '%')
  minimumFractionDigits?: number;  // Минимум знаков после запятой
  maximumFractionDigits?: number;  // Максимум знаков после запятой
  thousandSeparator?: boolean;     // Разделитель тысяч
  shorten?: boolean;               // Сокращение больших чисел (1K, 1M)
}
```

**Пример JSON:**
```json
{
  "currency_rub": {
    "kind": "currency",
    "prefixUnitSymbol": "₽",
    "minimumFractionDigits": 0,
    "maximumFractionDigits": 2,
    "thousandSeparator": true
  },
  "percentage": {
    "kind": "percentage",
    "suffixUnitSymbol": "%",
    "minimumFractionDigits": 1,
    "maximumFractionDigits": 2
  }
}
```

### Layout Filter

Фильтр для layout.

```typescript
interface LayoutFilter {
  group: string;                  // Группа фильтров
  items: Array<{
    id: string;                   // ID фильтра
    label: string;                // Название фильтра
    type: string;                 // Тип: 'date', 'select', 'text'
    params?: Record<string, unknown>; // Параметры (например, options для select)
  }>;
}
```

**Пример JSON:**
```json
{
  "group": "period",
  "items": [
    {
      "id": "dateFrom",
      "label": "Дата начала",
      "type": "date"
    },
    {
      "id": "dateTo",
      "label": "Дата окончания",
      "type": "date"
    }
  ]
}
```

### Layout Component

Компонент в layout.

```typescript
interface LayoutComponent {
  id: string;                     // Уникальный ID компонента
  type: "card" | "table" | "chart"; // Тип компонента
  title: string;                  // Заголовок
  tooltip?: string;               // Подсказка
  icon?: string;                  // Название иконки
  dataSourceKey: string;         // Ключ источника данных
  format?: Record<string, string>; // Форматы (ссылки на LayoutFormat)
  compactDisplay?: boolean;       // Компактное отображение
  columns?: Array<{               // Колонки (для таблиц)
    id: string;
    label: string;
    type: string;
    isDimension?: boolean;        // Является ли измерением
    isMeasure?: boolean;          // Является ли метрикой
    format?: Record<string, string>;
  }>;
  groupableFields?: string[];     // Поля для группировки
}
```

**Пример JSON (Card):**
```json
{
  "id": "capital_card",
  "type": "card",
  "title": "Капитал",
  "tooltip": "Собственный капитал банка",
  "icon": "Landmark",
  "dataSourceKey": "capital",
  "format": {
    "value": "currency_rub"
  },
  "compactDisplay": false
}
```

**Пример JSON (Table):**
```json
{
  "id": "income_table",
  "type": "table",
  "title": "Структура доходов",
  "dataSourceKey": "financial_results_income",
  "groupableFields": ["cfo", "client_segment"],
  "columns": [
    {
      "id": "name",
      "label": "Наименование",
      "type": "text",
      "isDimension": true
    },
    {
      "id": "value",
      "label": "Значение",
      "type": "number",
      "isMeasure": true,
      "format": {
        "value": "currency_rub"
      }
    }
  ]
}
```

### Layout Section

Секция в layout.

```typescript
interface LayoutSection {
  id: string;                     // Уникальный ID секции
  title: string;                  // Заголовок секции
  components: LayoutComponent[];   // Компоненты в секции
}
```

**Пример JSON:**
```json
{
  "id": "balance",
  "title": "Баланс",
  "components": [
    {
      "id": "capital_card",
      "type": "card",
      "title": "Капитал",
      "dataSourceKey": "capital"
    }
  ]
}
```

### Layout

Полная структура layout.

```typescript
interface Layout {
  formats: Record<string, LayoutFormat>; // Форматы отображения
  filters?: LayoutFilter[];              // Фильтры (опционально)
  sections: LayoutSection[];             // Секции с компонентами
}
```

**Пример JSON:**
```json
{
  "formats": {
    "currency_rub": {
      "kind": "currency",
      "prefixUnitSymbol": "₽"
    }
  },
  "sections": [
    {
      "id": "balance",
      "title": "Баланс",
      "components": []
    }
  ]
}
```

## Health Status

Статус здоровья API.

```typescript
interface HealthStatus {
  status: string;    // Статус: 'ok', 'error'
  message: string;   // Сообщение
}
```

**Пример JSON:**
```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

## API Error

Структура ошибки API.

```typescript
interface APIError {
  error: string;     // Описание ошибки
}
```

**Пример JSON:**
```json
{
  "error": "Table data not found for tableId: unknown_table"
}
```

## Использование в TypeScript

Все модели определены в `src/lib/api.ts` и могут быть импортированы:

```typescript
import type {
  KPIMetric,
  TableData,
  TableRowData,
  Layout,
  LayoutComponent,
  LayoutSection,
  LayoutFormat
} from '@/lib/api';
```

## См. также

- [API Endpoints](/api/endpoints) - все endpoints
- [KPI API](/api/kpi-api) - работа с KPI
- [Table Data API](/api/table-data-api) - работа с таблицами
- [Layout API](/api/layout-api) - работа с layout
