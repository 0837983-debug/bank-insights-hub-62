# Frontend Context

> **Последнее обновление**: 2026-06-30 (AppShell — единая навигация на всех страницах)  
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
│   ├── AppShell.tsx   # Layout: Header + Outlet
│   ├── NavLink.tsx    # NavLink с activeClassName
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
| DatePicker | `components/DatePicker.tsx` | Выбор периодов (до 3 дат из header_dates API) |
| KPICard | `components/KPICard.tsx` | Карточка KPI (grid до 7 в строку на 2xl) |
| FinancialTable | `components/FinancialTable.tsx` | Таблица с данными |
| AppShell | `components/AppShell.tsx` | Обёртка layout: Header + `<Outlet />` для страниц |
| Header | `components/Header.tsx` | Шапка с навигацией (Дашборд, Загрузка, Dev Tools) |
| NavLink | `components/NavLink.tsx` | Обёртка react-router NavLink с `activeClassName` |
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

function MyTable({ component }: { component: LayoutComponent }) {
  // queryId берётся из layout компонента
  const { data, isLoading, error } = useGetData(
    component.queryId || null, // queryId из layout
    { p1: '2026-01-01', p2: '2025-12-01', p3: '2025-01-01' }, // параметры
    { componentId: component.componentId } // обязательный componentId
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* render data.rows */}</div>;
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

### AppShell — единая навигация

Все основные маршруты (`/`, `/upload`, `/dev-tools`) обёрнуты в `AppShell` через nested routes в `App.tsx`:

```tsx
<Route element={<AppShell />}>
  <Route path="/" element={<DynamicDashboard />} />
  <Route path="/upload" element={<FileUpload />} />
  <Route path="/dev-tools" element={<DevTools />} />
</Route>
```

- `AppShell` рендерит `<Header />` + `<Outlet />`
- Страницы **не** дублируют `<Header />` локально
- `DynamicDashboard` может дополнительно рендерить layout-header (DatePicker) из БД

### NavLink — активная вкладка

```tsx
<NavLink
  to="/upload"
  className="px-3 py-2 text-sm ..."
  activeClassName="text-foreground bg-muted font-semibold"
  data-testid="nav-link-upload"
>
  Загрузка файлов
</NavLink>
```

### data-testid для навигации:
- `app-shell` — корневой layout
- `app-header` — шапка
- `header-nav` — блок навигации
- `nav-link-dashboard`, `nav-link-upload`, `nav-link-dev-tools` — пункты меню

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

### Поведение expand/collapse:
- **По умолчанию все группы свёрнуты** (collapsed)
- При смене группировки (кнопки) — все группы снова сворачиваются
- Кнопки expand/collapse one level работают как раньше

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

- Base URL: `import.meta.env.VITE_API_URL` (fallback: `http://localhost:3001/api`)
- Конфигурация: `src/lib/api.ts`
- Хуки: `src/hooks/useAPI.ts`

### VITE_API_URL по окружениям

| Окружение | Значение | Как задаётся |
|-----------|----------|--------------|
| Локальная разработка | `http://localhost:3001/api` | `.env` |
| Docker dev | `http://localhost:3001/api` | `docker-compose.dev.yml` → env `VITE_API_URL` |
| Docker prod | `/api` | build-arg в `frontend/Dockerfile`; nginx проксирует на `backend:3001` |

В prod фронтенд обращается к API по относительному пути `/api` — nginx (`frontend/nginx.conf`) проксирует запросы на backend внутри compose-сети.

## Docker

| Файл | Назначение |
|------|------------|
| `frontend/Dockerfile.dev` | Dev: Node 20, `npm run dev`, hot-reload через volume mount |
| `frontend/Dockerfile` | Prod: multi-stage — `npm run build` → `nginx:alpine` |
| `frontend/nginx.conf` | Prod: static из `/usr/share/nginx/html`, `/api/` → `http://backend:3001/api/` |

Build context для обоих Dockerfile — корень репозитория (`.`).

```bash
# Dev (через compose)
docker compose -f docker-compose.dev.yml up -d frontend

# Prod build (локально)
docker build -f frontend/Dockerfile -t bank-insights-frontend .
```

### queryId vs dataSourceKey

С версии J3 (2026-02-09) разделены понятия:

- **`queryId`** — ID запроса для `getData()`. Приходит из layout (`config.components.query_id`). Используется для загрузки данных таблиц, header, кнопок.
- **`dataSourceKey`** — ключ для маппинга KPI (tech_kpi_name). НЕ используется для `getData()`.

```typescript
// LayoutComponent интерфейс
interface LayoutComponent {
  queryId?: string;      // для getData запросов
  dataSourceKey?: string; // для KPI mapping
  // ...
}
```

**Важно:**
- ❌ Не использовать `dataSourceKey` для загрузки данных
- ✅ Использовать `queryId` из layout для `useGetData()`
- ✅ Layout (backend) отвечает за заполнение `queryId`

### KPI загрузка через componentId

С версии J3.4 (2026-02-09) KPI загружаются через `getData(query_id='kpis')` и сопоставляются по `componentId`:

```typescript
// KPIMetric интерфейс
interface KPIMetric {
  id: string;
  componentId?: string;  // ID компонента для сопоставления с layout
  value: number;
  p2Value?: number;      // Значение за предыдущий период
  p3Value?: number;      // Значение за прошлый год
}
```

**Сопоставление в KPICard:**
```typescript
// Находим KPI по componentId из API (fallback на id для обратной совместимости)
const kpi = kpis?.find((k) => (k.componentId ?? k.id) === componentKey);
```

**Важно:**
- ✅ Backend возвращает `componentId` через JOIN с `config.components`
- ✅ Calculated поля (PPTD, YTD) вычисляются на фронте через `executeCalculation`
- ⚠️ Backend возвращает KPI как массив напрямую (без обёртки `{ rows }`)

## DatePicker — выбор периодов

Компонент для выбора до 3 дат из списка доступных периодов.

### Как работает:

1. **Загрузка дат** через `getData('header_dates')`:
   - Backend возвращает список `PeriodDate[]` с полями: `periodDate`, `isP1`, `isP2`, `isP3`
   - Флаги `isP1/isP2/isP3` определяют даты по умолчанию

2. **UI выбора**:
   - Popover с кликабельным списком дат
   - Пользователь может выбрать до 3 дат
   - Повторный клик снимает выбор
   - Метки P1/P2/P3 показывают даты по умолчанию

3. **Применение**:
   - Кнопка "Применить" сортирует выбранные даты по убыванию
   - p1 = самая новая, p2 = вторая, p3 = самая старая
   - При Apply перезагружаются KPIs и таблицы с новыми параметрами

### Пример использования:

```typescript
import { DatePicker } from '@/components/DatePicker';
import type { PeriodDate } from '@/lib/api';

// availableDates из getData('header_dates').rows
<DatePicker
  availableDates={availableDates}
  selectedDates={{ p1, p2, p3 }}
  onApply={(newDates) => setSelectedDates(newDates)}
  isLoading={isLoading}
/>
```

### Интерфейс PeriodDate:

```typescript
interface PeriodDate {
  periodDate: string;  // ISO date (e.g., "2026-01-01")
  isP1: boolean;       // Флаг "последний период"
  isP2: boolean;       // Флаг "предыдущий период"
  isP3: boolean;       // Флаг "прошлый год"
}
```

### data-testid:

- `date-picker-trigger` — кнопка открытия
- `date-option-{periodDate}` — элемент списка дат
- `date-picker-apply` — кнопка применения

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
- ✅ FinancialTable: все группы свёрнуты по умолчанию (2026-02-05)
- ✅ J3: Переход на queryId из layout для getData (2026-02-09)
- ✅ J3.4: KPI загрузка через componentId, обновлён интерфейс KPIMetric (2026-02-09)
- ✅ KPI grid: 7 колонок на широких экранах (2xl), уменьшенный gap и шрифт изменений (2026-02-09)
- ✅ J1+J2: UI выбора периодов (DatePicker), даты из header_dates API (2026-02-09)
- ✅ Docker prod: `frontend/Dockerfile` (vite build → nginx), `frontend/nginx.conf` с `/api` proxy (2026-06-08)
- ✅ AppShell: единая навигация на `/`, `/upload`, `/dev-tools`, active state для NavLink (2026-06-30)

### В работе:
- 🔄 E2E тесты (актуализация)

### Известные проблемы:
- _(Нет критичных проблем)_

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
