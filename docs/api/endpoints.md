---
title: Все Endpoints
description: Полный список всех API endpoints
---

# Все API Endpoints

## Layout

### `GET /api/data`

Получить структуру layout дашборда через единый endpoint `/api/data`.

**Query параметры (обязательные):**
- `query_id` (string) - Должен быть `"layout"`
- `component_Id` (string) - Должен быть `"layout"`

**Query параметры (опциональные):**
- `parametrs` (string) - JSON строка с параметрами:
  - `layout_id` (string, опционально) - ID конкретного layout (по умолчанию используется дефолтный layout)

**Пример:**
```bash
GET /api/data?query_id=layout&component_Id=layout&parametrs={"layout_id":"main_dashboard"}
```

**Структура ответа:**
```json
{
  "sections": [
    {
      "id": "formats",
      "formats": {...}
    },
    {
      "id": "header",
      "components": [...]
    },
    {
      "id": "section_balance",
      "components": [...]
    }
  ]
}
```

**Важно:**
- `formats` находятся в секции `id="formats"`: `sections.find(s => s.id === "formats").formats`
- `header` находится в секции `id="header"`: `sections.find(s => s.id === "header").components[0]`
- Контентные секции: `sections.filter(s => s.id !== "formats" && s.id !== "header")`


## KPI Endpoints

### `GET /api/data` (рекомендуется)

Получить все KPI метрики через единый endpoint `/api/data`.

**Query параметры (обязательные):**
- `query_id` (string) - Должен быть `"kpis"`
- `component_Id` (string) - Должен быть `"kpis"`

**Query параметры (опциональные):**
- `parametrs` (string) - JSON строка с параметрами:
  - `category` (string, опционально) - Фильтр по категории (например: 'finance', 'balance')
  - `periodDate` (string, опционально) - Дата периода в формате YYYY-MM-DD

**Пример:**
```bash
GET /api/data?query_id=kpis&component_Id=kpis&parametrs={}
GET /api/data?query_id=kpis&component_Id=kpis&parametrs={"category":"finance"}
GET /api/data?query_id=kpis&component_Id=kpis&parametrs={"periodDate":"2024-01-15"}
```

**Структура ответа:**
```json
[
  {
    "id": "capital",
    "title": "Капитал",
    "value": "1500000000",
    "description": "Собственный капитал банка",
    "change": 5.2,
    "ytdChange": 12.5,
    "category": "balance",
    "categoryId": "balance",
    "iconName": "Landmark",
    "sortOrder": 1
  }
]
```

**Примечание:** Для получения конкретной метрики по ID используйте фильтрацию на клиенте из массива всех метрик.

## Table Data

### `GET /api/table-data/:tableId`

Получить данные таблицы по ID.

**Поддерживаемые tableId:**
- `financial_results_income` - Доходы
- `financial_results_expenses` - Расходы
- `balance_assets` - Активы баланса
- `balance_liabilities` - Обязательства баланса

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

**Единый универсальный endpoint для получения всех данных через SQL Builder.**

SQL Builder строит запросы из конфигов в `config.component_queries` по `query_id`, что позволяет динамически настраивать запросы без изменения кода.

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
- [Get Data API](/api/get-data) - детальное описание `/api/data` endpoint (KPI, Layout, таблицы и все типы данных)
- [Upload API](/api/upload-api) - детальное описание API загрузки файлов
