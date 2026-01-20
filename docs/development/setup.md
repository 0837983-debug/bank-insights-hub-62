---
title: Настройка окружения
description: Инструкции по настройке окружения для разработки
related:
  - /getting-started/installation
  - /database/schemas
---

# Настройка окружения для разработки

## Backend Setup

### 1. Установка зависимостей

```bash
cd backend
npm install
```

### 2. Настройка переменных окружения

Параметры подключения к БД уже настроены в `src/config/database.ts` и используют значения по умолчанию из `test-connection.js`.

При необходимости создайте `.env` файл:

```env
DB_HOST=bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=bankdb
DB_USER=pm
DB_PASSWORD=your_password
PORT=3001
NODE_ENV=development
```

### 3. Запуск миграций

```bash
npm run migrate
```

Это создаст:
- Схему `dashboard` в БД
- Таблицы для KPI метрик, категорий, данных таблиц и графиков
- Начальные данные для KPI метрик

### 4. Загрузка данных таблиц (опционально)

```bash
npm run load-data
```

Это загрузит данные для таблиц доходов и расходов.

### 5. Настройка загрузки файлов

Система загрузки файлов использует локальное хранилище для сохранения загруженных файлов.

**Структура папок:**
- `row/processed/balance/` - загруженные файлы баланса
  - Формат имени файла: `{original_filename}_{timestamp}.{extension}`
  - Пример: `balance_20250117_143022.csv`

**Создание папок:**
Папки создаются автоматически при первой загрузке файла.

**При необходимости создать вручную:**
```bash
mkdir -p row/processed/balance
```

**Права доступа:**
Убедитесь, что у процесса backend есть права на запись в папку `row/processed/`.

### 6. Запуск сервера

```bash
npm run dev
```

Сервер будет доступен на `http://localhost:3001`

## Frontend Setup

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск dev сервера

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:8080`

## Проверка настройки

### Проверка подключения к БД

```bash
cd backend
npm run check-db-connection
```

### Проверка работы API

```bash
# Проверка KPI endpoints
curl "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=%7B%7D"

# Проверка layout
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D"
```

## Полезные команды

### Backend

```bash
# Запуск миграций
npm run migrate

# Загрузка данных
npm run load-data

# Проверка подключения к БД
npm run check-db-connection

# Запуск в dev режиме
npm run dev

# Сборка
npm run build
```

### Frontend

```bash
# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Предпросмотр production build
npm run preview

# Проверка типов
npm run type-check

# Линтинг
npm run lint

# Форматирование
npm run format
```

## См. также

- [Быстрый старт](/getting-started/quick-start)
- [Структура проекта](/getting-started/project-structure)
- [База данных](/database/)
