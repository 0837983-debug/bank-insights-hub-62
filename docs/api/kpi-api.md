---
title: KPI API
description: Документация API для работы с KPI метриками
---

# KPI API

API для работы с KPI (Key Performance Indicators) метриками.

::: danger Endpoint удален
Старый endpoint `GET /api/kpis` был удален и больше не доступен (возвращает 404). Используйте новый endpoint через `/api/data` (см. ниже).
:::

## Endpoint

### Получить все KPI метрики через `/api/data`

```http
GET /api/data?query_id=kpis&component_Id=kpis&parametrs={"category":"finance","periodDate":"2024-01-15"}
```

**Query параметры (обязательные):**
- `query_id` (string) - Должен быть `"kpis"`
- `component_Id` (string) - Должен быть `"kpis"`

**Query параметры (опциональные):**
- `parametrs` (string) - JSON строка с параметрами:
  - `category` (string, опционально) - Фильтр по категории
  - `periodDate` (string, опционально) - Дата периода в формате `YYYY-MM-DD`

**Пример запроса:**
```bash
curl "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=%7B%7D"
curl "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=%7B%22category%22%3A%22finance%22%7D"
curl "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=%7B%22periodDate%22%3A%222024-01-15%22%7D"
```

**Пример ответа:**
```json
[
  {
    "id": "capital",
    "title": "Капитал",
    "value": "1500000000",
    "description": "Собственный капитал банка",
    "change": 5.2,
    "ytdChange": 12.5,
    "category": "balance",
    "categoryId": "balance",
    "iconName": "Landmark",
    "sortOrder": 1
  }
]
```

::: warning Получение конкретной метрики
Для получения конкретной KPI метрики по ID используйте фильтрацию на клиенте из массива всех метрик, возвращаемых endpoint `/api/data?query_id=kpis`.
:::

## Модель данных

### KPI Metric

```typescript
interface KPIMetric {
  id: string;              // Уникальный идентификатор
  title: string;           // Название метрики
  value: string;           // Значение (форматированная строка)
  description?: string;    // Описание
  change?: number;         // Изменение в процентах
  ytdChange?: number;      // Изменение с начала года
  category: string;        // Название категории
  categoryId: string;      // ID категории
  iconName?: string;       // Название иконки (Lucide)
  sortOrder: number;       // Порядок сортировки
}
```

## Примеры использования

### TypeScript

```typescript
// Получить все KPI метрики
async function fetchKPIs(category?: string, periodDate?: string) {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (periodDate) params.periodDate = periodDate;
  
  const paramsJson = JSON.stringify(params);
  const queryString = new URLSearchParams({
    query_id: "kpis",
    component_Id: "kpis",
    parametrs: paramsJson
  }).toString();
  
  const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
  const kpis = await response.json();
  return kpis; // Массив KPIMetric[]
}

// Получить конкретную метрику по ID
async function fetchKPIMetric(id: string, periodDate?: string) {
  const params: Record<string, string> = {};
  if (periodDate) params.periodDate = periodDate;
  
  const paramsJson = JSON.stringify(params);
  const queryString = new URLSearchParams({
    query_id: "kpis",
    component_Id: "kpis",
    parametrs: paramsJson
  }).toString();
  
  const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
  const kpis = await response.json();
  return kpis.find((kpi: any) => kpi.id === id);
}
```

### React Hook

```typescript
import { useQuery } from '@tanstack/react-query';

function useKPIs(category?: string, periodDate?: string) {
  return useQuery({
    queryKey: ['kpis', category, periodDate],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (periodDate) params.periodDate = periodDate;
      
      const paramsJson = JSON.stringify(params);
      const queryString = new URLSearchParams({
        query_id: "kpis",
        component_Id: "kpis",
        parametrs: paramsJson
      }).toString();
      
      const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
      return response.json();
    }
  });
}
```

## Обработка ошибок

### 404 - Метрика не найдена

```json
{
  "error": "KPI metric not found"
}
```

### 400 - Неверный формат даты

```json
{
  "error": "Invalid periodDate format. Use YYYY-MM-DD"
}
```

### 500 - Внутренняя ошибка

```json
{
  "error": "Failed to fetch KPI metrics"
}
```
