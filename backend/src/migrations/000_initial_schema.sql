-- Начальная миграция: создание всех таблиц
-- Сгенерировано автоматически из текущей структуры БД
-- Дата: 2026-01-17T19:35:14.370Z

-- ============================================
-- СОЗДАНИЕ СХЕМ
-- ============================================

CREATE SCHEMA IF NOT EXISTS mart;
CREATE SCHEMA IF NOT EXISTS config;

-- ============================================
-- ТАБЛИЦЫ СХЕМЫ MART
-- ============================================

-- Таблица: mart.balance
-- Данные баланса с иерархией статей и аналитическими разрезами
CREATE TABLE IF NOT EXISTS mart.balance (
  id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  table_component_id VARCHAR(200) NOT NULL,
  row_code VARCHAR(100) NOT NULL,
  period_date DATE NOT NULL,
  value NUMERIC(20, 2) NOT NULL,
  class VARCHAR(50) NOT NULL,
  section VARCHAR(100),
  item VARCHAR(200),
  sub_item VARCHAR(200),
  client_type VARCHAR(50),
  client_segment VARCHAR(100),
  product_code VARCHAR(100),
  portfolio_code VARCHAR(100),
  currency_code VARCHAR(10) DEFAULT 'RUB'::character varying,
  maturity_bucket VARCHAR(50),
  interest_type VARCHAR(50),
  collateral_type VARCHAR(100),
  risk_class VARCHAR(50),
  org_unit_code VARCHAR(100),
  region VARCHAR(100),
  dimensions JSONB,
  PRIMARY KEY (id)
);

COMMENT ON TABLE mart.balance IS 'Данные баланса с иерархией статей и аналитическими разрезами';
COMMENT ON COLUMN mart.balance.class IS 'Класс баланса: assets (активы), liabilities (пассивы), equity (капитал)';
COMMENT ON COLUMN mart.balance.section IS 'Раздел баланса: кредиты, денежные средства, депозиты, собственный капитал';
COMMENT ON COLUMN mart.balance.item IS 'Статья баланса: управленческие статьи, согласованные с учётом';
COMMENT ON COLUMN mart.balance.sub_item IS 'Подстатья: детализация по условиям/типам';

