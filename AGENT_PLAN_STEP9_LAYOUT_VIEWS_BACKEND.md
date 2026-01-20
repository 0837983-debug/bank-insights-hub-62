# План: Шаг 9 — Backend — 3 View для layout (formats/header/sections)

**Цель:** создать три плоские view для layout: formats, header, sections.
**Статус:** ✅ Завершено

## Задачи
- [x] Создать view `config.layout_formats_view`
  - поля: layout_id, format_id, kind, pattern, prefix/suffix, fraction digits, thousand_separator, multiplier, shorten
  - фильтры: формат активен, не удалён, поле компонента активно, не удалено
- [x] Создать view `config.layout_header_view`
  - поля: layout_id, header_component_id, title, label, tooltip, icon, data_source_key
  - фильтры: компонент активен, не удалён, mapping не удалён
- [x] Создать view `config.layout_sections_view`
  - поля: layout_id, section_id, section_title, component_id, component_type, display_order, is_visible, data_source_key
  - фильтры: mapping не удалён, компонент активен, не удалён

## Файлы для изменения
- `backend/src/migrations/023_create_layout_views.sql` (новая миграция с 3 view)

## Критерии завершения
- [x] 3 view созданы
- [x] Фильтры корректно исключают удалённые компоненты и связи
- [x] SELECT из view даёт данные для существующего layout
