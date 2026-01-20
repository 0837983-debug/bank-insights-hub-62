# План: Шаг 4 (фикс) — Backend

**Цель:** исправить формат ответа getData, использовать GET, убрать POST.
**Статус:** ✅ Завершено

## Контекст
Старый endpoint возвращал:
```json
{ "componentId": "assets_table", "type": "table", "rows": [...] }
```

Новый endpoint возвращает:
```json
{ "data": [...] }
```

Нужно привести к единому формату.

## Задачи
- [x] Убрать POST endpoint из `dataRoutes.ts`
- [x] Доработать GET endpoint:
  - Принимать `component_id` как query param
  - Проверять `wrapJson=true` в конфиге **в сервисе data** (не в sqlBuilder)
  - Если `wrapJson=false` → возвращать ошибку 400: `{ "error": "Query must have wrapJson=true" }`
- [x] Возвращать ответ в формате:
```json
{
  "componentId": "<component_id>",
  "type": "table",
  "rows": [...]
}
```

## Формат запроса
```
GET /api/data/:query_id?component_id=assets_table&p1=2025-08-01&p2=2025-07-01&p3=2024-08-01
```

## Файлы для изменения
- `backend/src/routes/dataRoutes.ts`

## Критерии завершения
- [x] POST endpoint удален
- [x] GET возвращает `{ componentId, type, rows }`
- [x] Если wrapJson=false → ошибка 400
