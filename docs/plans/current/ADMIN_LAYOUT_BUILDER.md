# План выполнения: User — сборка дашборда из библиотеки (уровень B)

> **Создан**: 2026-06-08  
> **Статус**: ⏸️ Ожидает (зависит от ADMIN_COMPONENT_LIBRARY)  
> **Roadmap**: Блок I.5 (часть 2)  
> **Приоритет**: P3  
> **Зависимости**: `ADMIN_COMPONENT_LIBRARY` ✅

---

## Контекст

Пользователь **не создаёт** queries/fields — только собирает дашборд из **библиотеки** компонентов (уровень A).

**Сущности:**
- `config.layouts` — набор дашбордов
- `config.layout_component_mapping` — иерархия секций и порядок компонентов

**Цель:** UI `/admin/layouts/:layoutId/edit` — drag&drop секций, добавление компонентов из библиотеки, сохранение в БД.

**Без auth** на первом этапе.

---

## Этап 1: Backend — Layout CRUD API ⏸️

**Субагент**: `backend-agent`  
**Зависимости**: `ADMIN_COMPONENT_LIBRARY` ✅

### Задачи:

- [ ] `GET /api/admin/layouts` — список layouts
- [ ] `GET /api/admin/layouts/:id` — дерево mapping + component metadata
- [ ] `PUT /api/admin/layouts/:id/mapping` — bulk save иерархии (sections + children)
- [ ] `POST /api/admin/layouts/:id/components` — добавить component_id из библиотеки в секцию
- [ ] `DELETE /api/admin/layouts/:id/mapping/:mappingId` — убрать из layout (не удалять из библиотеки)
- [ ] Валидация: component существует, нет циклов parent, display_order
- [ ] Unit-тесты
- [ ] Обновить context files

---

## Этап 2: Frontend — Layout Editor ⏸️

**Субагент**: `frontend-agent`  
**Зависимости**: Этап 1 ✅

### Задачи:

- [ ] `src/pages/admin/LayoutEditor.tsx`
- [ ] Панель библиотеки (read-only список из `/api/admin/components`)
- [ ] Дерево секций main_dashboard (или выбранный layout)
- [ ] Drag&drop порядка (dnd-kit или существующая lib в проекте)
- [ ] Preview дашборда после save
- [ ] Маршрут `/admin/layouts/:layoutId/edit`

---

## Этап 3: QA + PO ⏸️

**Субагент**: `qa-agent`, `product-owner-agent`

### Критерии:

- [ ] Добавить существующий component в секцию → виден на `/`
- [ ] Убрать component из layout → исчез с дашборда, остаётся в библиотеке
- [ ] PO ACCEPTED

---

## История

| Дата | Комментарий |
|------|-------------|
| 2026-06-08 | План создан, ждёт ADMIN_COMPONENT_LIBRARY |
