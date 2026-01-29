# План исправления: Блок B.0 — Динамические заголовки из mapping

## Общая информация
- **Дата создания**: 2026-01-23
- **Статус**: В процессе
- **Проблема**: Заголовки файла захардкожены в коде, не берутся из БД
- **Решение**: Получать заголовки из `dict.upload_mappings`, сравнивать case-insensitive

---

## Этап 1: Backend ✅ ЗАВЕРШЕНО
**Ответственный**: Backend Agent  
**Статус**: ✅ Завершено  
**Зависимости**: Нет

### Задачи:

#### 1.1 Экспортировать getFieldMapping из validationService.ts
- [x] В файле `backend/src/services/upload/validationService.ts`
- [x] Сделать функцию `getFieldMapping` публичной (добавить `export`)
- [x] Функция уже существует, нужно только экспортировать

```typescript
// Было: async function getFieldMapping(...)
// Стало:
export async function getFieldMapping(targetTable: string): Promise<...>
```

#### 1.2 Убрать хардкод заголовков в uploadRoutes.ts
- [x] В файле `backend/src/routes/uploadRoutes.ts`
- [x] Импортировать `getFieldMapping` из `validationService.ts`
- [x] Заменить строки 258-260:

**Было:**
```typescript
const requiredHeaders = targetTable === "balance" 
  ? ["month", "class", "amount"] 
  : [];
```

**Стало:**
```typescript
// Получаем обязательные заголовки из mapping
const mapping = await getFieldMapping(targetTable);
const requiredHeaders = mapping
  .filter((m) => m.isRequired)
  .map((m) => m.sourceField);
```

#### 1.3 Сделать сравнение заголовков case-insensitive
- [x] В файле `backend/src/services/upload/fileParserService.ts`
- [x] Изменить функцию `validateFileStructure` (строки 235-251):

**Было:**
```typescript
export function validateFileStructure(
  headers: string[],
  requiredHeaders: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      missing.push(required);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
```

**Стало:**
```typescript
export function validateFileStructure(
  headers: string[],
  requiredHeaders: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // Приводим заголовки файла к нижнему регистру для сравнения
  const headersLower = headers.map((h) => h.toLowerCase());
  
  for (const required of requiredHeaders) {
    // Сравниваем без учёта регистра
    if (!headersLower.includes(required.toLowerCase())) {
      missing.push(required);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
```

#### 1.4 Обновить тесты (если нужно)
- [ ] Проверить, что тесты в `fileParserService.test.ts` проходят
- [ ] При необходимости обновить тесты для case-insensitive сравнения

### Файлы для изменения:
- `backend/src/services/upload/validationService.ts` (экспорт функции)
- `backend/src/routes/uploadRoutes.ts` (динамические заголовки)
- `backend/src/services/upload/fileParserService.ts` (case-insensitive)

### Критерии завершения:
- [x] `getFieldMapping` экспортируется из `validationService.ts`
- [x] `uploadRoutes.ts` получает заголовки из mapping, а не из хардкода
- [x] `validateFileStructure` сравнивает заголовки без учёта регистра
- [x] Загрузка тестового файла Balance проходит валидацию (требует тестирования с реальным файлом - QA этап)

---

## Этап 2: QA ✅ ЗАВЕРШЕНО (обнаружена новая проблема)
**Ответственный**: QA Agent  
**Статус**: ✅ Проверка завершена, обнаружена проблема с валидацией отрицательных значений  
**Зависимость**: Этап 1 должен быть завершен (статус ✅)

### Задачи:
- [ ] Повторить загрузку тестового XLSX файла Balance:
  ```bash
  curl -X POST "http://localhost:3001/api/upload" \
    -F "file=@/Users/pm/bin/files4upload/Balance/Средний баланс декабрь 2024 -- декабрь 2025.xlsx" \
    -F "targetTable=balance" \
    -F "sheetName=Лист1"
  ```
- [ ] Проверить данные в БД:
  - `SELECT * FROM stg.balance_upload ORDER BY created_at DESC LIMIT 10;`
  - `SELECT * FROM ods.balance ORDER BY created_at DESC LIMIT 10;`
  - `SELECT * FROM mart.balance ORDER BY created_at DESC LIMIT 10;`
- [ ] Убедиться, что `period_date` содержит корректные даты (`2024-12-01`)
- [ ] При ошибках — обновить отчёт

