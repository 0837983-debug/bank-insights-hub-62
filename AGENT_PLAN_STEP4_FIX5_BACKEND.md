# План: Шаг 4 (фикс 5) — Backend — Исправить конфиг assets_table

**Цель:** убрать параметр `class` из конфига и сделать прямой фильтр `class = 'assets'`.
**Статус:** ⏳ Ожидает начала

## Проблема
Конфиг assets_table требует параметр `class`, но фронт его не передаёт.
API возвращает "invalid params".

## Исправление
Обновить конфиг в `config.component_queries`:
1. В `where` заменить `":class"` на прямое значение `"assets"`
2. Убрать `class` из `params`
3. Убрать `class` из `paramTypes`

## SQL для обновления

```sql
UPDATE config.component_queries 
SET config_json = '{
  "from": {"table": "balance", "schema": "mart"},
  "limit": 1000,
  "offset": 0,
  "where": {
    "op": "and",
    "items": [
      {"op": "=", "field": "class", "value": "assets"},
      {"op": "in", "field": "period_date", "value": [":p1", ":p2", ":p3"]}
    ]
  },
  "params": {
    "p1": "2025-08-01",
    "p2": "2025-07-01",
    "p3": "2024-08-01"
  },
  "paramTypes": {
    "p1": "date",
    "p2": "date",
    "p3": "date"
  },
  "select": [
    {"type": "column", "field": "class"},
    {"type": "column", "field": "section"},
    {"type": "column", "field": "item"},
    {"type": "column", "field": "sub_item"},
    {"as": "value", "else": null, "func": "sum", "then": {"field": "value"}, "type": "case_agg", "when": {"op": "=", "field": "period_date", "value": ":p1"}},
    {"as": "previousValue", "else": null, "func": "sum", "then": {"field": "value"}, "type": "case_agg", "when": {"op": "=", "field": "period_date", "value": ":p2"}},
    {"as": "ytdValue", "else": null, "func": "sum", "then": {"field": "value"}, "type": "case_agg", "when": {"op": "=", "field": "period_date", "value": ":p3"}},
    {"as": "period_date", "func": "max", "type": "agg", "field": "period_date"}
  ],
  "groupBy": ["class", "section", "item", "sub_item"],
  "orderBy": [
    {"field": "class", "direction": "asc"},
    {"field": "section", "direction": "asc"},
    {"field": "item", "direction": "asc"},
    {"field": "sub_item", "direction": "asc"}
  ]
}'::jsonb
WHERE query_id = 'assets_table';
```

## Файлы для изменения
- Выполнить SQL напрямую в БД
- Или создать миграцию `backend/src/migrations/023_fix_assets_table_config.sql`

## Критерии завершения
- [ ] Конфиг обновлён
- [ ] API `/api/data/assets_table?p1=...&p2=...&p3=...` работает без параметра `class`
- [ ] Таблица "Активы" отображается
