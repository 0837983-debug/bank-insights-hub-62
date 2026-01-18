-- Миграция 018: Создание структуры БД для загрузки файлов
-- Создает схемы stg, ods, log, ing и таблицы для загрузки данных
-- Дата: 2025-01-XX

-- ============================================
-- СОЗДАНИЕ СХЕМ
-- ============================================

CREATE SCHEMA IF NOT EXISTS stg;
CREATE SCHEMA IF NOT EXISTS ods;
CREATE SCHEMA IF NOT EXISTS log;
CREATE SCHEMA IF NOT EXISTS ing;
CREATE SCHEMA IF NOT EXISTS dict;

COMMENT ON SCHEMA stg IS 'Схема staging - временное хранилище данных для загрузки файлов';
COMMENT ON SCHEMA ods IS 'Схема operational data store - основное хранилище загруженных данных';
COMMENT ON SCHEMA log IS 'Схема логирования - детальные логи операций';
COMMENT ON SCHEMA ing IS 'Схема ingestion - метаданные загрузок файлов';
COMMENT ON SCHEMA dict IS 'Схема справочников - маппинги и конфигурации';

-- ============================================
-- ТАБЛИЦЫ СХЕМЫ ING (Ingestion)
-- ============================================

-- Таблица: ing.uploads
-- История загрузок файлов
CREATE TABLE IF NOT EXISTS ing.uploads (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  target_table VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  rows_processed INTEGER DEFAULT 0,
  rows_successful INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  validation_errors JSONB,
  created_by VARCHAR(200) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rolled_back_at TIMESTAMP,
  rolled_back_by VARCHAR(200)
);

COMMENT ON TABLE ing.uploads IS 'История загрузок файлов в систему';
COMMENT ON COLUMN ing.uploads.filename IS 'Имя файла после сохранения (с timestamp)';
COMMENT ON COLUMN ing.uploads.original_filename IS 'Оригинальное имя файла при загрузке';
COMMENT ON COLUMN ing.uploads.file_path IS 'Полный путь к сохраненному файлу';
COMMENT ON COLUMN ing.uploads.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN ing.uploads.file_type IS 'Тип файла: csv, xlsx';
COMMENT ON COLUMN ing.uploads.target_table IS 'Целевая таблица для загрузки: balance, и т.д.';
COMMENT ON COLUMN ing.uploads.status IS 'Статус загрузки: pending, processing, completed, failed, rolled_back';
COMMENT ON COLUMN ing.uploads.rows_processed IS 'Количество обработанных строк';
COMMENT ON COLUMN ing.uploads.rows_successful IS 'Количество успешно загруженных строк';
COMMENT ON COLUMN ing.uploads.rows_failed IS 'Количество строк с ошибками';
COMMENT ON COLUMN ing.uploads.validation_errors IS 'Ошибки валидации в формате JSON (1-2 примера + общее количество)';
COMMENT ON COLUMN ing.uploads.rolled_back_at IS 'Дата отката загрузки';
COMMENT ON COLUMN ing.uploads.rolled_back_by IS 'Пользователь, выполнивший откат';

CREATE INDEX IF NOT EXISTS idx_uploads_status ON ing.uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_target_table ON ing.uploads(target_table);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON ing.uploads(created_at DESC);

-- ============================================
-- ТАБЛИЦЫ СХЕМЫ STG (Staging)
-- ============================================