CREATE UNIQUE INDEX IF NOT EXISTS balance_table_component_id_row_code_period_date_class_key ON mart.balance USING btree (table_component_id, row_code, period_date, class, section, item, sub_item, client_type, client_segment, product_code, portfolio_code, currency_code, maturity_bucket, interest_type, collateral_type, risk_class, org_unit_code, region);
CREATE INDEX IF NOT EXISTS idx_balance_component ON mart.balance USING btree (table_component_id);
CREATE INDEX IF NOT EXISTS idx_balance_date ON mart.balance USING btree (period_date DESC);
CREATE INDEX IF NOT EXISTS idx_balance_row_code ON mart.balance USING btree (row_code, period_date);
CREATE INDEX IF NOT EXISTS idx_balance_class ON mart.balance USING btree (class, period_date);
CREATE INDEX IF NOT EXISTS idx_balance_section ON mart.balance USING btree (section, period_date) WHERE (section IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_item ON mart.balance USING btree (item, period_date) WHERE (item IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_client_type ON mart.balance USING btree (client_type, period_date) WHERE (client_type IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_segment ON mart.balance USING btree (client_segment, period_date) WHERE (client_segment IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_product ON mart.balance USING btree (product_code, period_date) WHERE (product_code IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_currency ON mart.balance USING btree (currency_code, period_date);
CREATE INDEX IF NOT EXISTS idx_balance_maturity ON mart.balance USING btree (maturity_bucket, period_date) WHERE (maturity_bucket IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_interest_type ON mart.balance USING btree (interest_type, period_date) WHERE (interest_type IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_risk_class ON mart.balance USING btree (risk_class, period_date) WHERE (risk_class IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_region ON mart.balance USING btree (region, period_date) WHERE (region IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_balance_component_date_class ON mart.balance USING btree (table_component_id, period_date DESC, class);

-- Таблица: mart.kpi_metrics
-- Универсальная таблица для всех KPI метрик (карточек)
CREATE TABLE IF NOT EXISTS mart.kpi_metrics (
  id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  component_id VARCHAR(200) NOT NULL,
  period_date DATE NOT NULL,
  value NUMERIC(18, 6) NOT NULL,
  PRIMARY KEY (id)
);

COMMENT ON TABLE mart.kpi_metrics IS 'Универсальная таблица для всех KPI метрик (карточек)';
COMMENT ON COLUMN mart.kpi_metrics.component_id IS 'Ссылка на config.components.id (component_type=''card'')';

CREATE UNIQUE INDEX IF NOT EXISTS kpi_metrics_component_id_period_date_key ON mart.kpi_metrics USING btree (component_id, period_date);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_component ON mart.kpi_metrics USING btree (component_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_date ON mart.kpi_metrics USING btree (period_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_component_date ON mart.kpi_metrics USING btree (component_id, period_date DESC);

-- Таблица: config.component_fields
-- Поля компонентов - определяют структуру данных компонента. Для карточек это метрики (value, change, ytdChange) и их форматы. Для таблиц это колонки (name, value, percentage, change) с их типами, метками и форматами. Позволяет динамически настроить структуру отображения данных компонента без изменения кода. Используется в layoutService.ts для построения структуры колонок таблиц и форматов карточек.
CREATE TABLE IF NOT EXISTS config.component_fields (
  id INTEGER NOT NULL,
  component_id VARCHAR(200) NOT NULL,
  field_id VARCHAR(200) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  label VARCHAR(200),
  description TEXT,
  format_id VARCHAR(100),
  parent_field_id VARCHAR(200),
  is_visible BOOLEAN DEFAULT true,
  settings JSONB,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by VARCHAR(100),
  deleted_at TIMESTAMP,
  is_dimension BOOLEAN DEFAULT false,
  is_measure BOOLEAN DEFAULT false,
  compact_display BOOLEAN DEFAULT false,
  is_groupable BOOLEAN DEFAULT false,
  PRIMARY KEY (id),
  CONSTRAINT fk_component_fields_component_id FOREIGN KEY (component_id) REFERENCES config.components(id) ON DELETE CASCADE
);

COMMENT ON TABLE config.component_fields IS 'Поля компонентов - определяют структуру данных компонента. Для карточек это метрики (value, change, ytdChange) и их форматы. Для таблиц это колонки (name, value, percentage, change) с их типами, метками и форматами. Позволяет динамически настроить структуру отображения данных компонента без изменения кода. Используется в layoutService.ts для построения структуры колонок таблиц и форматов карточек.';
COMMENT ON COLUMN config.component_fields.id IS 'Первичный ключ поля компонента. Автоинкремент. Используется для уникальной идентификации каждого поля.';
COMMENT ON COLUMN config.component_fields.component_id IS 'ID компонента, к которому относится это поле. Ссылка на config.components.id. Используется в layoutService.ts для выборки всех полей компонента (WHERE component_id = $1).';
COMMENT ON COLUMN config.component_fields.field_id IS 'Идентификатор поля (например, "value", "change_pptd", "change_ytd", "name", "percentage"). Используется как ключ поля в формате компонента (format[fieldId] = formatId) и как id колонки в таблицах. Для карточек обычно: "value" (основное значение), "change_pptd" или "PPTD" (изменение к предыдущему периоду), "change_ytd" или "YTD" (изменение с начала года). Для таблиц это названия колонок.';
COMMENT ON COLUMN config.component_fields.field_type IS 'Тип поля: "number", "percent", "string", "date", "boolean". Используется на фронтенде для определения способа отображения и валидации значения поля.';
COMMENT ON COLUMN config.component_fields.label IS 'Метка поля для отображения (например, "Значение", "Изменение", "Процент"). Используется на фронтенде как заголовок колонки таблицы или подпись метрики карточки. Если не указан, используется field_id.';
COMMENT ON COLUMN config.component_fields.description IS 'Описание поля. Используется в административном интерфейсе для понимания назначения поля и на фронтенде в tooltip при наведении на колонку.';
COMMENT ON COLUMN config.component_fields.format_id IS 'ID формата для форматирования значения поля. Ссылка на config.formats.id. Используется в layoutService.ts для построения объекта формата компонента (format.value = formatId, format.PPTD = formatId). Используется на фронтенде в formatters.ts для форматирования значений через formatValue(formatId, value).';
COMMENT ON COLUMN config.component_fields.parent_field_id IS 'ID родительского поля для создания иерархии полей. Если указан, поле является дочерним и используется в подформате (например, format.PPTD для поля с parent_field_id = "value"). Используется в layoutService.ts для разделения полей на основные (parent_field_id IS NULL) и дочерние (parent_field_id указан) при построении формата.';
COMMENT ON COLUMN config.component_fields.is_visible IS 'Флаг видимости поля. Если false, поле не отображается в компоненте. Используется в layoutService.ts для фильтрации видимых полей (WHERE is_visible = TRUE) при построении структуры компонента. Позволяет скрыть колонки таблиц или метрики карточек без удаления.';
COMMENT ON COLUMN config.component_fields.settings IS 'JSON объект с дополнительными настройками поля (например, цвета, стили, валидация). Используется на фронтенде для кастомизации отображения поля.';
COMMENT ON COLUMN config.component_fields.display_order IS 'Порядок отображения поля в компоненте. Используется в layoutService.ts для сортировки полей (ORDER BY display_order ASC) при построении списка колонок таблицы или формата карточки. Определяет порядок колонок в таблице.';
COMMENT ON COLUMN config.component_fields.is_active IS 'Флаг активности поля. Неактивные поля не используются в компоненте. Используется в layoutService.ts для фильтрации активных полей (WHERE is_active = TRUE).';
COMMENT ON COLUMN config.component_fields.created_by IS 'Пользователь, создавший поле. Используется для аудита.';
COMMENT ON COLUMN config.component_fields.created_at IS 'Дата и время создания поля. Используется для аудита.';
COMMENT ON COLUMN config.component_fields.updated_by IS 'Пользователь, последний раз обновивший поле. Используется для аудита.';
COMMENT ON COLUMN config.component_fields.updated_at IS 'Дата и время последнего обновления поля. Используется для аудита.';
COMMENT ON COLUMN config.component_fields.deleted_by IS 'Пользователь, удаливший поле (soft delete). Используется для аудита.';
COMMENT ON COLUMN config.component_fields.deleted_at IS 'Дата и время удаления поля (soft delete). Используется в layoutService.ts для фильтрации удаленных полей (WHERE deleted_at IS NULL).';
COMMENT ON COLUMN config.component_fields.is_dimension IS 'Флаг того, что поле является измерением (dimension). Используется для группировки и фильтрации данных в таблицах. Например, "client_segment", "product_code" - это измерения.';
COMMENT ON COLUMN config.component_fields.is_measure IS 'Флаг того, что поле является метрикой (measure). Используется для определения числовых полей, которые нужно агрегировать. Например, "value", "percentage" - это метрики.';
COMMENT ON COLUMN config.component_fields.compact_display IS 'Флаг компактного отображения поля. Используется на фронтенде для уменьшения размера колонки или метрики (например, скрыть подписи).';
COMMENT ON COLUMN config.component_fields.is_groupable IS 'Флаг возможности группировки по полю. Используется для определения, можно ли группировать данные таблицы по этому полю (например, группировка доходов по сегментам клиентов).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cf_component_field_active ON config.component_fields USING btree (component_id, field_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_cf_component ON config.component_fields USING btree (component_id);
CREATE INDEX IF NOT EXISTS idx_cf_field_id ON config.component_fields USING btree (field_id);
CREATE INDEX IF NOT EXISTS idx_cf_display_order ON config.component_fields USING btree (display_order);
CREATE INDEX IF NOT EXISTS idx_cf_is_active ON config.component_fields USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_cf_parent_field ON config.component_fields USING btree (parent_field_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cf_component_field ON config.component_fields USING btree (component_id, field_id) WHERE (deleted_at IS NULL);

-- Таблица: config.components
-- Глобальная библиотека компонентов дашборда. Хранит определения всех типов компонентов (карточки, таблицы, графики, секции, фильтры), которые могут быть использованы в layouts. Каждый компонент определяет свой источник данных, формат отображения и другие параметры. Используется в layoutService.ts для получения метаданных компонентов при построении layout.
CREATE TABLE IF NOT EXISTS config.components (
  id VARCHAR(200) NOT NULL,
  component_type VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  label VARCHAR(200),
  tooltip VARCHAR(500),
  icon VARCHAR(200),
  data_source_key VARCHAR(200),
  action_type VARCHAR(100),
  action_target VARCHAR(200),
  action_params JSONB,
  settings JSONB,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by VARCHAR(100),
  deleted_at TIMESTAMP,
  PRIMARY KEY (id)
);

COMMENT ON TABLE config.components IS 'Глобальная библиотека компонентов дашборда. Хранит определения всех типов компонентов (карточки, таблицы, графики, секции, фильтры), которые могут быть использованы в layouts. Каждый компонент определяет свой источник данных, формат отображения и другие параметры. Используется в layoutService.ts для получения метаданных компонентов при построении layout.';
COMMENT ON COLUMN config.components.id IS 'Уникальный идентификатор компонента. Используется как ссылка в layout_component_mapping для связывания компонента с layout. Примеры: "capital_card", "balance_assets_table".';
COMMENT ON COLUMN config.components.component_type IS 'Тип компонента: "container" (секция), "card" (KPI карточка), "table" (таблица), "chart" (график), "filter" (фильтр). Используется в layoutService.ts для определения, как отображать компонент на фронтенде.';
COMMENT ON COLUMN config.components.title IS 'Заголовок компонента для отображения на дашборде. Используется на фронтенде как заголовок карточки/таблицы/графика. Если не указан title_override в layout_component_mapping, используется это значение.';
COMMENT ON COLUMN config.components.label IS 'Короткая подпись компонента. Используется в местах, где нужно компактное отображение названия (например, в меню или списках).';
COMMENT ON COLUMN config.components.tooltip IS 'Всплывающая подсказка при наведении на компонент. Используется на фронтенде для отображения дополнительной информации о компоненте.';
COMMENT ON COLUMN config.components.icon IS 'Название иконки для компонента (например, "TrendingUpIcon", "WalletIcon"). Используется на фронтенде для отображения иконки рядом с заголовком компонента.';
COMMENT ON COLUMN config.components.data_source_key IS 'Ключ источника данных компонента. Определяет, откуда брать данные для компонента. Для карточек это ID компонента в mart.kpi_metrics (component_id). Для таблиц это tableId для API /api/table-data/:tableId (например, "balance_assets", "balance_liabilities"). Используется на фронтенде для загрузки данных.';
COMMENT ON COLUMN config.components.action_type IS 'Тип действия при клике на компонент (например, "navigate", "filter", "drill-down"). Используется на фронтенде для обработки взаимодействий с компонентом.';
COMMENT ON COLUMN config.components.action_target IS 'Цель действия при клике (например, URL для перехода, ID другого компонента). Используется вместе с action_type на фронтенде.';
COMMENT ON COLUMN config.components.action_params IS 'JSON объект с параметрами действия. Используется на фронтенде для передачи дополнительных параметров при выполнении действия (например, параметры фильтрации, query параметры для URL).';
COMMENT ON COLUMN config.components.settings IS 'JSON объект с настройками компонента (например, размеры, цвета, параметры отображения). Используется на фронтенде для кастомизации внешнего вида и поведения компонента.';
COMMENT ON COLUMN config.components.description IS 'Описание назначения компонента. Используется в административном интерфейсе для понимания, что делает компонент.';
COMMENT ON COLUMN config.components.category IS 'Категория компонента (например, "finance", "balance", "clients"). Используется в kpiService.ts для фильтрации KPI метрик по категориям через /api/kpis?category=finance.';
COMMENT ON COLUMN config.components.is_active IS 'Флаг активности компонента. Неактивные компоненты не отображаются в layouts. Используется в layoutService.ts и kpiService.ts для фильтрации активных компонентов (WHERE is_active = TRUE).';
COMMENT ON COLUMN config.components.created_by IS 'Пользователь, создавший компонент. Используется для аудита изменений.';
COMMENT ON COLUMN config.components.created_at IS 'Дата и время создания компонента. Используется для аудита.';
COMMENT ON COLUMN config.components.updated_by IS 'Пользователь, последний раз обновивший компонент. Используется для аудита изменений.';
COMMENT ON COLUMN config.components.updated_at IS 'Дата и время последнего обновления компонента. Используется для аудита.';
COMMENT ON COLUMN config.components.deleted_by IS 'Пользователь, удаливший компонент. Используется для аудита удаления (soft delete).';
COMMENT ON COLUMN config.components.deleted_at IS 'Дата и время удаления компонента (soft delete). Используется в layoutService.ts и kpiService.ts для фильтрации удаленных компонентов (WHERE deleted_at IS NULL).';

CREATE INDEX IF NOT EXISTS idx_components_type ON config.components USING btree (component_type);
CREATE INDEX IF NOT EXISTS idx_components_is_active ON config.components USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_components_category ON config.components USING btree (category);

-- Таблица: config.formats
-- Определения форматов для форматирования числовых значений, валют и процентов. Используется в component_fields для задания формата отображения значений полей. На фронтенде используется в formatters.ts через formatValue(formatId, value) для форматирования значений перед отображением. Позволяет централизованно управлять форматированием всех числовых значений в приложении.
CREATE TABLE IF NOT EXISTS config.formats (
  id VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  kind VARCHAR(50) NOT NULL,
  prefix_unit_symbol VARCHAR(20),
  suffix_unit_symbol VARCHAR(50),
  minimum_fraction_digits INTEGER DEFAULT 0,
  maximum_fraction_digits INTEGER DEFAULT 0,
  thousand_separator BOOLEAN DEFAULT false,
  shorten BOOLEAN DEFAULT false,
  multiplier NUMERIC(10, 4),
  pattern VARCHAR(200),
  description TEXT,
  example VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by VARCHAR(100),
  deleted_at TIMESTAMP,
  PRIMARY KEY (id)
);

COMMENT ON TABLE config.formats IS 'Определения форматов для форматирования числовых значений, валют и процентов. Используется в component_fields для задания формата отображения значений полей. На фронтенде используется в formatters.ts через formatValue(formatId, value) для форматирования значений перед отображением. Позволяет централизованно управлять форматированием всех числовых значений в приложении.';
COMMENT ON COLUMN config.formats.id IS 'Уникальный идентификатор формата (например, "currency_rub", "percent", "number_short"). Используется в component_fields.format_id для связи поля с форматом. Используется на фронтенде как ключ в formatValue(formatId, value).';
COMMENT ON COLUMN config.formats.name IS 'Название формата для отображения в административном интерфейсе. Используется человеком для идентификации формата (например, "Рубли с сокращением").';
COMMENT ON COLUMN config.formats.kind IS 'Тип формата: "number", "currency", "percent", "date". Определяет базовую логику форматирования. Используется в formatters.ts для определения способа обработки значения.';
COMMENT ON COLUMN config.formats.prefix_unit_symbol IS 'Символ перед числом (например, "₽" для рублей, "$" для долларов). Используется в formatters.ts для добавления префикса к отформатированному числу: prefixUnitSymbol + formattedNumber.';
COMMENT ON COLUMN config.formats.suffix_unit_symbol IS 'Символ после числа (например, "%" для процентов, " млрд ₽" для миллиардов рублей). Используется в formatters.ts для добавления суффикса к отформатированному числу: formattedNumber + suffixUnitSymbol.';
COMMENT ON COLUMN config.formats.minimum_fraction_digits IS 'Минимальное количество знаков после запятой (0-10). Используется в formatters.ts для контроля точности отображения: toFixed(minDigits). Определяет минимальное количество десятичных разрядов.';
COMMENT ON COLUMN config.formats.maximum_fraction_digits IS 'Максимальное количество знаков после запятой (0-10). Используется в formatters.ts для контроля точности отображения: toFixed(maxDigits). Определяет максимальное количество десятичных разрядов.';
COMMENT ON COLUMN config.formats.thousand_separator IS 'Использовать разделитель тысяч (пробел). Если true, в formatters.ts числа форматируются с пробелами между разрядами тысяч (например, "1 234 567" вместо "1234567"). Используется для улучшения читаемости больших чисел.';
COMMENT ON COLUMN config.formats.shorten IS 'Использовать сокращенный формат (K, M, B). Если true, в formatters.ts большие числа сокращаются: >= 1e9 -> B (миллиарды), >= 1e6 -> M (миллионы), >= 1e3 -> K (тысячи). Например, 8200000 форматируется как "8.2M". Используется для компактного отображения больших чисел.';
COMMENT ON COLUMN config.formats.multiplier IS 'Множитель для значения перед форматированием. Используется в formatters.ts для преобразования значения: processedValue = value * multiplier. Например, если multiplier = 0.001, то 1000 будет преобразовано в 1 перед форматированием. Позволяет конвертировать единицы измерения.';
COMMENT ON COLUMN config.formats.pattern IS 'Кастомный паттерн форматирования (зарезервировано для будущего использования). Планируется использовать для более сложных правил форматирования, не покрываемых остальными полями.';
COMMENT ON COLUMN config.formats.description IS 'Описание формата для администраторов. Объясняет назначение формата и когда его использовать. Используется в административном интерфейсе для помощи при выборе формата.';
COMMENT ON COLUMN config.formats.example IS 'Пример использования формата (например, "8200000 → ₽8.2B"). Показывает, как значение будет выглядеть после форматирования. Используется в административном интерфейсе для демонстрации результата форматирования.';
COMMENT ON COLUMN config.formats.is_active IS 'Флаг активности формата. Неактивные форматы не используются. Используется в layoutService.ts для фильтрации активных форматов (WHERE is_active = TRUE) при загрузке форматов для layout.';
COMMENT ON COLUMN config.formats.created_by IS 'Пользователь, создавший формат. Используется для аудита.';
COMMENT ON COLUMN config.formats.created_at IS 'Дата и время создания формата. Используется для аудита.';
COMMENT ON COLUMN config.formats.updated_by IS 'Пользователь, последний раз обновивший формат. Используется для аудита.';
COMMENT ON COLUMN config.formats.updated_at IS 'Дата и время последнего обновления формата. Используется для аудита.';
COMMENT ON COLUMN config.formats.deleted_by IS 'Пользователь, удаливший формат (soft delete). Используется для аудита.';
COMMENT ON COLUMN config.formats.deleted_at IS 'Дата и время удаления формата (soft delete). Используется в layoutService.ts для фильтрации удаленных форматов (WHERE deleted_at IS NULL).';

CREATE INDEX IF NOT EXISTS idx_formats_is_active ON config.formats USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_formats_kind ON config.formats USING btree (kind);

-- Таблица: config.layout_component_mapping
-- Таблица связи layouts и components. Определяет, какие компоненты используются в каком layout, в каком порядке они отображаются и какая иерархия между ними (секции -> компоненты). Один компонент может использоваться в нескольких layouts, и в каждом layout он может иметь разные настройки (override). Это основа для построения структуры дашборда - layoutService.ts использует эту таблицу для построения JSON структуры layout с секциями и компонентами.
CREATE TABLE IF NOT EXISTS config.layout_component_mapping (
  id INTEGER NOT NULL,
  layout_id VARCHAR(100) NOT NULL,
  component_id VARCHAR(200) NOT NULL,
  parent_component_id VARCHAR(200),
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by VARCHAR(100),
  deleted_at TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_layout_component_mapping_layout_id FOREIGN KEY (layout_id) REFERENCES config.layouts(id) ON DELETE CASCADE,
  CONSTRAINT fk_layout_component_mapping_component_id FOREIGN KEY (component_id) REFERENCES config.components(id) ON DELETE RESTRICT
);

COMMENT ON TABLE config.layout_component_mapping IS 'Таблица связи layouts и components. Определяет, какие компоненты используются в каком layout, в каком порядке они отображаются и какая иерархия между ними (секции -> компоненты). Один компонент может использоваться в нескольких layouts, и в каждом layout он может иметь разные настройки (override). Это основа для построения структуры дашборда - layoutService.ts использует эту таблицу для построения JSON структуры layout с секциями и компонентами.';
COMMENT ON COLUMN config.layout_component_mapping.id IS 'Первичный ключ записи связи. Автоинкремент. Используется для уникальной идентификации каждой связи layout-компонент.';
COMMENT ON COLUMN config.layout_component_mapping.layout_id IS 'ID layout, к которому относится этот компонент. Ссылка на config.layouts.id. Используется в layoutService.ts для выборки всех компонентов конкретного layout (WHERE layout_id = $1).';
COMMENT ON COLUMN config.layout_component_mapping.component_id IS 'ID компонента из глобальной библиотеки. Ссылка на config.components.id. Определяет, какой компонент используется в этом layout. Используется для получения метаданных компонента из config.components через JOIN.';
COMMENT ON COLUMN config.layout_component_mapping.parent_component_id IS 'ID родительского компонента для создания иерархии. Если NULL, то компонент находится на верхнем уровне (секция). Ссылается на component_id другого компонента в том же layout.';
COMMENT ON COLUMN config.layout_component_mapping.display_order IS 'Порядок отображения компонента в layout. Используется в layoutService.ts для сортировки компонентов (ORDER BY display_order ASC). Определяет порядок отображения секций и компонентов на дашборде.';
COMMENT ON COLUMN config.layout_component_mapping.is_visible IS 'Флаг видимости компонента в layout. Если false, компонент не отображается на дашборде, но остается в базе (для быстрого включения обратно). Используется для временного скрытия компонентов без удаления.';
COMMENT ON COLUMN config.layout_component_mapping.created_by IS 'Пользователь, создавший эту связь layout-компонент. Используется для аудита.';
COMMENT ON COLUMN config.layout_component_mapping.created_at IS 'Дата и время создания связи. Используется для аудита.';
COMMENT ON COLUMN config.layout_component_mapping.updated_by IS 'Пользователь, последний раз обновивший эту связь. Используется для аудита.';
COMMENT ON COLUMN config.layout_component_mapping.updated_at IS 'Дата и время последнего обновления связи. Используется для аудита.';
COMMENT ON COLUMN config.layout_component_mapping.deleted_by IS 'Пользователь, удаливший эту связь (soft delete). Используется для аудита.';
COMMENT ON COLUMN config.layout_component_mapping.deleted_at IS 'Дата и время удаления связи (soft delete). Используется в layoutService.ts для фильтрации удаленных связей (WHERE deleted_at IS NULL). Позволяет скрыть компонент из layout без физического удаления записи.';

CREATE INDEX IF NOT EXISTS idx_lcm_layout ON config.layout_component_mapping USING btree (layout_id);
CREATE INDEX IF NOT EXISTS idx_lcm_parent ON config.layout_component_mapping USING btree (parent_component_id);
CREATE INDEX IF NOT EXISTS idx_lcm_component ON config.layout_component_mapping USING btree (component_id);
CREATE INDEX IF NOT EXISTS idx_lcm_display_order ON config.layout_component_mapping USING btree (display_order);
CREATE INDEX IF NOT EXISTS idx_lcm_is_visible ON config.layout_component_mapping USING btree (is_visible);

-- Таблица: config.layouts
-- Реестр структур дашбордов (layouts). Каждый layout определяет структуру отображения данных на дашборде - какие секции, компоненты и их порядок. Используется в layoutService.ts при построении JSON структуры для фронтенда.
CREATE TABLE IF NOT EXISTS config.layouts (
  id VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  owner_user_id VARCHAR(100),
  tags _TEXT,
  category VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  settings JSONB,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by VARCHAR(100),
  deleted_at TIMESTAMP,
  PRIMARY KEY (id)
);

COMMENT ON TABLE config.layouts IS 'Реестр структур дашбордов (layouts). Каждый layout определяет структуру отображения данных на дашборде - какие секции, компоненты и их порядок. Используется в layoutService.ts при построении JSON структуры для фронтенда.';
COMMENT ON COLUMN config.layouts.id IS 'Уникальный идентификатор layout. Используется в layoutService.ts как ключ для выбора нужного layout. Пример: "main_dashboard".';
COMMENT ON COLUMN config.layouts.name IS 'Название layout для отображения в интерфейсе администратора. Используется для идентификации layout человеком.';
COMMENT ON COLUMN config.layouts.description IS 'Описание назначения layout. Помогает администраторам понять, для чего предназначен этот layout.';
COMMENT ON COLUMN config.layouts.status IS 'Статус layout: "draft" (черновик), "published" (опубликован), "archived" (архив). Используется для управления версиями layouts.';
COMMENT ON COLUMN config.layouts.is_active IS 'Флаг активности layout. Неактивные layouts не отображаются в списках и не могут быть выбраны по умолчанию. Используется в layoutService.ts для фильтрации активных layouts.';
COMMENT ON COLUMN config.layouts.is_default IS 'Флаг layout по умолчанию. Если true, то этот layout используется, когда layout_id не указан в запросе. Используется в layoutService.ts при выборе layout по умолчанию.';
COMMENT ON COLUMN config.layouts.owner_user_id IS 'ID пользователя-владельца layout. Используется для контроля доступа (в будущем).';
COMMENT ON COLUMN config.layouts.tags IS 'Массив тегов для поиска и фильтрации layouts. Используется в административном интерфейсе для быстрого поиска нужного layout.';
COMMENT ON COLUMN config.layouts.category IS 'Категория layout. Используется для группировки layouts в административном интерфейсе (например, "production", "test").';
COMMENT ON COLUMN config.layouts.display_order IS 'Порядок отображения layout в списках. Используется в layoutService.ts при сортировке layouts (ORDER BY display_order).';
COMMENT ON COLUMN config.layouts.settings IS 'JSON объект с настройками уровня layout (например, тема, размеры, общие параметры отображения). Используется на фронтенде для применения настроек ко всему layout.';
COMMENT ON COLUMN config.layouts.created_by IS 'Пользователь, создавший layout. Используется для аудита изменений.';
COMMENT ON COLUMN config.layouts.created_at IS 'Дата и время создания layout. Используется для аудита и сортировки по дате создания.';
COMMENT ON COLUMN config.layouts.updated_by IS 'Пользователь, последний раз обновивший layout. Используется для аудита изменений.';
COMMENT ON COLUMN config.layouts.updated_at IS 'Дата и время последнего обновления layout. Используется в layoutService.ts для сортировки при выборе layout по умолчанию (ORDER BY updated_at DESC).';
COMMENT ON COLUMN config.layouts.deleted_by IS 'Пользователь, удаливший layout. Используется для аудита удаления (soft delete).';
COMMENT ON COLUMN config.layouts.deleted_at IS 'Дата и время удаления layout (soft delete). Используется в layoutService.ts для фильтрации удаленных layouts (WHERE deleted_at IS NULL).';

CREATE INDEX IF NOT EXISTS idx_layouts_is_active ON config.layouts USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_layouts_is_default ON config.layouts USING btree (is_default);
CREATE INDEX IF NOT EXISTS idx_layouts_display_order ON config.layouts USING btree (display_order);
CREATE INDEX IF NOT EXISTS idx_layouts_category ON config.layouts USING btree (category);

