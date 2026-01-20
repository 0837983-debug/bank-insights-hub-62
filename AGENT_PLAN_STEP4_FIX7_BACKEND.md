# План: Шаг 4 (фикс 7) — Backend — getValue не различает параметры и прямые значения

**Цель:** исправить функцию getValue, чтобы она различала `:paramName` (параметр) и `"assets"` (прямое значение).
**Статус:** ✅ Завершено

## Проблема
Функция `getValue` всегда вызывает `substring(1)` и ищет параметр в params:
```ts
getValue(paramName: ParamValue): string {
  const name = paramName.substring(1); // "assets" → "ssets"
  const value = this.params[name];     // params["ssets"] = undefined
  if (value === undefined) {
    throw new Error("invalid params");  // ← ПАДАЕТ!
  }
}
```

Когда в конфиге `"value": "assets"` (прямое значение без `:`), функция падает.

## Исправление

**Файл:** `backend/src/services/queryBuilder/builder.ts`

**Функция `getValue` (строки ~33-43) — добавить проверку:**

```typescript
getValue(paramName: ParamValue): string {
  // Если значение НЕ начинается с ":", это прямое значение — не параметр
  if (typeof paramName === "string" && !paramName.startsWith(":")) {
    // Это прямое значение, экранируем как строку
    return escapeStringValue(paramName);
  }
  
  const name = paramName.substring(1); // Убираем ":"
  const value = this.params[name];
  
  if (value === undefined) {
    throw new Error("invalid params");
  }

  const paramType = this.paramTypes?.[name];
  return formatValueForSQL(value, paramType);
}
```

**Важно:** функция `escapeStringValue` уже есть в файле (строка ~68).

## Файлы для изменения
- `backend/src/services/queryBuilder/builder.ts` (функция getValue, строки ~33-43)

## После исправления — перезапустить бэкенд
```bash
cd backend && npm run build && npm run dev
```

## Критерии завершения
- [x] `getValue("assets")` возвращает `'assets'` (с кавычками)
- [x] `getValue(":p1")` возвращает значение из params
- [x] API `/api/data/assets_table?p1=...&p2=...&p3=...` работает
- [x] Таблица "Активы" отображается
