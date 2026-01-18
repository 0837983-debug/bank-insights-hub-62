---
title: Upload API
description: Детальное описание API загрузки файлов (XLSX/CSV)
related:
  - /api/endpoints
  - /guides/file-upload
---

# Upload API

Детальное описание API для загрузки файлов (CSV/XLSX) с валидацией и загрузкой в БД.

## Обзор

API загрузки файлов позволяет импортировать данные из CSV или XLSX файлов в базу данных через трехэтапный процесс: STG → ODS → MART.

**Процесс загрузки:**
1. Парсинг файла (CSV или XLSX)
2. Валидация структуры и данных
3. Сохранение в STG (Staging)
4. Трансформация STG → ODS (Operational Data Store)
5. Трансформация ODS → MART (Data Mart)

## Endpoints

### POST /api/upload

Загрузить файл для импорта данных.

#### Параметры запроса

**multipart/form-data:**
- `file` (обязательно, File) - Файл для загрузки (.csv, .xlsx)
- `targetTable` (обязательно, string) - Целевая таблица (`balance`)
- `sheetName` (опционально, string) - Имя листа для XLSX файла

#### Поддерживаемые форматы

**CSV:**
- Разделитель: `;` (точка с запятой)
- Кодировка: UTF-8
- Формат заголовков: первая строка содержит заголовки

**XLSX:**
- Формат: Excel 2007+
- Листы: можно выбрать конкретный лист через `sheetName`
- Заголовки: первая строка содержит заголовки

#### Поддерживаемые таблицы

**`balance`** - Баланс
- Обязательные поля: `month`, `class`, `amount`
- Опциональные поля: `section`, `item`

#### Примеры запросов

**cURL:**
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@balance.csv" \
  -F "targetTable=balance"
```

**JavaScript (fetch):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('targetTable', 'balance');

const response = await fetch('http://localhost:3001/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

**XLSX с выбором листа:**
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@balance.xlsx" \
  -F "targetTable=balance" \
  -F "sheetName=Январь"
```

#### Успешный ответ

**HTTP 200 OK:**
```json
{
  "uploadId": 1,
  "status": "completed",
  "rowsProcessed": 100,
  "rowsSuccessful": 100,
  "rowsFailed": 0,
  "duplicatePeriodsWarning": null
}
```

**Поля ответа:**
- `uploadId` (number) - ID загрузки для отслеживания статуса
- `status` (string) - Статус загрузки: `completed`
- `rowsProcessed` (number) - Количество обработанных строк
- `rowsSuccessful` (number) - Количество успешно загруженных строк
- `rowsFailed` (number) - Количество строк с ошибками
- `duplicatePeriodsWarning` (string, опционально) - Предупреждение о дубликатах периодов

#### Ответ при ошибке валидации

**HTTP 400 Bad Request:**
```json
{
  "uploadId": 1,
  "status": "failed",
  "validationErrors": {
    "examples": [
      {
        "fieldName": "month",
        "errorType": "invalid_date_format",
        "errorMessage": "Неверный формат даты: '2025-01'",
        "row": 5
      },
      {
        "fieldName": "amount",
        "errorType": "invalid_number",
        "errorMessage": "Значение не является числом: 'abc'",
        "row": 12
      }
    ],
    "totalCount": 5
  }
}
```

**Формат ошибок валидации:**
- `examples` (array) - Примеры ошибок (1-2 примера каждой категории)
- `totalCount` (number) - Общее количество ошибок

**Типы ошибок:**
- `missing_headers` - Отсутствуют обязательные заголовки
- `invalid_date_format` - Неверный формат даты
- `invalid_number` - Значение не является числом
- `missing_required_field` - Отсутствует обязательное поле
- `duplicate_record` - Дубликат записи

#### Коды ошибок

- `400` - Ошибка валидации (неверный формат файла, отсутствуют обязательные поля, неверные данные)
- `500` - Ошибка обработки файла (внутренняя ошибка сервера)

### GET /api/upload/:uploadId

Получить статус загрузки по ID.

#### Параметры пути

- `uploadId` (number) - ID загрузки

#### Пример запроса

```bash
GET /api/upload/1
```

#### Успешный ответ

**HTTP 200 OK:**
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
  "updatedAt": "2025-01-17T14:30:25.000Z",
  "rolledBackAt": null,
  "rolledBackBy": null
}
```

**Статусы загрузки:**
- `pending` - Ожидает обработки
- `processing` - В процессе обработки
- `completed` - Успешно завершена
- `failed` - Ошибка обработки
- `rolled_back` - Откачена

#### Коды ошибок

- `400` - Неверный ID загрузки
- `404` - Загрузка не найдена
- `500` - Ошибка получения статуса

### GET /api/upload/:uploadId/sheets

Получить список листов для XLSX файла.

#### Параметры пути

- `uploadId` (number) - ID загрузки

#### Пример запроса

```bash
GET /api/upload/1/sheets
```

#### Успешный ответ

**HTTP 200 OK:**
```json
{
  "uploadId": 1,
  "availableSheets": ["Январь", "Февраль", "Март"],
  "currentSheet": "Январь"
}
```

#### Коды ошибок

- `400` - Файл не является XLSX или неверный ID
- `404` - Загрузка не найдена
- `500` - Ошибка получения списка листов

### POST /api/upload/:uploadId/rollback

Откатить загрузку (удалить загруженные данные из STG, ODS, MART).

#### Параметры пути

- `uploadId` (number) - ID загрузки

#### Параметры запроса (JSON)

- `rolledBackBy` (опционально, string) - Пользователь, выполнивший откат (по умолчанию: "system")

#### Пример запроса

```bash
POST /api/upload/1/rollback
Content-Type: application/json

