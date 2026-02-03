# План выполнения: Типизация полей component_fields + Calculated поля

> **Создан**: 2026-02-03  
> **Статус**: ⏸️ Готов к выполнению  
> **Roadmap**: H.5 — Технический долг / Архитектура

---

## Контекст

### Текущая проблема

1. **Два boolean флага** `is_dimension` и `is_measure` — можно выставить оба true/false (бессмысленно)
2. **Расчёты дублируются** — ppChange/ytdChange считаются и в `transformTableData`, и в `FinancialTable`
3. **Хардкод имён полей** — `previousValue`, `ppValue`, `prev_period` и т.д.
4. **Нет типа "calculated"** — для полей, вычисляемых на фронте
5. **Неиспользуемые поля** — `compact_display`, `is_groupable` не используются

### Целевая архитектура

```
field_type: 'dimension' | 'measure' | 'calculated' | 'attribute'
```

| Тип | Описание | Пример |
|-----|----------|--------|
| dimension | Группировка/иерархия | class, section, item |
| measure | Числовое значение из БД | value, ppValue, pyValue |
| calculated | Вычисляется на фронте (sub_column) | ppChange, ytdChange |
| attribute | Прочие атрибуты | id, period_date |

### Принципы

1. **Иерархия** определяется порядком полей в API data (не отдельным полем)
2. **Нет fallback/backward compatibility** — один путь данных
3. **Calculated поля** только для sub_columns (parent_field_id IS NOT NULL)
4. **executeCalculation** применяется для таблиц И карточек

### Где будут расчёты

```
API → transformTableData (ВСЕ расчёты через calculation_config) → Компоненты (только рендер)
```

---

## ⛔ ВАЖНО: Запрещено

- Оставлять старый код для "обратной совместимости"
- Добавлять fallback на старые механизмы
- Дублировать расчёты в разных местах
- Хардкодить имена полей

---

## Структура этапов

```
┌─────────────────────────────────────────────────────────┐
│ Этап 1: БД — field_type + calculation_config           │ ◄── Сразу с данными
├─────────────────────────────────────────────────────────┤
│ Этап 2: Backend — Обновить layout view                 │
├─────────────────────────────────────────────────────────┤
│ Этап 3+4: Frontend (ПАРАЛЛЕЛЬНО с моками)              │
│   3A: Типы + executeCalculation                        │
│   3B: transformTableData + KPICard                     │
│   3C: FinancialTable                                   │
├─────────────────────────────────────────────────────────┤
│ Этап 4: Frontend — Переключить с моков на API          │
├─────────────────────────────────────────────────────────┤
│ Этап 5: БД — Удалить deprecated колонки                │ ◄── Обязательно
├─────────────────────────────────────────────────────────┤
│ Этап 6: QA + Docs                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Этап 1: БД — Добавить field_type + calculated поля 🔴

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] **1.1** Создать миграцию `030_add_field_type.sql`:
  - Добавить колонку `field_type VARCHAR(20)` с CHECK constraint
  - Добавить колонку `calculation_config JSONB` для calculated полей
  - Добавить колонку `aggregation VARCHAR(10)` для measure полей
- [ ] **1.2** Создать миграцию `031_migrate_field_types.sql`:
  - Заполнить `field_type` на основе `is_dimension`/`is_measure`/`parent_field_id`
  - is_dimension=true → 'dimension'
  - is_measure=true → 'measure'
  - parent_field_id IS NOT NULL → 'calculated'
  - остальное → 'attribute'
- [ ] **1.3** Создать миграцию `032_add_calculated_fields.sql`:
  - Добавить calculated поля с `calculation_config` для существующих компонентов
  - assets_table, fin_results_table, KPI карточки

### SQL миграция 030:

```sql
-- Добавляем новые колонки
ALTER TABLE config.component_fields
ADD COLUMN IF NOT EXISTS field_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS calculation_config JSONB,
ADD COLUMN IF NOT EXISTS aggregation VARCHAR(10);

