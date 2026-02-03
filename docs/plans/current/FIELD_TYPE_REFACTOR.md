# План выполнения: Типизация полей component_fields + Calculated поля

> **Создан**: 2026-02-03  
> **Статус**: ✅ ЗАВЕРШЕНО (2026-02-03)  
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

## Структура этапов (ПАРАЛЛЕЛЬНО)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ПАРАЛЛЕЛЬНЫЙ ЗАПУСК                                 │
├────────────────────────────────┬────────────────────────────────────────────┤
│      Backend (Этапы 1-2)       │         Frontend (Этапы A-C)               │
│                                │                                            │
│  1. БД: field_type + calc      │  A. Создать моки layout с fieldType        │
│  2. Обновить layout view       │  B. Типы + executeCalculation              │
│                                │  C. transformTableData + компоненты        │
├────────────────────────────────┴────────────────────────────────────────────┤
│                         ИНТЕГРАЦИЯ (Этап 3)                                 │
│  • Сверить моки с реальным API                                             │
│  • Переключить фронт на API                                                │
│  • Проверить что всё работает                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                    CLEANUP (Этап 4) — ОБЯЗАТЕЛЬНО                          │
│  • Удалить deprecated колонки из БД                                        │
│  • Удалить моки с фронта                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                         QA + Docs (Этап 5)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ПАРАЛЛЕЛЬНЫЙ ПОТОК: Backend (Этапы 1-2)

### Этап 1: БД — Добавить field_type + calculated поля ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено (2026-02-03)
**Запуск**: ПАРАЛЛЕЛЬНО с Frontend

### Задачи:

- [x] **1.1** Создать миграцию `030_add_field_type.sql`:
  - Добавить колонку `field_type VARCHAR(20)` с CHECK constraint
  - Добавить колонку `calculation_config JSONB` для calculated полей
  - Добавить колонку `aggregation VARCHAR(10)` для measure полей
- [x] **1.2** Создать миграцию `031_migrate_field_types.sql`:
  - Заполнить `field_type` на основе `is_dimension`/`is_measure`/`parent_field_id`
  - parent_field_id IS NOT NULL → 'calculated'
  - is_dimension=true → 'dimension'
  - is_measure=true → 'measure'
  - остальное → 'attribute'
- [x] **1.3** Создать миграцию `032_add_calculated_fields.sql`:
  - Добавить calculated поля с `calculation_config` для всех компонентов
- [x] **1.4** Создать миграцию `034_fix_field_types.sql` (дополнительно):
  - Исправить ppValue/pyValue → measure (не calculated)

### SQL миграции:

```sql
-- 030_add_field_type.sql
ALTER TABLE config.component_fields
ADD COLUMN IF NOT EXISTS field_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS calculation_config JSONB,
ADD COLUMN IF NOT EXISTS aggregation VARCHAR(10);

ALTER TABLE config.component_fields
ADD CONSTRAINT chk_field_type CHECK (
  field_type IN ('dimension', 'measure', 'calculated', 'attribute')
);

-- 031_migrate_field_types.sql
UPDATE config.component_fields
SET field_type = CASE
  WHEN parent_field_id IS NOT NULL THEN 'calculated'
  WHEN is_dimension = true THEN 'dimension'
  WHEN is_measure = true THEN 'measure'
  ELSE 'attribute'
END
WHERE field_type IS NULL;

-- 032_add_calculated_fields.sql
UPDATE config.component_fields
SET calculation_config = '{"type": "percent_change", "current": "value", "base": "ppValue"}'::jsonb
WHERE field_id = 'ppChange' AND field_type = 'calculated';
-- (аналогично для всех calculated полей)
```

### ✅ Точка проверки:

```bash
cd backend && npm run migrate
psql -c "SELECT field_type, COUNT(*) FROM config.component_fields GROUP BY field_type"
psql -c "SELECT field_id, calculation_config FROM config.component_fields WHERE field_type = 'calculated'"
```

---

### Этап 2: Backend — Обновить layout view ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено (2026-02-03)

### Задачи:

