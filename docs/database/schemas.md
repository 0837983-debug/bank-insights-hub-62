---
title: Схемы базы данных
description: Детальное описание всех схем PostgreSQL и их таблиц с полями и комментариями
related:
  - /database/data-marts
  - /database/migrations
  - /architecture/database
---

# Схемы базы данных

Детальное описание всех схем PostgreSQL и их таблиц с полями и комментариями.

## Обзор схем

Проект использует следующие схемы:

- `config` - конфигурация и метаданные системы
- `mart` - Data Mart для агрегированных данных
- `stg` - Staging (временное хранилище для загрузки файлов)
- `ods` - Operational Data Store (основное хранилище загруженных данных)
- `ing` - Ingestion (метаданные загрузок файлов)
- `dict` - Dictionary (справочники и маппинги)
- `log` - Logging (детальные логи операций)

## Схема config

Метаданные и конфигурация системы для динамического построения UI.

### config.formats

Определения форматов для форматирования числовых значений, валют и процентов.

**Назначение:** Централизованное управление форматированием всех числовых значений в приложении.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | VARCHAR(100), PK | Уникальный идентификатор формата (например, 'currency_rub', 'percent', 'number_short'). Используется в component_fields.format_id для связи поля с форматом. Используется на фронтенде как ключ в formatValue(formatId, value). |
| `name` | VARCHAR(200), NOT NULL | Название формата для отображения в административном интерфейсе. Используется человеком для идентификации формата (например, "Рубли с сокращением"). |
| `kind` | VARCHAR(50), NOT NULL | Тип формата: 'number', 'currency', 'percent', 'date'. Определяет базовую логику форматирования. Используется в formatters.ts для определения способа обработки значения. |
| `prefix_unit_symbol` | VARCHAR(20) | Символ перед числом (например, '₽' для рублей, '$' для долларов). Используется в formatters.ts для добавления префикса к отформатированному числу: prefixUnitSymbol + formattedNumber. |
| `suffix_unit_symbol` | VARCHAR(50) | Символ после числа (например, '%' для процентов, ' млрд ₽' для миллиардов рублей). Используется в formatters.ts для добавления суффикса к отформатированному числу: formattedNumber + suffixUnitSymbol. |
| `minimum_fraction_digits` | INTEGER, DEFAULT 0 | Минимальное количество знаков после запятой (0-10). Используется в formatters.ts для контроля точности отображения: toFixed(minDigits). Определяет минимальное количество десятичных разрядов. |
| `maximum_fraction_digits` | INTEGER, DEFAULT 0 | Максимальное количество знаков после запятой (0-10). Используется в formatters.ts для контроля точности отображения: toFixed(maxDigits). Определяет максимальное количество десятичных разрядов. |
| `thousand_separator` | BOOLEAN, DEFAULT false | Использовать разделитель тысяч (пробел). Если true, в formatters.ts числа форматируются с пробелами между разрядами тысяч (например, "1 234 567" вместо "1234567"). Используется для улучшения читаемости больших чисел. |
| `shorten` | BOOLEAN, DEFAULT false | Использовать сокращенный формат (K, M, B). Если true, в formatters.ts большие числа сокращаются: >= 1e9 -> B (миллиарды), >= 1e6 -> M (миллионы), >= 1e3 -> K (тысячи). Например, 8200000 форматируется как "8.2M". Используется для компактного отображения больших чисел. |
| `multiplier` | NUMERIC(10, 4) | Множитель для значения перед форматированием. Используется в formatters.ts для преобразования значения: processedValue = value * multiplier. Например, если multiplier = 0.001, то 1000 будет преобразовано в 1 перед форматированием. Позволяет конвертировать единицы измерения. |
| `pattern` | VARCHAR(200) | Кастомный паттерн форматирования (зарезервировано для будущего использования). Планируется использовать для более сложных правил форматирования, не покрываемых остальными полями. |
| `description` | TEXT | Описание формата для администраторов. Объясняет назначение формата и когда его использовать. Используется в административном интерфейсе для помощи при выборе формата. |
| `example` | VARCHAR(200) | Пример использования формата (например, "8200000 → ₽8.2B"). Показывает, как значение будет выглядеть после форматирования. Используется в административном интерфейсе для демонстрации результата форматирования. |
| `is_active` | BOOLEAN, DEFAULT true | Флаг активности формата. Неактивные форматы не используются. Используется в SQL Builder при загрузке форматов для layout через `/api/data?query_id=layout` (WHERE is_active = TRUE). |
| `created_by` | VARCHAR(100) | Пользователь, создавший формат. Используется для аудита. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания формата. Используется для аудита. |
| `updated_by` | VARCHAR(100) | Пользователь, последний раз обновивший формат. Используется для аудита. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления формата. Используется для аудита. |
| `deleted_by` | VARCHAR(100) | Пользователь, удаливший формат (soft delete). Используется для аудита. |
| `deleted_at` | TIMESTAMP | Дата и время удаления формата (soft delete). Используется в SQL Builder при загрузке форматов для layout через `/api/data?query_id=layout` (WHERE deleted_at IS NULL). |

**Индексы:**
- `idx_formats_is_active` - на `is_active` для фильтрации активных форматов
- `idx_formats_kind` - на `kind` для фильтрации по типу формата

**Примеры:**
- `currency_rub` - рубли с сокращением (₽8.2B)
- `currency_rub_full` - рубли полный формат (₽1,475.00)
- `percent` - проценты (78.5%)
- `number_short` - числа с сокращением (2.4M)

**Использование:** На фронтенде через `formatValue(formatId, value)` в `lib/formatters.ts`.

### config.layouts

Реестр структур дашбордов (layouts).

