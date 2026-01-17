---
title: Все Endpoints
description: Полный список всех API endpoints
---

# Все API Endpoints

## Layout

### `GET /api/layout`

Получить структуру layout дашборда из базы данных.

**Query параметры:**
- `layout_id` (опционально) - ID конкретного layout

**Пример:**
```bash
GET /api/layout
GET /api/layout?layout_id=main
```

## KPI Endpoints

### `GET /api/kpis`

Получить все KPI метрики.

**Query параметры:**
- `category` (опционально) - Фильтр по категории (например: 'finance', 'balance')
- `periodDate` (опционально) - Дата периода в формате YYYY-MM-DD

**Пример:**
```bash
GET /api/kpis
GET /api/kpis?category=finance
GET /api/kpis?periodDate=2024-01-15
```

### `GET /api/kpis/:id`

Получить конкретную KPI метрику по ID.

**Query параметры:**
- `periodDate` (опционально) - Дата периода в формате YYYY-MM-DD

**Пример:**
```bash
GET /api/kpis/capital
GET /api/kpis/capital?periodDate=2024-01-15
```

## Table Data Endpoints

### `GET /api/table-data/:tableId`

Получить данные таблицы по ID.

**Поддерживаемые tableId:**
- `financial_results_income` - Доходы
- `financial_results_expenses` - Расходы
- `balance_assets` - Активы баланса
- `balance_liabilities` - Обязательства баланса
- `income` - Доходы (legacy)
- `expenses` - Расходы (legacy)

**Query параметры:**
- `groupBy` (опционально) - Группировка (например: 'cfo', 'client_segment', 'fot')
- `periodDate` (опционально) - Дата периода в формате YYYY-MM-DD
- `dateFrom` (опционально) - Начальная дата (для будущего использования)
- `dateTo` (опционально) - Конечная дата (для будущего использования)

**Пример:**
```bash
GET /api/table-data/financial_results_income
GET /api/table-data/financial_results_income?groupBy=cfo
GET /api/table-data/financial_results_income?periodDate=2024-01-15&groupBy=client_segment
```

## Chart Data Endpoints

### `GET /api/chart-data/:chartId`

Получить данные графика по ID.

**Пример:**
```bash
GET /api/chart-data/income-chart
```

---

Подробнее в разделах:
- [KPI API](/api/kpi-api)
- [Table Data API](/api/table-data-api)
- [Layout API](/api/layout-api)
