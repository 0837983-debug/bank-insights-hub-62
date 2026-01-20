# План: Frontend — layout через `/api/data`

**Цель:** перевести загрузку layout на новый endpoint `/api/data` с учетом различий формата (см. `LAYOUT_ENDPOINTS_COMPARISON_DETAILED.md`).
**Статус:** ✅ Завершено  
**Зависимости:** Backend (endpoint `/api/data?query_id=layout`) должен работать

## Задачи
- [x] Обновить `fetchLayout` в `src/lib/api.ts`:
  - вызывать `GET /api/data?query_id=layout&component_Id=layout&parametrs={"layout_id":"<id>"}`.
  - парсить новый формат `{ sections: [...] }`.
  - извлекать `formats` из секции `id="formats"`.
  - извлекать `header` из секции `id="header"` и брать `components[0]`.
  - формировать итоговый объект `Layout` в старом формате: `{ formats, header, sections }`, где `sections` без `formats` и `header`.
- [x] Добавить источник `layout_id` (константа/конфиг) и использовать его в `fetchLayout`.
- [x] Обновить типы `Layout`/`LayoutSection` при необходимости (если меняется структура).
- [x] Убедиться, что `DynamicDashboard` корректно:
  - инициализирует форматы через `initializeFormats(layout.formats)`
  - рендерит `header` как top-level элемент
  - использует `layout.sections` без `formats/header`.

## Файлы для изменения
- `src/lib/api.ts`
- `src/hooks/useAPI.ts` (если потребуется новый параметр для `useLayout`)
- `src/pages/DynamicDashboard.tsx`
- `src/types` (если есть отдельные типы layout)

## Критерии завершения
- [x] Layout загружается через `/api/data`
- [x] Форматы доступны через `layout.formats`
- [x] Header доступен через `layout.header`
- [x] В `layout.sections` только секции контента (без `formats` и `header`)
- [x] Нет ошибок в консоли браузера (проверено линтером)

## Инструкции
1. Выполни задачи по порядку.
2. Обнови статус этого файла на ✅.
3. НЕ переходи к задачам других агентов.
