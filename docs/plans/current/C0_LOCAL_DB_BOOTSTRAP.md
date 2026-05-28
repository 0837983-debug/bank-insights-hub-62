# План выполнения: Локальный перенос БД и подключений

> **Создан**: 2026-01-23  
> **Статус**: ✅ Завершено  
> **Roadmap**: `docs/plans/ROADMAP.md` — C.0

---

## Контекст

Нужно подготовить локальный self‑hosted запуск без облака. Требуется скрипт, который:
1) устанавливает и настраивает PostgreSQL,  
2) накатывает структуру БД (миграции),  
3) загружает справочники (тех. и бизнесовые),  
4) загружает оставшиеся данные (те, что обычно приходят через Excel‑загрузки).

**Файлы для изучения перед началом:**
- `docs/context/backend.md`
- `docs/context/database.md`
- `docs/BACKEND_SETUP.md`
- `backend/src/migrations/`
- `test-data/uploads/`

---

## Этап 1: Backend 🔴

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:
- [x] Определить целевую ОС для скрипта: macOS (при необходимости можно добавить Linux Debian/Ubuntu как дополнительную ветку, но основная — macOS).
- [x] Создать скрипт `scripts/bootstrap-local-db.sh`:
  - установка PostgreSQL (apt/brew) и базовая настройка (user/db, пароль, extensions).
  - Применить миграции (через `npm run migrate` или существующий runner).
  - загрузка справочников (использовать готовые миграции/seed SQL, если есть).
  - загрузка данных через существующий pipeline (CSV/XLSX из `test-data/uploads/` или отдельные SQL/seed).
- [x] Добавить параметры окружения (DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD) и пример `.env.local` или секцию в README.
- [x] Обеспечить идемпотентность: повторный запуск не должен ломать БД.
- [x] Обновить `docs/context/backend.md` и `docs/context/database.md`.

### Файлы для изменения:
- `scripts/bootstrap-local-db.sh`
- `docs/BACKEND_SETUP.md` (или новый doc в `docs/guides/`)
- `docs/context/backend.md`
- `docs/context/database.md`

### Критерии завершения:
- [x] Скрипт устанавливает Postgres и поднимает БД на чистой машине.
- [x] Миграции применяются без ошибок.
- [x] Справочники и данные загружены (минимальный dataset).
- [x] Backend успешно подключается к локальной БД.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Create local DB bootstrap script",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/backend-agent.md
    2. Прочитай контекст: docs/context/backend.md, docs/context/database.md
    3. Редактируй ТОЛЬКО файлы указанные в плане
    4. НЕ добавляй fallback/legacy логику

    Прочитай план: docs/plans/current/C0_LOCAL_DB_BOOTSTRAP.md, раздел "Этап 1: Backend"
    
    Выполни все задачи из раздела.
    
    После завершения:
    - Проверь компиляцию: cd backend && npm run build
    - Обнови docs/context/backend.md и docs/context/database.md
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 2: QA ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено (bootstrap проходит; API `layout`/`header_dates` отвечают по текущему контракту `/api/data`)

### Задачи:
- [x] Запустить `scripts/bootstrap-local-db.sh` на чистой среде (или контейнере).
- [x] Проверить, что API `/api/data?query_id=layout` и `/api/data?query_id=header_dates` работают.
- [x] Зафиксировать проблемы, если есть. (см. `docs/plans/reports/QA_LOCAL_DB_BOOTSTRAP.md`)

### Файлы для изменения:
- `docs/plans/reports/QA_LOCAL_DB_BOOTSTRAP.md` (если есть баги)

### Критерии завершения:
- [x] Скрипт отрабатывает без ошибок.
- [x] API отвечает на базовые запросы.

### 📋 Команда запуска (скопировать в Executor):

```
Запусти qa-agent:
- Прочитай инструкции: .cursor/agents/qa-agent.md
- Прочитай docs/plans/current/C0_LOCAL_DB_BOOTSTRAP.md, раздел "Этап 2: QA"
- Выполни проверку скрипта на чистой среде
- Если есть ошибки — оформи отчёт
```

---

## Этап 3: Docs ✅

**Субагент**: `docs-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [x] Документировать процесс локального развёртывания БД и данных.
- [x] Добавить шаги запуска скрипта и необходимые переменные окружения.

### Файлы для изменения:
- `docs/BACKEND_SETUP.md` (или `docs/guides/local-db.md`)

### Критерии завершения:
- [x] Документация позволяет поднять локальную БД без доп. знаний.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Document local DB bootstrap process",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/docs-agent.md
    2. Прочитай контекст: docs/context/index.md
    3. Редактируй ТОЛЬКО файлы указанные в плане

    Прочитай план: docs/plans/current/C0_LOCAL_DB_BOOTSTRAP.md, раздел "Этап 3: Docs"
    
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
| 2026-05-21 | Этап 1: Backend | ✅ Завершено | Добавлен bootstrap скрипт, обновлены docs/context, проверен backend build |
| 2026-05-22 | Этап 2: QA | ⚠️ Блокер | Первичный прогон: `PostgreSQL did not become ready on 127.0.0.1:5432`; API `layout` и `header_dates` недоступны на `localhost:3001` |
| 2026-05-22 | Этап 2: QA | ⚠️ Блокер | После фикса Darwin-ветки bootstrap дошёл до установки server-формулы и упал на правах Homebrew (`/opt/homebrew/Cellar is not writable`), полноценный QA re-run не завершён |
| 2026-05-22 | Этап 2: QA | ⚠️ Блокер | Повторный QA после фиксов окружения: PostgreSQL стартует, но `npm run migrate` падает с `The server does not support SSL connections`; API `layout` и `header_dates` возвращают `HTTP 000` (backend на `:3001` не поднят) |
| 2026-05-22 | Этап 3: Docs | ✅ Завершено | Обновлён docs/BACKEND_SETUP.md: пошаговый bootstrap, env-переменные, проверка и troubleshooting |
| 2026-05-22 | Этап 2: QA | ✅ Завершено | Переведён bootstrap на curated миграции + deterministic reset/compat fixes; `bash scripts/bootstrap-local-db.sh` проходит, API `/api/data` для `layout` и `header_dates` отдают `HTTP 200` по текущему контракту с обязательными `component_Id`/`parametrs` |
