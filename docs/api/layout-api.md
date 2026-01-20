---
title: Layout API
description: Документация API для получения структуры layout дашборда
---

# Layout API

API для получения структуры layout дашборда из базы данных.

## Endpoint

### Получить layout

```http
GET /api/layout
```

**Query параметры:**
- `layout_id` (string, опционально) - ID конкретного layout

**Пример запроса:**
```bash
curl "http://localhost:3001/api/layout"
curl "http://localhost:3001/api/layout?layout_id=main"
```

## Структура ответа

```json
{
  "formats": {
    "currency_rub": {
      "type": "currency",
      "currency": "RUB",
      "locale": "ru-RU"
    },
    "percentage": {
      "type": "percentage",
      "decimals": 2
    }
  },
  "header": {
    "id": "header",
    "type": "header",
    "title": "Header",
    "dataSourceKey": "header_dates"
  },
  "sections": [
    {
      "id": "balance",
      "title": "Баланс",
      "components": [
        {
          "id": "capital_card",
          "type": "card",
          "title": "Капитал",
          "tooltip": "Собственный капитал банка",
          "icon": "Landmark",
          "dataSourceKey": "capital",
          "format": {
            "value": "currency_rub"
          }
        },
        {
          "id": "balance_table",
          "type": "table",
          "title": "Баланс",
          "dataSourceKey": "balance_assets",
          "columns": [
            {
              "id": "name",
              "label": "Наименование",
              "type": "text"
            },
            {
              "id": "value",
              "label": "Значение",
              "type": "number",
              "format": {
                "value": "currency_rub"
              }
            }
          ],
          "buttons": [
            {
              "id": "button_balance_table_cfo",
              "type": "button",
              "title": "ЦФО",
              "dataSourceKey": "balance_assets",
              "settings": {
                "fieldId": "cfo",
                "groupBy": "cfo"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Структура данных

### Layout

```typescript
interface Layout {
  formats: Record<string, Format>;
  header?: HeaderComponent; // Опционально, если header есть в layout
  sections: Section[];
}
```

### Format

```typescript
interface Format {
  type: 'currency' | 'percentage' | 'number';
  currency?: string;
  locale?: string;
  decimals?: number;
}
```

### Section

```typescript
interface Section {
  id: string;
  title: string;
  components: Component[];
}
```

### Header Component

```typescript
interface HeaderComponent {
  id: string;
  type: 'header';
  title: string;
  dataSourceKey: string; // Ссылка на query_id в config.component_queries (например, 'header_dates')
}
```

**Назначение:** Компонент header для отображения дат периодов. Получает данные через `/api/data` endpoint с `query_id = dataSourceKey`.

**Пример:**
- `dataSourceKey: 'header_dates'` → запрос к `/api/data` с `query_id: 'header_dates'`
- Результат: `{ data: [{ current: '2025-08-01' }] }` - максимальная дата периода из `mart.kpi_metrics`

### Component

```typescript
// Header component
interface HeaderComponent {
  id: string;
  type: 'header';
  title: string;
  dataSourceKey: string; // Ссылка на query_id в config.component_queries
}

// Card component
interface CardComponent {
  id: string;
  type: 'card';
  title: string;
  tooltip?: string;
  icon?: string;
  dataSourceKey?: string; // Опционально, если используется getData endpoint
  format: {
    value: string; // Reference to format key
  };
}

// Table component
interface TableComponent {
  id: string;
  type: 'table';
  title: string;
  dataSourceKey?: string; // Опционально, если используется getData endpoint
  columns: Column[];
  buttons?: ButtonComponent[]; // Кнопки для группировки (заменяют groupableFields)
}

// Button component
interface ButtonComponent {
  id: string;
  type: 'button';
  title: string;
  label?: string;
  tooltip?: string;
  icon?: string;
  dataSourceKey?: string; // query_id таблицы для получения данных
  settings?: {
    fieldId: string; // ID поля для группировки
    groupBy: string; // Параметр groupBy для запроса
  };
}

interface Column {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date';
  format?: {
    value: string; // Reference to format key
  };
}
```

## dataSourceKey

Поле `dataSourceKey` связывает компонент с запросом в `config.component_queries`.

**Использование:**
- Если компонент имеет `dataSourceKey`, данные получаются через `/api/data` endpoint
- `dataSourceKey` соответствует `query_id` в таблице `config.component_queries`
- Параметры запроса передаются через `params` в `/api/data`

**Примеры:**
- `header` компонент: `dataSourceKey: 'header_dates'` → `/api/data` с `query_id: 'header_dates'`
- `assets_table` компонент: `dataSourceKey: 'assets_table'` → `/api/data` с `query_id: 'assets_table'` и `params: { p1: '2025-08-01', class: 'assets' }`

**См. также:** [Get Data API](/api/get-data) - детальное описание `/api/data` endpoint

## Примеры использования

### TypeScript

```typescript
async function fetchLayout(layoutId?: string) {
  const url = layoutId
    ? `http://localhost:3001/api/layout?layout_id=${layoutId}`
    : 'http://localhost:3001/api/layout';
  
  const response = await fetch(url);
  const layout = await response.json();
  return layout;
}
```

### React Hook

```typescript
import { useQuery } from '@tanstack/react-query';

function useLayout(layoutId?: string) {
  return useQuery({
    queryKey: ['layout', layoutId],
    queryFn: async () => {
      const url = layoutId
        ? `http://localhost:3001/api/layout?layout_id=${layoutId}`
        : 'http://localhost:3001/api/layout';
      const response = await fetch(url);
      return response.json();
    }
  });
}
```

## Обработка ошибок

### 500 - Внутренняя ошибка

```json
{
  "error": "Failed to load layout data"
}
```

## См. также

- [Сравнение Layout API](/guides/layout-comparison) - сравнение с мокапом
- [Table Data API](/api/table-data-api) - получение данных для таблиц
