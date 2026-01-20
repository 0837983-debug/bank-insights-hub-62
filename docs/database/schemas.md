---
title: Схемы базы данных
description: Детальное описание схем PostgreSQL и их таблиц
related:
  - /database/data-marts
  - /database/migrations
  - /architecture/database
---

# Схемы базы данных

Детальное описание всех схем PostgreSQL и их таблиц.

## Обзор схем

Проект использует три основные схемы:

- `config` - конфигурация и метаданные
- `mart` - Data Mart для агрегированных данных
- `dashboard` - legacy схема (постепенно заменяется mart)

## Схема config

Метаданные и конфигурация системы для динамического построения UI.

### config.formats

Определения форматов для форматирования чисел, валют и процентов.

**Назначение:** Централизованное управление форматированием всех числовых значений.

**Ключевые поля:**
- `id` (VARCHAR(100), PK) - Идентификатор формата (например, 'currency_rub', 'percent')
- `kind` (VARCHAR(50)) - Тип: 'number', 'currency', 'percent'
- `prefix_unit_symbol` (VARCHAR(20)) - Префикс (например, '₽')
- `suffix_unit_symbol` (VARCHAR(50)) - Суффикс (например, '%')
- `minimum_fraction_digits` (INTEGER) - Минимум знаков после запятой
- `maximum_fraction_digits` (INTEGER) - Максимум знаков после запятой
- `thousand_separator` (BOOLEAN) - Разделитель тысяч
- `shorten` (BOOLEAN) - Сокращение (K, M, B)
- `multiplier` (NUMERIC) - Множитель для значения

**Примеры:**
- `currency_rub` - рубли с сокращением (₽8.2B)
- `percent` - проценты (78.5%)

**Использование:** На фронтенде через `formatValue(formatId, value)` в `lib/formatters.ts`.

### config.layouts

Реестр структур дашбордов.

**Назначение:** Управление версиями и вариантами layout.

**Ключевые поля:**
- `id` (VARCHAR(100), PK) - Идентификатор layout
- `name` (VARCHAR(200)) - Название layout
- `is_active` (BOOLEAN) - Активен ли layout
- `is_default` (BOOLEAN) - Layout по умолчанию
- `display_order` (INTEGER) - Порядок отображения

**Использование:** В `layoutService.ts` для выбора layout по умолчанию.

### config.components

Глобальная библиотека компонентов дашборда.

**Назначение:** Хранение определений всех компонентов (карточки, таблицы, графики, header).

**Ключевые поля:**
- `id` (VARCHAR(200), PK) - Идентификатор компонента
- `component_type` (VARCHAR(50)) - Тип: 'card', 'table', 'chart', 'container', 'header'
- `title` (VARCHAR(200)) - Заголовок компонента
- `data_source_key` (VARCHAR(200)) - Ключ источника данных (ссылка на `config.component_queries.query_id`)
- `category` (VARCHAR(100)) - Категория (для фильтрации)
- `icon` (VARCHAR(200)) - Название иконки

**data_source_key:**
- Связывает компонент с запросом в `config.component_queries`
- Используется для получения данных через endpoint `/api/data` с `query_id = data_source_key`
- Пример: `header` компонент имеет `data_source_key = 'header_dates'` для получения дат периодов

**Примеры компонентов:**
- `header` - компонент header с `data_source_key = 'header_dates'` для получения дат периодов
- `assets_table` - таблица активов с `data_source_key = 'assets_table'`
- `capital_card` - карточка капитала (без `data_source_key`, использует KPI API)

**Использование:** В `layoutService.ts` и `kpiService.ts` для получения метаданных компонентов. Компоненты с `data_source_key` получают данные через `/api/data` endpoint.

### config.layout_component_mapping

Связи между layouts и components.

**Назначение:** Определение какие компоненты используются в каком layout.

**Ключевые поля:**
- `id` (INTEGER, PK) - ID связи
- `layout_id` (VARCHAR(100), FK) - Ссылка на config.layouts
- `component_id` (VARCHAR(200), FK) - Ссылка на config.components
- `parent_component_id` (VARCHAR(200)) - Родительский компонент (для иерархии)
- `display_order` (INTEGER) - Порядок отображения
- `is_visible` (BOOLEAN) - Видимость компонента

**Использование:** В `layoutService.ts` для построения структуры layout.

### config.component_fields

Поля компонентов (колонки таблиц, метрики карточек).

**Назначение:** Определение структуры данных компонента.

**Ключевые поля:**
- `id` (INTEGER, PK) - ID поля
- `component_id` (VARCHAR(200), FK) - Ссылка на config.components
- `field_id` (VARCHAR(200)) - Идентификатор поля (например, 'value', 'change_pptd')
- `field_type` (VARCHAR(50)) - Тип: 'number', 'percent', 'string', 'date'
- `label` (VARCHAR(200)) - Метка для отображения
- `format_id` (VARCHAR(100), FK) - Ссылка на config.formats
- `is_dimension` (BOOLEAN) - Является ли измерением (dimension)
- `is_measure` (BOOLEAN) - Является ли метрикой (measure)
- `is_groupable` (BOOLEAN) - Можно ли группировать по полю

