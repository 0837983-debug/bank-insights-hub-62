-- ============================================================
-- МИГРАЦИЯ: ТЕСТОВЫЕ ДАННЫЕ ДЛЯ ВИТРИНЫ MART
-- ============================================================
-- Заполняет таблицы MART тестовыми данными на каждый месяц
-- начиная с декабря 2024 года
-- ============================================================

BEGIN;

-- ============================================================
-- 1. KPI МЕТРИКИ (Financial Results)
-- ============================================================

-- Декабрь 2024
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2024-12-31', 6500000000),
    ('ebitda_card', '2024-12-31', 2100000000),
    ('cost_to_income_card', '2024-12-31', 42.5),
    ('roa_card', '2024-12-31', 2.8),
    ('roe_card', '2024-12-31', 18.2)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

-- Январь 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-01-31', 6800000000),
    ('ebitda_card', '2025-01-31', 2250000000),
    ('cost_to_income_card', '2025-01-31', 41.8),
    ('roa_card', '2025-01-31', 2.9),
    ('roe_card', '2025-01-31', 18.5)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

-- Февраль 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-02-28', 7100000000),
    ('ebitda_card', '2025-02-28', 2400000000),
    ('cost_to_income_card', '2025-02-28', 41.2),
    ('roa_card', '2025-02-28', 3.0),
    ('roe_card', '2025-02-28', 18.8)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

-- Март 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-03-31', 7400000000),
    ('ebitda_card', '2025-03-31', 2550000000),
    ('cost_to_income_card', '2025-03-31', 40.5),
    ('roa_card', '2025-03-31', 3.1),
    ('roe_card', '2025-03-31', 19.2)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 2. KPI МЕТРИКИ (Balance)
-- ============================================================

-- Декабрь 2024
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('total_assets_card', '2024-12-31', 45200000000),
    ('client_deposits_card', '2024-12-31', 22500000000),
    ('capital_card', '2024-12-31', 8200000000),
    ('hla_share_card', '2024-12-31', 40.2),
    ('working_assets_share_card', '2024-12-31', 59.7)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

-- Январь 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('total_assets_card', '2025-01-31', 46500000000),
    ('client_deposits_card', '2025-01-31', 23200000000),
    ('capital_card', '2025-01-31', 8450000000),
    ('hla_share_card', '2025-01-31', 40.8),
    ('working_assets_share_card', '2025-01-31', 59.2)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

-- Февраль 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('total_assets_card', '2025-02-28', 47800000000),
    ('client_deposits_card', '2025-02-28', 23900000000),
    ('capital_card', '2025-02-28', 8700000000),
    ('hla_share_card', '2025-02-28', 41.2),
    ('working_assets_share_card', '2025-02-28', 58.8)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

-- Март 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('total_assets_card', '2025-03-31', 49200000000),
    ('client_deposits_card', '2025-03-31', 24600000000),
    ('capital_card', '2025-03-31', 8950000000),
    ('hla_share_card', '2025-03-31', 41.5),
    ('working_assets_share_card', '2025-03-31', 58.5)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 3. ФИНАНСОВЫЙ РЕЗУЛЬТАТ - ДОХОДЫ (Income)
-- ============================================================

