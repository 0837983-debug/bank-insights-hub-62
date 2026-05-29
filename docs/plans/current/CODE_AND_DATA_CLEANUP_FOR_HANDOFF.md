# План выполнения: Упрощённая чистка проекта перед передачей

> **Создан**: 2026-05-28  
> **Обновлён**: 2026-05-28  
> **Статус**: ⏸️ Готов к выполнению  
> **Roadmap**: `docs/plans/ROADMAP.md` — H.6 / C.0

---

## Контекст

Нужно подготовить проект к передаче внешнему разработчику: убрать реальные данные, оставить воспроизводимую структуру БД, технические справочники/конфиги и тестовый dataset.  
Процесс должен быть максимально простой и проверяемый.

**Критически важно:**
- Не коммитить реальные `.env`, credentials, ключи, prod dumps.
- Боевые числовые значения в чувствительных таблицах должны быть заменены на случайные.
- Старые миграции не удалять безвозвратно: архивировать с сохранением структуры/индекса.
- После архивации файлов обязательно прогонять тесты; если тесты падают из-за архивированного файла — вернуть файл.

**Файлы для изучения перед началом:**
- `.cursor/agents/db-agent.md`
- `.cursor/agents/backend-agent.md`
- `.cursor/agents/qa-agent.md`
- `.cursor/agents/docs-agent.md`
- `docs/context/backend.md`
- `docs/context/database.md`
- `docs/context/frontend.md`
- `docs/guides/restoration.md`

---

## Этап 1: DB Cleanup + Dumps 🔴

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] Прочитать инструкции `.cursor/agents/backend-agent.md`.
- [ ] Прочитать `docs/context/backend.md` и `docs/context/database.md`.
- [ ] Удалить данные из `stg.*`.
- [ ] В `ods.balance` и `ods.fin_results` заменить чувствительные числовые значения на случайные:
  - не менять структуру строк;
  - сохранить периоды, классы, статьи, справочные поля;
  - менять только числовые `amount`/`value` поля.
- [ ] Пересчитать все materialized views:
  - `mart.balance`
  - `mart.fin_results`
  - `mart.mv_kpi_balance`
  - `mart.mv_kpi_fin_results`
  - `mart.mv_kpi_derived`
- [ ] Проверить проект на наличие боевых исходников:
  - не тестовые CSV/XLSX/дампы;
  - экспортированные данные;
  - временные файлы с реальными данными.
- [ ] Удалить найденные боевые исходники или перенести в отдельный локальный ignore-only путь, если удаление небезопасно.
- [ ] Архивировать все существующие миграции в `archive/backend/src/migrations/` с сохранением структуры.
- [ ] Создать новую миграцию с полным дампом структуры БД **без данных**.
- [ ] Создать новую миграцию с дампом технических данных:
  - `config.*`
  - `dict.*`
  - справочники
  - query configs
  - layout/config данные
- [ ] Создать отдельный скрипт дампа тестовых данных:
  - ODS тестовые данные после рандомизации;
  - необходимые upload/test records, если они нужны для работы приложения;
  - без реальных исходников.
- [ ] Обновить `docs/context/backend.md` и `docs/context/database.md`.

### Файлы для изменения:
- `backend/src/migrations/`
- `archive/backend/src/migrations/`
- `archive/ARCHIVED_FILES.md`
- `scripts/dump-test-data.sh`
- `scripts/sanitize-sensitive-data.sql` или аналогичный SQL/script
- `docs/context/backend.md`
- `docs/context/database.md`

### Критерии завершения:
- [ ] `stg.*` очищены.
- [ ] Числовые значения в `ods.balance` и `ods.fin_results` рандомизированы.
- [ ] MART MV пересчитаны.
- [ ] Боевые исходники не остаются в проекте.
- [ ] Старые миграции находятся в архиве.
- [ ] Новая миграция структуры без данных создана.
- [ ] Новая миграция технических данных создана.
- [ ] Скрипт дампа тестовых данных создан.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Sanitize DB and recreate migrations",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/backend-agent.md
    2. Прочитай контекст: docs/context/backend.md, docs/context/database.md
    3. Прочитай docs/guides/restoration.md
    4. Редактируй ТОЛЬКО файлы указанные в плане
    5. НЕ коммить реальные .env, credentials, ключи, prod dumps

    Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 1: DB Cleanup + Dumps"

    Выполни все задачи из раздела.

    После завершения:
    - Проверь компиляцию: cd backend && npm run build
    - Обнови docs/context/backend.md и docs/context/database.md
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 2: Archive Unused Files ⏸️

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] Прочитать инструкции `.cursor/agents/backend-agent.md`.
- [ ] Найти неиспользуемые файлы:
  - legacy backend services/scripts;
  - legacy frontend components/hooks/lib;
  - устаревшие tests/specs;
  - устаревшие docs артефакты;
  - временные файлы, дампы, отчеты, которые не нужны для разработки.
