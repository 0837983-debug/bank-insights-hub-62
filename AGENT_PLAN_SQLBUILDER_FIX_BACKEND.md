# План: Fix SQL Builder — Backend

**Цель:** привести sqlbuilder к контракту: вход = queryId + paramsJson, конфиг из БД, строгая проверка параметров и wrapJson.
**Статус:** ✅ Завершено

## Требования
1. На вход sqlbuilder получает **только**:
   - `queryId: string`
   - `paramsJson: string` (JSON строка)
2. Конфиг загружается из БД по `query_id`, включая **wrap_json**.
3. Проверка параметров:
   - если передан параметр, которого нет в конфиге → ошибка
   - если в конфиге есть параметр, но он не передан → ошибка
   - ошибка должна содержать конкретику (какие параметры лишние/отсутствуют)
4. Если `wrap_json=false` — вернуть ошибку (для getData).
5. Встроенные проверки и тесты должны выполняться разработчиком.

## Задачи
- [x] Обновить интерфейс `buildQueryFromId(queryId, paramsJson)`.
- [x] В `buildQueryFromId`:
  - загрузить конфиг из БД
  - распарсить `paramsJson` (с валидацией JSON)
  - получить список требуемых параметров из конфига
  - проверить **missing/excess** и вернуть понятную ошибку
  - проверить `wrap_json`
- [x] Обновить `dataRoutes` и другие места вызова builder.
- [x] Добавить тесты на:
  - invalid JSON
  - missing params
  - extra params
  - wrap_json=false

## Файлы для изменения
- `backend/src/services/queryBuilder/builder.ts`
- `backend/src/services/queryBuilder/queryLoader.ts` (если нужно)
- `backend/src/routes/dataRoutes.ts`
- `backend/src/services/queryBuilder/__tests__/*`

## Критерии завершения
- [x] sqlbuilder принимает только `queryId` + `paramsJson`
- [x] missing/excess params дают понятные ошибки
- [x] wrap_json=false возвращает ошибку
- [x] unit-тесты для builder проходят
- [x] разработчик сам прогоняет базовые проверки
