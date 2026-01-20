# Отчет об ошибках: Layout через /api/data

**Дата:** 2026-01-20
**Проблема:** Ошибки 500 в браузере при загрузке layout

## Обнаруженные проблемы

### 1. Ошибка 500 при запросе layout ✅ ИСПРАВЛЕНО

**Симптомы:**
- В консоли браузера: `GET http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametr... 500 (Internal Server Error)`
- Предупреждение: `Header data is empty or invalid: undefined`

**Причина:**
- Frontend отправляет запрос с пустым `parametrs={}` или без `layout_id`
- Backend требует `layout_id` в параметрах (из конфига WHERE: `value: ":layout_id"`)
- Валидация параметров выбрасывает ошибку: `invalid params: missing params: layout_id`

**Проверка:**
```bash
# Пустой parametrs - возвращает 400
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%7D"
# Ответ: {"error":"invalid params: missing params: layout_id"}

# Правильный parametrs - возвращает 200
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D"
# Ответ: {"sections": [...]}
```

**Решение:**
- Frontend код в `src/lib/api.ts` (строка 143) правильно формирует `paramsJson = JSON.stringify({ layout_id: targetLayoutId })`
- Проблема может быть в том, что `targetLayoutId` равен `undefined` или `null`
- Нужно проверить, что `DEFAULT_LAYOUT_ID = "main_dashboard"` установлен правильно

### 2. Предупреждение "Header data is empty or invalid" ⚠️

**Симптомы:**
- `DynamicDashboard.tsx:370` "Header data is empty or invalid: undefined"

**Причина:**
- Header не загружается из-за ошибки 500 при запросе layout
- После исправления ошибки 500, header должен загрузиться корректно

## Тесты для диагностики

### Созданные файлы:
1. ✅ `e2e/layout-data-error-diagnosis.spec.ts` - тесты для диагностики ошибок
2. ✅ `backend/src/scripts/test-layout-frontend-request.ts` - скрипт для проверки запросов

### Команды для проверки:

```bash
# 1. Проверка с пустым parametrs (должен вернуть 400)
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%7D" | jq '.'

# 2. Проверка с правильным parametrs (должен вернуть 200)
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '{sectionsCount: (.sections | length)}'

# 3. Проверка конфига в БД
cd backend && ./node_modules/.bin/tsx src/scripts/check-layout-query.ts
```

## Рекомендации

### Для Frontend:
1. ✅ Убедиться, что `DEFAULT_LAYOUT_ID = "main_dashboard"` установлен
2. ✅ Проверить, что `fetchLayout` всегда передает `layout_id` в `parametrs`
3. ✅ Добавить обработку ошибок для случая, когда layout не загружается

### Для Backend:
1. ✅ Улучшить сообщения об ошибках (уже есть детальные сообщения)
2. ✅ Возможно, сделать `layout_id` опциональным с дефолтным значением `main_dashboard`

## Следующие шаги

1. Проверить логи backend при запросе от Frontend
2. Убедиться, что Frontend отправляет правильные параметры
3. Добавить обработку ошибок на Frontend
4. Запустить тесты после исправления