**Назначение:** Каждый layout определяет структуру отображения данных на дашборде - какие секции, компоненты и их порядок. Используется в SQL Builder при получении layout через `/api/data?query_id=layout` для построения JSON структуры для фронтенда.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | VARCHAR(100), PK | Уникальный идентификатор layout. Используется в layoutService.ts как ключ для выбора нужного layout. Пример: "main_dashboard". |
| `name` | VARCHAR(200), NOT NULL | Название layout для отображения в интерфейсе администратора. Используется для идентификации layout человеком. |
| `description` | TEXT | Описание назначения layout. Помогает администраторам понять, для чего предназначен этот layout. |
| `status` | VARCHAR(50) | Статус layout: "draft" (черновик), "published" (опубликован), "archived" (архив). Используется для управления версиями layouts. |
| `is_active` | BOOLEAN, DEFAULT true | Флаг активности layout. Неактивные layouts не отображаются в списках и не могут быть выбраны по умолчанию. Используется в layoutService.ts для фильтрации активных layouts. |
| `is_default` | BOOLEAN, DEFAULT false | Флаг layout по умолчанию. Если true, то этот layout используется, когда layout_id не указан в запросе. Используется в layoutService.ts при выборе layout по умолчанию. |
| `owner_user_id` | VARCHAR(100) | ID пользователя-владельца layout. Используется для контроля доступа (в будущем). |
| `tags` | _TEXT | Массив тегов для поиска и фильтрации layouts. Используется в административном интерфейсе для быстрого поиска нужного layout. |
| `category` | VARCHAR(100) | Категория layout. Используется для группировки layouts в административном интерфейсе (например, "production", "test"). |
| `display_order` | INTEGER, DEFAULT 0 | Порядок отображения layout в списках. Используется в layoutService.ts при сортировке layouts (ORDER BY display_order). |
| `settings` | JSONB | JSON объект с настройками уровня layout (например, тема, размеры, общие параметры отображения). Используется на фронтенде для применения настроек ко всему layout. |
| `created_by` | VARCHAR(100) | Пользователь, создавший layout. Используется для аудита изменений. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания layout. Используется для аудита и сортировки по дате создания. |
| `updated_by` | VARCHAR(100) | Пользователь, последний раз обновивший layout. Используется для аудита изменений. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления layout. Используется в layoutService.ts для сортировки при выборе layout по умолчанию (ORDER BY updated_at DESC). |
| `deleted_by` | VARCHAR(100) | Пользователь, удаливший layout. Используется для аудита удаления (soft delete). |
| `deleted_at` | TIMESTAMP | Дата и время удаления layout (soft delete). Используется в layoutService.ts для фильтрации удаленных layouts (WHERE deleted_at IS NULL). |

**Индексы:**
- `idx_layouts_is_active` - на `is_active` для фильтрации активных layouts
- `idx_layouts_is_default` - на `is_default` для поиска layout по умолчанию
- `idx_layouts_display_order` - на `display_order` для сортировки
- `idx_layouts_category` - на `category` для фильтрации по категории

**Использование:** В SQL Builder при получении layout через `/api/data?query_id=layout` для выбора layout по умолчанию и построения структуры дашборда.

### config.components

Глобальная библиотека компонентов дашборда.

**Назначение:** Хранит определения всех типов компонентов (карточки, таблицы, графики, секции, фильтры, header, button), которые могут быть использованы в layouts. Каждый компонент определяет свой источник данных, формат отображения и другие параметры. Используется в SQL Builder при получении layout через `/api/data?query_id=layout` для получения метаданных компонентов при построении layout.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | VARCHAR(200), PK | Уникальный идентификатор компонента. Используется как ссылка в layout_component_mapping для связывания компонента с layout. Примеры: "capital_card", "balance_assets_table", "header", "button_assets_table_cfo". |
| `component_type` | VARCHAR(50), NOT NULL | Тип компонента: "container" (секция), "card" (KPI карточка), "table" (таблица), "chart" (график), "filter" (фильтр), "header" (header), "button" (кнопка). Используется в SQL Builder при получении layout через `/api/data?query_id=layout` для определения, как отображать компонент на фронтенде. |
| `title` | VARCHAR(200) | Заголовок компонента для отображения на дашборде. Используется на фронтенде как заголовок карточки/таблицы/графика. Если не указан title_override в layout_component_mapping, используется это значение. |
| `label` | VARCHAR(200) | Короткая подпись компонента. Используется в местах, где нужно компактное отображение названия (например, в меню или списках). |
| `tooltip` | VARCHAR(500) | Всплывающая подсказка при наведении на компонент. Используется на фронтенде для отображения дополнительной информации о компоненте. |
| `icon` | VARCHAR(200) | Название иконки для компонента (например, "TrendingUpIcon", "WalletIcon"). Используется на фронтенде для отображения иконки рядом с заголовком компонента. |
| `data_source_key` | VARCHAR(200) | Ключ источника данных компонента. Определяет, откуда брать данные для компонента. Для компонентов с data_source_key данные получаются через `/api/data` endpoint с `query_id = data_source_key`. Связывает компонент с запросом в `config.component_queries.query_id`. Пример: `header` компонент имеет `data_source_key = 'header_dates'` для получения дат периодов. |
| `action_type` | VARCHAR(100) | Тип действия при клике на компонент (например, "navigate", "filter", "drill-down"). Используется на фронтенде для обработки взаимодействий с компонентом. |
| `action_target` | VARCHAR(200) | Цель действия при клике (например, URL для перехода, ID другого компонента). Используется вместе с action_type на фронтенде. |
| `action_params` | JSONB | JSON объект с параметрами действия. Используется на фронтенде для передачи дополнительных параметров при выполнении действия (например, параметры фильтрации, query параметры для URL). |
| `settings` | JSONB | JSON объект с настройками компонента. Для кнопок (button) содержит `fieldId` и `groupBy` для группировки данных. Для других компонентов может содержать размеры, цвета, параметры отображения. Используется на фронтенде для кастомизации внешнего вида и поведения компонента. |
| `description` | TEXT | Описание назначения компонента. Используется в административном интерфейсе для понимания, что делает компонент. |
| `category` | VARCHAR(100) | Категория компонента (например, "finance", "balance", "clients"). Используется для фильтрации KPI метрик по категориям через `/api/data?query_id=kpis&parametrs={"category":"finance"}`. |
| `is_active` | BOOLEAN, DEFAULT true | Флаг активности компонента. Неактивные компоненты не отображаются в layouts. Используется в SQL Builder при загрузке компонентов через `/api/data?query_id=layout` и `/api/data?query_id=kpis` (WHERE is_active = TRUE). |
| `created_by` | VARCHAR(100) | Пользователь, создавший компонент. Используется для аудита изменений. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания компонента. Используется для аудита. |
| `updated_by` | VARCHAR(100) | Пользователь, последний раз обновивший компонент. Используется для аудита изменений. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления компонента. Используется для аудита. |
| `deleted_by` | VARCHAR(100) | Пользователь, удаливший компонент. Используется для аудита удаления (soft delete). |
| `deleted_at` | TIMESTAMP | Дата и время удаления компонента (soft delete). Используется в SQL Builder при загрузке компонентов через `/api/data?query_id=layout` и `/api/data?query_id=kpis` (WHERE deleted_at IS NULL). |

