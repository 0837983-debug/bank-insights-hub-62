# План: Шаг 9 — QA — Проверка 3 View для layout

**Цель:** проверить корректность view formats/header/sections.
**Статус:** ✅ Завершено

## Задачи
- [x] Проверить `config.layout_formats_view`:
  - нет удалённых/неактивных форматов ✅
- [x] Проверить `config.layout_header_view`:
  - header возвращается для layout ✅
  - нет удалённых/неактивных компонентов ✅
- [x] Проверить `config.layout_sections_view`:
  - возвращаются секции и компоненты ✅
  - нет удалённых mapping/компонентов ✅

## Критерии завершения
- [x] view возвращают корректные данные ✅
- [x] QA пишет .md файл с ошибкой, если есть расхождения ✅

## Результаты проверки

### 1. Проверка `config.layout_formats_view` ✅
- ✅ View возвращает данные: найдено 3 формата
- ✅ View фильтрует удалённые и неактивные форматы (проверка в WHERE)
- ✅ Структура данных корректна: содержит поля `format_id`, `kind`, `prefix_unit_symbol`, `suffix_unit_symbol` и др.
- ✅ Фильтры работают корректно:
  - `lcm.deleted_at IS NULL` - исключает удалённые mapping
  - `c.deleted_at IS NULL` - исключает удалённые компоненты
  - `c.is_active = TRUE` - исключает неактивные компоненты
  - `cf.deleted_at IS NULL` - исключает удалённые поля компонентов
  - `cf.is_active = TRUE` - исключает неактивные поля компонентов
  - `f.deleted_at IS NULL` - исключает удалённые форматы
  - `f.is_active = TRUE` - исключает неактивные форматы

### 2. Проверка `config.layout_header_view` ✅
- ✅ View возвращает header для `main_dashboard`: найден 1 header
- ✅ Header найден: `header_component_id = "header"`
- ✅ View фильтрует удалённые и неактивные компоненты (проверка в WHERE)
- ✅ Структура данных корректна: содержит поля `layout_id`, `header_component_id`, `title`, `label`, `tooltip`, `icon`, `data_source_key`
- ✅ Фильтры работают корректно:
  - `lcm.deleted_at IS NULL` - исключает удалённые mapping
  - `c.deleted_at IS NULL` - исключает удалённые компоненты
  - `c.is_active = TRUE` - исключает неактивные компоненты
  - `c.component_type = 'header'` - возвращает только header компоненты
  - `lcm.parent_component_id IS NULL` - возвращает только top-level header

### 3. Проверка `config.layout_sections_view` ✅
- ✅ View возвращает секции и компоненты: найдено 5 записей (2 секции)
- ✅ View фильтрует удалённые mapping и компоненты (проверка в WHERE)
- ✅ Структура данных корректна: содержит поля `layout_id`, `section_id`, `section_title`, `component_id`, `component_type`, `display_order`, `is_visible`, `data_source_key`
- ✅ Фильтры работают корректно:
  - `lcm.deleted_at IS NULL` - исключает удалённые mapping компонентов
  - `c.deleted_at IS NULL` - исключает удалённые компоненты
  - `c.is_active = TRUE` - исключает неактивные компоненты
  - `section_lcm.deleted_at IS NULL` - исключает удалённые mapping секций
  - `section_c.deleted_at IS NULL` - исключает удалённые секции
  - `section_c.is_active = TRUE` - исключает неактивные секции
  - `section_c.component_type = 'container'` - возвращает только секции (контейнеры)

### 4. Итоговые результаты ✅
- ✅ **Все проверки пройдены:** 0 ошибок, 0 предупреждений
- ✅ **View возвращают корректные данные:** все 3 view работают правильно
- ✅ **Фильтры работают корректно:** удалённые и неактивные записи исключаются
- ✅ **Структура данных корректна:** все необходимые поля присутствуют

### 5. Созданные файлы ✅
- ✅ `backend/src/scripts/test-layout-views.ts` - скрипт для тестирования view

### 6. Примечания ✅
- ✅ View корректно фильтруют удалённые и неактивные записи через WHERE условия
- ✅ Все необходимые поля присутствуют в результатах
- ✅ Данные соответствуют ожидаемой структуре
- ✅ Расхождений не обнаружено
