---
title: Стандарты кодирования
description: Стандарты написания кода и форматирования
related:
  - /development/guidelines
  - /deployment/ci-cd
---

# Стандарты кодирования

Стандарты написания и форматирования кода в проекте.

## Форматирование

### Prettier

Проект использует Prettier для автоматического форматирования.

**Запуск:**
```bash
npm run format        # Форматировать все файлы
npm run format:check  # Проверить форматирование
```

**Настройки:**
- Single quotes для строк
- Semicolons в конце
- 2 spaces для отступов
- Trailing commas где возможно

### Ручное форматирование

Если Prettier не настроен, следуйте:
- 2 spaces для отступов
- Максимум 100 символов на строку
- Пробелы вокруг операторов
- Пробелы после запятых

## Линтинг

### ESLint

Проект использует ESLint для проверки кода.

**Запуск:**
```bash
npm run lint        # Проверить код
npm run lint:fix    # Автоматически исправить
```

**Основные правила:**
- TypeScript strict mode
- React hooks rules
- Security rules
- Code quality rules

### Важные правила

**Обязательные:**
- `no-var` - используйте `let`/`const`
- `prefer-const` - используйте `const` где возможно
- `eqeqeq` - всегда `===` и `!==`
- `no-debugger` - удаляйте debugger перед коммитом

**Предупреждения:**
- `@typescript-eslint/no-unused-vars` - неиспользуемые переменные
- `@typescript-eslint/no-explicit-any` - избегайте `any`
- `no-console` - разрешено для разработки

## Комментарии и документация

### JSDoc для функций

Для публичных функций используйте JSDoc:

```typescript
/**
 * Получает KPI метрики по категории
 * @param category - Категория метрики
 * @param periodDate - Дата периода (опционально)
 * @returns Promise с массивом KPI метрик
 */
async function getKPIsByCategory(
  category: string,
  periodDate?: Date
): Promise<KPIMetric[]> {
  // ...
}
```

### Inline комментарии

Используйте для объяснения "почему", а не "что":

```typescript
// Плохо
// Увеличиваем счетчик
counter++;

// Хорошо
// Используем инкремент вместо += 1 для лучшей производительности
counter++;
```

### TODO комментарии

Используйте формат:
```typescript
// TODO: Добавить кэширование для этого запроса
// FIXME: Исправить баг с делением на ноль
// NOTE: Это временное решение, нужно переделать
```

## Git Commit Conventions

### Формат сообщений

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Типы:**
- `feat` - новая функциональность
- `fix` - исправление бага
- `docs` - изменения в документации
- `style` - форматирование, отсутствующие точки с запятой и т.д.
- `refactor` - рефакторинг кода
- `test` - добавление тестов
- `chore` - обновление зависимостей, конфигов

**Примеры:**
```
feat(api): добавить endpoint для получения KPI по категории
fix(table): исправить сортировку по числовым значениям
docs(readme): обновить инструкции по установке
```

### Scope

Область изменений:
- `api` - API endpoints
- `components` - React компоненты
- `hooks` - React hooks
- `services` - Backend сервисы
- `db` - База данных
- `docs` - Документация

## Структура файлов

### Импорты

Порядок импортов:
1. Внешние библиотеки
2. Внутренние модули (@/...)
3. Относительные импорты
4. Типы (если отдельно)

**Пример:**
```typescript
// 1. Внешние
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Внутренние
import { Card } from '@/components/ui/card';
import { useAllKPIs } from '@/hooks/useAPI';

// 3. Относительные
import { formatValue } from './formatters';

// 4. Типы
import type { KPIMetric } from '@/lib/api';
```

### Экспорты

- Используйте named exports для компонентов
- Default exports только для страниц
- Экспортируйте типы отдельно

## Обработка данных

### Валидация входных данных

Всегда валидируйте входные данные:

```typescript
function processKPIData(data: unknown): KPIMetric {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid KPI data');
  }
  
  const kpi = data as KPIMetric;
  if (!kpi.id || !kpi.title) {
    throw new Error('Missing required fields');
  }
  
  return kpi;
}
```

### Трансформация данных

Выносите трансформацию в отдельные функции:

```typescript
function transformTableData(apiData: TableData): TableRowData[] {
  return apiData.rows.map(row => ({
    id: row.id,
    name: row.name ?? '',
    value: row.value ?? 0,
    // ...
  }));
}
```

## Производительность

### Мemoization

Используйте `useMemo` и `useCallback` где необходимо:

```typescript
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => a.value - b.value);
}, [data]);

const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

### Оптимизация рендеринга

- Используйте `React.memo` для тяжелых компонентов
- Разбивайте большие компоненты
- Избегайте создания объектов/массивов в render

## Безопасность

### SQL Injection

Всегда используйте параметризованные запросы:

```typescript
// Плохо
await pool.query(`SELECT * FROM users WHERE id = '${userId}'`);

// Хорошо
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### XSS Protection

Экранируйте пользовательский ввод:
- React автоматически экранирует
- Не используйте `dangerouslySetInnerHTML` без санитизации

## См. также

- [Руководящие принципы](/development/guidelines) - общие принципы
- [CI/CD Pipeline](/deployment/ci-cd) - проверка кода перед деплоем
