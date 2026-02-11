# План выполнения: Разделение query_id и data_source_key + KPI mapping

> **Создан**: 2026-01-23  
> **Статус**: 🔄 В работе (Этапы 1-4, 6 ✅)  
> **Roadmap**: `docs/plans/ROADMAP.md` — J.3

---

## Контекст

Сейчас `data_source_key` используется как `query_id`, из-за чего смешиваются разные смыслы. Требуется:
1) Ввести отдельное поле `query_id` в `config.components` и отдавать его в layout.  
2) `data_source_key` использовать как ключ внутри KPI‑набора (tech_kpi_name).  
3) Обновить `mart.v_kpi_all`, чтобы возвращать `component_id` по KPI.

**Файлы для изучения перед началом:**
- `docs/context/backend.md`
- `docs/context/frontend.md`
- `docs/context/database.md`
- `docs/architecture/layout.md`
- `docs/api/get-data.md`

---

## Этап 1: Backend ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ⏸️ Ожидает

### Задачи:
- [x] Добавить колонку `query_id` в `config.components` (SQL миграция).
- [x] Перенести реальные `query_id` в `config.components.query_id` для таблиц, кнопок, header.
- [x] Обновить `config.layout_sections_json_view`: отдавать `queryId` из `components.query_id` для компонентов/кнопок/header.
- [x] Проверить `/api/data?query_id=layout`: в JSON есть `queryId`, `dataSourceKey` больше не используется как query.
- [x] Обновить `docs/context/database.md` и `docs/context/backend.md`.

### Файлы для изменения:
- `backend/src/migrations/0xx_add_query_id_to_components.sql`
- `backend/src/migrations/0xx_update_layout_view_query_id.sql`
- `docs/context/database.md`
- `docs/context/backend.md`

### Критерии завершения:
- [x] `config.components.query_id` существует и заполнен для table/button/header.
- [x] Layout JSON содержит `queryId` для table/button/header.
- [x] `GET /api/data?query_id=layout` работает без ошибок.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Add query_id and update layout view",
  prompt: `
    Прочитай контекст: docs/context/backend.md, docs/context/database.md
    Прочитай план: docs/plans/current/J3_QUERY_ID_AND_KPI_MAPPING.md, раздел "Этап 1: Backend"
    
    Выполни все задачи из раздела.
    
    После завершения:
    - Проверь компиляцию: cd backend && npm run build
    - Обнови docs/context/backend.md и docs/context/database.md
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 2: Frontend ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [x] Добавить `queryId` в типы layout (компоненты, кнопки, header).
- [x] Перевести загрузку таблиц/кнопок/header на `queryId` из layout.
- [x] Удалить fallback на `dataSourceKey` для query (без обратной совместимости).
- [ ] Обновить E2E тесты, которые ожидают `dataSourceKey` в layout. *(отложено до Этапа 5)*
- [x] Прогнать `npm run test:frontend`.
- [x] Обновить `docs/context/frontend.md`.

### Файлы для изменения:
- `src/lib/api.ts`
- `src/hooks/useAPI.ts`
- `src/pages/DynamicDashboard.tsx`
- `e2e/layout-data-source-key.spec.ts`
- `docs/context/frontend.md`

### Критерии завершения:
- [x] Таблицы и кнопки получают данные через `queryId` из layout.
- [x] Header использует `queryId` из layout.
- [x] Тесты фронта проходят (60/60).

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "frontend-agent",
  description: "Use queryId from layout for getData",
  prompt: `
    Прочитай контекст: docs/context/frontend.md
    Прочитай план: docs/plans/current/J3_QUERY_ID_AND_KPI_MAPPING.md, раздел "Этап 2: Frontend"
    
    Выполни все задачи из раздела.
    
    После завершения:
    - Проверь сборку: npm run build
    - Прогони тесты: npm run test:frontend
    - Обнови docs/context/frontend.md
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 3: Backend ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [x] Заполнить `config.components.data_source_key` для KPI‑карточек значением `tech_kpi_name`.
- [x] Обновить `mart.v_kpi_all`: добавить `component_id` через JOIN с `config.components` по `data_source_key = kpi_name` (только `component_type='card'`).
- [x] Обновить `config.component_queries` для `query_id = 'kpis'`, чтобы возвращался `component_id`.
- [x] Обновить `docs/context/database.md` и `docs/context/backend.md`.

### Файлы для изменения:
- `backend/src/migrations/052_update_v_kpi_all_and_query.sql` ✅
- `backend/src/migrations/054_set_kpi_data_source_key.sql` ✅
- `docs/context/database.md` ✅
- `docs/context/backend.md` ✅