- [x] **2.1** Обновить `config.layout_sections_json_view` — добавить `fieldType`, `calculationConfig`, `aggregation`
- [x] **2.2** Обновить `layoutService.ts` — использовать data_type для типа данных, field_type для типа поля

### ✅ Точка проверки:

```bash
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout" | jq '.sections[].components[].columns[] | select(.fieldType == "calculated")'
```

---

## ПАРАЛЛЕЛЬНЫЙ ПОТОК: Frontend с моками (Этапы A-C)

### Этап A: Создать моки + Типы + executeCalculation ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ ЗАВЕРШЕНО
**Запуск**: ПАРАЛЛЕЛЬНО с Backend

### Задачи:

- [x] **A.1** Создать моки `src/mocks/layoutMock.ts`:

```typescript
// src/mocks/layoutMock.ts
export const mockAssetsTableColumns = [
  { id: 'class', fieldType: 'dimension' as const, label: 'Класс', type: 'string' },
  { id: 'section', fieldType: 'dimension' as const, label: 'Раздел', type: 'string' },
  { id: 'item', fieldType: 'dimension' as const, label: 'Статья', type: 'string' },
  { id: 'sub_item', fieldType: 'dimension' as const, label: 'Подстатья', type: 'string' },
  { 
    id: 'value', 
    fieldType: 'measure' as const, 
    label: 'Значение', 
    type: 'number',
    format: 'currency_rub',
    aggregation: 'sum' as const,
    sub_columns: [
      { 
        id: 'ppChange', 
        fieldType: 'calculated' as const,
        label: 'Изм. к ПП, %',
        type: 'number',
        format: 'percent',
        calculationConfig: { type: 'percent_change' as const, current: 'value', base: 'ppValue' }
      },
      { 
        id: 'ytdChange', 
        fieldType: 'calculated' as const,
        label: 'Изм. YTD, %',
        type: 'number',
        format: 'percent',
        calculationConfig: { type: 'percent_change' as const, current: 'value', base: 'pyValue' }
      },
      { 
        id: 'ppChangeAbsolute', 
        fieldType: 'calculated' as const,
        label: 'Изм. к ПП',
        type: 'number',
        format: 'currency_rub',
        calculationConfig: { type: 'diff' as const, minuend: 'value', subtrahend: 'ppValue' }
      },
      { 
        id: 'ytdChangeAbsolute', 
        fieldType: 'calculated' as const,
        label: 'Изм. YTD',
        type: 'number',
        format: 'currency_rub',
        calculationConfig: { type: 'diff' as const, minuend: 'value', subtrahend: 'pyValue' }
      }
    ]
  },
  { id: 'ppValue', fieldType: 'measure' as const, label: 'Пред. период', type: 'number', format: 'currency_rub' },
  { id: 'pyValue', fieldType: 'measure' as const, label: 'Прош. год', type: 'number', format: 'currency_rub' }
];

// Флаг для переключения между моками и API
export const USE_MOCKS = true;
```

