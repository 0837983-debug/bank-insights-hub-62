---
title: Компоненты фронтенда
description: Подробное описание работы компонентов дашборда — FinancialTable, данные, связь с layout и полями
related:
  - /architecture/frontend
  - /architecture/data-flow
  - /api/get-data
---

# Компоненты фронтенда

Документ описывает, как устроены компоненты дашборда: что они получают на вход, как связываются с layout и полями, что где отображается.

## Общий поток данных для таблицы

1. **Layout** (из `/api/data?query_id=layout`) задаёт секции и компоненты. Для каждой таблицы в layout хранятся: `componentId`, `dataSourceKey`, `columns`, `buttons`.
2. **DynamicDashboard** загружает layout и даты из header, затем для каждой секции рендерит **DynamicTable** для каждого компонента с `type === "table"`.
3. **DynamicTable** по `component.dataSourceKey` и переданным `dates` вызывает **useGetData** и получает сырые строки от API.
4. **transformTableData(apiData, component.columns)** превращает плоские строки API в иерархические **TableRowData[]** с группами и расчётными полями.
5. **FinancialTable** получает `rows`, `componentId` и опционально `buttons`; по `componentId` из layout подтягивает **колонки и форматы** и рендерит таблицу.

---

## FinancialTable

**Файл:** `src/components/FinancialTable.tsx`

Компонент отображает таблицу с иерархией строк (группы/подгруппы), числовыми колонками и изменениями (PP/YTD).

### Что приходит на вход (props)

| Prop | Тип | Описание |
|------|-----|----------|
| `title` | string | Заголовок карточки таблицы |
| `rows` | TableRowData[] | Строки таблицы (уже иерархические, после transformTableData) |
| `componentId` | string? | ID компонента из layout — по нему берутся колонки и форматы |
| `buttons` | ButtonComponent[]? | Кнопки переключения (например, «Активы» / «Пассивы») из layout |
| `activeButtonId` | string \| null? | Активная кнопка (контролируемый режим) |
| `onButtonClick` | (id \| null) => void? | Обработчик смены кнопки |
| `showPercentage` | boolean? | Показывать ли долю (по умолчанию true) |
| `showChange` | boolean? | Показывать ли изменения PP/YTD (по умолчанию true) |
| `isLoading` | boolean? | Показать скелетон загрузки |

Колонки таблица **не** принимает явно: они берутся из layout по `componentId` через хук `useLayout()`.

### Связь с layout и полями

1. **useLayout()** даёт текущий layout (форматы + секции с компонентами).
2. В layout ищется компонент с `componentId === props.componentId` и `type === "table"`.
3. У этого компонента используются:
   - **component.columns** — определение колонок (id, label, type, format, fieldType, sub_columns);
   - по ним же выбираются форматы для значения и для изменений (ppChange, ytdChange и т.д.).

Колонки из layout делятся на:

- **Текстовые** (`type === 'string'` или `'text'`): одна общая колонка «Показатель» — в неё выводятся поля иерархии (class, section, item, sub_item).
- **Числовые** (остальные): каждая колонка — отдельный заголовок. Обычно есть колонка `value` и при необходимости другие measure. У числовой колонки могут быть **sub_columns** (например, ppChange, ppChangeAbsolute, ytdChange, ytdChangeAbsolute) — они задают, какие изменения показывать под значением и в каком формате.

Итог:

- Заголовки таблицы (и порядок колонок) задаются **только** из layout (`component.columns`).
- Какая ячейка к какому полю строки привязана: для «Показателя» — иерархия (class/section/item/sub_item), для числовых колонок — поле строки с тем же `id`, что и `col.id` (value, percentage, ppChange, ytdChange и т.д.).

### Что где отображается

- **Первая колонка («Показатель»):**
  - Берутся значения полей строки, соответствующих текстовым колонкам layout (по порядку). В ячейке показывается последнее непустое значение иерархии (фактически «листовое» имя строки).
  - Отступ по уровню вложенности (`parentId` → indent).
  - Иконка сворачивания/разворачивания для строк с детьми; для строк без детей — пустое место под выравнивание.
  - Если у строки есть `description` — иконка с тултипом.

- **Числовые колонки:**
  - Основное значение: `(row as any)[col.id]` (чаще всего `value`), формат из `col.format` или из value-колонки layout (например, `currency_rub`).
  - Под значением, если `showChange` и в строке есть ppChange/ytdChange: показываются изменения (PP и при наличии YTD), цвет по знаку, форматы из `sub_columns` (ppChange, ytdChange).

- **Кнопки над таблицей:** если в layout у компонента заданы `buttons`, они рендерятся в шапке карточки; выбор кнопки передаётся наверх через `onButtonClick` и влияет на то, какой `dataSourceKey` использует DynamicTable для запроса данных (см. ниже).

### Иерархия и сортировка

- Строки приходят уже с полями `parentId`, `isGroup`, `sortOrder` (их заполняет transformTableData).
- Сначала отбираются корневые строки (`!row.parentId`), к ним применяется сортировка через **useTableSort** (по выбранной колонке и направлению).
- Дети собираются в `childrenByParent`; при рендере для каждого родителя выводятся его дети в порядке `sortOrder`, с учётом свёрнутых групп (`collapsedGroups`).
- Кнопки «Свернуть уровень» / «Развернуть уровень» меняют видимость целых уровней иерархии.

