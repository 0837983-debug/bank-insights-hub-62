---
title: Backend архитектура
description: Архитектура backend части приложения
related:
  - /architecture/overview
  - /architecture/database
  - /architecture/data-flow
---

# Backend архитектура

Backend построен на Node.js с Express, используя TypeScript для типобезопасности.

## Структура приложения

```
backend/
├── src/
│   ├── config/          # Конфигурация
│   │   └── database.ts  # Настройки подключения к БД
│   │
│   ├── routes/          # API routes
│   │   ├── index.ts     # Главный роутер
│   │   ├── kpiRoutes.ts      # KPI endpoints
│   │   └── tableDataRoutes.ts # Table data endpoints
│   │
│   ├── services/        # Бизнес-логика
│   │   ├── config/      # Сервисы для работы с config схемой
│   │   │   └── layoutService.ts
│   │   ├── mart/        # Data Mart сервисы (mart схема)
│   │   │   ├── balanceService.ts
│   │   │   ├── kpiService.ts
│   │   │   ├── base/    # Базовые сервисы
│   │   │   │   ├── periodService.ts
│   │   │   │   ├── calculationService.ts
│   │   │   │   ├── componentService.ts
│   │   │   │   └── rowNameMapper.ts
│   │   │   └── types.ts
│   │   ├── queryBuilder/ # SQL Builder
│   │   │   ├── builder.ts
│   │   │   ├── validator.ts
│   │   │   ├── queryLoader.ts
│   │   │   └── types.ts
│   │   └── upload/      # Сервисы загрузки файлов
│   │       ├── fileParserService.ts
│   │       ├── validationService.ts
│   │       ├── storageService.ts
│   │       ├── ingestionService.ts
│   │       └── rollbackService.ts
│   │
│   ├── middleware/      # Express middleware
│   │   └── errorHandler.ts
│   │
│   ├── migrations/      # SQL миграции
│   │   └── *.sql
│   │
│   ├── scripts/         # Утилитарные скрипты
│   │   └── ...
│   │
│   └── server.ts        # Главный файл сервера
│
└── package.json
```

## Архитектурные слои

### 1. Route Layer (Routes)

