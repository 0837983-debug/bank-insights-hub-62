# План выполнения: Быстрая диагностика — активы не отображаются на фронте

> **Создан**: 2026-01-23  
> **Обновлён**: 2026-05-23  
> **Статус**: ⏸️ Готов к выполнению  
> **Roadmap**: `docs/plans/ROADMAP.md` — B/J (данные + отображение)

---

## Контекст

Пользователь добавил данные активов в БД, но на фронте они не отображаются.  
Цель этого плана — **быстро диагностировать первопричину** и сложить результат в отдельный `.md` отчёт.  
Исправления в рамках этого плана **не выполняются**.

**Файлы для изучения перед началом:**
- `.cursor/agents/db-agent.md`
- `.cursor/agents/frontend-agent.md`
- `.cursor/agents/qa-agent.md`
- `docs/context/database.md`
- `docs/context/backend.md`
- `docs/context/frontend.md`
- `docs/api/get-data.md`

---

## Контракт результата

Итог диагностики должен быть оформлен в:

`docs/plans/reports/ASSETS_NOT_SHOWING_DIAGNOSTIC.md`

Отчёт должен содержать:
- краткий вердикт: где ломается цепочка (`ODS`, `MART`, `query config`, `layout`, `header_dates`, `frontend render`)
- проверенные SQL/API/UI шаги
- фактические ответы/ошибки
- наиболее вероятную первопричину
- рекомендуемый следующий план исправления

---

## Этап 1: DB + Backend диагностика 🔴

**Субагент**: `db-agent` или `backend-agent`  
**Зависимости**: Нет  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] Проверить наличие данных активов в `ods.balance` по актуальным датам.
- [ ] Проверить наличие данных активов в `mart.balance` / MV по тем же датам.
- [ ] Проверить, был ли выполнен refresh materialized views после загрузки.
- [ ] Проверить `config.component_queries` для `query_id='assets_table'`:
  - `wrap_json`
  - `from`
  - `where`
  - expected params (`p1`, `p2`, `p3`)
  - фильтр по `class` / `tech_class`
- [ ] Проверить прямой API-запрос `/api/data?query_id=assets_table...` и зафиксировать status/body.
- [ ] Проверить `config.layout_sections_json_view` / layout API:
  - есть ли section с таблицей активов
  - есть ли table component
  - есть ли `queryId` для assets table

### Файлы для изменения:
- `docs/plans/reports/ASSETS_NOT_SHOWING_DIAGNOSTIC.md`

### Критерии завершения:
- [ ] Понятно, есть ли данные в ODS.
- [ ] Понятно, есть ли данные в MART.
- [ ] Понятно, отдаёт ли `assets_table` 200/400/empty.
- [ ] Понятно, содержит ли layout таблицу активов.
- [ ] Отчёт создан.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "db-agent",
  description: "Diagnose assets data path",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/db-agent.md
    2. Прочитай контекст: docs/context/database.md, docs/context/backend.md
    3. НЕ меняй структуру БД и НЕ исправляй данные
    4. Ничего не исправляй — только диагностика

    Прочитай план: docs/plans/current/assets_not_showing.md, раздел "Этап 1: DB + Backend диагностика"

    Выполни проверки из раздела.
    Результат оформи в docs/plans/reports/ASSETS_NOT_SHOWING_DIAGNOSTIC.md.

    После завершения:
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 2: Frontend/QA подтверждение ⏸️

**Субагент**: `qa-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] Открыть UI и воспроизвести проблему.
- [ ] Проверить network для `layout`, `header_dates`, `assets_table`.
- [ ] Проверить, приходит ли table component для активов в layout.
- [ ] Проверить, приходит ли rows в `assets_table`.
- [ ] Дополнить `docs/plans/reports/ASSETS_NOT_SHOWING_DIAGNOSTIC.md` UI/network выводами.

### Файлы для изменения:
- `docs/plans/reports/ASSETS_NOT_SHOWING_DIAGNOSTIC.md`

### Критерии завершения:
- [ ] UI/network подтверждают или уточняют вывод Этапа 1.
- [ ] В отчёте есть итоговый вердикт и следующий рекомендуемый fix-plan.

### 📋 Команда запуска (скопировать в Executor):

```
Запусти qa-agent:
- Прочитай инструкции: .cursor/agents/qa-agent.md
- Прочитай контекст: docs/context/frontend.md, docs/context/backend.md
- Прочитай docs/plans/current/assets_not_showing.md, раздел "Этап 2: Frontend/QA подтверждение"
- Ничего не исправляй — только проверь UI/network
- Дополни docs/plans/reports/ASSETS_NOT_SHOWING_DIAGNOSTIC.md
```

---

## Финальная проверка

Executor должен проверить, что создан отчёт:

```bash
test -f docs/plans/reports/ASSETS_NOT_SHOWING_DIAGNOSTIC.md
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-05-23 | Переформатирование плана | ⏸️ | План переведён в режим быстрой диагностики без исправлений |
