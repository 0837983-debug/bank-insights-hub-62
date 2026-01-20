---
title: Отладка
description: Инструменты и методы отладки приложения
related:
  - /development/guidelines
  - /guides/troubleshooting
---

# Отладка

Инструменты и методы для отладки приложения Bank Insights Hub.

## Инструменты отладки

### React DevTools

Расширение для браузера для отладки React компонентов.

**Возможности:**
- Просмотр дерева компонентов
- Инспекция props и state
- Профилирование производительности
- Отладка hooks

**Установка:**
- Chrome: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools)
- Firefox: [React Developer Tools](https://addons.mozilla.org/firefox/addon/react-devtools/)

### Browser DevTools

Встроенные инструменты браузера.

**Console:**
- Логирование: `console.log()`, `console.error()`
- Проверка переменных
- Выполнение кода

**Network:**
- Мониторинг HTTP запросов
- Проверка ответов API
- Анализ времени загрузки

**Sources:**
- Breakpoints
- Step through debugging
- Watch expressions

### Vite DevTools

Инструменты разработки Vite.

**Hot Module Replacement (HMR):**
- Автоматическое обновление при изменениях
- Сохранение состояния компонентов

**Error Overlay:**
- Отображение ошибок компиляции
- Stack traces
- Позиции ошибок в коде

## DevTools страница

Встроенная страница `/dev-tools` для отладки.

**Возможности:**
- Тестирование API endpoints
- Просмотр ответов
- Проверка layout структуры
- Health check

**Доступ:**
```
http://localhost:8080/dev-tools
```

## Логирование

### Frontend логирование

**Console методы:**
```typescript
console.log('Info:', data);
console.error('Error:', error);
console.warn('Warning:', message);
console.table(data); // Для массивов объектов
```

**Условное логирование:**
```typescript
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

### Backend логирование

**Использование console:**
```typescript
console.log('Processing request:', req.path);
console.error('Error occurred:', error);
```

**Структурированное логирование:**
```typescript
console.log('[KPI Service]', {
  action: 'fetchKPIs',
  category: category,
  periodDate: periodDate
});
```

## Отладка React компонентов

### Использование React DevTools

1. Откройте DevTools
2. Перейдите на вкладку "Components"
3. Выберите компонент
4. Просмотрите props и state
5. Измените props для тестирования

### Debugging hooks

**useDebugValue:**
```typescript
function useCustomHook() {
  const value = useState(0);
  
  // Отображается в React DevTools
  useDebugValue(value, v => `Value: ${v}`);
  
  return value;
}
```

### Breakpoints в компонентах

Используйте `debugger`:
```typescript
function Component() {
  const data = useAllKPIs();
  
  debugger; // Остановка здесь
  
  return <div>{data.title}</div>;
}
```

## Отладка API запросов

### Network tab

1. Откройте DevTools → Network
2. Фильтр по XHR/Fetch
3. Кликните на запрос
4. Просмотрите:
   - Headers (request/response)
   - Payload
   - Response
   - Timing

### Логирование запросов

**В API клиенте:**
```typescript
async function apiFetch<T>(endpoint: string) {
  console.log('[API] Request:', endpoint);
  
  const response = await fetch(endpoint);
  const data = await response.json();
  
  console.log('[API] Response:', data);
  
  return data;
}
```

### Тестирование endpoints

Используйте DevTools страницу или curl:
```bash
curl "http://localhost:3001/api/data?query_id=kpis&component_Id=kpis&parametrs=%7B%7D"
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D"
```

## Отладка состояния

### React Query DevTools

Просмотр состояния React Query:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### Redux DevTools (если используется)

Для управления глобальным состоянием.

## Отладка производительности

### React Profiler

1. Откройте React DevTools
2. Перейдите на вкладку "Profiler"
3. Начните запись
4. Взаимодействуйте с приложением
5. Остановите запись
6. Анализируйте результаты

### Performance tab

Браузерные инструменты:
1. DevTools → Performance
2. Начните запись
3. Взаимодействуйте с приложением
4. Остановите запись
5. Анализируйте timeline

## Отладка базы данных

### Прямые SQL запросы

Подключение к БД:
```bash
psql -h host -U user -d bankdb
```

**Полезные запросы:**
```sql
-- Проверка данных
SELECT * FROM mart.kpi_metrics LIMIT 10;

-- Проверка layout
SELECT * FROM config.layouts WHERE is_active = TRUE;

-- Проверка компонентов
SELECT * FROM config.components WHERE component_type = 'card';
```

### Логирование SQL

В backend коде:
```typescript
const result = await pool.query(query, params);
console.log('SQL Query:', query);
console.log('Params:', params);
console.log('Result rows:', result.rows.length);
```

## Типичные проблемы

### Проблема: Данные не загружаются

**Проверка:**
1. Network tab - есть ли запрос?
2. Console - есть ли ошибки?
3. Backend логи - обрабатывается ли запрос?
4. БД - есть ли данные?

### Проблема: Компонент не обновляется

**Проверка:**
1. React DevTools - изменился ли state?
2. Props - передаются ли правильно?
3. Key prop - уникальны ли ключи?
4. Dependencies - правильные ли зависимости в hooks?

### Проблема: Ошибка типов

**Проверка:**
1. TypeScript errors в IDE
2. `npm run type-check`
3. Типы данных из API
4. Интерфейсы компонентов

## См. также

- [Решение проблем](/guides/troubleshooting) - типичные проблемы и решения
- [Руководящие принципы](/development/guidelines) - принципы разработки