-- CHECK constraint для field_type
ALTER TABLE config.component_fields
ADD CONSTRAINT chk_field_type CHECK (
  field_type IS NULL OR 
  field_type IN ('dimension', 'measure', 'calculated', 'attribute')
);

-- CHECK constraint для aggregation
ALTER TABLE config.component_fields
ADD CONSTRAINT chk_aggregation CHECK (
  aggregation IS NULL OR 
  aggregation IN ('sum', 'avg', 'count', 'min', 'max')
);

COMMENT ON COLUMN config.component_fields.field_type IS 
  'Тип поля: dimension (группировка), measure (числовое из БД), calculated (вычисляется на фронте), attribute (прочее)';
COMMENT ON COLUMN config.component_fields.calculation_config IS 
  'Конфиг вычисления для calculated полей: {"type": "percent_change", "current": "value", "base": "previousValue"}';
COMMENT ON COLUMN config.component_fields.aggregation IS 
  'Функция агрегации для measure полей: sum, avg, count, min, max';
```

### SQL миграция 031:

```sql
-- Заполняем field_type на основе существующих данных
UPDATE config.component_fields
SET field_type = CASE
  WHEN parent_field_id IS NOT NULL THEN 'calculated'
  WHEN is_dimension = true THEN 'dimension'
  WHEN is_measure = true THEN 'measure'
  ELSE 'attribute'
END
WHERE field_type IS NULL;

-- Для measure полей устанавливаем aggregation = 'sum' по умолчанию
UPDATE config.component_fields
SET aggregation = 'sum'
WHERE field_type = 'measure' AND aggregation IS NULL;
```

### SQL миграция 032 (calculated поля):

```sql
-- Обновляем существующие sub_columns с calculation_config
-- ppChange для assets_table
UPDATE config.component_fields
SET calculation_config = '{"type": "percent_change", "current": "value", "base": "ppValue"}'::jsonb
WHERE component_id = 'assets_table' AND field_id = 'ppChange';

-- ytdChange для assets_table  
UPDATE config.component_fields
SET calculation_config = '{"type": "percent_change", "current": "value", "base": "pyValue"}'::jsonb
WHERE component_id = 'assets_table' AND field_id = 'ytdChange';

-- ppChangeAbsolute для assets_table
UPDATE config.component_fields
SET calculation_config = '{"type": "diff", "minuend": "value", "subtrahend": "ppValue"}'::jsonb
WHERE component_id = 'assets_table' AND field_id = 'ppChangeAbsolute';

-- ytdChangeAbsolute для assets_table
UPDATE config.component_fields
SET calculation_config = '{"type": "diff", "minuend": "value", "subtrahend": "pyValue"}'::jsonb
WHERE component_id = 'assets_table' AND field_id = 'ytdChangeAbsolute';

-- Аналогично для fin_results_table и KPI карточек
-- (добавить все компоненты)
```

### Критерии завершения:

- [ ] Миграции выполнены без ошибок
- [ ] `field_type` заполнен для всех записей
- [ ] `calculation_config` заполнен для calculated полей
- [ ] Backend запускается

### ✅ Точка проверки:

```bash
cd backend && npm run migrate

psql -c "SELECT field_type, COUNT(*) FROM config.component_fields GROUP BY field_type"
psql -c "SELECT field_id, calculation_config FROM config.component_fields WHERE field_type = 'calculated'"

npm run dev
```

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Add field_type + calculated to DB",
  prompt: `
    Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md, раздел "Этап 1"
    
    Создай три миграции:
    1. 030_add_field_type.sql - добавление колонок
    2. 031_migrate_field_types.sql - заполнение field_type
    3. 032_add_calculated_fields.sql - calculation_config для всех sub_columns
    
    ВАЖНО:
    - parent_field_id IS NOT NULL → field_type = 'calculated'
    - Найди все существующие sub_columns (ppChange, ytdChange, etc.) и добавь им calculation_config
    - Проверь все компоненты: assets_table, fin_results_table, liabilities_table, KPI карточки
    
    После создания:
    - cd backend && npm run migrate
    - Проверь данные в БД
    - npm run dev
    
    Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 2: Backend — Обновить layout view ⏸️

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] **2.1** Обновить `config.v_layout` view:
  - Добавить `field_type`, `calculation_config`, `aggregation` в SELECT для columns
