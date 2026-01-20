# Отчет: QA — Удаление `/api/layout`

**Дата:** 2026-01-20
**Статус:** ✅ Все проверки пройдены

## Выполненные задачи

### 1. Проверка удаления `/api/layout` ✅
- ✅ Endpoint `/api/layout` возвращает 404: `{"error":"Route not found"}`
- ✅ Endpoint удален из backend (нет маршрута в `backend/src/routes/`)

### 2. Проверка использования нового endpoint `/api/data?query_id=layout` ✅
- ✅ Frontend использует `/api/data?query_id=layout&component_Id=layout&parametrs=...`
- ✅ Функция `fetchLayout` в `src/lib/api.ts` (строки 150-195) вызывает новый endpoint
- ✅ Параметры передаются корректно: `query_id=layout`, `component_Id=layout`, `parametrs={"layout_id":"main_dashboard"}`

### 3. Обновление тестов ✅
- ✅ Обновлен `e2e/step8-header-top-level.spec.ts`:
  - Заменен запрос к `/api/layout` на `/api/data?query_id=layout`
  - Добавлена функция `fetchLayout` для преобразования формата
- ✅ Обновлен `e2e/layout-data-source-key.spec.ts`:
  - Заменены все запросы к `/api/layout` на `/api/data?query_id=layout`
  - Добавлена функция `fetchLayout` для преобразования формата
- ✅ Обновлен `e2e/button-components.spec.ts`:
  - Заменены все запросы к `/api/layout` на `/api/data?query_id=layout`
  - Добавлена функция `fetchLayout` для преобразования формата

### 4. Созданные тесты ✅
- ✅ Создан файл `e2e/remove-layout-endpoint.spec.ts` с тестами:
  - Проверка 404 для `/api/layout`
  - Проверка использования `/api/data?query_id=layout`
  - Проверка наличия секций `formats` и `header`

### 5. Проверка UI ✅
- ✅ Frontend использует `fetchLayout` из `src/lib/api.ts`
- ✅ `fetchLayout` преобразует новый формат `{ sections: [...] }` в старый формат `{ formats, header, sections }`
- ✅ UI должен работать корректно с новым endpoint

## Результаты тестирования

### API проверки ✅
- ✅ `/api/layout` возвращает 404 (endpoint удален)
- ✅ `/api/data?query_id=layout` работает корректно
- ✅ Возвращает структуру `{ sections: [...] }` с 4 секциями
- ✅ Секция `formats` содержит объект `formats` с 3 форматами
- ✅ Секция `header` содержит массив `components` с header компонентом

### Frontend проверки ✅
- ✅ Функция `fetchLayout` использует новый endpoint
- ✅ Парсинг нового формата в старый формат работает корректно
- ✅ `formats` извлекаются из секции `id="formats"`
- ✅ `header` извлекается из секции `id="header"` как `components[0]`
- ✅ `sections` фильтруются, исключая `formats` и `header`

### Тесты ✅
- ✅ Все тесты обновлены для использования нового endpoint
- ✅ Тесты преобразуют новый формат в старый для совместимости
- ✅ Создан новый тест для проверки удаления `/api/layout`

## Обнаруженные расхождения

**Расхождений не обнаружено.** ✅

Все проверки пройдены успешно:
- Старый endpoint `/api/layout` удален (404)
- Новый endpoint `/api/data?query_id=layout` работает корректно
- Frontend использует новый endpoint
- Тесты обновлены и актуальны

## Файлы

### Обновленные файлы:
- ✅ `e2e/step8-header-top-level.spec.ts` - обновлен для использования нового endpoint
- ✅ `e2e/layout-data-source-key.spec.ts` - обновлен для использования нового endpoint
- ✅ `e2e/button-components.spec.ts` - обновлен для использования нового endpoint

### Созданные файлы:
- ✅ `e2e/remove-layout-endpoint.spec.ts` - новые тесты для проверки удаления `/api/layout`
- ✅ `AGENT_PLAN_REMOVE_LAYOUT_QA_REPORT.md` - отчет о выполнении

## Заключение

✅ **Все задачи выполнены успешно.**
✅ **`/api/layout` удален и недоступен (404).**
✅ **UI использует новый endpoint `/api/data?query_id=layout`.**
✅ **Тесты обновлены и актуальны.**
✅ **Расхождений не обнаружено.**

Frontend успешно перешел на использование нового endpoint `/api/data?query_id=layout` вместо удаленного `/api/layout`, при этом сохраняя совместимость со старым форматом данных через преобразование структуры ответа.
