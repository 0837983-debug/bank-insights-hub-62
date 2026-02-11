---
title: Сервисы
---

# Сервисы

## SQL Builder (`services/queryBuilder/`)

Библиотека для построения SQL запросов из JSON-конфигурации.

**Основные функции:**
- `buildQueryFromId(queryId, paramsJson)` - построение SQL по `query_id` из БД
- `buildQuery(config, params, wrapJson?)` - построение SQL из конфига

**Компоненты:**
- `builder.ts` - основная логика построения SQL
- `validator.ts` - валидация JSON-конфигов
- `queryLoader.ts` - загрузка конфигов из `config.component_queries`
- `types.ts` - TypeScript типы для конфигов

**Особенности:**
- Защита от SQL-инъекций через экранирование значений
- Строгая валидация параметров (missing/excess)
- Поддержка `wrapJson` для JSON агрегации
- Работа с одной таблицей (без JOIN)
- Поддержка CASE агрегаций, WHERE условий, GROUP BY, ORDER BY

**См. также:** [SQL Builder документация](/reference/sql-builder) - детальное описание формата конфигов и API

## Универсальный endpoint `/api/data`

Все данные получаются через единый endpoint `/api/data` с использованием SQL Builder. Старые отдельные сервисы (kpiService, layoutService, balanceService) больше не используются напрямую через API.

**Как это работает:**

1. **Frontend** делает запрос к `/api/data?query_id=...&component_Id=...&parametrs=...`
2. **dataRoutes.ts** обрабатывает запрос:
   - Валидирует параметры
   - Вызывает SQL Builder для построения SQL из конфига в БД
   - Выполняет SQL запрос
   - Трансформирует данные (если нужно)
   - Возвращает ответ

3. **SQL Builder** (`services/queryBuilder/`):
   - Загружает конфиг из `config.component_queries` по `query_id`
   - Валидирует параметры
   - Строит SQL с подстановкой значений
   - Возвращает готовый SQL

**Специальные случаи:**
- `query_id=header_dates` - использует SQL Builder для запроса к VIEW `mart.v_p_dates`
- `query_id=layout` - возвращает структуру `sections` вместо `rows`
- `query_id=kpis` - возвращает массив KPIMetric[] напрямую (без обертки)

**См. также:**
- [Get Data API](/api/get-data) - детальное описание `/api/data` endpoint
- [Схема работы /api/data](/api/get-data-schema) - краткая схема со ссылками на сервисы
- [SQL Builder](/reference/sql-builder) - документация SQL Builder
- [Layout Architecture](/architecture/layout) - архитектура layout системы

## layoutService (`services/config/layoutService.ts`)

::: warning Устаревший сервис
Логика перенесена в SQL Builder через view `config.layout_sections_json_view`. Используется только внутренне, не вызывается напрямую через API.
:::

Сервис для построения layout структуры дашборда из БД.

**Функции:**
- `buildLayoutFromDB(requestedLayoutId?)` - построение полного layout
  - Параметры: `requestedLayoutId` (string, опционально) - ID конкретного layout
  - Если не указан, используется layout с `is_default = TRUE`
  - Возвращает: `{ formats, header?, sections }` - структура layout

**Использование:**
- Логика перенесена в SQL Builder через view `config.layout_sections_json_view`
- Layout получается через `/api/data?query_id=layout`

## kpiService (`services/mart/kpiService.ts`)

::: warning Устаревший сервис
Логика перенесена в SQL Builder через конфиг `query_id=kpis`. Используется только внутренне, не вызывается напрямую через API.
:::

Сервис для работы с KPI метриками из Data Mart.

**Использование:**
- KPI метрики получаются через `/api/data?query_id=kpis`
- SQL Builder использует view `mart.kpis_view` для получения данных

## balanceService (`services/mart/balanceService.ts`)

::: warning Устаревший сервис
Логика перенесена в SQL Builder через конфиги `query_id=assets_table`, `query_id=liabilities_table`. Используется только внутренне, не вызывается напрямую через API.
:::

Сервис для работы с данными баланса из Data Mart.

**Использование:**
- Данные баланса получаются через `/api/data?query_id=assets_table` или `/api/data?query_id=liabilities_table`
- SQL Builder использует таблицу `mart.balance` для получения данных


## calculationService (`services/mart/base/calculationService.ts`)

Сервис для математических расчетов (проценты, изменения).

**Функции:**
- `calculateChange(current, previous)` - расчет процентного изменения
  - Возвращает: процент изменения, округленный до 2 знаков (например, 5.25 для 5.25%)
  - Формула: `((current - previous) / previous) * 100`
  - Обработка деления на ноль: возвращает 0
- `calculatePercentage(value, total)` - расчет процента от общего
  - Возвращает: процент, округленный до 4 знаков (например, 51.2345%)
  - Формула: `(value / total) * 100`
- `calculateYTDChange(current, ytdValue)` - расчет YTD изменения
  - Обертка над `calculateChange()`
- `aggregateValues(values)` - суммирование массива значений
- `roundToDecimals(value, decimals)` - округление до указанного количества знаков