- [ ] **2.2** Обновить типы в `backend/src/services/mart/types.ts` (если используются)

### Файлы для изменения:

- SQL view: `config.v_layout`
- Типы: `backend/src/services/mart/types.ts`

### SQL для view:

```sql
-- Найти view и добавить новые поля в columns JSON
-- Примерно так:
jsonb_build_object(
  'id', cf.field_id,
  'type', cf.field_type,
  'label', cf.label,
  'format', cf.format_id,
  'fieldType', cf.field_type,
  'calculationConfig', cf.calculation_config,
  'aggregation', cf.aggregation,
  -- остальные поля
)
```

### Критерии завершения:

- [ ] View обновлён
- [ ] API `/api/data?query_id=layout` возвращает `fieldType` и `calculationConfig` в columns
- [ ] Backend компилируется и работает

### ✅ Точка проверки:

```bash
cd backend && npm run migrate

curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout" | jq '.sections[].components[].columns[] | select(.fieldType == "calculated")'

npm run build
```

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Update layout view",
  prompt: `
    Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md, раздел "Этап 2"
    
    1. Найди view config.v_layout (или аналогичный, который формирует layout для API)
    2. Добавь field_type, calculation_config, aggregation в JSON для columns
    3. Обнови типы в backend/src/services/mart/types.ts если нужно
    
    После завершения:
    - npm run migrate (если менял view через миграцию)
    - Проверь API что fieldType и calculationConfig есть
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 3: Frontend — Типы, расчёты, компоненты (ПАРАЛЛЕЛЬНО) ⏸️

**Субагенты**: `frontend-agent` (3 параллельных задачи)  
**Зависимости**: Этап 2 ✅  
**Статус**: ⏸️ Ожидает

### Подготовка к параллельной работе:

Создать mock данные для тестирования пока backend готовится:

```typescript
// src/mocks/layoutMock.ts
export const mockLayoutWithCalculated = {
  columns: [
    { id: 'value', fieldType: 'measure', aggregation: 'sum' },
    { 
      id: 'ppChange', 
      fieldType: 'calculated',
      calculationConfig: { type: 'percent_change', current: 'value', base: 'ppValue' }
    },
    // ...
  ]
};
```

### 3A: Типы + executeCalculation

- [ ] **3A.1** Обновить типы в `src/lib/api.ts`:
  - Добавить `FieldType`, `CalculationConfig`, `AggregationType`
  - Обновить `LayoutColumn` interface (БЕЗ isDimension/isMeasure)
- [ ] **3A.2** Добавить `executeCalculation` в `src/lib/calculations.ts`
- [ ] **3A.3** Добавить тесты для `executeCalculation`

### Типы (БЕЗ deprecated полей):

```typescript
export type FieldType = 'dimension' | 'measure' | 'calculated' | 'attribute';
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';
export type CalculationType = 'percent_change' | 'diff' | 'ratio';

export interface CalculationConfig {
  type: CalculationType;
  current?: string;
  base?: string;
  numerator?: string;
  denominator?: string;
  minuend?: string;
  subtrahend?: string;
}

