# План B.1 — Financial Results: загрузка в STG

## Цель
Добавить возможность загрузки файлов Financial Results в STG слой.

## Маппинг колонок

| Исходный файл | Тип в файле | STG поле | Тип в БД | Иерархия | Обязательное | Ключ |
|---------------|-------------|----------|----------|----------|--------------|------|
| Название | Текст | class | VARCHAR(255) | Уровень 1 | ✅ | ✅ |
| Тип | Текст | category | VARCHAR(255) | Уровень 2 | ✅ | ✅ |
| 2уровень | Текст | item | VARCHAR(500) | Уровень 3 | ❌ | ✅ |
| Расшифровка | Текст | subitem | TEXT | Уровень 4 | ❌ | ✅ |
| Комментарии | Текст | details | TEXT | Уровень 5 | ❌ | ❌ |
| Ф/Ю | Текст | client_type | VARCHAR(100) | Аналитика | ❌ | ✅ |
| Код валюты | Текст(3) | currency_code | CHAR(3) | Аналитика | ❌ | ✅ |
| УК | Текст(50) | data_source | VARCHAR(50) | Аналитика | ❌ | ✅ |
| Сумма | Число(16,4) | value | NUMERIC(16,4) | — | ✅ | ❌ |
| Месяц | Дата (Excel) | period_date | DATE | — | ✅ | ❌ |

---

## Этап 1: Backend — Миграция ✅
**Ответственный:** Backend Agent  
**Статус:** ✅ Завершено (2026-01-29)

### Задачи:
- [x] 1.1 Создать файл миграции `backend/src/migrations/026_create_fin_results_tables.sql`
- [x] 1.2 Создать таблицу `stg.fin_results_upload`
- [x] 1.3 Добавить записи в `dict.upload_mappings` для `fin_results`
- [x] 1.4 Применить миграцию

### SQL для таблицы STG:
```sql
-- Таблица: stg.fin_results_upload
CREATE TABLE IF NOT EXISTS stg.fin_results_upload (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER NOT NULL REFERENCES ing.uploads(id) ON DELETE CASCADE,
  
  -- Иерархия (аналогично balance)
  class VARCHAR(255) NOT NULL,          -- Название (Уровень 1)
  category VARCHAR(255) NOT NULL,       -- Тип (Уровень 2)
  item VARCHAR(500),                    -- 2уровень (Уровень 3)
  subitem TEXT,                         -- Расшифровка (Уровень 4)
  details TEXT,                         -- Комментарии (Уровень 5)
  
  -- Аналитика
  client_type VARCHAR(100),             -- Ф/Ю
  currency_code CHAR(3),                -- Код валюты
  data_source VARCHAR(50),              -- УК (источник: учетные данные / корректировка)
  
  -- Значения
  value NUMERIC(16,4),                  -- Сумма
  period_date DATE NOT NULL,            -- Месяц
  
  -- Аудит
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE stg.fin_results_upload IS 'Staging: данные Financial Results из загруженных файлов';
COMMENT ON COLUMN stg.fin_results_upload.class IS 'Название статьи (Уровень 1): ЧПД, ЧКД, и т.д.';
COMMENT ON COLUMN stg.fin_results_upload.category IS 'Тип (Уровень 2): Процентный доход, Процентный расход';
COMMENT ON COLUMN stg.fin_results_upload.item IS '2уровень (Уровень 3): детализация типа';
COMMENT ON COLUMN stg.fin_results_upload.subitem IS 'Расшифровка (Уровень 4): полное описание';
COMMENT ON COLUMN stg.fin_results_upload.details IS 'Комментарии (Уровень 5)';
COMMENT ON COLUMN stg.fin_results_upload.client_type IS 'Ф/Ю: Физ.лица, Юр.лица, Прочее';
COMMENT ON COLUMN stg.fin_results_upload.currency_code IS 'Код валюты: RUB, USD, EUR';
COMMENT ON COLUMN stg.fin_results_upload.data_source IS 'Источник данных: учетные данные / управленческая корректировка';

CREATE INDEX IF NOT EXISTS idx_stg_fin_results_upload_id ON stg.fin_results_upload(upload_id);
CREATE INDEX IF NOT EXISTS idx_stg_fin_results_period ON stg.fin_results_upload(period_date);
```

### SQL для маппинга:
```sql
INSERT INTO dict.upload_mappings (target_table, source_field, target_field, field_type, is_required, validation_rules)
VALUES 
  ('fin_results', 'Название', 'class', 'varchar', TRUE, NULL),
  ('fin_results', 'Тип', 'category', 'varchar', TRUE, NULL),
  ('fin_results', '2уровень', 'item', 'varchar', FALSE, NULL),
  ('fin_results', 'Расшифровка', 'subitem', 'varchar', FALSE, NULL),
  ('fin_results', 'Комментарии', 'details', 'varchar', FALSE, NULL),
  ('fin_results', 'Ф/Ю', 'client_type', 'varchar', FALSE, NULL),
  ('fin_results', 'Код валюты', 'currency_code', 'varchar', FALSE, '{"maxLength": 3}'::jsonb),
  ('fin_results', 'УК', 'data_source', 'varchar', FALSE, NULL),
  ('fin_results', 'Сумма', 'value', 'numeric', TRUE, NULL),
  ('fin_results', 'Месяц', 'period_date', 'date', TRUE, '{"format": "YYYY-MM-DD"}'::jsonb)
ON CONFLICT (target_table, source_field) DO NOTHING;
```

