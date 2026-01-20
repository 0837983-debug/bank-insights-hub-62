# План: Удаление `/api/layout` — Documentation

**Цель:** убрать упоминания `/api/layout` из документации.
**Статус:** ✅ Завершено
**Зависимости:** QA должен быть ✅

## Задачи
- [x] Удалить или пометить устаревшие разделы про `/api/layout`.
- [x] Обновить примеры запросов на `/api/data?query_id=layout`.
- [x] Проверить и обновить сравнения/гайдлайны, где упоминается `/api/layout`.

## Файлы для изменения
- `docs/api/endpoints.md`
- `docs/api/get-data.md`
- `LAYOUT_ENDPOINTS_COMPARISON_DETAILED.md` (если нужно оставить как архив — пометить устаревшим)

## Критерии завершения
- [x] В документации нет активных ссылок на `/api/layout`
- [x] Примеры запросов/ответов актуальны

## Выполненные изменения

1. **docs/api/layout-api.md:**
   - Удалены разделы про старый endpoint `/api/layout`
   - Добавлено предупреждение о том, что endpoint удален (404)
   - Удалены примеры использования старого endpoint
   - Удалена структура ответа старого endpoint

2. **docs/api/endpoints.md:**
   - Удален раздел про устаревший endpoint `/api/layout`
   - Оставлен только новый endpoint через `/api/data`

3. **docs/architecture/layout.md:**
   - Обновлена схема потока данных на `/api/data?query_id=layout`
   - Обновлено описание процесса получения layout через SQL Builder

4. **docs/architecture/backend.md:**
   - Обновлено описание endpoint на `/api/data?query_id=layout`

5. **docs/architecture/data-flow.md:**
   - Обновлен HTTP запрос на `/api/data?query_id=layout`
   - Обновлено описание backend обработки через SQL Builder

6. **docs/architecture/overview.md:**
   - Обновлено упоминание endpoint на `/api/data?query_id=layout`

7. **docs/development/setup.md:**
   - Обновлен пример curl запроса на новый endpoint

8. **docs/reference/commands.md:**
   - Обновлен пример curl запроса на новый endpoint

9. **docs/development/debugging.md:**
   - Обновлен пример curl запроса на новый endpoint

10. **docs/api/index.md:**
    - Обновлен пример TypeScript кода на новый endpoint

11. **docs/BACKEND_SETUP.md:**
    - Обновлено описание endpoint на новый формат

12. **LAYOUT_ENDPOINTS_COMPARISON_DETAILED.md:**
    - Помечен как архивный документ с предупреждением
    - Добавлено указание, что `/api/layout` удален (404)
    - Добавлена ссылка на актуальную документацию

## Инструкции
1. ✅ QA завершен
2. ✅ Задачи выполнены
3. ✅ Статус обновлен на ✅
