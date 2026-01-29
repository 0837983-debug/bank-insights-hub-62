---
title: Загрузка данных и валидация
description: Полное руководство по загрузке файлов и настройке правил валидации
related:
  - /api/upload-api
  - /architecture/data-flow
---

# Загрузка данных и валидация

Полное руководство по загрузке файлов и настройке правил валидации в системе Bank Insights Hub.

## Обзор

Система загрузки данных поддерживает импорт данных из CSV и XLSX файлов в базу данных через трехэтапный процесс: **STG → ODS → MART**.

**Процесс загрузки:**
1. Парсинг файла (CSV или XLSX)
2. Валидация структуры и данных
3. Сохранение в STG (Staging)
4. Трансформация STG → ODS (Operational Data Store)
5. Трансформация ODS → MART (Data Mart)

## Поддерживаемые форматы файлов

### CSV

**Требования:**
- Разделитель: `;` (точка с запятой) или `,` (запятая) - определяется автоматически
- Кодировка: UTF-8 (с поддержкой BOM)
- Заголовки: первая строка содержит названия колонок
- Пустые строки: автоматически пропускаются

**Пример:**
```csv
month;class;section;item;amount
2025-01-01;assets;loans;loans_retail;1000000
2025-01-01;assets;cash;cash_total;500000
```

### XLSX

**Требования:**
- Формат: Excel 2007+ (.xlsx)
- Листы: можно выбрать конкретный лист через параметр `sheetName`
- Заголовки: первая строка содержит названия колонок
- Даты: поддерживаются Excel serial dates (автоматическое преобразование)

**Особенности:**
- Автоматическое преобразование Excel serial dates в формат YYYY-MM-DD
- Поддержка выбора конкретного листа из файла
- Автоматическое определение типов данных (числа, даты, строки)

## Конфигурация маппинга полей

Маппинг полей настраивается в таблице `dict.upload_mappings`. Эта таблица определяет:
- Какие поля из файла куда маппятся
- Типы данных полей
- Обязательность полей
- Правила валидации

### Структура таблицы `dict.upload_mappings`

