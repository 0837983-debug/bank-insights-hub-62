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

### Принцип минимальной обработки

Проект следует принципу **минимальной обработки данных на фронтенде**. Все расчеты (ppChange, ytdChange, percentage) выполняются на backend, фронтенд получает готовые значения.

**Что делает backend:**
- Расчет всех метрик (ppChange, ytdChange, percentage)
- Агрегация данных из БД
- Формирование плоских строк с иерархией (class, section, item, sub_item)

**Что делает frontend:**
- Форматирование данных для отображения (`formatValue`)
- Построение иерархической структуры UI из плоских данных (`transformTableData`)
- Пересчет метрик для групп при необходимости (агрегация групп на лету)

**Исключение:** `transformTableData` пересчитывает метрики для групп (ppChange, ytdChange, percentage), это необходимо для корректной агрегации групп в UI, когда данные приходят плоскими.

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
