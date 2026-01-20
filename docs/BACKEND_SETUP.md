# Настройка Backend API

## Быстрый старт

1. **Установите зависимости:**
   ```bash
   cd backend
   npm install
   ```

2. **Настройте переменные окружения:**
   
   Параметры подключения к БД уже настроены в `src/config/database.ts` и используют значения по умолчанию из `test-connection.js`.
   
   При необходимости создайте `.env` файл:
   ```env
   DB_HOST=bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=bankdb
   DB_USER=pm
   DB_PASSWORD=2Lu125JK$CB#NCJak
   PORT=3001
   ```

3. **Запустите миграции:**
   ```bash
   npm run migrate
   ```
   
   Это создаст:
   - Схему `dashboard` в БД
   - Таблицы для KPI метрик, категорий, данных таблиц и графиков
   - Начальные данные для KPI метрик

4. **Загрузите данные таблиц (опционально):**
   ```bash
   npm run load-data
   ```
   
   Это загрузит данные для таблиц доходов и расходов.

5. **Запустите сервер:**
   ```bash
   npm run dev
   ```
   
   Сервер будет доступен на `http://localhost:3001`

## API Endpoints

### KPI Метрики

- `GET /api/data?query_id=kpis&component_Id=kpis&parametrs={}` - Все KPI метрики через SQL Builder

### Данные таблиц

- `GET /api/table-data/:tableId` - Данные таблицы (например: `income`, `expenses`)

### Данные графиков

- `GET /api/chart-data/:chartId` - Данные графика

### Layout

- `GET /api/data?query_id=layout&component_Id=layout&parametrs={"layout_id":"main_dashboard"}` - Структура layout из БД через SQL Builder

## Примеры использования на фронтенде

### Получение всех KPI метрик

```typescript
const paramsJson = JSON.stringify({});
const queryString = new URLSearchParams({
  query_id: "kpis",
  component_Id: "kpis",
  parametrs: paramsJson
}).toString();
const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
const kpis = await response.json();
```

### Получение данных таблицы

```typescript
const response = await fetch('http://localhost:3001/api/table-data/income');
const tableData = await response.json();
```

## Структура данных

### KPI Metric

```typescript
{
  id: string;
  title: string;
  value: string;
  description: string;
  change?: number;
  ytdChange?: number;
  category: string;
  categoryId: string;
  iconName?: string;
  sortOrder: number;
}
```

### Table Row Data

```typescript
{
  id: string;
  name: string;
  description?: string;
  value: number;
  percentage?: number;
  change?: number;
  isGroup?: boolean;
  isTotal?: boolean;
  parentId?: string;
  sortOrder: number;
}
```