export interface LayoutColumn {
  id: string;
  type: string;
  label: string;
  format?: string | null;
  description?: string | null;
  fieldType: FieldType;  // Обязательное поле
  aggregation?: AggregationType;
  calculationConfig?: CalculationConfig;
  sub_columns?: LayoutColumn[];
}
```

### 3B: transformTableData + KPICard

- [ ] **3B.1** Обновить `transformTableData` в `DynamicDashboard.tsx`:
  - Использовать `fieldType` (БЕЗ fallback на isDimension/isMeasure)
  - Иерархия = порядок dimension полей в массиве columns
  - Вызывать `executeCalculation` для calculated полей
  - Убрать ВСЕ хардкоды имён полей
- [ ] **3B.2** Обновить KPICard для использования calculated полей
- [ ] **3B.3** Обновить тесты

### Алгоритм transformTableData:

```typescript
function transformTableData(
  apiData: TableData, 
  columns: LayoutColumn[]  // Обязательный параметр
): TableRowData[] {
  // Иерархия = порядок dimension полей в columns (как есть)
  const dimensionFields = columns
    .filter(col => col.fieldType === 'dimension')
    .map(col => col.id);
  
  const measureFields = columns
    .filter(col => col.fieldType === 'measure')
    .map(col => col.id);
  
  // Собираем ВСЕ calculated поля (и top-level, и sub_columns)
  const calculatedColumns: LayoutColumn[] = [];
  columns.forEach(col => {
    if (col.fieldType === 'calculated' && col.calculationConfig) {
      calculatedColumns.push(col);
    }
    col.sub_columns?.forEach(subCol => {
      if (subCol.fieldType === 'calculated' && subCol.calculationConfig) {
        calculatedColumns.push(subCol);
      }
    });
  });
  
  // ... строим иерархию и агрегируем ...
  
  // Применяем calculations к КАЖДОЙ строке (группы + листья)
  const applyCalculations = (row: TableRowData) => {
    calculatedColumns.forEach(col => {
      (row as Record<string, unknown>)[col.id] = executeCalculation(
        col.calculationConfig!, 
        row as Record<string, unknown>
      );
    });
  };
  
  allRows.forEach(applyCalculations);
  
  return result;
}
```

### 3C: FinancialTable

- [ ] **3C.1** Убрать ВСЕ расчёты `calculatePercentChange` из рендера
- [ ] **3C.2** Просто читать готовые значения из строки (row.ppChange, row.ytdChange)
- [ ] **3C.3** Удалить fallback — данные ВСЕГДА приходят готовыми

### Было:

```typescript
if (col.id === "value") {
  const percentChanges = calculatePercentChange(row.value, row.previousValue, row.ytdValue);
  ppChangeValue = percentChanges.ppPercent;
}
```

### Стало:

```typescript
// Данные готовы в transformTableData. Никаких расчётов, никаких fallback.
const ppChangeValue = (row as Record<string, unknown>)[ppChangeColumnId];
const ytdChangeValue = (row as Record<string, unknown>)[ytdChangeColumnId];
```

### Критерии завершения:

- [ ] Типы обновлены (без isDimension/isMeasure)
- [ ] executeCalculation работает и покрыт тестами
- [ ] transformTableData использует fieldType (без fallback)
- [ ] FinancialTable только рендерит (без расчётов)
- [ ] KPICard использует calculated поля
- [ ] `npm run build` без ошибок

### ✅ Точка проверки:

```bash
npm run test
npm run build

# Ручная проверка с моками или с API
```

### 📋 Команды для параллельного запуска:

```javascript
// Задача 3A
Task(
  subagent_type: "frontend-agent",
  description: "Types + executeCalculation",
  prompt: `
    Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md, раздел "Этап 3, 3A"
    
    1. Обнови типы в src/lib/api.ts — БЕЗ isDimension/isMeasure
    2. Добавь executeCalculation в src/lib/calculations.ts
    3. Добавь тесты
    
    ЗАПРЕЩЕНО: fallback, backward compatibility, хардкод
    
    После: npm run test && npm run build
  `
)

// Задача 3B (после 3A)
Task(
  subagent_type: "frontend-agent", 
  description: "transformTableData + KPICard",
  prompt: `
    Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md, раздел "Этап 3, 3B"
    
    1. Обнови transformTableData — fieldType, executeCalculation
    2. Иерархия = порядок dimension в columns (не отдельное поле)
    3. Обнови KPICard — использовать calculated поля
    
    ЗАПРЕЩЕНО: fallback на isDimension/isMeasure, хардкод имён полей
    
    После: npm run test && npm run build
  `
)