-- Декабрь 2024 - Доходы (без группировки)
INSERT INTO mart.financial_results (
    table_component_id, row_code, period_date, value,
    report_class, pl_section, line_item, sub_line_item,
    currency_code
) VALUES
    -- Чистый процентный доход (ЧПД)
    ('financial_results_income_table', 'i1', '2024-12-31', 3200000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i2', '2024-12-31', 4100000000, 'income', 'net_interest_income', 'interest_income', NULL, 'RUB'),
    ('financial_results_income_table', 'i2-1', '2024-12-31', 2100000000, 'income', 'net_interest_income', 'interest_income', 'loans_retail', 'RUB'),
    ('financial_results_income_table', 'i2-2', '2024-12-31', 1200000000, 'income', 'net_interest_income', 'interest_income', 'loans_corporate', 'RUB'),
    ('financial_results_income_table', 'i2-3', '2024-12-31', 800000000, 'income', 'net_interest_income', 'interest_income', 'placements', 'RUB'),
    ('financial_results_income_table', 'i3', '2024-12-31', -900000000, 'income', 'net_interest_income', 'interest_expense', NULL, 'RUB'),
    ('financial_results_income_table', 'i3-1', '2024-12-31', -520000000, 'income', 'net_interest_income', 'interest_expense', 'deposits_retail', 'RUB'),
    ('financial_results_income_table', 'i3-2', '2024-12-31', -280000000, 'income', 'net_interest_income', 'interest_expense', 'deposits_corporate', 'RUB'),
    ('financial_results_income_table', 'i3-3', '2024-12-31', -100000000, 'income', 'net_interest_income', 'interest_expense', 'other_interest', 'RUB'),
    
    -- Чистый комиссионный доход (ЧКД)
    ('financial_results_income_table', 'i4', '2024-12-31', 5800000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i5', '2024-12-31', 3200000000, 'income', 'net_commission_income', 'transfer_commissions', NULL, 'RUB'),
    ('financial_results_income_table', 'i5-1', '2024-12-31', 1600000000, 'income', 'net_commission_income', 'transfer_commissions', 'cis_transfers', 'RUB'),
    ('financial_results_income_table', 'i5-2', '2024-12-31', 960000000, 'income', 'net_commission_income', 'transfer_commissions', 'europe_transfers', 'RUB'),
    ('financial_results_income_table', 'i5-3', '2024-12-31', 640000000, 'income', 'net_commission_income', 'transfer_commissions', 'asia_transfers', 'RUB'),
    ('financial_results_income_table', 'i6', '2024-12-31', 1800000000, 'income', 'net_commission_income', 'service_commissions', NULL, 'RUB'),
    ('financial_results_income_table', 'i6-1', '2024-12-31', 900000000, 'income', 'net_commission_income', 'service_commissions', 'card_service', 'RUB'),
    ('financial_results_income_table', 'i6-2', '2024-12-31', 540000000, 'income', 'net_commission_income', 'service_commissions', 'account_service', 'RUB'),
    ('financial_results_income_table', 'i6-3', '2024-12-31', 360000000, 'income', 'net_commission_income', 'service_commissions', 'other_service', 'RUB'),
    ('financial_results_income_table', 'i7', '2024-12-31', 800000000, 'income', 'net_commission_income', 'other_commissions', NULL, 'RUB'),
    
    -- Доходы по FX
    ('financial_results_income_table', 'i8', '2024-12-31', 2400000000, 'income', 'trading_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i9', '2024-12-31', 1400000000, 'income', 'trading_income', 'fx_spread', NULL, 'RUB'),
    ('financial_results_income_table', 'i9-1', '2024-12-31', 700000000, 'income', 'trading_income', 'fx_spread', 'usd_rub', 'RUB'),
    ('financial_results_income_table', 'i9-2', '2024-12-31', 420000000, 'income', 'trading_income', 'fx_spread', 'eur_rub', 'RUB'),
    ('financial_results_income_table', 'i9-3', '2024-12-31', 280000000, 'income', 'trading_income', 'fx_spread', 'other_pairs', 'RUB'),
    ('financial_results_income_table', 'i10', '2024-12-31', 800000000, 'income', 'trading_income', 'fx_margin', NULL, 'RUB'),
    ('financial_results_income_table', 'i11', '2024-12-31', 200000000, 'income', 'trading_income', 'trading_income', NULL, 'RUB'),
    
    -- Прочие доходы
    ('financial_results_income_table', 'i12', '2024-12-31', 600000000, 'income', 'other_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i13', '2024-12-31', 400000000, 'income', 'other_income', 'operational', NULL, 'RUB'),
    ('financial_results_income_table', 'i14', '2024-12-31', 200000000, 'income', 'other_income', 'financial', NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Январь 2025 - Доходы (с небольшим ростом)
INSERT INTO mart.financial_results (
    table_component_id, row_code, period_date, value,
    report_class, pl_section, line_item, sub_line_item,
    currency_code
) VALUES
    ('financial_results_income_table', 'i1', '2025-01-31', 3300000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i2', '2025-01-31', 4200000000, 'income', 'net_interest_income', 'interest_income', NULL, 'RUB'),
    ('financial_results_income_table', 'i2-1', '2025-01-31', 2160000000, 'income', 'net_interest_income', 'interest_income', 'loans_retail', 'RUB'),
    ('financial_results_income_table', 'i2-2', '2025-01-31', 1230000000, 'income', 'net_interest_income', 'interest_income', 'loans_corporate', 'RUB'),
    ('financial_results_income_table', 'i2-3', '2025-01-31', 810000000, 'income', 'net_interest_income', 'interest_income', 'placements', 'RUB'),
    ('financial_results_income_table', 'i3', '2025-01-31', -900000000, 'income', 'net_interest_income', 'interest_expense', NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-01-31', 5950000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i8', '2025-01-31', 2450000000, 'income', 'trading_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i12', '2025-01-31', 610000000, 'income', 'other_income', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Февраль 2025 - Доходы
INSERT INTO mart.financial_results (
    table_component_id, row_code, period_date, value,
    report_class, pl_section, line_item, sub_line_item,
    currency_code
) VALUES
    ('financial_results_income_table', 'i1', '2025-02-28', 3400000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i2', '2025-02-28', 4300000000, 'income', 'net_interest_income', 'interest_income', NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-02-28', 6100000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i8', '2025-02-28', 2500000000, 'income', 'trading_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i12', '2025-02-28', 620000000, 'income', 'other_income', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Март 2025 - Доходы
INSERT INTO mart.financial_results (
    table_component_id, row_code, period_date, value,
    report_class, pl_section, line_item, sub_line_item,
    currency_code
) VALUES
    ('financial_results_income_table', 'i1', '2025-03-31', 3500000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i2', '2025-03-31', 4400000000, 'income', 'net_interest_income', 'interest_income', NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-03-31', 6250000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i8', '2025-03-31', 2550000000, 'income', 'trading_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i12', '2025-03-31', 630000000, 'income', 'other_income', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. ФИНАНСОВЫЙ РЕЗУЛЬТАТ - РАСХОДЫ (Expenses)
-- ============================================================

-- Декабрь 2024 - Расходы
INSERT INTO mart.financial_results (
    table_component_id, row_code, period_date, value,
    report_class, pl_section, line_item, sub_line_item,
    currency_code
) VALUES
    -- Операционные расходы (OPEX)
    ('financial_results_expenses_table', 'e1', '2024-12-31', 5100000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2024-12-31', 3200000000, 'expense', 'opex', 'fot', NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2-1', '2024-12-31', 1800000000, 'expense', 'opex', 'fot', 'salary', 'RUB'),
    ('financial_results_expenses_table', 'e2-2', '2024-12-31', 900000000, 'expense', 'opex', 'fot', 'bonus', 'RUB'),
    ('financial_results_expenses_table', 'e2-3', '2024-12-31', 500000000, 'expense', 'opex', 'fot', 'social', 'RUB'),
    ('financial_results_expenses_table', 'e3', '2024-12-31', 800000000, 'expense', 'opex', 'it_expenses', NULL, 'RUB'),
    ('financial_results_expenses_table', 'e3-1', '2024-12-31', 400000000, 'expense', 'opex', 'it_expenses', 'licenses', 'RUB'),
    ('financial_results_expenses_table', 'e3-2', '2024-12-31', 250000000, 'expense', 'opex', 'it_expenses', 'support', 'RUB'),
    ('financial_results_expenses_table', 'e3-3', '2024-12-31', 150000000, 'expense', 'opex', 'it_expenses', 'infrastructure', 'RUB'),
    ('financial_results_expenses_table', 'e4', '2024-12-31', 600000000, 'expense', 'opex', 'office_expenses', NULL, 'RUB'),
    ('financial_results_expenses_table', 'e5', '2024-12-31', 500000000, 'expense', 'opex', 'marketing', NULL, 'RUB'),
    
    -- Резервы
    ('financial_results_expenses_table', 'e6', '2024-12-31', 1200000000, 'expense', 'provisions', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e6-1', '2024-12-31', 800000000, 'expense', 'provisions', 'loan_provisions', NULL, 'RUB'),
    ('financial_results_expenses_table', 'e6-2', '2024-12-31', 400000000, 'expense', 'provisions', 'other_provisions', NULL, 'RUB'),
    
    -- Налоги
    ('financial_results_expenses_table', 'e7', '2024-12-31', 1500000000, 'expense', 'tax', 'income_tax', NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Январь 2025 - Расходы
INSERT INTO mart.financial_results (
    table_component_id, row_code, period_date, value,
    report_class, pl_section, line_item, sub_line_item,
    currency_code
) VALUES
    ('financial_results_expenses_table', 'e1', '2025-01-31', 5150000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-01-31', 3220000000, 'expense', 'opex', 'fot', NULL, 'RUB'),
    ('financial_results_expenses_table', 'e6', '2025-01-31', 1180000000, 'expense', 'provisions', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e7', '2025-01-31', 1520000000, 'expense', 'tax', 'income_tax', NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Февраль 2025 - Расходы
INSERT INTO mart.financial_results (
    table_component_id, row_code, period_date, value,
    report_class, pl_section, line_item, sub_line_item,
    currency_code
) VALUES
    ('financial_results_expenses_table', 'e1', '2025-02-28', 5200000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-02-28', 3240000000, 'expense', 'opex', 'fot', NULL, 'RUB'),
    ('financial_results_expenses_table', 'e6', '2025-02-28', 1160000000, 'expense', 'provisions', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e7', '2025-02-28', 1540000000, 'expense', 'tax', 'income_tax', NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Март 2025 - Расходы
INSERT INTO mart.financial_results (
    table_component_id, row_code, period_date, value,
    report_class, pl_section, line_item, sub_line_item,
    currency_code
) VALUES
    ('financial_results_expenses_table', 'e1', '2025-03-31', 5250000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-03-31', 3260000000, 'expense', 'opex', 'fot', NULL, 'RUB'),
    ('financial_results_expenses_table', 'e6', '2025-03-31', 1140000000, 'expense', 'provisions', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e7', '2025-03-31', 1560000000, 'expense', 'tax', 'income_tax', NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. БАЛАНС - АКТИВЫ
-- ============================================================

-- Декабрь 2024 - Активы
INSERT INTO mart.balance (
    table_component_id, row_code, period_date, value,
    balance_class, balance_section, balance_item, sub_balance_item,
    currency_code
) VALUES
    -- Наличные и эквиваленты
    ('balance_assets_table', 'a2', '2024-12-31', 5800000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a2-1', '2024-12-31', 1200000000, 'assets', 'cash', 'cash_vault', NULL, 'RUB'),
    ('balance_assets_table', 'a2-2', '2024-12-31', 3100000000, 'assets', 'cash', 'cb_accounts', NULL, 'RUB'),
    ('balance_assets_table', 'a2-3', '2024-12-31', 1500000000, 'assets', 'cash', 'other_equivalents', NULL, 'RUB'),
    
    -- Корреспондентские счета
    ('balance_assets_table', 'a3', '2024-12-31', 12400000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3-1', '2024-12-31', 7800000000, 'assets', 'correspondent', 'resident_banks', NULL, 'RUB'),
    ('balance_assets_table', 'a3-2', '2024-12-31', 4600000000, 'assets', 'correspondent', 'nonresident_banks', NULL, 'RUB'),
    
    -- Инвестиции
    ('balance_assets_table', 'a4', '2024-12-31', 8200000000, 'assets', 'investments', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a4-1', '2024-12-31', 4500000000, 'assets', 'investments', 'ofz', NULL, 'RUB'),
    ('balance_assets_table', 'a4-2', '2024-12-31', 2200000000, 'assets', 'investments', 'corporate_bonds', NULL, 'RUB'),
    ('balance_assets_table', 'a4-3', '2024-12-31', 1500000000, 'assets', 'investments', 'stocks', NULL, 'RUB'),
    
    -- Рабочие активы
    ('balance_assets_table', 'a5', '2024-12-31', 18800000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5-1', '2024-12-31', 9500000000, 'assets', 'working_assets', 'loans_corporate', NULL, 'RUB'),
    ('balance_assets_table', 'a5-2', '2024-12-31', 6200000000, 'assets', 'working_assets', 'loans_retail', NULL, 'RUB'),
    ('balance_assets_table', 'a5-3', '2024-12-31', 2100000000, 'assets', 'working_assets', 'interbank_loans', NULL, 'RUB'),
    ('balance_assets_table', 'a5-4', '2024-12-31', 1000000000, 'assets', 'working_assets', 'other_assets', NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Январь 2025 - Активы
INSERT INTO mart.balance (
    table_component_id, row_code, period_date, value,
    balance_class, balance_section, balance_item, sub_balance_item,
    currency_code
) VALUES
    ('balance_assets_table', 'a2', '2025-01-31', 5900000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-01-31', 12700000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a4', '2025-01-31', 8300000000, 'assets', 'investments', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-01-31', 19600000000, 'assets', 'working_assets', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Февраль 2025 - Активы
INSERT INTO mart.balance (
    table_component_id, row_code, period_date, value,
    balance_class, balance_section, balance_item, sub_balance_item,
    currency_code
) VALUES
    ('balance_assets_table', 'a2', '2025-02-28', 6000000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-02-28', 13000000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a4', '2025-02-28', 8400000000, 'assets', 'investments', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-02-28', 20400000000, 'assets', 'working_assets', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Март 2025 - Активы
INSERT INTO mart.balance (
    table_component_id, row_code, period_date, value,
    balance_class, balance_section, balance_item, sub_balance_item,
    currency_code
) VALUES
    ('balance_assets_table', 'a2', '2025-03-31', 6100000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-03-31', 13300000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a4', '2025-03-31', 8500000000, 'assets', 'investments', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-03-31', 21200000000, 'assets', 'working_assets', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. БАЛАНС - ПАССИВЫ
-- ============================================================

-- Декабрь 2024 - Пассивы
INSERT INTO mart.balance (
    table_component_id, row_code, period_date, value,
    balance_class, balance_section, balance_item, sub_balance_item,
    currency_code
) VALUES
    -- Депозиты клиентов
    ('balance_liabilities_table', 'l2', '2024-12-31', 22500000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2-1', '2024-12-31', 11200000000, 'liabilities', 'deposits', 'term_deposits_retail', NULL, 'RUB'),
    ('balance_liabilities_table', 'l2-2', '2024-12-31', 7800000000, 'liabilities', 'deposits', 'term_deposits_corporate', NULL, 'RUB'),
    ('balance_liabilities_table', 'l2-3', '2024-12-31', 3500000000, 'liabilities', 'deposits', 'savings_accounts', NULL, 'RUB'),
    
    -- Остатки ДВС
    ('balance_liabilities_table', 'l3', '2024-12-31', 14200000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3-1', '2024-12-31', 5800000000, 'liabilities', 'demand_accounts', 'current_accounts_retail', NULL, 'RUB'),
    ('balance_liabilities_table', 'l3-2', '2024-12-31', 6900000000, 'liabilities', 'demand_accounts', 'current_accounts_corporate', NULL, 'RUB'),
    ('balance_liabilities_table', 'l3-3', '2024-12-31', 1500000000, 'liabilities', 'demand_accounts', 'escrow_special', NULL, 'RUB'),
    
    -- Привлечённые средства
    ('balance_liabilities_table', 'l4', '2024-12-31', 8500000000, 'liabilities', 'borrowed_funds', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l4-1', '2024-12-31', 3200000000, 'liabilities', 'borrowed_funds', 'interbank_borrowed', NULL, 'RUB'),
    ('balance_liabilities_table', 'l4-2', '2024-12-31', 3800000000, 'liabilities', 'borrowed_funds', 'bonds_issued', NULL, 'RUB'),
    ('balance_liabilities_table', 'l4-3', '2024-12-31', 1500000000, 'liabilities', 'borrowed_funds', 'subordinated_loans', NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Январь 2025 - Пассивы
INSERT INTO mart.balance (
    table_component_id, row_code, period_date, value,
    balance_class, balance_section, balance_item, sub_balance_item,
    currency_code
) VALUES
    ('balance_liabilities_table', 'l2', '2025-01-31', 23200000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-01-31', 14500000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l4', '2025-01-31', 8800000000, 'liabilities', 'borrowed_funds', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Февраль 2025 - Пассивы
INSERT INTO mart.balance (
    table_component_id, row_code, period_date, value,
    balance_class, balance_section, balance_item, sub_balance_item,
    currency_code
) VALUES
    ('balance_liabilities_table', 'l2', '2025-02-28', 23900000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-02-28', 14800000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l4', '2025-02-28', 9100000000, 'liabilities', 'borrowed_funds', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Март 2025 - Пассивы
INSERT INTO mart.balance (
    table_component_id, row_code, period_date, value,
    balance_class, balance_section, balance_item, sub_balance_item,
    currency_code
) VALUES
    ('balance_liabilities_table', 'l2', '2025-03-31', 24600000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-03-31', 15100000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l4', '2025-03-31', 9400000000, 'liabilities', 'borrowed_funds', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ДОПОЛНИТЕЛЬНЫЕ МЕСЯЦЫ 2025 ГОДА (Апрель - Декабрь)
-- ============================================================

-- Апрель 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-04-30', 7700000000),
    ('ebitda_card', '2025-04-30', 2700000000),
    ('cost_to_income_card', '2025-04-30', 40.0),
    ('roa_card', '2025-04-30', 3.2),
    ('roe_card', '2025-04-30', 19.5),
    ('total_assets_card', '2025-04-30', 50500000000),
    ('client_deposits_card', '2025-04-30', 25300000000),
    ('capital_card', '2025-04-30', 9200000000),
    ('hla_share_card', '2025-04-30', 41.8),
    ('working_assets_share_card', '2025-04-30', 58.2)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-04-30', 3600000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-04-30', 6400000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-04-30', 5300000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-04-30', 3280000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-04-30', 6200000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-04-30', 13600000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-04-30', 22000000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-04-30', 25300000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-04-30', 15400000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Май 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-05-31', 8000000000),
    ('ebitda_card', '2025-05-31', 2850000000),
    ('cost_to_income_card', '2025-05-31', 39.5),
    ('roa_card', '2025-05-31', 3.3),
    ('roe_card', '2025-05-31', 19.8),
    ('total_assets_card', '2025-05-31', 51800000000),
    ('client_deposits_card', '2025-05-31', 26000000000),
    ('capital_card', '2025-05-31', 9450000000),
    ('hla_share_card', '2025-05-31', 42.0),
    ('working_assets_share_card', '2025-05-31', 58.0)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-05-31', 3700000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-05-31', 6550000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-05-31', 5350000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-05-31', 3300000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-05-31', 6300000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-05-31', 13900000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-05-31', 22800000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-05-31', 26000000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-05-31', 15700000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Июнь 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-06-30', 8300000000),
    ('ebitda_card', '2025-06-30', 3000000000),
    ('cost_to_income_card', '2025-06-30', 39.0),
    ('roa_card', '2025-06-30', 3.4),
    ('roe_card', '2025-06-30', 20.1),
    ('total_assets_card', '2025-06-30', 53200000000),
    ('client_deposits_card', '2025-06-30', 26700000000),
    ('capital_card', '2025-06-30', 9700000000),
    ('hla_share_card', '2025-06-30', 42.2),
    ('working_assets_share_card', '2025-06-30', 57.8)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-06-30', 3800000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-06-30', 6700000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-06-30', 5400000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-06-30', 3320000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-06-30', 6400000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-06-30', 14200000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-06-30', 23600000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-06-30', 26700000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-06-30', 16000000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Июль 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-07-31', 8600000000),
    ('ebitda_card', '2025-07-31', 3150000000),
    ('cost_to_income_card', '2025-07-31', 38.5),
    ('roa_card', '2025-07-31', 3.5),
    ('roe_card', '2025-07-31', 20.4),
    ('total_assets_card', '2025-07-31', 54500000000),
    ('client_deposits_card', '2025-07-31', 27400000000),
    ('capital_card', '2025-07-31', 9950000000),
    ('hla_share_card', '2025-07-31', 42.5),
    ('working_assets_share_card', '2025-07-31', 57.5)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-07-31', 3900000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-07-31', 6850000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-07-31', 5450000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-07-31', 3340000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-07-31', 6500000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-07-31', 14500000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-07-31', 24400000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-07-31', 27400000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-07-31', 16300000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Август 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-08-31', 8900000000),
    ('ebitda_card', '2025-08-31', 3300000000),
    ('cost_to_income_card', '2025-08-31', 38.0),
    ('roa_card', '2025-08-31', 3.6),
    ('roe_card', '2025-08-31', 20.7),
    ('total_assets_card', '2025-08-31', 55800000000),
    ('client_deposits_card', '2025-08-31', 28100000000),
    ('capital_card', '2025-08-31', 10200000000),
    ('hla_share_card', '2025-08-31', 42.8),
    ('working_assets_share_card', '2025-08-31', 57.2)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-08-31', 4000000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-08-31', 7000000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-08-31', 5500000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-08-31', 3360000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-08-31', 6600000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-08-31', 14800000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-08-31', 25200000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-08-31', 28100000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-08-31', 16600000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Сентябрь 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-09-30', 9200000000),
    ('ebitda_card', '2025-09-30', 3450000000),
    ('cost_to_income_card', '2025-09-30', 37.5),
    ('roa_card', '2025-09-30', 3.7),
    ('roe_card', '2025-09-30', 21.0),
    ('total_assets_card', '2025-09-30', 57200000000),
    ('client_deposits_card', '2025-09-30', 28800000000),
    ('capital_card', '2025-09-30', 10450000000),
    ('hla_share_card', '2025-09-30', 43.0),
    ('working_assets_share_card', '2025-09-30', 57.0)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-09-30', 4100000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-09-30', 7150000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-09-30', 5550000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-09-30', 3380000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-09-30', 6700000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-09-30', 15100000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-09-30', 26000000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-09-30', 28800000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-09-30', 16900000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Октябрь 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-10-31', 9500000000),
    ('ebitda_card', '2025-10-31', 3600000000),
    ('cost_to_income_card', '2025-10-31', 37.0),
    ('roa_card', '2025-10-31', 3.8),
    ('roe_card', '2025-10-31', 21.3),
    ('total_assets_card', '2025-10-31', 58500000000),
    ('client_deposits_card', '2025-10-31', 29500000000),
    ('capital_card', '2025-10-31', 10700000000),
    ('hla_share_card', '2025-10-31', 43.2),
    ('working_assets_share_card', '2025-10-31', 56.8)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-10-31', 4200000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-10-31', 7300000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-10-31', 5600000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-10-31', 3400000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-10-31', 6800000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-10-31', 15400000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-10-31', 26800000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-10-31', 29500000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-10-31', 17200000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Ноябрь 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-11-30', 9800000000),
    ('ebitda_card', '2025-11-30', 3750000000),
    ('cost_to_income_card', '2025-11-30', 36.5),
    ('roa_card', '2025-11-30', 3.9),
    ('roe_card', '2025-11-30', 21.6),
    ('total_assets_card', '2025-11-30', 59800000000),
    ('client_deposits_card', '2025-11-30', 30200000000),
    ('capital_card', '2025-11-30', 10950000000),
    ('hla_share_card', '2025-11-30', 43.5),
    ('working_assets_share_card', '2025-11-30', 56.5)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-11-30', 4300000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-11-30', 7450000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-11-30', 5650000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-11-30', 3420000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-11-30', 6900000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-11-30', 15700000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-11-30', 27600000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-11-30', 30200000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-11-30', 17500000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

-- Декабрь 2025
INSERT INTO mart.kpi_metrics (component_id, period_date, value) VALUES
    ('net_profit_card', '2025-12-31', 10100000000),
    ('ebitda_card', '2025-12-31', 3900000000),
    ('cost_to_income_card', '2025-12-31', 36.0),
    ('roa_card', '2025-12-31', 4.0),
    ('roe_card', '2025-12-31', 21.9),
    ('total_assets_card', '2025-12-31', 61000000000),
    ('client_deposits_card', '2025-12-31', 30900000000),
    ('capital_card', '2025-12-31', 11200000000),
    ('hla_share_card', '2025-12-31', 43.8),
    ('working_assets_share_card', '2025-12-31', 56.2)
ON CONFLICT (component_id, period_date) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO mart.financial_results (table_component_id, row_code, period_date, value, report_class, pl_section, line_item, sub_line_item, currency_code) VALUES
    ('financial_results_income_table', 'i1', '2025-12-31', 4400000000, 'income', 'net_interest_income', NULL, NULL, 'RUB'),
    ('financial_results_income_table', 'i4', '2025-12-31', 7600000000, 'income', 'net_commission_income', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e1', '2025-12-31', 5700000000, 'expense', 'opex', NULL, NULL, 'RUB'),
    ('financial_results_expenses_table', 'e2', '2025-12-31', 3440000000, 'expense', 'opex', 'fot', NULL, 'RUB')
ON CONFLICT DO NOTHING;

INSERT INTO mart.balance (table_component_id, row_code, period_date, value, balance_class, balance_section, balance_item, sub_balance_item, currency_code) VALUES
    ('balance_assets_table', 'a2', '2025-12-31', 7000000000, 'assets', 'cash', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a3', '2025-12-31', 16000000000, 'assets', 'correspondent', NULL, NULL, 'RUB'),
    ('balance_assets_table', 'a5', '2025-12-31', 28400000000, 'assets', 'working_assets', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l2', '2025-12-31', 30900000000, 'liabilities', 'deposits', NULL, NULL, 'RUB'),
    ('balance_liabilities_table', 'l3', '2025-12-31', 17800000000, 'liabilities', 'demand_accounts', NULL, NULL, 'RUB')
ON CONFLICT DO NOTHING;

COMMIT;
