-- 059_update_upload_mappings_allow_negative.sql
-- Убираем ограничение min=0 у numeric-полей для balance/fin_results.
-- Отрицательные значения должны проходить базовую валидацию типов.

UPDATE dict.upload_mappings
SET
  validation_rules = NULLIF(validation_rules - 'min', '{}'::jsonb),
  updated_at = CURRENT_TIMESTAMP
WHERE target_table IN ('balance', 'fin_results')
  AND field_type = 'numeric'
  AND validation_rules ? 'min'
  AND validation_rules->>'min' IN ('0', '0.0');
