# Миграции базы данных

## ⚠️ Важно

Все старые миграции были заархивированы для создания новой актуальной структуры базы данных.

## Расположение заархивированных миграций

Все старые миграции находятся в: `archive/backend/src/migrations/`

## Список заархивированных миграций

- `001_create_kpi_tables.sql`
- `001_create_schemas.sql`
- `002_insert_initial_data.sql`
- `003_create_config_tables.sql`
- `004_load_layout_data.sql`
- `005_create_formats_table.sql`
- `006_load_formats_data.sql`
- `007_create_config_schema.sql`
- `008_create_config_history_table.sql`
- `009_migrate_layout_data.sql`
- `010_create_mart_tables.sql`
- `011_insert_test_data_mart.sql`
- `012_insert_component_fields_for_cards.sql`
- `013_add_component_fields_metadata.sql`
- `014_remove_sections_except_balance.sql`
- `015_add_assets_table_to_balance.sql`
- `015_remove_unused_formats.sql`

## Восстановление миграций

Если необходимо восстановить старые миграции, используйте инструкцию из `docs/RESTORATION_GUIDE.md`:

1. Проверьте наличие миграции в `docs/unused-files.txt`
2. Восстановите из архива:
   ```bash
   cp archive/backend/src/migrations/[имя_миграции].sql backend/src/migrations/
   ```

## Создание новых миграций

Теперь можно создавать новые актуальные миграции в этой директории, начиная с номера `001_` или используя новую систему нумерации.
