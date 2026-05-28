-- ============================================================
-- МИГРАЦИЯ: СОЗДАНИЕ ВИТРИНЫ MART
-- ============================================================
-- Создает структуру витрины данных MART для хранения фактических данных
-- Метаданные полей хранятся в config.mart_fields
-- ============================================================

BEGIN;

-- ============================================================
-- 1. СПРАВОЧНИК ПОЛЕЙ MART В CONFIG
-- ============================================================

CREATE TABLE IF NOT EXISTS config.mart_fields (
    -- Технические поля
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Название поля в таблице MART
    field_name VARCHAR(100) NOT NULL UNIQUE,
    
    -- Тип поля: 'hierarchy' (иерархия) или 'analytical' (аналитическое)
    field_type VARCHAR(50) NOT NULL,
    
    -- Номер уровня в иерархии (1-4 для hierarchy, NULL для analytical)
    hierarchy_level INTEGER,
    
    -- Категория поля (для группировки)
    category VARCHAR(100),  -- 'financial_results', 'balance', 'common'
    
    -- Описание поля
    description TEXT,
    
    -- Тип данных
    data_type VARCHAR(50) NOT NULL DEFAULT 'VARCHAR',  -- 'VARCHAR', 'DECIMAL', 'DATE', 'BOOLEAN'
    
    -- Ограничения
    max_length INTEGER,  -- Максимальная длина для VARCHAR
    is_required BOOLEAN DEFAULT FALSE,
    is_nullable BOOLEAN DEFAULT TRUE,
    
    -- Дополнительные метаданные
    metadata JSONB,  -- Любые дополнительные параметры (валидация, форматы и т.д.)
    
    -- Активность
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Проверка: для hierarchy должен быть указан hierarchy_level
    CONSTRAINT chk_hierarchy_level CHECK (
        (field_type = 'hierarchy' AND hierarchy_level IS NOT NULL AND hierarchy_level BETWEEN 1 AND 4) OR
        (field_type = 'analytical' AND hierarchy_level IS NULL)
    )
);

-- Индексы для справочника полей
CREATE INDEX IF NOT EXISTS idx_mart_fields_type ON config.mart_fields(field_type);
CREATE INDEX IF NOT EXISTS idx_mart_fields_category ON config.mart_fields(category);
CREATE INDEX IF NOT EXISTS idx_mart_fields_hierarchy_level ON config.mart_fields(hierarchy_level) WHERE hierarchy_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mart_fields_active ON config.mart_fields(is_active);

COMMENT ON TABLE config.mart_fields IS 'Справочник полей таблиц MART с метаданными (иерархия и аналитика)';
COMMENT ON COLUMN config.mart_fields.field_name IS 'Название поля в таблице MART (без префиксов)';
COMMENT ON COLUMN config.mart_fields.field_type IS 'Тип поля: hierarchy (иерархия) или analytical (аналитическое)';
COMMENT ON COLUMN config.mart_fields.hierarchy_level IS 'Номер уровня в иерархии (1-4) для hierarchy, NULL для analytical';

-- ============================================================
-- 2. KPI МЕТРИКИ (все карточки)
-- ============================================================

CREATE TABLE IF NOT EXISTS mart.kpi_metrics (
    -- Технические поля
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Связь с конфигурацией
    component_id VARCHAR(200) NOT NULL,  -- Ссылка на config.components.id (component_type='card')
    
    -- Временной срез
    period_date DATE NOT NULL,
    
    -- Значение метрики
    value DECIMAL(20, 2) NOT NULL,
    
    -- Ограничение уникальности
    UNIQUE(component_id, period_date)
);

