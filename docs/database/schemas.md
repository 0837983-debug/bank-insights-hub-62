---
title: Схемы базы данных
description: Детальное описание схем и таблиц базы данных
related:
  - /architecture/database
  - /database/data-marts
  - /database/migrations
---

# Схемы базы данных

Детальное описание всех схем PostgreSQL и их таблиц.

## Схема dashboard

Основные данные дашборда (legacy, постепенно мигрируется в mart).

### Таблицы

#### kpi_categories

Категории KPI метрик.

**Поля:**
- `id` (VARCHAR(50), PK) - Уникальный идентификатор
- `name` (VARCHAR(100)) - Название категории
- `sort_order` (INTEGER) - Порядок сортировки
- `created_at`, `updated_at` (TIMESTAMP) - Временные метки

#### kpi_metrics

KPI метрики (legacy).

**Поля:**
- `id` (VARCHAR(50), PK) - Уникальный идентификатор
- `title` (VARCHAR(200)) - Название метрики
- `value` (VARCHAR(50)) - Значение (строка)
- `subtitle`, `description` (TEXT) - Описание
- `change`, `ytd_change` (DECIMAL(10,2)) - Изменения
- `category_id` (VARCHAR(50), FK) - Ссылка на категорию
- `icon_name` (VARCHAR(100)) - Название иконки
- `sort_order` (INTEGER) - Порядок сортировки

**Индексы:**
- `idx_kpi_metrics_category` - по category_id
- `idx_kpi_metrics_sort` - по sort_order

#### table_data

Табличные данные (legacy).

**Поля:**
- `id` (SERIAL, PK) - Автоинкремент
- `table_id` (VARCHAR(100)) - ID таблицы
- `row_id` (VARCHAR(100)) - ID строки
- `name` (VARCHAR(500)) - Название строки
- `description` (TEXT) - Описание
- `value` (DECIMAL(20,2)) - Значение
- `percentage` (DECIMAL(10,4)) - Процент
- `change` (DECIMAL(10,2)) - Изменение
- `is_group`, `is_total` (BOOLEAN) - Флаги
- `parent_id` (VARCHAR(100)) - Родительская строка
- `sort_order` (INTEGER) - Порядок сортировки

**Индексы:**
- `idx_table_data_table_id` - по table_id
- UNIQUE на (table_id, row_id)

#### chart_data

Данные графиков (JSONB).

**Поля:**
- `id` (SERIAL, PK)
- `chart_id` (VARCHAR(100), UNIQUE) - ID графика
- `data_json` (JSONB) - Данные графика
- `created_at`, `updated_at` (TIMESTAMP)

## Схема config

Метаданные и конфигурация системы.

### Таблицы

#### layouts

Конфигурации layout дашборда.

**Поля:**
- `id` (VARCHAR(100), PK) - Уникальный ID layout
- `name` (VARCHAR(200)) - Название
- `description` (TEXT) - Описание
- `status` (VARCHAR(50)) - Статус: 'draft', 'published', 'archived'
- `is_active` (BOOLEAN) - Активен ли
- `is_default` (BOOLEAN) - По умолчанию
- `category` (VARCHAR(100)) - Категория
- `display_order` (INTEGER) - Порядок отображения
- `settings` (JSONB) - Настройки layout
- `created_by`, `updated_by`, `deleted_by` (VARCHAR(100))
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMP)

**Индексы:**
- `idx_layouts_is_active` - по is_active
- `idx_layouts_is_default` - по is_default
- `idx_layouts_display_order` - по display_order

#### components

Библиотека компонентов.

