#!/bin/bash

# Скрипт для копирования компонентов из прототипа
# Использование: ./scripts/copy-from-prototype.sh path/to/component

set -e

if [ -z "$1" ]; then
  echo "❌ Ошибка: укажите путь к компоненту"
  echo ""
  echo "Использование:"
  echo "  ./scripts/copy-from-prototype.sh frontend/src/components/MyComponent.tsx"
  echo ""
  echo "Примеры:"
  echo "  ./scripts/copy-from-prototype.sh frontend/src/components/Button.tsx"
  echo "  ./scripts/copy-from-prototype.sh frontend/src/hooks/useData.ts"
  exit 1
fi

COMPONENT_PATH=$1
COMPONENT_NAME=$(basename "$COMPONENT_PATH")
CURRENT_BRANCH=$(git branch --show-current)

# Проверка, что мы на ветке main
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  Внимание: вы не на ветке main (текущая ветка: $CURRENT_BRANCH)"
  read -p "Продолжить? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Проверка существования файла в прототипе
if ! git cat-file -e "prototype/lovable:$COMPONENT_PATH" 2>/dev/null; then
  echo "❌ Файл не найден в прототипе: $COMPONENT_PATH"
  echo ""
  echo "Доступные файлы в прототипе:"
  git ls-tree -r --name-only prototype/lovable | grep -E "(components|hooks|utils)" | head -20
  exit 1
fi

# Создание директории, если её нет
COMPONENT_DIR=$(dirname "$COMPONENT_PATH")
if [ ! -d "$COMPONENT_DIR" ]; then
  echo "📁 Создаю директорию: $COMPONENT_DIR"
  mkdir -p "$COMPONENT_DIR"
fi

# Копирование файла
echo "📋 Копирую $COMPONENT_NAME из prototype/lovable..."
git show "prototype/lovable:$COMPONENT_PATH" > "$COMPONENT_PATH"

echo "✅ Компонент скопирован: $COMPONENT_PATH"
echo ""
echo "⚠️  Следующие шаги:"
echo "   1. Проверьте и адаптируйте код под структуру проекта"
echo "   2. Обновите импорты и зависимости"
echo "   3. Протестируйте компонент"
echo "   4. Закоммитьте изменения: git add $COMPONENT_PATH && git commit"

