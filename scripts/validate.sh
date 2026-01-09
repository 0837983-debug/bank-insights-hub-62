#!/bin/bash

# CI/CD Validation Script
# Выполняет полную проверку кода перед деплоем

set -e  # Exit on error

echo "🚀 Starting CI/CD Pipeline..."
echo "================================"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

# 1. Type Checking
echo ""
echo "📝 Step 1/5: TypeScript Type Checking..."
echo "-----------------------------------"
if npm run type-check; then
    print_status 0 "Type checking passed"
else
    print_status 1 "Type checking failed"
fi

# 2. Linting
echo ""
echo "🔍 Step 2/5: ESLint (Code Quality & Security)..."
echo "-----------------------------------"
if npm run lint; then
    print_status 0 "Linting passed"
else
    print_status 1 "Linting failed"
    echo -e "${YELLOW}💡 Tip: Run 'npm run lint:fix' to auto-fix issues${NC}"
fi

# 3. Code Formatting
echo ""
echo "🎨 Step 3/5: Prettier (Code Formatting)..."
echo "-----------------------------------"
if npm run format:check; then
    print_status 0 "Formatting check passed"
else
    print_status 1 "Formatting check failed"
    echo -e "${YELLOW}💡 Tip: Run 'npm run format' to auto-format code${NC}"
fi

# 4. Unit Tests
echo ""
echo "🧪 Step 4/5: Running Unit Tests..."
echo "-----------------------------------"
if npm run test; then
    print_status 0 "All tests passed"
else
    print_status 1 "Some tests failed"
fi

# 5. Build
echo ""
echo "🏗️  Step 5/5: Production Build..."
echo "-----------------------------------"
if npm run build; then
    print_status 0 "Build successful"
else
    print_status 1 "Build failed"
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