**Использование:**
- Используется в `transformKPIData()` для расчетов (если нужно)
- Все функции синхронные, не требуют работы с БД

## componentService (`services/mart/base/componentService.ts`)

Сервис для работы с компонентами из `config.components`.

**Функции:**
- `getComponentById(componentId)` - метаданные компонента из `config.components`
  - Возвращает: `Component | null` с полями: `id`, `componentType`, `title`, `label`, `tooltip`, `icon`, `dataSourceKey`, `category`, `description`
  - Асинхронная функция, работает с БД
- `getComponentsByType(type)` - компоненты по типу из `config.components`
  - Параметры: `type` - `"card" | "table" | "chart"`
  - Возвращает: `Component[]` - массив компонентов
  - Используется в SQL Builder при получении KPI метрик через `/api/data?query_id=kpis` для получения списка карточек
- `getComponentFields(componentId)` - поля таблицы из `config.component_fields`
  - Возвращает: `ComponentField[]` с полями: `fieldId`, `label`, `fieldType`, `formatId`, `isVisible`, `displayOrder`
  - Используется для построения структуры колонок таблиц

**Использование:**
- Используется в SQL Builder для получения метаданных компонентов
- Все функции асинхронные, работают с БД

## rowNameMapper (`services/mart/base/rowNameMapper.ts`)

Сервис для маппинга кодов строк в человекочитаемые названия.

**Функции:**
- `getRowName(rowCode)` - человекочитаемое название для `row_code`
  - Использует хардкодный маппинг (в будущем будет заменен на `config.table_rows`)
- `getRowDescription(rowCode)` - описание для `row_code`
- `getSortOrder(rowCode)` - порядок сортировки на основе паттерна `row_code`
  - Логика: извлекает числовой префикс (i1 -> 1000, i2-1 -> 2001)
- `isRowGroup(rowCode)` - проверка, является ли код группой (без дефисов)
- `getParentId(rowCode)` - извлечение родительского ID (i2-1 -> i2)

**Примечание:** Временное решение, в будущем будет заменено на данные из `config.table_rows`.

**Использование:**
- Используется в `transformTableData()` для добавления `sortOrder` к строкам таблиц
- Все функции синхронные, работают с хардкодным маппингом

## fileParserService (`services/upload/fileParserService.ts`)

Сервис для парсинга файлов (CSV, XLSX).

**Функции:**
- `parseCSV(fileBuffer)` - парсинг CSV файлов
  - Автоопределение разделителя (`;` или `,`)
  - Поддержка BOM для UTF-8
  - Автоматическое преобразование чисел и дат
  - Возвращает: `ParseResult` с полями `headers`, `rows`, `sheetName?`
- `parseXLSX(fileBuffer, sheetName?)` - парсинг XLSX файлов
  - Поддержка выбора листа
  - Возвращает список доступных листов в `availableSheets`
  - Автоматическое преобразование типов данных
  - Возвращает: `ParseResult` с полями `headers`, `rows`, `sheetName`, `availableSheets`
- `parseFile(fileBuffer, fileType, sheetName?)` - универсальный парсер файлов
  - Автоматически определяет тип файла и вызывает соответствующий парсер
  - Поддерживает: `csv`, `xlsx`
- `validateFileStructure(parseResult)` - валидация структуры файла
  - Проверка наличия заголовков
  - Проверка наличия данных
  - Возвращает: `boolean` - валидна ли структура

**Особенности:**
- Автоматическое определение типов (числа, даты, строки)
- Обработка пустых строк и значений
- Поддержка различных форматов дат
- Распознавание паттерна даты `YYYY-MM-DD`
- Поддержка Excel serial dates (автоматическое преобразование)

**Использование:**
- Используется в `uploadRoutes.ts` для парсинга загруженных файлов

## validationService (`services/upload/validationService.ts`)

Сервис для валидации данных при загрузке файлов.

**Функции:**
- `validateData(rows, targetTable)` - валидация данных перед загрузкой
  - Параметры: `rows` - массив распарсенных строк, `targetTable` - целевая таблица
  - Возвращает: `ValidationResult` с полями `valid`, `errors[]`, `errorCount`
- `checkDuplicatePeriodsInODS(periodDates, targetTable)` - проверка дубликатов периодов
  - Проверяет, есть ли уже данные в `ods.balance` за те же периоды
  - Возвращает: массив дат, которые уже существуют в ODS
- `aggregateValidationErrors(errors)` - агрегация ошибок валидации
  - Группирует ошибки по типам и полям
  - Возвращает: объект с агрегированными ошибками (1-2 примера + общее количество)

**Процесс валидации:**
1. Загрузка маппинга полей из `dict.upload_mappings`
2. Проверка обязательных полей (`is_required`)
3. Валидация типов данных (`date`, `varchar`, `numeric`)
4. Проверка форматов дат (YYYY-MM-DD)
5. Проверка диапазона дат (не более 10 лет назад, не в будущем)
6. Проверка числовых значений (min/max из `validation_rules`)
7. Проверка уникальности записей в файле (для `balance`)