- [ ] Архивировать ненужные файлы в `archive/`:
  - либо с сохранением структуры директорий;
  - либо с обязательной записью исходного пути в `archive/ARCHIVED_FILES.md`.
- [ ] Обновить `archive/ARCHIVED_FILES.md`.
- [ ] Обновить `docs/unused-files-list.txt`, если файл используется как индекс.

### Файлы для изменения:
- `archive/**`
- `archive/ARCHIVED_FILES.md`
- `docs/unused-files-list.txt`

### Критерии завершения:
- [ ] Ненужные файлы перенесены в архив.
- [ ] Для каждого архивированного файла понятен исходный путь.
- [ ] Ничего не удалено без возможности восстановления.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Archive unused files with path index",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/backend-agent.md
    2. Прочитай контекст: docs/context/backend.md, docs/context/frontend.md
    3. Прочитай docs/guides/restoration.md
    4. Архивируй только с возможностью восстановления

    Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 2: Archive Unused Files"

    Выполни все задачи из раздела.

    После завершения:
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 3: Test/Restore Loop ⏸️

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] Прочитать инструкции `.cursor/agents/qa-agent.md`.
- [ ] Запустить все тесты:
  - backend tests
  - frontend tests
  - full E2E
  - API regression
  - security regression
- [ ] Если тесты падают из-за ошибочно архивированных файлов:
  - зафиксировать конкретный файл;
  - вернуть его из `archive/` на исходный путь;
  - обновить `archive/ARCHIVED_FILES.md`;
  - повторить тесты.
- [ ] Повторять цикл, пока падения из-за архивации не исчезнут.
- [ ] Если остаются продуктовые/контрактные падения — оформить отдельный отчёт и не скрывать их.
- [ ] Создать отчёт `docs/plans/reports/HANDOFF_CLEANUP_TEST_REPORT.md`.

### Файлы для изменения:
- `docs/plans/reports/HANDOFF_CLEANUP_TEST_REPORT.md`
- `archive/ARCHIVED_FILES.md` (если нужно вернуть ошибочно архивированные файлы)
- восстановленные файлы из `archive/` (только если тесты доказали необходимость)

### Критерии завершения:
- [ ] Все тесты запущены.
- [ ] Ошибочно архивированные файлы восстановлены.
- [ ] Есть отчёт с результатами.
- [ ] Оставшиеся падения классифицированы.

### 📋 Команда запуска (скопировать в Executor):

```
Запусти qa-agent:
- Прочитай инструкции: .cursor/agents/qa-agent.md
- Прочитай контекст: docs/context/frontend.md, docs/context/backend.md, docs/context/database.md
- Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 3: Test/Restore Loop"
- Запусти все тесты
- Если падения вызваны ошибочной архивацией — восстанови файлы из archive и повтори тесты
- Создай docs/plans/reports/HANDOFF_CLEANUP_TEST_REPORT.md
```

---

## Этап 4: Docs ⏸️

**Субагент**: `docs-agent`  
**Зависимости**: Этапы 1, 3 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] Прочитать инструкции `.cursor/agents/docs-agent.md`.
- [ ] Актуализировать документацию:
  - как поднять БД из новой структуры;
  - как накатить технические данные;
  - как накатить тестовые данные;
  - что лежит в архиве и как восстановить;
  - что нельзя передавать внешнему разработчику.
- [ ] Обновить контекстные файлы, если после чистки изменилась структура.

### Файлы для изменения:
- `docs/BACKEND_SETUP.md`
- `docs/guides/restoration.md`
- `docs/reference/file-structure.md`
- `docs/context/backend.md`
- `docs/context/database.md`
- `docs/context/frontend.md` (если требуется)

