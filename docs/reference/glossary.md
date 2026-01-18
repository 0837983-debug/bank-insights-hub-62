---
title: Глоссарий
description: Термины и определения используемые в проекте
---

# Глоссарий

Термины и определения, используемые в проекте Bank Insights Hub.

## A

### API (Application Programming Interface)

Интерфейс для взаимодействия между frontend и backend. В проекте это REST API на Express.

## B

### Backend

Серверная часть приложения, построенная на Node.js + Express + TypeScript. Обрабатывает запросы, выполняет расчеты, взаимодействует с БД.

## C

### Component (Компонент)

React компонент для отображения UI. Также - элемент в config.components, определяющий структуру компонента (карточка, таблица, график).

**Типы компонентов:**
- `card` - KPI карточка
- `table` - Таблица данных
- `chart` - График
- `container` - Контейнер (секция)

## D

### Data Mart

Схема PostgreSQL с агрегированными данными для быстрого чтения через API. Содержит предварительно рассчитанные метрики.

**Таблицы:**
- `mart.kpi_metrics` - KPI метрики
- `mart.balance` - Баланс
- `mart.financial_results` - Финансовые результаты

### Dimension (Измерение)

Поле для группировки и фильтрации данных. Например: `client_segment`, `product_code`, `region`.

Определяется через `config.component_fields.is_dimension = true`.

## F

### Frontend

Клиентская часть приложения, построенная на React + TypeScript + Vite. Отображает UI и взаимодействует с API.

### Format (Формат)

Определение формата отображения значений (валюты, проценты, числа). Хранится в `config.formats`.

**Использование:**
- На фронтенде через `formatValue(formatId, value)`
- formatId берется из `layout.formats`

## K

### KPI (Key Performance Indicator)

Ключевой показатель эффективности. Метрика для отображения на дашборде в виде карточки.

Хранится в `mart.kpi_metrics`, связана с `config.components` (component_type='card').

## L

### Layout

Структура дашборда, определяющая какие секции и компоненты отображаются. Хранится в `config.layouts` и связана с компонентами через `config.layout_component_mapping`.

**Структура:**
```json
{
  "formats": { ... },
  "sections": [
    {
      "id": "balance",
      "title": "Баланс",
      "components": [ ... ]
    }
  ]
}
```

## M

### Measure (Метрика)

Поле для агрегации и расчета. Например: `value`, `percentage`. Определяется через `config.component_fields.is_measure = true`.

### MART

Data Mart - схема с агрегированными данными. См. [Data Mart](#data-mart).

## P

### ppChange (Period over Period Change)

Изменение относительно предыдущего периода. Рассчитывается на backend в долях (0.05 = 5%).

**Формула:** `(current - previous) / previous`

### Percentage (Процент)

Процент от общего значения. Рассчитывается на backend в долях (0.8 = 80%).

**Формула:** `value / total`

## S

### Schema (Схема)

Логическое разделение данных в PostgreSQL. В проекте используются схемы:
- `config` - конфигурация
- `mart` - Data Mart
- `dashboard` - legacy данные

### Service (Сервис)

Слой бизнес-логики в backend. Сервисы выполняют расчеты и работают с БД.

**Структура:**
- `services/config/` - для config схемы
- `services/mart/` - для mart схемы

## T

### Table Data (Табличные данные)

Данные для отображения в таблицах. Возвращаются через `/api/table-data/:tableId`.

Backend возвращает плоские строки с иерархией через поля (class, section, item, sub_item).

## Y

### ytdChange (Year To Date Change)

Изменение с начала года. Рассчитывается на backend в долях (0.12 = 12%).

**Формула:** `(current - ytdValue) / ytdValue`

## Сокращения

- **API** - Application Programming Interface
- **KPI** - Key Performance Indicator
- **PPTD** - Period over Period (изменение к предыдущему периоду)
- **YTD** - Year To Date (с начала года)
- **P&L** - Profit & Loss (прибыль и убытки)
- **UI** - User Interface (пользовательский интерфейс)
- **E2E** - End-to-End (сквозное тестирование)
- **CI/CD** - Continuous Integration / Continuous Deployment

## Концепции

### Минимальная обработка данных на фронте

Принцип проекта: все расчеты выполняются на backend, фронтенд только форматирует данные для отображения и строит UI структуру.

**Backend выполняет:**
- Расчет ppChange, ytdChange, percentage
- Агрегация данных из БД

**Frontend выполняет:**
- Форматирование (`formatValue`)
- Построение иерархии из плоских данных (`transformTableData`)
- Пересчет метрик для групп (исключение для агрегации групп)

### Configuration-Driven UI

Структура UI определяется конфигурацией из БД (layout), а не хардкодом в коде.

**Преимущества:**
- Изменения без передеплоя
- Гибкость настройки
- Динамическая структура дашборда

### Data Mart Pattern

Агрегированные данные хранятся в отдельной схеме `mart` для оптимизации чтения.

**Преимущества:**
- Быстрый доступ к данным
- Предварительно рассчитанные метрики
- Разделение чтения и записи

## См. также

- [Архитектура](/architecture/overview) - общая архитектура
- [База данных](/database/schemas) - структура БД