**Индексы:**
- `idx_components_type` - на `component_type` для фильтрации по типу
- `idx_components_is_active` - на `is_active` для фильтрации активных компонентов
- `idx_components_category` - на `category` для фильтрации по категории

**Примеры компонентов:**
- `header` - компонент header с `data_source_key = 'header_dates'` для получения дат периодов
- `assets_table` - таблица активов с `data_source_key = 'assets_table'`
- `capital_card` - карточка капитала (без `data_source_key`, использует KPI API)
- `button_assets_table_cfo` - кнопка группировки по ЦФО для таблицы активов

**Использование:** В SQL Builder при получении layout через `/api/data?query_id=layout` и KPI метрик через `/api/data?query_id=kpis` для получения метаданных компонентов. Компоненты с `data_source_key` получают данные через `/api/data` endpoint.

### config.component_fields

Поля компонентов - определяют структуру данных компонента.

**Назначение:** Для карточек это метрики (value, change, ytdChange) и их форматы. Для таблиц это колонки (name, value, percentage, change) с их типами, метками и форматами. Позволяет динамически настроить структуру отображения данных компонента без изменения кода. Используется в SQL Builder при получении layout через `/api/data?query_id=layout` для построения структуры колонок таблиц и форматов карточек.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER, PK | Первичный ключ поля компонента. Автоинкремент. Используется для уникальной идентификации каждого поля. |
| `component_id` | VARCHAR(200), NOT NULL, FK | ID компонента, к которому относится это поле. Ссылка на config.components.id. Используется в layoutService.ts для выборки всех полей компонента (WHERE component_id = $1). |
| `field_id` | VARCHAR(200), NOT NULL | Идентификатор поля (например, "value", "change_pptd", "change_ytd", "name", "percentage"). Используется как ключ поля в формате компонента (format[fieldId] = formatId) и как id колонки в таблицах. Для карточек обычно: "value" (основное значение), "change_pptd" или "PPTD" (изменение к предыдущему периоду), "change_ytd" или "YTD" (изменение с начала года). Для таблиц это названия колонок. |
| `field_type` | VARCHAR(50), NOT NULL | Тип поля: "number", "percent", "string", "date", "boolean". Используется на фронтенде для определения способа отображения и валидации значения поля. |
| `label` | VARCHAR(200) | Метка поля для отображения (например, "Значение", "Изменение", "Процент"). Используется на фронтенде как заголовок колонки таблицы или подпись метрики карточки. Если не указан, используется field_id. |
| `description` | TEXT | Описание поля. Используется в административном интерфейсе для понимания назначения поля и на фронтенде в tooltip при наведении на колонку. |
| `format_id` | VARCHAR(100), FK | ID формата для форматирования значения поля. Ссылка на config.formats.id. Используется в layoutService.ts для построения объекта формата компонента (format.value = formatId, format.PPTD = formatId). Используется на фронтенде в formatters.ts для форматирования значений через formatValue(formatId, value). |
| `parent_field_id` | VARCHAR(200) | ID родительского поля для создания иерархии полей. Если указан, поле является дочерним и используется в подформате (например, format.PPTD для поля с parent_field_id = "value"). Используется в layoutService.ts для разделения полей на основные (parent_field_id IS NULL) и дочерние (parent_field_id указан) при построении формата. |
| `is_visible` | BOOLEAN, DEFAULT true | Флаг видимости поля. Если false, поле не отображается в компоненте. Используется в layoutService.ts для фильтрации видимых полей (WHERE is_visible = TRUE) при построении структуры компонента. Позволяет скрыть колонки таблиц или метрики карточек без удаления. |
| `settings` | JSONB | JSON объект с дополнительными настройками поля (например, цвета, стили, валидация). Используется на фронтенде для кастомизации отображения поля. |
| `display_order` | INTEGER, DEFAULT 0 | Порядок отображения поля в компоненте. Используется в layoutService.ts для сортировки полей (ORDER BY display_order ASC) при построении списка колонок таблицы или формата карточки. Определяет порядок колонок в таблице. |
| `is_active` | BOOLEAN, DEFAULT true | Флаг активности поля. Неактивные поля не используются в компоненте. Используется в layoutService.ts для фильтрации активных полей (WHERE is_active = TRUE). |
| `is_dimension` | BOOLEAN, DEFAULT false | Флаг того, что поле является измерением (dimension). Используется для группировки и фильтрации данных в таблицах. Например, "client_segment", "product_code" - это измерения. |
| `is_measure` | BOOLEAN, DEFAULT false | Флаг того, что поле является метрикой (measure). Используется для определения числовых полей, которые нужно агрегировать. Например, "value", "percentage" - это метрики. |
| `compact_display` | BOOLEAN, DEFAULT false | Флаг компактного отображения поля. Используется на фронтенде для уменьшения размера колонки или метрики (например, скрыть подписи). |
| `is_groupable` | BOOLEAN, DEFAULT false | Флаг возможности группировки по полю. Используется для определения, можно ли группировать данные таблицы по этому полю (например, группировка доходов по сегментам клиентов). Для таких полей создаются кнопки-компоненты типа "button". |
| `created_by` | VARCHAR(100) | Пользователь, создавший поле. Используется для аудита. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания поля. Используется для аудита. |
| `updated_by` | VARCHAR(100) | Пользователь, последний раз обновивший поле. Используется для аудита. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления поля. Используется для аудита. |
| `deleted_by` | VARCHAR(100) | Пользователь, удаливший поле (soft delete). Используется для аудита. |
| `deleted_at` | TIMESTAMP | Дата и время удаления поля (soft delete). Используется в layoutService.ts для фильтрации удаленных полей (WHERE deleted_at IS NULL). |

**Индексы:**
- `uq_cf_component_field_active` - уникальный индекс на `(component_id, field_id)` WHERE `deleted_at IS NULL`
- `idx_cf_component` - на `component_id` для быстрого поиска полей компонента
- `idx_cf_field_id` - на `field_id` для поиска по идентификатору поля
- `idx_cf_display_order` - на `display_order` для сортировки
- `idx_cf_is_active` - на `is_active` для фильтрации активных полей
- `idx_cf_parent_field` - на `parent_field_id` для построения иерархии полей

**Использование:** В SQL Builder при получении layout через `/api/data?query_id=layout` для построения структуры колонок таблиц и форматов карточек.

### config.layout_component_mapping

Таблица связи layouts и components.