**Использование:** В `layoutService.ts` для построения структуры колонок таблиц и форматов карточек.

## Схема mart

Data Mart - агрегированные данные для быстрого чтения через API.

### mart.kpi_metrics

KPI метрики по периодам.

**Назначение:** Универсальная таблица для всех KPI метрик (карточек).

**Ключевые поля:**
- `id` (INTEGER, PK) - ID записи
- `component_id` (VARCHAR(200)) - Ссылка на config.components.id (component_type='card')
- `period_date` (DATE) - Дата периода
- `value` (NUMERIC(18,6)) - Значение метрики

**Индексы:**
- Уникальный индекс на (component_id, period_date)
- Индекс на period_date для быстрого поиска по датам

**Использование:** В `kpiService.ts` для получения KPI метрик с расчетом изменений.

### mart.balance

Данные баланса с иерархией статей.

**Назначение:** Хранение данных баланса (активы, пассивы, капитал).

**Иерархические поля (что учитываем):**
- `class` (VARCHAR(50)) - Класс: 'assets', 'liabilities', 'equity'
- `section` (VARCHAR(100)) - Раздел баланса
- `item` (VARCHAR(200)) - Статья баланса
- `sub_item` (VARCHAR(200)) - Подстатья

**Аналитические разрезы (как анализируем):**
- `client_type` (VARCHAR(50)) - Тип клиента
- `client_segment` (VARCHAR(100)) - Сегмент клиента
- `product_code` (VARCHAR(100)) - Код продукта
- `portfolio_code` (VARCHAR(100)) - Код портфеля
- `currency_code` (VARCHAR(10)) - Код валюты
- `maturity_bucket` (VARCHAR(50)) - Срок погашения
- `interest_type` (VARCHAR(50)) - Тип процентов
- `collateral_type` (VARCHAR(100)) - Тип обеспечения
- `risk_class` (VARCHAR(50)) - Класс риска
- `org_unit_code` (VARCHAR(100)) - Код подразделения
- `region` (VARCHAR(100)) - Регион

**Основные поля:**
- `table_component_id` (VARCHAR(200)) - Ссылка на config.components.id
- `row_code` (VARCHAR(100)) - Код строки
- `period_date` (DATE) - Дата периода
- `value` (NUMERIC(20,2)) - Значение

**Индексы:**
- Составной уникальный индекс на всех полях для дедупликации
- Индексы на часто используемых полях для фильтрации

**Использование:** В `balanceService.ts` для получения активов и обязательств с расчетом метрик.

### mart.financial_results

Финансовые результаты (P&L).

**Назначение:** Хранение данных финансовых результатов (доходы, расходы).

**Иерархические поля:**
- `report_class` (VARCHAR(50)) - Класс: 'income', 'expense'
- `pl_section` (VARCHAR(100)) - Раздел P&L
- `line_item` (VARCHAR(200)) - Статья (Line item)
- `sub_line_item` (VARCHAR(200)) - Подстатья

**Аналитические разрезы:**
- `cfo_code` (VARCHAR(100)) - Код ЦФО
- `product_code` (VARCHAR(100)) - Код продукта
- `client_segment` (VARCHAR(100)) - Сегмент клиента
- `channel` (VARCHAR(100)) - Канал
- `region` (VARCHAR(100)) - Регион
- `project_code` (VARCHAR(100)) - Код проекта

**Основные поля:**
- `table_component_id` (VARCHAR(200)) - Ссылка на config.components.id
- `row_code` (VARCHAR(100)) - Код строки
- `period_date` (DATE) - Дата периода
- `value` (NUMERIC(20,2)) - Значение

**Использование:** В `financialResultsService.ts` для получения доходов и расходов.

## Схема dashboard

Legacy схема (постепенно заменяется mart).

**Таблицы:**
- `kpi_categories` - Категории KPI (legacy)
- `kpi_metrics` - KPI метрики (legacy)
- `table_data` - Табличные данные (legacy)

**Назначение:** Хранение старых данных для обратной совместимости.

## Связи между схемами

### config ↔ mart

- `config.components.id` → `mart.kpi_metrics.component_id` (для карточек)
- `config.components.id` → `mart.balance.table_component_id` (для таблиц)
- `config.component_fields.format_id` → `config.formats.id` (для форматов)

### Индексы

Все таблицы имеют индексы для оптимизации:
- По внешним ключам
- По часто используемым полям для фильтрации
- По датам для временных запросов
- Составные индексы для частых комбинаций полей

## См. также

- [Data Marts](/database/data-marts) - детали Data Mart структуры
- [Миграции](/database/migrations) - работа с миграциями
- [Архитектура БД](/architecture/database) - общая архитектура базы данных
