---
title: Команды
description: Список всех доступных команд проекта
related:
  - /getting-started/quick-start
  - /development/setup
---

# Команды

Полный список всех доступных команд проекта Bank Insights Hub.

## Frontend команды (корень проекта)

### Разработка

```bash
npm run dev              # Запуск dev сервера (Vite)
npm run build            # Сборка для production
npm run build:dev        # Сборка в dev режиме
npm run preview          # Предпросмотр production build
```

### Проверка кода

```bash
npm run lint             # Проверка кода (ESLint)
npm run lint:fix         # Автоматическое исправление ошибок
npm run format           # Форматирование кода (Prettier)
npm run format:check     # Проверка форматирования
npm run type-check       # Проверка типов TypeScript
```

### Тестирование

```bash
npm run test             # Запуск unit тестов (Vitest)
npm run test:watch       # Запуск тестов в watch режиме
npm run test:ui          # UI для тестов
npm run test:coverage    # Тесты с покрытием кода
npm run test:e2e         # Запуск E2E тестов (Playwright)
npm run test:e2e:ui      # E2E тесты с UI
npm run test:e2e:headed  # E2E тесты в видимом браузере
npm run test:e2e:api     # Только API интеграционные тесты
npm run test:e2e:security # Тесты безопасности
npm run test:all         # Все тесты (unit + e2e)
```

### Комплексные проверки

```bash
npm run pre-commit       # Перед коммитом (lint + format + test)
npm run validate         # Полная валидация (type-check + lint + format + test + e2e)
npm run ci               # CI pipeline (validate + build)
```

### Документация

```bash
npm run docs:dev         # Запуск dev сервера документации (VitePress)
npm run docs:build       # Сборка документации
npm run docs:preview     # Предпросмотр документации
```

## Backend команды (папка backend/)

```bash
cd backend
```

### Разработка

```bash
npm run dev              # Запуск dev сервера (tsx watch)
npm run build            # Компиляция TypeScript
npm start                # Запуск production сервера
```

### База данных

```bash
npm run migrate          # Выполнение миграций БД
npm run migrate-data     # Миграция layout данных
npm run load-data        # Загрузка данных таблиц
```

## Shell скрипты

### Запуск серверов

```bash
./scripts/start-servers.sh    # Запуск обоих серверов (backend + frontend)
```

**Что делает:**
- Запускает backend на `http://localhost:3001`
- Запускает frontend на `http://localhost:8080`
- Управляет процессами в фоне

### Валидация

```bash
./scripts/validate.sh         # Полная валидация проекта
```

**Что проверяет:**
- Типы TypeScript
- Линтинг (ESLint)
- Форматирование (Prettier)
- Тесты (Vitest + Playwright)
- Сборка (build)

## Полезные команды

### Проверка подключения к БД

```bash
cd backend
tsx src/scripts/check-db-connection.ts
```

### Просмотр структуры БД

```bash
# Подключение к PostgreSQL
psql -h host -U user -d bankdb

# Просмотр схем
\dn

# Просмотр таблиц в схеме
\dt config.*
\dt mart.*

# Описание таблицы
\d mart.kpi_metrics
```

### Тестирование API

```bash
# Health check
curl http://localhost:3001/api/health

# KPI метрики
curl "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=%7B%7D"

# Layout
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D"

# Table data
curl http://localhost:3001/api/table-data/balance_assets
```

## См. также

- [Быстрый старт](/getting-started/quick-start) - как запустить проект
- [Настройка окружения](/development/setup) - детали настройки
- [CI/CD Pipeline](/deployment/ci-cd) - использование в CI/CD