[Перейти к разделу "Сервисы" →](#сервисы)

Обработка HTTP запросов и валидация входных данных.

**Основные routes:**

#### `/api/kpis` (kpiRoutes.ts)
- `GET /` - все KPI метрики
- `GET /:id` - конкретная метрика

#### `/api/table-data` (tableDataRoutes.ts)
- `GET /:tableId` - данные таблицы

#### `/api/layout` (index.ts)
- `GET /` - структура layout

**Обязанности:**
- Валидация параметров запроса
- Обработка query параметров
- Вызов соответствующих сервисов
- Формирование HTTP ответов
- Обработка ошибок

### 2. Service Layer

Бизнес-логика и работа с данными.

## Сервисы

### SQL Builder (`services/queryBuilder/`)

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

### Layout Service (`services/config/layoutService.ts`)

Построение layout структуры дашборда из БД.

**Функции:**
- `buildLayoutFromDB(requestedLayoutId?)` - построение полного layout
  - Параметры: `requestedLayoutId` (string, опционально) - ID конкретного layout
  - Если не указан, используется layout с `is_default = TRUE`
  - Возвращает: `{ formats, header?, sections }` - структура layout

**Процесс работы:**
1. Определение целевого layout (по `requestedLayoutId` или default)
2. Загрузка форматов из `config.formats` (только используемые в компонентах)
3. Загрузка секций (контейнеров) из `config.layout_component_mapping` с `parent_component_id IS NULL` и `component_type = 'container'`
4. Загрузка дочерних компонентов для каждой секции
5. Обработка компонентов по типам:
   - **Card** - загрузка полей с иерархией `parent_field_id` для форматов
   - **Table** - загрузка колонок из `config.component_fields` и кнопок (тип `button`)
   - **Chart** - базовая информация
   - **Header** - обрабатывается отдельно как top-level элемент
   - **Button** - обрабатываются как дочерние компоненты таблиц
6. Загрузка header отдельно (не в секциях) с `component_type = 'header'`
7. Формирование JSON структуры с `data_source_key` для всех компонентов

**Особенности:**
- Работа с `config` схемой PostgreSQL
- Динамическое построение структуры дашборда
- Фильтрация неактивных компонентов и форматов (`is_active = TRUE`, `deleted_at IS NULL`)
- Возврат `data_source_key` для компонентов (только если заполнен в БД)
- Header возвращается как отдельное top-level поле `layout.header` (не в секциях)
- Формирование составных ID: `{layoutId}::{sectionId}::{componentId}`
- Поддержка иерархии полей для карточек через `parent_field_id`
- Автоматическое связывание кнопок с таблицами через `parent_component_id`

**Структура возвращаемых данных:**
```typescript
{
  formats: Record<string, Format>;  // Форматы для форматирования значений
  header?: HeaderComponent;         // Header как top-level элемент (опционально)
  sections: Section[];              // Секции с компонентами
}
```

**См. также:** [Layout Architecture](/architecture/layout) - архитектура layout системы

### KPI Service (`services/mart/kpiService.ts`)

Работа с KPI метриками из Data Mart.

**Функции:**
- `getKPIMetrics(category?, periodDate?)` - все метрики с опциональной фильтрацией
  - `category` (string, опционально) - фильтр по категории из `config.components.category`
  - `periodDate` (Date, опционально) - конкретная дата периода (по умолчанию используется максимальная дата из БД)
  - Возвращает: `KPIMetric[]` - массив метрик с расчетными полями
- `getKPIMetricsByCategory(category, periodDate?)` - метрики по категории
  - Обертка над `getKPIMetrics()` с обязательным параметром категории

**Процесс работы:**
1. Получение списка активных карточек из `config.components` (тип `card`)
2. Фильтрация по категории, если указана
3. Получение трех дат периодов (current, previousMonth, previousYear) из `mart.kpi_metrics`
4. Один SQL запрос с CASE WHEN агрегацией для всех периодов
5. Расчет изменений (ppChange, ytdChange) в долях (0-1)
6. Расчет абсолютных изменений (ppChangeAbsolute, ytdChangeAbsolute)

**Особенности:**
- Работа с `mart.kpi_metrics` таблицей
- Расчет изменений (ppChange, ytdChange) на backend в долях (не процентах)
- Все расчетные поля вычисляются на backend, frontend получает готовые значения
- Фильтрация по категориям из `config.components`
- Поддержка периодов (current, previous month, previous year)
- Использует `getPeriodDates()` для определения периодов относительно максимальной даты в БД
- При передаче `periodDate` вычисляет остальные периоды относительно этой даты

**Возвращаемые поля:**
- `id` - ID компонента (component_id)
- `periodDate` - дата периода (YYYY-MM-DD)
- `value` - текущее значение
- `previousValue` - значение предыдущего периода
- `ytdValue` - значение предыдущего года (опционально)
- `ppChange` - изменение относительно предыдущего периода (в долях, 0-1)
- `ppChangeAbsolute` - абсолютное изменение относительно предыдущего периода
- `ytdChange` - изменение YTD (в долях, 0-1, опционально)
- `ytdChangeAbsolute` - абсолютное изменение YTD (опционально)

### Balance Service (`services/mart/balanceService.ts`)

Работа с данными баланса из Data Mart.

**Функции:**
- `getAssets(periodDate?)` - активы баланса
  - `periodDate` (Date, опционально) - конкретная дата периода
  - Возвращает: `TableRowData[]` - массив строк таблицы с расчетными полями
- `getLiabilities(periodDate?)` - обязательства баланса
  - `periodDate` (Date, опционально) - конкретная дата периода
  - Возвращает: `TableRowData[]` - массив строк таблицы с расчетными полями
- `getBalanceKPI(periodDate?)` - KPI метрики баланса
  - Обертка над `getKPIMetricsByCategory("balance", periodDate)`

**Процесс работы:**
1. Определение трех дат периодов из `mart.balance` (для `getAssets`) или `mart.kpi_metrics` (для `getLiabilities`)
2. Построение динамического SQL запроса с UNION ALL для всех периодов
3. Использование DISTINCT ON для дедупликации по `class, section, item, sub_item`
4. Агрегация данных через SUM для каждого периода
5. Расчет изменений (ppChange, ytdChange) в долях (0-1)
6. Расчет процентов (percentage) от общего в долях (0-1)
7. Добавление служебных полей (id, description, sortOrder) через `rowNameMapper`

**Особенности:**
- Работа с `mart.balance` таблицей
- Фильтрация по `class` ('assets' или 'liabilities')
- Агрегация данных по периодам через UNION ALL
- Расчет изменений и процентов на backend
- Поддержка опциональных периодов (previousMonth и previousYear могут быть null)
- Использование `rowNameMapper` для человекочитаемых названий строк
- Формирование `id` из комбинации `class-section-item-sub_item`

**Возвращаемые поля:**
- Основные: `class`, `section`, `item`, `sub_item`, `value`
- Расчетные: `percentage` (в долях), `previousValue`, `ytdValue`, `ppChange` (в долях), `ppChangeAbsolute`, `ytdChange` (в долях), `ytdChangeAbsolute`
- Служебные: `id`, `period_date`, `description`, `sortOrder`

### Base Services (`services/mart/base/`)

Вспомогательные сервисы для работы с данными:

**periodService (`services/mart/base/periodService.ts`):**
- `getPeriodDates()` - получение трех дат периодов из `mart.kpi_metrics`
  - Возвращает: `PeriodDates` с полями `current`, `previousMonth`, `previousYear` (Date | null)
  - Логика: находит максимальную дату в БД, затем максимальные даты предыдущего месяца и года
- `getHeaderDates()` - расчет дат периодов для header относительно `NOW()`
  - Возвращает: `{ periodDate, ppDate, pyDate }` (строки в формате YYYY-MM-DD)
  - Логика: последний день предыдущего месяца от NOW(), затем предыдущий месяц и год от этой даты
- `getLatestPeriodForTable(tableName)` - максимальная дата периода для таблицы MART
  - Поддерживает: `kpi_metrics`, `balance`
- `formatDateForSQL(date)` - форматирование даты в YYYY-MM-DD для SQL запросов
- `getCurrentPeriod()` - текущая дата
- `getPreviousPeriod(date)` - предыдущий месяц от указанной даты

**calculationService (`services/mart/base/calculationService.ts`):**
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

**componentService (`services/mart/base/componentService.ts`):**
- `getComponentById(componentId)` - метаданные компонента из `config.components`
  - Возвращает: `Component | null` с полями: `id`, `componentType`, `title`, `label`, `tooltip`, `icon`, `dataSourceKey`, `category`, `description`
- `getComponentsByType(type)` - компоненты по типу из `config.components`
  - Параметры: `type` - `"card" | "table" | "chart"`
  - Возвращает: `Component[]` - массив компонентов
  - Используется в `kpiService` для получения списка карточек
- `getComponentFields(componentId)` - поля таблицы из `config.component_fields`
  - Возвращает: `ComponentField[]` с полями: `fieldId`, `label`, `fieldType`, `formatId`, `isVisible`, `displayOrder`
  - Используется для построения структуры колонок таблиц

**rowNameMapper (`services/mart/base/rowNameMapper.ts`):**
- `getRowName(rowCode)` - человекочитаемое название для `row_code`
  - Использует хардкодный маппинг (в будущем будет заменен на `config.table_rows`)
- `getRowDescription(rowCode)` - описание для `row_code`
- `getSortOrder(rowCode)` - порядок сортировки на основе паттерна `row_code`
  - Логика: извлекает числовой префикс (i1 -> 1000, i2-1 -> 2001)
- `isRowGroup(rowCode)` - проверка, является ли код группой (без дефисов)
- `getParentId(rowCode)` - извлечение родительского ID (i2-1 -> i2)
- **Примечание:** Временное решение, в будущем будет заменено на данные из `config.table_rows`

### Upload Services (`services/upload/`)

Сервисы для загрузки и обработки файлов.

**fileParserService (`services/upload/fileParserService.ts`):**
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
- **Особенности:**
  - Автоматическое определение типов (числа, даты, строки)
  - Обработка пустых строк и значений
  - Поддержка различных форматов дат
  - Распознавание паттерна даты `YYYY-MM-DD`

**validationService (`services/upload/validationService.ts`):**
- `validateData(rows, targetTable)` - валидация данных перед загрузкой
  - Параметры: `rows` - массив распарсенных строк, `targetTable` - целевая таблица
  - Возвращает: `ValidationResult` с полями `valid`, `errors[]`, `errorCount`
- `checkDuplicatePeriodsInODS(rows, targetTable, mapping)` - проверка дубликатов периодов
  - Проверяет, есть ли уже данные в `ods.balance` за те же периоды
  - Возвращает: массив ошибок, если найдены дубликаты
- `aggregateValidationErrors(errors)` - агрегация ошибок валидации
  - Группирует ошибки по типам и полям
  - Возвращает: объект с агрегированными ошибками
- **Процесс валидации:**
  1. Загрузка маппинга полей из `dict.upload_mappings`
  2. Проверка обязательных полей (`is_required`)
  3. Валидация типов данных (`date`, `varchar`, `numeric`)
  4. Проверка форматов дат (YYYY-MM-DD)
  5. Проверка диапазона дат (не более 10 лет назад, не в будущем)
  6. Проверка числовых значений
  7. Проверка дубликатов периодов в ODS
- **Типы ошибок:**
  - `missing_required_field` - отсутствует обязательное поле
  - `invalid_date_format` - неверный формат даты
  - `invalid_date_range` - дата вне допустимого диапазона
  - `invalid_numeric_value` - неверное числовое значение
  - `invalid_field_type` - неверный тип поля
  - `duplicate_period` - дубликат периода в ODS

**storageService (`services/upload/storageService.ts`):**
- `saveUploadedFile(fileBuffer, originalFilename, targetTable, baseDir?)` - сохранение файла
  - Параметры:
    - `fileBuffer` - содержимое файла (Buffer)
    - `originalFilename` - оригинальное имя файла
    - `targetTable` - целевая таблица (для организации директорий)
    - `baseDir` - базовая директория (по умолчанию `"row/processed"`)
  - Возвращает: `{ filePath, filename }` - полный путь и новое имя файла
- **Особенности:**
  - Генерация имени файла с timestamp для уникальности
  - Автоматическое создание директорий
  - Организация файлов по таблицам: `row/processed/{targetTable}/{filename}`

**ingestionService (`services/upload/ingestionService.ts`):**
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

**rollbackService (`services/upload/rollbackService.ts`):**
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
- `restorePreviousData(uploadId)` - восстановление предыдущих данных (опционально)
  - Восстанавливает данные, которые были помечены удаленными при загрузке

**См. также:** [File Upload API](/api/upload-api) - документация API загрузки файлов

### Formatter (Frontend)

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

### 3. Data Access Layer

Прямые SQL запросы к PostgreSQL через connection pool.

**Подключение:**
```typescript
import { pool } from '../config/database.js';
```

**Паттерны:**
- Параметризованные запросы (защита от SQL injection)
- Connection pooling для эффективности
- Транзакции где необходимо

## Middleware

### Error Handler

Централизованная обработка ошибок.

**Функциональность:**
- Логирование ошибок
- Формирование стандартизированных ответов
- Обработка различных типов ошибок
- Безопасность (не утечка чувствительной информации)

## Data Mart Pattern

### Концепция

Data Mart - схема с агрегированными данными для быстрого чтения.

**Преимущества:**
- Оптимизированные запросы
- Предварительно рассчитанные метрики
- Быстрый доступ к данным
- Разделение чтения и записи

### Структура

```
mart/
├── kpi_metrics          # KPI метрики по периодам
├── financial_results    # Финансовые результаты
└── balance              # Баланс
```

### Заполнение Data Mart

Данные попадают в Data Mart через:
- SQL миграции (начальные данные)
- ETL процессы (регулярное обновление)
- Скрипты загрузки данных

## Обработка запросов

### Типичный flow

1. **HTTP Request** → Route
2. **Route** → Валидация параметров
3. **Route** → Вызов Service
4. **Service** → SQL запрос к БД
5. **Service** → Трансформация данных
6. **Service** → Возврат данных
7. **Route** → Формирование JSON ответа
8. **HTTP Response** → Frontend

### Пример: Получение KPI метрик

```typescript
// Route
router.get("/", async (req, res) => {
  const { category, periodDate } = req.query;
  const metrics = await getKPIMetrics(category, periodDate);
  res.json(metrics);
});

// Service
export async function getKPIMetrics(category?: string, periodDate?: Date) {
  // SQL запрос к mart.kpi_metrics
  // Расчет изменений
  // Возврат данных
}
```

## Безопасность

### SQL Injection Protection

Все запросы используют параметризованные запросы:

```typescript
await pool.query(
  'SELECT * FROM table WHERE id = $1',
  [userId]
);
```

### Input Validation

Валидация на уровне routes:
- Проверка типов параметров
- Валидация форматов (даты, IDs)
- Ограничение размеров

### Error Handling

Безопасная обработка ошибок:
- Не утечка stack traces
- Стандартизированные сообщения
- Логирование для отладки

## Оптимизация

### Connection Pooling

Использование connection pool для эффективного управления соединениями.

### Query Optimization

- Индексы на часто используемых полях
- Оптимизированные JOIN запросы
- Использование Data Mart для агрегированных данных

### Caching

Кэширование на уровне:
- React Query (frontend)
- При необходимости: Redis (backend)

## Миграции

### SQL Migrations

Миграции в папке `src/migrations/`:
- Нумерованные файлы (001_, 002_, ...)
- Последовательное выполнение
- Откат при необходимости

### Выполнение

```bash
npm run migrate
```

## См. также

- [Общая архитектура](/architecture/overview) - обзор системы
- [База данных](/architecture/database) - структура БД
- [Поток данных](/architecture/data-flow) - детальный поток данных
- [SQL Builder](/reference/sql-builder) - документация SQL Builder
- [Component Queries](/reference/component-queries) - конфиги SQL запросов
- [File Upload API](/api/upload-api) - API загрузки файлов