### Критерии завершения:
- [ ] Документация описывает новый порядок восстановления БД.
- [ ] Документация описывает архив и восстановление файлов.
- [ ] Внешний разработчик может поднять dev/test контур без реальных данных.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Update docs after handoff cleanup",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/docs-agent.md
    2. Прочитай контекст: docs/context/index.md, docs/context/backend.md, docs/context/database.md
    3. Прочитай docs/plans/reports/HANDOFF_CLEANUP_TEST_REPORT.md
    4. Редактируй ТОЛЬКО docs/context файлы указанные в плане

    Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 4: Docs"

    Выполни все задачи из раздела.

    После завершения:
    - Проверь отображение в VitePress
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 5: Product Owner Acceptance ⏸️

**Субагент**: `product-owner-agent`  
**Зависимости**: Этапы 1–4 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] Проверить, что проект безопасен для передачи внешнему разработчику:
  - реальные числовые данные заменены;
  - боевые исходники удалены/не передаются;
  - миграции пересобраны в понятный стартовый набор;
  - тестовые данные можно накатить отдельным скриптом;
  - документация понятна.
- [ ] Создать acceptance report.

### Файлы для изменения:
- `docs/plans/reports/PO_CODE_AND_DATA_CLEANUP_FOR_HANDOFF_ACCEPTANCE.md`

### Критерии завершения:
- [ ] Вердикт `ACCEPTED`, `CHANGES_REQUESTED` или `BLOCKED` зафиксирован.

### 📋 Команда запуска (скопировать в Executor):

```
Запусти product-owner-agent:
- Прочитай инструкции: .cursor/agents/product-owner-agent.md
- Прочитай контекст: docs/context/frontend.md, docs/context/backend.md, docs/context/database.md
- Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 5: Product Owner Acceptance"
- Прочитай QA-отчет docs/plans/reports/HANDOFF_CLEANUP_TEST_REPORT.md
- Создай docs/plans/reports/PO_CODE_AND_DATA_CLEANUP_FOR_HANDOFF_ACCEPTANCE.md
- Если вердикт CHANGES_REQUESTED или BLOCKED — не закрывай план, сообщи Team Lead
```

---

## Финальная проверка

После всех этапов Executor должен проверить:

```bash
# Backend собирается
cd backend && npm run build

# Frontend собирается
npm run build

# Есть обязательные отчеты
test -f docs/plans/reports/HANDOFF_CLEANUP_TEST_REPORT.md
test -f docs/plans/reports/PO_CODE_AND_DATA_CLEANUP_FOR_HANDOFF_ACCEPTANCE.md
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| | | | |
# План выполнения: Чистка кода и данных перед передачей внешнему разработчику

> **Создан**: 2026-05-28  
> **Статус**: ⏸️ Готов к выполнению  
> **Roadmap**: `docs/plans/ROADMAP.md` — H.6 / C.0

---

## Контекст

Проект нужно подготовить к передаче внешнему разработчику без доступа к реальным данным и без устаревшего/мёртвого кода.  
Цель: получить безопасный dev/test контур с тестовыми данными, понятной документацией и актуальным списком неиспользуемых файлов.

**Критически важно:**
- Пока нет разделения на продуктовую и тестовую среды, изменения нужно вносить непосредственно в текущую среду.
- В существующей продуктовой базе заменить числовые значения на случайные, чтобы получить тестовые данные.
- Не коммитить реальные данные, реальные `.env`, дампы prod, ключи и credentials.
- Любые операции очистки данных должны иметь защиту от случайного запуска на prod.
**Файлы для изучения перед началом:**
- `.cursor/agents/db-agent.md`
- `.cursor/agents/backend-agent.md`
- `.cursor/agents/docs-agent.md`
- `.cursor/agents/qa-agent.md`
- `docs/context/backend.md`
- `docs/context/database.md`
- `docs/context/frontend.md`
- `docs/guides/restoration.md`
- `archive/ARCHIVED_FILES.md` (если существует)
- `docs/unused-files-list.txt`

---

## Этап 1: DB Audit — инвентаризация данных ✅

**Субагент**: `db-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:
- [ ] Прочитать инструкции `.cursor/agents/db-agent.md`.
- [ ] Прочитать контекст `docs/context/database.md`.
- [ ] Составить список таблиц/VIEW/MV по схемам: `config`, `dict`, `ods`, `stg`, `mart`, `ing`, `log`.
- [ ] Разделить данные на категории:
  - **Сохранять как справочники/конфиг:** технические и бизнесовые справочники, layout, formats, query configs.
  - **Заменять на тестовые:** ODS/STG бизнес-данные, загрузки Excel/CSV, upload history, logs с чувствительными данными.
  - **Пересоздавать автоматически:** MART MV/VIEW через refresh/migrations.
