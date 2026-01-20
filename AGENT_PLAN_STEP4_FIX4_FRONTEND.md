# План: Шаг 4 (фикс 4) — Frontend — Двойной URL

**Цель:** исправить баг с двойным склеиванием URL в функции getData.
**Статус:** ✅ Завершено

## Проблема
URL склеивается дважды:
```
http://localhost:3001/apihttp://localhost:3001/api/data/header_dates?component_id=header
```

Должно быть:
```
http://localhost:3001/api/data/header_dates?component_id=header
```

## Причина
В `getData` (строка 452):
```ts
const url = `${API_BASE_URL}/data/${queryId}`;  // формирует полный URL
```

Потом `apiFetch` (строка 21) снова добавляет `API_BASE_URL`:
```ts
const url = `${API_BASE_URL}${endpoint}`;  // добавляет API_BASE_URL второй раз
```

## Исправление

**Файл:** `src/lib/api.ts`

**Строка 452 — убрать API_BASE_URL:**
```ts
// Было:
const url = `${API_BASE_URL}/data/${queryId}`;

// Стало:
const url = `/data/${queryId}`;
```

## Файлы для изменения
- `src/lib/api.ts` (строка 452)

## Критерии завершения
- [x] URL формируется правильно: `http://localhost:3001/api/data/header_dates?...`
- [x] Нет ошибки "Route not found"
- [x] Таблица "Активы" отображается
