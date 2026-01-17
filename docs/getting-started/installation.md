---
title: Установка
description: Инструкции по установке и настройке проекта Bank Insights Hub
---

# Установка

## Требования

- **Node.js** версии 18 или выше
- **npm** версии 9 или выше
- **PostgreSQL** версии 14 или выше
- Доступ к базе данных PostgreSQL

## Установка зависимостей

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd bank-insights-hub-62
```

### 2. Установка зависимостей Frontend

```bash
npm install
```

### 3. Установка зависимостей Backend

```bash
cd backend
npm install
cd ..
```

## Настройка базы данных

### 1. Создайте файл `.env` в папке `backend/`

```env
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=bankdb
DB_USER=your-username
DB_PASSWORD=your-password
PORT=3001
NODE_ENV=development
```

### 2. Запустите миграции

```bash
cd backend
npm run migrate
```

Это создаст:
- Схему `dashboard` в БД
- Таблицы для KPI метрик, категорий, данных таблиц и графиков
- Начальные данные для KPI метрик

### 3. (Опционально) Загрузите данные таблиц

```bash
npm run load-data
```

## Проверка установки

### Проверка подключения к БД

```bash
cd backend
npm run check-db-connection
```

### Запуск серверов

**Backend:**
```bash
cd backend
npm run dev
```

Сервер будет доступен на `http://localhost:3001`

**Frontend:**
```bash
npm run dev
```

Приложение будет доступно на `http://localhost:8080`

## Следующий шаг

Перейдите к [Быстрому старту](/getting-started/quick-start) для запуска проекта.