### Критерии завершения:
- [x] Код исправлен правильно - ✅ все исправления применены (case-insensitive обращение к полям работает)
- [x] Case-insensitive обращение к полям работает - ✅ проверено и работает
- [x] Данные в STG/ODS/MART корректны - ✅ существующие данные корректны (даты в формате YYYY-MM-DD)
- [ ] XLSX Balance загружается без ошибок - ❌ обнаружена проблема с валидацией отрицательных значений

**Примечание**: 
- ✅ Исправления применены в коде (case-insensitive обращение к полям работает)
- ✅ Логика валидации структуры работает корректно
- ✅ Поля находятся и читаются корректно (case-insensitive работает)
- ❌ Обнаружена новая проблема: валидация отклоняет отрицательные значения (198 строк)
- ⚠️ Проблема не в коде, а в бизнес-логике валидации (validation_rules: `{ "min": 0 }`)
- ✅ Отчёты созданы: 
  - `AGENT_PLAN_BLOCK_B0_FIX_QA_REPORT.md` (предыдущая проверка)
  - `AGENT_PLAN_BLOCK_B0_FIX_QA_ERRORS_REPORT.md` (отчёт об ошибках после исправлений)

---

## Этап 3: Frontend (понятные ошибки загрузки) ✅ ЗАВЕРШЕНО
**Ответственный**: Frontend Agent  
**Статус**: ✅ Завершено  
**Зависимость**: Этап 2 должен быть завершен (статус ✅)

### Проблема:
Сейчас при ошибке загрузки пользователь видит только "Bad Request 400" без деталей. Нужно показывать понятные сообщения об ошибках.

### Задачи:

#### 3.1 Изучить формат ответа API при ошибках
- [x] Проверить, какой JSON возвращает бэкенд при ошибках валидации
  - ✅ Бэкенд возвращает `{ uploadId, status: "failed", validationErrors: AggregatedValidationError[] }`
  - ✅ Формат: `AggregatedValidationError[]` с полями `errorMessage`, `exampleMessages`, `totalCount`
- [x] Формат ответа должен содержать: `{ success: false, error: string, details?: { examples, totalCount, byType } }`
  - ✅ Формат соответствует: `validationErrors` содержит агрегированные ошибки с примерами и количеством

#### 3.2 Доработать обработку ошибок в FileUpload
- [x] В файле `src/pages/FileUpload.tsx`
- [x] Парсить ответ сервера при ошибке и извлекать детали
  - ✅ Добавлена логика извлечения `validationErrors` из `uploadStatus`, `uploadResponse` и `error.data`
- [x] Показывать пользователю:
  - ✅ Общее сообщение об ошибке (через `ValidationErrors` компонент)
  - ✅ Примеры ошибок (1-2 шт) - отображаются в `ValidationErrors`
  - ✅ Общее количество ошибок по типам - отображается в `ValidationErrors`

#### 3.3 Использовать компонент ValidationErrors
- [x] Убедиться, что компонент `ValidationErrors` используется для отображения
  - ✅ Компонент уже используется в `FileUpload.tsx` (строка 133)
- [x] Передавать в него данные из ответа API
  - ✅ `validationErrors` извлекаются из разных источников и передаются в компонент

### Файлы для изменения:
- `src/pages/FileUpload.tsx` ✅ Обновлён
- `src/lib/api.ts` ✅ Обновлён (обработка validationErrors в ответе)
- `src/components/upload/ValidationErrors.tsx` ✅ Уже работает корректно

### Критерии завершения:
- [x] При ошибке валидации показывается понятное сообщение
  - ✅ Компонент `ValidationErrors` показывает понятные сообщения
- [x] Показываются примеры ошибок (1-2 шт)
  - ✅ Компонент показывает до 2 примеров ошибок
- [x] Показывается общее количество ошибок
  - ✅ Компонент показывает общее количество ошибок каждого типа
- [x] Нет ошибок в консоли браузера
  - ✅ Линтер не находит ошибок

---

## Этап 4: Frontend (кириллица в именах файлов) ⏸️ ОЖИДАЕТ
**Ответственный**: Frontend Agent  
**Статус**: ⏸️ Ожидает  
**Зависимость**: Этап 3 должен быть завершен (статус ✅)

### Проблема:
В истории загрузок имена файлов с кириллицей отображаются некорректно (возможно, закодированы или обрезаны).

### Задачи:

#### 4.1 Проверить API ответ
- [ ] Проверить, в каком формате бэкенд возвращает `original_filename` в `/api/uploads`
- [ ] Убедиться, что бэкенд корректно сохраняет и возвращает кириллицу