-- Таблица: stg.balance_upload
-- Временное хранилище данных баланса из загруженных файлов
CREATE TABLE IF NOT EXISTS stg.balance_upload (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER NOT NULL REFERENCES ing.uploads(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  class VARCHAR(50) NOT NULL,
  section VARCHAR(100),
  item VARCHAR(200),
  sub_item VARCHAR(200),
  value NUMERIC(20, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(200) DEFAULT 'system'
);

COMMENT ON TABLE stg.balance_upload IS 'Временное хранилище данных баланса из загруженных файлов (staging)';
COMMENT ON COLUMN stg.balance_upload.upload_id IS 'Ссылка на запись о загрузке';
COMMENT ON COLUMN stg.balance_upload.period_date IS 'Дата периода (YYYY-MM-DD)';
COMMENT ON COLUMN stg.balance_upload.class IS 'Класс баланса: assets, liabilities';
COMMENT ON COLUMN stg.balance_upload.section IS 'Раздел баланса';
COMMENT ON COLUMN stg.balance_upload.item IS 'Статья баланса';
COMMENT ON COLUMN stg.balance_upload.sub_item IS 'Подстатья баланса';
COMMENT ON COLUMN stg.balance_upload.value IS 'Значение баланса';

CREATE INDEX IF NOT EXISTS idx_stg_balance_upload_id ON stg.balance_upload(upload_id);
CREATE INDEX IF NOT EXISTS idx_stg_balance_upload_period ON stg.balance_upload(period_date);

-- ============================================
-- ТАБЛИЦЫ СХЕМЫ ODS (Operational Data Store)
-- ============================================

-- Таблица: ods.balance
-- Основное хранилище загруженных данных баланса
CREATE TABLE IF NOT EXISTS ods.balance (
  id SERIAL PRIMARY KEY,
  period_date DATE NOT NULL,
  class VARCHAR(50) NOT NULL,
  section VARCHAR(100),
  item VARCHAR(200),
  sub_item VARCHAR(200),
  value NUMERIC(20, 2) NOT NULL,
  upload_id INTEGER REFERENCES ing.uploads(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(200) DEFAULT 'system',
  updated_by VARCHAR(200),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(200)
);

COMMENT ON TABLE ods.balance IS 'Основное хранилище загруженных данных баланса (ODS)';
COMMENT ON COLUMN ods.balance.period_date IS 'Дата периода (YYYY-MM-DD)';
COMMENT ON COLUMN ods.balance.class IS 'Класс баланса: assets, liabilities';
COMMENT ON COLUMN ods.balance.section IS 'Раздел баланса';
COMMENT ON COLUMN ods.balance.item IS 'Статья баланса';
COMMENT ON COLUMN ods.balance.sub_item IS 'Подстатья баланса';
COMMENT ON COLUMN ods.balance.value IS 'Значение баланса';
COMMENT ON COLUMN ods.balance.upload_id IS 'Ссылка на загрузку, которая создала эту запись';
COMMENT ON COLUMN ods.balance.deleted_at IS 'Мягкое удаление - дата удаления (для возможности отката)';

CREATE INDEX IF NOT EXISTS idx_ods_balance_period ON ods.balance(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_ods_balance_class ON ods.balance(class, period_date);
CREATE INDEX IF NOT EXISTS idx_ods_balance_upload_id ON ods.balance(upload_id);
CREATE INDEX IF NOT EXISTS idx_ods_balance_deleted ON ods.balance(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ods_balance_unique ON ods.balance(period_date, class, section, item, sub_item) WHERE deleted_at IS NULL;

-- ============================================
-- ТАБЛИЦЫ СХЕМЫ DICT (Dictionary)
-- ============================================

-- Таблица: dict.upload_mappings
-- Справочник маппинга полей при загрузке файлов
CREATE TABLE IF NOT EXISTS dict.upload_mappings (
  id SERIAL PRIMARY KEY,
  target_table VARCHAR(100) NOT NULL,
  source_field VARCHAR(200) NOT NULL,
  target_field VARCHAR(200) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  validation_rules JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dict.upload_mappings IS 'Справочник маппинга полей при загрузке файлов';
COMMENT ON COLUMN dict.upload_mappings.target_table IS 'Целевая таблица: balance, и т.д.';
COMMENT ON COLUMN dict.upload_mappings.source_field IS 'Поле в исходном файле: month, class, section, item, amount';
COMMENT ON COLUMN dict.upload_mappings.target_field IS 'Поле в целевой таблице: period_date, class, section, item, value';
COMMENT ON COLUMN dict.upload_mappings.field_type IS 'Тип поля: date, varchar, numeric';
COMMENT ON COLUMN dict.upload_mappings.is_required IS 'Обязательное ли поле для заполнения';
COMMENT ON COLUMN dict.upload_mappings.validation_rules IS 'Правила валидации в формате JSON (например, формат даты, диапазоны значений)';

CREATE UNIQUE INDEX IF NOT EXISTS uq_upload_mappings_table_field ON dict.upload_mappings(target_table, source_field);

-- Инициализация маппингов для balance
INSERT INTO dict.upload_mappings (target_table, source_field, target_field, field_type, is_required, validation_rules)
VALUES 
  ('balance', 'month', 'period_date', 'date', TRUE, '{"format": "YYYY-MM-DD"}'::jsonb),
  ('balance', 'class', 'class', 'varchar', TRUE, NULL),
  ('balance', 'section', 'section', 'varchar', FALSE, NULL),
  ('balance', 'item', 'item', 'varchar', FALSE, NULL),
  ('balance', 'amount', 'value', 'numeric', TRUE, '{"min": 0}'::jsonb)
ON CONFLICT (target_table, source_field) DO NOTHING;

-- ============================================
-- ТАБЛИЦЫ СХЕМЫ LOG (Logging)
-- ============================================

-- Таблица: log.upload_errors
-- Детальное логирование ошибок при загрузке файлов
CREATE TABLE IF NOT EXISTS log.upload_errors (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER NOT NULL REFERENCES ing.uploads(id) ON DELETE CASCADE,
  row_number INTEGER,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  field_name VARCHAR(200),
  field_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE log.upload_errors IS 'Детальное логирование ошибок при загрузке файлов';
COMMENT ON COLUMN log.upload_errors.upload_id IS 'Ссылка на загрузку';
COMMENT ON COLUMN log.upload_errors.row_number IS 'Номер строки в файле с ошибкой';
COMMENT ON COLUMN log.upload_errors.error_type IS 'Тип ошибки: validation, type_mismatch, required_missing, и т.д.';
COMMENT ON COLUMN log.upload_errors.error_message IS 'Описание ошибки';
COMMENT ON COLUMN log.upload_errors.field_name IS 'Название поля с ошибкой';
COMMENT ON COLUMN log.upload_errors.field_value IS 'Значение поля, вызвавшее ошибку';

CREATE INDEX IF NOT EXISTS idx_upload_errors_upload_id ON log.upload_errors(upload_id);
CREATE INDEX IF NOT EXISTS idx_upload_errors_type ON log.upload_errors(error_type);
