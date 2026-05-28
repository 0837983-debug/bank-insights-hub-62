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

**Query параметры (`parametrs`, JSON строка):**
- `layout_id` (string) - ID layout, обычно `"main_dashboard"`
- `p1`, `p2`, `p3` (string, даты) - текущий период, предыдущий период и период прошлого года. В рабочем дашборде эти даты берутся из header.

**Пример:**
```bash
GET /api/data?query_id=kpis&component_Id=kpis&parametrs={}
GET /api/data?query_id=kpis&component_Id=kpis&parametrs={"layout_id":"main_dashboard","p1":"2025-12-31","p2":"2025-11-30","p3":"2024-12-31"}
```

**Структура ответа:**
```json
[
  {
    "componentId": "card_capital",
    "value": 1500000000,
    "p2Value": 1425000000,
    "p3Value": 1335000000
  }
]
```

**Примечание:** Для получения конкретной метрики по ID используйте фильтрацию на клиенте из массива всех метрик.

## Table Data

Табличные данные загружаются через единый endpoint `GET /api/data`: `query_id` берётся из `queryId` компонента таблицы или активной кнопки в layout, `component_Id` — из `componentId`.

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
- Требование `wrapJson` определяется конфигом `query_id` в `config.component_queries`
- Если `wrapJson=false`, возвращается ошибка 400
- При отсутствии `query_id` или `component_Id` возвращается ошибка 400
- При невалидном JSON в `parametrs` возвращается ошибка 400

**Конфиги с отдельным форматом ответа:**
- `query_id=header_dates` - SQL Builder-конфиг к VIEW `mart.v_p_dates`, ответ `{ componentId, type: "header", rows }`
- `query_id=layout` - SQL Builder-конфиг, ответ `{ sections }`

---

Подробнее в разделах:
- [Get Data API](/api/get-data) - детальное описание `/api/data` endpoint (KPI, Layout, таблицы и все типы данных)
- [Upload API](/api/upload-api) - детальное описание API загрузки файлов