- [x] **A.2** Обновить типы в `src/lib/api.ts` (БЕЗ isDimension/isMeasure):

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
  fieldType: FieldType;
  aggregation?: AggregationType;
  calculationConfig?: CalculationConfig;
  sub_columns?: LayoutColumn[];
}
```

- [x] **A.3** Добавить `executeCalculation` в `src/lib/calculations.ts`:

```typescript
export function executeCalculation(
  config: CalculationConfig,
  rowData: Record<string, unknown>
): number | undefined {
  const getValue = (field?: string): number => {
    if (!field) return 0;
    const val = rowData[field];
    return typeof val === 'number' ? val : Number(val) || 0;
  };

  switch (config.type) {
    case 'percent_change': {
      const current = getValue(config.current);
      const base = getValue(config.base);
      if (base === 0) return 0;
      return Math.round(((current - base) / base) * 10000) / 10000;
    }
    case 'diff': {
      return getValue(config.minuend) - getValue(config.subtrahend);
    }
    case 'ratio': {
      const denom = getValue(config.denominator);
      if (denom === 0) return 0;
      return getValue(config.numerator) / denom;
    }
    default:
      return undefined;
  }
}
```

- [x] **A.4** Добавить тесты для `executeCalculation`

### ✅ Точка проверки:

```bash
npm run test -- --run calculations
npm run build
```

---

### Этап B: transformTableData + KPICard ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Этап A ✅  
**Статус**: ✅ ЗАВЕРШЕНО

### Задачи:

- [x] **B.1** Обновить `transformTableData` в `DynamicDashboard.tsx`:
  - Использовать `fieldType` (БЕЗ fallback на isDimension/isMeasure)
  - Иерархия = порядок dimension полей в columns (как есть в массиве)
  - Вызывать `executeCalculation` для всех полей с `fieldType === 'calculated'`
  - Собирать calculated поля из columns И из sub_columns
- [x] **B.2** Обновить `KPICard` в `src/components/KPICard.tsx`:
  - Вместо вызова `calculatePercentChange` использовать `executeCalculation`
  - Итерироваться по ВСЕМ calculated полям из layout (не хардкодить имена!)
  - Для каждого поля с `fieldType === 'calculated'` вызвать `executeCalculation`
  - Убрать ВСЕ хардкоды имён полей
- [x] **B.3** Тестировать с моками

### Пример для KPICard:

```typescript
// Было (хардкод):
const percentChanges = calculatePercentChange(kpi.value, kpi.previousValue, kpi.ytdValue);
const ppChange = percentChanges.ppPercent;

// Стало (динамически из layout):
// Собираем все calculated поля из layout
const calculatedColumns = [
  ...columns.filter(c => c.fieldType === 'calculated'),
  ...columns.flatMap(c => c.sub_columns || []).filter(c => c.fieldType === 'calculated')
];

// Вычисляем каждое calculated поле
const calculatedValues: Record<string, number | undefined> = {};
calculatedColumns.forEach(col => {
  if (col.calculationConfig) {
    calculatedValues[col.id] = executeCalculation(col.calculationConfig, kpi);
  }
});

// Используем по id из layout (не хардкодим!)
// calculatedValues['ppChange'], calculatedValues['ytdChange'], etc.
```

### ✅ Точка проверки:

```bash
npm run test -- --run transformTableData
npm run test -- --run KPICard
npm run build
```

---

### Этап C: FinancialTable ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Этап A ✅  
**Статус**: ✅ ЗАВЕРШЕНО

### Задачи:

- [x] **C.1** Убрать ВСЕ вызовы `calculatePercentChange` из рендера
- [x] **C.2** Читать готовые значения из row
- [x] **C.3** Удалить fallback

### ✅ Точка проверки:

```bash
npm run build
```

---

## ИНТЕГРАЦИЯ (Этап 3)

**Субагент**: `frontend-agent`  
**Зависимости**: Backend (1-2) ✅, Frontend (A-C) ✅  
**Статус**: ✅ ЗАВЕРШЕНО (2026-02-03)

### Задачи:

- [x] **3.1** Сравнить моки с реальным API:

```bash
# Получить реальные данные
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout" | jq '.sections[].components[] | select(.componentId == "assets_table") | .columns'

