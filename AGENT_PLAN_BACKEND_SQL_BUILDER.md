# План: Backend Agent — SQL Builder

**Статус**: ✅ Завершено  
**Зависимости**: Файлы `AGENT_CONTEXT_SQL_BUILDER.md`, `AGENT_CONTRACT_SQL_BUILDER.md`

## Задачи
- [x] Создать сервис `backend/src/services/queryBuilder/`:
  - `types.ts` — типы конфига
  - `validator.ts` — валидация схемы, идентификаторов, paramTypes
  - `builder.ts` — генерация SQL и массива параметров
- [x] Реализовать преобразование named params → `$1..$n` с устойчивым порядком
- [x] Реализовать сборку:
  - SELECT (column, agg, case_agg)
  - FROM
  - WHERE (and/or, без вложенности)
  - GROUP BY
  - ORDER BY
  - LIMIT/OFFSET
- [x] Добавить unit‑тесты (минимум 3 сценария):
  - примерный кейс с case_agg
  - with where IN / BETWEEN
  - с ошибкой конфига (invalid config)
- [x] Обновить `backend/src/services/mart` или создать отдельный сервис‑обертку (по необходимости)

## Файлы для изменения
- `backend/src/services/queryBuilder/types.ts`
- `backend/src/services/queryBuilder/validator.ts`
- `backend/src/services/queryBuilder/builder.ts`
- `backend/src/services/queryBuilder/index.ts`
- `backend/src/services/queryBuilder/__tests__/builder.test.ts` (или рядом)

## Критерии завершения
- [x] SQL строится строго по контракту
- [x] Все параметры идут через `$1..$n`
- [x] Нет raw‑expr и SQL‑инъекций
- [x] Unit‑тесты проходят

## Интеграция
Сервис не должен лезть в API слой без явной задачи.
