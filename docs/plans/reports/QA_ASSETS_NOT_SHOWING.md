# QA Report: ASSETS_NOT_SHOWING

## Контекст

- План: `docs/plans/current/ASSETS_NOT_SHOWING.md`
- Этап: 3 (QA)
- Дата проверки: 2026-05-23
- Среда: `frontend=http://localhost:8080`, `backend=http://localhost:3001`

## Шаги воспроизведения (UI)

1. Открыть `http://localhost:8080`.
2. Дождаться `networkidle` и дополнительно 3 секунды.
3. Проверить наличие таблиц/секции баланса и сетевые запросы к `/api/data`.

## Фактический результат (UI)

- На странице нет таблиц (`tableCount=0`).
- Текст/секция баланса не отображаются.
- В network при загрузке страницы есть только один запрос:
  - `GET /api/data?query_id=layout&component_Id=layout&parametrs={"layout_id":"main_dashboard"}`
  - HTTP `200`

## Проверка API (ручная)

1. `layout`
   - HTTP `200`
   - Тело содержит только секцию `formats` (без table-компонентов и без `queryId=assets_table`).
2. `header_dates`
   - HTTP `200`
   - Возвращает валидный массив дат (`rows`), включая флаги `isP1/isP2/isP3`.
3. `assets_table`
   - HTTP `400`
   - Ответ: `{"error":"wrap_json=false: query must have wrapJson=true"}`

## Первопричина

Первопричина подтверждена на стороне API/конфигурационных данных layout:

- `layout` для `main_dashboard` не содержит секцию/компонент таблицы активов, поэтому фронт не инициирует запрос `assets_table` и ничего не рендерит.
- Дополнительно прямой вызов `assets_table` сейчас возвращает `400` по `wrapJson` контракту, что указывает на отдельное API-конфигурационное несоответствие для этого `query_id`.

Итого для исходной проблемы "активы не отображаются на UI": основной блокер находится в **layout API/данных конфигурации**, не в рендере фронта.