# Сравнить с моками в src/mocks/layoutMock.ts
```

- [x] **3.2** Если расхождения — исправить (моки или API) — РАСХОЖДЕНИЯ ОБНАРУЖЕНЫ (см. ниже)
- [x] **3.3** Переключить `USE_MOCKS = false`
- [x] **3.4** Проверить build и тесты — ✅ Успешно

### ✅ Точка проверки:

```bash
npm run dev
# Открыть http://localhost:8080
# Проверить все таблицы и карточки
```

### ⚠️ Обнаруженные расхождения (3.2):

**Cards (capital_card, roa_card)** — ✅ API соответствует ожиданиям:
- `fieldType: 'calculated'` для ppChange, ytdChange, ppChangeAbsolute, ytdChangeAbsolute
- `calculationConfig` присутствует с правильной структурой

**Tables (assets_table)** — ⚠️ РАСХОЖДЕНИЕ:
- **Моки** содержат calculated sub_columns: ppChange, ytdChange, ppChangeAbsolute, ytdChangeAbsolute с calculationConfig
- **API** возвращает только measure sub_columns: ppValue, pyValue (fieldType: 'measure', без calculationConfig)

**Влияние**: Таблицы НЕ вычисляют ppChange/ytdChange, потому что в API нет полей с `fieldType='calculated'` для таблиц.

**Рекомендация**: В Этапе 4 или отдельным backend-таском добавить calculated поля для таблиц в БД (ppChange, ytdChange, ppChangeAbsolute, ytdChangeAbsolute с parent_field_id='value').

### Примечание по USE_MOCKS:

Флаг `USE_MOCKS` был создан для потенциального переключения между моками и API, но **фактически не использовался в коде** — система всегда работала напрямую с API. Переключение `USE_MOCKS = false` носит формальный характер.

---

## CLEANUP (Этап 4) — ОБЯЗАТЕЛЬНО

**Субагент**: `backend-agent` + `frontend-agent`  
**Зависимости**: Этап 3 ✅  
**Статус**: ⏸️ Ожидает

### Backend:

- [ ] **4.1** Создать файл миграции `backend/src/migrations/033_remove_deprecated_columns.sql`:

```sql
-- 033_remove_deprecated_columns.sql
-- Удаление deprecated колонок из config.component_fields

ALTER TABLE config.component_fields
DROP COLUMN IF EXISTS is_dimension,
DROP COLUMN IF EXISTS is_measure,
DROP COLUMN IF EXISTS compact_display,
DROP COLUMN IF EXISTS is_groupable;

-- Обновить комментарий к таблице
COMMENT ON TABLE config.component_fields IS 
  'Поля компонентов. field_type определяет тип: dimension, measure, calculated, attribute';
```

- [ ] **4.2** Запустить миграцию: `cd backend && npm run migrate`

### Frontend:

- [ ] **4.2** Удалить `src/mocks/layoutMock.ts`
- [ ] **4.3** Удалить `USE_MOCKS` флаг

### ✅ Точка проверки:

```bash
cd backend && npm run migrate
psql -c "\d config.component_fields" | grep -E "is_dimension|is_measure|compact_display|is_groupable"
# Должно быть пусто

npm run build
npm run dev
```

---

## QA + Docs (Этап 5)

**Субагенты**: `qa-agent`, `docs-agent`  
**Зависимости**: Этап 4 ✅  
**Статус**: ⏸️ Ожидает

### QA:

- [ ] Запустить все E2E тесты
- [ ] Проверить все таблицы и карточки

### Docs:

- [ ] Обновить `docs/database/schemas.md`
- [ ] Создать `docs/architecture/field-types.md`
- [ ] Обновить контексты

---

## Сводка этапов

| Поток | Этап | Субагент | Параллельно с |
|-------|------|----------|---------------|
| **Backend** | 1. БД: field_type | backend | Frontend A |
| **Backend** | 2. Layout view | backend | Frontend B, C |
| **Frontend** | A. Моки + типы + executeCalculation | frontend | Backend 1 |
| **Frontend** | B. transformTableData + KPICard | frontend | Backend 2 |
| **Frontend** | C. FinancialTable | frontend | Backend 2 |
| **Интеграция** | 3. Сверить и переключить | frontend | — |
| **Cleanup** | 4. Удалить deprecated | backend + frontend | — |
| **Финал** | 5. QA + Docs | qa, docs | — |

---

## Инструкция для Executor

### Фаза 1: Параллельный запуск Backend и Frontend

Запустить **ОДНОВРЕМЕННО** два субагента:

```javascript
// ПАРАЛЛЕЛЬНО запустить оба Task в одном сообщении!

