-- Миграция 027: Создание ODS и MART таблиц для Financial Results
-- Добавляет ods.fin_results и mart.fin_results
-- Дата: 2026-01-30

-- ============================================
-- ТАБЛИЦА ODS.FIN_RESULTS
-- ============================================

-- Таблица: ods.fin_results
-- Основное хранилище загруженных данных Financial Results с аудит-полями
CREATE TABLE IF NOT EXISTS ods.fin_results (
  id SERIAL PRIMARY KEY,
  
  -- Иерархия (из STG)
  class VARCHAR(255) NOT NULL,          -- Название (Уровень 1)
  category VARCHAR(255) NOT NULL,       -- Тип (Уровень 2)
  item VARCHAR(500),                    -- 2уровень (Уровень 3)
  subitem TEXT,                         -- Расшифровка (Уровень 4)
  details TEXT,                         -- Комментарии (Уровень 5)
  
  -- Аналитика
  client_type VARCHAR(100),             -- Ф/Ю
  currency_code CHAR(3),                -- Код валюты
  data_source VARCHAR(50),              -- УК
  
  -- Значения
  value NUMERIC(16,4),                  -- Сумма
  period_date DATE NOT NULL,            -- Период
  
  -- Связь с загрузкой
  upload_id INTEGER REFERENCES ing.uploads(id) ON DELETE SET NULL,
  
  -- Аудит
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(200) DEFAULT 'system',
  updated_by VARCHAR(200),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(200)
);

COMMENT ON TABLE ods.fin_results IS 'Основное хранилище загруженных данных Financial Results (ODS)';
COMMENT ON COLUMN ods.fin_results.class IS 'Название статьи (Уровень 1): ЧПД, ЧКД, и т.д.';
COMMENT ON COLUMN ods.fin_results.category IS 'Тип (Уровень 2): Процентный доход, Процентный расход';
COMMENT ON COLUMN ods.fin_results.item IS '2уровень (Уровень 3): детализация типа';
COMMENT ON COLUMN ods.fin_results.subitem IS 'Расшифровка (Уровень 4): полное описание';
COMMENT ON COLUMN ods.fin_results.details IS 'Комментарии (Уровень 5)';
COMMENT ON COLUMN ods.fin_results.client_type IS 'Ф/Ю: Физ.лица, Юр.лица, Прочее';
COMMENT ON COLUMN ods.fin_results.currency_code IS 'Код валюты: RUB, USD, EUR';
COMMENT ON COLUMN ods.fin_results.data_source IS 'Источник данных: учетные данные / управленческая корректировка';
COMMENT ON COLUMN ods.fin_results.upload_id IS 'Ссылка на загрузку, которая создала эту запись';
COMMENT ON COLUMN ods.fin_results.deleted_at IS 'Мягкое удаление - дата удаления (для возможности отката)';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ods_fin_results_period ON ods.fin_results(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_ods_fin_results_class ON ods.fin_results(class, period_date);
CREATE INDEX IF NOT EXISTS idx_ods_fin_results_upload_id ON ods.fin_results(upload_id);
CREATE INDEX IF NOT EXISTS idx_ods_fin_results_deleted ON ods.fin_results(deleted_at) WHERE deleted_at IS NULL;

-- Уникальный индекс по бизнес-ключу (только активные записи)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ods_fin_results_unique 
ON ods.fin_results(
  period_date, class, category, 
  COALESCE(item, ''), COALESCE(subitem, ''), 
  COALESCE(client_type, ''), COALESCE(currency_code, ''), COALESCE(data_source, '')
) WHERE deleted_at IS NULL;

-- ============================================
-- ТАБЛИЦА MART.FIN_RESULTS
-- ============================================

-- Создание схемы mart если не существует
CREATE SCHEMA IF NOT EXISTS mart;

-- Таблица: mart.fin_results
-- Финальные данные Financial Results для дашборда
CREATE TABLE IF NOT EXISTS mart.fin_results (
  id SERIAL PRIMARY KEY,
  
  -- Для SQL Builder (опционально)
  table_component_id VARCHAR(100) DEFAULT 'fin_results_table',
  row_code VARCHAR(500),                -- Составной код строки
  
  -- Иерархия
  class VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  item VARCHAR(500),
  subitem TEXT,
  details TEXT,
  
  -- Аналитика
  client_type VARCHAR(100),
  currency_code CHAR(3) DEFAULT 'RUB',
  data_source VARCHAR(50),
  
  -- Значения
  value NUMERIC(16,4),
  period_date DATE NOT NULL,
  
  -- Аудит (упрощённый для MART)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE mart.fin_results IS 'Финальные данные Financial Results для дашборда (MART)';
COMMENT ON COLUMN mart.fin_results.table_component_id IS 'ID компонента для SQL Builder';
COMMENT ON COLUMN mart.fin_results.row_code IS 'Составной код строки для идентификации';
COMMENT ON COLUMN mart.fin_results.class IS 'Название статьи (Уровень 1)';
COMMENT ON COLUMN mart.fin_results.category IS 'Тип (Уровень 2)';
COMMENT ON COLUMN mart.fin_results.item IS '2уровень (Уровень 3)';
COMMENT ON COLUMN mart.fin_results.subitem IS 'Расшифровка (Уровень 4)';
COMMENT ON COLUMN mart.fin_results.details IS 'Комментарии (Уровень 5)';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_mart_fin_results_period ON mart.fin_results(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_mart_fin_results_class ON mart.fin_results(class, category);
CREATE INDEX IF NOT EXISTS idx_mart_fin_results_component ON mart.fin_results(table_component_id);

-- Уникальный индекс
CREATE UNIQUE INDEX IF NOT EXISTS uq_mart_fin_results_unique 
ON mart.fin_results(
  period_date, class, category,
  COALESCE(item, ''), COALESCE(subitem, ''),
  COALESCE(client_type, ''), COALESCE(currency_code, ''), COALESCE(data_source, '')
);