### Критерии завершения:
- [x] `mart.v_kpi_all` возвращает `component_id`.
- [x] `GET /api/data?query_id=kpis` возвращает строки с `componentId`.
- [x] `data_source_key` у KPI‑карточек = `tech_kpi_name`.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Map KPI to component_id in v_kpi_all",
  prompt: `
    Прочитай контекст: docs/context/backend.md, docs/context/database.md
    Прочитай план: docs/plans/current/J3_QUERY_ID_AND_KPI_MAPPING.md, раздел "Этап 3: Backend"
    
    Выполни все задачи из раздела.
    
    После завершения:
    - Проверь компиляцию: cd backend && npm run build
    - Обнови docs/context/backend.md и docs/context/database.md
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 4: Frontend ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Этап 3 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [x] Перевести загрузку KPI на `getData(query_id='kpis')` — уже было реализовано в `fetchAllKPIs`.
- [x] Обновить сопоставление KPI в `KPICard` по `componentId` из данных — добавлен `componentId` в интерфейс `KPIMetric`, упрощён код сопоставления.
- [x] Обновить интерфейс `KPIMetric` — добавлены `componentId`, `p2Value`, `p3Value`.
- [x] Прогнать `npm run test:frontend` — 60/60 тестов проходят.
- [x] Обновить `docs/context/frontend.md` — добавлен раздел "KPI загрузка через componentId".

**Примечание**: Backend по-прежнему возвращает KPI как массив напрямую (без обёртки `{ componentId, type, rows }`). Frontend поддерживает оба формата в `fetchAllKPIs` для совместимости. Рекомендуется унифицировать формат на backend в будущем.

### Файлы для изменения:
- `src/lib/api.ts`
- `src/hooks/useAPI.ts`
- `src/components/KPICard.tsx`
- `docs/context/frontend.md`

### Критерии завершения:
- [x] KPI карточки корректно отображаются при данных из `getData(kpis)`.
- [x] Сопоставление по `componentId` вместо `id`.
- [x] Тесты фронта проходят (60/60).

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "frontend-agent",
  description: "Load KPI via getData and map by componentId",
  prompt: `
    Прочитай контекст: docs/context/frontend.md
    Прочитай план: docs/plans/current/J3_QUERY_ID_AND_KPI_MAPPING.md, раздел "Этап 4: Frontend"
    
    Выполни все задачи из раздела.
    
    После завершения:
    - Проверь сборку: npm run build
    - Прогони тесты: npm run test:frontend
    - Обнови docs/context/frontend.md
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 5: QA ⏸️

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 2, 4 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] Прогнать E2E тесты по layout и KPI.
- [ ] Регресс: `npm run test:e2e -- --reporter=list`.
- [ ] Если есть ошибки — оформить отчёт (шаги, ожидание, факт).

### Файлы для изменения:
- `e2e/*.spec.ts` (только при необходимости)
- `docs/plans/reports/QA_LAYOUT_QUERY_ID.md` (если есть баги)

### Критерии завершения:
- [ ] E2E тесты проходят.
- [ ] Таблицы и KPI отображаются корректно.

### 📋 Команда запуска (скопировать в Executor):

```
Запусти qa-agent:
- Прочитай docs/plans/current/J3_QUERY_ID_AND_KPI_MAPPING.md, раздел "Этап 5: QA"
- Запусти: npm run test:e2e -- --reporter=list e2e/layout-data-source-key.spec.ts
- Запусти: npm run test:e2e -- --reporter=list e2e/kpi-cards-display.spec.ts
- Запусти регресс: npm run test:e2e -- --reporter=list
- Если тест падает — исправь или опиши проблему
```

---

## Этап 6: Docs ✅

**Субагент**: `docs-agent`  
**Зависимости**: Этапы 1–4 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [x] Обновить `docs/architecture/layout.md` (queryId vs dataSourceKey).
- [x] Обновить `docs/api/get-data.md` (query_id из layout).
- [x] Обновить `docs/database/schemas.md` (новое поле `query_id`).

### Файлы для изменения:
- `docs/architecture/layout.md` ✅
- `docs/api/get-data.md` ✅
- `docs/database/schemas.md` ✅

### Критерии завершения:
- [x] Документация соответствует новому контракту.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Update docs for queryId and dataSourceKey",
  prompt: `
    Прочитай контекст: docs/context/index.md
    Прочитай план: docs/plans/current/J3_QUERY_ID_AND_KPI_MAPPING.md, раздел "Этап 6: Docs"
    
    Выполни все задачи из раздела.
    
    После завершения:
    - Проверь отображение в VitePress
    - Обнови статус этапа в плане на ✅
  `
)
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
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-02-09 | Этап 1 | ✅ | Миграция 053: query_id добавлен, 20 компонентов обновлено |
| 2026-02-09 | Этап 2 | ✅ | Frontend: queryId в типах, DynamicDashboard использует queryId, тесты 60/60 |
| 2026-02-09 | Этап 3 | ✅ | v_kpi_all с component_id (052), data_source_key для карточек (054), query kpis обновлён |
| 2026-02-09 | Этап 4 | ✅ | KPIMetric: добавлен componentId/p2Value/p3Value, KPICard сопоставляет по componentId, тесты 60/60 |
| 2026-02-09 | Этап 6 | ✅ | Docs: обновлены layout.md, get-data.md, schemas.md — queryId vs dataSourceKey |
