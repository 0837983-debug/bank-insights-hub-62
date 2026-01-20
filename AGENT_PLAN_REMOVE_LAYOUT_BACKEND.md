# План: Удаление `/api/layout` — Backend

**Цель:** полностью удалить старый endpoint `/api/layout` и все его backend-зависимости.
**Статус:** ✅ Завершено  
**Зависимости:** Нет

## Задачи
- [x] Найти и удалить роут `/api/layout` в `backend/src/routes/`.
- [x] Удалить регистрацию маршрута в `backend/src/routes/index.ts`.
- [x] Проверить и удалить сервис/контроллеры, используемые только `/api/layout`.
- [x] Обновить или удалить backend-скрипты, которые дергают `/api/layout`.
- [x] Убедиться, что `/api/data?query_id=layout` остается рабочим.
- [x] Базовые проверки разработчика: ручной вызов `/api/data?query_id=layout`.

## Файлы для изменения
- `backend/src/routes/layoutRoutes.ts` (если существует)
- `backend/src/routes/index.ts`
- `backend/src/services/config/layoutService.ts` (если используется только старым endpoint)
- `backend/src/scripts/*` (скрипты с `/api/layout`)

## Критерии завершения
- [x] `/api/layout` удалён из backend
- [x] Нет ссылок на `/api/layout` в backend (кроме обновленных скриптов и документации)
- [x] `/api/data?query_id=layout` работает
- [x] Базовые проверки выполнены

## Инструкции
1. Выполни задачи по порядку.
2. Обнови статус этого файла на ✅.
3. НЕ переходи к задачам других агентов.
