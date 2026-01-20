---
title: API Reference
description: Документация всех API endpoints проекта Bank Insights Hub
---

# API Reference

Документация всех API endpoints проекта Bank Insights Hub.

## Базовый URL

```
http://localhost:3001/api
```

## Основные разделы

- [Все Endpoints](/api/endpoints) - полный список всех endpoints
- [Get Data API](/api/get-data) - единый endpoint для получения данных через SQL Builder
- [KPI API](/api/kpi-api) - работа с KPI метриками
- [Table Data API](/api/table-data-api) - получение данных таблиц
- [Layout API](/api/layout-api) - структура layout дашборда
- [Модели данных](/api/data-models) - структуры данных
- [Примеры использования](/api/examples) - примеры запросов

## Общие принципы

### Формат ответов

Все ответы возвращаются в формате JSON.

### Обработка ошибок

При ошибке API возвращает JSON с полем `error`:

```json
{
  "error": "Описание ошибки"
}
```

### Коды статусов

- `200` - Успешный запрос
- `400` - Неверные параметры запроса
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

### Параметры периода

Многие endpoints поддерживают параметр `periodDate` в формате `YYYY-MM-DD`:

```
?periodDate=2024-01-15
```

## Быстрый старт

```typescript
// Получение всех KPI метрик
const response = await fetch('http://localhost:3001/api/kpis');
const kpis = await response.json();

// Получение layout
const layout = await fetch('http://localhost:3001/api/layout');
const layoutData = await layout.json();
```
