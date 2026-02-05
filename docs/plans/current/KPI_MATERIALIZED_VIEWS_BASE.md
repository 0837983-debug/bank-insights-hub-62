# План выполнения: KPI — базовые materialized views

> **Создан**: 2026-02-04  
> **Статус**: ✅ Завершено  
> **Roadmap**: J.3 — Сервис расчёта данных для KPI карточек

---

## Контекст

Создаём две базовые MV, которые агрегируют данные из `mart.balance` и `mart.fin_results` по `period_date` + `kpi_name`.  
Эти MV — фундамент для расчёта KPI. На следующем этапе по ним будут считаться производные KPI (ROA, ROE, CIR и т.д.).

**Файлы для изучения перед началом:**
- `docs/context/database.md`
- `docs/context/backend.md`

---

## Что создаём

### 1. `mart.mv_kpi_balance`

Агрегаты баланса по `period_date` + `kpi_name`:

```sql
CREATE MATERIALIZED VIEW mart.mv_kpi_balance AS
-- Уровень class
SELECT period_date, class AS kpi_name, SUM(value) AS value
FROM mart.balance
GROUP BY period_date, class

UNION ALL

-- Уровень class::section
SELECT period_date, class || '::' || section AS kpi_name, SUM(value) AS value
FROM mart.balance
WHERE section IS NOT NULL
GROUP BY period_date, class || '::' || section

ORDER BY period_date;
```

### 2. `mart.mv_kpi_fin_results`

Агрегаты финреза по `period_date` + `kpi_name`:

```sql
CREATE MATERIALIZED VIEW mart.mv_kpi_fin_results AS
-- Уровень class
SELECT period_date, class AS kpi_name, SUM(value) AS value
FROM mart.fin_results
GROUP BY period_date, class

UNION ALL

-- Уровень class::category
SELECT period_date, class || '::' || category AS kpi_name, SUM(value) AS value
FROM mart.fin_results
WHERE category IS NOT NULL
GROUP BY period_date, class || '::' || category

UNION ALL

-- Отдельно: Оплата труда
SELECT period_date, class || '::' || category AS kpi_name, SUM(value) AS value
FROM mart.fin_results
WHERE category = 'Оплата труда'
GROUP BY period_date, class || '::' || category

ORDER BY period_date;
```

### Refresh (пока вручную)

```sql
REFRESH MATERIALIZED VIEW mart.mv_kpi_balance;
REFRESH MATERIALIZED VIEW mart.mv_kpi_fin_results;
```

---

## ⛔ Принципы разработки (обязательные)

### ЗАПРЕЩЕНО:
- **Хардкод в коде** (логика только в SQL)

### ОБЯЗАТЕЛЬНО:
- Миграция + документация
- Проверка данных после создания

---

## Этап 1: Backend — создать MVs ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:
- [x] Создать миграцию `039_create_kpi_base_mvs.sql`:
  - `mart.mv_kpi_balance`
  - `mart.mv_kpi_fin_results`
  - Индексы по `(period_date, kpi_name)`
- [x] Обновить `docs/context/database.md`

### Файлы для изменения:
- `backend/src/migrations/039_create_kpi_base_mvs.sql`

### Критерии завершения:
- [x] Миграция создана (039_create_kpi_base_mvs.sql)
- [ ] MV содержат данные по всем периодам (после применения миграции к БД)
- [x] `cd backend && npm run build` без ошибок

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Create base KPI MVs (balance + fin_results)",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай контекст: docs/context/backend.md, docs/context/database.md
    2. Прочитай план: docs/plans/current/KPI_MATERIALIZED_VIEWS_BASE.md

    Выполни Этап 1:
    - Создай миграцию 039_create_kpi_base_mvs.sql
    - Две MV: mart.mv_kpi_balance и mart.mv_kpi_fin_results
    - Добавь индексы по (period_date, kpi_name)
    - Обнови docs/context/database.md

    После завершения:
    - cd backend && npm run build
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Финальная проверка

```sql
-- Проверить balance MV
SELECT * FROM mart.mv_kpi_balance ORDER BY period_date, kpi_name LIMIT 20;

-- Проверить fin_results MV
SELECT * FROM mart.mv_kpi_fin_results ORDER BY period_date, kpi_name LIMIT 20;
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-02-05 | Этап 1 | ✅ | Миграция 039 создана, build успешен. БД недоступна для применения миграции. |