**Типы ошибок:**
- `required_missing` - отсутствует обязательное поле
- `invalid_date_format` - неверный формат даты
- `invalid_date_range` - дата вне допустимого диапазона
- `invalid_number` - неверное числовое значение
- `type_mismatch` - несоответствие типа данных
- `value_too_small` - значение меньше минимума
- `value_too_large` - значение больше максимума
- `duplicate_record` - дубликат записи в файле

**Использование:**
- Используется в `uploadRoutes.ts` для валидации данных перед загрузкой в БД

**См. также:** [Загрузка данных и валидация](/guides/file-upload-validation) - полное руководство по валидации

## storageService (`services/upload/storageService.ts`)

Сервис для сохранения загруженных файлов на диск.

**Функции:**
- `saveUploadedFile(fileBuffer, originalFilename, targetTable, baseDir?)` - сохранение файла
  - Параметры:
    - `fileBuffer` - содержимое файла (Buffer)
    - `originalFilename` - оригинальное имя файла
    - `targetTable` - целевая таблица (для организации директорий)
    - `baseDir` - базовая директория (по умолчанию `"row/processed"`)
  - Возвращает: `{ filePath, filename }` - полный путь и новое имя файла

**Особенности:**
- Генерация имени файла с timestamp для уникальности
- Автоматическое создание директорий
- Организация файлов по таблицам: `row/processed/{targetTable}/{filename}`

**Использование:**
- Используется в `uploadRoutes.ts` для сохранения загруженных файлов

## ingestionService (`services/upload/ingestionService.ts`)

Сервис для загрузки данных в БД (STG → ODS → MART).

**Функции:**
- `loadToSTG(uploadId, rows, mapping)` - загрузка данных в STG схему
  - Параметры:
    - `uploadId` - ID загрузки из `ing.uploads`
    - `rows` - массив распарсенных строк
    - `mapping` - маппинг полей из `dict.upload_mappings`
  - Возвращает: количество загруженных строк
  - Загружает в: `stg.balance_upload`
  - **Особенности:** Пропускает строки с невалидными датами
- `transformSTGToODS(uploadId)` - трансформация данных из STG в ODS
  - Параметры: `uploadId` - ID загрузки
  - Возвращает: количество загруженных строк
  - **Процесс:**
    1. Soft delete старых данных за периоды из загрузки в `ods.balance`
    2. Копирование данных из `stg.balance_upload` в `ods.balance`
    3. Обновление `upload_id` и `deleted_at` в ODS
- `transformODSToMART(uploadId)` - трансформация данных из ODS в MART
  - Параметры: `uploadId` - ID загрузки
  - Возвращает: количество загруженных строк
  - **Процесс:**
    1. Удаление старых данных из `mart.balance` за те же периоды
    2. Копирование данных из `ods.balance` в `mart.balance`
    3. Агрегация данных по периодам
- `updateUploadStatus(uploadId, status, errorMessage?)` - обновление статуса загрузки
  - Параметры:
    - `uploadId` - ID загрузки
    - `status` - новый статус (`pending`, `processing`, `completed`, `failed`)
    - `errorMessage` - сообщение об ошибке (опционально)
- `saveValidationErrors(uploadId, errors)` - сохранение ошибок валидации
  - Параметры:
    - `uploadId` - ID загрузки
    - `errors` - массив ошибок валидации
  - Сохраняет ошибки для последующего просмотра через API

**Использование:**
- Используется в `uploadRoutes.ts` для выполнения процесса загрузки STG → ODS → MART

## rollbackService (`services/upload/rollbackService.ts`)

Сервис для отката загрузки файлов.

**Функции:**
- `rollbackUpload(uploadId, rolledBackBy?)` - откат загрузки
  - Параметры:
    - `uploadId` - ID загрузки
    - `rolledBackBy` - пользователь, выполняющий откат (по умолчанию `"system"`)
  - **Процесс:**
    1. Проверка статуса загрузки (не должен быть `rolled_back`)
    2. Удаление данных из `stg.balance_upload`
    3. Soft delete данных из `ods.balance` (установка `deleted_at`)
    4. Удаление данных из `mart.balance` за те же периоды
    5. Обновление статуса загрузки на `rolled_back`

**Использование:**
- Используется в `uploadRoutes.ts` для отката загрузок через API endpoint `/api/upload/:uploadId/rollback`

**См. также:** [File Upload API](/api/upload-api) - документация API загрузки файлов

## Formatter (Frontend)

**Расположение:** `src/lib/formatters.ts`

Утилиты форматирования чисел, валют и процентов на frontend.

**Функции:**
- `initializeFormats(formats)` - инициализация кэша форматов из layout API
- `formatValue(formatId, value)` - форматирование значения по формату

**Особенности:**
- Форматы загружаются из layout API
- Кэширование форматов в памяти
- Поддержка сокращений (K, M, B)
- Поддержка валютных символов и процентов

**См. также:** [Frontend Architecture](/architecture/frontend) - описание форматирования на frontend
