---
title: Поток данных
description: Как данные проходят через систему от БД до UI
related:
  - /architecture/overview
  - /architecture/frontend
  - /architecture/backend
---

# Поток данных

Описание того, как данные проходят через систему от базы данных до пользовательского интерфейса.

## Общий поток

```
Database → Backend Service → API Route → HTTP Response → 
Frontend API Client → React Query → React Component → UI
```

## Детальный поток: KPI метрики

### 1. Инициация запроса

**Frontend:**
```typescript
const { data } = useAllKPIs();
```

**React Query:**
- Проверяет кэш
- Если данных нет или устарели → делает запрос

### 2. HTTP запрос

**API Client (`lib/api.ts`):**
```typescript
fetch('http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs={}')
```

**Request:**
```
GET /api/data?query_id=kpis&component_Id=kpis&parametrs={} HTTP/1.1
Host: localhost:3001
```

### 3. Backend обработка

**Route (`routes/kpiRoutes.ts`):**
- Принимает запрос
- Извлекает query параметры (category, periodDate)
- Вызывает сервис

**Service (`services/mart/kpiService.ts`):**
- Определяет период (latest или указанный)
- SQL запрос к `mart.kpi_metrics`
- **Расчет всех метрик на backend:** ppChange, ytdChange, percentage
- Трансформация данных с готовыми расчетными полями

**SQL запрос:**
```sql
SELECT 
  km.component_id,
  km.value,
  c.title,
  c.description
FROM mart.kpi_metrics km
JOIN config.components c ON km.component_id = c.id
WHERE km.period_date = $1
```

### 4. Формирование ответа

**Service возвращает:**
```typescript
[
  {
    id: "capital",
    title: "Капитал",
    value: 1500000000,
    change: 5.2,
    ytdChange: 12.5,
    ...
  }
]
```

**Route формирует JSON:**
```json
[
  {
    "id": "capital",
    "title": "Капитал",
    "value": 1500000000,
    "change": 5.2,
    "ytdChange": 12.5
  }
]
```

### 5. Frontend получение

**API Client:**
- Получает JSON
- Парсит ответ
- Возвращает данные

**React Query:**
- Кэширует данные
- Обновляет состояние
- Триггерит ре-рендер

### 6. Отображение

**React Component:**
- Получает данные из hook
- Рендерит `KPICard` компоненты
- Отображает в UI

## Детальный поток: Табличные данные

### 1. Инициация

**Frontend:**
```typescript
const { data } = useTableData('financial_results_income', {
  groupBy: 'cfo'
});
```

### 2. HTTP запрос

```
GET /api/table-data/financial_results_income?groupBy=cfo
```

### 3. Backend обработка

**Route:**
- Определяет tableId
- Проверяет маппинг legacy IDs
- Вызывает соответствующий сервис

**Service (`services/mart/balanceService.ts` или аналогичный):**
- SQL запрос к mart таблицам
- Расчет метрик: ppChange, ytdChange, percentage на backend
- Возврат плоских строк с иерархией через поля (class, section, item, sub_item)

**SQL запрос и обработка:**
```sql
SELECT 
  class, section, item, sub_item,
  value, prev_period, prev_year
FROM mart.balance
WHERE period_date = $1
```

**Backend расчеты:**
- `ppChange = (current - previous) / previous`
- `ytdChange = (current - ytdValue) / ytdValue`
- `percentage = value / total`

**Ответ (плоские строки):**
```json
{
  "componentId": "assets_table",
  "rows": [
    {
      "class": "assets",
      "section": "loans",
      "item": "loans_retail",
      "value": 1000000,
      "ppChange": 0.05,
      "ytdChange": 0.12,
      "percentage": 0.8
    }
  ]
}
```

### 4. Frontend обработка

**Component (`transformTableData`):**
- Построение иерархической структуры из плоских данных
- Агрегация групп: суммирование значений, пересчет метрик для групп
- Сортировка по иерархии
- Форматирование через `formatValue()` для отображения

**Важно:** Все расчеты выполняются на backend. Frontend только строит UI структуру и форматирует для отображения. Пересчет метрик для групп - единственное исключение, необходимое для корректной агрегации групп.

## Детальный поток: Layout

### 1. Инициация

**Frontend:**
```typescript
const { data } = useLayout();
```

### 2. HTTP запрос

```
GET /api/data?query_id=layout&component_Id=layout&parametrs={"layout_id":"main_dashboard"}
```

### 3. Backend обработка

**SQL Builder (`services/queryBuilder/builder.ts`):**
- Загрузка конфига из `config.component_queries` по `query_id=layout`
- Построение SQL запроса через view `config.layout_sections_json_view`
- Возврат структуры `{ sections: [...] }`
- Загрузка секций из `config.layouts`
- Загрузка компонентов из `config.components`
- Связывание через `config.layout_component_mapping`
- Построение JSON структуры

**SQL запросы:**
```sql
-- Форматы
SELECT * FROM config.formats WHERE id IN (...);

-- Секции
SELECT * FROM config.layouts WHERE id = $1;

-- Компоненты
SELECT c.* FROM config.components c
JOIN config.layout_component_mapping lcm ON c.id = lcm.component_id
WHERE lcm.layout_id = $1;
```

