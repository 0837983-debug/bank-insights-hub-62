#!/bin/bash

# Скрипт для проверки и запуска серверов (backend и frontend)
# Возвращает коды ошибок:
#   0 - все серверы запущены или успешно запущены
#   1 - ошибка запуска backend
#   2 - ошибка запуска frontend
#   3 - ошибка запуска обоих серверов

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Порты серверов
BACKEND_PORT=3001
FRONTEND_PORT=8080

# Таймауты
STARTUP_TIMEOUT=30
HEALTH_CHECK_TIMEOUT=5

# Коды ошибок
ERROR_BACKEND=1
ERROR_FRONTEND=2
ERROR_BOTH=3

# Флаги ошибок
BACKEND_ERROR=0
FRONTEND_ERROR=0

# Получаем абсолютный путь к корню проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
echo "BACKEND_DIR: $BACKEND_DIR"
# Проверка наличия необходимых инструментов
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ Ошибка: curl не установлен. Установите curl для работы скрипта.${NC}"
    exit 1
fi

if ! command -v lsof &> /dev/null; then
    echo -e "${RED}❌ Ошибка: lsof не установлен. Установите lsof для работы скрипта.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Ошибка: npm не установлен. Установите Node.js и npm для работы скрипта.${NC}"
    exit 1
fi

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

# Основная логика
main() {
    echo -e "${BLUE}🔍 Проверка статуса серверов...${NC}"
    echo ""
    
    # Проверка backend
    if check_port $BACKEND_PORT; then
        if check_backend_health; then
            echo -e "${GREEN}✅ Backend уже запущен и работает на порту $BACKEND_PORT${NC}"
        else
            echo -e "${YELLOW}⚠️  Backend слушает порт $BACKEND_PORT, но не отвечает на health check${NC}"
            echo -e "${YELLOW}   Попытка перезапуска...${NC}"
            # Находим и убиваем процесс на порту
            lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
            sleep 2
            if ! start_backend; then
                BACKEND_ERROR=1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Backend не запущен${NC}"
        if ! start_backend; then
            BACKEND_ERROR=1
        fi
    fi
    
    echo ""
    
    # Проверка frontend
    if check_port $FRONTEND_PORT; then
        if check_frontend_health; then
            echo -e "${GREEN}✅ Frontend уже запущен и работает на порту $FRONTEND_PORT${NC}"
        else
            echo -e "${YELLOW}⚠️  Frontend слушает порт $FRONTEND_PORT, но не отвечает${NC}"
            echo -e "${YELLOW}   Попытка перезапуска...${NC}"
            # Находим и убиваем процесс на порту
            lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
            sleep 2
            if ! start_frontend; then
                FRONTEND_ERROR=1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Frontend не запущен${NC}"
        if ! start_frontend; then
            FRONTEND_ERROR=1
        fi
    fi
    
    echo ""
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
    else
        echo -e "${GREEN}✅ Все серверы запущены и работают${NC}"
        echo -e "${GREEN}   Backend:  http://localhost:$BACKEND_PORT${NC}"
        echo -e "${GREEN}   Frontend: http://localhost:$FRONTEND_PORT${NC}"
        exit 0
    fi
}

# Запуск основной функции
main
