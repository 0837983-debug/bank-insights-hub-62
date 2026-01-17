#!/bin/bash

# Скрипт для проверки и запуска серверов (backend, frontend и документация)
# Порядок выполнения:
#   1. Проверка подключения к базе данных (критично)
#   2. Проверка и запуск backend сервера
#   3. Проверка и запуск frontend сервера
#   4. Проверка и запуск сервера документации
#
# Возвращает коды ошибок:
#   0 - все серверы запущены или успешно запущены
#   1 - ошибка запуска backend
#   2 - ошибка запуска frontend
#   3 - ошибка запуска обоих серверов
#   4 - ошибка подключения к базе данных
#   5 - ошибка запуска документации

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Порты серверов
BACKEND_PORT=3001
FRONTEND_PORT=8080
DOCS_PORT=5173

# Таймауты
STARTUP_TIMEOUT=30
HEALTH_CHECK_TIMEOUT=5

# Коды ошибок
ERROR_BACKEND=1
ERROR_FRONTEND=2
ERROR_BOTH=3
ERROR_DATABASE=4
ERROR_DOCS=5

# Флаги ошибок
BACKEND_ERROR=0
FRONTEND_ERROR=0
DOCS_ERROR=0

# Получаем абсолютный путь к корню проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Проверка наличия необходимых инструментов
check_requirements() {
    local missing_tools=()
    
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    if ! command -v lsof &> /dev/null; then
        missing_tools+=("lsof")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo -e "${RED}❌ Ошибка: отсутствуют необходимые инструменты: ${missing_tools[*]}${NC}"
        echo -e "${YELLOW}💡 Установите недостающие инструменты для работы скрипта${NC}"
        exit 1
    fi
}

# Функция для проверки подключения к базе данных
check_database_connection() {
    echo -e "${BLUE}📊 Шаг 1/4: Проверка подключения к базе данных...${NC}"
    echo "-----------------------------------"
    
    cd "$BACKEND_DIR"
    
    # Проверяем, установлены ли зависимости
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Установка зависимостей backend для проверки БД...${NC}"
        npm install >/dev/null 2>&1
    fi
    
    # Запускаем скрипт проверки подключения
    local result
    result=$(npx tsx src/scripts/check-db-connection.ts 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Проверяем, что результат содержит "OK"
        if echo "$result" | grep -q "OK"; then
            echo -e "${GREEN}✅ Подключение к базе данных успешно${NC}"
            echo ""
            return 0
        else
            echo -e "${RED}❌ Неожиданный ответ от скрипта проверки БД${NC}"
            echo ""
            return 1
        fi
    else
        echo -e "${RED}❌ Ошибка подключения к базе данных${NC}"
        # Извлекаем только сообщение об ошибке (после "ERROR:")
        local error_msg=$(echo "$result" | grep "ERROR:" | sed 's/ERROR: //' || echo "$result")
        if [ -n "$error_msg" ]; then
            echo -e "${RED}   $error_msg${NC}"
        fi
        echo ""
        return 1
    fi
}

# Функция для проверки, слушает ли порт
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Порт занят
    else
        return 1  # Порт свободен
    fi
}

# Функция для проверки health endpoint backend
check_backend_health() {
    local max_attempts=6
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f -m $HEALTH_CHECK_TIMEOUT http://localhost:$BACKEND_PORT/api/health >/dev/null 2>&1; then
            return 0  # Backend здоров
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    return 1  # Backend не отвечает
}

# Функция для проверки frontend
check_frontend_health() {
    local max_attempts=6
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f -m $HEALTH_CHECK_TIMEOUT http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
            return 0  # Frontend доступен
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    return 1  # Frontend не отвечает
}

# Функция для проверки документации
check_docs_health() {
    local max_attempts=6
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f -m $HEALTH_CHECK_TIMEOUT http://localhost:$DOCS_PORT >/dev/null 2>&1; then
            return 0  # Документация доступна
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    return 1  # Документация не отвечает
}