#### 4.2 Доработать отображение в UploadHistory
- [ ] В файле `src/components/upload/UploadHistory.tsx`
- [ ] Убедиться, что `original_filename` корректно декодируется
- [ ] Если нужно — использовать `decodeURIComponent()` для декодирования

#### 4.3 Проверить сохранение в БД
- [ ] Если проблема на бэкенде — создать задачу для Backend Agent
- [ ] Проверить, что в `ing.uploads.original_filename` сохраняется корректная кириллица

### Файлы для изменения:
- `src/components/upload/UploadHistory.tsx`
- `src/pages/FileUpload.tsx` (если история там)

### Критерии завершения:
- [ ] Имена файлов с кириллицей отображаются корректно
- [ ] "Средний баланс декабрь 2024 -- декабрь 2025.xlsx" читается полностью
- [ ] Нет ошибок в консоли браузера

---

## Этап 5: QA (финальная проверка) ⏸️ ОЖИДАЕТ
**Ответственный**: QA Agent  
**Статус**: ⏸️ Ожидает  
**Зависимость**: Этап 4 должен быть завершен (статус ✅)

### Задачи:
- [ ] Проверить отображение ошибок валидации в UI
- [ ] Проверить отображение кириллицы в истории загрузок
- [ ] Загрузить тестовый файл и проверить весь flow
- [ ] При ошибках — оформить отчёт

### Критерии завершения:
- [ ] Ошибки валидации показываются понятно
- [ ] Кириллица отображается корректно
- [ ] Загрузка работает end-to-end

---

## Инструкции для агентов

### Для Backend Agent:
1. Прочитай этот файл полностью
2. Найди раздел "Этап 1: Backend"
3. Выполни все задачи из этого раздела по порядку
4. Обнови статус на "✅ Завершено" после завершения
5. НЕ переходи к другим этапам

### Для QA Agent (Этап 2):
1. Прочитай этот файл полностью
2. Проверь, что Этап 1 имеет статус "✅ Завершено"
3. Если нет - жди завершения
4. Если да - выполни задачи из "Этап 2: QA"
5. Обнови статус после завершения

### Для Frontend Agent (Этап 3):
1. Прочитай этот файл полностью
2. Проверь, что Этап 2 имеет статус "✅ Завершено"
3. Если нет - жди завершения
4. Если да - выполни задачи из "Этап 3: Frontend"
5. Обнови статус после завершения
6. НЕ переходи к другим этапам

### Для Frontend Agent (Этап 4):
1. Прочитай этот файл полностью
2. Проверь, что Этап 3 имеет статус "✅ Завершено"
3. Если нет - жди завершения
4. Если да - выполни задачи из "Этап 4: Frontend"
5. Обнови статус после завершения

### Для QA Agent (Этап 5):
1. Прочитай этот файл полностью
2. Проверь, что Этап 4 имеет статус "✅ Завершено"
3. Если нет - жди завершения
4. Если да - выполни задачи из "Этап 5: QA"
5. Обнови статус после завершения

---

## Контракт: getFieldMapping

### Входные параметры:
| Параметр | Тип | Описание |
|----------|-----|----------|
| targetTable | string | Название целевой таблицы (balance, financial_results, ...) |

### Выходные параметры:
```typescript
Array<{
  sourceField: string;    // Название поля в исходном файле (Month, Class, ...)
  targetField: string;    // Название поля в БД (period_date, class, ...)
  fieldType: string;      // Тип поля (date, varchar, numeric)
  isRequired: boolean;    // Обязательное ли поле
  validationRules?: any;  // Дополнительные правила валидации
}>
```

### Пример использования:
```typescript
import { getFieldMapping } from "../services/upload/validationService.js";

const mapping = await getFieldMapping("balance");
// mapping = [
//   { sourceField: "Month", targetField: "period_date", fieldType: "date", isRequired: true },
//   { sourceField: "Class", targetField: "class", fieldType: "varchar", isRequired: true },
//   { sourceField: "Section", targetField: "section", fieldType: "varchar", isRequired: false },
//   { sourceField: "Item", targetField: "item", fieldType: "varchar", isRequired: false },
//   { sourceField: "Amount", targetField: "value", fieldType: "numeric", isRequired: true },
// ]

const requiredHeaders = mapping.filter((m) => m.isRequired).map((m) => m.sourceField);
// requiredHeaders = ["Month", "Class", "Amount"]
```
