# План выполнения: App Shell — единая навигация

> **Создан**: 2026-06-08  
> **Статус**: ✅ Завершено  
> **Roadmap**: Блок C.0+ — UX после Docker  
> **Приоритет**: P0 (первый в очереди)  
> **Зависимости**: Нет

---

## Контекст

После демо заказчику нужна единая навигация на всех страницах: **Дашборд**, **Загрузка файлов**, **Dev Tools**.

**Сейчас:**
- `Header` с `NavLink` есть на `/` и `/upload`
- `/dev-tools` **без** общего `Header`
- `NavLink` не передаёт `activeClassName` — активная страница не выделяется

**Цель:** AppShell с Header на всех маршрутах, визуальное выделение текущей страницы. **Без ролей** (auth — позже).

**Файлы для изучения:**
- `src/components/Header.tsx`
- `src/components/NavLink.tsx`
- `src/App.tsx`
- `src/pages/DynamicDashboard.tsx`, `FileUpload.tsx`, `DevTools.tsx`
- `docs/context/frontend.md`

---

## Этап 1: Frontend — AppShell и навигация ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:

- [x] Создать `src/components/AppShell.tsx`:
  - рендерит `<Header />` + `{children}`
  - единый контейнер для контента страниц
- [x] Обновить `src/components/Header.tsx`:
  - стили для `NavLink`: базовый класс + `activeClassName` (фон/underline для активной вкладки)
  - визуальный разделитель между пунктами (`gap`, опционально `|` или border)
  - пункты: `/` (Дашборд), `/upload`, `/dev-tools`
- [x] Обновить `src/App.tsx`:
  - обернуть маршруты в `AppShell` **или** nested route с layout
  - убрать дублирующий `<Header />` из страниц
- [x] Обновить страницы:
  - `src/pages/DynamicDashboard.tsx` — убрать локальный `Header`
  - `src/pages/FileUpload.tsx` — убрать локальный `Header`
  - `src/pages/DevTools.tsx` — контент под AppShell (Header появится автоматически)
- [x] Unit-тест (опционально): `NavLink` / smoke рендер Header с active state
- [x] Обновить `docs/context/frontend.md`

### Файлы для изменения:

- `src/components/AppShell.tsx` *(новый)*
- `src/components/Header.tsx`
- `src/components/NavLink.tsx` *(если нужны дефолтные стили)*
- `src/App.tsx`
- `src/pages/DynamicDashboard.tsx`
- `src/pages/FileUpload.tsx`
- `src/pages/DevTools.tsx`
- `docs/context/frontend.md`

### Критерии завершения:

- [x] На `/`, `/upload`, `/dev-tools` видны одни и те же 3 кнопки
- [x] Активная страница визуально выделена
- [x] `npm run build` без ошибок
- [x] Существующие E2E с `data-testid="nav-link-*"` проходят

### 📋 Команда для Executor:

```javascript
Task(
  subagent_type: "frontend-agent",
  description: "AppShell unified navigation",
  prompt: `
ПЕРЕД НАЧАЛОМ РАБОТЫ:
1. Прочитай контекст: docs/context/frontend.md
2. Редактируй ТОЛЬКО файлы указанные в плане

⛔ ЗАПРЕЩЕНО:
- Редактировать файлы НЕ указанные в плане
- Добавлять auth/роли

Прочитай план: docs/plans/current/APP_SHELL_NAV.md, Этап 1.
Выполни все задачи. npm run build. Обнови docs/context/frontend.md и статус этапа на ✅.
  `
)
```

---

## Этап 2: QA ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] E2E: навигация между `/` → `/upload` → `/dev-tools` → `/`
- [x] Проверить `data-testid="nav-link-dashboard|upload|dev-tools"` на всех страницах
- [x] Добавить проверку active state (класс или aria-current)
- [x] Отчёт `docs/plans/reports/APP_SHELL_NAV_QA.md`

### Файлы:

- `e2e/app-shell-nav.spec.ts` *(новый)* или расширение существующих header-тестов

### Критерии завершения:

- [x] E2E проходит
- [x] QA-отчёт создан

---

## Этап 3: Product Owner Acceptance ✅

**Субагент**: `product-owner-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [x] Проверить UX навигации на трёх страницах
- [x] Отчёт `docs/plans/reports/PO_APP_SHELL_NAV_ACCEPTANCE.md`

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-06-30 | 1 | ✅ Завершено | AppShell, Header active state, unit-тест |
| 2026-06-30 | 2 | ✅ Завершено | E2E app-shell-nav.spec.ts, 2/2 passed |
| 2026-06-30 | 3 | ✅ Завершено | PO ACCEPTED — единая навигация, active state |
