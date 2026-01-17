-- ============================================================
-- МИГРАЦИЯ: КОММЕНТАРИИ К ПОЛЯМ ТАБЛИЦ CONFIG
-- ============================================================
-- Добавляет комментарии на русском языке ко всем полям таблиц
-- схемы config для понимания их назначения и использования
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CONFIG.LAYOUTS - Реестр layouts (структур дашбордов)
-- ============================================================

COMMENT ON TABLE config.layouts IS 
'Реестр структур дашбордов (layouts). Каждый layout определяет структуру отображения данных на дашборде - какие секции, компоненты и их порядок. Используется в layoutService.ts при построении JSON структуры для фронтенда.';

COMMENT ON COLUMN config.layouts.id IS 
'Уникальный идентификатор layout. Используется в layoutService.ts как ключ для выбора нужного layout. Пример: "main_dashboard".';

COMMENT ON COLUMN config.layouts.name IS 
'Название layout для отображения в интерфейсе администратора. Используется для идентификации layout человеком.';

COMMENT ON COLUMN config.layouts.description IS 
'Описание назначения layout. Помогает администраторам понять, для чего предназначен этот layout.';

COMMENT ON COLUMN config.layouts.status IS 
'Статус layout: "draft" (черновик), "published" (опубликован), "archived" (архив). Используется для управления версиями layouts.';

COMMENT ON COLUMN config.layouts.is_active IS 
'Флаг активности layout. Неактивные layouts не отображаются в списках и не могут быть выбраны по умолчанию. Используется в layoutService.ts для фильтрации активных layouts.';

COMMENT ON COLUMN config.layouts.is_default IS 
'Флаг layout по умолчанию. Если true, то этот layout используется, когда layout_id не указан в запросе. Используется в layoutService.ts при выборе layout по умолчанию.';

COMMENT ON COLUMN config.layouts.owner_user_id IS 
'ID пользователя-владельца layout. Используется для контроля доступа (в будущем).';

COMMENT ON COLUMN config.layouts.tags IS 
'Массив тегов для поиска и фильтрации layouts. Используется в административном интерфейсе для быстрого поиска нужного layout.';

COMMENT ON COLUMN config.layouts.category IS 
'Категория layout. Используется для группировки layouts в административном интерфейсе (например, "production", "test").';

COMMENT ON COLUMN config.layouts.display_order IS 
'Порядок отображения layout в списках. Используется в layoutService.ts при сортировке layouts (ORDER BY display_order).';

COMMENT ON COLUMN config.layouts.settings IS 
'JSON объект с настройками уровня layout (например, тема, размеры, общие параметры отображения). Используется на фронтенде для применения настроек ко всему layout.';

COMMENT ON COLUMN config.layouts.created_by IS 
'Пользователь, создавший layout. Используется для аудита изменений.';

COMMENT ON COLUMN config.layouts.created_at IS 
'Дата и время создания layout. Используется для аудита и сортировки по дате создания.';

COMMENT ON COLUMN config.layouts.updated_by IS 
'Пользователь, последний раз обновивший layout. Используется для аудита изменений.';

COMMENT ON COLUMN config.layouts.updated_at IS 
'Дата и время последнего обновления layout. Используется в layoutService.ts для сортировки при выборе layout по умолчанию (ORDER BY updated_at DESC).';

COMMENT ON COLUMN config.layouts.deleted_by IS 
'Пользователь, удаливший layout. Используется для аудита удаления (soft delete).';

COMMENT ON COLUMN config.layouts.deleted_at IS 
'Дата и время удаления layout (soft delete). Используется в layoutService.ts для фильтрации удаленных layouts (WHERE deleted_at IS NULL).';

-- ============================================================
-- 2. CONFIG.COMPONENTS - Библиотека компонентов
-- ============================================================

COMMENT ON TABLE config.components IS 
'Глобальная библиотека компонентов дашборда. Хранит определения всех типов компонентов (карточки, таблицы, графики, секции, фильтры), которые могут быть использованы в layouts. Каждый компонент определяет свой источник данных, формат отображения и другие параметры. Используется в layoutService.ts для получения метаданных компонентов при построении layout.';

COMMENT ON COLUMN config.components.id IS 
'Уникальный идентификатор компонента. Используется как ссылка в layout_component_mapping для связывания компонента с layout. Примеры: "capital_card", "balance_assets_table".';

COMMENT ON COLUMN config.components.component_type IS 
'Тип компонента: "container" (секция), "card" (KPI карточка), "table" (таблица), "chart" (график), "filter" (фильтр). Используется в layoutService.ts для определения, как отображать компонент на фронтенде.';

