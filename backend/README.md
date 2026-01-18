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
- Схемы `stg`, `ods`, `ing`, `dict` для загрузки файлов
- Таблицы для KPI метрик, категорий, данных таблиц и графиков
- Таблицы для загрузки файлов (`stg.balance_upload`, `ods.balance`, `ing.uploads`, `dict.upload_mappings`)
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

### Table Data Endpoints

- `GET /api/table-data/:tableId` - Получить данные таблицы по ID
  - Query параметры: `groupBy` (опционально), `dateFrom` (опционально), `dateTo` (опционально)
  - Опции группировки берутся из `groupableFields` в layout

### Layout Endpoints

- `GET /api/layout` - Получить структуру layout из БД

### Upload Endpoints

- `POST /api/upload` - Загрузить файл (CSV/XLSX) для импорта данных
  - Параметры (multipart/form-data): `file` (обязательно), `targetTable` (обязательно, например: `balance`), `sheetName` (опционально, для XLSX)
  - Поддерживаемые форматы: CSV (разделитель `;`), XLSX
  - Поддерживаемые таблицы: `balance`
- `GET /api/upload/:uploadId` - Получить статус загрузки по ID
- `GET /api/upload/:uploadId/sheets` - Получить список листов для XLSX файла
- `POST /api/upload/:uploadId/rollback` - Откатить загрузку (удалить загруженные данные)
- `GET /api/uploads` - Получить историю загрузок
  - Query параметры: `targetTable` (опционально), `status` (опционально), `limit` (опционально), `offset` (опционально)

### Health Check

- `GET /api/health` - Проверка работоспособности сервера

## Структура базы данных

### Схема `dashboard`

- `kpi_metrics` - KPI метрики с лейблами, значениями, изменениями
- `table_data` - Иерархические данные для таблиц

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

### Получить данные таблицы с группировкой

```bash
curl "http://localhost:3001/api/table-data/income?groupBy=product_line"
```

### Загрузить файл (CSV/XLSX)

```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@balance.csv" \
  -F "targetTable=balance"
```

### Получить статус загрузки

```bash
curl http://localhost:3001/api/upload/1
```

### Получить историю загрузок

```bash
curl http://localhost:3001/api/uploads
curl "http://localhost:3001/api/uploads?targetTable=balance&status=completed"
```
