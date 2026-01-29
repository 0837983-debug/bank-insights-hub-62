---
title: Примеры использования API
description: Практические примеры использования API в различных сценариях
related:
  - /api/endpoints
  - /api/get-data
---

# Примеры использования API

Практические примеры использования API в различных сценариях.

## TypeScript примеры

### Базовый запрос KPI метрик

```typescript
import { fetchAllKPIs } from '@/lib/api';

async function loadKPIs() {
  try {
    const kpis = await fetchAllKPIs();
    console.log('Loaded KPIs:', kpis);
    return kpis;
  } catch (error) {
    console.error('Failed to load KPIs:', error);
    throw error;
  }
}
```

### Запрос данных таблицы

```typescript
import { fetchTableData } from '@/lib/api';

async function loadTableData(tableId: string, groupBy?: string) {
  try {
    const data = await fetchTableData(tableId, {
      groupBy: groupBy ? [groupBy] : undefined
    });
    console.log(`Loaded ${data.rows.length} rows for ${tableId}`);
    return data;
  } catch (error) {
    console.error('Failed to load table data:', error);
    throw error;
  }
}

// Использование
const incomeData = await loadTableData('financial_results_income', 'cfo');
```

### Запрос layout

```typescript
import { fetchLayout } from '@/lib/api';

async function loadLayout() {
  try {
    const layout = await fetchLayout();
    console.log(`Layout has ${layout.sections.length} sections`);
    return layout;
  } catch (error) {
    console.error('Failed to load layout:', error);
    throw error;
  }
}
```

## React Hooks примеры

### Использование useAllKPIs

```typescript
import { useAllKPIs } from '@/hooks/useAPI';

function KPIDashboard() {
  const { data: kpis, isLoading, error } = useAllKPIs();

  if (isLoading) return <div>Loading KPIs...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {kpis?.map(kpi => (
        <div key={kpi.id}>
          <h3>{kpi.title}</h3>
          <p>Value: {kpi.value}</p>
          <p>Change: {kpi.change}%</p>
        </div>
      ))}
    </div>
  );
}
```

### Использование useTableData

```typescript
import { useTableData } from '@/hooks/useAPI';
import { useState } from 'react';

function IncomeTable() {
  const [groupBy, setGroupBy] = useState<string | undefined>();
  const { data, isLoading, error } = useTableData(
    'financial_results_income',
    { groupBy: groupBy ? [groupBy] : undefined }
  );

  if (isLoading) return <div>Loading table data...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <select onChange={(e) => setGroupBy(e.target.value)}>
        <option value="">No grouping</option>
        <option value="cfo">Group by CFO</option>
        <option value="client_segment">Group by Client Segment</option>
      </select>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {data?.rows.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.value}</td>
              <td>{row.change}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Использование useLayout с инициализацией форматов

```typescript
import { useLayout } from '@/hooks/useAPI';
import { initializeFormats, formatValue } from '@/lib/formatters';
import { useEffect } from 'react';

