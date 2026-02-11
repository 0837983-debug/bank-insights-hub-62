-- 051_create_kpi_cards.sql
-- Удаление старых карточек и создание новых из v_kpi_all

-- 1. Удалить старые карточки
DELETE FROM config.layout_component_mapping
WHERE component_id IN (SELECT id FROM config.components WHERE component_type = 'card');

DELETE FROM config.component_fields
WHERE component_id IN (SELECT id FROM config.components WHERE component_type = 'card');

DELETE FROM config.components WHERE component_type = 'card';

-- 2. Создать карточки для баланса (section_balance, currency_rub)
SELECT config.add_kpi_card('card_assets', 'Активы', 'АКТИВЫ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_assets_credits', 'Кредиты', 'АКТИВЫ::КРЕДИТЫ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_assets_liquid', 'Ликвидные активы', 'АКТИВЫ::ЛИКВИДНЫЕ_АКТИВЫ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_assets_mbk', 'МБК', 'АКТИВЫ::МБК', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_assets_other', 'Прочие активы', 'АКТИВЫ::ПРОЧИЕ_АКТИВЫ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_assets_reserves', 'Резервы', 'АКТИВЫ::РЕЗЕРВЫ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_assets_securities', 'Ценные бумаги', 'АКТИВЫ::ЦЕННЫЕ_БУМАГИ', 'currency_rub', 'main_dashboard', 'section_balance');

SELECT config.add_kpi_card('card_liabilities', 'Пассивы', 'ПАССИВЫ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_liabilities_obligations', 'Обязательства', 'ПАССИВЫ::Обязательства', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_liabilities_other', 'Прочие обязательства', 'ПАССИВЫ::ПРОЧИЕ_ОБЯЗАТЕЛЬСТВА', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_liabilities_banks', 'Средства банков', 'ПАССИВЫ::СРЕДСТВА_БАНКОВ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_liabilities_settlements', 'Средства в расчетах', 'ПАССИВЫ::СРЕДСТВА_В_РАСЧЕТАХ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_liabilities_clients', 'Средства клиентов', 'ПАССИВЫ::СРЕДСТВА_КЛИЕНТОВ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_liabilities_securities', 'Ценные бумаги (пассив)', 'ПАССИВЫ::ЦЕННЫЕ_БУМАГИ', 'currency_rub', 'main_dashboard', 'section_balance');

SELECT config.add_kpi_card('card_capital', 'Капитал', 'КАПИТАЛ', 'currency_rub', 'main_dashboard', 'section_balance');
SELECT config.add_kpi_card('card_capital_capital', 'Капитал (раздел)', 'КАПИТАЛ::КАПИТАЛ', 'currency_rub', 'main_dashboard', 'section_balance');

-- 3. Создать карточки для финреза (section_financial_results, currency_rub)
-- ЧПД
SELECT config.add_kpi_card('card_nii', 'ЧПД', 'ЧПД', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_nii_interest_income', 'Процентный доход', 'ЧПД::ПРОЦЕНТНЫЙ_ДОХОД', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_nii_interest_expense', 'Процентный расход', 'ЧПД::ПРОЦЕНТНЫЙ_РАСХОД', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- ЧКД
SELECT config.add_kpi_card('card_nci', 'ЧКД', 'ЧКД', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_nci_commission_income', 'Комиссионный доход', 'ЧКД::КОМИССИОННЫЙ_ДОХОД', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_nci_commission_expense', 'Комиссионный расход', 'ЧКД::КОМИССИОННЫЙ_РАСХОД', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- FX
SELECT config.add_kpi_card('card_fx', 'FX', 'FX', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_fx_noncash', 'FX безнал', 'FX::БЕЗНАЛ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_fx_cash', 'FX наличные', 'FX::НАЛИЧНЫЕ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_fx_revaluation', 'Переоценка валют', 'FX::ПЕРЕОЦЕНКА_ВАЛЮТ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_fx_management', 'Управленческие корректировки', 'FX::УПРАВЛЕНЧЕСКИЕ_КОРРЕКТИРОВКИ', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- ЧТД
SELECT config.add_kpi_card('card_ntd', 'ЧТД', 'ЧТД', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_ntd_securities_income', 'Доходы от операций с ЦБ', 'ЧТД::ДОХОДЫ_ОТ_ОПЕРАЦИЙ_С_ЦБ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_ntd_revaluation', 'Переоценка ЧТД', 'ЧТД::ПЕРЕОЦЕНКА_ЧТД', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_ntd_securities_expense', 'Расходы от операций с ЦБ', 'ЧТД::РАСХОДЫ_ОТ_ОПЕРАЦИЙ_С_ЦБ', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- Операционные расходы
SELECT config.add_kpi_card('card_opex', 'Операционные расходы', 'ОПЕРАЦИОННЫЕ_РАСХОДЫ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_opex_depreciation', 'Амортизация', 'ОПЕРАЦИОННЫЕ_РАСХОДЫ::АМОРТИЗАЦИЯ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_opex_admin', 'АХР', 'ОПЕРАЦИОННЫЕ_РАСХОДЫ::АХР', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_opex_payroll', 'Оплата труда', 'ОПЕРАЦИОННЫЕ_РАСХОДЫ::ОПЛАТА_ТРУДА', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- Резервы
SELECT config.add_kpi_card('card_reserves_effect', 'Нетто-эффект резервов', 'НЕТТО_ЭФФЕКТ_РЕЗЕРВОВ_НА_ОПУ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_reserves_recovery', 'Восстановление резервов', 'НЕТТО_ЭФФЕКТ_РЕЗЕРВОВ_НА_ОПУ::ВОССТАНОВЛЕНИЕ_РЕЗЕРВОВ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_reserves_accrual', 'Начисление резервов', 'НЕТТО_ЭФФЕКТ_РЕЗЕРВОВ_НА_ОПУ::НАЧИСЛЕНИЕ_РЕЗЕРВОВ', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- Налог на прибыль
SELECT config.add_kpi_card('card_tax', 'Налог на прибыль', 'НАЛОГ_НА_ПРИБЫЛЬ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_tax_tax', 'Налог на прибыль (статья)', 'НАЛОГ_НА_ПРИБЫЛЬ::НАЛОГ_НА_ПРИБЫЛЬ', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- Доходы от участия в капитале
SELECT config.add_kpi_card('card_equity_income', 'Доходы от участия в капитале', 'ДОХОДЫ_ОТ_УЧАСТИЯ_В_КАПИТАЛЕ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_equity_dividends', 'Дивиденды от резидентов', 'ДОХОДЫ_ОТ_УЧАСТИЯ_В_КАПИТАЛЕ::ДИВИДЕНДЫ_ОТ_РЕЗИДЕНТОВ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_equity_participation', 'Доходы от участия (статья)', 'ДОХОДЫ_ОТ_УЧАСТИЯ_В_КАПИТАЛЕ::ДОХОДЫ_ОТ_УЧАСТИЯ_В_КАПИТАЛЕ', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- Прочие доходы
SELECT config.add_kpi_card('card_other_income', 'Прочие доходы', 'ПРОЧИЕ_ДОХОДЫ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_other_income_item', 'Прочие доходы (статья)', 'ПРОЧИЕ_ДОХОДЫ::ПРОЧИЕ_ДОХОДЫ', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- Прочие расходы
SELECT config.add_kpi_card('card_other_expenses', 'Прочие расходы', 'ПРОЧИЕ_РАСХОДЫ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_other_expenses_operational', 'Прочие операционные расходы', 'ПРОЧИЕ_РАСХОДЫ::ПРОЧИЕ_ОПЕРАЦИОННЫЕ_РАСХОДЫ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_other_expenses_lease_lessor', 'Расходы арендодателя', 'ПРОЧИЕ_РАСХОДЫ::ПРОЧИЕ_РАСХОДЫ_АРЕНДАДАТОРА_ПО_ДОГОВОРАМ_АРЕНДЫ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_other_expenses_lease_lessee', 'Расходы арендатора', 'ПРОЧИЕ_РАСХОДЫ::‭ПРОЧИЕ_РАСХОДЫ_АРЕНДАТОРА_ПО_ДОГОВОРАМ_АРЕНДЫ‬', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_other_expenses_reimbursement', 'Расходы на возмещение', 'ПРОЧИЕ_РАСХОДЫ::ПРОЧИЕ_РАСХОДЫ_НА_ВОЗМЕЩЕНИЕ_КЛИЕНТАМ', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_other_expenses_penalties', 'Штрафы и пени', 'ПРОЧИЕ_РАСХОДЫ::ШТРАФЫ_ПЕНИ', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- 4. Расчётные агрегаты (section_financial_results, currency_rub)
SELECT config.add_kpi_card('card_total_operating_income', 'ЧОД (итого)', 'TOTAL_OPERATING_INCOME', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_operating_profit', 'Операционная прибыль', 'OPERATING_PROFIT', 'currency_rub', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_net_profit', 'Чистая прибыль', 'NET_PROFIT', 'currency_rub', 'main_dashboard', 'section_financial_results');

-- 5. Производные KPI (section_financial_results, percent)
SELECT config.add_kpi_card('card_roa', 'ROA', 'ROA', 'percent', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_roe', 'ROE', 'ROE', 'percent', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_cir', 'CIR', 'CIR', 'percent', 'main_dashboard', 'section_financial_results');
SELECT config.add_kpi_card('card_operating_margin', 'Operating Margin', 'OPERATING_MARGIN', 'percent', 'main_dashboard', 'section_financial_results');

-- Проверка созданных карточек
-- SELECT id, title, data_source_key FROM config.components WHERE component_type = 'card' ORDER BY id;
