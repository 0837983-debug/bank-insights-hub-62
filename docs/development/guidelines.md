---
title: Руководящие принципы
description: Принципы и соглашения разработки проекта
related:
  - /development/coding-standards
  - /development/testing
  - /architecture/frontend
---

# Руководящие принципы

Основные принципы и соглашения для разработки проекта Bank Insights Hub.

## Принципы разработки

### 1. Type Safety First

Всегда используйте TypeScript типы:
- Избегайте `any`
- Используйте интерфейсы для структур данных
- Типизируйте функции и их параметры

**Хорошо:**
```typescript
interface KPICardProps {
  title: string;
  value: number;
}

function KPICard({ title, value }: KPICardProps) {
  // ...
}
```

**Плохо:**
```typescript
function KPICard(props: any) {
  // ...
}
```

### 2. Component Composition

Разбивайте сложные компоненты на меньшие:
- Один компонент = одна ответственность
- Переиспользование через композицию
- Понятная структура

**Пример:**
```typescript
// Вместо одного большого компонента
function Dashboard() {
  return (
    <div>
      <KPISection />
      <TablesSection />
      <ChartsSection />
    </div>
  );
}
```

### 3. Separation of Concerns

Разделяйте логику и представление:
- Компоненты для UI
- Hooks для логики
- Services для бизнес-логики
- Utils для утилит

### 4. DRY (Don't Repeat Yourself)

Избегайте дублирования кода:
- Выносите общую логику в hooks
- Создавайте переиспользуемые компоненты
- Используйте утилиты для общих операций

### 5. Configuration over Code

Используйте конфигурацию где возможно:
- Layout из БД, а не хардкод
- Форматы через config
- Настройки через переменные окружения

## Соглашения по именованию

### Компоненты

- PascalCase для компонентов: `KPICard`, `FinancialTable`
- Файлы совпадают с именем компонента: `KPICard.tsx`

### Hooks

- Начинаются с `use`: `useAPI`, `useTableSort`
- Файлы: `use-api.ts`, `use-table-sort.ts`

### Функции и переменные

- camelCase: `fetchKPIs`, `tableData`
- Описательные имена: `getKPIMetricsByCategory` вместо `getKPIs`

### Константы

- UPPER_SNAKE_CASE: `API_BASE_URL`, `MAX_RETRIES`

### Типы и интерфейсы

- PascalCase: `KPIMetric`, `TableRowData`
- Интерфейсы для объектов: `interface UserData`
- Типы для union/intersection: `type Status = 'loading' | 'error' | 'success'`

## Структура компонентов

### Порядок в файле компонента

1. Импорты (внешние, внутренние, типы)
2. Типы и интерфейсы
3. Константы
4. Компонент
5. Экспорт

**Пример:**
```typescript
// 1. Импорты
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import type { KPIMetric } from '@/lib/api';

// 2. Типы
interface KPICardProps {
  kpi: KPIMetric;
}

// 3. Константы
const FORMAT_OPTIONS = { ... };

// 4. Компонент
export function KPICard({ kpi }: KPICardProps) {
  // ...
}
```

## Работа с типами

### Использование интерфейсов

Для объектов используйте интерфейсы:
```typescript
interface User {
  id: string;
  name: string;
}
```

### Использование типов

Для union/intersection используйте типы:
```typescript
type Status = 'loading' | 'error' | 'success';
type UserWithStatus = User & { status: Status };
```

### Избегайте any

Всегда типизируйте:
```typescript
// Плохо
function process(data: any) { ... }

// Хорошо
function process(data: UserData) { ... }
```

## Обработка ошибок

### Try-Catch блоки

Используйте для асинхронных операций:
```typescript
try {
  const data = await fetchData();
  return data;
} catch (error) {
  console.error('Failed to fetch:', error);
  throw error;
}
```

### Error Boundaries

Для обработки ошибок в React компонентах:
```typescript
<ErrorBoundary fallback={<ErrorUI />}>
  <Component />
</ErrorBoundary>
```

## Работа с API

### Использование hooks

Всегда используйте React Query hooks:
```typescript
const { data, isLoading, error } = useAllKPIs();
```

### Обработка состояний

Всегда обрабатывайте все состояния:
```typescript
if (isLoading) return <Loading />;
if (error) return <Error message={error.message} />;
if (!data) return null;

return <DataDisplay data={data} />;
```

## Комментарии

### Когда комментировать

- Сложная бизнес-логика
- Неочевидные решения
- TODO/FIXME заметки
- JSDoc для публичных API

### Когда НЕ комментировать

- Очевидный код
- Дублирование того, что видно в коде
- Устаревшие комментарии

**Пример хорошего комментария:**
```typescript
// Расчет изменения учитывает возможное деление на ноль
// и возвращает 0 если предыдущее значение было 0
const change = previousValue === 0 
  ? 0 
  : ((currentValue - previousValue) / previousValue) * 100;
```

## См. также

- [Стандарты кодирования](/development/coding-standards) - детальные стандарты
- [Тестирование](/development/testing) - стратегия тестирования
- [Frontend архитектура](/architecture/frontend) - архитектура frontend
