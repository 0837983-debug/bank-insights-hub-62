---
title: Архитектурные слои
---

# Архитектурные слои

## 1. Route Layer (Routes)

Обработка HTTP запросов и валидация входных данных.

**Основные routes:**

### Универсальный endpoint `/api/data` (dataRoutes.ts)
- `GET /api/data?query_id=kpis` - получение KPI метрик через SQL Builder
- `GET /api/data?query_id=layout` - структура layout через SQL Builder
- `GET /api/data?query_id=assets_table` - табличные данные через SQL Builder
- `GET /api/data?query_id=header_dates` - даты периодов для header

**Все данные получаются через единый endpoint `/api/data` с использованием SQL Builder.**

### `/api/table-data` (tableDataRoutes.ts) - устаревший
- `GET /:tableId` - данные таблицы (legacy endpoint, рекомендуется использовать `/api/data`)

**Обязанности:**
- Валидация параметров запроса
- Обработка query параметров
- Вызов соответствующих сервисов
- Формирование HTTP ответов
- Обработка ошибок

## 2. Service Layer

Бизнес-логика и работа с данными.

[Перейти к разделу "Сервисы" →](./services)

## 3. Data Access Layer

Прямые SQL запросы к PostgreSQL через connection pool.

**Подключение:**
```typescript
import { pool } from '../config/database.js';
```

**Паттерны:**
- Параметризованные запросы (защита от SQL injection)
- Connection pooling для эффективности
- Транзакции где необходимо
