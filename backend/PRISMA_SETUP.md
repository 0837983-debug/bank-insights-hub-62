# Настройка Prisma для Bank Insights Hub

Prisma интегрирован в проект для управления базой данных PostgreSQL.

## Установка

1. **Установите зависимости:**
   ```bash
   cd backend
   npm install
   ```

   Это автоматически установит `@prisma/client` и `prisma` (dev dependency), а также запустит `prisma generate` через postinstall скрипт.

2. **Настройте переменные окружения:**

   Создайте файл `.env` в корне `backend/` директории (если его еще нет):
   ```env
   # Database connection
   DB_HOST=bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=bankdb
   DB_USER=pm
   DB_PASSWORD=your_password
   
   # Prisma использует DATABASE_URL (автоматически формируется из переменных выше)
   # Или можно указать напрямую:
   # DATABASE_URL="postgresql://pm:your_password@bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com:5432/bankdb?sslmode=require"
   
   PORT=3001
   NODE_ENV=development
   ```

3. **Сгенерируйте Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

   Или это произойдет автоматически при `npm install` благодаря postinstall скрипту.

## Использование

### Основные команды Prisma

- `npm run prisma:generate` - Генерирует Prisma Client на основе schema.prisma
- `npm run prisma:studio` - Открывает Prisma Studio (GUI для просмотра данных)
- `npm run prisma:migrate` - Создает новую миграцию (если используете Prisma Migrate)
- `npm run prisma:push` - Применяет изменения схемы к БД без миграций
- `npm run prisma:format` - Форматирует schema.prisma файл

### Использование в коде

Prisma Client доступен через `src/config/database.ts`:

```typescript
import { prisma } from "../config/database.js";

// Пример использования
const users = await prisma.dashboardKpiCategory.findMany();
```

## Структура схемы

Схема Prisma находится в `prisma/schema.prisma` и включает:

- **dashboard** схема:
  - `DashboardKpiCategory` - Категории KPI
  - `DashboardKpiMetric` - KPI метрики
  - `DashboardTableData` - Данные таблиц
  - `DashboardChartData` - Данные графиков

- **config** схема:
  - `ConfigFormat` - Форматы отображения
  - `ConfigLayout` - Layout конфигурации
  - `ConfigComponent` - Компоненты
  - `ConfigLayoutComponentMapping` - Связи layout-компонент
  - `ConfigComponentField` - Поля компонентов
  - `ConfigMartField` - Поля MART справочника

- **mart** схема:
  - `MartKpiMetric` - KPI метрики в MART
  - `MartFinancialResult` - Финансовые результаты
  - `MartBalance` - Баланс

## Миграции

**Важно:** Проект использует SQL миграции в `src/migrations/`, а не Prisma Migrate. 

Prisma используется только как ORM для работы с БД. Для создания/изменения структуры БД продолжайте использовать SQL миграции.

Если вы хотите использовать Prisma Migrate вместо SQL миграций:
1. Удалите существующие SQL миграции
2. Используйте `prisma migrate dev` для создания миграций
3. Обновите скрипты в package.json

## Обновление схемы

Если вы изменили структуру БД через SQL миграции:

1. Обновите `prisma/schema.prisma` вручную
2. Запустите `npm run prisma:generate` для обновления Prisma Client

Или используйте `prisma db pull` для автоматического обновления схемы на основе существующей БД:

```bash
npx prisma db pull
npm run prisma:generate
```

## Миграция существующего кода

Основные сервисы уже переведены на Prisma:
- ✅ `tableDataService.ts`
- ✅ `layoutService.ts`

Остальные сервисы в `src/services/mart/` все еще используют `pool` из `pg`. Их можно постепенно мигрировать на Prisma по мере необходимости.

## Troubleshooting

### Ошибка подключения к БД

Убедитесь, что:
1. Переменные окружения настроены правильно
2. БД доступна по сети
3. SSL настройки корректны (для AWS RDS требуется SSL)

### Prisma Client не найден

Запустите:
```bash
npm run prisma:generate
```

### Схема не синхронизирована с БД

Используйте:
```bash
npx prisma db pull
npm run prisma:generate
```

Это обновит schema.prisma на основе текущей структуры БД.