**Назначение:** Определяет, какие компоненты используются в каком layout, в каком порядке они отображаются и какая иерархия между ними (секции -> компоненты). Один компонент может использоваться в нескольких layouts, и в каждом layout он может иметь разные настройки (override). Это основа для построения структуры дашборда - SQL Builder использует эту таблицу через view `config.layout_sections_json_view` при получении layout через `/api/data?query_id=layout` для построения JSON структуры layout с секциями и компонентами.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER, PK | Первичный ключ записи связи. Автоинкремент. Используется для уникальной идентификации каждой связи layout-компонент. |
| `layout_id` | VARCHAR(100), NOT NULL, FK | ID layout, к которому относится этот компонент. Ссылка на config.layouts.id. Используется в layoutService.ts для выборки всех компонентов конкретного layout (WHERE layout_id = $1). |
| `component_id` | VARCHAR(200), NOT NULL, FK | ID компонента из глобальной библиотеки. Ссылка на config.components.id. Определяет, какой компонент используется в этом layout. Используется для получения метаданных компонента из config.components через JOIN. |
| `parent_component_id` | VARCHAR(200) | ID родительского компонента для создания иерархии. Если NULL, то компонент находится на верхнем уровне (секция для component_type='container', header для component_type='header'). Если указан, компонент является дочерним (например, кнопки привязаны к таблицам через parent_component_id = table_id). Ссылается на component_id другого компонента в том же layout. |
| `display_order` | INTEGER, DEFAULT 0 | Порядок отображения компонента в layout. Используется в layoutService.ts для сортировки компонентов (ORDER BY display_order ASC). Определяет порядок отображения секций и компонентов на дашборде. Header обычно имеет display_order = 0. |
| `is_visible` | BOOLEAN, DEFAULT true | Флаг видимости компонента в layout. Если false, компонент не отображается на дашборде, но остается в базе (для быстрого включения обратно). Используется для временного скрытия компонентов без удаления. |
| `created_by` | VARCHAR(100) | Пользователь, создавший эту связь layout-компонент. Используется для аудита. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания связи. Используется для аудита. |
| `updated_by` | VARCHAR(100) | Пользователь, последний раз обновивший эту связь. Используется для аудита. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления связи. Используется для аудита. |
| `deleted_by` | VARCHAR(100) | Пользователь, удаливший эту связь (soft delete). Используется для аудита. |
| `deleted_at` | TIMESTAMP | Дата и время удаления связи (soft delete). Используется в layoutService.ts для фильтрации удаленных связей (WHERE deleted_at IS NULL). Позволяет скрыть компонент из layout без физического удаления записи. |

**Индексы:**
- `idx_lcm_layout` - на `layout_id` для быстрого поиска компонентов layout
- `idx_lcm_parent` - на `parent_component_id` для поиска дочерних компонентов
- `idx_lcm_component` - на `component_id` для поиска layouts, использующих компонент
- `idx_lcm_display_order` - на `display_order` для сортировки
- `idx_lcm_is_visible` - на `is_visible` для фильтрации видимых компонентов

**Использование:** В SQL Builder при получении layout через `/api/data?query_id=layout` для построения структуры layout.

### config.component_queries

Конфиги SQL запросов для SQL Builder.

**Назначение:** Единый источник JSON-конфигов для генерации SQL запросов через SQL Builder.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | SERIAL, PK | ID записи. Автоинкремент. Используется для уникальной идентификации каждого конфига. |
| `query_id` | VARCHAR(200), NOT NULL, UNIQUE | Уникальный идентификатор запроса (например, 'header_dates', 'assets_table', 'layout'). Используется в SQL Builder через buildQueryFromId(query_id, paramsJson). Связывается с компонентами через config.components.data_source_key = query_id. |
| `title` | VARCHAR(500) | Название запроса для отображения. Используется в административном интерфейсе для идентификации запроса. |
| `config_json` | JSONB, NOT NULL | JSON конфиг для SQL Builder в формате QueryConfig. Содержит структуру запроса: from, select, where, groupBy, orderBy, limit, offset, params, paramTypes. Используется в SQL Builder для построения SQL запроса. |
| `wrap_json` | BOOLEAN, DEFAULT FALSE | Нужно ли оборачивать результат в jsonb_agg. Если true, SQL Builder оборачивает результат в `SELECT jsonb_agg(row_to_json(t)) FROM (...) t`. Используется для endpoint `/api/data`, который требует wrapJson=true. |
| `is_active` | BOOLEAN, DEFAULT TRUE | Активен ли запрос. Неактивные запросы не используются. Используется в SQL Builder для фильтрации активных конфигов (WHERE is_active = TRUE). |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания конфига. Используется для аудита. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления конфига. Используется для аудита. |
| `deleted_at` | TIMESTAMP | Мягкое удаление - дата удаления. Используется в SQL Builder для фильтрации удаленных конфигов (WHERE deleted_at IS NULL). |

**Индексы:**
- Уникальный индекс на `query_id` (WHERE deleted_at IS NULL)
- `idx_component_queries_active` - на `is_active` (WHERE deleted_at IS NULL)

**Примеры конфигов:**
- `header_dates` - получение максимальной даты периода из mart.kpi_metrics
- `assets_table` - получение данных таблицы активов с расчетом изменений за три периода
- `layout` - получение структуры sections через view layout_sections_json_view
- `kpis` - получение KPI метрик для карточек через view mart.kpis_view с агрегацией по периодам

**Использование:** SQL Builder читает конфиги из этой таблицы по `query_id` и строит параметризованные SQL запросы.

**См. также:** [Component Queries](/reference/component-queries) - детальное описание и примеры конфигов

### config.layout_formats_view

Плоский view для форматов, используемых в layout.

**Назначение:** Содержит все форматы, которые используются в активных полях активных компонентов layout. Фильтрует удалённые и неактивные записи.

**Поля:**
- `layout_id` - ID layout
- `format_id` - ID формата
- `kind` - тип формата
- `pattern` - паттерн форматирования
- `prefix_unit_symbol` - префикс символа
- `suffix_unit_symbol` - суффикс символа
- `minimum_fraction_digits` - минимальное количество знаков после запятой
- `maximum_fraction_digits` - максимальное количество знаков после запятой
- `thousand_separator` - разделитель тысяч
- `multiplier` - множитель
- `shorten` - сокращение

**Использование:** Для получения всех форматов, используемых в конкретном layout.

### config.layout_header_view

Плоский view для header компонента layout.