- [ ] Проверить, где могут храниться реальные банковские данные: `ods.*`, `stg.*`, `ing.uploads`, `log.*`, тестовые дампы/CSV/XLSX.
- [ ] Подготовить отчёт `docs/plans/reports/DATA_SANITIZATION_AUDIT.md`.

### Файлы для изменения:
- `docs/plans/reports/DATA_SANITIZATION_AUDIT.md`

### Критерии завершения:
- [ ] Есть список таблиц/объектов и решение по каждой категории данных.
- [ ] Понятно, какие данные сохраняются, какие очищаются, какие заменяются тестовыми.
- [ ] Нет DDL и нет изменений структуры БД в этом этапе.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "db-agent",
  description: "Audit database data for sanitization",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/db-agent.md
    2. Прочитай контекст: docs/context/database.md
    3. НЕ выполняй DDL
    4. НЕ изменяй данные
    5. Работай только как аудит/диагностика

    Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 1: DB Audit — инвентаризация данных"

    Выполни задачи из раздела.
    Результат оформи в docs/plans/reports/DATA_SANITIZATION_AUDIT.md.

    После завершения:
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 2: Backend — скрипт замены реальных данных тестовыми ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [ ] Прочитать инструкции `.cursor/agents/backend-agent.md`.
- [ ] Прочитать `docs/context/backend.md`, `docs/context/database.md` и отчёт `docs/plans/reports/DATA_SANITIZATION_AUDIT.md`.
- [ ] Создать безопасный скрипт очистки/засева dev БД, например `scripts/sanitize-and-seed-dev-db.sh`.
- [ ] В скрипте сделать защиту от prod:
  - требовать `ALLOW_DATA_RESET=true`;
  - запрещать запуск при `NODE_ENV=production`;
  - проверять имя БД/host и явно прерываться при подозрении на prod;
  - выводить список затрагиваемых таблиц перед выполнением.
- [ ] Очистить только данные, которые должны быть заменены:
  - `stg.*` бизнес-данные;
  - `ods.*` бизнес-данные;
  - `ing.uploads` / связанные upload records, если содержат реальные имена файлов/метаданные;
  - `log.*`, если содержит пользовательские/операционные реальные данные.
- [ ] Сохранить конфигурацию и справочники:
  - `config.*`;
  - `dict.field_mappings`;
  - `dict.upload_mappings`;
  - `dict.formats` / справочные таблицы.
- [ ] Загрузить тестовые данные через существующий upload pipeline или seed-скрипт:
  - использовать только `test-data/uploads/` или новый синтетический dataset;
  - не использовать реальные файлы/дампы.
- [ ] Refresh MART MV после загрузки тестовых данных.
- [ ] Обновить `docs/context/backend.md` и `docs/context/database.md`.

### Файлы для изменения:
- `scripts/sanitize-and-seed-dev-db.sh`
- `test-data/uploads/*` (только синтетические данные, если нужно)
- `docs/context/backend.md`
- `docs/context/database.md`

### Критерии завершения:
- [ ] Скрипт идемпотентен и безопасно прерывается без `ALLOW_DATA_RESET=true`.
- [ ] После скрипта в БД нет реальных бизнес-данных.
- [ ] Справочники и конфигурация сохранены.
- [ ] Тестовые данные загружены и видны через `/api/data`.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Create safe dev data sanitization script",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/backend-agent.md
    2. Прочитай контекст: docs/context/backend.md, docs/context/database.md
    3. Прочитай docs/plans/reports/DATA_SANITIZATION_AUDIT.md
    4. Редактируй ТОЛЬКО файлы указанные в плане
    5. НЕ добавляй fallback/legacy логику
    6. НЕ коммить реальные данные, дампы, .env, ключи

    Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 2: Backend — скрипт замены реальных данных тестовыми"

    Выполни все задачи из раздела.

    После завершения:
    - Проверь компиляцию: cd backend && npm run build
    - Обнови docs/context/backend.md и docs/context/database.md
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 3: Code Audit — проверка неиспользуемых файлов ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:
- [x] Прочитать инструкции `.cursor/agents/backend-agent.md`.
- [x] Проверить неиспользуемые файлы и legacy-код:
  - backend services/scripts;
  - frontend components/hooks/lib;
  - старые E2E/spec файлы;
  - устаревшие docs ссылки.