-- Индексы для KPI
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_component ON mart.kpi_metrics(component_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_date ON mart.kpi_metrics(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_component_date ON mart.kpi_metrics(component_id, period_date DESC);

COMMENT ON TABLE mart.kpi_metrics IS 'Универсальная таблица для всех KPI метрик (карточек)';
COMMENT ON COLUMN mart.kpi_metrics.component_id IS 'Ссылка на config.components.id (component_type=''card'')';

-- ============================================================
-- 3. ФИНАНСОВЫЙ РЕЗУЛЬТАТ (P&L)
-- ============================================================

CREATE TABLE IF NOT EXISTS mart.financial_results (
    -- Технические поля
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Связь с конфигурацией
    table_component_id VARCHAR(200) NOT NULL,  -- Ссылка на config.components.id (таблица доходов/расходов)
    row_code VARCHAR(100) NOT NULL,            -- Ссылка на config.table_rows.row_code (иерархия строк)
    
    -- Временной срез
    period_date DATE NOT NULL,
    
    -- Значение
    value DECIMAL(20, 2) NOT NULL,
    
    -- ============================================================
    -- ИЕРАРХИЯ СТАТЕЙ (что считаем)
    -- ============================================================
    
    -- 1. Класс отчёта (Доходы / Расходы)
    report_class VARCHAR(50) NOT NULL,  -- 'income', 'expense'
    
    -- 2. Раздел P&L - Крупные блоки
    pl_section VARCHAR(100),  -- 'net_interest_income', 'net_commission_income', 'trading_income', 'opex', 'provisions', 'tax', 'net_profit'
    
    -- 3. Статья (Line item) - Управленческие статьи, согласованные с GL
    line_item VARCHAR(200),  -- 'interest_income_products', 'fot', 'it_expenses', и т.п.
    
    -- 4. Подстатья - Детализация статьи для контроля и анализа
    sub_line_item VARCHAR(200),  -- 'salary', 'bonus', 'licenses', 'support', и т.п.
    
    -- ============================================================
    -- АНАЛИТИЧЕСКИЕ РАЗРЕЗЫ (как смотрим)
    -- ============================================================
    
    -- Организационная структура / ЦФО
    cfo_code VARCHAR(100),  -- Код ЦФО
    
    -- Продукт / продуктовая группа
    product_code VARCHAR(100),  -- Код продукта
    product_group VARCHAR(100),  -- Продуктовая группа
    
    -- Клиентский сегмент
    client_segment VARCHAR(100),  -- 'retail', 'corporate', 'sme', и т.п.
    
    -- Канал
    channel VARCHAR(100),  -- 'online', 'branch', 'mobile', и т.п.
    
    -- Регион
    region VARCHAR(100),  -- 'Moscow', 'SPB', и т.п.
    
    -- Проект / инициатива
    project_code VARCHAR(100),  -- Код проекта/инициативы
    
    -- Валюта
    currency_code VARCHAR(10) DEFAULT 'RUB',  -- 'RUB', 'USD', 'EUR', и т.п.
    
    -- Дополнительные измерения (для будущих расширений)
    dimensions JSONB,  -- Любые дополнительные разрезы в формате JSON
    
    -- Ограничение уникальности
    UNIQUE(table_component_id, row_code, period_date, 
           report_class, pl_section, line_item, sub_line_item,
           cfo_code, product_code, client_segment, channel, 
           region, project_code, currency_code)
);

-- Индексы для финансового результата
CREATE INDEX IF NOT EXISTS idx_fr_component ON mart.financial_results(table_component_id);
CREATE INDEX IF NOT EXISTS idx_fr_date ON mart.financial_results(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_fr_row_code ON mart.financial_results(row_code, period_date);
CREATE INDEX IF NOT EXISTS idx_fr_report_class ON mart.financial_results(report_class, period_date);
CREATE INDEX IF NOT EXISTS idx_fr_pl_section ON mart.financial_results(pl_section, period_date) WHERE pl_section IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fr_line_item ON mart.financial_results(line_item, period_date) WHERE line_item IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fr_cfo ON mart.financial_results(cfo_code, period_date) WHERE cfo_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fr_product ON mart.financial_results(product_code, period_date) WHERE product_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fr_segment ON mart.financial_results(client_segment, period_date) WHERE client_segment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fr_channel ON mart.financial_results(channel, period_date) WHERE channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fr_region ON mart.financial_results(region, period_date) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fr_currency ON mart.financial_results(currency_code, period_date);

-- Составной индекс для частых запросов
CREATE INDEX IF NOT EXISTS idx_fr_component_date_class ON mart.financial_results(table_component_id, period_date DESC, report_class);

COMMENT ON TABLE mart.financial_results IS 'Данные финансового результата (P&L) с иерархией статей и аналитическими разрезами';
COMMENT ON COLUMN mart.financial_results.report_class IS 'Класс отчёта: income (доходы) или expense (расходы)';
COMMENT ON COLUMN mart.financial_results.pl_section IS 'Раздел P&L: ЧПД, ЧКД, торговый доход, OPEX, резервы, налог, чистая прибыль';
COMMENT ON COLUMN mart.financial_results.line_item IS 'Статья (Line item): управленческие статьи, согласованные с GL';
COMMENT ON COLUMN mart.financial_results.sub_line_item IS 'Подстатья: детализация статьи для контроля и анализа';

-- ============================================================
-- 4. БАЛАНС (Balance Sheet)
-- ============================================================

CREATE TABLE IF NOT EXISTS mart.balance (
    -- Технические поля
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Связь с конфигурацией
    table_component_id VARCHAR(200) NOT NULL,  -- Ссылка на config.components.id (таблица активов/пассивов)
    row_code VARCHAR(100) NOT NULL,            -- Ссылка на config.table_rows.row_code (иерархия строк)
    
    -- Временной срез
    period_date DATE NOT NULL,
    
    -- Значение
    value DECIMAL(20, 2) NOT NULL,
    
    -- ============================================================
    -- ИЕРАРХИЯ СТАТЕЙ (что учитываем)
    -- ============================================================
    
    -- 1. Класс баланса (Активы / Пассивы / Капитал)
    balance_class VARCHAR(50) NOT NULL,  -- 'assets', 'liabilities', 'equity'
    
    -- 2. Раздел баланса - Крупные блоки
    balance_section VARCHAR(100),  -- 'loans', 'cash', 'deposits', 'equity', и т.п.
    
    -- 3. Статья баланса - Управленческие статьи, согласованные с учётом
    balance_item VARCHAR(200),  -- 'loans_retail', 'loans_corporate', 'demand_deposits', и т.п.
    
    -- 4. Подстатья - Детализация по условиям/типам
    sub_balance_item VARCHAR(200),  -- 'term', 'demand', 'secured', 'unsecured', и т.п.
    
    -- ============================================================
    -- АНАЛИТИЧЕСКИЕ РАЗРЕЗЫ (как анализируем)
    -- ============================================================
    
    -- Тип клиента (ФЛ, ЮЛ и т.д.)
    client_type VARCHAR(50),  -- 'individual', 'corporate', 'sme', и т.п.
    
    -- Клиентский сегмент
    client_segment VARCHAR(100),  -- 'retail', 'corporate', 'premium', и т.п.
    
    -- Продукт / портфель
    product_code VARCHAR(100),  -- Код продукта
    portfolio_code VARCHAR(100),  -- Код портфеля
    
    -- Валюта
    currency_code VARCHAR(10) DEFAULT 'RUB',  -- 'RUB', 'USD', 'EUR', и т.п.
    
    -- Срок / дюрация
    maturity_bucket VARCHAR(50),  -- 'overnight', '1-7d', '1-3m', '3-6m', '6-12m', '1-3y', '3y+'
    
    -- Процентная характеристика (фикс/плавающая)
    interest_type VARCHAR(50),  -- 'fixed', 'floating', 'mixed'
    
    -- Обеспечение / риск-класс
    collateral_type VARCHAR(100),  -- 'secured', 'unsecured', 'guaranteed'
    risk_class VARCHAR(50),  -- 'standard', 'watch', 'substandard', 'doubtful', 'loss'
    
    -- Организационная единица
    org_unit_code VARCHAR(100),  -- Код организационной единицы
    
    -- Регион
    region VARCHAR(100),  -- 'Moscow', 'SPB', и т.п.
    
    -- Дополнительные измерения (для будущих расширений)
    dimensions JSONB,  -- Любые дополнительные разрезы в формате JSON
    
    -- Ограничение уникальности
    UNIQUE(table_component_id, row_code, period_date,
           balance_class, balance_section, balance_item, sub_balance_item,
           client_type, client_segment, product_code, portfolio_code,
           currency_code, maturity_bucket, interest_type, 
           collateral_type, risk_class, org_unit_code, region)
);

-- Индексы для баланса
CREATE INDEX IF NOT EXISTS idx_balance_component ON mart.balance(table_component_id);
CREATE INDEX IF NOT EXISTS idx_balance_date ON mart.balance(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_balance_row_code ON mart.balance(row_code, period_date);
CREATE INDEX IF NOT EXISTS idx_balance_class ON mart.balance(balance_class, period_date);
CREATE INDEX IF NOT EXISTS idx_balance_section ON mart.balance(balance_section, period_date) WHERE balance_section IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_item ON mart.balance(balance_item, period_date) WHERE balance_item IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_client_type ON mart.balance(client_type, period_date) WHERE client_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_segment ON mart.balance(client_segment, period_date) WHERE client_segment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_product ON mart.balance(product_code, period_date) WHERE product_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_currency ON mart.balance(currency_code, period_date);
CREATE INDEX IF NOT EXISTS idx_balance_maturity ON mart.balance(maturity_bucket, period_date) WHERE maturity_bucket IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_interest_type ON mart.balance(interest_type, period_date) WHERE interest_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_risk_class ON mart.balance(risk_class, period_date) WHERE risk_class IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_region ON mart.balance(region, period_date) WHERE region IS NOT NULL;

-- Составной индекс для частых запросов
CREATE INDEX IF NOT EXISTS idx_balance_component_date_class ON mart.balance(table_component_id, period_date DESC, balance_class);

COMMENT ON TABLE mart.balance IS 'Данные баланса с иерархией статей и аналитическими разрезами';
COMMENT ON COLUMN mart.balance.balance_class IS 'Класс баланса: assets (активы), liabilities (пассивы), equity (капитал)';
COMMENT ON COLUMN mart.balance.balance_section IS 'Раздел баланса: кредиты, денежные средства, депозиты, собственный капитал';
COMMENT ON COLUMN mart.balance.balance_item IS 'Статья баланса: управленческие статьи, согласованные с учётом';
COMMENT ON COLUMN mart.balance.sub_balance_item IS 'Подстатья: детализация по условиям/типам';

-- ============================================================
-- 5. ЗАПОЛНЕНИЕ СПРАВОЧНИКА ПОЛЕЙ
-- ============================================================

-- Иерархия финансового результата
INSERT INTO config.mart_fields (field_name, field_type, hierarchy_level, category, description, data_type, is_required) VALUES
    ('report_class', 'hierarchy', 1, 'financial_results', 'Класс отчёта: Доходы / Расходы', 'VARCHAR', true),
    ('pl_section', 'hierarchy', 2, 'financial_results', 'Раздел P&L: ЧПД, ЧКД, торговый доход, OPEX, резервы, налог, чистая прибыль', 'VARCHAR', false),
    ('line_item', 'hierarchy', 3, 'financial_results', 'Статья (Line item): управленческие статьи, согласованные с GL', 'VARCHAR', false),
    ('sub_line_item', 'hierarchy', 4, 'financial_results', 'Подстатья: детализация статьи для контроля и анализа', 'VARCHAR', false)
ON CONFLICT (field_name) DO NOTHING;

-- Аналитика финансового результата
INSERT INTO config.mart_fields (field_name, field_type, category, description, data_type, max_length, is_nullable) VALUES
    ('cfo_code', 'analytical', 'financial_results', 'Организационная структура / ЦФО', 'VARCHAR', 100, true),
    ('product_code', 'analytical', 'financial_results', 'Продукт / код продукта', 'VARCHAR', 100, true),
    ('product_group', 'analytical', 'financial_results', 'Продуктовая группа', 'VARCHAR', 100, true),
    ('client_segment', 'analytical', 'financial_results', 'Клиентский сегмент', 'VARCHAR', 100, true),
    ('channel', 'analytical', 'financial_results', 'Канал', 'VARCHAR', 100, true),
    ('region', 'analytical', 'financial_results', 'Регион', 'VARCHAR', 100, true),
    ('project_code', 'analytical', 'financial_results', 'Проект / инициатива', 'VARCHAR', 100, true),
    ('currency_code', 'analytical', 'financial_results', 'Валюта', 'VARCHAR', 10, false)
ON CONFLICT (field_name) DO NOTHING;

-- Иерархия баланса
INSERT INTO config.mart_fields (field_name, field_type, hierarchy_level, category, description, data_type, is_required) VALUES
    ('balance_class', 'hierarchy', 1, 'balance', 'Класс баланса: Активы / Пассивы / Капитал', 'VARCHAR', true),
    ('balance_section', 'hierarchy', 2, 'balance', 'Раздел баланса: кредиты, денежные средства, депозиты, собственный капитал', 'VARCHAR', false),
    ('balance_item', 'hierarchy', 3, 'balance', 'Статья баланса: управленческие статьи, согласованные с учётом', 'VARCHAR', false),
    ('sub_balance_item', 'hierarchy', 4, 'balance', 'Подстатья: детализация по условиям/типам', 'VARCHAR', false)
ON CONFLICT (field_name) DO NOTHING;

-- Аналитика баланса
INSERT INTO config.mart_fields (field_name, field_type, category, description, data_type, max_length, is_nullable) VALUES
    ('client_type', 'analytical', 'balance', 'Тип клиента (ФЛ, ЮЛ и т.д.)', 'VARCHAR', 50, true),
    ('client_segment', 'analytical', 'balance', 'Клиентский сегмент', 'VARCHAR', 100, true),
    ('product_code', 'analytical', 'balance', 'Продукт / код продукта', 'VARCHAR', 100, true),
    ('portfolio_code', 'analytical', 'balance', 'Портфель / код портфеля', 'VARCHAR', 100, true),
    ('currency_code', 'analytical', 'balance', 'Валюта', 'VARCHAR', 10, false),
    ('maturity_bucket', 'analytical', 'balance', 'Срок / дюрация', 'VARCHAR', 50, true),
    ('interest_type', 'analytical', 'balance', 'Процентная характеристика (фикс/плавающая)', 'VARCHAR', 50, true),
    ('collateral_type', 'analytical', 'balance', 'Обеспечение', 'VARCHAR', 100, true),
    ('risk_class', 'analytical', 'balance', 'Риск-класс', 'VARCHAR', 50, true),
    ('org_unit_code', 'analytical', 'balance', 'Организационная единица', 'VARCHAR', 100, true),
    ('region', 'analytical', 'balance', 'Регион', 'VARCHAR', 100, true)
ON CONFLICT (field_name) DO NOTHING;

-- Общие поля
INSERT INTO config.mart_fields (field_name, field_type, category, description, data_type, is_nullable) VALUES
    ('table_component_id', 'analytical', 'common', 'Ссылка на config.components.id (таблица)', 'VARCHAR', false),
    ('row_code', 'analytical', 'common', 'Ссылка на config.table_rows.row_code (иерархия строк)', 'VARCHAR', false),
    ('period_date', 'analytical', 'common', 'Дата периода', 'DATE', false),
    ('value', 'analytical', 'common', 'Значение', 'DECIMAL', false),
    ('dimensions', 'analytical', 'common', 'Дополнительные измерения (JSON)', 'JSONB', true)
ON CONFLICT (field_name) DO NOTHING;

COMMIT;
