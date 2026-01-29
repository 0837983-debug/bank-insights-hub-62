---
title: Архитектура
description: Обзор архитектуры проекта Bank Insights Hub
---

# Архитектура

Обзор архитектуры проекта Bank Insights Hub.

## Общая архитектура

Bank Insights Hub построен как full-stack приложение с разделением на frontend и backend.

```
┌─────────────┐
│  Frontend  │  React + TypeScript + Vite
│  (Port 8080)│
└──────┬──────┘
       │ HTTP/REST API
       │
┌──────▼──────┐
│   Backend   │  Node.js + Express + TypeScript
│  (Port 3001)│
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │  База данных
│   Database  │
└─────────────┘
```

## Компоненты системы

### Frontend

- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик и dev сервер
- **Tailwind CSS** - стилизация
- **shadcn/ui** - UI компоненты
- **React Query** - управление состоянием и кэширование данных

### Backend

- **Node.js** - runtime
- **Express** - web framework
- **TypeScript** - типизация
- **PostgreSQL** - база данных

### База данных

Используется PostgreSQL с несколькими схемами:
- `dashboard` - основные данные дашборда
- `config` - конфигурация и метаданные
- `mart` - Data Mart для агрегированных данных

## Поток данных

1. **Frontend** запрашивает данные через REST API
2. **Backend** обрабатывает запросы и обращается к БД
3. **Data Mart** предоставляет агрегированные данные
4. **Frontend** отображает данные в UI компонентах

## Разделы документации

- [Общая архитектура](/architecture/overview) - детальное описание
- [Frontend архитектура](/architecture/frontend) - структура frontend
- [Backend архитектура](/architecture/backend/) - структура backend
- [База данных](/architecture/database) - структура БД
- [Поток данных](/architecture/data-flow) - детальный поток данных
- [Layout Architecture](/architecture/layout) - архитектура layout системы и data_source_key