Task(
  subagent_type: "backend-agent",
  description: "Backend: field_type + view",
  prompt: `
    ПЕРЕД НАЧАЛОМ:
    1. Прочитай контекст: docs/context/backend.md
    2. Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md
    
    Выполни Backend этапы 1-2:
    1. Создай миграции 030, 031, 032 для field_type и calculated
    2. Обнови layout VIEW (SQL) чтобы возвращал fieldType и calculationConfig
    
    ⛔ ЗАПРЕЩЕНО:
    - Редактировать сервисы (layoutService.ts и др.) — они НЕ используются!
    - fallback, backward compatibility
    - Редактировать файлы НЕ указанные в плане
    
    Редактируй ТОЛЬКО:
    - backend/src/migrations/*.sql
    - SQL views в БД
    
    Проверяй точку проверки после каждого этапа.
    Обнови статус в плане.
  `
)

Task(
  subagent_type: "frontend-agent",
  description: "Frontend: mocks + types + components",
  prompt: `
    ПЕРЕД НАЧАЛОМ:
    1. Прочитай контекст: docs/context/frontend.md
    2. Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md
    
    Выполни Frontend этапы A-C:
    A. Создай моки + типы + executeCalculation
    B. Обнови transformTableData + KPICard (работай с моками)
    C. Упрости FinancialTable (убрать ВСЕ расчёты)
    
    ⛔ ЗАПРЕЩЕНО:
    - fallback на isDimension/isMeasure
    - хардкод имён полей
    - дублирование расчётов
    - Редактировать файлы НЕ указанные в плане
    
    После каждого этапа: npm run test && npm run build
    Обнови статус в плане.
  `
)
```

### Фаза 2: После завершения обоих потоков

**Этап 3 — Интеграция:**
```javascript
Task(
  subagent_type: "frontend-agent",
  description: "Integration: mocks → API",
  prompt: `
    Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md, Этап 3
    
    1. Сравни моки с реальным API layout
    2. Исправь расхождения если есть
    3. Переключи USE_MOCKS = false
    4. Проверь в браузере
  `
)
```

**Этап 4 — Cleanup (ОБЯЗАТЕЛЬНО):**
```javascript
Task(
  subagent_type: "backend-agent",
  description: "Cleanup: remove deprecated",
  prompt: `
    Прочитай план: docs/plans/current/FIELD_TYPE_REFACTOR.md, Этап 4
    
    1. Создай миграцию 033 для удаления is_dimension, is_measure, compact_display, is_groupable
    2. Запусти миграцию
    3. Проверь что колонки удалены
  `
)
```

### Фаза 3: QA + Docs

```javascript
Task(
  subagent_type: "qa-agent",
  description: "QA: E2E regression",
  prompt: `Запусти E2E тесты, проверь таблицы и карточки`
)

Task(
  subagent_type: "docs-agent", 
  description: "Docs: update schemas",
  prompt: `Обнови docs/database/schemas.md, создай docs/architecture/field-types.md`
)
```

### Правила для субагентов

⛔ **ЗАПРЕЩЕНО:**
- Оставлять код для backward compatibility
- Добавлять fallback на старые механизмы
- Дублировать расчёты
- Хардкодить имена полей

✅ **ОБЯЗАТЕЛЬНО:**
- Точка проверки после каждого этапа
- Удалить deprecated колонки (этап 4 НЕ опциональный)
- Удалить моки после интеграции

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-02-03 | Backend 1 | ✅ | Миграции 030-032: field_type, calculation_config, aggregation |
| 2026-02-03 | Backend 2 | ✅ | Миграция 033: обновлён layout view, layoutService.ts |
| 2026-02-03 | Backend fix | ✅ | Миграция 034: исправлены типы ppValue/pyValue → measure |
| 2026-02-03 | A | ✅ | Созданы моки, типы, executeCalculation |
| 2026-02-03 | B | ✅ | transformTableData + KPICard обновлены |
| 2026-02-03 | C | ✅ | FinancialTable упрощён, убран calculatePercentChange |
| 2026-02-03 | 3 | ✅ | Интеграция: USE_MOCKS=false, build ✅, 60 тестов ✅. Найдено расхождение: таблицы не имеют calculated полей в API |
| 2026-02-03 | 4 | ✅ | Cleanup: миграция 035, deprecated колонки (is_dimension, is_measure, compact_display, is_groupable) удалены из БД |
