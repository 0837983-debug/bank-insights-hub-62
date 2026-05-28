-- Fix assets_table filter mismatch between frontend contract and mart.balance values.
-- Problem: frontend sends class='assets', while mart.balance currently stores tech_class as 'АКТИВЫ'
-- (and target state is 'ASSETS' when mappings are present). This caused empty assets response.

UPDATE config.component_queries
SET
  config_json = jsonb_set(
    jsonb_set(
      config_json,
      '{where}',
      '{
        "op": "and",
        "items": [
          {
            "op": "in",
            "field": "tech_class",
            "value": [":class", "ASSETS", "АКТИВЫ", "assets"]
          },
          {
            "op": "in",
            "field": "period_date",
            "value": [":p1", ":p2", ":p3"]
          }
        ]
      }'::jsonb,
      false
    ),
    '{params,class}',
    '"ASSETS"'::jsonb,
    false
  ),
  updated_at = NOW()
WHERE query_id = 'assets_table'
  AND deleted_at IS NULL;
