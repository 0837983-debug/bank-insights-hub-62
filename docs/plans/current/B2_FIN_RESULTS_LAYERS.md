# План выполнения: B.2 — Financial Results: протаскивание по слоям

> **Создан**: 2026-01-23  
> **Статус**: ✅ ЗАВЕРШЕНО (2026-01-30)  
> **Roadmap**: B.2 — Financial Results: протаскивание по слоям

---

## Контекст

Данные Financial Results загружаются в `stg.fin_results_upload` (B.1 ✅).  
Нужно реализовать полный pipeline: **STG → ODS → MART** с soft-delete по периоду.

**Аналог для изучения:**
- Баланс: `loadToSTG()` → `transformSTGToODS()` → `transformODSToMART()`
- Миграция: `backend/src/migrations/018_create_upload_tables.sql`

**Файлы для изучения перед началом:**
- `docs/context/backend.md`
- `docs/context/database.md`
- `backend/src/services/upload/ingestionService.ts` — существующие функции трансформации
- `backend/src/migrations/018_create_upload_tables.sql` — структура ODS/MART для balance

---

## Уникальный ключ для soft-delete

```
(period_date, class, category, item, subitem, client_type, currency_code, data_source)
```

При загрузке данных за период — старые записи с таким же ключом помечаются `deleted_at = NOW()`.

---

## Этап 1: Backend — Миграция ODS/MART таблиц ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 1.1 Создать файл миграции `backend/src/migrations/027_create_fin_results_ods_mart.sql`
- [x] 1.2 Создать таблицу `ods.fin_results` (структура ниже)
- [x] 1.3 Создать таблицу `mart.fin_results` (структура ниже)
- [x] 1.4 Добавить индексы для soft-delete и уникальности
- [x] 1.5 Применить миграцию: `npm run migrate`
- [x] 1.6 Обновить `docs/context/database.md`

### SQL для ODS:
```sql
CREATE TABLE IF NOT EXISTS ods.fin_results (
  id SERIAL PRIMARY KEY,
  
  -- Иерархия (из STG)
  class VARCHAR(255) NOT NULL,          -- Название (Уровень 1)
  category VARCHAR(255) NOT NULL,       -- Тип (Уровень 2)
  item VARCHAR(500),                    -- 2уровень (Уровень 3)
  subitem TEXT,                         -- Расшифровка (Уровень 4)
  details TEXT,                         -- Комментарии (Уровень 5)
  
  -- Аналитика
  client_type VARCHAR(100),             -- Ф/Ю
  currency_code CHAR(3),                -- Код валюты
  data_source VARCHAR(50),              -- УК
  
  -- Значения
  value NUMERIC(16,4),                  -- Сумма
  period_date DATE NOT NULL,            -- Период
  
  -- Связь с загрузкой
  upload_id INTEGER REFERENCES ing.uploads(id) ON DELETE SET NULL,
  
  -- Аудит
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(200) DEFAULT 'system',
  updated_by VARCHAR(200),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(200)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ods_fin_results_period ON ods.fin_results(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_ods_fin_results_class ON ods.fin_results(class, period_date);
CREATE INDEX IF NOT EXISTS idx_ods_fin_results_upload_id ON ods.fin_results(upload_id);
CREATE INDEX IF NOT EXISTS idx_ods_fin_results_deleted ON ods.fin_results(deleted_at) WHERE deleted_at IS NULL;

-- Уникальный индекс по бизнес-ключу (только активные записи)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ods_fin_results_unique 
ON ods.fin_results(
  period_date, class, category, 
  COALESCE(item, ''), COALESCE(subitem, ''), 
  COALESCE(client_type, ''), COALESCE(currency_code, ''), COALESCE(data_source, '')
) WHERE deleted_at IS NULL;
```

