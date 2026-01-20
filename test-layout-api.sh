#!/bin/bash
# Скрипт для тестирования layout API без браузера

API_BASE="http://localhost:3001/api"

echo "=== Тестирование Layout API ==="
echo ""

# Тест 1: Пустой parametrs (должен вернуть 400)
echo "1. Тест с пустым parametrs={}:"
curl -s "${API_BASE}/data?query_id=layout&component_Id=layout&parametrs=%7B%7D" | jq -r 'if .error then "  ❌ Ошибка: \(.error)" else "  ✅ Успех" end'
echo ""

# Тест 2: Правильный parametrs с layout_id (должен вернуть 200)
echo "2. Тест с правильным parametrs={layout_id: \"main_dashboard\"}:"
RESPONSE=$(curl -s "${API_BASE}/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D")
STATUS=$(echo "$RESPONSE" | jq -r 'if .error then "error" else "success" end')
if [ "$STATUS" = "success" ]; then
  SECTIONS_COUNT=$(echo "$RESPONSE" | jq '.sections | length')
  echo "  ✅ Успех: найдено секций: $SECTIONS_COUNT"
  
  # Проверяем наличие секций
  FORMATS=$(echo "$RESPONSE" | jq '.sections[] | select(.id == "formats") | .id')
  HEADER=$(echo "$RESPONSE" | jq '.sections[] | select(.id == "header") | .id')
  
  if [ "$FORMATS" != "null" ] && [ -n "$FORMATS" ]; then
    echo "  ✅ Секция formats найдена"
  else
    echo "  ❌ Секция formats не найдена"
  fi
  
  if [ "$HEADER" != "null" ] && [ -n "$HEADER" ]; then
    echo "  ✅ Секция header найдена"
  else
    echo "  ❌ Секция header не найдена"
  fi
else
  echo "  ❌ Ошибка: $(echo "$RESPONSE" | jq -r '.error')"
fi
echo ""

# Тест 3: Без parametrs (должен вернуть 400)
echo "3. Тест без parametrs параметра:"
curl -s "${API_BASE}/data?query_id=layout&component_Id=layout" | jq -r 'if .error then "  ❌ Ошибка: \(.error)" else "  ✅ Успех" end'
echo ""

# Тест 4: Старый endpoint /api/layout (для сравнения)
echo "4. Тест старого endpoint /api/layout:"
OLD_RESPONSE=$(curl -s "${API_BASE}/layout")
OLD_STATUS=$(echo "$OLD_RESPONSE" | jq -r 'if .error then "error" else "success" end')
if [ "$OLD_STATUS" = "success" ]; then
  OLD_SECTIONS=$(echo "$OLD_RESPONSE" | jq '.sections | length')
  OLD_FORMATS=$(echo "$OLD_RESPONSE" | jq '.formats | keys | length')
  OLD_HEADER=$(echo "$OLD_RESPONSE" | jq 'if .header then "present" else "missing" end')
  echo "  ✅ Успех: секций=$OLD_SECTIONS, форматов=$OLD_FORMATS, header=$OLD_HEADER"
else
  echo "  ❌ Ошибка: $(echo "$OLD_RESPONSE" | jq -r '.error')"
fi
echo ""

echo "=== Итоги ==="
echo "Для диагностики ошибок в браузере:"
echo "1. Откройте DevTools → Network"
echo "2. Найдите запрос к /api/data?query_id=layout"
echo "3. Проверьте Request URL и параметры"
echo "4. Проверьте Response - должна быть ошибка 400 или 500"
echo ""
echo "Если ошибка 400 'missing params: layout_id':"
echo "  - Frontend не передает layout_id в parametrs"
echo "  - Проверьте src/lib/api.ts функция fetchLayout"
echo ""
echo "Если ошибка 500:"
echo "  - Проверьте логи backend"
echo "  - Проверьте конфиг layout в БД"