function DynamicDashboard() {
  const { data: layout, isLoading } = useLayout();

  // Инициализация форматов при загрузке layout
  useEffect(() => {
    if (layout?.formats) {
      initializeFormats(layout.formats);
    }
  }, [layout]);

  if (isLoading) return <div>Loading layout...</div>;
  if (!layout) return null;

  return (
    <div>
      {layout.sections.map(section => (
        <section key={section.id}>
          <h2>{section.title}</h2>
          {section.components.map(component => (
            <div key={component.id}>
              {/* Форматирование значений через formatId из layout */}
              {/* formatValue('currency_rub', value) */}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
```

### Форматирование значений

```typescript
import { formatValue, initializeFormats } from '@/lib/formatters';
import { useLayout } from '@/hooks/useAPI';

function FormattedValue({ formatId, value }: { formatId: string; value: number }) {
  const { data: layout } = useLayout();

  // Инициализация форматов при загрузке
  useEffect(() => {
    if (layout?.formats) {
      initializeFormats(layout.formats);
    }
  }, [layout]);

  // Использование форматирования
  return <span>{formatValue(formatId, value)}</span>;
}

// Примеры использования:
// formatValue('currency_rub', 1000000)  // "₽1.0M"
// formatValue('percent', 5.2)           // "5.2%"
```

## Обработка ошибок

### Базовая обработка ошибок

```typescript
import { fetchAllKPIs, APIError } from '@/lib/api';

async function loadKPIsWithErrorHandling() {
  try {
    const kpis = await fetchAllKPIs();
    return kpis;
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 404) {
        console.error('KPIs not found');
      } else if (error.status === 500) {
        console.error('Server error:', error.message);
      } else {
        console.error('API error:', error.message);
      }
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}
```

### Обработка ошибок в React компоненте

```typescript
import { useAllKPIs } from '@/hooks/useAPI';

function KPICards() {
  const { data, error, isLoading } = useAllKPIs();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Failed to load KPIs</p>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {data?.map(kpi => (
        <KPICard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
```

## Типичные сценарии

### Сценарий 1: Загрузка дашборда

```typescript
import { useLayout, useAllKPIs } from '@/hooks/useAPI';

function Dashboard() {
  const { data: layout } = useLayout();
  const { data: kpis } = useAllKPIs();

  // Layout определяет структуру, KPI данные заполняют карточки
  return (
    <div>
      {layout?.sections.map(section => (
        <Section key={section.id} section={section} kpis={kpis} />
      ))}
    </div>
  );
}
```

### Сценарий 2: Фильтрация таблицы по периоду

```typescript
import { useTableData } from '@/hooks/useAPI';
import { useState } from 'react';

function PeriodFilteredTable() {
  const [periodDate, setPeriodDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data } = useTableData('financial_results_income', {
    dateFrom: periodDate,
    dateTo: periodDate
  });

  return (
    <div>
      <input
        type="date"
        value={periodDate}
        onChange={(e) => setPeriodDate(e.target.value)}
      />
      {/* Отображение таблицы */}
    </div>
  );
}
```

### Сценарий 3: Динамическая группировка

```typescript
import { useTableData } from '@/hooks/useAPI';
import { useLayout } from '@/hooks/useAPI';
import { useState } from 'react';

function GroupableTable({ tableId }: { tableId: string }) {
  const { data: layout } = useLayout();
  const [selectedGroupBy, setSelectedGroupBy] = useState<string>('');

  // Найти компонент таблицы в layout
  const tableComponent = layout?.sections
    .flatMap(s => s.components)
    .find(c => c.dataSourceKey === tableId);

  const buttons = tableComponent?.buttons || [];

  const { data } = useTableData(tableId, {
    groupBy: selectedGroupBy ? [selectedGroupBy] : undefined
  });

  return (
    <div>
      {buttons.length > 0 && (
        <div className="flex gap-2">
          {buttons.map(button => (
            <button
              key={button.id}
              onClick={() => setSelectedGroupBy(button.settings?.groupBy)}
              className={selectedGroupBy === button.settings?.groupBy ? 'active' : ''}
            >
              {button.title}
            </button>
          ))}
        </div>
      )}
      {/* Отображение таблицы */}
    </div>
  );
}
```

## Прямые fetch запросы

Если нужно использовать нативный fetch:

```typescript
async function fetchKPIsDirectly() {
  const paramsJson = JSON.stringify({});
  const queryString = new URLSearchParams({
    query_id: "kpis",
    component_Id: "kpis",
    parametrs: paramsJson
  }).toString();
  
  const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const kpis = await response.json();
  return kpis;
}

async function fetchTableDataDirectly(tableId: string, groupBy?: string) {
  const url = new URL(`http://localhost:3001/api/table-data/${tableId}`);
  if (groupBy) {
    url.searchParams.append('groupBy', groupBy);
  }
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch table data');
  }
  
  return await response.json();
}
```

## См. также

- [API Endpoints](/api/endpoints) - все доступные endpoints
- [Get Data API](/api/get-data) - детальная документация единого endpoint для всех типов данных
