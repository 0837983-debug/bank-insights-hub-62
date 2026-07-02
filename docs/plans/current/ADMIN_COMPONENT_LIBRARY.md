# План выполнения: Admin — библиотека компонентов (уровень A)

> **Создан**: 2026-06-08  
> **Статус**: ⏸️ Готов к выполнению  
> **Roadmap**: Блок I.5 (часть 1)  
> **Приоритет**: P2 (после DB_MIGRATE_INCREMENTAL)  
> **Зависимости**: `DB_MIGRATE_INCREMENTAL` ✅ (желательно, не блокер)

---

## Контекст

**Модель:**
- **Админ** создаёт определения в библиотеке (`config.components`, `component_queries`, `component_fields`)
- **Пользователь** (следующий план `ADMIN_LAYOUT_BUILDER.md`) собирает layout из библиотеки

**Этот план — только уровень A:** CRUD компонентов + preview данных.

**Сценарий приёмки (от заказчика):**
- удалить тестовый компонент и связи
- создать новый компонент (table / KPI card)
- проверить: layout columns, getData, `v_kpi_all` с заполненными полями

**Без auth** — страница `/admin/components` доступна всем (роли позже).

**Файлы для изучения:**
- `docs/context/database.md` — config schema
- `docs/context/backend.md` — layoutService, getData
- `docs/guides/adding-data-source.md`
- `backend/src/services/` — layoutService (только читать; редактировать по плану)

---

## Этап 1: Backend — CRUD API ⏸️

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] Создать `backend/src/routes/adminComponentRoutes.ts`:
  - `GET /api/admin/components` — список (с pagination, filter by type)
  - `GET /api/admin/components/:id` — детали + fields + query config
  - `POST /api/admin/components` — создать component (+ optional query + fields в одном payload)
  - `PUT /api/admin/components/:id` — обновить metadata
  - `DELETE /api/admin/components/:id` — soft delete (`deleted_at`), проверка нет активных layout mappings
- [ ] Создать `backend/src/routes/adminComponentQueryRoutes.ts` (или вложить):
  - `PUT /api/admin/component-queries/:queryId` — upsert `config_json`, `wrap_json`
- [ ] Создать `backend/src/routes/adminComponentFieldRoutes.ts`:
  - CRUD `config.component_fields` по `component_id`
- [ ] Создать `backend/src/services/admin/componentAdminService.ts` — бизнес-логика, валидация:
  - уникальность `id`
  - table → обязателен `query_id`, `wrap_json=true`
  - card → `data_source_key` или KPI technical_name
  - запрет удаления если `layout_component_mapping` ссылается (или cascade warning)
- [ ] `GET /api/admin/components/:id/preview` — proxy getData для component (p1/p2/p3 из header или query params)
- [ ] `GET /api/admin/kpi-catalog` — список из `mart.v_kpi_all` / distinct technical names для привязки карточек
- [ ] Подключить routes в `server.ts`
- [ ] Unit-тесты admin service + routes
- [ ] Обновить `docs/context/backend.md`, `docs/context/database.md`

### Файлы:

- `backend/src/routes/adminComponentRoutes.ts` *(новый)*
- `backend/src/services/admin/componentAdminService.ts` *(новый)*
- `backend/src/server.ts`
- `backend/src/services/admin/__tests__/componentAdminService.test.ts` *(новый)*

### Критерии завершения:

- [ ] CRUD через curl/Postman работает
- [ ] Preview возвращает данные для существующего `table_balance`
- [ ] `npm test` в backend проходит

---

## Этап 2: Frontend — UI `/admin/components` ⏸️

**Субагент**: `frontend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] Страница `src/pages/admin/ComponentLibrary.tsx`:
  - таблица компонентов (id, type, title, query_id/data_source_key)
  - кнопки: создать, редактировать, удалить
- [ ] Форма создания/редактирования `src/components/admin/ComponentForm.tsx`:
  - тип: card | table | container
  - для table: query_id, fields editor (минимум: dimension + measure columns)
  - для card: выбор KPI из `/api/admin/kpi-catalog`
- [ ] Preview panel: вызов preview API, JSON или мини-таблица
- [ ] Маршрут `src/App.tsx`: `/admin/components`
- [ ] Ссылка в Header или Dev Tools → Admin (временно, без ролей)
- [ ] API client `src/lib/adminApi.ts`
- [ ] Обновить `docs/context/frontend.md`

### Критерии завершения:

- [ ] Создать тестовый компонент через UI
- [ ] Удалить тестовый компонент
- [ ] Preview показывает данные
- [ ] `npm run build` OK

---

## Этап 3: QA ⏸️

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] E2E: создать table component → preview rows > 0
- [ ] E2E: удалить component → не в списке
- [ ] E2E: KPI card → preview value not null (при seed данных)
- [ ] Отчёт `docs/plans/reports/ADMIN_COMPONENT_LIBRARY_QA.md`

---

## Этап 4: Product Owner Acceptance ⏸️

**Субагент**: `product-owner-agent`  
**Зависимости**: Этап 3 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] Сценарий заказчика: delete → create → verify KPI/view
- [ ] `docs/plans/reports/PO_ADMIN_COMPONENT_LIBRARY_ACCEPTANCE.md`

---

## Следующий план (не в этом scope)

`ADMIN_LAYOUT_BUILDER.md` — уровень B: пользователь собирает layout из библиотеки.

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-06-08 | — | План создан | Admin level A |
