---
title: KPI API
description: Документация API для работы с KPI метриками
---

# KPI API

API для работы с KPI (Key Performance Indicators) метриками.

## Endpoints

### Получить все KPI метрики

```http
GET /api/kpis
```

**Query параметры:**
- `category` (string, опционально) - Фильтр по категории
- `periodDate` (string, опционально) - Дата периода в формате `YYYY-MM-DD`

**Пример запроса:**
```bash
curl "http://localhost:3001/api/kpis"
curl "http://localhost:3001/api/kpis?category=finance"
curl "http://localhost:3001/api/kpis?periodDate=2024-01-15"
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

### Получить KPI метрику по ID

```http
GET /api/kpis/:id
```

**Параметры:**
- `id` (path) - ID метрики

**Query параметры:**
- `periodDate` (string, опционально) - Дата периода в формате `YYYY-MM-DD`

**Пример запроса:**
```bash
curl "http://localhost:3001/api/kpis/capital"
curl "http://localhost:3001/api/kpis/capital?periodDate=2024-01-15"
```

**Пример ответа:**
```json
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
```

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
async function fetchKPIs(category?: string) {
  const url = category 
    ? `http://localhost:3001/api/kpis?category=${category}`
    : 'http://localhost:3001/api/kpis';
  
  const response = await fetch(url);
  const kpis = await response.json();
  return kpis;
}

// Получить конкретную метрику
async function fetchKPIMetric(id: string, periodDate?: string) {
  const url = periodDate
    ? `http://localhost:3001/api/kpis/${id}?periodDate=${periodDate}`
    : `http://localhost:3001/api/kpis/${id}`;
  
  const response = await fetch(url);
  const metric = await response.json();
  return metric;
}
```

### React Hook

```typescript
import { useQuery } from '@tanstack/react-query';

function useKPIs(category?: string) {
  return useQuery({
    queryKey: ['kpis', category],
    queryFn: async () => {
      const url = category 
        ? `http://localhost:3001/api/kpis?category=${category}`
        : 'http://localhost:3001/api/kpis';
      const response = await fetch(url);
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
