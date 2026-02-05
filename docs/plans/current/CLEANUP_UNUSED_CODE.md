# План выполнения: Архивация неиспользуемого кода

> **Создан**: 2026-02-03  
> **Завершён**: 2026-02-04  
> **Статус**: ✅ Выполнено  
> **Roadmap**: H.6 — Технический долг

---

## Контекст

После перехода на `/api/data` + SQL Builder многие сервисы и endpoints стали неиспользуемыми, но остались в коде. Также накопилось много debug/test скриптов.

**ВАЖНО:** Код не удаляется, а перемещается в `archive/` с сохранением оригинальной структуры папок.

---

## Структура архива

```
archive/
├── ARCHIVED_FILES.md          # Индекс всех архивированных файлов
├── backend/
│   └── src/
│       ├── routes/
│       │   └── tableDataRoutes.ts
│       ├── services/
│       │   ├── config/
│       │   │   └── layoutService.ts
│       │   └── mart/
│       │       ├── balanceService.ts
│       │       ├── kpiService.ts
│       │       └── base/
│       │           ├── componentService.ts
│       │           ├── calculationService.ts
│       │           └── rowNameMapper.ts
│       └── scripts/
│           └── (debug/test скрипты)
└── src/
    └── (frontend код если нужно)
```

### Формат ARCHIVED_FILES.md

```markdown
# Архивированные файлы

> Дата архивации: YYYY-MM-DD
> Причина: Переход на /api/data + SQL Builder

## Сервисы

| Оригинальный путь | Причина архивации |
|-------------------|-------------------|
| backend/src/services/config/layoutService.ts | Не используется, данные через api/data |
| backend/src/services/mart/balanceService.ts | Legacy, заменён SQL Builder |
| ... | ... |

## Скрипты

| Оригинальный путь | Описание |
|-------------------|----------|
| backend/src/scripts/check-*.ts | Debug скрипты |
| ... | ... |
```

---

## Анализ зависимостей

### Routes → Services

```
dataRoutes.ts
├── queryBuilder/builder.ts ✅ ИСПОЛЬЗУЕТСЯ
└── mart/base/periodService.ts ✅ ИСПОЛЬЗУЕТСЯ

uploadRoutes.ts  
├── upload/fileParserService.ts ✅ ИСПОЛЬЗУЕТСЯ
├── upload/storageService.ts ✅ ИСПОЛЬЗУЕТСЯ
├── upload/rollbackService.ts ✅ ИСПОЛЬЗУЕТСЯ
├── upload/ingestionService.ts ✅ ИСПОЛЬЗУЕТСЯ
├── upload/validationService.ts ✅ ИСПОЛЬЗУЕТСЯ
└── progress/progressService.ts ✅ ИСПОЛЬЗУЕТСЯ

tableDataRoutes.ts (LEGACY FALLBACK)
└── mart/balanceService.ts
    ├── mart/base/periodService.ts
    ├── mart/base/calculationService.ts
    ├── mart/base/rowNameMapper.ts
    └── mart/kpiService.ts
        ├── mart/base/periodService.ts
        ├── mart/base/calculationService.ts
        └── mart/base/componentService.ts
```

### Неиспользуемые сервисы (НЕ импортируются в routes)

| Сервис | Файл | Статус |
|--------|------|--------|
| layoutService | `services/config/layoutService.ts` | ❌ НЕ ИСПОЛЬЗУЕТСЯ (только в скриптах) |
| componentService | `services/mart/base/componentService.ts` | ❌ Используется только в kpiService |
| rowNameMapper | `services/mart/base/rowNameMapper.ts` | ❌ Используется только в balanceService |
| calculationService | `services/mart/base/calculationService.ts` | ❌ Используется только в balanceService/kpiService |

### Legacy код на фронте

| Код | Файл | Статус |
|-----|------|--------|
| useTableData | `hooks/useAPI.ts` | ❌ LEGACY — fallback когда нет dataSourceKey |
| fetchTableData | `lib/api.ts` | ❌ LEGACY |
| tableDataRoutes | `routes/tableDataRoutes.ts` | ❌ LEGACY endpoint |

### Скрипты (70+ файлов)

Большинство скриптов в `backend/src/scripts/` — debug/test скрипты, которые можно удалить.

---

## Этап 0: Создать структуру архива ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:

- [ ] **0.1** Создать папку `archive/` в корне проекта
- [ ] **0.2** Создать `archive/ARCHIVED_FILES.md` с шаблоном индекса
- [ ] **0.3** Добавить `archive/` в `.gitignore` (опционально, обсудить)

---

## Этап 1: Архивировать Legacy таблицы endpoint ✅

**Субагент**: `backend-agent` + `frontend-agent`  
**Зависимости**: Этап 0 ✅  
**Статус**: ✅ Завершено

### Задачи Backend:

- [ ] **1.1** Переместить `backend/src/routes/tableDataRoutes.ts` → `archive/backend/src/routes/tableDataRoutes.ts`
- [ ] **1.2** Убрать импорт из `backend/src/routes/index.ts`:
  ```typescript
  // УДАЛИТЬ строки:
  import tableDataRoutes from "./tableDataRoutes.js";
  router.use("/table-data", tableDataRoutes);
  ```
- [ ] **1.3** Обновить `backend/src/server.ts` — убрать документацию для `/api/table-data`
- [ ] **1.4** Добавить в `archive/ARCHIVED_FILES.md` запись о файле

### Задачи Frontend:

- [ ] **1.5** Удалить `useTableData` из `src/hooks/useAPI.ts` (не архивируем, просто удаляем функцию)
- [ ] **1.6** Удалить `fetchTableData` из `src/lib/api.ts` (не архивируем, просто удаляем функцию)
- [ ] **1.7** В `DynamicDashboard.tsx` убрать fallback на legacy endpoint — использовать только `useGetData`

### ✅ Точка проверки:

```bash
# Backend
cd backend && npm run build
grep -r "table-data" src/  # Должно быть пусто (кроме комментариев)

# Frontend  
npm run build
grep -r "useTableData\|fetchTableData" src/  # Должно быть пусто

# Архив создан
ls archive/backend/src/routes/tableDataRoutes.ts
```

---

## Этап 2: Архивировать неиспользуемые сервисы ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### После архивации tableDataRoutes эти сервисы станут полностью неиспользуемыми:

- [ ] **2.1** Переместить `backend/src/services/config/layoutService.ts` → `archive/backend/src/services/config/layoutService.ts`
- [ ] **2.2** Переместить `backend/src/services/mart/balanceService.ts` → `archive/backend/src/services/mart/balanceService.ts`
- [ ] **2.3** Переместить `backend/src/services/mart/kpiService.ts` → `archive/backend/src/services/mart/kpiService.ts`
- [ ] **2.4** Переместить `backend/src/services/mart/base/componentService.ts` → `archive/backend/src/services/mart/base/componentService.ts`
- [ ] **2.5** Переместить `backend/src/services/mart/base/calculationService.ts` → `archive/backend/src/services/mart/base/calculationService.ts`
- [ ] **2.6** Переместить `backend/src/services/mart/base/rowNameMapper.ts` → `archive/backend/src/services/mart/base/rowNameMapper.ts`
- [ ] **2.7** Обновить `archive/ARCHIVED_FILES.md` — добавить все файлы

### Оставить (используются):

- ✅ `services/queryBuilder/*` — SQL Builder
- ✅ `services/mart/base/periodService.ts` — используется в dataRoutes
- ✅ `services/mart/types.ts` — типы
- ✅ `services/upload/*` — загрузка файлов
- ✅ `services/progress/*` — прогресс загрузки

### ✅ Точка проверки:

```bash
cd backend && npm run build
npm run test

# Архив обновлён
ls archive/backend/src/services/
```

---

## Этап 3: Архивировать неиспользуемые скрипты ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 2 ✅  
**Статус**: ✅ Завершено

### Скрипты для АРХИВАЦИИ (debug/test):

Переместить в `archive/backend/src/scripts/` с сохранением имён:

```
check-*.ts (все check-* скрипты)
test-*.ts (все test-* скрипты)
show-*.ts (все show-* скрипты)
debug-*.ts (все debug-* скрипты)
fix-*.ts (все fix-* скрипты)
find-*.ts
verify-*.ts
add-*.ts
insert-*.ts
update-*.ts
migrate-*.ts (кроме run-migrations.ts!)
dump-*.ts
run-migration-NNN.ts (все run-migration-XXX.ts)
```

### Команда для массового перемещения:

```bash
# Создать директорию
mkdir -p archive/backend/src/scripts

# Переместить debug/test скрипты
cd backend/src/scripts
for f in check-*.ts test-*.ts show-*.ts debug-*.ts fix-*.ts find-*.ts verify-*.ts add-*.ts insert-*.ts update-*.ts dump-*.ts run-migration-0*.ts; do
  [ -f "$f" ] && mv "$f" ../../../archive/backend/src/scripts/
done
```

### Скрипты для СОХРАНЕНИЯ (оставить на месте):

```
backend/src/scripts/
├── run-migrations.ts ✅ — запуск миграций
├── run-single-migration.ts ✅ — запуск одной миграции
├── run-field-type-migrations.ts ✅ — миграции для FIELD_TYPE_REFACTOR
├── create-schemas.ts ✅ — создание схем
├── read-file.ts ✅ — утилита для агентов
└── export-config-to-json.ts ✅ — экспорт конфигов
```

### Задачи:

- [ ] **3.1** Переместить все debug/test скрипты в `archive/backend/src/scripts/`
- [ ] **3.2** Обновить `archive/ARCHIVED_FILES.md` — добавить список скриптов

### ✅ Точка проверки:

```bash
ls backend/src/scripts/
# Должно остаться ~6 файлов вместо 70+

cd backend && npm run build

# Архив содержит скрипты
ls archive/backend/src/scripts/ | wc -l
# ~60+ файлов
```

---

## Этап 4: Обновить документацию ✅

**Субагент**: `docs-agent`  
**Зависимости**: Этап 3 ✅  
**Статус**: ✅ Завершено

### Задачи:

- [ ] **4.1** Обновить `docs/context/backend.md`:
  - Убрать упоминания удалённых сервисов
  - Обновить структуру проекта
- [ ] **4.2** Обновить `docs/context/frontend.md`:
  - Убрать упоминания useTableData
- [ ] **4.3** Обновить `docs/database/schemas.md` если нужно

---

## Сводка архивируемого кода

### Backend (файлы для архивации):

```
backend/src/
├── routes/tableDataRoutes.ts → archive/backend/src/routes/
├── services/
│   ├── config/layoutService.ts → archive/backend/src/services/config/
│   └── mart/
│       ├── balanceService.ts → archive/backend/src/services/mart/
│       ├── kpiService.ts → archive/backend/src/services/mart/
│       └── base/
│           ├── componentService.ts → archive/backend/src/services/mart/base/
│           ├── calculationService.ts → archive/backend/src/services/mart/base/
│           └── rowNameMapper.ts → archive/backend/src/services/mart/base/
└── scripts/
    └── (60+ debug/test скриптов) → archive/backend/src/scripts/
```

### Frontend (код для удаления — не архивируем):

```
src/
├── hooks/useAPI.ts → удалить функцию useTableData
├── lib/api.ts → удалить функцию fetchTableData
└── pages/DynamicDashboard.tsx → удалить legacy fallback код
```

---

## Инструкция для Executor

