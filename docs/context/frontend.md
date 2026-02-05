# Frontend Context

> **Последнее обновление**: 2026-02-05 (FinancialTable: одна кнопка-toggle для displayGroup)  
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
import { useGetData } from '@/hooks/useAPI';

function MyPage() {
  const { data, isLoading, error } = useGetData('my-data-source');

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

executeCalculation(config, rowData)
// Выполняет расчёт по конфигурации из layout (percent_change, diff, ratio)
```

## KPICard — динамические calculated поля

KPICard теперь **полностью управляется layout** — нет хардкода имён полей.

### Как работает:

1. **Сбор calculated полей** из `columns[].sub_columns` по `fieldType === 'calculated'`
2. **Вычисление значений** через `executeCalculation(calculationConfig, kpiData)`
3. **Группировка по displayGroup** из layout:
   - `displayGroup: 'percent'` → процентная группа
   - `displayGroup: 'absolute'` → абсолютная группа
   - Без `displayGroup` → группа `'default'`
4. **Определение группы по умолчанию** через `isDefault: true` в layout
5. **Toggle %/абс.** — показывается только если есть 2+ группы
6. **Рендеринг в порядке layout** — поля отображаются в том порядке, в каком идут в layout

### Пример layout для calculated полей:

```json
{
  "columns": [{
    "id": "value",
    "format": "currency_rub",
    "sub_columns": [
      {
        "id": "p2Change",
        "label": "PPTD %",
        "fieldType": "calculated",
        "format": "percent",
        "displayGroup": "percent",
        "isDefault": true,
        "calculationConfig": { "type": "percent_change", "current": "value", "base": "p2Value" }
      },
      {
        "id": "p2Diff",
        "label": "PPTD абс.",
        "fieldType": "calculated",
        "format": "currency_rub",
        "displayGroup": "absolute",
        "calculationConfig": { "type": "diff", "minuend": "value", "subtrahend": "p2Value" }
      }
    ]
  }]
}
```

### Важно:
- ❌ Нет хардкода `ppChange`, `ytdChange` и т.п.
- ❌ Нет fallback конфигов — только layout
- ✅ Все calculated поля берутся из `sub_columns`
- ✅ Группировка через `displayGroup` из layout (не по format.kind)
- ✅ Группа по умолчанию через `isDefault` из layout
- ✅ Форматирование через `formatValue(formatId, value)`

## FinancialTable — динамические calculated поля

FinancialTable теперь **полностью управляется layout** — нет хардкода имён полей.

### Как работает:

1. **Сбор calculated полей** для каждой числовой колонки:
   ```typescript
   const calculatedSubColumns = col.sub_columns?.filter(
     (sub) => sub.fieldType === "calculated" && 
     (sub.displayGroup || 'default') === activeDisplayGroup
   ) || [];
   ```
2. **Группировка по displayGroup** из layout:
   - `displayGroup: 'percent'` → процентная группа
   - `displayGroup: 'absolute'` → абсолютная группа
3. **Одна кнопка-toggle** в правом верхнем углу (рядом с collapse/expand):
   - Показывается только если есть 2+ группы
   - Текст кнопки = текущий `displayGroup` (без хардкода)
   - Клик циклически переключает группы в порядке layout
4. **Группа по умолчанию** определяется через `isDefault: true` в layout
5. **Чтение значений из row** — FinancialTable НЕ считает значения, а берёт готовые из `row[subColumn.id]` (рассчитаны в `transformTableData`)
6. **Форматирование** через `formatValue(subColumn.format, value)`
7. **Порядок вывода** = порядок sub_columns в layout

### Рендеринг calculated полей:

```typescript
{calculatedSubColumns.map((subCol, idx) => {
  const subValue = row[subCol.id];
  if (typeof subValue !== "number") return null;
  
  return (
    <span key={subCol.id} title={subCol.label}>
      {formatValue(subCol.format, subValue)}
    </span>
  );
})}
```

### Важно:
- ❌ Нет хардкода `ppChange`, `ytdChange`, `p2Change`, `p3Change` и т.п.
- ❌ Нет вызовов `calculatePercentChange` или `executeCalculation` в рендере
- ❌ Нет fallback/backward compatibility костылей
- ✅ Все calculated поля берутся из `sub_columns` с `fieldType === 'calculated'`
- ✅ Группировка через `displayGroup` из layout
- ✅ Группа по умолчанию через `isDefault` из layout
- ✅ Значения уже рассчитаны в `transformTableData`
- ✅ Форматирование через `formatValue(formatId, value)`

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

## Ключевые функции

### transformTableData (DynamicDashboard.tsx)

Универсальная функция трансформации данных API в формат FinancialTable с иерархией.

```typescript
export function transformTableData(
  apiData: TableData, 
  columns?: LayoutColumn[]
): TableRowData[]
```

**Как работает:**
- Иерархия определяется по `fieldType='dimension'` колонкам в порядке из layout
- Агрегация выполняется по расширенному списку полей:
  - **measureFields** — поля с `fieldType='measure'`
  - **dependencyFields** — поля из `calculationConfig` calculated полей (`current`, `base`, `minuend`, `subtrahend`, `numerator`, `denominator`)
  - **aggregationFields** = measureFields ∪ dependencyFields
- Calculated поля вычисляются через `executeCalculation` на агрегированных значениях
- Без columns использует дефолтную иерархию: `["class", "section", "item", "sub_item"]`

**Важно для calculated полей на группах:**
- Если `calculationConfig` ссылается на поля вне measureFields (например, `p2Value`, `p3Value`), эти поля автоматически добавляются в aggregationFields
- Группы агрегируют все aggregationFields, поэтому calculated поля на группах корректны

**Примеры:**
- Balance: `class → section → item → sub_item`
- Financial Results: `class → category → item → subitem`

## Текущее состояние

### Завершено:
- ✅ Динамический layout из БД
- ✅ Расчёты на фронте (calculatePercentChange)
- ✅ Загрузка файлов (XLSX, CSV)
- ✅ Unit-тесты (60 тестов, все проходят)
- ✅ UI загрузки с двумя кнопками: Баланс и Финрез (2026-01-29)
- ✅ Универсальный transformTableData с isDimension/isMeasure (2026-01-30)
- ✅ KPICard + FinancialTable: displayGroup toggle для calculated полей (2026-02-04)
- ✅ transformTableData: корректная агрегация dependencyFields для calculated полей (2026-02-05)

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
