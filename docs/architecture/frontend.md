---
title: Frontend архитектура
description: Архитектура frontend части приложения
related:
  - /architecture/overview
  - /architecture/data-flow
  - /development/guidelines
---

# Frontend архитектура

Frontend построен на React 18 с TypeScript, используя современные паттерны и библиотеки.

## Структура приложения

```
src/
├── pages/              # Страницы приложения
│   ├── DynamicDashboard.tsx  # Главная страница дашборда
│   ├── DevTools.tsx          # Инструменты разработчика
│   └── NotFound.tsx          # Страница 404
│
├── components/        # React компоненты
│   ├── ui/           # Базовые UI компоненты (shadcn/ui)
│   ├── KPICard.tsx   # Карточка KPI метрики
│   ├── FinancialTable.tsx    # Таблица финансовых данных
│   ├── Header.tsx    # Шапка приложения
│   └── report/       # Компоненты отчетов
│
├── hooks/            # Custom React hooks
│   ├── useAPI.ts     # Hooks для работы с API
│   └── use-table-sort.ts  # Хук для сортировки таблиц
│
├── lib/              # Утилиты и библиотеки
│   ├── api.ts        # API клиент
│   ├── formatters.ts # Форматирование данных
│   ├── calculations.ts # Расчеты процентных изменений
│   └── utils.ts      # Общие утилиты
│
├── App.tsx           # Главный компонент
└── main.tsx          # Точка входа
```

## Основные компоненты

### DynamicDashboard

Главная страница дашборда, которая динамически строит UI на основе layout из БД.

**Основные функции:**
- Загрузка layout через `useLayout()`
- Загрузка KPI метрик через `useAllKPIs()`
- Динамический рендеринг компонентов (cards, tables)
- Обработка состояний загрузки и ошибок

**Ключевые особенности:**
- Configuration-driven: структура определяется layout из БД
- Типобезопасность: все данные типизированы
- Оптимизация: React Query кэширует данные

### KPICard

Компонент для отображения KPI метрик.

**Props:**
```typescript
interface KPICardProps {
  title: string;
  value: string;
  description: string;
  change?: number;
  ytdChange?: number;
  showChange?: boolean;
  icon?: React.ReactNode;
}
```

**Особенности:**
- Отображение значения с форматированием
- Индикация изменений (PPTD и YTD)
- Tooltip с описанием
- Иконки из Lucide React

### FinancialTable

Компонент для отображения табличных данных.

**Основные возможности:**
- Сортировка по колонкам
- Группировка данных
- Иерархическое отображение (группы, подгруппы)
- Форматирование значений (валюта, проценты)
- Индикация изменений
- Загрузка данных по требованию

**Props:**
```typescript
interface FinancialTableProps {
  title: string;
  rows: TableRowData[];
  columns?: TableColumn[];
  groupingOptions?: GroupingOption[];
  activeGrouping?: string | null;
  onGroupingChange?: (groupBy: string | null) => void;
  isLoading?: boolean;
}
```

## Управление состоянием

### React Query

Используется для управления серверным состоянием.

**Преимущества:**
- Автоматическое кэширование
- Фоновое обновление данных
- Оптимистичные обновления
- Обработка ошибок

**Query Keys:**
```typescript
const queryKeys = {
  layout: ["layout"],
  allKPIs: ["kpi", "all"],
  tableData: (tableId: string, params?: Record<string, unknown>) =>
    ["table", tableId, params],
  health: ["health"],
};
```

**Настройки кэширования:**
- Layout: 5 минут в production, 0 в dev
- KPIs: 1 минута в production, 0 в dev
- Table Data: 1 минута
- Health: 30 секунд с автообновлением

### Local State

Для локального состояния используется `useState`:
- Состояния UI (открыт/закрыт модал)
- Фильтры и сортировка
- Временные значения форм

## Роутинг

### React Router

Маршрутизация настроена в `App.tsx`:

```typescript
<Routes>
  <Route path="/" element={<DynamicDashboard />} />
  <Route path="/dev-tools" element={<DevTools />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

**Маршруты:**
- `/` - главная страница дашборда
- `/dev-tools` - инструменты разработчика
- `*` - страница 404

## Стилизация

### Tailwind CSS

Utility-first CSS фреймворк для стилизации.

**Преимущества:**
- Быстрая разработка
- Консистентный дизайн
- Оптимизация размера bundle
- Кастомизация через конфиг

### shadcn/ui

Компоненты на основе Radix UI.

**Используемые компоненты:**
- Card, Button, Table
- Dialog, Tooltip, Alert
- Tabs, Accordion
- И многие другие

**Особенности:**
- Доступность из коробки
- Кастомизируемые стили
- TypeScript типы

## API Client

### Структура (`lib/api.ts`)

**Основные функции:**
- `fetchLayout()` - получение layout
- `fetchAllKPIs()` - получение всех KPI
- `fetchTableData()` - получение данных таблицы
- `fetchHealth()` - проверка здоровья API

**Обработка ошибок:**
```typescript
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}
```

**Настройки:**
- Базовый URL из переменных окружения
- Автоматическая обработка JSON
- Обработка HTTP ошибок
- Кэширование отключено (`cache: "no-store"`)

## Custom Hooks

### useAPI

Hooks для работы с API через React Query.

**Доступные hooks:**
- `useLayout()` - layout дашборда
- `useAllKPIs()` - все KPI метрики
- `useTableData()` - данные таблицы
- `useHealth()` - статус API

**Пример использования:**
```typescript
const { data, isLoading, error } = useAllKPIs();
```

### use-table-sort

Хук для сортировки таблиц.

**Функциональность:**
- Сортировка по колонкам
- Определение направления (asc/desc)
- Сохранение состояния сортировки

## Обработка данных на фронтенде

### Принцип обработки данных

Проект следует принципу **минимальной обработки данных на фронтенде**, но некоторые расчеты выполняются на клиенте для обеспечения актуальности и гибкости.

**Что делает backend:**
- Агрегация данных из БД
- Формирование плоских строк с иерархией (class, section, item, sub_item)
- Предоставление базовых значений (value, previousValue, ytdValue)

**Что делает frontend:**
- Расчет процентных изменений (ppChange, ytdChange) через `calculatePercentChange()`
- Расчет процента от родительской строки через `calculateRowPercentage()`
- Форматирование данных для отображения (`formatValue`)
- Построение иерархической структуры UI из плоских данных (`transformTableData`)
- Пересчет метрик для групп при необходимости (агрегация групп на лету)

**Важно:** Расчеты процентных изменений выполняются на фронтенде для обеспечения актуальности данных и возможности переключения между процентными и абсолютными изменениями в UI.

### Форматирование данных

### Форматтеры (`lib/formatters.ts`)

**Функции:**
- `formatValue(formatId, value)` - форматирование значений по ID формата из layout API
- `initializeFormats(formats)` - инициализация кэша форматов при загрузке layout
- Поддержка валют, процентов, чисел
- Форматы загружаются из API layouts.formats и кэшируются при загрузке страницы

**Пример:**
```typescript
// Инициализация форматов при загрузке layout (обычно в useEffect)
import { initializeFormats } from '@/lib/formatters';

useEffect(() => {
  if (layout?.formats) {
    initializeFormats(layout.formats);
  }
}, [layout]);

// Использование форматирования
import { formatValue } from '@/lib/formatters';

// formatId берется из layout API (например, "currency_rub", "percent")
formatValue("currency_rub", 1000000); // "₽1.0M"
formatValue("percent", 5.2); // "5.2%"
```

**Важно:**
- Форматы должны быть инициализированы через `initializeFormats()` перед использованием
- `formatId` должен соответствовать ключу из `layout.formats`
- Если формат не найден, функция вернет строковое представление числа

### Расчеты (`lib/calculations.ts`)

Сервис для расчета процентных изменений и других вычислений на фронтенде.

**Функции:**

#### `calculatePercentChange(current, previous, previousYear?)`

Расчет процентных изменений (PPTD и YTD) для метрик.

**Параметры:**
- `current` (number | null | undefined) - Текущее значение (value)
- `previous` (number | null | undefined) - Значение за предыдущий период (previousValue)
- `previousYear` (number | null | undefined, опционально) - Значение за аналогичный период прошлого года (ytdValue)

**Возвращает:**
```typescript
interface PercentChangeResult {
  ppDiff: number;        // Абсолютное изменение к предыдущему периоду: current - previous
  ppPercent: number;     // Изменение к предыдущему периоду в долях: (current - previous) / previous (0.1 = 10%)
  ytdDiff: number;      // Абсолютное изменение YTD: current - previousYear
  ytdPercent: number;   // Изменение YTD в долях: (current - previousYear) / previousYear (0.1 = 10%)
}
```

**Пример использования:**
```typescript
import { calculatePercentChange } from '@/lib/calculations';