### Файлы для изменения:
- `backend/src/migrations/019_create_fin_results_tables.sql` (новый)

### Критерии завершения:
- [x] Миграция применена без ошибок
- [x] Таблица `stg.fin_results_upload` создана
- [x] Записи в `dict.upload_mappings` добавлены

---

## Этап 2: Backend — Сервис загрузки ✅
**Ответственный:** Backend Agent  
**Статус:** ✅ Завершено (2026-01-29)

### Задачи:
- [x] 2.1 Обновить `fileParserService.ts` — брать первый лист по умолчанию (уже реализовано)
- [x] 2.2 Обновить `ingestionService.ts` — добавить `loadFinResultsToSTG()`
- [x] 2.3 Обновить `uploadRoutes.ts` — добавить поддержку `target_table = 'fin_results'`
- [x] 2.4 Конвертация Excel-дат работает (используется общий `parseDate`)

### Файлы для изменения:
- `backend/src/services/upload/fileParserService.ts`
- `backend/src/services/upload/ingestionService.ts`

### Критерии завершения:
- [x] Парсер берёт первый лист, если sheetName не указан
- [x] Данные из XLSX корректно вставляются в `stg.fin_results_upload`
- [x] Excel-даты конвертируются правильно

---

## Этап 3: Frontend — UI с двумя кнопками ✅
**Ответственный:** Frontend Agent  
**Статус:** ✅ Завершено (2026-01-29)

### Задачи:
- [x] 3.1 Убрать Select для выбора таблицы
- [x] 3.2 Добавить 2 кнопки: "Загрузить Баланс" и "Загрузить Финрез"
- [x] 3.3 Каждая кнопка устанавливает `targetTable` и открывает file picker
- [x] 3.4 Обновить текст/заголовки для понятности

### Файлы изменены:
- `src/pages/FileUpload.tsx` — заменён Select на 2 кнопки
- `src/components/upload/FileUploader.tsx` — добавлен forwardRef и методы openFilePicker/clearFile

### Макет UI:
```
┌─────────────────────────────────────────┐
│  Загрузка файлов                        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │  Загрузить  │  │   Загрузить     │   │
│  │   Баланс    │  │    Финрез       │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  [Выбранный файл: ...]                  │
│  [Прогресс загрузки]                    │
│                                         │
└─────────────────────────────────────────┘
```

### Критерии завершения:
- [x] UI показывает 2 кнопки вместо Select
- [x] Кнопка "Баланс" загружает в `balance`
- [x] Кнопка "Финрез" загружает в `fin_results`

### data-testid для E2E тестов:
- `btn-upload-balance` — кнопка загрузки баланса
- `btn-upload-fin-results` — кнопка загрузки финреза

---

## Этап 4: Тестирование ✅
**Ответственный:** QA Agent  
**Статус:** ✅ Завершено (2026-01-29)

### Задачи:
- [x] 4.1 Создать тестовый файл `test-data/uploads/fin_results_2025-01.csv`
- [x] 4.2 Проверить загрузку через UI (E2E тесты)
- [x] 4.3 Проверить данные в `stg.fin_results_upload`
- [x] 4.4 Обновить E2E тесты для нового UI (2 кнопки вместо select)

### Результаты тестирования:
- **E2E тесты:** 130 passed, 9 skipped
- **Загрузка fin_results:** ✅ Работает (10 строк успешно загружено)
- **Данные в STG:** ✅ Подтверждено через API `/api/upload`
- **UI с двумя кнопками:** ✅ Работает корректно

### Критерии завершения:
- [x] CSV файл загружается без ошибок
- [x] Данные корректно появляются в STG
- [x] Даты конвертируются правильно
- [x] UI показывает статус загрузки

---

## Инструкции для агентов

### Для Backend Agent:
```
Прочитай файл docs/plans/current/B1_FIN_RESULTS_UPLOAD.md
Выполни Этап 1 (миграция) и Этап 2 (сервис).
После завершения обнови статусы в этом файле.
Обнови docs/context/backend.md с информацией о новых таблицах.
```

### Для Frontend Agent:
```
Прочитай файл docs/plans/current/B1_FIN_RESULTS_UPLOAD.md
Дождись завершения Этапов 1-2.
Выполни Этап 3 (UI).
После завершения обнови статусы в этом файле.
Обнови docs/context/frontend.md с информацией об изменениях UI.
```

### Для QA Agent:
```
Прочитай файл docs/plans/current/B1_FIN_RESULTS_UPLOAD.md
Дождись завершения Этапов 1-3.
Выполни Этап 4 (тестирование).
Создай тестовый файл и проверь все сценарии.
```

---

## Связанные файлы
- Пример структуры: `/FinancialResults structure_no_data.xlsx`
- Существующая миграция Balance: `backend/src/migrations/018_create_upload_tables.sql`
- Сервис загрузки: `backend/src/services/upload/ingestionService.ts`
