# Миграции базы данных

## ⚠️ Важно

Все миграции были заархивированы для создания новой актуальной структуры базы данных.

## Расположение заархивированных миграций

Все миграции находятся в: `archive/backend/src/migrations/`

## Полный список заархивированных миграций

Полный список всех миграций с путями и описаниями находится в:
**`archive/backend/src/migrations/MIGRATIONS_LIST.txt`**

### Краткий список миграций (19 файлов):

1. `001_create_schemas.sql` - Создание базовых схем
2. `001_create_kpi_tables.sql` - Создание таблиц KPI
3. `002_insert_initial_data.sql` - Начальные данные
4. `003_create_config_tables.sql` - Таблицы конфигурации
5. `004_load_layout_data.sql` - Загрузка layout данных
6. `005_create_formats_table.sql` - Таблица форматов
7. `006_load_formats_data.sql` - Загрузка форматов
8. `007_create_config_schema.sql` - Схема config
9. `008_create_config_history_table.sql` - История конфигурации
10. `009_migrate_layout_data.sql` - Миграция layout
11. `010_create_mart_tables.sql` - Таблицы Data Mart
12. `011_insert_test_data_mart.sql` - Тестовые данные Mart
13. `012_insert_component_fields_for_cards.sql` - Поля компонентов для карточек
14. `013_add_component_fields_metadata.sql` - Метаданные полей
15. `014_remove_sections_except_balance.sql` - Удаление секций
16. `015_add_assets_table_to_balance.sql` - Таблица assets
17. `015_remove_unused_formats.sql` - Удаление форматов
18. `016_add_comments_to_config_tables.sql` - Комментарии к таблицам
19. `017_remove_instance_id_add_parent_component_id.sql` - Изменение структуры

## Восстановление миграций

Если необходимо восстановить миграции из архива:

1. Откройте `archive/backend/src/migrations/MIGRATIONS_LIST.txt` для просмотра полного списка с путями
2. Восстановите нужную миграцию:
   ```bash
   cp archive/backend/src/migrations/[номер]_[название].sql backend/src/migrations/
   ```
3. Подробная инструкция: `docs/RESTORATION_GUIDE.md`

## Создание новых миграций

Теперь можно создавать новые актуальные миграции в этой директории, начиная с номера `001_` или используя новую систему нумерации.
