---
title: Backend архитектура
description: Архитектура backend части приложения
related:
  - /architecture/overview
  - /architecture/database
  - /architecture/data-flow
---

# Backend архитектура

Backend построен на Node.js с Express, используя TypeScript для типобезопасности.

## Основные разделы

- [Структура приложения](./structure) - организация файлов и директорий
- [Архитектурные слои](./layers) - Route Layer, Service Layer, Data Access Layer
- [Сервисы](./services) - описание всех сервисов backend
- [Middleware](./middleware) - обработка ошибок и middleware
- [Data Mart Pattern](./data-mart) - концепция и структура Data Mart
- [Обработка запросов](./request-processing) - типичные flow обработки запросов
- [Безопасность](./security) - защита от SQL injection, валидация
- [Оптимизация](./optimization) - connection pooling, кэширование
- [Миграции](./migrations) - SQL миграции базы данных

## См. также

- [Общая архитектура](/architecture/overview) - обзор системы
- [База данных](/architecture/database) - структура БД
- [Поток данных](/architecture/data-flow) - детальный поток данных
