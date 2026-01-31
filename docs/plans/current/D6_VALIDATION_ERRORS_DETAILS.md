# План D.6 — Детализация ошибок валидации с номерами строк

> **Создан**: 2026-01-23  
> **Статус**: ✅ ЗАВЕРШЕНО (2026-01-30)  
> **Приоритет**: Средний (улучшение UX)

---

## Цель

При ошибках валидации показывать не только тип ошибки, но и **конкретные номера строк** файла, где ошибка встречается.

**Было:**
> Ошибка: Пустое значение в поле "Сумма"

**Станет:**
> Ошибка: Пустое значение в поле "Сумма" (строки: 5, 12, 34, 78... и ещё 19)

---

## Текущее состояние

### Backend: `validationService.ts`

**`ValidationError` уже содержит `rowNumber`:**
```typescript
interface ValidationError {
  rowNumber?: number;      // ✅ Есть
  fieldName: string;
  errorType: string;
  errorMessage: string;
  fieldValue?: string | number | null;  // ✅ Есть
}
```

**`aggregateValidationErrors()` теряет эти данные:**
```typescript
// Сейчас возвращает:
examples: Array<{
  type: string;
  message: string;
  field?: string;
  // ❌ rowNumber — теряется
  // ❌ fieldValue — теряется
}>
```

---

## Этап 1: Backend — Расширить агрегацию ✅

**Субагент**: `backend-agent`  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 1.1 Изменить формат `examples` в `aggregateValidationErrors()`:
  ```typescript
  examples: Array<{
    type: string;
    message: string;
    field?: string;
    rowNumbers: number[];    // Первые 5 строк
    sampleValue?: string;    // Пример значения
    totalAffected: number;   // Всего ошибок этого типа
  }>
  ```
- [x] 1.2 Собирать первые 5 строк для каждого типа ошибки
- [x] 1.3 Обновить тип возврата функции
- [x] 1.4 Проверить что API возвращает новый формат

### Файлы для изменения:
- `backend/src/services/upload/validationService.ts`

### Пример реализации:
```typescript
export function aggregateValidationErrors(errors: ValidationError[]): {
  examples: Array<{
    type: string;
    message: string;
    field?: string;
    rowNumbers: number[];
    sampleValue?: string;
    totalAffected: number;
  }>;
  totalCount: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  const rowsByType: Record<string, number[]> = {};
  const sampleByType: Record<string, { message: string; field?: string; value?: string }> = {};
  
  for (const error of errors) {
    const key = error.errorType;
    byType[key] = (byType[key] || 0) + 1;
    
    if (!rowsByType[key]) {
      rowsByType[key] = [];
      sampleByType[key] = {
        message: error.errorMessage,
        field: error.fieldName,
        value: error.fieldValue?.toString()
      };
    }
    
    // Собираем первые 5 строк
    if (rowsByType[key].length < 5 && error.rowNumber) {
      rowsByType[key].push(error.rowNumber);
    }
  }

  const examples = Object.entries(byType).slice(0, 3).map(([type, count]) => ({
    type,
    message: sampleByType[type].message,
    field: sampleByType[type].field,
    rowNumbers: rowsByType[type],
    sampleValue: sampleByType[type].value,
    totalAffected: count
  }));

  return { examples, totalCount: errors.length, byType };
}
```

### Критерии завершения:
- [x] API возвращает `rowNumbers` в ошибках
- [x] Backend компилируется без ошибок

---

## Этап 2: Frontend — Отображение строк ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 2.1 Найти компонент отображения ошибок валидации
- [x] 2.2 Обновить тип `AggregatedValidationError` в `src/lib/api.ts`
- [x] 2.3 Обновить UI для показа строк:
  ```
  ❌ Пустое значение в поле "Сумма"
     Строки: 5, 12, 34, 78, 91... (всего 23)
  ```
- [x] 2.4 Проверить отображение в UI

### Файлы для изменения:
- `src/lib/api.ts` (типы)
- `src/components/upload/ValidationErrors.tsx`

### Критерии завершения:
- [x] При ошибке видны номера строк
- [x] Frontend компилируется без ошибок

---

## Этап 3: Тестирование ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 3.1 Загрузить файл с ошибками валидации
- [x] 3.2 Проверить что номера строк отображаются
- [x] 3.3 Проверить что номера строк корректны (соответствуют файлу)

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-01-30 | Этап 1 | ✅ | Backend: aggregateValidationErrors() возвращает rowNumbers, sampleValue, totalAffected |
| 2026-01-30 | Этап 2 | ✅ | Frontend: ValidationErrors.tsx показывает номера строк |
| 2026-01-30 | Этап 3 | ✅ | QA: Номера строк корректны, соответствуют файлу |