# Функция для запуска backend
start_backend() {
    echo -e "${BLUE}🔄 Запуск backend сервера...${NC}"
    
    cd "$BACKEND_DIR"
    
    # Проверяем, установлены ли зависимости
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Установка зависимостей backend...${NC}"
        npm install
    fi
    
    # Запускаем backend в фоне
    nohup npm run dev > "$PROJECT_ROOT/backend.log" 2>&1 &
    local backend_pid=$!
    
    # Сохраняем PID для возможного завершения процесса
    echo $backend_pid > "$PROJECT_ROOT/.backend.pid"
    
    echo -e "${BLUE}⏳ Ожидание запуска backend (PID: $backend_pid)...${NC}"
    
    # Ждем, пока backend запустится
    if check_backend_health; then
        echo -e "${GREEN}✅ Backend успешно запущен на порту $BACKEND_PORT${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend не запустился за $STARTUP_TIMEOUT секунд${NC}"
        # Пытаемся убить процесс
        kill $backend_pid 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.backend.pid"
        return 1
    fi
}

# Функция для проверки и запуска backend
check_and_start_backend() {
    echo -e "${BLUE}🔧 Шаг 2/4: Проверка и запуск backend сервера...${NC}"
    echo "-----------------------------------"
    
    if check_port $BACKEND_PORT; then
        if check_backend_health; then
            echo -e "${GREEN}✅ Backend уже запущен и работает на порту $BACKEND_PORT${NC}"
            echo ""
            return 0
        else
            echo -e "${YELLOW}⚠️  Backend слушает порт $BACKEND_PORT, но не отвечает на health check${NC}"
            echo -e "${YELLOW}   Попытка перезапуска...${NC}"
            # Находим и убиваем процесс на порту
            lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
            sleep 2
            if ! start_backend; then
                echo ""
                return 1
            fi
            echo ""
            return 0
        fi
    else
        echo -e "${YELLOW}⚠️  Backend не запущен${NC}"
        if ! start_backend; then
            echo ""
            return 1
        fi
        echo ""
        return 0
    fi
}

# Функция для запуска frontend
start_frontend() {
    echo -e "${BLUE}🔄 Запуск frontend сервера...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Проверяем, установлены ли зависимости
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Установка зависимостей frontend...${NC}"
        npm install
    fi
    
    # Запускаем frontend в фоне
    nohup npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
    local frontend_pid=$!
    
    # Сохраняем PID для возможного завершения процесса
    echo $frontend_pid > "$PROJECT_ROOT/.frontend.pid"
    
    echo -e "${BLUE}⏳ Ожидание запуска frontend (PID: $frontend_pid)...${NC}"
    
    # Ждем, пока frontend запустится
    if check_frontend_health; then
        echo -e "${GREEN}✅ Frontend успешно запущен на порту $FRONTEND_PORT${NC}"
        return 0
    else
        echo -e "${RED}❌ Frontend не запустился за $STARTUP_TIMEOUT секунд${NC}"
        # Пытаемся убить процесс
        kill $frontend_pid 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.frontend.pid"
        return 1
    fi
}

# Функция для проверки и запуска frontend
check_and_start_frontend() {
    echo -e "${BLUE}🎨 Шаг 3/4: Проверка и запуск frontend сервера...${NC}"
    echo "-----------------------------------"
    
    if check_port $FRONTEND_PORT; then
        if check_frontend_health; then
            echo -e "${GREEN}✅ Frontend уже запущен и работает на порту $FRONTEND_PORT${NC}"
            echo ""
            return 0
        else
            echo -e "${YELLOW}⚠️  Frontend слушает порт $FRONTEND_PORT, но не отвечает${NC}"
            echo -e "${YELLOW}   Попытка перезапуска...${NC}"
            # Находим и убиваем процесс на порту
            lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
            sleep 2
            if ! start_frontend; then
                echo ""
                return 1
            fi
            echo ""
            return 0
        fi
    else
        echo -e "${YELLOW}⚠️  Frontend не запущен${NC}"
        if ! start_frontend; then
            echo ""
            return 1
        fi
        echo ""
        return 0
    fi
}

