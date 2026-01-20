# План: API /api/data — Backend

**Цель:** перейти на единый `GET /api/data` с 3 параметрами (`query_id`, `component_Id`, `parametrs`) и удалить `POST /api/data`.
**Статус:** ✅ Завершено  
**Зависимости:** Нет

## Задачи
- [x] Удалить `POST /api/data` (router + регистрация в `backend/src/routes/index.ts`).
- [x] Перевести `GET` на единый endpoint `GET /api/data` (без `/:query_id`).
- [x] Входные параметры только из query string:
  - `query_id` (обязателен)
  - `component_Id` (обязателен)
  - `parametrs` (опционально, всегда JSON-строка)
- [x] Удалить fallback-логики для `component_Id` и любые альтернативные параметры.
- [x] Валидировать `parametrs`: если есть — валидный JSON, иначе 400.
- [x] Обновить логирование и сообщения об ошибках под новый контракт.
- [x] Обновить/проверить вспомогательные скрипты (например `backend/src/scripts/test-assets-table-api.ts`).

## Файлы для изменения
- `backend/src/routes/dataRoutes.ts`
- `backend/src/routes/index.ts`
- `backend/src/scripts/test-assets-table-api.ts` (если используется)

## Критерии завершения
- [x] `POST /api/data` отсутствует
- [x] `GET /api/data` принимает только `query_id`, `component_Id`, `parametrs`
- [x] При отсутствии `query_id`/`component_Id` → 400
- [x] При невалидном `parametrs` → 400
- [x] Старый маршрут `GET /api/data/:query_id` удален
- [x] Базовые проверки разработчика пройдены (ручной вызов endpoint)

## Инструкции
1. Выполни задачи по порядку.
2. Обнови статус этого файла на ✅.
3. НЕ переходи к задачам других агентов.