COMMENT ON COLUMN config.components.title IS 
'Заголовок компонента для отображения на дашборде. Используется на фронтенде как заголовок карточки/таблицы/графика. Используется в layoutService.ts при построении layout структуры.';

COMMENT ON COLUMN config.components.label IS 
'Короткая подпись компонента. Используется в местах, где нужно компактное отображение названия (например, в меню или списках).';

COMMENT ON COLUMN config.components.tooltip IS 
'Всплывающая подсказка при наведении на компонент. Используется на фронтенде для отображения дополнительной информации о компоненте.';

COMMENT ON COLUMN config.components.icon IS 
'Название иконки для компонента (например, "TrendingUpIcon", "WalletIcon"). Используется на фронтенде для отображения иконки рядом с заголовком компонента.';

COMMENT ON COLUMN config.components.data_source_key IS 
'Ключ источника данных компонента. Определяет, откуда брать данные для компонента. Для карточек это ID компонента в mart.kpi_metrics (component_id). Для таблиц это tableId для API /api/table-data/:tableId (например, "balance_assets", "balance_liabilities"). Используется на фронтенде для загрузки данных.';

COMMENT ON COLUMN config.components.action_type IS 
'Тип действия при клике на компонент (например, "navigate", "filter", "drill-down"). Используется на фронтенде для обработки взаимодействий с компонентом.';

COMMENT ON COLUMN config.components.action_target IS 
'Цель действия при клике (например, URL для перехода, ID другого компонента). Используется вместе с action_type на фронтенде.';

COMMENT ON COLUMN config.components.action_params IS 
'JSON объект с параметрами действия. Используется на фронтенде для передачи дополнительных параметров при выполнении действия (например, параметры фильтрации, query параметры для URL).';

COMMENT ON COLUMN config.components.settings IS 
'JSON объект с настройками компонента (например, размеры, цвета, параметры отображения). Используется на фронтенде для кастомизации внешнего вида и поведения компонента.';

COMMENT ON COLUMN config.components.description IS 
'Описание назначения компонента. Используется в административном интерфейсе для понимания, что делает компонент.';

COMMENT ON COLUMN config.components.category IS 
'Категория компонента (например, "finance", "balance", "clients"). Используется в kpiService.ts для фильтрации KPI метрик по категориям через /api/kpis?category=finance.';

COMMENT ON COLUMN config.components.is_active IS 
'Флаг активности компонента. Неактивные компоненты не отображаются в layouts. Используется в layoutService.ts и kpiService.ts для фильтрации активных компонентов (WHERE is_active = TRUE).';

COMMENT ON COLUMN config.components.created_by IS 
'Пользователь, создавший компонент. Используется для аудита изменений.';

COMMENT ON COLUMN config.components.created_at IS 
'Дата и время создания компонента. Используется для аудита.';

COMMENT ON COLUMN config.components.updated_by IS 
'Пользователь, последний раз обновивший компонент. Используется для аудита изменений.';

COMMENT ON COLUMN config.components.updated_at IS 
'Дата и время последнего обновления компонента. Используется для аудита.';

COMMENT ON COLUMN config.components.deleted_by IS 
'Пользователь, удаливший компонент. Используется для аудита удаления (soft delete).';

COMMENT ON COLUMN config.components.deleted_at IS 
'Дата и время удаления компонента (soft delete). Используется в layoutService.ts и kpiService.ts для фильтрации удаленных компонентов (WHERE deleted_at IS NULL).';

-- ============================================================
-- 3. CONFIG.LAYOUT_COMPONENT_MAPPING - Связь layouts и components
-- ============================================================

COMMENT ON TABLE config.layout_component_mapping IS 
'Таблица связи layouts и components. Определяет, какие компоненты используются в каком layout, в каком порядке они отображаются и какая иерархия между ними (секции -> компоненты). Один компонент может использоваться в нескольких layouts, и в каждом layout он может иметь разные настройки (override). Это основа для построения структуры дашборда - layoutService.ts использует эту таблицу для построения JSON структуры layout с секциями и компонентами.';

COMMENT ON COLUMN config.layout_component_mapping.id IS 
'Первичный ключ записи связи. Автоинкремент. Используется для уникальной идентификации каждой связи layout-компонент.';

COMMENT ON COLUMN config.layout_component_mapping.layout_id IS 
'ID layout, к которому относится этот компонент. Ссылка на config.layouts.id. Используется в layoutService.ts для выборки всех компонентов конкретного layout (WHERE layout_id = $1).';

COMMENT ON COLUMN config.layout_component_mapping.component_id IS 
'ID компонента из глобальной библиотеки. Ссылка на config.components.id. Определяет, какой компонент используется в этом layout. Используется для получения метаданных компонента из config.components через JOIN.';

