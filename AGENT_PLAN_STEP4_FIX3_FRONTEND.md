# План: Шаг 4 (фикс 3) — Frontend — Undefined переменные

**Цель:** исправить undefined переменные в DynamicTable, из-за которых фронт падает.
**Статус:** ✅ Завершено

## Проблема
В компоненте `DynamicTable` используются переменные, которые не определены:
- `getDataError` — не извлекается из `useGetData`
- `headerDataLoading`, `headerData`, `headerDataError` — определены в `DynamicDashboard`, но используются в `DynamicTable`

Это вызывает **ReferenceError** и фронт не рендерится.

## Задачи

### Задача 1: Добавить `error` из `useGetData`
**Строка ~209:**
```ts
// Было:
const { data: tableDataFromGetData, isLoading: isLoadingGetData } = useGetData(...)

// Стало:
const { data: tableDataFromGetData, isLoading: isLoadingGetData, error: getDataError } = useGetData(...)
```

### Задача 2: Убрать недоступные переменные
**Строки ~262-274:** Убрать ссылки на `headerDataLoading`, `headerData`, `headerDataError`:
```ts
// Было:
const missingDatesError = dataSourceKey && !dates && !headerDataLoading;
...
Header data: {headerData ? "loaded" : "not loaded"}, 
Error: {headerDataError ? String(headerDataError) : "none"}

// Стало:
const missingDatesError = dataSourceKey && !dates;
...
// Убрать строки с headerData, headerDataError
```

Или упростить весь блок обработки ошибок.

## Файлы для изменения
- `src/pages/DynamicDashboard.tsx`

## Критерии завершения
- [x] Нет ReferenceError в консоли
- [x] Фронт рендерится
- [x] Таблица "Активы" отображается
