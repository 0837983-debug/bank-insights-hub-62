---
title: Восстановление после cleanup
description: Как восстановить файлы и dev dataset после очистки
---

# Восстановление после cleanup

Документ описывает восстановление проекта после архивирования/очистки в handoff-процессе.

## 1) Восстановление файлов из `archive/`

Если файл отсутствует в рабочей структуре:

1. Проверьте индексы:
   - `archive/ARCHIVED_FILES.md` (основной индекс архивированных путей);
   - `docs/unused-files-list.txt` (audit-список кандидатов).
2. Проверьте наличие файла в `archive/`.
3. Восстановите файл на исходный путь с сохранением структуры.

Пример:

```bash
mkdir -p "$(dirname src/components/example/SomeFile.tsx)"
cp "archive/src/components/example/SomeFile.tsx" "src/components/example/SomeFile.tsx"
```

После восстановления:
- обновите индекс архивированных файлов (если процессом это требуется);
- прогоните релевантные тесты или хотя бы `npm run build`.

## 2) Восстановление локального dataset

Если нужен повторный чистый набор данных:

```bash
bash scripts/bootstrap-local-db.sh
ALLOW_DATA_RESET=true bash scripts/sanitize-and-seed-dev-db.sh
```

Это восстанавливает:
- структуру БД через миграции;
- техконфиги и справочники;
- тестовые CSV-данные через upload pipeline;
- MART materialized views через refresh.

## 3) Handoff-policy: что не восстанавливать и не передавать

Нельзя возвращать в handoff-контур:
- real data из `backend/row/processed/**/*.{csv,xlsx,xls}`;
- production dumps;
- `.env` с реальными секретами;
- любые credentials/tokens/keys.

Разрешено передавать:
- код и документацию;
- тестовые CSV в `test-data/uploads`;
- миграции и конфигурационные таблицы (`config.*`, `dict.*`).

## 4) Минимальная проверка после восстановления

1. `cd backend && npm run build`
2. `npm run docs:build`
3. Проверка API:
   - `/api/data?query_id=layout`
   - `/api/data?query_id=header_dates`