COMMENT ON COLUMN config.layout_component_mapping.instance_id IS 
'Уникальный идентификатор экземпляра компонента в рамках конкретного layout. Один и тот же компонент может использоваться в одном layout несколько раз (например, несколько карточек одного типа), и у каждого будет свой instance_id. Используется на фронтенде как ключ для React компонентов (key={instanceId}). Должен быть уникален в рамках layout (UNIQUE(layout_id, instance_id)).';

COMMENT ON COLUMN config.layout_component_mapping.parent_instance_id IS 
'ID родительского экземпляра компонента для создания иерархии. Если NULL, то компонент находится на верхнем уровне (секция). Если указан, то компонент является дочерним (например, карточка внутри секции). Используется в layoutService.ts для построения иерархии: сначала выбираются секции (parent_instance_id IS NULL), потом их дочерние компоненты (WHERE parent_instance_id = $2).';

COMMENT ON COLUMN config.layout_component_mapping.display_order IS 
'Порядок отображения компонента в layout. Используется в layoutService.ts для сортировки компонентов (ORDER BY display_order ASC). Определяет порядок отображения секций и компонентов на дашборде.';

COMMENT ON COLUMN config.layout_component_mapping.is_visible IS 
'Флаг видимости компонента в layout. Если false, компонент не отображается на дашборде, но остается в базе (для быстрого включения обратно). Используется для временного скрытия компонентов без удаления.';

COMMENT ON COLUMN config.layout_component_mapping.created_by IS 
'Пользователь, создавший эту связь layout-компонент. Используется для аудита.';

COMMENT ON COLUMN config.layout_component_mapping.created_at IS 
'Дата и время создания связи. Используется для аудита.';

COMMENT ON COLUMN config.layout_component_mapping.updated_by IS 
'Пользователь, последний раз обновивший эту связь. Используется для аудита.';

COMMENT ON COLUMN config.layout_component_mapping.updated_at IS 
'Дата и время последнего обновления связи. Используется для аудита.';

COMMENT ON COLUMN config.layout_component_mapping.deleted_by IS 
'Пользователь, удаливший эту связь (soft delete). Используется для аудита.';

COMMENT ON COLUMN config.layout_component_mapping.deleted_at IS 
'Дата и время удаления связи (soft delete). Используется в layoutService.ts для фильтрации удаленных связей (WHERE deleted_at IS NULL). Позволяет скрыть компонент из layout без физического удаления записи.';

-- ============================================================
-- 4. CONFIG.COMPONENT_FIELDS - Поля компонентов (колонки/метрики)
-- ============================================================

COMMENT ON TABLE config.component_fields IS 
'Поля компонентов - определяют структуру данных компонента. Для карточек это метрики (value, change, ytdChange) и их форматы. Для таблиц это колонки (name, value, percentage, change) с их типами, метками и форматами. Позволяет динамически настроить структуру отображения данных компонента без изменения кода. Используется в layoutService.ts для построения структуры колонок таблиц и форматов карточек.';

COMMENT ON COLUMN config.component_fields.id IS 
'Первичный ключ поля компонента. Автоинкремент. Используется для уникальной идентификации каждого поля.';

COMMENT ON COLUMN config.component_fields.component_id IS 
'ID компонента, к которому относится это поле. Ссылка на config.components.id. Используется в layoutService.ts для выборки всех полей компонента (WHERE component_id = $1).';

COMMENT ON COLUMN config.component_fields.field_id IS 
'Идентификатор поля (например, "value", "change_pptd", "change_ytd", "name", "percentage"). Используется как ключ поля в формате компонента (format[fieldId] = formatId) и как id колонки в таблицах. Для карточек обычно: "value" (основное значение), "change_pptd" или "PPTD" (изменение к предыдущему периоду), "change_ytd" или "YTD" (изменение с начала года). Для таблиц это названия колонок.';

COMMENT ON COLUMN config.component_fields.field_type IS 
'Тип поля: "number", "percent", "string", "date", "boolean". Используется на фронтенде для определения способа отображения и валидации значения поля.';

COMMENT ON COLUMN config.component_fields.label IS 
'Метка поля для отображения (например, "Значение", "Изменение", "Процент"). Используется на фронтенде как заголовок колонки таблицы или подпись метрики карточки. Если не указан, используется field_id.';

COMMENT ON COLUMN config.component_fields.description IS 
'Описание поля. Используется в административном интерфейсе для понимания назначения поля и на фронтенде в tooltip при наведении на колонку.';