**Назначение:** Содержит информацию о header компоненте для каждого layout. Фильтрует удалённые и неактивные записи. Возвращает только один header на layout (первый по display_order).

**Поля:**
- `layout_id` - ID layout
- `header_component_id` - ID компонента header
- `title` - заголовок header
- `label` - подпись header
- `tooltip` - подсказка header
- `icon` - иконка header
- `data_source_key` - ключ источника данных

**Использование:** Для получения header компонента layout.

### config.layout_sections_view

Плоский view для секций, компонентов и кнопок layout.

**Назначение:** Содержит информацию о компонентах внутри секций (контейнеров) и кнопках, которые являются дочерними компонентами компонентов. Фильтрует удалённые и неактивные записи. Секции - это компоненты с component_type = container.

**Поля:**
- `layout_id` - ID layout
- `section_id` - ID секции (контейнера)
- `section_title` - заголовок секции
- `component_id` - ID компонента
- `component_type` - тип компонента
- `display_order` - порядок отображения
- `is_visible` - видимость компонента
- `data_source_key` - ключ источника данных
- `parent_component_id` - ID родительского компонента
- `component_title`, `component_label`, `component_tooltip`, `component_icon`, `component_settings` - метаданные компонента

**Использование:** Для получения структуры секций и компонентов layout.

### config.layout_sections_agg_view

View для сборки sections через jsonb_agg.

**Назначение:** Содержит все данные в плоском виде: секции, компоненты, кнопки, колонки, подколонки. Используется для построения JSON структуры sections через агрегацию.

**Поля:** Расширенный набор полей, включающий все уровни иерархии (секции, компоненты, кнопки, колонки, подколонки).

**Использование:** Для построения JSON структуры sections через агрегацию.

### config.layout_sections_json_view

Агрегированный view с готовой структурой sections (jsonb) для использования через SQL Builder.

**Назначение:** Содержит готовую JSON структуру sections для каждого layout. Используется через SQL Builder с query_id = 'layout'.

**Поля:**
- `layout_id` - ID layout
- `section_id` - ID секции
- `section` - JSON объект секции с компонентами, кнопками, колонками

**Использование:** Через `/api/data` с `query_id = 'layout'` и параметром `layout_id`.

## Схема mart

Data Mart - агрегированные данные для быстрого чтения через API.

### mart.kpi_metrics

Универсальная таблица для всех KPI метрик (карточек).

**Назначение:** Хранение значений KPI метрик по периодам для всех карточек дашборда.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER, PK | ID записи. Автоинкремент. Используется для уникальной идентификации каждой записи. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания записи. Используется для аудита. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления записи. Используется для аудита. |
| `component_id` | VARCHAR(200), NOT NULL | Ссылка на config.components.id (component_type='card'). Определяет, для какой карточки это значение. Используется в SQL Builder при получении KPI метрик через `/api/data?query_id=kpis`. |
| `period_date` | DATE, NOT NULL | Дата периода (YYYY-MM-DD). Определяет, за какой период это значение. Используется для расчета изменений относительно предыдущего периода и предыдущего года. |
| `value` | NUMERIC(18, 6), NOT NULL | Значение метрики. Основное числовое значение KPI. Используется для отображения на карточке и расчета изменений. |

**Индексы:**
- Уникальный индекс на `(component_id, period_date)` для предотвращения дубликатов
- `idx_kpi_metrics_component` - на `component_id` для быстрого поиска метрик карточки
- `idx_kpi_metrics_date` - на `period_date DESC` для поиска по датам
- `idx_kpi_metrics_component_date` - составной индекс на `(component_id, period_date DESC)` для оптимизации запросов с фильтрацией по компоненту и дате

**Использование:** В SQL Builder при получении KPI метрик через `/api/data?query_id=kpis`. API возвращает только сырые значения (value, previousValue, ytdValue), расчет изменений (ppChange, ytdChange) выполняется на фронтенде.

### mart.balance

Данные баланса с иерархией статей и аналитическими разрезами.

**Назначение:** Хранение данных баланса (активы, пассивы, капитал) с детализацией по статьям и аналитическим разрезам.

**Иерархические поля (что учитываем):**

| Поле | Тип | Описание |
|------|-----|----------|
| `class` | VARCHAR(50), NOT NULL | Класс баланса: 'assets' (активы), 'liabilities' (пассивы), 'equity' (капитал). Используется для разделения активов и пассивов. Используется в SQL Builder при получении данных через `/api/data?query_id=assets_table` или `/api/data?query_id=liabilities_table` для фильтрации данных (WHERE class = 'assets' или WHERE class = 'liabilities'). |
| `section` | VARCHAR(100) | Раздел баланса: кредиты, денежные средства, депозиты, собственный капитал. Используется для группировки статей баланса. |
| `item` | VARCHAR(200) | Статья баланса: управленческие статьи, согласованные с учётом. Используется для детализации раздела. |
| `sub_item` | VARCHAR(200) | Подстатья: детализация по условиям/типам. Используется для дальнейшей детализации статьи. |

**Аналитические разрезы (как анализируем):**

| Поле | Тип | Описание |
|------|-----|----------|
| `client_type` | VARCHAR(50) | Тип клиента (например, 'individual', 'corporate'). Используется для анализа по типам клиентов. |
| `client_segment` | VARCHAR(100) | Сегмент клиента (например, 'retail', 'premium', 'corporate'). Используется для сегментации клиентской базы. |
| `product_code` | VARCHAR(100) | Код продукта. Используется для анализа по продуктам. |
| `portfolio_code` | VARCHAR(100) | Код портфеля. Используется для анализа по портфелям. |
| `currency_code` | VARCHAR(10), DEFAULT 'RUB' | Код валюты (например, 'RUB', 'USD', 'EUR'). Используется для мультивалютного анализа. |
| `maturity_bucket` | VARCHAR(50) | Срок погашения (например, 'overnight', '1-7days', '1-3months'). Используется для анализа по срокам. |
| `interest_type` | VARCHAR(50) | Тип процентов (например, 'fixed', 'floating'). Используется для анализа процентных ставок. |
| `collateral_type` | VARCHAR(100) | Тип обеспечения. Используется для анализа залогов. |
| `risk_class` | VARCHAR(50) | Класс риска. Используется для анализа рисков. |
| `org_unit_code` | VARCHAR(100) | Код подразделения (ЦФО). Используется для анализа по подразделениям. |
| `region` | VARCHAR(100) | Регион. Используется для регионального анализа. |
| `dimensions` | JSONB | Дополнительные аналитические разрезы в формате JSON. Используется для расширяемости аналитики. |

