# Отчёт QA: App Shell — единая навигация (Этап 2)

**Дата**: 2026-06-30  
**Ответственный**: QA Agent  
**Статус**: ✅ Пройдено

---

## Область тестирования

- Единая навигация через `AppShell` + `Header` на маршрутах `/`, `/upload`, `/dev-tools`
- Наличие `data-testid` для пунктов меню
- Визуальное выделение активной вкладки (`aria-current="page"`, классы `font-semibold`, `bg-muted`)

## Созданные тесты

**Файл**: `e2e/app-shell-nav.spec.ts`

| Тест | Описание |
|------|----------|
| `navigates / → /upload → /dev-tools → / with active state` | Полный цикл навигации кликами по nav-link, проверка URL и active state на каждом шаге |
| `shows all nav links on each route when visited directly` | Прямой заход на каждый маршрут: все 3 ссылки видны, активна корректная вкладка |

### Проверяемые селекторы

- `app-shell`, `app-header`, `header-nav`
- `nav-link-dashboard`, `nav-link-upload`, `nav-link-dev-tools`

### Проверка active state

- Активная ссылка: `aria-current="page"`, классы `font-semibold` и `bg-muted`
- Неактивные ссылки: отсутствует `aria-current="page"`

---

## Результаты запуска

```bash
npm run test:e2e -- --reporter=list e2e/app-shell-nav.spec.ts
```

| # | Тест | Результат | Время |
|---|------|-----------|-------|
| 1 | shows all nav links on each route when visited directly | ✅ passed | 2.5s |
| 2 | navigates / → /upload → /dev-tools → / with active state | ✅ passed | 2.6s |

**Итого**: 2 passed (9.5s)

---

## Замечания по окружению

При запуске webServer Playwright зафиксирована ошибка подключения backend к PostgreSQL (`28P01` — аутентификация `bank_local_user`). На прохождение навигационных тестов это **не повлияло**: фронтенд отдаёт страницы и Header без зависимости от данных API.

---

## Баги

Не обнаружено.

---

## Критерии завершения Этапа 2

- [x] E2E: навигация `/` → `/upload` → `/dev-tools` → `/`
- [x] `data-testid="nav-link-*"` на всех страницах
- [x] Проверка active state (aria-current + классы)
- [x] QA-отчёт создан

**Вердикт**: Этап 2 готов к Product Owner Acceptance (Этап 3).
