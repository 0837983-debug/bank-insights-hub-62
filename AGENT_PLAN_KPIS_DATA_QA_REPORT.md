# Отчет: QA — KPI через `/api/data`

**Дата:** 2026-01-20
**Статус:** ⚠️ Обнаружена ошибка SQL

## Выполненные задачи

### 1. Проверка старого endpoint `/api/kpis` ✅
- ✅ Endpoint работает корректно
- ✅ Возвращает массив из 3 элементов
- ✅ Структура данных: `{ id, periodDate, value, previousValue, ytdValue, ppChange, ppChangeAbsolute, ytdChange, ytdChangeAbsolute }`

### 2. Проверка нового endpoint `/api/data?query_id=kpis` ❌

**Обнаружена ошибка SQL:**
```
SQL execution error: column "kpis_view.component_id" must appear in the GROUP BY clause or be used in an aggregate function
```

**Причина:**
- В конфиге `kpis` (миграция `025_create_kpis_view.sql`) поле `component_id` используется в SELECT с алиасом `as: "component_id"`, но в `group_by` указано только `["component_id"]`
- SQL Builder генерирует запрос с `SELECT component_id AS component_id`, но GROUP BY должен использовать исходное имя поля из view

**Детали:**
- Конфиг находится в `backend/src/migrations/025_create_kpis_view.sql`
- Проблема в строках 50-55: `SELECT component_id AS component_id` и `group_by: ["component_id"]`
- SQL Builder генерирует неправильный GROUP BY

### 3. Сравнение ответов ❌

**Старый endpoint `/api/kpis`:**
```json
[
  {
    "id": "capital_card",
    "periodDate": "2025-12-31",
    "value": 11200000000,
    "previousValue": 10950000000,
    "ytdValue": 8200000000,
    "ppChange": 0.022799999999999997,
    "ppChangeAbsolute": 250000000,
    "ytdChange": 0.36590000000000006,
    "ytdChangeAbsolute": 3000000000
  },
  ...
]
```

**Новый endpoint `/api/data?query_id=kpis`:**
- ❌ Возвращает ошибку 500: `SQL execution error`
- ❌ Не удалось получить данные для сравнения

### 4. Проверка Frontend ⚠️

**Текущее состояние:**
- Frontend использует старый endpoint `/api/kpis` через `fetchAllKPIs` в `src/lib/api.ts`
- Функция `fetchAllKPIs` вызывает `apiFetch<KPIMetric[]>("/kpis")`
- Frontend еще не переведен на новый endpoint `/api/data?query_id=kpis`

**Файлы:**
- `src/lib/api.ts` (строка 192-194): `fetchAllKPIs` использует `/api/kpis`
- `src/hooks/useAPI.ts` (строка 49-57): `useAllKPIs` использует `fetchAllKPIs`

### 5. Созданные тесты ✅
- ✅ Создан файл `e2e/kpis-data-endpoint.spec.ts` с тестами:
  - Сравнение старого и нового endpoint
  - Проверка структуры данных
  - Проверка значений
  - Проверка валидации параметров
  - Frontend интеграция

## Обнаруженные проблемы

### Проблема 1: SQL ошибка в конфиге kpis ❌

**Суть проблемы:**
- SQL Builder генерирует неправильный GROUP BY для конфига `kpis`
- Ошибка: `column "kpis_view.component_id" must appear in the GROUP BY clause`

**Где возникает:**
- `backend/src/migrations/025_create_kpis_view.sql` (конфиг `kpis`)
- `backend/src/services/queryBuilder/builder.ts` (генерация SQL)

**Шаги воспроизведения:**
1. Вызвать: `GET /api/data?query_id=kpis&component_Id=kpis&parametrs={"layout_id":"main_dashboard","p1":"2025-12-31","p2":"2025-11-30","p3":"2024-12-31"}`
2. Получить ошибку 500: `SQL execution error`

**Ожидаемый результат:**
- Endpoint должен вернуть массив KPI метрик в формате `{ componentId, type, rows }`
- `rows` должен содержать массив объектов с полями: `id`, `periodDate`, `value`, `previousValue`, `ytdValue`, `ppChange`, `ppChangeAbsolute`, `ytdChange`, `ytdChangeAbsolute`

**Фактический результат:**
- Ошибка 500: `SQL execution error: column "kpis_view.component_id" must appear in the GROUP BY clause`

**Логи:**
```
SQL execution error: column "kpis_view.component_id" must appear in the GROUP BY clause or be used in an aggregate function
```

## Рекомендации

### Для Backend:
1. ❌ **КРИТИЧНО:** Исправить SQL ошибку в конфиге `kpis`
   - Проверить, как SQL Builder генерирует GROUP BY для полей с алиасами
   - Убедиться, что `component_id` правильно используется в GROUP BY
   - Возможно, нужно использовать исходное имя поля из view вместо алиаса

2. После исправления проверить:
   - Endpoint возвращает данные без ошибок
   - Структура данных совпадает со старым endpoint
   - Значения совпадают со старым endpoint

### Для Frontend:
1. ⏸️ **Ожидает исправления Backend:** После исправления SQL ошибки:
   - Обновить `fetchAllKPIs` для использования `/api/data?query_id=kpis`
   - Получать даты периодов из `header_dates` для параметров `p1`, `p2`, `p3`
   - Преобразовывать формат ответа `{ componentId, type, rows }` в массив `KPIMetric[]`

## Файлы

### Созданные файлы:
- ✅ `e2e/kpis-data-endpoint.spec.ts` - тесты для сравнения старого и нового endpoint
- ✅ `AGENT_PLAN_KPIS_DATA_QA_REPORT.md` - отчет о выполнении

### Файлы для проверки:
- `backend/src/migrations/025_create_kpis_view.sql` - конфиг `kpis` (проблема в GROUP BY)
- `backend/src/services/queryBuilder/builder.ts` - генерация SQL (возможна проблема с GROUP BY)
- `src/lib/api.ts` - функция `fetchAllKPIs` (использует старый endpoint)

## Заключение

⚠️ **Обнаружена критическая ошибка SQL в конфиге `kpis`.**
❌ **Новый endpoint `/api/data?query_id=kpis` не работает из-за SQL ошибки.**
✅ **Старый endpoint `/api/kpis` работает корректно.**
⏸️ **Frontend еще не переведен на новый endpoint (ожидает исправления Backend).**

**Следующие шаги:**
1. Backend должен исправить SQL ошибку в конфиге `kpis`
2. После исправления повторить проверку сравнения ответов
3. После успешной проверки Frontend может перейти на новый endpoint