**Основные поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER, PK | ID записи. Автоинкремент. Используется для уникальной идентификации каждой записи. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания записи. Используется для аудита. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления записи. Используется для аудита. |
| `table_component_id` | VARCHAR(200), NOT NULL | Ссылка на config.components.id (component_type='table'). Определяет, для какой таблицы это значение. Используется для связи данных с компонентом таблицы. |
| `row_code` | VARCHAR(100), NOT NULL | Код строки (например, 'a1', 'a2-1', 'l1'). Используется для идентификации строки таблицы. Маппится в человекочитаемые названия через rowNameMapper. |
| `period_date` | DATE, NOT NULL | Дата периода (YYYY-MM-DD). Определяет, за какой период это значение. Используется для расчета изменений относительно предыдущего периода и предыдущего года. |
| `value` | NUMERIC(20, 2), NOT NULL | Значение баланса. Основное числовое значение статьи баланса. Используется для отображения в таблице и расчета метрик. |

**Индексы:**
- Составной уникальный индекс на всех полях для дедупликации: `(table_component_id, row_code, period_date, class, section, item, sub_item, client_type, client_segment, product_code, portfolio_code, currency_code, maturity_bucket, interest_type, collateral_type, risk_class, org_unit_code, region)`
- `idx_balance_component` - на `table_component_id` для поиска данных компонента
- `idx_balance_date` - на `period_date DESC` для поиска по датам
- `idx_balance_row_code` - на `(row_code, period_date)` для поиска по коду строки
- `idx_balance_class` - на `(class, period_date)` для фильтрации по классу
- `idx_balance_section` - на `(section, period_date)` WHERE `section IS NOT NULL` для фильтрации по разделу
- `idx_balance_item` - на `(item, period_date)` WHERE `item IS NOT NULL` для фильтрации по статье
- `idx_balance_client_type` - на `(client_type, period_date)` WHERE `client_type IS NOT NULL` для фильтрации по типу клиента
- `idx_balance_segment` - на `(client_segment, period_date)` WHERE `client_segment IS NOT NULL` для фильтрации по сегменту
- `idx_balance_product` - на `(product_code, period_date)` WHERE `product_code IS NOT NULL` для фильтрации по продукту
- `idx_balance_currency` - на `(currency_code, period_date)` для фильтрации по валюте
- `idx_balance_maturity` - на `(maturity_bucket, period_date)` WHERE `maturity_bucket IS NOT NULL` для фильтрации по сроку
- `idx_balance_interest_type` - на `(interest_type, period_date)` WHERE `interest_type IS NOT NULL` для фильтрации по типу процентов
- `idx_balance_risk_class` - на `(risk_class, period_date)` WHERE `risk_class IS NOT NULL` для фильтрации по классу риска
- `idx_balance_region` - на `(region, period_date)` WHERE `region IS NOT NULL` для фильтрации по региону
- `idx_balance_component_date_class` - составной индекс на `(table_component_id, period_date DESC, class)` для оптимизации запросов

**Использование:** В SQL Builder при получении данных баланса через `/api/data?query_id=assets_table` или `/api/data?query_id=liabilities_table`. API возвращает только сырые значения (value, previousValue, ytdValue), расчет метрик (ppChange, ytdChange) выполняется на фронтенде.

### mart.kpis_view

View для получения KPI карточек с учетом layout_id.

**Назначение:** Агрегирует данные из `mart.kpi_metrics` для активных карточек, которые присутствуют в layout. Фильтрует только активные карточки (`component_type='card'`), которые есть в `config.layout_component_mapping` и находятся внутри секций (не являются top-level компонентами). Используется SQL Builder для получения KPI метрик через `/api/data?query_id=kpis`.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `layout_id` | VARCHAR(100) | ID layout, к которому относится карточка. Используется для фильтрации карточек по layout. |
| `component_id` | VARCHAR(200) | ID компонента (карточки) из `config.components.id`. Связывается с `mart.kpi_metrics.component_id`. |
| `component_title` | VARCHAR(200) | Название компонента из `config.components.title`. Используется для отображения на фронтенде. |
| `component_category` | VARCHAR(100) | Категория компонента из `config.components.category`. Используется для группировки карточек. |
| `period_date` | DATE | Дата периода из `mart.kpi_metrics.period_date`. Используется для расчета изменений относительно предыдущего периода и предыдущего года. |
| `value` | NUMERIC(20, 2) | Значение метрики из `mart.kpi_metrics.value`. Основное числовое значение KPI метрики. |

**Особенности:**
- Фильтрует только активные карточки (`is_active = TRUE`, `deleted_at IS NULL`)
- Фильтрует только карточки, которые есть в layout (`layout_component_mapping`)
- Фильтрует только карточки внутри секций (`parent_component_id IS NOT NULL`)
- Сортирует по `layout_id`, `component_id`, `period_date DESC`

**Использование:** В SQL Builder через конфиг `query_id=kpis` для получения KPI метрик с агрегацией по периодам через CASE WHEN.

**См. также:** [SQL Builder](/reference/sql-builder) - документация SQL Builder

### mart.financial_results

Финансовые результаты (P&L).

**Назначение:** Хранение данных финансовых результатов (доходы, расходы).

**Иерархические поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `report_class` | VARCHAR(50) | Класс: 'income' (доходы), 'expense' (расходы) |
| `pl_section` | VARCHAR(100) | Раздел P&L |
| `line_item` | VARCHAR(200) | Статья (Line item) |
| `sub_line_item` | VARCHAR(200) | Подстатья |

**Аналитические разрезы:**
- `cfo_code` (VARCHAR(100)) - Код ЦФО
- `product_code` (VARCHAR(100)) - Код продукта
- `client_segment` (VARCHAR(100)) - Сегмент клиента
- `channel` (VARCHAR(100)) - Канал
- `region` (VARCHAR(100)) - Регион
- `project_code` (VARCHAR(100)) - Код проекта

**Основные поля:**
- `table_component_id` (VARCHAR(200)) - Ссылка на config.components.id
- `row_code` (VARCHAR(100)) - Код строки
- `period_date` (DATE) - Дата периода
- `value` (NUMERIC(20,2)) - Значение

**Использование:** В `financialResultsService.ts` для получения доходов и расходов.

## Схема stg (Staging)

Временное хранилище данных для загрузки файлов.

### stg.balance_upload

Временное хранилище данных баланса из загруженных файлов.