// В компоненте KPICard
const percentChanges = calculatePercentChange(
  kpi.value,           // 1500000000
  kpi.previousValue,   // 1425000000
  kpi.ytdValue         // 1335000000
);

// Результат:
// {
//   ppDiff: 75000000,        // 1500000000 - 1425000000
//   ppPercent: 0.0526,        // (1500000000 - 1425000000) / 1425000000 ≈ 0.0526 (5.26%)
//   ytdDiff: 165000000,       // 1500000000 - 1335000000
//   ytdPercent: 0.1236         // (1500000000 - 1335000000) / 1335000000 ≈ 0.1236 (12.36%)
// }

// Использование в UI
const ppChange = showAbsolute 
  ? percentChanges.ppDiff      // Абсолютное изменение
  : percentChanges.ppPercent;   // Процентное изменение в долях
```

**Особенности:**
- Изменения возвращаются в долях (0.1 = 10%), не в процентах
- Для отображения в процентах умножьте на 100: `ppPercent * 100`
- Обрабатывает `null` и `undefined` (возвращает 0)
- Избегает деления на 0 (если previous = 0, то ppPercent = 0)
- Округление до 4 знаков после запятой для процентных значений

#### `calculateRowPercentage(value, parentTotal)`

Расчет процента от родительской строки (доля от суммы родителя).

**Параметры:**
- `value` (number | null | undefined) - Значение текущей строки
- `parentTotal` (number | null | undefined) - Сумма родительской строки

**Возвращает:**
- `number` - Процент от родителя (0-100)

**Пример использования:**
```typescript
import { calculateRowPercentage } from '@/lib/calculations';

const percentage = calculateRowPercentage(50, 200);
// percentage = 25 (50 составляет 25% от 200)
```

**Особенности:**
- Возвращает значение в процентах (0-100), не в долях
- Обрабатывает `null` и `undefined` (возвращает 0)
- Избегает деления на 0 (если parentTotal = 0, возвращает 0)
- Округление до 2 знаков после запятой

**Использование в компонентах:**

**KPICard:**
```typescript
import { calculatePercentChange } from '@/lib/calculations';

// Расчет изменений для KPI карточки
const percentChanges = calculatePercentChange(
  kpi.value,
  kpi.previousValue,
  kpi.ytdValue
);

// Переключение между процентными и абсолютными изменениями
const ppChange = showAbsolute 
  ? percentChanges.ppDiff
  : percentChanges.ppPercent;
```

**FinancialTable:**
```typescript
import { calculatePercentChange } from '@/lib/calculations';

// Расчет изменений для строк таблицы
if (row.value !== undefined && row.value !== null) {
  const percentChanges = calculatePercentChange(
    row.value,
    row.previousValue,
    row.ytdValue
  );
  ppChangeValue = percentChanges.ppPercent;
  ytdChangeValue = percentChanges.ytdPercent;
}
```

**Важно:**
- Расчеты выполняются на фронтенде для обеспечения актуальности данных
- Позволяет переключаться между процентными и абсолютными изменениями в UI
- Все значения обрабатываются безопасно (null/undefined → 0)
- Избегает деления на 0

## Оптимизация

### Code Splitting

Vite автоматически разбивает код на chunks:
- Vendor chunks (node_modules)
- Component chunks
- Route-based splitting

### Lazy Loading

Компоненты загружаются по требованию через React.lazy (при необходимости).

### Memoization

Используется `useMemo` и `useCallback` для оптимизации:
- Дорогие вычисления
- Callback функции
- Трансформация данных

## Обработка ошибок

### Error Boundaries

Обработка ошибок на уровне компонентов:
- Отображение fallback UI
- Логирование ошибок
- Восстановление после ошибок

### API Errors

Обработка ошибок API:
- Показ сообщений пользователю
- Retry механизм через React Query
- Graceful degradation

## См. также

- [Общая архитектура](/architecture/overview) - обзор системы
- [Поток данных](/architecture/data-flow) - как данные проходят через систему
- [Руководящие принципы](/development/guidelines) - принципы разработки
