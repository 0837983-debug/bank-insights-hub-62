---
layout: home

hero:
  name: "Bank Insights Hub"
  text: "Документация проекта"
  tagline: Дашборд для визуализации банковских метрик и аналитики
  image:
    src: /logo.png
    alt: Bank Insights Hub
  actions:
    - theme: brand
      text: Начать работу
      link: /getting-started/quick-start
    - theme: alt
      text: Архитектура
      link: /architecture/

features:
  - title: 🏗️ Архитектура
    details: Полное описание архитектуры системы, включая frontend, backend и базу данных
    link: /architecture/
  - title: 📡 API Reference
    details: Подробная документация всех API endpoints с примерами использования
    link: /api/
  - title: 💻 Разработка
    details: Руководства по разработке, стандарты кодирования и лучшие практики
    link: /development/
  - title: 🗄️ База данных
    details: Структура схем, миграции и работа с Data Marts
    link: /database/
  - title: 🚀 Деплой
    details: CI/CD pipeline, настройка окружения и production deployment
    link: /deployment/
  - title: 📚 Руководства
    details: Полезные руководства и решение проблем
    link: /guides/
---

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск backend
cd backend && npm install && npm run dev

# Запуск frontend (в другом терминале)
npm run dev
```

## Основные разделы

### [Начало работы](/getting-started/)
- Установка и настройка проекта
- Быстрый старт
- Структура проекта

### [Архитектура](/architecture/)
- Общая архитектура системы
- Frontend (React + TypeScript)
- Backend (Node.js + Express)
- База данных (PostgreSQL)
- Поток данных

### [API Reference](/api/)
- Все endpoints
- KPI API
- Table Data API
- Layout API
- Модели данных

### [Разработка](/development/)
- Настройка окружения
- Руководящие принципы
- Стандарты кодирования
- Тестирование

### [База данных](/database/)
- Схемы БД (dashboard, config, mart)
- Миграции
- Data Marts

### [Деплой](/deployment/)
- CI/CD Pipeline
- Переменные окружения
- Production deployment

## Технологический стек

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Query

**Backend:**
- Node.js
- Express
- TypeScript
- PostgreSQL

**Инструменты:**
- Vitest (unit тесты)
- Playwright (E2E тесты)
- ESLint + Prettier
