# План выполнения: Рефакторинг transformTableData — универсальная агрегация

> **Создан**: 2026-01-23  
> **Статус**: ⏸️ SUPERSEDED — см. FIELD_TYPE_REFACTOR.md  
> **Roadmap**: Техдолг / Рефакторинг
>
> ⚠️ **Этот план частично выполнен и заменён на более комплексный:**  
> - Этап 1 выполнен (универсальная иерархия по isDimension/isMeasure)  
> - Дальнейшая работа продолжается в `FIELD_TYPE_REFACTOR.md` (типизация field_type + calculated поля)

---

## Контекст

Функция `transformTableData` в `DynamicDashboard.tsx` содержит хардкод полей `["class", "section", "item", "sub_item"]` и маппинг `prev_period → previousValue`. Это ломает работу с таблицами, которые используют другие имена полей (например `fin_results` с `category`, `subitem`, `ppValue`).

**Цель:** Сделать `transformTableData` универсальным — определять иерархию по порядку полей из API данных (string → dimension, number → measure).

**Файлы для изучения перед началом:**
- `docs/context/frontend.md`
- `src/pages/DynamicDashboard.tsx` — функция transformTableData
- `src/components/FinancialTable.tsx`

---

## Этап 1: Frontend — Рефакторинг transformTableData ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:

- [ ] **1.1** Изменить сигнатуру `transformTableData` — добавить параметр `columns` из layout
- [ ] **1.2** Получать dimension/measure поля из `columns.isDimension` и `columns.isMeasure`
- [ ] **1.3** Убрать хардкод маппинга `prev_period → previousValue`, `prev_year → ytdValue` — использовать поля как есть
- [ ] **1.4** Динамически агрегировать все measure поля для групп
- [ ] **1.5** Использовать поля как есть в leafRow (spread `...row` вместо явного перечисления)
- [ ] **1.6** Обновить вызов `transformTableData` в `DynamicTable` — передать `component.columns`
- [ ] **1.7** Добавить unit-тесты для transformTableData с двумя сценариями (balance и fin_results)
- [ ] Обновить `docs/context/frontend.md`

### Файлы для изменения:

- `src/pages/DynamicDashboard.tsx` — функция transformTableData и DynamicTable
- `src/pages/__tests__/transformTableData.test.ts` (создать)

### Алгоритм:

```typescript
interface LayoutColumn {
  id: string;
  isDimension?: boolean;
  isMeasure?: boolean;
  // ... другие поля
}

function transformTableData(
  apiData: TableData, 
  columns: LayoutColumn[]
): TableRowData[] {
  const rows = apiData.rows;
  if (rows.length === 0) return [];

  // Получаем dimension и measure поля из layout columns
  // Порядок dimension полей определяет иерархию
  const dimensionFields = columns
    .filter(col => col.isDimension)
    .map(col => col.id);
  
  const measureFields = columns
    .filter(col => col.isMeasure)
    .map(col => col.id);
  
  // dimensionFields = ['class', 'category', 'item', 'subitem'] для fin_results
  // dimensionFields = ['class', 'section', 'item', 'sub_item'] для balance
  
  // measureFields = ['value', 'ppValue', 'pyValue'] для fin_results
  // measureFields = ['value', 'ppValue', 'pyValue'] для balance
  
  // Далее использовать dimensionFields вместо hierarchyLevels
  // И measureFields для агрегации
}

// В DynamicTable:
const tableRows = transformTableData(transformedData, component.columns);
```

### Критерии завершения:

