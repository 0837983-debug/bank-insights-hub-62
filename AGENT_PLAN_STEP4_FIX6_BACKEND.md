# План: Шаг 4 (фикс 6) — Backend — Builder не различает параметры и значения

**Цель:** исправить баг, где builder считает прямые значения (например `"assets"`) параметрами.
**Статус:** ✅ Завершено

## Проблема
Builder берёт `"assets"` из WHERE и делает `"assets".substring(1)` = `"ssets"`, потом ищет параметр `ssets` — не находит → "invalid params".

Builder не проверяет, начинается ли значение с `:` (признак параметра).

## Исправление

**Файл:** `backend/src/services/queryBuilder/builder.ts`

### 1. Строки ~287-289 (SELECT case_agg, массив и строка):
```typescript
// Было:
item.when.value.forEach((v) => requiredParams.add(v.substring(1)));
} else if (typeof item.when.value === "string") {
  requiredParams.add(item.when.value.substring(1));

// Стало:
item.when.value.forEach((v) => {
  if (typeof v === "string" && v.startsWith(":")) {
    requiredParams.add(v.substring(1));
  }
});
} else if (typeof item.when.value === "string" && item.when.value.startsWith(":")) {
  requiredParams.add(item.when.value.substring(1));
```

### 2. Строки ~302-305 (WHERE, массив и строка):
```typescript
// Было:
item.value.forEach((v) => requiredParams.add(v.substring(1)));
} else if (typeof item.value === "string") {
  requiredParams.add(item.value.substring(1));

// Стало:
item.value.forEach((v) => {
  if (typeof v === "string" && v.startsWith(":")) {
    requiredParams.add(v.substring(1));
  }
});
} else if (typeof item.value === "string" && item.value.startsWith(":")) {
  requiredParams.add(item.value.substring(1));
```

## Файлы для изменения
- `backend/src/services/queryBuilder/builder.ts`

## Критерии завершения
- [x] Builder различает `:paramName` (параметр) и `"assets"` (прямое значение)
- [x] API `/api/data/assets_table?p1=...&p2=...&p3=...` работает
- [x] Таблица "Активы" отображается
- [x] Тесты проходят