- [x] Использовать безопасный подход:
  - не удалять файлы без подтверждения;
  - для кандидатов подготовить список и основание;
  - отдельно отметить “точно не используется” и “требует ручной проверки”.
- [x] Обновить/создать отчёт `docs/plans/reports/UNUSED_CODE_AUDIT.md`.
- [x] Если найдены явно неиспользуемые файлы — подготовить предложения для архивации в `archive/` с сохранением структуры, но не архивировать без отдельного этапа/подтверждения.

### Файлы для изменения:
- `docs/plans/reports/UNUSED_CODE_AUDIT.md`
- `docs/unused-files-list.txt` (если требуется актуализация списка)

### Критерии завершения:
- [x] Есть список кандидатов на архивацию с аргументацией.
- [x] Нет удаления кода в рамках аудита.
- [x] Риск динамического использования отмечен отдельно.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Audit unused files and legacy code",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/backend-agent.md
    2. Прочитай контекст: docs/context/backend.md, docs/context/frontend.md
    3. Прочитай docs/guides/restoration.md
    4. Ничего не удаляй и не архивируй в этом этапе
    5. Подготовь только аудит и рекомендации

    Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 3: Code Audit — проверка неиспользуемых файлов"

    Выполни все задачи из раздела.

    После завершения:
    - Создай/обнови docs/plans/reports/UNUSED_CODE_AUDIT.md
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 4: Docs — актуализация документации для передачи ✅

**Субагент**: `docs-agent`  
**Зависимости**: Этапы 1, 2, 3 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [x] Прочитать инструкции `.cursor/agents/docs-agent.md`.
- [x] Обновить документацию запуска dev/test контура:
  - как поднять БД;
  - как запустить sanitation/seed script;
  - какие данные тестовые;
  - что нельзя передавать внешнему разработчику.
- [x] Обновить документацию по структуре данных:
  - какие схемы содержат справочники;
  - какие схемы содержат тестовые бизнес-данные;
  - как восстановить dev dataset.
- [x] Обновить handoff checklist для внешнего разработчика.

### Файлы для изменения:
- `docs/BACKEND_SETUP.md`
- `docs/guides/local-db.md` (если есть или создать)
- `docs/guides/restoration.md`
- `docs/reference/file-structure.md`
- `docs/context/index.md`

### Критерии завершения:
- [x] Внешний разработчик может поднять dev/test контур без доступа к prod.
- [x] Документация явно запрещает реальные данные/secrets в dev handoff.
- [x] Описан порядок обновления тестового dataset.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Update handoff and sanitized dev docs",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/docs-agent.md
    2. Прочитай контекст: docs/context/index.md, docs/context/backend.md, docs/context/database.md
    3. Прочитай отчёты DATA_SANITIZATION_AUDIT.md и UNUSED_CODE_AUDIT.md
    4. Редактируй ТОЛЬКО docs и context файлы указанные в плане

    Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 4: Docs — актуализация документации для передачи"

    Выполни все задачи из раздела.

    После завершения:
    - Проверь отображение в VitePress
    - Обнови статус этапа в плане на ✅
  `
)
```

---

## Этап 5: QA — проверка чистого dev/test контура ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 2, 4 ✅  
**Статус**: ✅ Завершено (re-run 2026-05-28: strict `header_dates` p1/p2/p3 восстановлен, API baseline + smoke E2E green)

### Задачи:
- [x] Прочитать инструкции `.cursor/agents/qa-agent.md`.
- [x] Запустить sanitation/seed script на dev/test БД.
- [x] Проверить, что базовые API отвечают:
  - `/api/data?query_id=layout`
  - `/api/data?query_id=header_dates`
  - ключевые table/KPI query.