**Назначение:** Промежуточное хранилище данных перед загрузкой в ODS. Данные из файлов сначала загружаются в STG, затем валидируются и трансформируются в ODS.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | SERIAL, PK | ID записи. Автоинкремент. Используется для уникальной идентификации каждой записи. |
| `upload_id` | INTEGER, NOT NULL, FK | Ссылка на запись о загрузке в ing.uploads. Используется для связи данных с конкретной загрузкой файла. Позволяет отследить, какие данные были загружены в рамках одной загрузки. |
| `period_date` | DATE, NOT NULL | Дата периода (YYYY-MM-DD). Дата, за которую эти данные. Используется для валидации и трансформации в ODS. |
| `class` | VARCHAR(50), NOT NULL | Класс баланса: 'assets' (активы), 'liabilities' (пассивы). Используется для разделения активов и пассивов. |
| `section` | VARCHAR(100) | Раздел баланса. Используется для группировки статей баланса. |
| `item` | VARCHAR(200) | Статья баланса. Используется для детализации раздела. |
| `sub_item` | VARCHAR(200) | Подстатья баланса. Используется для дальнейшей детализации статьи. |
| `value` | NUMERIC(20, 2), NOT NULL | Значение баланса. Основное числовое значение статьи баланса. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания записи. Используется для аудита. |
| `created_by` | VARCHAR(200), DEFAULT 'system' | Пользователь, создавший запись. Используется для аудита. |

**Индексы:**
- `idx_stg_balance_upload_id` - на `upload_id` для быстрого поиска данных загрузки
- `idx_stg_balance_upload_period` - на `period_date` для поиска по датам

**Использование:** В `ingestionService.ts` для загрузки данных из файлов перед трансформацией в ODS.

## Схема ods (Operational Data Store)

Основное хранилище загруженных данных.

### ods.balance

Основное хранилище загруженных данных баланса.

**Назначение:** Основное хранилище данных баланса после загрузки из файлов. Данные попадают сюда из STG после валидации и трансформации. Отсюда данные могут быть загружены в MART для агрегации.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | SERIAL, PK | ID записи. Автоинкремент. Используется для уникальной идентификации каждой записи. |
| `period_date` | DATE, NOT NULL | Дата периода (YYYY-MM-DD). Дата, за которую эти данные. Используется для фильтрации и агрегации данных. |
| `class` | VARCHAR(50), NOT NULL | Класс баланса: 'assets' (активы), 'liabilities' (пассивы). Используется для разделения активов и пассивов. |
| `section` | VARCHAR(100) | Раздел баланса. Используется для группировки статей баланса. |
| `item` | VARCHAR(200) | Статья баланса. Используется для детализации раздела. |
| `sub_item` | VARCHAR(200) | Подстатья баланса. Используется для дальнейшей детализации статьи. |
| `value` | NUMERIC(20, 2), NOT NULL | Значение баланса. Основное числовое значение статьи баланса. |
| `upload_id` | INTEGER, FK | Ссылка на загрузку, которая создала эту запись. Используется для отслеживания источника данных и возможности отката загрузки. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания записи. Используется для аудита. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления записи. Используется для аудита. |
| `created_by` | VARCHAR(200), DEFAULT 'system' | Пользователь, создавший запись. Используется для аудита. |
| `updated_by` | VARCHAR(200) | Пользователь, последний раз обновивший запись. Используется для аудита. |
| `deleted_at` | TIMESTAMP | Мягкое удаление - дата удаления. Используется для возможности отката загрузки. Когда данные заменяются новой загрузкой, старые данные помечаются как удаленные (soft delete) вместо физического удаления. |
| `deleted_by` | VARCHAR(200) | Пользователь, удаливший запись (soft delete). Используется для аудита. |

**Индексы:**
- `idx_ods_balance_period` - на `period_date DESC` для поиска по датам
- `idx_ods_balance_class` - на `(class, period_date)` для фильтрации по классу
- `idx_ods_balance_upload_id` - на `upload_id` для поиска данных загрузки
- `idx_ods_balance_deleted` - на `deleted_at` WHERE `deleted_at IS NULL` для фильтрации активных записей
- Уникальный индекс на `(period_date, class, section, item, sub_item)` WHERE `deleted_at IS NULL` для предотвращения дубликатов

**Использование:** В `ingestionService.ts` для трансформации данных из STG и загрузки в MART.

## Схема ing (Ingestion)

Метаданные загрузок файлов.

### ing.uploads

История загрузок файлов в систему.

**Назначение:** Хранение метаданных о каждой загрузке файла: статус, количество обработанных строк, ошибки валидации, информация о файле.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | SERIAL, PK | ID загрузки. Автоинкремент. Используется для уникальной идентификации каждой загрузки. Ссылается из stg.balance_upload.upload_id и ods.balance.upload_id. |
| `filename` | VARCHAR(500), NOT NULL | Имя файла после сохранения (с timestamp). Используется для идентификации сохраненного файла на диске. |
| `original_filename` | VARCHAR(500), NOT NULL | Оригинальное имя файла при загрузке. Используется для отображения пользователю оригинального имени файла. |
| `file_path` | VARCHAR(1000), NOT NULL | Полный путь к сохраненному файлу. Используется для доступа к файлу на диске. |
| `file_size` | BIGINT, NOT NULL | Размер файла в байтах. Используется для контроля размера загружаемых файлов. |
| `file_type` | VARCHAR(50), NOT NULL | Тип файла: 'csv', 'xlsx'. Используется для определения способа парсинга файла. |
| `target_table` | VARCHAR(100), NOT NULL | Целевая таблица для загрузки: 'balance', и т.д. Используется для определения, в какую таблицу загружать данные. |
| `status` | VARCHAR(50), NOT NULL, DEFAULT 'pending' | Статус загрузки: 'pending' (ожидает обработки), 'processing' (обрабатывается), 'completed' (завершена), 'failed' (ошибка), 'rolled_back' (откачена). Используется для отслеживания состояния загрузки. |
| `rows_processed` | INTEGER, DEFAULT 0 | Количество обработанных строк. Используется для отображения прогресса загрузки. |
| `rows_successful` | INTEGER, DEFAULT 0 | Количество успешно загруженных строк. Используется для статистики загрузки. |
| `rows_failed` | INTEGER, DEFAULT 0 | Количество строк с ошибками. Используется для статистики загрузки. |
| `validation_errors` | JSONB | Ошибки валидации в формате JSON (1-2 примера + общее количество). Используется для отображения ошибок пользователю без загрузки всех ошибок. Формат: `{ examples: [...], totalCount: number, byType: {...} }`. |
| `created_by` | VARCHAR(200), DEFAULT 'system' | Пользователь, создавший загрузку. Используется для аудита. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания загрузки. Используется для аудита и сортировки загрузок. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления загрузки. Используется для аудита. |
| `rolled_back_at` | TIMESTAMP | Дата отката загрузки. Используется для отслеживания откаченных загрузок. |
| `rolled_back_by` | VARCHAR(200) | Пользователь, выполнивший откат. Используется для аудита. |

