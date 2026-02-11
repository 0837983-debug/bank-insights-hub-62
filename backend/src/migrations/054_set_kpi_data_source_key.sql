-- Миграция 054: Установка data_source_key для KPI карточек
-- Дата: 2026-02-09
-- Задача: J3_QUERY_ID_AND_KPI_MAPPING - Этап 3
--
-- Обновление data_source_key для карточек, чтобы совпадал с kpi_name из mart.v_kpi_all
-- Это позволит JOIN в v_kpi_all работать корректно.

-- =============================================================================
-- Шаг 1: Обновить data_source_key для существующих KPI карточек
-- =============================================================================

-- Капитал
UPDATE config.components 
SET data_source_key = 'КАПИТАЛ', updated_at = NOW()
WHERE id = 'capital_card' AND component_type = 'card';

-- ROA (верхний регистр)
UPDATE config.components 
SET data_source_key = 'ROA', updated_at = NOW()
WHERE id = 'roa_card' AND component_type = 'card';

-- ROE уже корректный, но для уверенности
UPDATE config.components 
SET data_source_key = 'ROE', updated_at = NOW()
WHERE id = 'roe_card' AND component_type = 'card';

-- EBITDA → NET_PROFIT (чистая прибыль)
UPDATE config.components 
SET data_source_key = 'NET_PROFIT', updated_at = NOW()
WHERE id = 'ebitda_card' AND component_type = 'card';

-- Cost-to-Income → CIR
UPDATE config.components 
SET data_source_key = 'CIR', updated_at = NOW()
WHERE id = 'cost_to_income_card' AND component_type = 'card';

-- =============================================================================
-- Шаг 2: Добавить новые KPI карточки (если нужны дополнительные)
-- =============================================================================

-- Активы
INSERT INTO config.components (id, component_type, title, label, data_source_key, is_active, created_at)
VALUES ('assets_card', 'card', 'Активы', 'Активы', 'АКТИВЫ', TRUE, NOW())
ON CONFLICT (id) DO UPDATE SET data_source_key = 'АКТИВЫ', updated_at = NOW();

-- ЧПД (Чистый процентный доход)
INSERT INTO config.components (id, component_type, title, label, data_source_key, is_active, created_at)
VALUES ('nii_card', 'card', 'ЧПД', 'Чистый процентный доход', 'ЧПД', TRUE, NOW())
ON CONFLICT (id) DO UPDATE SET data_source_key = 'ЧПД', updated_at = NOW();

-- ЧОД (Чистый операционный доход)
INSERT INTO config.components (id, component_type, title, label, data_source_key, is_active, created_at)
VALUES ('toi_card', 'card', 'ЧОД', 'Чистый операционный доход', 'TOTAL_OPERATING_INCOME', TRUE, NOW())
ON CONFLICT (id) DO UPDATE SET data_source_key = 'TOTAL_OPERATING_INCOME', updated_at = NOW();

-- Операционная прибыль
INSERT INTO config.components (id, component_type, title, label, data_source_key, is_active, created_at)
VALUES ('op_profit_card', 'card', 'Опер. прибыль', 'Операционная прибыль', 'OPERATING_PROFIT', TRUE, NOW())
ON CONFLICT (id) DO UPDATE SET data_source_key = 'OPERATING_PROFIT', updated_at = NOW();

-- Операционная маржа
INSERT INTO config.components (id, component_type, title, label, data_source_key, is_active, created_at)
VALUES ('op_margin_card', 'card', 'Опер. маржа', 'Операционная маржа', 'OPERATING_MARGIN', TRUE, NOW())
ON CONFLICT (id) DO UPDATE SET data_source_key = 'OPERATING_MARGIN', updated_at = NOW();

-- =============================================================================
-- Проверка
-- =============================================================================
-- SELECT id, title, data_source_key FROM config.components WHERE component_type = 'card' ORDER BY id;
-- SELECT DISTINCT kpi_name, component_id FROM mart.v_kpi_all WHERE component_id IS NOT NULL;