**Поля:**
- `id` (VARCHAR(200), PK) - Уникальный ID компонента
- `component_type` (VARCHAR(50)) - Тип: 'card', 'table', 'chart', 'filter'
- `title`, `label` (VARCHAR(200)) - Названия
- `tooltip` (VARCHAR(500)) - Подсказка
- `icon` (VARCHAR(200)) - Иконка
- `data_source_key` (VARCHAR(200)) - Ключ источника данных
- `action_type`, `action_target` (VARCHAR) - Действия
- `action_params`, `settings` (JSONB) - Параметры
- `description` (TEXT) - Описание
- `category` (VARCHAR(100)) - Категория
- `is_active` (BOOLEAN) - Активен ли
- Soft delete поля

**Индексы:**
- `idx_components_type` - по component_type
- `idx_components_is_active` - по is_active
- `idx_components_category` - по category

#### layout_component_mapping

Связи layout-компонент (экземпляры компонентов в layout).

**Поля:**
- `id` (SERIAL, PK)
- `layout_id` (VARCHAR(100), FK) - Ссылка на layout
- `component_id` (VARCHAR(200), FK) - Ссылка на компонент
- `instance_id` (VARCHAR(200)) - Уникальный ID экземпляра в layout
- `parent_instance_id` (VARCHAR(200)) - Родительский экземпляр
- `display_order` (INTEGER) - Порядок отображения
- `is_visible` (BOOLEAN) - Видим ли
- Override поля для переопределения свойств компонента
- Soft delete поля

**Индексы:**
- UNIQUE на (layout_id, instance_id)
- `idx_lcm_layout` - по layout_id
- `idx_lcm_component` - по component_id

#### component_fields

Поля компонентов (колонки для таблиц, метрики для карточек).

**Поля:**
- `id` (SERIAL, PK)
- `component_id` (VARCHAR(200), FK) - Ссылка на компонент
- `field_id` (VARCHAR(200)) - ID поля
- `field_type` (VARCHAR(50)) - Тип: 'number', 'percent', 'string', 'date'
- `label` (VARCHAR(200)) - Название
- `description` (TEXT) - Описание
- `data_key` (VARCHAR(200)) - Ключ в источнике данных
- `format_id` (VARCHAR(100), FK) - Ссылка на формат
- `parent_field_id` (VARCHAR(200)) - Родительское поле
- `is_visible`, `is_sortable` (BOOLEAN) - Флаги
- `width`, `align` - Настройки отображения
- `settings` (JSONB) - Дополнительные настройки
- `display_order` (INTEGER) - Порядок
- Soft delete поля

#### formats

Форматы отображения значений.

**Поля:**
- `id` (VARCHAR(100), PK) - ID формата
- `kind` (VARCHAR(50)) - Тип: 'currency', 'percentage', 'number'
- `pattern` (VARCHAR(200)) - Паттерн
- `currency` (VARCHAR(10)) - Валюта
- `prefix_unit_symbol`, `suffix_unit_symbol` (VARCHAR) - Символы
- `minimum_fraction_digits`, `maximum_fraction_digits` (INTEGER) - Знаки после запятой
- `thousand_separator` (BOOLEAN) - Разделитель тысяч
- `multiplier` (DECIMAL) - Множитель
- `shorten` (BOOLEAN) - Сокращение
- `color_rules`, `symbol_rules` (JSONB) - Правила
- Soft delete поля

#### mart_fields

Метаданные полей Data Mart.

**Поля:**
- `id` (SERIAL, PK)
- `field_name` (VARCHAR(100), UNIQUE) - Название поля
- `field_type` (VARCHAR(50)) - Тип: 'hierarchy' или 'analytical'
- `hierarchy_level` (INTEGER) - Уровень иерархии (1-4)
- `category` (VARCHAR(100)) - Категория
- `description` (TEXT) - Описание
- `data_type` (VARCHAR(50)) - Тип данных: 'VARCHAR', 'DECIMAL', 'DATE'
- `max_length`, `is_required`, `is_nullable` - Ограничения
- `metadata` (JSONB) - Дополнительные метаданные
- `is_active` (BOOLEAN) - Активен ли

## Схема mart

Data Mart - агрегированные данные для быстрого доступа.

### Таблицы

#### kpi_metrics

KPI метрики по периодам.