{
  "rolledBackBy": "admin"
}
```

#### Успешный ответ

**HTTP 200 OK:**
```json
{
  "uploadId": 1,
  "status": "rolled_back",
  "message": "Загрузка успешно откачена"
}
```

**Что происходит при откате:**
1. Удаление данных из `stg.balance_upload` (где `upload_id = uploadId`)
2. Удаление данных из `ods.balance` (помечены `deleted_at`)
3. Удаление данных из `mart.balance` (помечены `deleted_at`)
4. Обновление статуса в `ing.uploads` на `rolled_back`

#### Коды ошибок

- `400` - Загрузка уже была откачена
- `404` - Загрузка не найдена
- `500` - Ошибка отката

### GET /api/uploads

Получить историю загрузок.

#### Query параметры

- `targetTable` (опционально, string) - Фильтр по таблице (`balance`)
- `status` (опционально, string) - Фильтр по статусу (`pending`, `processing`, `completed`, `failed`, `rolled_back`)
- `limit` (опционально, number, по умолчанию 50) - Максимальное количество записей
- `offset` (опционально, number, по умолчанию 0) - Смещение для пагинации

#### Пример запроса

```bash
GET /api/uploads
GET /api/uploads?targetTable=balance&status=completed
GET /api/uploads?limit=100&offset=0
```

#### Успешный ответ

**HTTP 200 OK:**
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
      "updatedAt": "2025-01-17T14:30:25.000Z",
      "rolledBackAt": null,
      "rolledBackBy": null
    }
  ],
  "total": 1
}
```

#### Коды ошибок

- `500` - Ошибка получения истории загрузок

## Процесс загрузки (STG → ODS → MART)

### 1. Сохранение файла

Файл сохраняется локально в `row/processed/{targetTable}/{filename}_{timestamp}`.

### 2. Парсинг файла

**CSV:**
- Чтение файла построчно
- Разделитель: `;`
- Парсинг заголовков из первой строки

**XLSX:**
- Парсинг указанного листа (или первого листа)
- Парсинг заголовков из первой строки
- Преобразование строк в объекты

### 3. Валидация структуры

Проверка наличия обязательных заголовков:
- `balance`: `month`, `class`, `amount`

### 4. Валидация данных

**Проверки:**
- Формат даты (YYYY-MM-DD для `month`)
- Числовые значения (для `amount`)
- Обязательные поля (не пустые)
- Уникальность записей (по period_date + class + section + item)

### 5. Загрузка в STG

Данные загружаются в `stg.{targetTable}_upload` с маппингом полей:
- `month` → `period_date`
- `class` → `class`
- `section` → `section`
- `item` → `item`
- `amount` → `value`

### 6. Трансформация STG → ODS

Данные из STG трансформируются и загружаются в `ods.{targetTable}`:
- Soft delete старых данных за период (установка `deleted_at`)
- Вставка новых данных

### 7. Трансформация ODS → MART

Данные из ODS трансформируются и загружаются в `mart.{targetTable}`:
- Soft delete старых данных за период
- Вставка новых данных с расчетом метрик (ppChange, ytdChange, percentage)

## Валидация

### Структура файла

**Формат CSV:**
```csv
month;class;section;item;amount
2025-01-01;assets;loans;loans_retail;1000000
2025-01-01;assets;cash;cash_total;500000
```

**Формат XLSX:**
Таблица с заголовками в первой строке и данными ниже.

### Обязательные поля (balance)

- `month` (string) - Дата периода в формате YYYY-MM-DD
- `class` (string) - Класс баланса: `assets`, `liabilities`, `equity`
- `amount` (number) - Значение

### Опциональные поля (balance)

- `section` (string) - Раздел баланса
- `item` (string) - Статья баланса

### Правила валидации

1. **Формат даты:** `month` должен быть в формате YYYY-MM-DD
2. **Числовые значения:** `amount` должен быть числом
3. **Обязательные поля:** `month`, `class`, `amount` не могут быть пустыми
4. **Уникальность:** Комбинация `period_date + class + section + item` должна быть уникальна

### Обработка ошибок

**Агрегация ошибок:**
- Возвращается 1-2 примера каждой категории ошибок
- Общее количество ошибок указывается в `totalCount`

**Пример ответа с ошибками:**
```json
{
  "uploadId": 1,
  "status": "failed",
  "validationErrors": {
    "examples": [
      {
        "fieldName": "month",
        "errorType": "invalid_date_format",
        "errorMessage": "Неверный формат даты: '2025-01'",
        "row": 5
      }
    ],
    "totalCount": 10
  }
}
```

## Ограничения

- **Максимальный размер файла:** 50 MB
- **Поддерживаемые форматы:** CSV, XLSX
- **Разделитель CSV:** `;` (точка с запятой)
- **Кодировка:** UTF-8

## См. также

- [Все Endpoints](/api/endpoints) - полный список всех endpoints
- [Руководство по загрузке файлов](/guides/file-upload) - инструкции для пользователей
- [Поток данных](/architecture/data-flow) - описание потока данных при загрузке