COMMENT ON COLUMN config.component_fields.format_id IS 
'ID формата для форматирования значения поля. Ссылка на config.formats.id. Используется в layoutService.ts для построения объекта формата компонента (format.value = formatId, format.PPTD = formatId). Используется на фронтенде в formatters.ts для форматирования значений через formatValue(formatId, value).';

COMMENT ON COLUMN config.component_fields.parent_field_id IS 
'ID родительского поля для создания иерархии полей. Если указан, поле является дочерним и используется в подформате (например, format.PPTD для поля с parent_field_id = "value"). Используется в layoutService.ts для разделения полей на основные (parent_field_id IS NULL) и дочерние (parent_field_id указан) при построении формата.';

COMMENT ON COLUMN config.component_fields.is_visible IS 
'Флаг видимости поля. Если false, поле не отображается в компоненте. Используется в layoutService.ts для фильтрации видимых полей (WHERE is_visible = TRUE) при построении структуры компонента. Позволяет скрыть колонки таблиц или метрики карточек без удаления.';

COMMENT ON COLUMN config.component_fields.is_dimension IS 
'Флаг того, что поле является измерением (dimension). Используется для группировки и фильтрации данных в таблицах. Например, "client_segment", "product_code" - это измерения. Используется в layoutService.ts для определения типа поля при построении колонок таблиц.';

COMMENT ON COLUMN config.component_fields.is_measure IS 
'Флаг того, что поле является метрикой (measure). Используется для определения числовых полей, которые нужно агрегировать. Например, "value", "percentage" - это метрики. Используется в layoutService.ts для определения типа поля при построении колонок таблиц.';

COMMENT ON COLUMN config.component_fields.compact_display IS 
'Флаг компактного отображения поля. Если true, используется компактный режим отображения (например, скрыть подписи, уменьшить отступы). Используется на фронтенде для компактного отображения колонок таблиц или метрик карточек. Используется в layoutService.ts при построении структуры компонента.';

COMMENT ON COLUMN config.component_fields.settings IS 
'JSON объект с дополнительными настройками поля (например, цвета, стили, валидация). Используется на фронтенде для кастомизации отображения поля.';

COMMENT ON COLUMN config.component_fields.display_order IS 
'Порядок отображения поля в компоненте. Используется в layoutService.ts для сортировки полей (ORDER BY display_order ASC) при построении списка колонок таблицы или формата карточки. Определяет порядок колонок в таблице.';

COMMENT ON COLUMN config.component_fields.is_active IS 
'Флаг активности поля. Неактивные поля не используются в компоненте. Используется в layoutService.ts для фильтрации активных полей (WHERE is_active = TRUE).';

COMMENT ON COLUMN config.component_fields.is_dimension IS 
'Флаг того, что поле является измерением (dimension). Используется для группировки и фильтрации данных в таблицах. Например, "client_segment", "product_code" - это измерения.';

COMMENT ON COLUMN config.component_fields.is_measure IS 
'Флаг того, что поле является метрикой (measure). Используется для определения числовых полей, которые нужно агрегировать. Например, "value", "percentage" - это метрики.';

COMMENT ON COLUMN config.component_fields.compact_display IS 
'Флаг компактного отображения поля. Используется на фронтенде для уменьшения размера колонки или метрики (например, скрыть подписи).';

COMMENT ON COLUMN config.component_fields.is_groupable IS 
'Флаг возможности группировки по полю. Используется для определения, можно ли группировать данные таблицы по этому полю (например, группировка доходов по сегментам клиентов).';

COMMENT ON COLUMN config.component_fields.created_by IS 
'Пользователь, создавший поле. Используется для аудита.';

COMMENT ON COLUMN config.component_fields.created_at IS 
'Дата и время создания поля. Используется для аудита.';

COMMENT ON COLUMN config.component_fields.updated_by IS 
'Пользователь, последний раз обновивший поле. Используется для аудита.';

COMMENT ON COLUMN config.component_fields.updated_at IS 
'Дата и время последнего обновления поля. Используется для аудита.';

COMMENT ON COLUMN config.component_fields.deleted_by IS 
'Пользователь, удаливший поле (soft delete). Используется для аудита.';

COMMENT ON COLUMN config.component_fields.deleted_at IS 
'Дата и время удаления поля (soft delete). Используется в layoutService.ts для фильтрации удаленных полей (WHERE deleted_at IS NULL).';

-- ============================================================
-- 5. CONFIG.FORMATS - Форматы отображения значений
-- ============================================================

