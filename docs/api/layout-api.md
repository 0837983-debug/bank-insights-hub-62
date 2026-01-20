---
title: Layout API
description: Документация API для получения структуры layout дашборда
---

# Layout API

API для получения структуры layout дашборда из базы данных.

::: danger Endpoint удален
Старый endpoint `GET /api/layout` был удален и больше не доступен (возвращает 404). Используйте новый endpoint через `/api/data` (см. ниже).
:::

## Endpoint

### Получить layout через `/api/data`

```http
GET /api/data?query_id=layout&component_Id=layout&parametrs={"layout_id":"main_dashboard"}
```

**Query параметры (обязательные):**
- `query_id` (string) - Должен быть `"layout"`
- `component_Id` (string) - Должен быть `"layout"`

**Query параметры (опциональные):**
- `parametrs` (string) - JSON строка с параметрами:
  - `layout_id` (string, опционально) - ID конкретного layout (по умолчанию используется дефолтный layout)

**Пример запроса:**
```bash
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D"
```

**Пример без параметров (используется дефолтный layout):**
```bash
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%7D"
```

## Структура ответа

Новый endpoint возвращает структуру `{ sections: [...] }`, где `formats` и `header` находятся внутри секций:

```json
{
  "sections": [
    {
      "id": "formats",
      "title": "Formats",
      "formats": {
        "currency_rub": {
          "id": "currency_rub",
          "name": "Рубли",
          "kind": "currency",
          "prefix_unit_symbol": "₽",
          "thousand_separator": true,
          "minimum_fraction_digits": 0,
          "maximum_fraction_digits": 0
        },
        "percent": {
          "id": "percent",
          "name": "Проценты",
          "kind": "percent",
          "suffix_unit_symbol": "%",
          "minimum_fraction_digits": 1,
          "maximum_fraction_digits": 2
        }
      }
    },
    {
      "id": "header",
      "title": "Компонент header для отображения дат периодов.",
      "components": [
        {
          "id": "main_dashboard::header::header",
          "componentId": "header",
          "type": "header",
          "title": "Компонент header для отображения дат периодов.",
          "dataSourceKey": "header_dates",
          "icon": null,
          "label": "Компонент header для отображения дат периодов.",
          "tooltip": null
        }
      ]
    },
    {
      "id": "section_balance",
      "title": "Баланс",
      "components": [
        {
          "id": "main_dashboard::section_balance::capital_card",
          "componentId": "capital_card",
          "type": "card",
          "title": "Капитал",
          "tooltip": "Собственный капитал банка",
          "icon": "Landmark",
          "dataSourceKey": "capital",
          "format": {
            "value": "currency_rub",
            "PPTD": "percent",
            "YTD": "percent"
          }
        },
        {
          "id": "main_dashboard::section_balance::balance_table",
          "componentId": "balance_table",
          "type": "table",
          "title": "Баланс",
          "dataSourceKey": "balance_assets",
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
    },
    {
      "id": "section_financial_results",
      "title": "Финансовые результаты",
      "components": [...]
    }
  ]
}
```

**Важно:**
- `formats` находятся в секции с `id="formats"`: `sections.find(s => s.id === "formats").formats`
- `header` находится в секции с `id="header"`: `sections.find(s => s.id === "header").components[0]`
- Контентные секции (без `formats` и `header`): `sections.filter(s => s.id !== "formats" && s.id !== "header")`


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

### TypeScript (новый endpoint)

```typescript
async function fetchLayout(layoutId: string = "main_dashboard") {
  const paramsJson = JSON.stringify({ layout_id: layoutId });
  const queryString = new URLSearchParams({
    query_id: "layout",
    component_Id: "layout",
    parametrs: paramsJson
  }).toString();
  
  const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
  const data = await response.json();
  
  // Извлечение formats и header из секций
  const formatsSection = data.sections.find((s: any) => s.id === "formats");
  const headerSection = data.sections.find((s: any) => s.id === "header");
  const contentSections = data.sections.filter(
    (s: any) => s.id !== "formats" && s.id !== "header"
  );
  
  return {
    formats: formatsSection?.formats || {},
    header: headerSection?.components[0],
    sections: contentSections
  };
}
```

### React Hook (новый endpoint)

```typescript
import { useQuery } from '@tanstack/react-query';

function useLayout(layoutId: string = "main_dashboard") {
  return useQuery({
    queryKey: ['layout', layoutId],
    queryFn: async () => {
      const paramsJson = JSON.stringify({ layout_id: layoutId });
      const queryString = new URLSearchParams({
        query_id: "layout",
        component_Id: "layout",
        parametrs: paramsJson
      }).toString();
      
      const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
      const data = await response.json();
      
      // Извлечение formats и header из секций
      const formatsSection = data.sections.find((s: any) => s.id === "formats");
      const headerSection = data.sections.find((s: any) => s.id === "header");
      const contentSections = data.sections.filter(
        (s: any) => s.id !== "formats" && s.id !== "header"
      );
      
      return {
        formats: formatsSection?.formats || {},
        header: headerSection?.components[0],
        sections: contentSections
      };
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
