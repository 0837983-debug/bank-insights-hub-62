# Как протестировать ошибки Layout без браузера

## Быстрая проверка (одна команда)

```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq 'if .error then "❌ Ошибка: \(.error)" else "✅ Успех: \(.sections | length) секций" end'
```

**Ожидается:** `✅ Успех: 4 секций`

## Полная диагностика

### 1. Запустите скрипт тестирования:

```bash
bash test-layout-api.sh
```

Скрипт проверит:
- ✅ Пустой parametrs (должен вернуть 400)
- ✅ Правильный parametrs (должен вернуть 200)
- ✅ Без parametrs (должен вернуть 400)
- ✅ Старый endpoint (для сравнения)

### 2. Проверьте, что отправляет Frontend:

#### В браузере (DevTools → Network):
1. Откройте DevTools (F12)
2. Перейдите на вкладку **Network**
3. Обновите страницу (F5)
4. Найдите запрос к `/api/data?query_id=layout`
5. Кликните на запрос
6. Проверьте **Request URL**:
   - Должен содержать: `parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D`
   - Если содержит: `parametrs=%7B%7D` - это проблема!

#### Через curl (имитация Frontend запроса):
```bash
# Правильный запрос (как должен делать Frontend)
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections | length'
# Ожидается: 4

# Неправильный запрос (пустой parametrs)
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%7D" | jq '.error'
# Ожидается: "invalid params: missing params: layout_id"
```

### 3. Проверьте код Frontend:

Откройте `src/lib/api.ts` и проверьте функцию `fetchLayout` (строки 139-179):

```typescript
export async function fetchLayout(layoutId?: string): Promise<Layout> {
  const targetLayoutId = layoutId || DEFAULT_LAYOUT_ID; // Должно быть "main_dashboard"
  
  const paramsJson = JSON.stringify({ layout_id: targetLayoutId });
  // ...
}
```

**Проверьте:**
- ✅ `DEFAULT_LAYOUT_ID = "main_dashboard"` (строка 121)
- ✅ `targetLayoutId` не равен `undefined` или `null`
- ✅ `paramsJson` содержит `{"layout_id":"main_dashboard"}`

### 4. Проверьте логи Backend:

Если Backend запущен, проверьте логи:
- Должны быть сообщения: `[getData] GET Request: query_id=layout, component_Id=layout, paramsJson=...`
- Если есть ошибки SQL, они будут в логах

## Типичные проблемы и решения

### Проблема 1: Ошибка 400 "missing params: layout_id"

**Причина:** Frontend отправляет пустой `parametrs={}`

**Решение:**
1. Проверьте `src/lib/api.ts` - функция `fetchLayout`
2. Убедитесь, что `DEFAULT_LAYOUT_ID` установлен
3. Проверьте, что `paramsJson` формируется правильно

### Проблема 2: Ошибка 500 "SQL execution error"

**Причина:** Проблема с SQL запросом или view

**Решение:**
1. Проверьте конфиг в БД: `SELECT * FROM config.component_queries WHERE query_id = 'layout'`
2. Проверьте view: `SELECT * FROM config.layout_sections_json_view WHERE layout_id = 'main_dashboard' LIMIT 1`
3. Проверьте логи backend

### Проблема 3: Header data is empty or invalid

**Причина:** Layout не загружается из-за ошибки 400/500

**Решение:**
1. Сначала исправьте ошибку загрузки layout
2. После исправления header должен загрузиться автоматически

## Примеры команд для проверки

### Проверка структуры ответа:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '{
  success: (.error == null),
  sectionsCount: (.sections | length),
  formatsSection: (.sections[]? | select(.id == "formats") | .id),
  headerSection: (.sections[]? | select(.id == "header") | .id),
  contentSections: [.sections[]? | select(.id != "formats" and .id != "header") | .id]
}'
```

### Проверка форматов:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections[] | select(.id == "formats") | .formats | keys'
```

### Проверка header:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections[] | select(.id == "header") | .components[0] | {componentId, type, dataSourceKey}'
```

## Созданные файлы

1. ✅ `test-layout-api.sh` - bash скрипт для автоматической проверки
2. ✅ `LAYOUT_DATA_TESTING_GUIDE.md` - подробное руководство
3. ✅ `LAYOUT_DATA_ERROR_REPORT.md` - отчет об ошибках
4. ✅ `e2e/layout-data-error-diagnosis.spec.ts` - Playwright тесты

## Итоговая команда для быстрой проверки

```bash
# Проверка работы API
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq 'if .error then "❌ \(.error)" else "✅ Работает: \(.sections | length) секций" end'
```

**Если видите `✅ Работает: 4 секций`** - API работает правильно, проблема в Frontend.
**Если видите `❌ invalid params: missing params: layout_id`** - Frontend отправляет неправильные параметры.
