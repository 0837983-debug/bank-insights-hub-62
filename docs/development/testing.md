---
title: Тестирование
description: Стратегия тестирования и примеры тестов
related:
  - /development/guidelines
  - /deployment/ci-cd
---

# Тестирование

Стратегия тестирования проекта Bank Insights Hub.

## Обзор

Проект использует два уровня тестирования:
- **Unit тесты** (Vitest) - тестирование отдельных компонентов и функций
- **E2E тесты** (Playwright) - тестирование полного flow приложения

## Unit тесты (Vitest)

### Настройка

Конфигурация в `vitest.config.ts`:
- Environment: jsdom (для React компонентов)
- Coverage: минимум 70%
- Setup файл: `src/test/setup.ts`

### Запуск тестов

```bash
npm run test           # Запуск всех тестов
npm run test:watch     # Watch режим
npm run test:ui        # UI для тестов
npm run test:coverage  # С покрытием кода
```

### Тестирование компонентов

**Пример:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KPICard } from './KPICard';

describe('KPICard', () => {
  it('renders title and value', () => {
    render(
      <KPICard
        title="Капитал"
        value="1,500,000,000"
        description="Собственный капитал"
      />
    );
    
    expect(screen.getByText('Капитал')).toBeInTheDocument();
    expect(screen.getByText('1,500,000,000')).toBeInTheDocument();
  });

  it('displays change indicator when provided', () => {
    render(
      <KPICard
        title="Капитал"
        value="1,500,000,000"
        description="Собственный капитал"
        change={5.2}
        showChange={true}
      />
    );
    
    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });
});
```

### Тестирование hooks

**Пример:**
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useAllKPIs } from './useAPI';

describe('useAllKPIs', () => {
  it('fetches KPI data', async () => {
    const { result } = renderHook(() => useAllKPIs());
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
```

### Тестирование утилит

**Пример:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { formatValue, initializeFormats } from './formatters';

describe('formatValue', () => {
  beforeEach(() => {
    // Инициализация форматов перед тестами
    initializeFormats({
      currency_rub: {
      kind: 'currency',
      prefixUnitSymbol: '₽',
        thousandSeparator: true,
        shorten: true
      },
      percent: {
        kind: 'percent',
        suffixUnitSymbol: '%',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }
    });
  });

  it('formats currency correctly', () => {
    const result = formatValue('currency_rub', 1000000);
    expect(result).toBe('₽1.0M');
  });

  it('formats percentage correctly', () => {
    const result = formatValue('percent', 5.2);
    expect(result).toBe('5.2%');
  });
});
```

## E2E тесты (Playwright)

### Настройка

Конфигурация в `playwright.config.ts`:
- Браузеры: Chromium, Firefox, WebKit
- Base URL: http://localhost:8080
- Timeout: 30 секунд

### Запуск тестов

```bash
npm run test:e2e           # Все E2E тесты
npm run test:e2e:api       # Только API тесты
npm run test:e2e:security  # Тесты безопасности
npm run test:e2e:ui        # UI для тестов
npm run test:e2e:headed    # Видимый браузер
```

### Тестирование UI

**Пример:**
```typescript
import { test, expect } from '@playwright/test';

test('dashboard loads and displays KPIs', async ({ page }) => {
  await page.goto('/');
  
  // Проверка загрузки
  await expect(page.locator('text=Загрузка')).toBeVisible();
  
  // Проверка отображения KPI карточек
  await expect(page.locator('[data-testid="kpi-card"]')).toHaveCount(
    { min: 1 }
  );
});
```

### Тестирование API

**Пример:**
```typescript
import { test, expect } from '@playwright/test';

test('KPI API returns data', async ({ request }) => {
  const paramsJson = JSON.stringify({});
  const queryString = new URLSearchParams({
    query_id: "kpis",
    component_Id: "kpis",
    parametrs: paramsJson
  }).toString();
  
  const response = await request.get(`http://localhost:3001/api/data?${queryString}`);
  
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThan(0);
});
```

### Тестирование безопасности

**Пример:**
```typescript
test('SQL injection protection', async ({ request }) => {
  const maliciousInput = "'; DROP TABLE users; --";
  const paramsJson = JSON.stringify({ id: maliciousInput });
  const queryString = new URLSearchParams({
    query_id: "kpis",
    component_Id: "kpis",
    parametrs: paramsJson
  }).toString();
  
  const response = await request.get(
    `http://localhost:3001/api/data?${queryString}`
  );
  
  // Должен вернуть ошибку, а не выполнить SQL
  expect(response.status()).toBeGreaterThanOrEqual(400);
});
```

## Покрытие кода

### Требования

Минимум 70% покрытия для:
- Lines (строки)
- Functions (функции)
- Branches (ветки)
- Statements (выражения)

### Просмотр покрытия

```bash
npm run test:coverage
open coverage/index.html
```

## Стратегия тестирования

### Что тестировать

**Обязательно:**
- Критичная бизнес-логика
- Утилиты и хелперы
- API endpoints
- Безопасность

**Желательно:**
- Компоненты с сложной логикой
- Hooks
- Форматирование данных

**Опционально:**
- Простые компоненты
- Константы
- Типы

### Что НЕ тестировать

- Третьесторонние библиотеки
- React/Vite внутренности
- Очевидные функции

## Best Practices

### 1. Arrange-Act-Assert

Структура теста:
```typescript
test('should format currency', () => {
  // Arrange
  initializeFormats({
    currency_rub: {
      kind: 'currency',
      prefixUnitSymbol: '₽',
      thousandSeparator: true
    }
  });
  const value = 1000000;
  
  // Act
  const result = formatValue('currency_rub', value);
  
  // Assert
  expect(result).toBe('₽1,000,000');
});
```

### 2. Изолированные тесты

Каждый тест должен быть независимым:
- Не зависеть от других тестов
- Не использовать общее состояние
- Очищать после себя

### 3. Описательные имена

Имена тестов должны описывать что тестируется:
```typescript
// Плохо
test('test1', () => { ... });

// Хорошо
test('should return error when KPI not found', () => { ... });
```

### 4. Моки и стабы

Используйте моки для внешних зависимостей:
```typescript
vi.mock('@/lib/api', () => ({
  fetchAllKPIs: vi.fn(() => Promise.resolve([...]))
}));
```

## См. также

- [Руководящие принципы](/development/guidelines) - принципы разработки
- [CI/CD Pipeline](/deployment/ci-cd) - автоматическая проверка
