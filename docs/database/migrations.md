---
title: Миграции
description: Работа с миграциями базы данных
related:
  - /database/schemas
  - /development/setup
---

# Миграции базы данных

Управление структурой базы данных через SQL миграции.

## Обзор

Проект использует SQL миграции для управления структурой БД:
- Файлы миграций в `backend/src/migrations/`
- Порядок выполнения определяется скриптом
- Все изменения версионируются

## Текущая структура миграций

### Основная миграция

**`000_initial_schema.sql`**
- Создание схем `config` и `mart`
- Создание всех таблиц
- Создание индексов
- Добавление комментариев

## Выполнение миграций

### Запуск всех миграций

```bash
cd backend
npm run migrate
```

Это выполнит все миграции в порядке их нумерации.

### Что происходит

1. Подключение к БД через connection pool
2. Чтение файлов миграций
3. Последовательное выполнение SQL запросов
4. Логирование результатов

### Проверка результата

После выполнения миграций проверьте:
```sql
-- Проверка схем
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('config', 'mart');

-- Проверка таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'mart';
```

## Создание новых миграций

### Правила именования

Имена файлов миграций:
- Начинаются с номера: `001_`, `002_`, `003_`
- Описательное имя: `001_create_schemas.sql`
- Порядок важен для последовательного выполнения

### Пример миграции

```sql
-- 016_add_new_table.sql
CREATE TABLE IF NOT EXISTS mart.new_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_new_table_name ON mart.new_table(name);
```

### Обновление скрипта миграций

Если создаете новую миграцию, обновите `run-migrations.ts`:

```typescript
const migrationNew = await readFile(
  join(__dirname, "../migrations/016_add_new_table.sql"),
  "utf-8"
);

// Добавить в выполнение
await client.query(migrationNew);
```

## Откат миграций

### Важно

Откат миграций не реализован автоматически. Если нужно откатить:
1. Создать новую миграцию с обратными изменениями
2. Или вручную выполнить SQL для удаления изменений

### Пример отката

```sql
-- 017_rollback_new_table.sql
DROP TABLE IF EXISTS mart.new_table;
```

## Рекомендации

### 1. Всегда используйте IF NOT EXISTS

```sql
CREATE TABLE IF NOT EXISTS mart.table_name (...);
CREATE INDEX IF NOT EXISTS idx_name ON mart.table_name(...);
```

Это делает миграции идемпотентными (можно запускать несколько раз).

### 2. Добавляйте комментарии

```sql
COMMENT ON TABLE mart.table_name IS 'Описание таблицы';
COMMENT ON COLUMN mart.table_name.column_name IS 'Описание колонки';
```

Это помогает понимать назначение таблиц и полей.

### 3. Создавайте индексы

Индексы важны для производительности, особенно на:
- Внешних ключах
- Полях для фильтрации (WHERE)
- Полях для сортировки (ORDER BY)
- Полях для JOIN

### 4. Тестируйте миграции

Перед применением в production:
1. Протестируйте на dev окружении
2. Проверьте что все индексы созданы
3. Убедитесь что данные не потеряны

## Загрузка данных

### Начальные данные

После миграций можно загрузить данные:

```bash
cd backend
npm run load-data
```

### Миграция layout данных

```bash
npm run migrate-data
```

## См. также

- [Схемы БД](/database/schemas) - описание таблиц
- [Data Marts](/database/data-marts) - структура Data Mart
- [Настройка окружения](/development/setup) - начальная настройка
