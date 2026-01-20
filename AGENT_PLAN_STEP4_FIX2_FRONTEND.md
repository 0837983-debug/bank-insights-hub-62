# План: Шаг 4 (фикс 2) — Frontend — Проверка работы с header_dates

**Цель:** убедиться, что фронт корректно обрабатывает новый формат header_dates.
**Статус:** ✅ Завершено

## Контекст
После фикса backend, API будет возвращать:
```json
{
  "rows": [{
    "periodDate": "2025-12-31",
    "ppDate": "2025-11-30",
    "pyDate": "2024-12-31"
  }]
}
```

Текущий код уже поддерживает эти поля:
```ts
periodDate: firstRow.periodDate || firstRow.period_date || firstRow.p1,
ppDate: firstRow.ppDate || firstRow.pp_date || firstRow.p2,
pyDate: firstRow.pyDate || firstRow.py_date || firstRow.p3,
```

## Задачи
- [x] Дождаться фикса backend
- [x] Проверить, что dates заполняются корректно (console.log)
- [x] Проверить, что таблица "Активы" отображается
- [x] При необходимости: добавить обработку ошибок если даты не загрузились

## Файлы для проверки
- `src/pages/DynamicDashboard.tsx`

## Критерии завершения
- [x] Таблица "Активы" отображает данные
- [x] Даты корректно передаются в API
