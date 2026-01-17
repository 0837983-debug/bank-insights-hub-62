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

### Component

```typescript
// Card component
interface CardComponent {
  id: string;
  type: 'card';
  title: string;
  tooltip?: string;
  icon?: string;
  dataSourceKey: string;
  format: {
    value: string; // Reference to format key
  };
}

// Table component
interface TableComponent {
  id: string;
  type: 'table';
  title: string;
  dataSourceKey: string;
  columns: Column[];
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