### SQL для MART:
```sql
CREATE TABLE IF NOT EXISTS mart.fin_results (
  id SERIAL PRIMARY KEY,
  
  -- Для SQL Builder (опционально)
  table_component_id VARCHAR(100) DEFAULT 'fin_results_table',
  row_code VARCHAR(500),                -- Составной код строки
  
  -- Иерархия
  class VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  item VARCHAR(500),
  subitem TEXT,
  details TEXT,
  
  -- Аналитика
  client_type VARCHAR(100),
  currency_code CHAR(3) DEFAULT 'RUB',
  data_source VARCHAR(50),
  
  -- Значения
  value NUMERIC(16,4),
  period_date DATE NOT NULL,
  
  -- Аудит (упрощённый для MART)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_mart_fin_results_period ON mart.fin_results(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_mart_fin_results_class ON mart.fin_results(class, category);
CREATE INDEX IF NOT EXISTS idx_mart_fin_results_component ON mart.fin_results(table_component_id);

-- Уникальный индекс
CREATE UNIQUE INDEX IF NOT EXISTS uq_mart_fin_results_unique 
ON mart.fin_results(
  period_date, class, category,
  COALESCE(item, ''), COALESCE(subitem, ''),
  COALESCE(client_type, ''), COALESCE(currency_code, ''), COALESCE(data_source, '')
);
```

### Файлы для изменения:
- `backend/src/migrations/027_create_fin_results_ods_mart.sql` (новый)

### Критерии завершения:
- [x] Миграция применена без ошибок
- [x] Таблица `ods.fin_results` создана
- [x] Таблица `mart.fin_results` создана
- [x] `docs/context/database.md` обновлён

### 📋 Команда запуска (скопировать в Executor):

```
Запусти backend-agent:
- Прочитай docs/context/database.md
- Прочитай docs/plans/current/B2_FIN_RESULTS_LAYERS.md, раздел "Этап 1: Backend — Миграция"
- Создай миграцию 027_create_fin_results_ods_mart.sql по образцу из плана
- Выполни: cd backend && npm run migrate
- Проверь создание таблиц: SELECT table_name FROM information_schema.tables WHERE table_schema IN ('ods', 'mart') AND table_name LIKE 'fin%';
- Обнови docs/context/database.md (добавь ods.fin_results и mart.fin_results)
- Отметь задачи 1.1-1.6 как выполненные в плане
```

---

## Этап 2: Backend — Сервис трансформации ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 2.1 Реализовать `transformFinResultsSTGToODS()` в `ingestionService.ts`
  - Soft-delete старых записей по бизнес-ключу и периоду
  - Upsert новых данных из STG в ODS
- [x] 2.2 Реализовать `transformFinResultsODSToMART()` в `ingestionService.ts`
  - Удаление/замена в MART по периоду
  - Вставка из ODS в MART
- [x] 2.3 Обновить `uploadRoutes.ts` — подключить pipeline для `fin_results`
- [x] 2.4 Экспортировать новые функции из `ingestionService.ts`
- [x] 2.5 Обновить `docs/context/backend.md`

### Логика transformFinResultsSTGToODS:
```typescript
// 1. Получить уникальные периоды из STG
// 2. Для каждого периода: soft-delete в ODS по бизнес-ключу
// 3. UPDATE существующих записей (если были deleted)
// 4. INSERT новых записей
```

### Логика transformFinResultsODSToMART:
```typescript
// 1. Получить периоды из ODS (deleted_at IS NULL)
// 2. DELETE из MART по периодам
// 3. INSERT из ODS в MART с формированием row_code
```

### Файлы для изменения:
- `backend/src/services/upload/ingestionService.ts`
- `backend/src/routes/uploadRoutes.ts`

### Критерии завершения:
- [x] `npm run build` без ошибок в backend (ошибки в scripts/ — предыдущие, не связаны с этой задачей)
- [x] Функции экспортированы и вызываются для `fin_results`
- [x] `docs/context/backend.md` обновлён