COMMENT ON TABLE config.formats IS 
'Определения форматов для форматирования числовых значений, валют и процентов. Используется в component_fields для задания формата отображения значений полей. На фронтенде используется в formatters.ts через formatValue(formatId, value) для форматирования значений перед отображением. Позволяет централизованно управлять форматированием всех числовых значений в приложении.';

COMMENT ON COLUMN config.formats.id IS 
'Уникальный идентификатор формата (например, "currency_rub", "percent", "number_short"). Используется в component_fields.format_id для связи поля с форматом. Используется на фронтенде как ключ в formatValue(formatId, value).';

COMMENT ON COLUMN config.formats.name IS 
'Название формата для отображения в административном интерфейсе. Используется человеком для идентификации формата (например, "Рубли с сокращением").';

COMMENT ON COLUMN config.formats.kind IS 
'Тип формата: "number", "currency", "percent", "date". Определяет базовую логику форматирования. Используется в formatters.ts для определения способа обработки значения.';

COMMENT ON COLUMN config.formats.prefix_unit_symbol IS 
'Символ перед числом (например, "₽" для рублей, "$" для долларов). Используется в formatters.ts для добавления префикса к отформатированному числу: prefixUnitSymbol + formattedNumber.';

COMMENT ON COLUMN config.formats.suffix_unit_symbol IS 
'Символ после числа (например, "%" для процентов, " млрд ₽" для миллиардов рублей). Используется в formatters.ts для добавления суффикса к отформатированному числу: formattedNumber + suffixUnitSymbol.';

COMMENT ON COLUMN config.formats.minimum_fraction_digits IS 
'Минимальное количество знаков после запятой (0-10). Используется в formatters.ts для контроля точности отображения: toFixed(minDigits). Определяет минимальное количество десятичных разрядов.';

COMMENT ON COLUMN config.formats.maximum_fraction_digits IS 
'Максимальное количество знаков после запятой (0-10). Используется в formatters.ts для контроля точности отображения: toFixed(maxDigits). Определяет максимальное количество десятичных разрядов.';

COMMENT ON COLUMN config.formats.thousand_separator IS 
'Использовать разделитель тысяч (пробел). Если true, в formatters.ts числа форматируются с пробелами между разрядами тысяч (например, "1 234 567" вместо "1234567"). Используется для улучшения читаемости больших чисел.';

COMMENT ON COLUMN config.formats.shorten IS 
'Использовать сокращенный формат (K, M, B). Если true, в formatters.ts большие числа сокращаются: >= 1e9 -> B (миллиарды), >= 1e6 -> M (миллионы), >= 1e3 -> K (тысячи). Например, 8200000 форматируется как "8.2M". Используется для компактного отображения больших чисел.';

COMMENT ON COLUMN config.formats.multiplier IS 
'Множитель для значения перед форматированием. Используется в formatters.ts для преобразования значения: processedValue = value * multiplier. Например, если multiplier = 0.001, то 1000 будет преобразовано в 1 перед форматированием. Позволяет конвертировать единицы измерения.';

COMMENT ON COLUMN config.formats.pattern IS 
'Кастомный паттерн форматирования (зарезервировано для будущего использования). Планируется использовать для более сложных правил форматирования, не покрываемых остальными полями.';

COMMENT ON COLUMN config.formats.description IS 
'Описание формата для администраторов. Объясняет назначение формата и когда его использовать. Используется в административном интерфейсе для помощи при выборе формата.';

COMMENT ON COLUMN config.formats.example IS 
'Пример использования формата (например, "8200000 → ₽8.2B"). Показывает, как значение будет выглядеть после форматирования. Используется в административном интерфейсе для демонстрации результата форматирования.';

COMMENT ON COLUMN config.formats.is_active IS 
'Флаг активности формата. Неактивные форматы не используются. Используется в layoutService.ts для фильтрации активных форматов (WHERE is_active = TRUE) при загрузке форматов для layout.';

COMMENT ON COLUMN config.formats.created_by IS 
'Пользователь, создавший формат. Используется для аудита.';

COMMENT ON COLUMN config.formats.created_at IS 
'Дата и время создания формата. Используется для аудита.';

COMMENT ON COLUMN config.formats.updated_by IS 
'Пользователь, последний раз обновивший формат. Используется для аудита.';

COMMENT ON COLUMN config.formats.updated_at IS 
'Дата и время последнего обновления формата. Используется для аудита.';

COMMENT ON COLUMN config.formats.deleted_by IS 
'Пользователь, удаливший формат (soft delete). Используется для аудита.';

COMMENT ON COLUMN config.formats.deleted_at IS 
'Дата и время удаления формата (soft delete). Используется в layoutService.ts для фильтрации удаленных форматов (WHERE deleted_at IS NULL).';

COMMIT;