**Индексы:**
- `idx_uploads_status` - на `status` для фильтрации по статусу
- `idx_uploads_target_table` - на `target_table` для фильтрации по целевой таблице
- `idx_uploads_created_at` - на `created_at DESC` для сортировки по дате создания

**Использование:** В `uploadRoutes.ts` для отслеживания статуса загрузок и в `ingestionService.ts` для обновления статуса загрузки.

## Схема dict (Dictionary)

Справочники и маппинги.

### dict.upload_mappings

Справочник маппинга полей при загрузке файлов.

**Назначение:** Определяет, как поля из загружаемого файла маппятся в поля целевой таблицы. Используется в validationService.ts для валидации данных и в ingestionService.ts для трансформации данных.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | SERIAL, PK | ID записи. Автоинкремент. Используется для уникальной идентификации каждого маппинга. |
| `target_table` | VARCHAR(100), NOT NULL | Целевая таблица: 'balance', и т.д. Определяет, для какой таблицы этот маппинг. Используется для выборки маппингов для конкретной таблицы. |
| `source_field` | VARCHAR(200), NOT NULL | Поле в исходном файле: 'month', 'class', 'section', 'item', 'amount'. Название колонки в загружаемом файле. |
| `target_field` | VARCHAR(200), NOT NULL | Поле в целевой таблице: 'period_date', 'class', 'section', 'item', 'value'. Название поля в целевой таблице БД. |
| `field_type` | VARCHAR(50), NOT NULL | Тип поля: 'date', 'varchar', 'numeric'. Используется в validationService.ts для валидации типов данных. |
| `is_required` | BOOLEAN, DEFAULT FALSE | Обязательное ли поле для заполнения. Используется в validationService.ts для проверки обязательных полей. |
| `validation_rules` | JSONB | Правила валидации в формате JSON (например, формат даты, диапазоны значений). Используется в validationService.ts для дополнительной валидации. Пример: `{"format": "YYYY-MM-DD", "min": 0}`. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания маппинга. Используется для аудита. |
| `updated_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время последнего обновления маппинга. Используется для аудита. |

**Индексы:**
- Уникальный индекс на `(target_table, source_field)` для предотвращения дубликатов маппингов

**Примеры маппингов для balance:**
- `month` → `period_date` (date, required)
- `class` → `class` (varchar, required)
- `section` → `section` (varchar, optional)
- `item` → `item` (varchar, optional)
- `amount` → `value` (numeric, required)

**Использование:** В `validationService.ts` для валидации данных и в `ingestionService.ts` для трансформации данных из файла в формат БД.

## Схема log (Logging)

Детальные логи операций.

### log.upload_errors

Детальное логирование ошибок при загрузке файлов.

**Назначение:** Хранение детальной информации об ошибках валидации при загрузке файлов. Используется для отладки и анализа проблем с данными.

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | SERIAL, PK | ID записи. Автоинкремент. Используется для уникальной идентификации каждой ошибки. |
| `upload_id` | INTEGER, NOT NULL, FK | Ссылка на загрузку в ing.uploads. Используется для связи ошибки с конкретной загрузкой. |
| `row_number` | INTEGER | Номер строки в файле с ошибкой. Используется для идентификации проблемной строки в файле. |
| `error_type` | VARCHAR(100), NOT NULL | Тип ошибки: 'validation', 'type_mismatch', 'required_missing', 'invalid_date_format', 'invalid_date_range', 'invalid_numeric_value', 'duplicate_record', и т.д. Используется для категоризации ошибок. |
| `error_message` | TEXT, NOT NULL | Описание ошибки. Детальное описание проблемы с данными. Используется для отображения пользователю и отладки. |
| `field_name` | VARCHAR(200) | Название поля с ошибкой. Используется для идентификации проблемного поля. |
| `field_value` | TEXT | Значение поля, вызвавшее ошибку. Используется для анализа проблемы. |
| `created_at` | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | Дата и время создания записи об ошибке. Используется для аудита. |

**Индексы:**
- `idx_upload_errors_upload_id` - на `upload_id` для быстрого поиска ошибок загрузки
- `idx_upload_errors_type` - на `error_type` для фильтрации по типу ошибки

**Использование:** В `validationService.ts` для логирования ошибок валидации и в `uploadRoutes.ts` для отображения детальных ошибок пользователю.

## Связи между схемами

### config ↔ mart

- `config.components.id` → `mart.kpi_metrics.component_id` (для карточек)
- `config.components.id` → `mart.balance.table_component_id` (для таблиц)
- `config.component_fields.format_id` → `config.formats.id` (для форматов)
- `config.components.data_source_key` → `config.component_queries.query_id` (для получения данных через SQL Builder)

### ing ↔ stg ↔ ods ↔ mart

- `ing.uploads.id` → `stg.balance_upload.upload_id` (связь загрузки с данными в STG)
- `ing.uploads.id` → `ods.balance.upload_id` (связь загрузки с данными в ODS)
- `stg.balance_upload` → `ods.balance` (трансформация данных из STG в ODS)
- `ods.balance` → `mart.balance` (агрегация данных из ODS в MART)

### dict ↔ stg/ods

- `dict.upload_mappings.target_table` определяет структуру данных для `stg.balance_upload` и `ods.balance`

## Индексы

Все таблицы имеют индексы для оптимизации:

- По внешним ключам для быстрого JOIN
- По часто используемым полям для фильтрации
- По датам для временных запросов
- Составные индексы для частых комбинаций полей
- Частичные индексы (WHERE условие) для оптимизации фильтрации

## См. также

- [Data Marts](/database/data-marts) - детали Data Mart структуры
- [Миграции](/database/migrations) - работа с миграциями
- [Архитектура БД](/architecture/database) - общая архитектура базы данных
- [Component Queries](/reference/component-queries) - описание конфигов запросов
- [SQL Builder](/reference/sql-builder) - документация SQL Builder
