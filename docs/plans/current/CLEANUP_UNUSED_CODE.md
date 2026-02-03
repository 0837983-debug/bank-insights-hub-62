# План выполнения: Удаление неиспользуемого кода

> **Создан**: 2026-02-03  
> **Статус**: ⏸️ Готов к выполнению  
> **Roadmap**: H.6 — Технический долг

---

## Контекст

После перехода на `/api/data` + SQL Builder многие сервисы и endpoints стали неиспользуемыми, но остались в коде. Также накопилось много debug/test скриптов.

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

## Этап 1: Удалить Legacy таблицы endpoint ⏸️

**Субагент**: `backend-agent` + `frontend-agent`  
**Зависимости**: Нет  
**Статус**: ⏸️ Ожидает

### Задачи Backend:

- [ ] **1.1** Удалить `backend/src/routes/tableDataRoutes.ts`
- [ ] **1.2** Убрать импорт из `backend/src/routes/index.ts`:
  ```typescript
  // УДАЛИТЬ:
  import tableDataRoutes from "./tableDataRoutes.js";
  router.use("/table-data", tableDataRoutes);
  ```
- [ ] **1.3** Обновить `backend/src/server.ts` — убрать документацию для `/api/table-data`

### Задачи Frontend:

- [ ] **1.4** Удалить `useTableData` из `src/hooks/useAPI.ts`
- [ ] **1.5** Удалить `fetchTableData` из `src/lib/api.ts`
- [ ] **1.6** В `DynamicDashboard.tsx` убрать fallback на legacy endpoint:
  ```typescript
  // УДАЛИТЬ весь блок:
  const { data: tableDataFromLegacy, isLoading: isLoadingLegacy, error } = useTableData(...)
  ```
- [ ] **1.7** Упростить логику — использовать только `useGetData`

### ✅ Точка проверки:

```bash
# Backend
cd backend && npm run build
grep -r "table-data" src/  # Должно быть пусто (кроме комментариев)

# Frontend  
npm run build
grep -r "useTableData\|fetchTableData" src/  # Должно быть пусто
```

---

## Этап 2: Удалить неиспользуемые сервисы ⏸️

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ⏸️ Ожидает

### После удаления tableDataRoutes эти сервисы станут полностью неиспользуемыми:

- [ ] **2.1** Удалить `backend/src/services/config/layoutService.ts`
- [ ] **2.2** Удалить `backend/src/services/mart/balanceService.ts`
- [ ] **2.3** Удалить `backend/src/services/mart/kpiService.ts`
- [ ] **2.4** Удалить `backend/src/services/mart/base/componentService.ts`
- [ ] **2.5** Удалить `backend/src/services/mart/base/calculationService.ts`
- [ ] **2.6** Удалить `backend/src/services/mart/base/rowNameMapper.ts`

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
```

---

## Этап 3: Удалить неиспользуемые скрипты ⏸️

**Субагент**: `backend-agent`  
**Зависимости**: Этап 2 ✅  
**Статус**: ⏸️ Ожидает

### Скрипты для УДАЛЕНИЯ (debug/test):

```
backend/src/scripts/
├── check-*.ts (все check-* скрипты)
├── test-*.ts (все test-* скрипты)
├── show-*.ts (все show-* скрипты)
├── debug-*.ts (все debug-* скрипты)
├── fix-*.ts (все fix-* скрипты)
├── find-*.ts
├── verify-*.ts
├── add-*.ts
├── insert-*.ts
├── update-*.ts
├── migrate-*.ts
└── dump-*.ts
```

### Скрипты для СОХРАНЕНИЯ:

```
backend/src/scripts/
├── run-migrations.ts ✅ — запуск миграций
├── run-single-migration.ts ✅ — запуск одной миграции
├── create-schemas.ts ✅ — создание схем (если нужно)
├── read-file.ts ✅ — утилита для агентов
└── export-config-to-json.ts ✅ — экспорт конфигов (опционально)
```

### ✅ Точка проверки:

```bash
ls backend/src/scripts/
# Должно остаться ~5 файлов вместо 70+

cd backend && npm run build
```

---

## Этап 4: Обновить документацию ⏸️

**Субагент**: `docs-agent`  
**Зависимости**: Этап 3 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:

- [ ] **4.1** Обновить `docs/context/backend.md`:
  - Убрать упоминания удалённых сервисов
  - Обновить структуру проекта
- [ ] **4.2** Обновить `docs/context/frontend.md`:
  - Убрать упоминания useTableData
- [ ] **4.3** Обновить `docs/database/schemas.md` если нужно

---

## Сводка удаляемого кода

### Backend (файлы для удаления):

```
backend/src/
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
    └── (60+ debug/test скриптов)
```

### Frontend (код для удаления):

```
src/
├── hooks/useAPI.ts → удалить useTableData
├── lib/api.ts → удалить fetchTableData
└── pages/DynamicDashboard.tsx → удалить legacy fallback
```

---

## Инструкция для Executor

```javascript
// Этап 1: Legacy endpoint
Task(
  subagent_type: "backend-agent",
  description: "Remove legacy tableDataRoutes",
  prompt: `
    ПЕРЕД НАЧАЛОМ: Прочитай docs/context/backend.md
    
    Удали legacy endpoint /api/table-data:
    1. Удали файл backend/src/routes/tableDataRoutes.ts
    2. Убери импорт из backend/src/routes/index.ts
    3. Убери документацию из backend/src/server.ts
    
    После: npm run build
  `
)

Task(
  subagent_type: "frontend-agent",
  description: "Remove legacy useTableData",
  prompt: `
    ПЕРЕД НАЧАЛОМ: Прочитай docs/context/frontend.md
    
    Удали legacy код:
    1. Удали useTableData из src/hooks/useAPI.ts
    2. Удали fetchTableData из src/lib/api.ts
    3. В DynamicDashboard.tsx убери fallback на legacy — используй только useGetData
    
    После: npm run build
  `
)

// Этап 2: Неиспользуемые сервисы
Task(
  subagent_type: "backend-agent",
  description: "Remove unused services",
  prompt: `
    Удали неиспользуемые сервисы:
    - services/config/layoutService.ts
    - services/mart/balanceService.ts
    - services/mart/kpiService.ts
    - services/mart/base/componentService.ts
    - services/mart/base/calculationService.ts
    - services/mart/base/rowNameMapper.ts
    
    НЕ удаляй:
    - services/queryBuilder/*
    - services/mart/base/periodService.ts
    - services/mart/types.ts
    - services/upload/*
    - services/progress/*
    
    После: npm run build && npm run test
  `
)

// Этап 3: Скрипты
Task(
  subagent_type: "backend-agent",
  description: "Remove debug scripts",
  prompt: `
    Удали debug/test скрипты из backend/src/scripts/:
    - Все check-*.ts
    - Все test-*.ts
    - Все show-*.ts
    - Все debug-*.ts
    - Все fix-*.ts
    - find-*.ts, verify-*.ts, add-*.ts, insert-*.ts, update-*.ts, migrate-*.ts, dump-*.ts
    
    ОСТАВЬ:
    - run-migrations.ts
    - run-single-migration.ts
    - create-schemas.ts
    - read-file.ts
    - export-config-to-json.ts
    
    После: npm run build
  `
)
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| | | | |