**Поля:**
- `id` (SERIAL, PK)
- `component_id` (VARCHAR(200)) - Ссылка на config.components.id
- `period_date` (DATE) - Дата периода
- `value` (DECIMAL(20,2)) - Значение метрики
- `created_at`, `updated_at` (TIMESTAMP)

**Индексы:**
- UNIQUE на (component_id, period_date)
- `idx_kpi_metrics_component` - по component_id
- `idx_kpi_metrics_date` - по period_date DESC
- `idx_kpi_metrics_component_date` - составной

#### financial_results

Финансовые результаты (P&L).

**Поля:**
- `id` (SERIAL, PK)
- `table_component_id` (VARCHAR(200)) - Ссылка на компонент таблицы
- `row_code` (VARCHAR(100)) - Код строки
- `period_date` (DATE) - Дата периода
- `value` (DECIMAL(20,2)) - Значение

**Иерархия:**
- `report_class` (VARCHAR(50)) - 'income' или 'expense'
- `pl_section` (VARCHAR(100)) - Раздел P&L
- `line_item` (VARCHAR(200)) - Статья
- `sub_line_item` (VARCHAR(200)) - Подстатья

**Аналитические разрезы:**
- `cfo_code` (VARCHAR(100)) - ЦФО
- `product_code`, `product_group` (VARCHAR(100)) - Продукт
- `client_segment` (VARCHAR(100)) - Сегмент клиентов
- `channel` (VARCHAR(100)) - Канал
- `region` (VARCHAR(100)) - Регион
- `project_code` (VARCHAR(100)) - Проект
- `currency_code` (VARCHAR(10)) - Валюта
- `dimensions` (JSONB) - Дополнительные измерения

**Индексы:**
- Множество индексов для оптимизации запросов
- UNIQUE на комбинации полей

#### balance

Баланс (активы и пассивы).

**Поля:**
- `id` (SERIAL, PK)
- `table_component_id` (VARCHAR(200)) - Ссылка на компонент
- `row_code` (VARCHAR(100)) - Код строки
- `period_date` (DATE) - Дата периода
- `value` (DECIMAL(20,2)) - Значение

**Иерархия:**
- `balance_class` (VARCHAR(50)) - 'assets', 'liabilities', 'equity'
- `balance_section` (VARCHAR(100)) - Раздел баланса
- `balance_item` (VARCHAR(200)) - Статья баланса
- `sub_balance_item` (VARCHAR(200)) - Подстатья

**Аналитические разрезы:**
- `client_type`, `client_segment` (VARCHAR) - Клиенты
- `product_code`, `product_group` (VARCHAR) - Продукты
- `region` (VARCHAR) - Регион
- `currency_code` (VARCHAR) - Валюта
- `dimensions` (JSONB) - Дополнительные измерения

**Индексы:**
- Множество индексов для оптимизации

## Другие схемы

### sec

Безопасность: users, roles, sessions, permissions (для будущего использования).

### dict

Справочники: клиенты, счета, типы (для будущего использования).

### stg

Staging: сырые данные, базовая валидация (для будущего использования).

### ods

Operational Data Store: валидированные данные с версионированием (для будущего использования).

### ing

Ingestion: управление загрузкой данных, jobs, uploads, versions (для будущего использования).

### log

Логирование: audit logs, auth attempts, API logs, errors (для будущего использования).

## Связи между схемами

### config → mart

- `config.components.id` → `mart.kpi_metrics.component_id`
- `config.components.id` → `mart.financial_results.table_component_id`
- `config.components.id` → `mart.balance.table_component_id`
- `config.component_fields.format_id` → `config.formats.id`

### dashboard → mart

Постепенная миграция данных из dashboard в mart для лучшей производительности.

## См. также

- [Архитектура БД](/architecture/database) - общая архитектура
- [Data Marts](/database/data-marts) - детали Data Mart
- [Миграции](/database/migrations) - работа с миграциями
