#!/bin/bash

# Скрипт для просмотра файлов в прототипе
# Использование: ./scripts/view-prototype.sh [path]

set -e

if [ -z "$1" ]; then
  echo "📋 Файлы в prototype/lovable:"
  echo ""
  git ls-tree -r --name-only prototype/lovable | grep -E "\.(tsx?|jsx?|css|json)$" | head -30
  echo ""
  echo "Использование:"
  echo "  ./scripts/view-prototype.sh                    # Список всех файлов"
  echo "  ./scripts/view-prototype.sh components         # Файлы в components"
  echo "  ./scripts/view-prototype.sh frontend/src       # Файлы в frontend/src"
else
  PATTERN=$1
  echo "📋 Файлы в prototype/lovable (фильтр: $PATTERN):"
  echo ""
  git ls-tree -r --name-only prototype/lovable | grep "$PATTERN" | head -30
fi

echo ""
echo "💡 Для просмотра содержимого файла:"
echo "   git show prototype/lovable:path/to/file.tsx"

