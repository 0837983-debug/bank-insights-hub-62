# UNUSED CODE AUDIT

Дата: 2026-05-28  
План: `docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md`  
Этап: `Этап 3: Code Audit — проверка неиспользуемых файлов`

## Объем аудита

- Прочитаны обязательные источники: `.cursor/agents/backend-agent.md`, `docs/context/backend.md`, `docs/context/frontend.md`, `docs/guides/restoration.md`.
- Проверены группы из этапа:
  - backend services/scripts;
  - frontend components/hooks/lib;
  - e2e/spec;
  - docs-ссылки и индексы восстановления.
- В рамках этапа ничего не удалялось и не архивировалось.

## Кандидаты на архивацию: точно не используется

Критерий: файл существует в репозитории, но не имеет импортов/ссылок вне самого себя и индексного списка `docs/unused-files-list.txt`.

### Frontend UI (shadcn), без фактических импортов в `src/`

- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/radio-group.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/toggle-group.tsx`

Обоснование: по глобальному поиску по репозиторию обнаружены только упоминания в `docs/unused-files-list.txt`, без импортов в runtime-код/тесты.

## Кандидаты на архивацию: требует ручной проверки

Критерий: нет признаков активного использования в npm scripts/runtime, но возможен ручной запуск через CLI/операционные сценарии.

### Legacy backend JS утилиты (корень `backend/`)

- `backend/create-schemas.js`
- `backend/db.config.js`
- `backend/drop-all-tables.js`
- `backend/drop-dashboard-schema.js`
- `backend/list-all-tables.js`
- `backend/refresh-balance-data.js`
- `backend/test-connection.js`

Риск/почему ручная проверка: есть исторические упоминания в документации; такие скрипты часто запускают вручную вне npm scripts.

### Backend TS скрипты-диагностика/ручные утилиты (`backend/src/scripts/`)

- `backend/src/scripts/check-cf-indexes.ts`
- `backend/src/scripts/check-cf-structure.ts`
- `backend/src/scripts/check-kpi-cards.ts`
- `backend/src/scripts/check-kpi-mapping.ts`
- `backend/src/scripts/check-kpis.ts`
- `backend/src/scripts/check-kpis2.ts`
- `backend/src/scripts/check-layout.ts`
- `backend/src/scripts/check-sections.ts`
- `backend/src/scripts/create-schemas.ts`
- `backend/src/scripts/export-config-to-json.ts`
- `backend/src/scripts/read-file.ts`
- `backend/src/scripts/run-field-type-migrations.ts`
- `backend/src/scripts/run-single-migration.ts`

Риск/почему ручная проверка: не привязаны к текущим npm scripts, но часть может использоваться в ad-hoc отладке/поддержке.

### E2E файлы со значимым количеством `skip`

- `e2e/api.integration.spec.ts`
- `e2e/api-get-data.spec.ts`
- `e2e/api-get-data-fix.spec.ts`
- `e2e/api-upload.spec.ts`
- `e2e/security.spec.ts`

Риск/почему ручная проверка: файлы подхватываются Playwright (не "мертвые" автоматически), но содержат пропущенные кейсы и требуют решения QA/Product, а не автоматической архивации.

## Дополнительные находки (не архивация, но важно)

- `docs/unused-files-list.txt` устарел:
  - содержит файлы, которых уже нет в репозитории;
  - содержит как "unused" файлы, которые реально используются (`backend/src/scripts/check-db-connection.ts`, `backend/src/scripts/run-migrations.ts`).
- В проекте есть два индекса неиспользуемых файлов:
  - `docs/unused-files-list.txt`;
  - `docs/unused-files.txt`.
- Обнаружено расхождение документации по восстановлению:
  - используются ссылки и на `docs/RESTORATION_GUIDE.md`, и на `docs/guides/restoration.md`.

## Рекомендации для следующего этапа (архивация по подтверждению)

1. Сначала архивировать блок "точно не используется" из UI-компонентов.
2. Перед архивированием backend-скриптов согласовать владельца операционных сценариев.
3. Для e2e-файлов с `skip` провести отдельный triage (оставить/переписать/архивировать) с QA.