```sql
CREATE TABLE dict.upload_mappings (
  id SERIAL PRIMARY KEY,
  target_table VARCHAR(100) NOT NULL,      -- Целевая таблица: balance, и т.д.
  source_field VARCHAR(200) NOT NULL,     -- Поле в исходном файле
  target_field VARCHAR(200) NOT NULL,      -- Поле в целевой таблице
  field_type VARCHAR(50) NOT NULL,          -- Тип поля: date, varchar, numeric
  is_required BOOLEAN DEFAULT FALSE,       -- Обязательное ли поле
  validation_rules JSONB,                  -- Правила валидации (JSON)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Уникальный индекс:** `(target_table, source_field)` - один source_field может маппиться только на один target_field для каждой таблицы.

### Поля таблицы

| Поле | Тип | Описание |
|------|-----|----------|
| `target_table` | VARCHAR(100) | Целевая таблица для загрузки (например: `balance`) |
| `source_field` | VARCHAR(200) | Название колонки в исходном файле (регистр не важен) |
| `target_field` | VARCHAR(200) | Название поля в целевой таблице БД |
| `field_type` | VARCHAR(50) | Тип данных поля (см. [Типы полей](#типы-полей)) |
| `is_required` | BOOLEAN | Обязательное ли поле для заполнения |
| `validation_rules` | JSONB | Правила валидации в формате JSON (см. [Правила валидации](#правила-валидации)) |

## Типы полей

Система поддерживает три типа полей:

### 1. `date` - Дата

**Описание:** Поле для хранения дат.

**Поддерживаемые форматы входных данных:**
- `YYYY-MM-DD` (стандартный формат) - **рекомендуется**
- `DD.MM.YYYY` (российский формат)
- `DD/MM/YYYY` или `MM/DD/YYYY` (международные форматы)
- Excel serial number (число в диапазоне 30000-100000) - автоматически преобразуется

**Валидация:**
- Формат даты проверяется автоматически
- Диапазон дат: не более 10 лет назад и не в будущем (относительно текущей даты)
- Все даты преобразуются в формат `YYYY-MM-DD` для сохранения в БД

**Пример конфигурации:**
```sql
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'month', 'period_date', 'date', TRUE, 
  '{"format": "YYYY-MM-DD"}'::jsonb
);
```

### 2. `numeric` - Число

**Описание:** Поле для хранения числовых значений.

**Поддерживаемые форматы входных данных:**
- Целые числа: `1000`, `-500`
- Десятичные числа: `1000.50`, `-500.25`
- Числа с разделителем тысяч: `1,000.50` (запятая удаляется автоматически)
- Научная нотация: `1.5e3` (преобразуется в `1500`)

**Валидация:**
- Проверка, что значение является числом
- Поддержка правил `min` и `max` в `validation_rules`

**Пример конфигурации:**
```sql
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'amount', 'value', 'numeric', TRUE,
  '{"min": 0}'::jsonb
);
```

### 3. `varchar` - Строка

**Описание:** Поле для хранения текстовых значений.

**Поддерживаемые форматы входных данных:**
- Любые строковые значения
- Пустые строки преобразуются в `NULL` (если поле не обязательное)

**Валидация:**
- Проверка, что значение является строкой
- Обрезка пробелов в начале и конце строки

**Пример конфигурации:**
```sql
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'class', 'class', 'varchar', TRUE, NULL
);
```

## Правила валидации

Правила валидации задаются в поле `validation_rules` в формате JSONB. Поддерживаются следующие опции:

### Для типа `date`

**Доступные правила:**
- `format` (string, опционально) - Ожидаемый формат даты (например: `"YYYY-MM-DD"`). Используется только для документации, фактическая валидация формата выполняется автоматически.

**Пример:**
```json
{
  "format": "YYYY-MM-DD"
}
```

**Примечание:** Валидация формата даты и диапазона выполняется автоматически для всех полей типа `date`, независимо от наличия `validation_rules`.

### Для типа `numeric`

**Доступные правила:**
- `min` (number, опционально) - Минимальное значение (включительно)
- `max` (number, опционально) - Максимальное значение (включительно)

**Примеры:**

Минимальное значение:
```json
{
  "min": 0
}
```

Диапазон значений:
```json
{
  "min": 0,
  "max": 1000000
}
```

Только максимальное значение:
```json
{
  "max": 1000000
}
```

### Для типа `varchar`

**Доступные правила:**
- В настоящее время специальные правила валидации для строк не поддерживаются

**Пример:**
```json
null
```

или просто не указывать `validation_rules` (NULL).

## Типы ошибок валидации

Система возвращает следующие типы ошибок валидации:

### 1. `required_missing` - Отсутствует обязательное поле

**Описание:** Обязательное поле не заполнено или пустое.

**Пример:**
```json
{
  "rowNumber": 5,
  "fieldName": "month",
  "errorType": "required_missing",
  "errorMessage": "Обязательное поле \"month\" не заполнено",
  "fieldValue": null
}
```

### 2. `invalid_date_format` - Неверный формат даты

**Описание:** Дата не соответствует ожидаемому формату или не может быть распознана.

**Пример:**
```json
{
  "rowNumber": 12,
  "fieldName": "month",
  "errorType": "invalid_date_format",
  "errorMessage": "Неверный формат даты. Ожидается YYYY-MM-DD",
  "fieldValue": "2025-01"
}
```

### 3. `invalid_date_range` - Дата вне допустимого диапазона

**Описание:** Дата слишком старая (более 10 лет назад) или в будущем.

**Пример:**
```json
{
  "rowNumber": 8,
  "fieldName": "month",
  "errorType": "invalid_date_range",
  "errorMessage": "Дата вне допустимого диапазона (не более 10 лет назад и не в будущем)",
  "fieldValue": "2010-01-01"
}
```

### 4. `invalid_number` - Неверное числовое значение

**Описание:** Значение не может быть преобразовано в число.

**Пример:**
```json
{
  "rowNumber": 15,
  "fieldName": "amount",
  "errorType": "invalid_number",
  "errorMessage": "Ожидается число, получено: abc",
  "fieldValue": "abc"
}
```

### 5. `type_mismatch` - Несоответствие типа данных

**Описание:** Тип значения не соответствует ожидаемому типу поля.

**Пример:**
```json
{
  "rowNumber": 20,
  "fieldName": "class",
  "errorType": "type_mismatch",
  "errorMessage": "Ожидается строка, получено: number",
  "fieldValue": 123
}
```

### 6. `value_too_small` - Значение меньше минимального

**Описание:** Числовое значение меньше указанного минимума в `validation_rules.min`.

**Пример:**
```json
{
  "rowNumber": 10,
  "fieldName": "amount",
  "errorType": "value_too_small",
  "errorMessage": "Значение меньше минимального (min: 0)",
  "fieldValue": -100
}
```

### 7. `value_too_large` - Значение больше максимального

**Описание:** Числовое значение больше указанного максимума в `validation_rules.max`.

**Пример:**
```json
{
  "rowNumber": 25,
  "fieldName": "amount",
  "errorType": "value_too_large",
  "errorMessage": "Значение больше максимального (max: 1000000)",
  "fieldValue": 2000000
}
```

### 8. `duplicate_record` - Дубликат записи

**Описание:** Запись с такой же комбинацией ключевых полей уже существует в файле.

**Примечание:** Проверка выполняется только для таблицы `balance` по комбинации `period_date + class + section + item`.

**Пример:**
```json
{
  "rowNumber": 30,
  "fieldName": "month",
  "errorType": "duplicate_record",
  "errorMessage": "Дубликат записи (period_date: 2025-01-01, class: assets, section: loans, item: loans_retail)",
  "fieldValue": "2025-01-01|assets|loans|loans_retail"
}
```

## Примеры конфигурации

### Полная конфигурация для таблицы `balance`

```sql
-- Обязательное поле: дата периода
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'month', 'period_date', 'date', TRUE,
  '{"format": "YYYY-MM-DD"}'::jsonb
);