### Детализация по двойному клику

- По двойному клику по строке открывается диалог с «детализацией». Если у строки нет реальных дочерних строк с бэкенда, показывается mock-детализация (доли от значения строки). В диалоге отображаются те же форматы (value, percentage, ppChange), что и в основной таблице.

---

## transformTableData

**Место вызова:** `DynamicDashboard.tsx` (внутри DynamicTable, перед передачей строк в FinancialTable).

**Сигнатура:**  
`transformTableData(apiData: TableData, columns?: LayoutColumn[]): TableRowData[]`

Преобразует плоские строки ответа API в иерархический список строк для FinancialTable.

### Вход

- **apiData** — ответ от `/api/data` для таблицы: объект с полем `rows` (массив плоских записей). В каждой записи поля совпадают с именами колонок и полей из БД (например class, section, item, sub_item, value, previousValue, ytdValue и т.д.).
- **columns** — массив колонок из layout для этой таблицы (component.columns). По ним определяются dimension/measure/calculated.

### Логика

1. **Dimension / measure из layout:**
   - **dimension** — поля иерархии (порядок колонок в layout задаёт порядок уровней). По умолчанию, если columns не передан, используется `["class", "section", "item", "sub_item"]`.
   - **measure** — поля для агрегации (суммирование по группам). По умолчанию `["value"]`.
   - **calculated** — поля, значения которых считаются по `calculationConfig` через `executeCalculation` (например, percent_change).

2. **Обход строк API:**
   - Для каждой строки по dimension-полям строится путь (pathParts) и для каждого префикса пути создаётся/обновляется группа в `groupMap`.
   - В каждую группу суммируются все measure-поля.
   - Листовая строка (вся запись из API) добавляется как дочерняя к последней группе пути; для неё по calculated-полям вызывается `executeCalculation(calculationConfig, row)`.

3. **Группы:**
   - Для каждой группы создаётся строка TableRowData с полями: id (путь), dimension-поля по уровням, агрегированные measure, value = основной measure группы, percentage = доля от корневой суммы. Для групп тоже вызывается executeCalculation по calculated-полям (на агрегированных значениях).

4. **Иерархия:**
   - У каждой строки задаётся `parentId` (id родительской группы или undefined для корня), `isGroup` (true для групп), `sortOrder`. Итоговый массив строится обходом от корня в глубину с сортировкой детей по sortOrder.

### Выход

Массив **TableRowData[]**: каждая строка содержит поля из API (dimension + measure) плюс вычисленные calculated-поля (например ppChange, ytdChange), плюс служебные id, parentId, isGroup, sortOrder. Этот массив и передаётся в FinancialTable как `rows`.

---

## DynamicTable и поток данных таблицы

**Файл:** `src/pages/DynamicDashboard.tsx` (внутренний компонент DynamicTable).

- **Вход:** один компонент таблицы из layout (`component`) и объект `dates` (periodDate, ppDate, pyDate), проброшенный с DynamicDashboard.

- **Кнопки (buttons):**
  - У таблицы в layout могут быть дочерние компоненты с `type === "button"` (component.buttons). Они рендерятся как кнопки над таблицей внутри FinancialTable.
  - При выборе кнопки сохраняется `activeButtonId`. Источник данных для запроса: если есть активная кнопка, берётся **dataSourceKey кнопки**, иначе **dataSourceKey таблицы**. Так одна и та же таблица может показывать разные выборки (например, активы/пассивы).

- **Запрос данных:**
  - Вызов **useGetData(dataSourceKey, { p1: periodDate, p2: ppDate, p3: pyDate }, { componentId })**. Включён только при наличии dataSourceKey и dates.
  - Ответ — объект с полями componentId, type, rows. rows передаются в transformTableData вместе с component.columns.

- **Даты:** берутся из header: DynamicDashboard загружает их через useGetData(headerDataSourceKey) и кладёт в состояние `dates`, затем передаёт `dates` в каждый DynamicTable как `component.dates`. Без дат таблица не запрашивается и показывает ошибку.

- **Цепочка до отображения:**  
  useGetData → tableData → transformTableData(tableData, component.columns) → tableRows → FinancialTable({ rows: tableRows, componentId, buttons, ... }).

---

## KPICard (кратко)

**Вход:** компонент из layout (card), массив KPI `kpis` с бэкенда. Карточка находит в `kpis` запись по `componentId` (или dataSourceKey) и выводит title, value, изменение (pp/ytd), описание. Форматы берутся из layout по componentId. Подробнее см. [Frontend архитектура](/architecture/frontend).

---

## См. также

- [Frontend архитектура](/architecture/frontend) — структура приложения, хуки, форматтеры и расчёты
- [Поток данных](/architecture/data-flow) — как данные идут от API до UI
- [Get Data API](/api/get-data) — формат ответа `/api/data` и параметры запросов
