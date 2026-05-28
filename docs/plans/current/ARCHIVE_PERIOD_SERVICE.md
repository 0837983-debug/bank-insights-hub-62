# План выполнения: Архивация periodService и обновление документации

> **Создан**: 2026-01-23  
> **Статус**: ⏸️ Готов к выполнению  
> **Roadmap**: `docs/plans/ROADMAP.md` — J.1

---

## Контекст

`backend/src/services/mart/base/periodService.ts` больше не используется в runtime (только тесты).  
Нужно перенести его в архив с сохранением структуры, зафиксировать в индексе архива и обновить контексты/документацию, где он упоминается.

**Файлы для изучения перед началом:**
- `docs/context/backend.md`
- `docs/context/database.md`
- `docs/guides/restoration.md` (структура архива)

---

## Этап 1: Backend ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено (2026-05-21, повторная валидация)

### Задачи:
- [x] Найти и зафиксировать список файлов для архивации:
  - `backend/src/services/mart/base/periodService.ts`
  - `backend/src/services/mart/base/__tests__/periodService.test.ts`
- [x] Проверить, что runtime‑импортов нет (только тесты).
- [x] Архивировать файлы с сохранением структуры в `archive/`:
  - `archive/backend/src/services/mart/base/periodService.ts`
  - `archive/backend/src/services/mart/base/__tests__/periodService.test.ts`
- [x] Удалить исходные файлы из `backend/` после переноса.
- [x] Обновить/создать индекс архива `archive/ARCHIVED_FILES.md`:
  - Дата, исходный путь, архивный путь, причина.
- [x] Обновить `docs/context/backend.md` (убрать periodService из активных сервисов).
- [x] Обновить `docs/context/database.md` при необходимости — не требуется (нет ссылок на periodService).

### Файлы для изменения:
- `backend/src/services/mart/base/periodService.ts` (удалить)
- `backend/src/services/mart/base/__tests__/periodService.test.ts` (удалить)
- `archive/backend/src/services/mart/base/periodService.ts` (новый)
- `archive/backend/src/services/mart/base/__tests__/periodService.test.ts` (новый)
- `archive/ARCHIVED_FILES.md` (создать/обновить)
- `docs/context/backend.md`
- `docs/context/database.md` (если требуется)

### Критерии завершения:
- [x] Файлы перенесены в `archive/` с сохранением структуры.
- [x] В `backend/` файлов больше нет, сборка не ломается.
- [x] `archive/ARCHIVED_FILES.md` содержит запись.
- [x] Контексты обновлены.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Archive periodService files and update contexts",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/backend-agent.md
    2. Прочитай контекст: docs/context/backend.md, docs/context/database.md
    3. Прочитай docs/guides/restoration.md (структура архива)
    4. Редактируй ТОЛЬКО файлы указанные в плане
    5. НЕ добавляй fallback/legacy логику

    Прочитай план: docs/plans/current/ARCHIVE_PERIOD_SERVICE.md, раздел "Этап 1: Backend"
    
    Выполни все задачи из раздела.
    
    После завершения:
    - Проверь компиляцию: cd backend && npm run build
    - Обнови docs/context/backend.md (и database.md если нужно)
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 2: Docs ✅

**Субагент**: `docs-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено (2026-05-21, повторная синхронизация)

### Задачи:
- [x] Удалить/обновить упоминания periodService в документации:
  - `docs/api/get-data.md`
  - `docs/api/get-data-schema.md`
  - `docs/api/endpoints.md`
  - `docs/architecture/backend/services.md`
  - `docs/architecture/backend/structure.md`
  - `docs/reference/file-structure.md`
- [x] Убедиться, что `header_dates` описан как SQL Builder‑конфиг (через `mart.v_p_dates`).

### Файлы для изменения:
- `docs/api/get-data.md`
- `docs/api/get-data-schema.md`
- `docs/api/endpoints.md`
- `docs/architecture/backend/services.md`
- `docs/architecture/backend/structure.md`
- `docs/reference/file-structure.md`
- `docs/architecture/backend/layers.md`

### Критерии завершения:
- [x] Документация не содержит ссылок на `periodService`.
- [x] Описание `header_dates` соответствует текущей реализации (через SQL Builder и `mart.v_p_dates`).

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Remove periodService references from docs",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/docs-agent.md
    2. Прочитай контекст: docs/context/index.md
    3. Редактируй ТОЛЬКО файлы указанные в плане

    Прочитай план: docs/plans/current/ARCHIVE_PERIOD_SERVICE.md, раздел "Этап 2: Docs"
    
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
# Backend компилируется
cd backend && npm run build
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-02-09 | Этап 1: Backend | ✅ | Файлы архивированы, build успешен, контексты обновлены |
| 2026-02-09 | Этап 2: Docs | ✅ | Упоминания periodService удалены, header_dates описан через SQL Builder |
| 2026-05-21 | Этап 2: Docs | ✅ | Повторно проверены docs: `periodService` отсутствует, `header_dates` описан через SQL Builder-конфиг (`mart.v_p_dates`) без runtime special-case |