-- Обязательное поле: класс баланса
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'class', 'class', 'varchar', TRUE, NULL
);

-- Опциональное поле: раздел
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'section', 'section', 'varchar', FALSE, NULL
);

-- Опциональное поле: статья
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'item', 'item', 'varchar', FALSE, NULL
);

-- Обязательное поле: значение (только положительные числа)
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'amount', 'value', 'numeric', TRUE,
  '{"min": 0}'::jsonb
);
```

### Пример с диапазоном значений

```sql
-- Поле с ограничением диапазона
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'amount', 'value', 'numeric', TRUE,
  '{"min": 0, "max": 1000000000}'::jsonb
);
```

### Пример с опциональным полем

```sql
-- Опциональное поле с валидацией
INSERT INTO dict.upload_mappings (
  target_table, source_field, target_field, field_type, is_required, validation_rules
) VALUES (
  'balance', 'sub_item', 'sub_item', 'varchar', FALSE, NULL
);
```

## Процесс валидации

Валидация выполняется в следующем порядке:

1. **Парсинг файла**
   - Извлечение заголовков
   - Парсинг строк данных
   - Преобразование типов данных

2. **Проверка структуры файла**
   - Проверка наличия всех обязательных заголовков (регистр не важен)
   - Проверка, что файл не пустой

3. **Валидация каждой строки**
   - Для каждого поля из `dict.upload_mappings`:
     - Проверка обязательности (`is_required`)
     - Валидация типа данных (`field_type`)
     - Валидация правил (`validation_rules`)

4. **Проверка уникальности** (только для `balance`)
   - Проверка дубликатов записей в файле
   - Комбинация: `period_date + class + section + item`

5. **Проверка дубликатов периодов в ODS** (опционально)
   - Проверка, существуют ли уже данные за те же периоды в `ods.balance`
   - Возвращается предупреждение, но не блокирует загрузку

## Агрегация ошибок

Система возвращает агрегированные ошибки валидации:

**Формат ответа:**
```json
{
  "uploadId": 1,
  "status": "failed",
  "validationErrors": {
    "examples": [
      {
        "type": "invalid_date_format",
        "message": "Неверный формат даты. Ожидается YYYY-MM-DD",
        "field": "month"
      },
      {
        "type": "value_too_small",
        "message": "Значение меньше минимального (min: 0)",
        "field": "amount"
      }
    ],
    "totalCount": 15,
    "byType": {
      "invalid_date_format": 5,
      "value_too_small": 10
    }
  }
}
```

**Особенности:**
- Возвращается 1-2 примера каждого типа ошибок
- Указывается общее количество ошибок (`totalCount`)
- Группировка по типам ошибок (`byType`)

## Ограничения

- **Максимальный размер файла:** 50 MB
- **Поддерживаемые форматы:** CSV, XLSX
- **Разделитель CSV:** `;` (точка с запятой) или `,` (запятая) - определяется автоматически
- **Кодировка:** UTF-8
- **Диапазон дат:** не более 10 лет назад и не в будущем
- **Регистр заголовков:** не важен (сравнение без учета регистра)

## Добавление новой таблицы для загрузки

Для добавления поддержки загрузки новой таблицы:

1. **Создайте таблицы в схемах STG, ODS, MART** (если необходимо)

2. **Добавьте маппинги в `dict.upload_mappings`:**
   ```sql
   INSERT INTO dict.upload_mappings (
     target_table, source_field, target_field, field_type, is_required, validation_rules
   ) VALUES
     ('new_table', 'field1', 'target_field1', 'varchar', TRUE, NULL),
     ('new_table', 'field2', 'target_field2', 'numeric', TRUE, '{"min": 0}'::jsonb);
   ```

3. **Обновите код валидации** (если нужна специальная логика):
   - Функция `checkUniqueness()` в `validationService.ts`
   - Функция `checkDuplicatePeriodsInODS()` в `validationService.ts`

4. **Обновите сервисы загрузки:**
   - `ingestionService.ts` - добавьте логику трансформации для новой таблицы

## См. также

- [Upload API](/api/upload-api) - детальное описание API загрузки файлов
- [Поток данных](/architecture/data-flow) - описание потока данных при загрузке
- [Database Schemas](/database/schemas) - структура таблиц БД
