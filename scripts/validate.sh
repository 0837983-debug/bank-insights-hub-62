#!/bin/bash

# CI/CD Validation Script
# Выполняет полную проверку кода перед деплоем

# Получаем путь к директории скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Starting CI/CD Pipeline..."
echo "================================"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Счетчик ошибок
ERRORS=0

# Функция для вывода статуса
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

# 0. Проверка и запуск серверов
echo ""
echo -e "${BLUE}🔌 Step 0/6: Проверка и запуск серверов...${NC}"
echo "-----------------------------------"
"$SCRIPT_DIR/start-servers.sh"
SERVER_EXIT_CODE=$?

    case $SERVER_EXIT_CODE in
        0)
        print_status 0 "Серверы запущены и работают"
        ;;
    1)
        print_status 1 "Ошибка запуска backend сервера"
        echo -e "${YELLOW}⚠️  Продолжаем валидацию, но некоторые тесты могут не пройти${NC}"
        ;;
    2)
        print_status 1 "Ошибка запуска frontend сервера"
        echo -e "${YELLOW}⚠️  Продолжаем валидацию, но некоторые тесты могут не пройти${NC}"
        ;;
    3)
        print_status 1 "Ошибка запуска обоих серверов"
        echo -e "${YELLOW}⚠️  Продолжаем валидацию, но некоторые тесты могут не пройти${NC}"
        ;;
    4)
        print_status 1 "Ошибка подключения к базе данных"
        echo ""
        echo -e "${RED}❌ Критическая ошибка: невозможно подключиться к базе данных${NC}"
        echo -e "${YELLOW}💡 Проверьте настройки подключения в backend/.env или переменные окружения${NC}"
        echo -e "${YELLOW}   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD${NC}"
        echo ""
        echo -e "${RED}⚠️  Валидация прервана: без подключения к БД дальнейшие проверки невозможны${NC}"
        exit 1
        ;;
    5)
        print_status 1 "Ошибка запуска сервера документации"
        echo -e "${YELLOW}⚠️  Продолжаем валидацию, документация не критична для тестов${NC}"
        ;;
    *)
        print_status 1 "Неизвестная ошибка при запуске серверов (код: $SERVER_EXIT_CODE)"
        echo -e "${YELLOW}⚠️  Продолжаем валидацию, но некоторые тесты могут не пройти${NC}"
        ;;
    esac

# 1. Type Checking
echo ""
echo "📝 Step 1/6: TypeScript Type Checking..."
echo "-----------------------------------"
if npm run type-check; then
    print_status 0 "Type checking passed"
else
    print_status 1 "Type checking failed"
fi

# 2. Linting
echo ""
echo "🔍 Step 2/6: ESLint (Code Quality & Security)..."
echo "-----------------------------------"
if npm run lint; then
    print_status 0 "Linting passed"
else
    print_status 1 "Linting failed"
    echo -e "${YELLOW}💡 Tip: Run 'npm run lint:fix' to auto-fix issues${NC}"
fi

# 3. Code Formatting
echo ""
echo "🎨 Step 3/6: Prettier (Code Formatting)..."
echo "-----------------------------------"
if npm run format:check; then
    print_status 0 "Formatting check passed"
else
    print_status 1 "Formatting check failed"
    echo -e "${YELLOW}💡 Tip: Run 'npm run format' to auto-format code${NC}"
fi

# 4. Unit Tests
echo ""
echo "🧪 Step 4/6: Running Unit Tests..."
echo "-----------------------------------"
if npm run test; then
    print_status 0 "All tests passed"
else
    print_status 1 "Some tests failed"
fi

# 5. Build
echo ""
echo "🏗️  Step 5/6: Production Build..."
echo "-----------------------------------"
if npm run build; then
    print_status 0 "Build successful"
else
    print_status 1 "Build failed"
fi

# 6. E2E Tests (требуют запущенных серверов)
echo ""
echo "🌐 Step 6/6: E2E Tests..."
echo "-----------------------------------"
cd "$PROJECT_ROOT"
if npm run test:e2e; then
    print_status 0 "E2E tests passed"
else
    print_status 1 "Some E2E tests failed"
fi

# Final Report
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for production.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS check(s) failed. Please fix errors before deploying.${NC}"
    exit 1
fi
