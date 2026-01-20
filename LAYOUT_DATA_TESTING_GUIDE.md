# Руководство по тестированию Layout API без браузера

**Дата:** 2026-01-20

## Проблема

В браузере возникают ошибки 500 при загрузке layout через `/api/data`. Нужно протестировать без браузера.

## Способы тестирования

### 1. Через curl (самый простой)

#### Проверка с правильными параметрами:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.'
```

#### Проверка с пустым parametrs (должен вернуть 400):
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%7D" | jq '.'
```

#### Краткая проверка структуры:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '{
  success: (.error == null),
  sectionsCount: (.sections | length),
  hasFormats: (.sections[]? | select(.id == "formats") | .id != null),
  hasHeader: (.sections[]? | select(.id == "header") | .id != null)
}'
```

### 2. Через скрипт test-layout-api.sh

```bash
bash test-layout-api.sh
```

Скрипт проверяет:
- Пустой parametrs (должен вернуть 400)
- Правильный parametrs (должен вернуть 200)
- Без parametrs (должен вернуть 400)
- Старый endpoint /api/layout (для сравнения)

### 3. Через Playwright тесты (требует браузеры)

```bash
npm run test:e2e -- e2e/layout-data-error-diagnosis.spec.ts
```

**Примечание:** Требует установки браузеров: `npx playwright install`

### 4. Через Node.js скрипт

```bash
cd backend && ./node_modules/.bin/tsx src/scripts/test-layout-frontend-request.ts
```

## Диагностика ошибок в браузере

### Шаг 1: Откройте DevTools
- Нажмите F12 или Cmd+Option+I
- Перейдите на вкладку **Network**

### Шаг 2: Найдите запрос к layout
- Фильтр: `/api/data`
- Найдите запрос с `query_id=layout`

### Шаг 3: Проверьте Request
- **Request URL:** должен содержать `query_id=layout&component_Id=layout&parametrs=...`
- **Query String Parameters:**
  - `query_id`: `layout`
  - `component_Id`: `layout`
  - `parametrs`: должен быть `{"layout_id":"main_dashboard"}` (URL-encoded)

### Шаг 4: Проверьте Response
- **Status Code:** должен быть 200 (не 400 или 500)
- **Response Body:** должен содержать `{"sections": [...]}`

### Шаг 5: Если ошибка 400
**Ошибка:** `invalid params: missing params: layout_id`

**Причина:** Frontend не передает `layout_id` в `parametrs`

**Решение:**
1. Проверьте `src/lib/api.ts` функция `fetchLayout`
2. Убедитесь, что `DEFAULT_LAYOUT_ID = "main_dashboard"` установлен
3. Проверьте, что `paramsJson = JSON.stringify({ layout_id: targetLayoutId })` формируется правильно

### Шаг 6: Если ошибка 500
**Ошибка:** `Internal Server Error` или `SQL execution error`

**Причина:** Проблема на стороне Backend

**Решение:**
1. Проверьте логи backend
2. Проверьте конфиг layout в БД: `SELECT * FROM config.component_queries WHERE query_id = 'layout'`
3. Проверьте, что view `config.layout_sections_json_view` существует

## Примеры проверки

### Проверка, что endpoint работает:
```bash
# Должен вернуть 200 с sections
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections | length'
# Ожидается: 4
```

### Проверка форматов:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections[] | select(.id == "formats") | .formats | keys'
# Ожидается: ["currency_rub", "number", "percent"]
```

### Проверка header:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections[] | select(.id == "header") | .components[0].componentId'
# Ожидается: "header"
```

## Созданные файлы для тестирования

1. ✅ `test-layout-api.sh` - bash скрипт для быстрой проверки
2. ✅ `e2e/layout-data-error-diagnosis.spec.ts` - Playwright тесты для диагностики
3. ✅ `backend/src/scripts/test-layout-frontend-request.ts` - Node.js скрипт для проверки
4. ✅ `LAYOUT_DATA_ERROR_REPORT.md` - отчет об ошибках

## Быстрая проверка (одна команда)

```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq 'if .error then "❌ Ошибка: \(.error)" else "✅ Успех: \(.sections | length) секций" end'
```
