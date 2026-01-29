-- Миграция 026: Создание таблицы для загрузки Financial Results
-- Добавляет stg.fin_results_upload и маппинги в dict.upload_mappings
-- Дата: 2026-01-29

-- ============================================
-- ТАБЛИЦА STG.FIN_RESULTS_UPLOAD
-- ============================================

-- Таблица: stg.fin_results_upload
CREATE TABLE IF NOT EXISTS stg.fin_results_upload (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER NOT NULL REFERENCES ing.uploads(id) ON DELETE CASCADE,
  
  -- Иерархия (аналогично balance)
  class VARCHAR(255) NOT NULL,          -- Название (Уровень 1)
  category VARCHAR(255) NOT NULL,       -- Тип (Уровень 2)
  item VARCHAR(500),                    -- 2уровень (Уровень 3)
  subitem TEXT,                         -- Расшифровка (Уровень 4)
  details TEXT,                         -- Комментарии (Уровень 5)
  
  -- Аналитика
  client_type VARCHAR(100),             -- Ф/Ю
  currency_code CHAR(3),                -- Код валюты
  data_source VARCHAR(50),              -- УК (источник: учетные данные / корректировка)
  
  -- Значения
  value NUMERIC(16,4),                  -- Сумма
  period_date DATE NOT NULL,            -- Месяц
  
  -- Аудит
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE stg.fin_results_upload IS 'Staging: данные Financial Results из загруженных файлов';
COMMENT ON COLUMN stg.fin_results_upload.class IS 'Название статьи (Уровень 1): ЧПД, ЧКД, и т.д.';
COMMENT ON COLUMN stg.fin_results_upload.category IS 'Тип (Уровень 2): Процентный доход, Процентный расход';
COMMENT ON COLUMN stg.fin_results_upload.item IS '2уровень (Уровень 3): детализация типа';
COMMENT ON COLUMN stg.fin_results_upload.subitem IS 'Расшифровка (Уровень 4): полное описание';
COMMENT ON COLUMN stg.fin_results_upload.details IS 'Комментарии (Уровень 5)';
COMMENT ON COLUMN stg.fin_results_upload.client_type IS 'Ф/Ю: Физ.лица, Юр.лица, Прочее';
COMMENT ON COLUMN stg.fin_results_upload.currency_code IS 'Код валюты: RUB, USD, EUR';
COMMENT ON COLUMN stg.fin_results_upload.data_source IS 'Источник данных: учетные данные / управленческая корректировка';

CREATE INDEX IF NOT EXISTS idx_stg_fin_results_upload_id ON stg.fin_results_upload(upload_id);
CREATE INDEX IF NOT EXISTS idx_stg_fin_results_period ON stg.fin_results_upload(period_date);

-- ============================================
-- МАППИНГ ДЛЯ FIN_RESULTS
-- ============================================

INSERT INTO dict.upload_mappings (target_table, source_field, target_field, field_type, is_required, validation_rules)
VALUES 
  ('fin_results', 'Название', 'class', 'varchar', TRUE, NULL),
  ('fin_results', 'Тип', 'category', 'varchar', TRUE, NULL),
  ('fin_results', '2уровень', 'item', 'varchar', FALSE, NULL),
  ('fin_results', 'Расшифровка', 'subitem', 'varchar', FALSE, NULL),
  ('fin_results', 'Комментарии', 'details', 'varchar', FALSE, NULL),
  ('fin_results', 'Ф/Ю', 'client_type', 'varchar', FALSE, NULL),
  ('fin_results', 'Код валюты', 'currency_code', 'varchar', FALSE, '{"maxLength": 3}'::jsonb),
  ('fin_results', 'УК', 'data_source', 'varchar', FALSE, NULL),
  ('fin_results', 'Сумма', 'value', 'numeric', TRUE, NULL),
  ('fin_results', 'Месяц', 'period_date', 'date', TRUE, '{"format": "YYYY-MM-DD"}'::jsonb)
ON CONFLICT (target_table, source_field) DO NOTHING;