### 4. Формирование структуры

**Service строит:**
```json
{
  "formats": {
    "currency_rub": { ... }
  },
  "sections": [
    {
      "id": "balance",
      "title": "Баланс",
      "components": [
        {
          "id": "capital_card",
          "type": "card",
          "dataSourceKey": "capital",
          ...
        }
      ]
    }
  ]
}
```

### 5. Frontend использование

**DynamicDashboard:**
- Получает layout
- Итерирует по секциям
- Рендерит компоненты динамически
- Загружает данные для каждого компонента

## Кэширование

### React Query кэш

**Настройки:**
- Layout: 5 минут (production)
- KPIs: 1 минута (production)
- Table Data: 1 минута
- В dev режиме: 0 (всегда свежие данные)

**Преимущества:**
- Меньше запросов к серверу
- Быстрый отклик UI
- Фоновое обновление

### Database кэш

PostgreSQL использует:
- Buffer cache для часто используемых данных
- Query plan cache для оптимизации

## Оптимизация

### 1. Data Mart

Агрегированные данные предварительно рассчитаны:
- Быстрые запросы
- Меньше вычислений на лету

### 2. Индексы

Индексы на часто используемых полях:
- Быстрый поиск
- Оптимизированные JOIN

### 3. Connection Pooling

Переиспользование соединений:
- Меньше overhead
- Эффективное использование ресурсов

## Детальный поток: Загрузка файлов

### 1. Инициация загрузки

**Frontend:**
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('targetTable', 'balance');
const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

### 2. HTTP запрос

**Request:**
```
POST /api/upload HTTP/1.1
Content-Type: multipart/form-data

file: [файл.csv]
targetTable: balance
```

### 3. Backend обработка

**Route (`routes/uploadRoutes.ts`):**
- Принимает файл через multer
- Валидирует параметры (targetTable, sheetName)
- Вызывает сервисы обработки

### 4. Процесс загрузки: STG → ODS → MART

**Этап 1: Сохранение файла**
- **Service (`storageService.ts`):**
  - Сохранение файла в `row/processed/{targetTable}/{filename}_{timestamp}`
  - Создание директорий при необходимости
  - Возврат пути к файлу

**Этап 2: Парсинг файла**
- **Service (`fileParserService.ts`):**
  - Парсинг CSV (разделитель `;`) или XLSX
  - Извлечение заголовков
  - Преобразование в унифицированный формат

**Этап 3: Валидация**
- **Service (`validationService.ts`):**
  - Валидация структуры файла (обязательные заголовки)
  - Валидация типов данных (дата, число)
  - Валидация обязательных полей
  - Проверка уникальности записей
  - Агрегация ошибок (1-2 примера + общее количество)

**Этап 4: Загрузка в STG**
- **Service (`ingestionService.ts`):**
  - Загрузка данных в `stg.{targetTable}_upload`
  - Маппинг полей (month → period_date, amount → value)
  - Связь с `ing.uploads` через `upload_id`

**Этап 5: Трансформация STG → ODS**
- **Service (`ingestionService.ts`):**
  - Soft delete старых данных за период в `ods.{targetTable}`
  - Вставка новых данных из STG
  - Обновление `updated_at`, `deleted_at`

**Этап 6: Трансформация ODS → MART**
- **Service (`ingestionService.ts`):**
  - Soft delete старых данных за период в `mart.{targetTable}`
  - Вставка новых данных из ODS
  - Расчет метрик (ppChange, ytdChange, percentage)
  - Обновление статуса загрузки на `completed`

### 5. Формирование ответа

**Route возвращает:**
```json
{
  "uploadId": 1,
  "status": "completed",
  "rowsProcessed": 100,
  "rowsSuccessful": 100,
  "rowsFailed": 0
}
```

**Frontend:**
- Отображение статуса загрузки
- Показ прогресса (если доступно)
- Отображение ошибок валидации (если есть)

### Схема потока данных при загрузке

```
Файл (CSV/XLSX)
    ↓
Сохранение в row/processed/
    ↓
Парсинг файла
    ↓
Валидация структуры и данных
    ↓
STG (stg.balance_upload)
    ↓
Трансформация
    ↓
ODS (ods.balance) - soft delete старых данных
    ↓
Трансформация
    ↓
MART (mart.balance) - расчет метрик
    ↓
Готовые данные для API
```

## Обработка ошибок

### Backend

- Валидация входных данных
- Try-catch блоки
- Стандартизированные ошибки
- Агрегация ошибок валидации (1-2 примера + общее количество)

### Frontend

- React Query автоматически обрабатывает ошибки
- Отображение fallback UI
- Retry механизм
- Отображение ошибок валидации пользователю

## См. также

- [Общая архитектура](/architecture/overview) - обзор системы
- [Frontend архитектура](/architecture/frontend) - детали frontend
- [Backend архитектура](/architecture/backend) - детали backend
- [Upload API](/api/upload-api) - детальное описание API загрузки
