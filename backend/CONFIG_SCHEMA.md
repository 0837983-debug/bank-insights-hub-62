# Схема таблиц config для layout конфигурации

## Обзор

Схема `config` предназначена для хранения структуры layout дашборда в нормализованном виде. Это позволяет динамически управлять структурой дашборда без изменения кода.

## Структура таблиц

### 1. `config.formats` - Форматы отображения

Хранит определения форматов для форматирования чисел, валют и процентов.

**Ключевые поля:**
- `id` (VARCHAR(100), PK) - Идентификатор формата (например, 'currency_rub', 'percent')
- `kind` (VARCHAR(50)) - Тип формата ('number', 'currency', 'percent')
- `prefix_unit_symbol` (VARCHAR(20)) - Префикс символа (например, '₽')
- `suffix_unit_symbol` (VARCHAR(50)) - Суффикс символа (например, '%', ' млрд ₽')
- `minimum_fraction_digits` (INTEGER) - Минимальное количество знаков после запятой
- `maximum_fraction_digits` (INTEGER) - Максимальное количество знаков после запятой
- `thousand_separator` (BOOLEAN) - Использовать разделитель тысяч
- `shorten` (BOOLEAN) - Использовать сокращённый формат (K, M, B)
- `color_rules` (JSONB) - Правила цветового форматирования
- `symbol_rules` (JSONB) - Правила символов

**Примеры форматов:**
- `currency_rub` - Рубли с сокращением (₽8.2B)
- `currency_rub_full` - Рубли полный формат (₽1,475.00)
- `percent` - Проценты (78.5%)
- `number_short` - Числа с сокращением (2.4M)

### 2. `config.filter_groups` - Группы фильтров

Группирует связанные фильтры (например, период, регион).

**Ключевые поля:**
- `id` (VARCHAR(100), PK) - Идентификатор группы (например, 'period', 'region')
- `label` (VARCHAR(200)) - Опциональная метка группы
- `sort_order` (INTEGER) - Порядок сортировки

### 3. `config.filter_items` - Элементы фильтров

Отдельные элементы фильтров внутри группы.

**Ключевые поля:**
- `id` (SERIAL, PK) - Автоинкрементный ID
- `filter_group_id` (VARCHAR(100), FK) - Ссылка на группу фильтров
- `filter_id` (VARCHAR(100)) - Идентификатор фильтра (например, 'dateFrom', 'region')
- `label` (VARCHAR(200)) - Отображаемая метка
- `type` (VARCHAR(50)) - Тип фильтра ('date', 'select', 'text', 'number')
- `params` (JSONB) - Параметры фильтра (например, опции для select)
- `sort_order` (INTEGER) - Порядок сортировки

**Примеры:**
- Группа 'period': фильтры 'dateFrom', 'dateTo'
- Группа 'region': фильтр 'region' с опциями в params

### 4. `config.sections` - Секции дашборда

Верхнеуровневые секции дашборда.

**Ключевые поля:**
- `id` (VARCHAR(100), PK) - Идентификатор секции (например, 'financial_results')
- `title` (VARCHAR(200)) - Заголовок секции
- `sort_order` (INTEGER) - Порядок сортировки

**Примеры секций:**
- `financial_results` - Финансовые результаты
- `balance` - Баланс
- `client_base` - Клиентская база
- `conversion` - Конвертация валют

### 5. `config.components` - Компоненты

Карточки, таблицы и графики внутри секций.

**Ключевые поля:**
- `id` (VARCHAR(100), PK) - Идентификатор компонента
- `section_id` (VARCHAR(100), FK) - Ссылка на секцию
- `type` (VARCHAR(50)) - Тип компонента ('card', 'table', 'chart')
- `title` (VARCHAR(200)) - Заголовок компонента
- `tooltip` (TEXT) - Подсказка (для карточек)
- `icon` (VARCHAR(100)) - Имя иконки (например, 'Landmark', 'TrendingUp')
- `data_source_key` (VARCHAR(100)) - Ключ источника данных
- `compact_display` (BOOLEAN) - Компактный режим отображения (для карточек)
- `groupable_fields` (TEXT[]) - Поля для группировки (для таблиц)
- `sort_order` (INTEGER) - Порядок сортировки

**Примеры компонентов:**
- Карточки: `capital_card`, `ebitda_card`, `mau_card`
- Таблицы: `income_structure_table`, `expenses_table`, `assets_table`

### 6. `config.columns` - Колонки таблиц

Определения колонок для табличных компонентов.

**Ключевые поля:**
- `id` (SERIAL, PK) - Автоинкрементный ID
- `component_id` (VARCHAR(100), FK) - Ссылка на компонент
- `column_id` (VARCHAR(100)) - Идентификатор колонки (например, 'name', 'value')
- `label` (VARCHAR(200)) - Отображаемая метка
- `type` (VARCHAR(50)) - Тип колонки ('text', 'number', 'date')
- `is_dimension` (BOOLEAN) - Является ли колонка измерением (dimension)
- `is_measure` (BOOLEAN) - Является ли колонка метрикой (measure)
- `format_value` (VARCHAR(100)) - Формат для значения (ссылка на config.formats.id)
- `format_pptd` (VARCHAR(100)) - Формат для изменения к предыдущему периоду
- `format_ytd` (VARCHAR(100)) - Формат для изменения с начала года
- `sort_order` (INTEGER) - Порядок сортировки

**Примеры колонок:**
- Для таблиц: 'name' (dimension), 'value' (measure), 'percentage' (measure)
- Для карточек: 'value' (measure) с форматами для value, PPTD, YTD

## Связи между таблицами

```
config.sections
    └── config.components (section_id)
            └── config.columns (component_id)

config.filter_groups
    └── config.filter_items (filter_group_id)

config.formats
    └── (ссылаются через format_value, format_pptd, format_ytd в config.columns)
```

## Индексы

Для оптимизации запросов созданы следующие индексы:

- `idx_filter_items_group` - на `filter_items(filter_group_id)`
- `idx_filter_items_sort` - на `filter_items(sort_order)`
- `idx_components_section` - на `components(section_id)`
- `idx_components_sort` - на `components(sort_order)`
- `idx_columns_component` - на `columns(component_id)`
- `idx_columns_sort` - на `columns(sort_order)`
- `idx_sections_sort` - на `sections(sort_order)`
- `idx_filter_groups_sort` - на `filter_groups(sort_order)`

## Преимущества схемы

1. **Нормализация** - Данные хранятся в нормализованном виде, что исключает дублирование
2. **Гибкость** - Легко добавлять новые форматы, фильтры, секции и компоненты
3. **Версионирование** - Поля `created_at` и `updated_at` позволяют отслеживать изменения
4. **Производительность** - Индексы оптимизируют частые запросы
5. **Расширяемость** - JSONB поля позволяют хранить дополнительные параметры без изменения схемы

## Использование

Схема используется сервисом `layoutService.ts` для построения структуры layout из базы данных. Это позволяет:

- Динамически изменять структуру дашборда без изменения кода
- Управлять форматами централизованно
- Легко добавлять новые компоненты и секции
- Хранить метаданные о компонентах (иконки, подсказки, форматы)

## Миграции

1. `003_create_config_tables.sql` - Создание таблиц схемы config
2. `004_load_layout_data.sql` - Загрузка начальных данных из layout.json