```javascript
// Этап 0: Создать структуру архива
Task(
  subagent_type: "backend-agent",
  description: "Create archive structure",
  prompt: `
    ПЕРЕД НАЧАЛОМ: Прочитай docs/context/backend.md
    
    Создай структуру архива:
    1. mkdir -p archive/backend/src/routes
    2. mkdir -p archive/backend/src/services/config
    3. mkdir -p archive/backend/src/services/mart/base
    4. mkdir -p archive/backend/src/scripts
    5. Создай файл archive/ARCHIVED_FILES.md с шаблоном:
    
    # Архивированные файлы
    
    > Дата архивации: 2026-02-03
    > Причина: Переход на /api/data + SQL Builder
    
    ## Routes
    | Оригинальный путь | Причина |
    |-------------------|---------|
    
    ## Services
    | Оригинальный путь | Причина |
    |-------------------|---------|
    
    ## Scripts
    | Оригинальный путь | Описание |
    |-------------------|----------|
  `
)

// Этап 1: Legacy endpoint
Task(
  subagent_type: "backend-agent",
  description: "Archive legacy tableDataRoutes",
  prompt: `
    Архивируй legacy endpoint /api/table-data:
    1. mv backend/src/routes/tableDataRoutes.ts archive/backend/src/routes/
    2. Убери импорт из backend/src/routes/index.ts
    3. Убери документацию из backend/src/server.ts
    4. Добавь запись в archive/ARCHIVED_FILES.md
    
    После: cd backend && npm run build
  `
)

Task(
  subagent_type: "frontend-agent",
  description: "Remove legacy useTableData",
  prompt: `
    ПЕРЕД НАЧАЛОМ: Прочитай docs/context/frontend.md
    
    Удали legacy код (без архивации):
    1. Удали функцию useTableData из src/hooks/useAPI.ts
    2. Удали функцию fetchTableData из src/lib/api.ts
    3. В DynamicDashboard.tsx убери fallback на legacy — используй только useGetData
    
    После: npm run build
  `
)

// Этап 2: Неиспользуемые сервисы
Task(
  subagent_type: "backend-agent",
  description: "Archive unused services",
  prompt: `
    Архивируй неиспользуемые сервисы (mv, не rm):
    1. mv backend/src/services/config/layoutService.ts archive/backend/src/services/config/
    2. mv backend/src/services/mart/balanceService.ts archive/backend/src/services/mart/
    3. mv backend/src/services/mart/kpiService.ts archive/backend/src/services/mart/
    4. mv backend/src/services/mart/base/componentService.ts archive/backend/src/services/mart/base/
    5. mv backend/src/services/mart/base/calculationService.ts archive/backend/src/services/mart/base/
    6. mv backend/src/services/mart/base/rowNameMapper.ts archive/backend/src/services/mart/base/
    7. Обнови archive/ARCHIVED_FILES.md
    
    НЕ ТРОГАЙ:
    - services/queryBuilder/*
    - services/mart/base/periodService.ts
    - services/mart/types.ts
    - services/upload/*
    - services/progress/*
    
    После: cd backend && npm run build && npm run test
  `
)

// Этап 3: Скрипты
Task(
  subagent_type: "backend-agent",
  description: "Archive debug scripts",
  prompt: `
    Архивируй debug/test скрипты:
    
    cd backend/src/scripts
    for f in check-*.ts test-*.ts show-*.ts debug-*.ts fix-*.ts find-*.ts verify-*.ts add-*.ts insert-*.ts update-*.ts dump-*.ts run-migration-0*.ts; do
      [ -f "$f" ] && mv "$f" ../../../archive/backend/src/scripts/
    done
    
    Также перемести migrate-*.ts (кроме run-migrations.ts)
    
    ОСТАВЬ на месте:
    - run-migrations.ts
    - run-single-migration.ts
    - run-field-type-migrations.ts
    - create-schemas.ts
    - read-file.ts
    - export-config-to-json.ts
    
    Обнови archive/ARCHIVED_FILES.md
    
    После: cd backend && npm run build
  `
)
```

---

## Ожидаемый результат

После выполнения:

```
archive/                              # НОВАЯ ПАПКА
├── ARCHIVED_FILES.md                 # Индекс с исходными путями
└── backend/src/
    ├── routes/tableDataRoutes.ts
    ├── services/
    │   ├── config/layoutService.ts
    │   └── mart/
    │       ├── balanceService.ts
    │       ├── kpiService.ts
    │       └── base/
    │           ├── componentService.ts
    │           ├── calculationService.ts
    │           └── rowNameMapper.ts
    └── scripts/
        └── (~60 debug/test скриптов)

backend/src/scripts/                  # ОСТАНЕТСЯ ~6 файлов
├── run-migrations.ts
├── run-single-migration.ts
├── run-field-type-migrations.ts
├── create-schemas.ts
├── read-file.ts
└── export-config-to-json.ts
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-02-04 | Этап 0 | ✅ | Создана структура archive/ и ARCHIVED_FILES.md |
| 2026-02-04 | Этап 1 | ✅ | tableDataRoutes → archive, удалены useTableData/fetchTableData |
| 2026-02-04 | Этап 2 | ✅ | 6 сервисов → archive (layoutService, balanceService, kpiService, componentService, calculationService, rowNameMapper) |
| 2026-02-04 | Этап 3 | ✅ | 65 скриптов → archive (check-*, test-*, debug-*, fix-*, run-migration-0*.ts) |
| 2026-02-04 | Этап 4 | ✅ | Документация обновлена (backend.md, frontend.md, CLEANUP_UNUSED_CODE.md) |
