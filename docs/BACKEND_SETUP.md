# Настройка Backend API

## Локальный bootstrap БД и данных (самодостаточная инструкция)

Этот сценарий поднимает локальную PostgreSQL, применяет миграции и загружает минимальные тестовые данные через реальный upload pipeline backend.

### Что понадобится заранее

- Node.js и npm (для `backend/` и миграций).
- `curl`.
- PostgreSQL:
  - на macOS скрипт определяет server-формулу Homebrew (`postgresql@16` / `postgresql`) и всегда пытается запустить `brew services start`;
  - если server-формула не найдена, скрипт ставит `postgresql@16` (даже если `psql` уже установлен отдельно, например через `libpq`);
  - на Linux (Debian/Ubuntu) скрипт использует `apt-get` и `sudo`.

### 1) Установите зависимости backend

```bash
cd backend
npm install
cd ..
```

### 2) Подготовьте переменные окружения

Скрипт можно запускать без дополнительных переменных (используются дефолты), но для предсказуемости лучше задать их явно.

Обязательные переменные подключения приложения:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=bankdb_local
DB_USER=bank_local_user
DB_PASSWORD=bank_local_password
```

Дополнительные переменные администратора PostgreSQL (нужны для создания роли/БД, если дефолты не подходят):

```env
DB_ADMIN_USER=<admin_user>
DB_ADMIN_PASSWORD=<admin_password>
```

Дополнительные опции bootstrap:

```env
BOOTSTRAP_PORT=3001
BALANCE_DATASET_FILE=capital_2025-01.csv
FIN_RESULTS_DATASET_FILE=fin_results_2025-01.csv
```

Где задавать переменные:
- либо через `export` в текущем shell перед запуском;
- либо через inline-переопределение прямо в команде запуска.

Пример:

```bash
DB_HOST=127.0.0.1 \
DB_PORT=5432 \
DB_NAME=bankdb_local \
DB_USER=bank_local_user \
DB_PASSWORD=bank_local_password \
DB_ADMIN_USER=postgres \
DB_ADMIN_PASSWORD=postgres \
bash scripts/bootstrap-local-db.sh
```

### 3) Запустите bootstrap-скрипт

```bash
bash scripts/bootstrap-local-db.sh
```

Скрипт делает последовательно:
1. Проверяет ОС (поддержка: macOS, Debian/Ubuntu Linux).
2. Поднимает PostgreSQL (brew/apt + старт сервиса).
3. Ждёт готовности БД (`pg_isready`).
4. Создаёт или обновляет роль и БД, включает `pgcrypto`.
5. Применяет миграции (`cd backend && npm run migrate`).
6. Временно поднимает backend на `BOOTSTRAP_PORT`.
7. Загружает `test-data/uploads/<balance>` как `balance` через `POST /api/upload`.
8. Загружает `test-data/uploads/<fin_results>` как `fin_results` через `POST /api/upload`.
9. Останавливает временный backend и печатает итоговые параметры подключения.

### 4) Проверьте, что bootstrap завершился успешно

Ожидаемый признак успеха в выводе:

```text
[bootstrap-local-db] Bootstrap completed successfully
```

После этого можно запустить backend в обычном режиме:

```bash
cd backend
DB_HOST=127.0.0.1 \
DB_PORT=5432 \
DB_NAME=bankdb_local \
DB_USER=bank_local_user \
DB_PASSWORD=bank_local_password \
npm run dev
```

Проверка API:
- `http://localhost:3001/api/data?query_id=layout`
- `http://localhost:3001/api/data?query_id=header_dates`

### 5) Частые проблемы

- `Required command not found: brew/apt-get/sudo`  
  Установите недостающий инструмент или запустите на поддерживаемой ОС.
- `PostgreSQL did not become ready`  
  Проверьте, что сервис PostgreSQL действительно запущен и порт совпадает с `DB_PORT`.
- На macOS `brew install postgresql@16` падает с ошибкой прав (`Cellar is not writable`)  
  Исправьте ownership/permissions Homebrew директорий (как подсказано в выводе `brew`) и повторите запуск.
- Ошибка прав при создании роли/БД  
  Задайте корректные `DB_ADMIN_USER/DB_ADMIN_PASSWORD` или используйте пользователя с правами администратора.
- `Dataset file not found`  
  Проверьте `BALANCE_DATASET_FILE` и `FIN_RESULTS_DATASET_FILE` в `test-data/uploads/`.
- Backend не поднялся во время bootstrap  
  Смотрите лог `.tmp/backend-bootstrap.log`.

## API Endpoints

### KPI Метрики

- `GET /api/data?query_id=kpis&component_Id=kpis&parametrs={}` - Все KPI метрики через SQL Builder

### Данные таблиц

- `GET /api/data?query_id=<queryId>&component_Id=<componentId>&parametrs={...}` - Данные таблицы через SQL Builder

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
const paramsJson = JSON.stringify({
  p1: "2025-12-31",
  p2: "2025-11-30",
  p3: "2024-12-31"
});
const queryString = new URLSearchParams({
  query_id: "assets_table",
  component_Id: "assets_table",
  parametrs: paramsJson
}).toString();
const response = await fetch(`http://localhost:3001/api/data?${queryString}`);
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

