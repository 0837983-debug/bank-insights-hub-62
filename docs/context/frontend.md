# Frontend Context

> **Последнее обновление**: 2026-01-29  
> **Обновляет**: Frontend Agent после каждого изменения

## Текущая архитектура

- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query (server state)
- **Routing**: React Router

## Структура проекта

```
src/
├── components/          # React компоненты
│   ├── ui/              # shadcn/ui (НЕ редактировать!)
│   ├── upload/          # Компоненты загрузки
│   ├── Header.tsx
│   ├── KPICard.tsx
│   ├── FinancialTable.tsx
│   └── ...
├── pages/               # Страницы
│   ├── DynamicDashboard.tsx
│   ├── FileUpload.tsx
│   └── DevTools.tsx
├── hooks/               # Кастомные хуки
│   ├── useAPI.ts        # Хуки для API
│   └── useFileUpload.ts
├── lib/                 # Утилиты
│   ├── api.ts           # API клиент
│   ├── calculations.ts  # Расчёты (PPTD, YTD, %)
│   ├── formatters.ts    # Форматирование
│   └── utils.ts         # cn() и утилиты
├── types/               # TypeScript типы
└── test/                # Тестовые утилиты
```

## Ключевые компоненты

| Компонент | Файл | Назначение |
|-----------|------|------------|
| DynamicDashboard | `pages/DynamicDashboard.tsx` | Главная страница дашборда |
| KPICard | `components/KPICard.tsx` | Карточка KPI |
| FinancialTable | `components/FinancialTable.tsx` | Таблица с данными |
| Header | `components/Header.tsx` | Шапка с датами |
| FileUpload | `pages/FileUpload.tsx` | Загрузка файлов (2 кнопки: Баланс, Финрез) |
| FileUploader | `components/upload/FileUploader.tsx` | Выбор файла (drag-n-drop, forwardRef) |

## Паттерны кода

### Функциональный компонент
```typescript
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  title: string;
  value: number;
  className?: string;
}

export function MyComponent({ title, value, className }: MyComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className={cn('p-4 rounded-lg', className)}>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-2xl">{value}</p>
    </div>
  );
}
```

### Работа с API (TanStack Query)
```typescript
import { useLayout, useTableData } from '@/hooks/useAPI';

function MyPage() {
  const { data: layout, isLoading, error } = useLayout();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* render data */}</div>;
}
```

### Форматирование данных
```typescript
import { formatValue } from '@/lib/formatters';

// Форматы: 'currency_rub', 'percent', 'number', 'bps'
const formatted = formatValue(1234567, 'currency_rub');
// → "₽1 234 567"
```

### Условные классы (cn)
```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'
)} />
```

### data-testid для E2E
```typescript
// Добавляй data-testid для важных элементов
<div data-testid="kpi-card-revenue">
  {/* content */}
</div>
```

## Утилиты

### calculations.ts
```typescript
calculatePercentChange(current, previous, previousYear)
// Возвращает: { ppDiff, ppPercent, ytdDiff, ytdPercent }

calculateRowPercentage(value, total)
// Возвращает: число (процент от total)
```

### formatters.ts
```typescript
formatValue(value, format)
// format: 'currency_rub', 'percent', 'number', 'bps'
```

## Критерии качества кода

### Код готов, если:
- ✅ TypeScript компилируется без ошибок
- ✅ Все пропсы типизированы (interface Props)
- ✅ Используются функциональные компоненты + хуки
- ✅ Стили через Tailwind CSS + cn()
- ✅ Важные элементы имеют data-testid
- ✅ Нет ошибок в консоли браузера
- ✅ Unit-тесты написаны для критичной логики
- ✅ Тесты проходят: `npm run test:frontend`

### Запрещено:
- ❌ Редактировать `src/components/ui/` (shadcn)
- ❌ Тип `any` без необходимости
- ❌ Inline стили (используй Tailwind)
- ❌ Классовые компоненты (используй функции + хуки)

## API интеграция

- Base URL: `http://localhost:3001/api`
- Конфигурация: `src/lib/api.ts`
- Хуки: `src/hooks/useAPI.ts`

## Текущее состояние

### Завершено:
- ✅ Динамический layout из БД
- ✅ Расчёты на фронте (calculatePercentChange)
- ✅ Загрузка файлов (XLSX, CSV)
- ✅ Unit-тесты (42 теста, все проходят)
- ✅ UI загрузки с двумя кнопками: Баланс и Финрез (2026-01-29)

### В работе:
- 🔄 E2E тесты (актуализация)

### Известные проблемы:
- ⚠️ Header берёт даты не из БД (зависит от бэка J.1)
- ⚠️ Нет фильтров по периодам (задача J.2)

## Команды

```bash
# Unit-тесты ТОЛЬКО фронтенда
npm run test:frontend

# Dev-сервер
npm run dev

# Build
npm run build

# Lint
npm run lint
```

App: `http://localhost:5173` или `http://localhost:8080`