# Функция для запуска документации
start_docs() {
    echo -e "${BLUE}🔄 Запуск сервера документации...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Проверяем, установлены ли зависимости
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Установка зависимостей для документации...${NC}"
        npm install
    fi
    
    # Проверяем наличие папки docs
    if [ ! -d "docs" ]; then
        echo -e "${RED}❌ Папка docs не найдена${NC}"
        return 1
    fi
    
    # Запускаем документацию в фоне
    nohup npm run docs:dev > "$PROJECT_ROOT/docs.log" 2>&1 &
    local docs_pid=$!
    
    # Сохраняем PID для возможного завершения процесса
    echo $docs_pid > "$PROJECT_ROOT/.docs.pid"
    
    echo -e "${BLUE}⏳ Ожидание запуска документации (PID: $docs_pid)...${NC}"
    
    # Ждем, пока документация запустится
    if check_docs_health; then
        echo -e "${GREEN}✅ Документация успешно запущена на порту $DOCS_PORT${NC}"
        return 0
    else
        echo -e "${RED}❌ Документация не запустилась за $STARTUP_TIMEOUT секунд${NC}"
        # Пытаемся убить процесс
        kill $docs_pid 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.docs.pid"
        return 1
    fi
}

# Функция для проверки и запуска документации
check_and_start_docs() {
    echo -e "${BLUE}📚 Шаг 4/4: Проверка и запуск сервера документации...${NC}"
    echo "-----------------------------------"
    
    if check_port $DOCS_PORT; then
        if check_docs_health; then
            echo -e "${GREEN}✅ Документация уже запущена и работает на порту $DOCS_PORT${NC}"
            echo ""
            return 0
        else
            echo -e "${YELLOW}⚠️  Документация слушает порт $DOCS_PORT, но не отвечает${NC}"
            echo -e "${YELLOW}   Попытка перезапуска...${NC}"
            # Находим и убиваем процесс на порту
            lsof -ti :$DOCS_PORT | xargs kill -9 2>/dev/null || true
            sleep 2
            if ! start_docs; then
                echo ""
                return 1
            fi
            echo ""
            return 0
        fi
    else
        echo -e "${YELLOW}⚠️  Документация не запущена${NC}"
        if ! start_docs; then
            echo ""
            return 1
        fi
        echo ""
        return 0
    fi
}

# Основная логика
main() {
    echo -e "${BLUE}🚀 Запуск проверки и запуска серверов...${NC}"
    echo "================================"
    echo ""
    
    # Проверка требований
    check_requirements
    
    # Шаг 1: Проверка подключения к базе данных (критично)
    if ! check_database_connection; then
        echo -e "${RED}❌ Критическая ошибка: невозможно подключиться к базе данных${NC}"
        echo -e "${YELLOW}⚠️  Проверьте настройки подключения в .env файле или переменных окружения${NC}"
        echo -e "${YELLOW}   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD${NC}"
        echo ""
        exit $ERROR_DATABASE
    fi
    
    # Шаг 2: Проверка и запуск backend
    if ! check_and_start_backend; then
        BACKEND_ERROR=1
    fi
    
    # Шаг 3: Проверка и запуск frontend
    if ! check_and_start_frontend; then
        FRONTEND_ERROR=1
    fi
    
    # Шаг 4: Проверка и запуск документации
    if ! check_and_start_docs; then
        DOCS_ERROR=1
    fi
    
    # Финальный отчет
    echo -e "${BLUE}==============================${NC}"
    
    # Определяем код возврата
    if [ $BACKEND_ERROR -eq 1 ] && [ $FRONTEND_ERROR -eq 1 ]; then
        echo -e "${RED}❌ Ошибка: не удалось запустить оба сервера${NC}"
        exit $ERROR_BOTH
    elif [ $BACKEND_ERROR -eq 1 ]; then
        echo -e "${RED}❌ Ошибка: не удалось запустить backend${NC}"
        exit $ERROR_BACKEND
    elif [ $FRONTEND_ERROR -eq 1 ]; then
        echo -e "${RED}❌ Ошибка: не удалось запустить frontend${NC}"
        exit $ERROR_FRONTEND
    elif [ $DOCS_ERROR -eq 1 ]; then
        echo -e "${RED}❌ Ошибка: не удалось запустить документацию${NC}"
        exit $ERROR_DOCS
    else
        echo -e "${GREEN}✅ Все серверы запущены и работают${NC}"
        echo -e "${GREEN}   Backend:      http://localhost:$BACKEND_PORT${NC}"
        echo -e "${GREEN}   Frontend:     http://localhost:$FRONTEND_PORT${NC}"
        echo -e "${GREEN}   Документация: http://localhost:$DOCS_PORT${NC}"
        exit 0
    fi
}

# Запуск основной функции
main