- [x] `npm run build` без ошибок
- [x] transformTableData принимает columns из layout
- [x] Иерархия строится по isDimension колонкам в порядке из layout
- [x] Агрегация работает по isMeasure колонкам
- [x] fin_results_table отображается корректно (иерархия: class → category → item → subitem)
- [x] assets_table продолжает работать (иерархия: class → section → item → sub_item)
- [x] Unit-тесты проходят (48/48)
- [x] `docs/context/frontend.md` обновлён

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "frontend-agent",
  description: "Refactor transformTableData universal",
  prompt: `
    Прочитай контекст: docs/context/frontend.md
    Прочитай план: docs/plans/current/REFACTOR_TRANSFORM_TABLE_DATA.md, раздел "Этап 1"
    
    Выполни все задачи:
    1. Добавить параметр columns в transformTableData
    2. Получать dimension/measure поля из columns.isDimension и columns.isMeasure
    3. Убрать маппинг prev_period/prev_year — использовать поля как есть
    4. Динамически агрегировать все measure поля
    5. Использовать spread ...row в leafRow
    6. Обновить вызов в DynamicTable — передать component.columns
    7. Добавить unit-тесты
    
    Важно: Layout уже содержит isDimension и isMeasure для каждой колонки.
    Порядок dimension колонок в layout = порядок уровней иерархии.
    
    После завершения:
    - Проверь сборку: npm run build
    - Проверь что fin_results_table и assets_table работают в браузере
    - Обнови docs/context/frontend.md (раздел transformTableData)
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 2: Docs — Документация ⏸️

**Субагент**: `docs-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] **2.1** Создать `docs/components/dynamic-tables.md` — описание динамических таблиц
- [ ] **2.2** Описать transformTableData и как он использует isDimension/isMeasure из layout
- [ ] **2.3** Добавить примеры конфигурации для новых таблиц (SQL конфиг + component_fields)

### Файлы для создания/изменения:

- `docs/components/dynamic-tables.md` (создать)

### Критерии завершения:

- [ ] Документация создана
- [ ] Описан алгоритм определения полей
- [ ] Есть примеры

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Document dynamic tables",
  prompt: `
    Прочитай план: docs/plans/current/REFACTOR_TRANSFORM_TABLE_DATA.md, раздел "Этап 2"
    
    Создай docs/components/dynamic-tables.md:
    1. Описание FinancialTable и transformTableData
    2. Как используется isDimension/isMeasure из layout для иерархии
    3. Как добавить новую таблицу (SQL конфиг + component_fields)
    4. Примеры для balance и fin_results
    
    После завершения обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 3: QA — E2E тесты ⏸️

**Субагент**: `qa-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] **3.1** Написать E2E тест для fin_results_table (иерархия, агрегация)
- [ ] **3.2** Обновить E2E тест для balance_table
- [ ] **3.3** Запустить регресс всех E2E тестов

### Файлы для создания/изменения:

- `e2e/fin-results-table.spec.ts` (создать)
- `e2e/balance-table.spec.ts` (проверить/обновить)

### Критерии завершения:

- [ ] E2E тесты проходят
- [ ] Регресс без новых падений

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "qa-agent",
  description: "E2E tests for dynamic tables",
  prompt: `
    Прочитай план: docs/plans/current/REFACTOR_TRANSFORM_TABLE_DATA.md, раздел "Этап 3"
    
    Выполни:
    1. Напиши E2E тест для fin_results_table в e2e/fin-results-table.spec.ts
    2. Проверь/обнови тест для balance_table
    3. Запусти регресс: npm run test:e2e -- --reporter=list
    
    Тесты должны проверять:
    - Таблица загружается
    - Иерархия отображается корректно
    - Группы сворачиваются/разворачиваются
    - Значения агрегируются
    
    После завершения обнови статус этапа в плане на ✅
  `
)
```

---

## Финальная проверка

После всех этапов Executor должен проверить:

```bash
# Frontend собирается
npm run build

# Все E2E тесты проходят
npm run test:e2e -- --reporter=list

# Ручная проверка в браузере
# - fin_results_table отображает иерархию class → category → item → subitem
# - assets_table отображает иерархию class → section → item → sub_item
# - Группы агрегируют значения
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-01-30 | Этап 1 | ✅ | Рефакторинг transformTableData: универсальная иерархия по isDimension, агрегация по isMeasure. Unit-тесты 48/48. |
