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

## Upload Endpoints

### `POST /api/upload`

Загрузить файл (CSV или XLSX) для импорта данных в БД.

**Параметры запроса (multipart/form-data):**
- `file` (обязательно) - Файл для загрузки (.csv, .xlsx)
- `targetTable` (обязательно) - Целевая таблица (например: 'balance')
- `sheetName` (опционально) - Имя листа для XLSX файла

**Поддерживаемые форматы:**
- CSV (разделитель `;`)
- XLSX

**Поддерживаемые таблицы:**
- `balance` - Баланс

**Пример:**
```bash
POST /api/upload
Content-Type: multipart/form-data

file: [файл.csv]
targetTable: balance
sheetName: [опционально для XLSX]
```

**Ответ (успех):**
```json
{
  "uploadId": 1,
  "status": "completed",
  "rowsProcessed": 100,
  "rowsSuccessful": 100,
  "rowsFailed": 0
}
```

**Ответ (ошибка валидации):**
```json
{
  "uploadId": 1,
  "status": "failed",
  "validationErrors": {
    "examples": [...],
    "totalCount": 5
  }
}
```

**Коды ошибок:**
- `400` - Ошибка валидации (неверный формат файла, отсутствуют обязательные поля)
- `500` - Ошибка обработки файла

### `GET /api/upload/:uploadId`

Получить статус загрузки по ID.

**Пример:**
```bash
GET /api/upload/1
```

**Ответ:**
```json
{
  "id": 1,
  "filename": "balance_20250117_143022.csv",
  "originalFilename": "balance.csv",
  "fileType": "csv",
  "targetTable": "balance",
  "status": "completed",
  "rowsProcessed": 100,
  "rowsSuccessful": 100,
  "rowsFailed": 0,
  "validationErrors": null,
  "createdAt": "2025-01-17T14:30:22.000Z",
  "updatedAt": "2025-01-17T14:30:25.000Z"
}
```

**Статусы:**
- `pending` - Ожидает обработки
- `processing` - В процессе обработки
- `completed` - Успешно завершена
- `failed` - Ошибка обработки
- `rolled_back` - Откачена

### `GET /api/upload/:uploadId/sheets`

Получить список листов для XLSX файла.

**Пример:**
```bash
GET /api/upload/1/sheets
```

**Ответ:**
```json
{
  "uploadId": 1,
  "availableSheets": ["Январь", "Февраль", "Март"],
  "currentSheet": "Январь"
}
```

**Коды ошибок:**
- `400` - Файл не является XLSX
- `404` - Загрузка не найдена

### `POST /api/upload/:uploadId/rollback`

Откатить загрузку (удалить загруженные данные из STG, ODS, MART).

**Параметры запроса (JSON):**
- `rolledBackBy` (опционально) - Пользователь, выполнивший откат

**Пример:**
```bash
POST /api/upload/1/rollback
Content-Type: application/json

{
  "rolledBackBy": "admin"
}
```

**Ответ:**
```json
{
  "uploadId": 1,
  "status": "rolled_back",
  "message": "Загрузка успешно откачена"
}
```

**Коды ошибок:**
- `400` - Загрузка уже была откачена
- `404` - Загрузка не найдена
- `500` - Ошибка отката

### `GET /api/uploads`

Получить историю загрузок.

**Query параметры:**
- `targetTable` (опционально) - Фильтр по таблице
- `status` (опционально) - Фильтр по статусу (pending, processing, completed, failed, rolled_back)
- `limit` (опционально, по умолчанию 50) - Максимальное количество записей
- `offset` (опционально, по умолчанию 0) - Смещение для пагинации

**Пример:**
```bash
GET /api/uploads
GET /api/uploads?targetTable=balance&status=completed
GET /api/uploads?limit=100&offset=0
```

**Ответ:**
```json
{
  "uploads": [
    {
      "id": 1,
      "filename": "balance_20250117_143022.csv",
      "originalFilename": "balance.csv",
      "fileType": "csv",
      "targetTable": "balance",
      "status": "completed",
      "rowsProcessed": 100,
      "rowsSuccessful": 100,
      "rowsFailed": 0,
      "createdAt": "2025-01-17T14:30:22.000Z",
      "updatedAt": "2025-01-17T14:30:25.000Z"
    }
  ],
  "total": 1
}
```

## Get Data Endpoints

### `GET /api/data`

Единый endpoint для получения данных через SQL Builder.

**Query параметры (обязательные):**
- `query_id` (string) - Идентификатор запроса из `config.component_queries.query_id`
- `component_Id` (string) - Идентификатор компонента (обратите внимание на заглавную I)

**Query параметры (опциональные):**
- `parametrs` (string) - JSON строка с параметрами для подстановки в SQL (обратите внимание на опечатку в названии)

**Пример:**
```bash
GET /api/data?query_id=assets_table&component_Id=assets_table&parametrs={"p1":"2025-08-01","p2":"2025-07-01","p3":"2024-08-01","class":"assets"}
```

**Пример без параметров:**
```bash
GET /api/data?query_id=header_dates&component_Id=header
```

**Ответ:**
```json
{
  "componentId": "assets_table",
  "type": "table",
  "rows": [...]
}
```

**Ограничения:**
- Требуется `wrapJson=true` в конфиге запроса (кроме `header_dates`)
- Если `wrapJson=false`, возвращается ошибка 400
- При отсутствии `query_id` или `component_Id` возвращается ошибка 400
- При невалидном JSON в `parametrs` возвращается ошибка 400

**Специальные случаи:**
- `query_id=header_dates` - обходит SQL Builder, использует `periodService.getHeaderDates()` напрямую
- `query_id=layout` - возвращает структуру `sections` вместо `rows`

---

Подробнее в разделах:
- [Get Data API](/api/get-data) - детальное описание `/api/data` endpoint
- [KPI API](/api/kpi-api)
- [Table Data API](/api/table-data-api)
- [Layout API](/api/layout-api)
- [Upload API](/api/upload-api) - детальное описание API загрузки файлов
