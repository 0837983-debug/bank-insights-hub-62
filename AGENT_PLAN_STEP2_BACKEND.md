# План: Шаг 2 — Backend

**Цель:** SQL builder v1 — получает `query_id + params`, читает конфиг из БД и возвращает готовый SQL с подставленными значениями.
**Статус:** ✅ Завершено

## Задачи
- [x] Доработать SQL builder:
  - Принимать `query_id` и `params`.
  - Загружать `config_json` из `config.component_queries`.
  - Подставлять значения в SQL и возвращать `sql: string`.
- [x] Подстановка значений:
  - Строки и даты оборачивать в `'...'`.
  - Числа оставлять как есть.
  - Булевы → TRUE/FALSE.
- [x] Валидация:
  - Проверять наличие всех требуемых параметров.
  - Простая ошибка `invalid config` / `invalid params`.
- [x] Обновить unit‑тесты под новую сигнатуру.

## Файлы для изменения
- `backend/src/services/queryBuilder/builder.ts`
- `backend/src/services/queryBuilder/index.ts`
- `backend/src/services/queryBuilder/validator.ts`
- `backend/src/services/queryBuilder/__tests__/builder.test.ts`

## Критерии завершения
- [x] Builder возвращает готовый SQL
- [x] Значения корректно подставлены по типам
- [x] Тесты проходят
