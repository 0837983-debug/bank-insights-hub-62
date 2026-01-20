# План: Шаг 4 (фикс 2) — Backend — Исправление header_dates

**Цель:** исправить конфиг header_dates, чтобы возвращал три даты в правильном формате.
**Статус:** ✅ Завершено

## Проблема
API `/api/data/header_dates` возвращает:
```json
{ "rows": [{ "current": "2025-12-31" }] }
```

Фронт ожидает:
```json
{ "rows": [{ "periodDate": "...", "ppDate": "...", "pyDate": "..." }] }
```

Из-за этого таблица не получает параметры p1, p2, p3 и не загружает данные.

## Логика расчета дат
1. `periodDate` = последний день предыдущего месяца от NOW()
2. `ppDate` = последний день предыдущего месяца от periodDate
3. `pyDate` = последний день предыдущего года от periodDate

## Варианты решения

### Вариант A (рекомендуемый): Использовать periodService
Если SQL builder не поддерживает сложные вычисления дат:
- Создать отдельный endpoint `/api/dates` или `/api/header/dates`
- Использовать существующий periodService для расчета дат
- Вернуть данные в формате `{ periodDate, ppDate, pyDate }`

### Вариант B: Доработать конфиг header_dates
Если SQL builder поддерживает raw SQL или функции:
- Обновить конфиг в `config.component_queries`:
```sql
SELECT 
  (DATE_TRUNC('month', NOW()) - INTERVAL '1 day')::date AS "periodDate",
  (DATE_TRUNC('month', DATE_TRUNC('month', NOW()) - INTERVAL '1 day') - INTERVAL '1 day')::date AS "ppDate",
  (DATE_TRUNC('month', NOW()) - INTERVAL '1 year' - INTERVAL '1 day')::date AS "pyDate"
```
- Установить `wrap_json = TRUE`

## Задачи
- [x] Выбрать вариант решения (A или B) - выбран вариант A (periodService)
- [x] Реализовать логику расчета дат
- [x] Установить `wrap_json = TRUE` (если используется getData) - не требуется, используется periodService
- [x] Возвращать данные в формате:
```json
{
  "componentId": "header",
  "type": "table",
  "rows": [{
    "periodDate": "2025-12-31",
    "ppDate": "2025-11-30",
    "pyDate": "2024-12-31"
  }]
}
```

## Файлы для изменения
- `backend/src/routes/dataRoutes.ts` (если вариант A)
- `backend/src/services/periodService.ts` (если используется)
- Или: миграция для обновления `config.component_queries` (если вариант B)

## Критерии завершения
- [x] `/api/data/header_dates` возвращает три даты
- [x] Поля называются `periodDate`, `ppDate`, `pyDate`
- [x] Таблица "Активы" отображается