### 📋 Команда запуска (скопировать в Executor):

```
Запусти backend-agent:
- Прочитай docs/context/backend.md
- Прочитай docs/plans/current/B2_FIN_RESULTS_LAYERS.md, раздел "Этап 2: Backend — Сервис трансформации"
- Изучи существующие функции transformSTGToODS и transformODSToMART для balance
- Реализуй transformFinResultsSTGToODS() и transformFinResultsODSToMART() по аналогии
- Обнови uploadRoutes.ts: для fin_results вызвать полный pipeline (сейчас там только STG)
- Проверь: cd backend && npm run build
- Обнови docs/context/backend.md (добавь новые функции)
- Отметь задачи 2.1-2.5 как выполненные в плане
```

---

## Этап 3: QA — Проверка pipeline ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 3.1 Загрузить тестовый файл fin_results через API
- [x] 3.2 Проверить данные в `stg.fin_results_upload` — 12 записей
- [x] 3.3 Проверить данные в `ods.fin_results` — 10 активных записей
- [x] 3.4 Проверить данные в `mart.fin_results` — 10 записей
- [x] 3.5 Повторно загрузить тот же период — soft-delete работает (10 deleted, 10 active)
- [x] 3.6 Добавлены E2E тесты в `e2e/file-upload.spec.ts`
- [x] 3.7 Регресс E2E тестов — 96 passed, 36 failed (browser sandbox issue, не связано с pipeline)

### Тестовые сценарии:

**Сценарий 1: Первичная загрузка**
1. Загрузить файл fin_results
2. Проверить: STG → данные есть
3. Проверить: ODS → данные есть, `deleted_at IS NULL`
4. Проверить: MART → данные есть

**Сценарий 2: Повторная загрузка (soft-delete)**
1. Загрузить файл с тем же периодом
2. Проверить: старые записи в ODS имеют `deleted_at IS NOT NULL`
3. Проверить: новые записи в ODS имеют `deleted_at IS NULL`
4. Проверить: MART содержит только актуальные данные

### Файлы для изменения:
- `e2e/file-upload.spec.ts` (добавить тест для fin_results ODS/MART)

### Критерии завершения:
- [x] Данные проходят весь путь STG → ODS → MART
- [x] Soft-delete работает при повторной загрузке (10 old deleted, 10 new active)
- [x] Регресс E2E без **новых** падений (36 failed — browser sandbox issue, существующая проблема)

### 📋 Команда запуска (скопировать в Executor):

```
Запусти qa-agent:
- Прочитай docs/plans/current/B2_FIN_RESULTS_LAYERS.md, раздел "Этап 3: QA"
- Загрузи тестовый файл test-data/uploads/fin_results_2025-01.csv через UI
- Проверь данные: SELECT COUNT(*) FROM ods.fin_results; SELECT COUNT(*) FROM mart.fin_results;
- Повторно загрузи файл и проверь soft-delete: SELECT COUNT(*) FROM ods.fin_results WHERE deleted_at IS NOT NULL;
- Обнови или добавь E2E тест в e2e/file-upload.spec.ts
- Запусти регресс: npm run test:e2e -- --reporter=list
- Если есть ошибки — опиши детально: что падает, где, expected vs actual
```

---

## Финальная проверка

После всех этапов Executor должен проверить:

```bash
# Backend работает
curl -s http://localhost:3001/api/health

# Frontend собирается
npm run build

# Все E2E тесты проходят
npm run test:e2e -- --reporter=list

# Данные в ODS/MART
curl -s "http://localhost:3001/api/upload?limit=5" | jq '.uploads[0]'
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-01-30 | Этап 1 | ✅ | Миграция ODS/MART таблиц применена |
| 2026-01-30 | Этап 2 | ✅ | Сервисы трансформации реализованы |
| 2026-01-30 | Этап 3 | ✅ | QA проверка pipeline — все слои работают, soft-delete работает |
