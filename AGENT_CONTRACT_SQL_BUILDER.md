# Контракт: JSON-конфиг для SQL Builder (v1)

## Общие правила
- Идентификаторы (schema/table/field/alias) должны соответствовать: `^[a-zA-Z_][a-zA-Z0-9_]*$`
- Значения параметров передаются только через `params`.
- В SQL допускаются только параметризированные значения.
- Нет raw-выражений (только структурные блоки).
- WHERE: один уровень `and` или `or`, без вложенных групп.

## Формат конфига

```json
{
  "from": {
    "schema": "mart",
    "table": "balance"
  },
  "select": [
    { "type": "column", "field": "class" },
    { "type": "column", "field": "section" },
    { "type": "column", "field": "item" },
    { "type": "column", "field": "sub_item" },
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
      { "field": "class", "op": "=", "value": ":class" },
      { "field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3"] }
    ]
  },
  "groupBy": ["class", "section", "item", "sub_item"],
  "orderBy": [
    { "field": "class", "direction": "asc" },
    { "field": "section", "direction": "asc" },
    { "field": "item", "direction": "asc" },
    { "field": "sub_item", "direction": "asc" }
  ],
  "limit": 1000,
  "offset": 0,
  "params": {
    "p1": "2025-08-01",
    "p2": "2025-07-01",
    "p3": "2024-08-01",
    "class": "assets"
  },
  "paramTypes": {
    "p1": "date",
    "p2": "date",
    "p3": "date",
    "class": "string"
  }
}
```

## Описание блоков

### from
- `schema`: строка (валидный идентификатор)
- `table`: строка (валидный идентификатор)

### select[]
Допустимые типы:

#### 1) column
```json
{ "type": "column", "field": "class", "as": "class" }
```

#### 2) agg
```json
{ "type": "agg", "func": "sum", "field": "value", "as": "total_value", "distinct": false }
```

#### 3) case_agg
```json
{
  "type": "case_agg",
  "func": "sum",
  "when": { "field": "period_date", "op": "=", "value": ":p1" },
  "then": { "field": "value" },
  "else": null,
  "as": "value"
}
```

### where
```json
{
  "op": "and",
  "items": [
    { "field": "class", "op": "=", "value": ":class" },
    { "field": "period_date", "op": "in", "value": [":p1", ":p2"] }
  ]
}
```

Допустимые `op` в фильтрах:
- `=`, `!=`, `>`, `>=`, `<`, `<=`
- `in`
- `between`
- `like`, `ilike`
- `is_null`, `is_not_null`

Форматы `value`:
- `=, !=, >, >=, <, <=, like, ilike`: строка вида `":param"`
- `in`: массив `[" :param1", ":param2"]`
- `between`: объект `{ "from": ":p1", "to": ":p2" }`
- `is_null`, `is_not_null`: без `value`

### groupBy[]
Список полей (валидные идентификаторы).

### orderBy[]
```json
{ "field": "class", "direction": "asc" }
```
`direction`: `asc` | `desc`.

### limit / offset
Числа, неотрицательные.

### params
Словарь значений. Используется для подстановки в SQL.

### paramTypes
Словарь типов: `string`, `number`, `date`, `boolean`.
Используется для runtime-валидации.

## Выход SQL Builder
- `sql`: строка с `$1..$n`
- `params`: массив значений в порядке использования

## Поведение при ошибке
- Возвращать: `"invalid config"`
- Детализация не требуется.