// Задача 3C (после 3A)
Task(
  subagent_type: "frontend-agent",
  description: "Simplify FinancialTable",
  prompt: `
    Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md, раздел "Этап 3, 3C"
    
    Упрости FinancialTable.tsx:
    1. Убери ВСЕ вызовы calculatePercentChange из рендера
    2. Читай готовые значения из row
    3. Удали fallback — данные ВСЕГДА готовы
    
    ЗАПРЕЩЕНО: fallback, резервный расчёт, хардкод
    
    После: npm run build
  `
)
```

---

## Этап 4: Интеграция — Переключить на API ⏸️

**Субагент**: `frontend-agent`  
**Зависимости**: Этапы 2, 3 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] **4.1** Убрать моки (если использовались)
- [ ] **4.2** Проверить что фронт работает с реальным API
- [ ] **4.3** Проверить все компоненты: таблицы, карточки

### ✅ Точка проверки:

```bash
npm run build

# Запустить приложение
npm run dev

# Проверить в браузере:
# - assets_table отображается корректно
# - fin_results_table отображается корректно  
# - KPI карточки показывают изменения
# - ppChange/ytdChange везде работают
```

---

## Этап 5: БД — Удалить deprecated колонки 🔴 ОБЯЗАТЕЛЬНО

**Субагент**: `backend-agent`  
**Зависимости**: Этап 4 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] **5.1** Проверить что `is_dimension`, `is_measure`, `compact_display`, `is_groupable` не используются
- [ ] **5.2** Создать миграцию `033_remove_deprecated_columns.sql`:

```sql
-- Удаляем неиспользуемые колонки
ALTER TABLE config.component_fields
DROP COLUMN IF EXISTS is_dimension,
DROP COLUMN IF EXISTS is_measure,
DROP COLUMN IF EXISTS compact_display,
DROP COLUMN IF EXISTS is_groupable;
```

- [ ] **5.3** Обновить view если они использовали эти колонки

### Критерии завершения:

- [ ] Колонки удалены из БД
- [ ] Backend компилируется и работает
- [ ] Фронт работает без ошибок

### ✅ Точка проверки:

```bash
cd backend && npm run migrate

psql -c "\d config.component_fields" | grep -E "is_dimension|is_measure|compact_display|is_groupable"
# Должно быть пусто

npm run build
npm run dev
```

---

## Этап 6: QA + Docs ⏸️

**Субагенты**: `qa-agent`, `docs-agent`  
**Зависимости**: Этап 5 ✅  
**Статус**: ⏸️ Ожидает

### QA:

- [ ] **6.1** Запустить все E2E тесты
- [ ] **6.2** Проверить assets_table, fin_results_table, liabilities_table
- [ ] **6.3** Проверить KPI карточки
- [ ] **6.4** Проверить что ppChange/ytdChange отображаются корректно везде

### Docs:

- [ ] **6.5** Обновить `docs/database/schemas.md`
- [ ] **6.6** Создать `docs/architecture/field-types.md`
- [ ] **6.7** Обновить `docs/context/frontend.md`
- [ ] **6.8** Обновить `docs/context/backend.md`

---

## Сводка этапов

| # | Этап | Субагент | Зависимость | Проверка |
|---|------|----------|-------------|----------|
| 1 | БД: field_type + calculated | backend | - | Миграции + данные |
| 2 | Backend: layout view | backend | 1 | API с fieldType |
| 3 | Frontend: типы + компоненты | frontend | 2 | Тесты + сборка |
| 4 | Интеграция | frontend | 2, 3 | Браузер |
| 5 | БД: удалить deprecated | backend | 4 | Колонки удалены |
| 6 | QA + Docs | qa, docs | 5 | E2E + документация |

---

## Инструкция для Executor

⛔ **ЗАПРЕЩЕНО:**
- Оставлять код для backward compatibility
- Добавлять fallback на старые механизмы
- Дублировать расчёты
- Хардкодить имена полей

✅ **ОБЯЗАТЕЛЬНО:**
- Выполнять точку проверки после каждого этапа
- Удалить deprecated колонки (этап 5 НЕ опциональный)
- Один путь данных: API → transformTableData → рендер

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| | | | |
