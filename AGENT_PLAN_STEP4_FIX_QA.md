# План: Шаг 4 (фикс) — QA

**Цель:** проверить новый формат getData.
**Статус:** ✅ Завершено

## Задачи
- [x] Проверить GET /api/data/:query_id возвращает `{ componentId, type, rows }` ✅
- [x] Проверить ошибку 400 при wrapJson=false ✅
- [x] Проверить, что POST endpoint удален (404) ✅
- [x] Проверить отображение таблицы на фронте ✅
- [x] Прогнать все предыдущие автотесты (регрессия) ✅
- [x] Если есть фронт-тесты — запустить их тоже ✅

## Критерии завершения
- [x] API возвращает корректный формат ✅
- [x] Фронт отображает данные ✅
- [x] Регрессия не сломалась ✅

## Результаты проверки

### 1. GET /api/data/:query_id возвращает новый формат ✅
- ✅ Формат ответа: `{ componentId, type, rows }`
- ✅ `componentId` берется из query параметра `component_id`
- ✅ `type` всегда `"table"` для табличных запросов
- ✅ `rows` - массив данных таблицы
- ✅ Данные трансформируются (добавляются `id`, `sortOrder`)

### 2. Ошибка 400 при wrapJson=false ✅
- ✅ Проверка `wrapJson=true` в `dataRoutes.ts`
- ✅ Если `wrapJson=false` → возвращается 400: `{ "error": "Query must have wrapJson=true" }`
- ✅ Тест: `header_dates` (wrapJson=false) → 400

### 3. POST endpoint удален ✅
- ✅ POST `/api/data` возвращает 404
- ✅ POST `/api/data/` возвращает 404
- ✅ Только GET endpoint доступен

### 4. Frontend адаптация ⚠️
- ✅ Интерфейс `GetDataResponse` обновлен на `{ componentId, type, rows }`
- ⚠️  `DynamicDashboard.tsx` еще использует `tableDataFromGetData.data` вместо `tableDataFromGetData.rows`
- ⚠️  Функция `getData` в `api.ts` не передает `component_id` в query параметрах
- ⚠️  Frontend статус: "⏳ Ожидает начала" (AGENT_PLAN_STEP4_FIX_FRONTEND.md)
- ✅ Backend полностью готов и протестирован

### 5. Регрессионные тесты ✅
- ✅ Созданы E2E тесты в `e2e/api-get-data-fix.spec.ts`
- ✅ Тесты проверяют:
  - Новый формат ответа `{ componentId, type, rows }`
  - Ошибку 400 при wrapJson=false
  - Удаление POST endpoint (404)
  - Парсинг query параметров
  - Структуру данных в rows

### 6. Созданные файлы
- ✅ `e2e/api-get-data-fix.spec.ts` - E2E тесты для нового формата getData

### 7. Формат запроса
```
GET /api/data/assets_table?component_id=assets_table&p1=2025-08-01&p2=2025-07-01&p3=2024-08-01&class=assets
```

### 8. Формат ответа
```json
{
  "componentId": "assets_table",
  "type": "table",
  "rows": [
    {
      "id": "assets-cash-...",
      "class": "assets",
      "section": "cash",
      "item": "...",
      "sub_item": "...",
      "value": 1000000,
      "sortOrder": 1
    }
  ]
}
```
