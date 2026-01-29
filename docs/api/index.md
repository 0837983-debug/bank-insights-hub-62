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
- [Get Data API](/api/get-data) - **единый универсальный endpoint** для получения всех данных через SQL Builder (KPI, Layout, таблицы и все что есть в конфигах)
- [Схема работы /api/data](/api/get-data-schema) - краткая схема работы endpoint'а со ссылками на сервисы
- [Модели данных](/api/data-models) - структуры данных
- [Примеры использования](/api/examples) - примеры запросов

## Универсальный endpoint `/api/data`

**Все данные получаются через единый endpoint `/api/data` с использованием SQL Builder.**

- **KPI метрики:** `/api/data?query_id=kpis&component_Id=kpis&parametrs={}`
- **Layout структура:** `/api/data?query_id=layout&component_Id=layout&parametrs={"layout_id":"main_dashboard"}`
- **Табличные данные:** `/api/data?query_id=assets_table&component_Id=assets_table&parametrs={...}`
- **Даты периодов:** `/api/data?query_id=header_dates&component_Id=header`

SQL Builder строит запросы из конфигов в `config.component_queries` по `query_id`. Это позволяет динамически настраивать запросы без изменения кода.

**См. также:** [Get Data API](/api/get-data) - детальное описание `/api/data` endpoint

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
const paramsJson = JSON.stringify({});
const queryString = new URLSearchParams({
  query_id: "kpis",
  component_Id: "kpis",
  parametrs: paramsJson
}).toString();
const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
const kpis = await response.json();

// Получение layout
const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
const queryString = new URLSearchParams({
  query_id: "layout",
  component_Id: "layout",
  parametrs: paramsJson
}).toString();
const layout = await fetch(`http://localhost:3001/api/data?${queryString}`);
const layoutData = await layout.json();
```
