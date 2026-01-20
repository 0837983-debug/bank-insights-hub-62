# План: Удаление `/api/kpis` — Documentation

**Цель:** убрать упоминания `/api/kpis` из документации.
**Статус:** ✅ Завершено
**Зависимости:** QA должен быть ✅

## Задачи
- [x] Удалить/пометить устаревшие разделы про `/api/kpis`.
- [x] Обновить примеры запросов на `/api/data?query_id=kpis`.
- [x] Проверить, что нет ссылок на `/api/kpis`.

## Файлы для изменения
- `docs/api/endpoints.md`
- `docs/api/get-data.md` (или файл с описанием KPI)
- `docs/api/kpi-api.md`

## Критерии завершения
- [x] В документации нет активных ссылок на `/api/kpis`
- [x] Примеры запросов/ответов актуальны

## Выполненные изменения

1. **docs/api/kpi-api.md:**
   - Добавлено предупреждение о том, что endpoint `/api/kpis` удален (404)
   - Обновлено описание endpoint на `/api/data?query_id=kpis`
   - Удален раздел про получение конкретной метрики по ID (теперь через фильтрацию на клиенте)
   - Обновлены примеры TypeScript и React Hook на новый endpoint

2. **docs/api/endpoints.md:**
   - Обновлено описание KPI endpoint на `/api/data?query_id=kpis`
   - Добавлено предупреждение об удаленном endpoint `/api/kpis`
   - Удален раздел про `/api/kpis/:id`

3. **docs/architecture/overview.md:**
   - Обновлено упоминание endpoint на `/api/data?query_id=kpis`

4. **docs/architecture/backend.md:**
   - Обновлено описание endpoint на `/api/data?query_id=kpis`

5. **docs/architecture/data-flow.md:**
   - Обновлены примеры запросов на новый endpoint

6. **docs/development/setup.md:**
   - Обновлен пример curl запроса на новый endpoint

7. **docs/reference/commands.md:**
   - Обновлен пример curl запроса на новый endpoint

8. **docs/development/debugging.md:**
   - Обновлен пример curl запроса на новый endpoint

9. **docs/api/index.md:**
   - Обновлен пример TypeScript кода на новый endpoint

10. **docs/BACKEND_SETUP.md:**
    - Обновлено описание endpoint на новый формат
    - Обновлен пример кода на новый endpoint

11. **docs/api/examples.md:**
    - Обновлен пример функции на новый endpoint

12. **docs/development/testing.md:**
    - Обновлены примеры тестов на новый endpoint

13. **docs/getting-started/quick-start.md:**
    - Обновлен пример URL на новый endpoint

## Инструкции
1. ✅ QA завершен
2. ✅ Задачи выполнены
3. ✅ Статус обновлен на ✅
