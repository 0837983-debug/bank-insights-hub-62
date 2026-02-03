# Исправление: Добавить id в запрос fin_results_table

## Проблема

Таблица Financial Results на дашборде вызывает ошибку "Maximum call stack size exceeded" — SQL-запрос в `config.component_queries` не возвращает поле `id`. Все строки получают `id: undefined`, что вызывает бесконечную рекурсию в `FinancialTable.tsx`.

## Решение

Выполнить UPDATE запрос в базе данных — добавить `id` в select и groupBy, убрать хардкодные даты из params.

---

## SQL для выполнения

```sql
UPDATE config.component_queries
SET config_json = '{
  "from": {
    "schema": "mart",
    "table": "fin_results"
  },
  "select": [
    { "type": "column", "field": "id" },
    { "type": "column", "field": "class" },
    { "type": "column", "field": "category" },
    { "type": "column", "field": "item" },
    { "type": "column", "field": "subitem" },
    {
      "type": "case_agg",
      "func": "sum",
      "when": { "field": "period_date", "op": "=", "value": ":p1" },
      "then": { "field": "value" },
      "else": null,
      "as": "value"
    },
    {
      "type": "case_agg",
      "func": "sum",
      "when": { "field": "period_date", "op": "=", "value": ":p2" },
      "then": { "field": "value" },
      "else": null,
      "as": "ppValue"
    },
    {
      "type": "case_agg",
      "func": "sum",
      "when": { "field": "period_date", "op": "=", "value": ":p3" },
      "then": { "field": "value" },
      "else": null,
      "as": "pyValue"
    }
  ],
  "where": {
    "op": "and",
    "items": [
      { "field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3"] }
    ]
  },
  "groupBy": ["id", "class", "category", "item", "subitem"],
  "orderBy": [
    { "field": "class", "direction": "asc" },
    { "field": "value", "direction": "desc", "nulls": "last" }
  ],
  "limit": 1000,
  "offset": 0,
  "params": {},
  "paramTypes": {
    "p1": "date",
    "p2": "date",
    "p3": "date"
  }
}'::jsonb,
updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'fin_results_table';
```

---

## Проверка

После выполнения:

1. Перезагрузить дашборд в браузере
2. Убедиться что таблица Financial Results отображается без ошибок
3. Проверить в Network tab что данные содержат поле `id`

---

## Изменения

| Было | Стало |
|------|-------|
| `id` отсутствует в select | `id` добавлен в select |
| `id` отсутствует в groupBy | `id` добавлен в groupBy |
| `params` содержит хардкодные даты | `params` пустой `{}` |
