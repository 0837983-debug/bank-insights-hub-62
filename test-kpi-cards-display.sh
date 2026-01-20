#!/bin/bash
# Скрипт для быстрой проверки отображения KPI карточек на фронтенде

FRONTEND_URL="http://localhost:8080"
API_URL="http://localhost:3001/api"

echo "=== Проверка отображения KPI карточек ==="
echo ""

# 1. Проверка доступности фронтенда
echo "1. Проверка доступности фронтенда:"
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
  echo "   ✅ Frontend доступен"
else
  echo "   ❌ Frontend недоступен"
  exit 1
fi

# 2. Проверка API endpoint для KPIs
echo ""
echo "2. Проверка API endpoint для KPIs:"
OLD_RESPONSE=$(curl -s "$API_URL/kpis")
OLD_COUNT=$(echo "$OLD_RESPONSE" | jq 'length' 2>/dev/null || echo "0")

if [ "$OLD_COUNT" != "0" ] && [ -n "$OLD_COUNT" ]; then
  echo "   ✅ Старый endpoint /api/kpis: $OLD_COUNT элементов"
else
  echo "   ❌ Старый endpoint /api/kpis не работает"
fi

# 3. Проверка нового endpoint
echo ""
echo "3. Проверка нового endpoint /api/data?query_id=kpis:"
NEW_RESPONSE=$(curl -s "$API_URL/data?query_id=kpis&component_Id=kpis&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%2C%22p1%22%3A%222025-12-31%22%2C%22p2%22%3A%222025-11-30%22%2C%22p3%22%3A%222024-12-31%22%7D")
NEW_TYPE=$(echo "$NEW_RESPONSE" | jq -r 'type' 2>/dev/null || echo "error")

if [ "$NEW_TYPE" = "array" ]; then
  NEW_COUNT=$(echo "$NEW_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
  echo "   ✅ Новый endpoint: $NEW_COUNT элементов"
  
  # Показываем ID карточек
  echo "   Найденные KPI:"
  echo "$NEW_RESPONSE" | jq -r '.[] | "     - \(.id)"' 2>/dev/null || echo "     (не удалось распарсить)"
elif [ "$NEW_TYPE" = "object" ]; then
  if echo "$NEW_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR=$(echo "$NEW_RESPONSE" | jq -r '.error' 2>/dev/null)
    echo "   ❌ Ошибка: $ERROR"
  elif echo "$NEW_RESPONSE" | jq -e '.rows' > /dev/null 2>&1; then
    NEW_COUNT=$(echo "$NEW_RESPONSE" | jq '.rows | length' 2>/dev/null || echo "0")
    echo "   ✅ Новый endpoint (формат rows): $NEW_COUNT элементов"
  else
    echo "   ⚠️  Неожиданный формат ответа"
  fi
else
  echo "   ❌ Ошибка при запросе"
fi

# 4. Сравнение количества
echo ""
echo "4. Сравнение количества элементов:"
if [ "$OLD_COUNT" != "0" ] && [ "$NEW_COUNT" != "0" ]; then
  if [ "$OLD_COUNT" = "$NEW_COUNT" ]; then
    echo "   ✅ Количество совпадает: $OLD_COUNT элементов"
  else
    echo "   ⚠️  Количество отличается: старый=$OLD_COUNT, новый=$NEW_COUNT"
  fi
fi

# 5. Рекомендации
echo ""
echo "=== Рекомендации для тестирования ==="
echo ""
echo "Для проверки отображения карточек на фронтенде:"
echo "1. Откройте браузер: $FRONTEND_URL"
echo "2. Откройте DevTools (F12)"
echo "3. Перейдите на вкладку Network"
echo "4. Найдите запросы к /api/data?query_id=kpis"
echo "5. Проверьте Response - должны быть данные"
echo "6. Проверьте Elements - должны быть элементы с data-component-type=\"card\""
echo ""
echo "Или запустите E2E тесты:"
echo "  npm run test:e2e -- e2e/kpi-cards-display.spec.ts"
