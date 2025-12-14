# Bank Metrics Dashboard Backend

Backend API для Bank Metrics Dashboard, который взаимодействует с фронтендом через REST API и хранит все данные в PostgreSQL базе данных.

## Структура проекта

```
backend/
├── src/
│   ├── config/          # Конфигурация БД
│   ├── migrations/      # SQL миграции
│   ├── routes/          # API routes
│   ├── services/        # Бизнес-логика и работа с БД
│   ├── middleware/      # Express middleware
│   └── scripts/         # Утилиты и скрипты
├── dist/                # Скомпилированный код
└── package.json
```

## Установка

```bash
cd backend
npm install
```

## Настройка

Создайте файл `.env` в корне backend директории:

```env
DB_HOST=bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=bankdb
DB_USER=pm
DB_PASSWORD=your_password
PORT=3001
NODE_ENV=development
```

## Запуск миграций

Перед первым запуском необходимо выполнить миграции для создания структуры БД:

```bash
npm run migrate
```

Это создаст:
- Схему `dashboard` для хранения данных дашборда
- Таблицы для KPI метрик, категорий, данных таблиц и графиков
- Начальные данные для KPI метрик

## Загрузка данных таблиц

После миграций можно загрузить данные для таблиц:

```bash
npm run load-data
```

Это загрузит данные для таблиц доходов и расходов.

## Разработка

Запуск в режиме разработки с hot-reload:

```bash
npm run dev
```

Сервер будет доступен на `http://localhost:3001`

## Сборка

Компиляция TypeScript в JavaScript:

```bash
npm run build
```

## Запуск production

```bash
npm start
```

## API Endpoints

### KPI Endpoints

- `GET /api/kpis` - Получить все KPI метрики
- `GET /api/kpis/categories` - Получить все категории KPI
- `GET /api/kpis/category/:categoryId` - Получить KPI метрики по категории
- `GET /api/kpis/:id` - Получить конкретную KPI метрику

### Table Data Endpoints

- `GET /api/table-data/:tableId` - Получить данные таблицы по ID

### Chart Data Endpoints

- `GET /api/chart-data/:chartId` - Получить данные графика по ID

### Layout Endpoints

- `GET /api/layout` - Получить структуру layout из БД

### Health Check

- `GET /api/health` - Проверка работоспособности сервера

## Структура базы данных

### Схема `dashboard`

- `kpi_categories` - Категории KPI метрик
- `kpi_metrics` - KPI метрики с лейблами, значениями, изменениями
- `table_data` - Иерархические данные для таблиц
- `chart_data` - Данные для графиков (JSONB)

### Схема `config`

Используется для хранения структуры отображения (форматы, фильтры, секции, компоненты).

## Примеры использования

### Получить все KPI метрики

```bash
curl http://localhost:3001/api/kpis
```

### Получить данные таблицы доходов

```bash
curl http://localhost:3001/api/table-data/income
```

### Получить данные графика

```bash
curl http://localhost:3001/api/chart-data/currency-transactions
```
