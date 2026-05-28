# План выполнения: Валидация знаков + инверсия АКТИВЫ в mart

> **Создан**: 2026-01-23  
> **Статус**: ✅ Завершено  
> **Roadmap**: `docs/plans/ROADMAP.md` — D (валидации) / J (данные)

---

## Контекст

Новые правила валидации:
1) Отрицательные числа в целом допустимы.  
2) В АКТИВАХ >90% значений должны быть отрицательными.  
3) В ПАССИВАХ >90% значений должны быть положительными.  
4) Остальные классы не регламентируются.

Дополнительно: требуется **инверсия знака** для `amount/value` в `mart` для строк, где `class = АКТИВЫ` (лучше через `tech_class = 'ASSETS'`), чтобы в витрине хранить корректный знак.

**Файлы для изучения перед началом:**
- `docs/context/backend.md`
- `docs/context/database.md`
- `backend/src/services/upload/validationService.ts`
- `backend/src/migrations/`

---

## Этап 1: Backend 🔴

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи:
- [x] Проверить `dict.upload_mappings` для balance/fin_results: убрать `min: 0` для числовых полей (чтобы отрицательные были допустимы).
- [x] Добавить агрегатную проверку знаков в `validationService` для `targetTable === "balance"`:
  - Посчитать долю отрицательных значений для АКТИВОВ и положительных для ПАССИВОВ.
  - Порог: 90% (строго больше либо >= — зафиксировать в коде).
  - Если порог не достигнут — вернуть ошибку валидации уровня файла (с описанием процента).
- [x] Добавить инверсию знака для АКТИВОВ в `mart.balance` (MV):
  - Рекомендуется использовать `tech_class = 'ASSETS'`.
  - Инверсия должна применяться к `value`.
- [x] Проверить влияние на KPI формулы:
  - Если активы становятся положительными, убрать `* -1` из ROA (и других формул, если было связано с отрицательными активами).
- [x] Обновить `docs/context/backend.md` и `docs/context/database.md`.

### Файлы для изменения:
- `backend/src/services/upload/validationService.ts`
- `backend/src/migrations/0xx_update_upload_mappings_allow_negative.sql`
- `backend/src/migrations/0xx_update_mart_balance_sign.sql`
- `backend/src/migrations/0xx_update_kpi_derived_sign.sql` (если потребуется)
- `docs/context/backend.md`
- `docs/context/database.md`

### Критерии завершения:
- [x] Отрицательные значения разрешены.
- [x] Валидация по доле знаков работает и даёт понятные ошибки.
- [x] `mart.balance` хранит АКТИВЫ с инвертированным знаком.
- [x] KPI формулы корректны при новом знаке.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Update sign validation and assets sign inversion",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/backend-agent.md
    2. Прочитай контекст: docs/context/backend.md, docs/context/database.md
    3. Редактируй ТОЛЬКО файлы указанные в плане
    4. НЕ добавляй fallback/legacy логику

    Прочитай план: docs/plans/current/BALANCE_SIGN_VALIDATION.md, раздел "Этап 1: Backend"
    
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
**Статус**: ✅ Завершено

**Итог проверки**: Финальный ретест после migration `062` и обновления refresh в `ingestionService` пройден. См. `docs/plans/reports/QA_BALANCE_SIGN_VALIDATION.md`.

### Задачи:
- [x] Прогнать валидацию с тест‑файлом:
  - случай, где АКТИВЫ <90% отрицательные → ошибка
  - случай, где ПАССИВЫ <90% положительные → ошибка
  - корректный файл → успешно
- [x] Проверить, что в `mart.balance` значения АКТИВОВ инвертированы.
- [x] Проверить KPI ROA/ROE на корректный знак (если формулы менялись).

### Файлы для изменения:
- `docs/plans/reports/QA_BALANCE_SIGN_VALIDATION.md` (если есть баги)

### Критерии завершения:
- [x] Валидация корректно ловит отклонения.
- [x] Знак АКТИВОВ в mart корректен.
- [x] ROA/ROE доступны и корректны без ручного `REFRESH`.

### 📋 Команда запуска (скопировать в Executor):

```
Запусти qa-agent:
- Прочитай инструкции: .cursor/agents/qa-agent.md
- Прочитай docs/plans/current/BALANCE_SIGN_VALIDATION.md, раздел "Этап 2: QA"
- Проверь валидацию и знак АКТИВОВ
- Если есть ошибки — оформи отчёт
```

---

## Этап 3: Docs ✅

**Субагент**: `docs-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи:
- [x] Обновить документацию по правилам валидации знаков.
- [x] Обновить описание балансовых значений (инверсия АКТИВОВ в mart).

### Файлы для изменения:
- `docs/guides/file-upload-validation.md`
- `docs/database/schemas.md` (если описывается знак)

### Критерии завершения:
- [x] Документация соответствует новым правилам.

### 📋 Команда для Executor (использовать Task tool!):

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Document sign validation and assets inversion",
  prompt: `
    ПЕРЕД НАЧАЛОМ РАБОТЫ:
    1. Прочитай инструкции: .cursor/agents/docs-agent.md
    2. Прочитай контекст: docs/context/index.md
    3. Редактируй ТОЛЬКО файлы указанные в плане

    Прочитай план: docs/plans/current/BALANCE_SIGN_VALIDATION.md, раздел "Этап 3: Docs"
    
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
| 2026-05-23 | Этап 1: Backend | ✅ | Реализованы валидация порога 90%, инверсия АКТИВОВ в mart.balance, обновление ROA и контекстных файлов |
| 2026-05-23 | Этап 2: QA | ✅ | Финальный ретест после migration 062: 2 negative + 1 success по sign validation, АКТИВЫ в mart положительные, ROA/ROE обновляются автоматически без ручного REFRESH |
| 2026-05-23 | Этап 3: Docs | ✅ | Обновлены правила знаков валидации, описание инверсии АКТИВОВ в mart.balance и формула ROA без `* -1` |
