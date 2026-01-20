# План: Шаг 4 — Backend

**Цель:** новый endpoint `getData` (единая точка данных).
**Статус:** ✅ Завершено

## Задачи
- [x] Создать endpoint `POST /api/data` (или `/api/getData`):
  - вход: `{ query_id, params }`
  - вызывает SQL builder
  - исполняет SQL
  - возвращает JSON
- [x] Поддержка ошибок:
  - invalid config / params → 400
  - SQL error → 500
- [x] Добавить логирование запросов (минимально).

## Файлы для изменения
- `backend/src/routes/dataRoutes.ts` (новый файл)
- `backend/src/routes/index.ts`
- `backend/src/services/data/getDataService.ts` (если нужно)

## Критерии завершения
- [x] Endpoint работает
- [x] Возвращает данные из SQL builder
- [x] Ошибки корректно отдаются