- [x] Прогнать smoke E2E.
- [x] Проверить, что в репозитории нет очевидных prod secrets / `.env` / дампов.
- [x] Создать отчёт `docs/plans/reports/QA_HANDOFF_CLEANUP.md`.

### Файлы для изменения:
- `docs/plans/reports/QA_HANDOFF_CLEANUP.md`

### Критерии завершения:
- [x] Dev/test БД поднимается и заполняется тестовыми данными.
- [x] UI/API работают на тестовых данных.
- [x] Реальные данные и секреты не обнаружены в артефактах передачи.

### 📋 Команда запуска (скопировать в Executor):

```
Запусти qa-agent:
- Прочитай инструкции: .cursor/agents/qa-agent.md
- Прочитай контекст: docs/context/frontend.md, docs/context/backend.md, docs/context/database.md
- Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 5: QA — проверка чистого dev/test контура"
- Проверь sanitation/seed script и базовые API/UI
- Создай отчет docs/plans/reports/QA_HANDOFF_CLEANUP.md
- Если есть ошибки — оформи их с шагами воспроизведения
```

---

## Этап 6: Product Owner Acceptance ✅

**Субагент**: `product-owner-agent`  
**Зависимости**: Этап 5 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [x] Проверить handoff с позиции владельца проекта:
  - внешний разработчик не получает real data/prod access;
  - есть понятная инструкция запуска;
  - тестовые данные достаточны для разработки;
  - документация не вводит в заблуждение.
- [x] Создать acceptance report.

### Файлы для изменения:
- `docs/plans/reports/PO_CODE_AND_DATA_CLEANUP_FOR_HANDOFF_ACCEPTANCE.md`

### Критерии завершения:
- [x] Вердикт `ACCEPTED`, `CHANGES_REQUESTED` или `BLOCKED` зафиксирован.
- [x] Если нужны доработки — они сформулированы как пользовательские/операционные требования.

### 📋 Команда запуска (скопировать в Executor):

```
Запусти product-owner-agent:
- Прочитай инструкции: .cursor/agents/product-owner-agent.md
- Прочитай контекст: docs/context/frontend.md, docs/context/backend.md, docs/context/database.md
- Прочитай план: docs/plans/current/CODE_AND_DATA_CLEANUP_FOR_HANDOFF.md, раздел "Этап 6: Product Owner Acceptance"
- Прочитай QA-отчет docs/plans/reports/QA_HANDOFF_CLEANUP.md
- Проведи приемку handoff-процесса
- Создай docs/plans/reports/PO_CODE_AND_DATA_CLEANUP_FOR_HANDOFF_ACCEPTANCE.md
- Если вердикт CHANGES_REQUESTED или BLOCKED — не закрывай план, сообщи Team Lead
```

---

## Финальная проверка

После всех этапов Executor должен проверить:

```bash
# Backend собирается
cd backend && npm run build

# Frontend собирается
npm run build

# Есть обязательные отчеты
test -f docs/plans/reports/DATA_SANITIZATION_AUDIT.md
test -f docs/plans/reports/UNUSED_CODE_AUDIT.md
test -f docs/plans/reports/QA_HANDOFF_CLEANUP.md
test -f docs/plans/reports/PO_CODE_AND_DATA_CLEANUP_FOR_HANDOFF_ACCEPTANCE.md
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-05-28 | Этап 5 (QA) | 🔴 BLOCKED | `sanitize-and-seed-dev-db.sh` падал на upload balance (400), `assets_table`/`liabilities_table` давали `400 invalid config`, smoke E2E: 25 passed / 1 failed |
| 2026-05-28 | Этап 5 (QA re-run) | 🔴 BLOCKED | sanitize+seed: PASS; API configs: восстановлены; блокер — `header_dates` содержит только `p1` (нет `p2/p3`), smoke E2E: 24 passed / 2 failed (`api-data-new-contract`, `basic` navigation timeout) |
| 2026-05-28 | Этап 5 (QA final re-run) | ✅ COMPLETED | sanitize+seed: PASS; strict baseline `layout/header_dates/assets/liabilities/fin_results/kpis`: 200; smoke E2E: 26 passed / 0 failed |
| 2026-05-28 | Этап 6 (PO Acceptance) | ✅ ACCEPTED | Handoff-контур принят: документация и безопасный sanitize/seed процесс подтверждены, доработки не требуются |
