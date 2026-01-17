---
title: База данных
description: Документация по структуре и работе с базой данных
---

# База данных

Документация по структуре и работе с базой данных PostgreSQL.

## Схемы базы данных

Проект использует несколько схем PostgreSQL:

- `dashboard` - Основные данные дашборда
- `config` - Конфигурация и метаданные
- `mart` - Data Mart для агрегированных данных
- `sec` - Безопасность (users, roles)
- `dict` - Справочники
- `stg` - Staging (сырые данные)
- `ods` - Operational Data Store
- `ing` - Ingestion (управление загрузкой)
- `log` - Логирование

## Разделы

- [Схемы БД](/database/schemas) - детальное описание схем
- [Миграции](/database/migrations) - работа с миграциями
- [Data Marts](/database/data-marts) - структура Data Marts
