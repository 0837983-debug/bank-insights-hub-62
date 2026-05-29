# Backend Context

> **Последнее обновление**: 2026-05-28 (sanitize+seed гарантирует strict p1/p2/p3 flow для header_dates)  
> **Обновляет**: Backend Agent после каждого изменения

> **Архивированный код:** Старые сервисы и скрипты перемещены в `archive/`. См. `archive/ARCHIVED_FILES.md`.

## Текущая архитектура

- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL (AWS RDS)
- **Port**: 3001

## Структура проекта

```
backend/src/
├── routes/               # API endpoints (Express routes)
│   ├── index.ts          # Главный роутер
│   ├── dataRoutes.ts     # /api/data
│   ├── uploadRoutes.ts   # /api/upload
│   └── ...
├── services/             # Бизнес-логика
│   ├── queryBuilder/     # SQL Builder
│   │   ├── builder.ts    # Генерация SQL
│   │   └── queryLoader.ts
│   ├── mart/             # Сервисы для данных
│   │   ├── base/         # (пусто — сервисы архивированы)
│   │   └── types.ts
│   └── upload/           # Загрузка файлов
│       ├── fileParserService.ts
│       └── validationService.ts
├── migrations/           # SQL миграции (NNN_description.sql)
├── config/
│   └── database.ts       # Подключение к PostgreSQL
├── middleware/
│   └── errorHandler.ts   # Обработка ошибок
└── server.ts             # Главный файл
```

## Схемы БД

| Схема | Назначение |
|-------|------------|
| `config` | Конфигурация layout, components, queries |
| `dict` | Справочники (formats, upload_mappings) |
| `stg` | Staging слой загрузки (`balance_upload`, `fin_results_upload`) |
| `ods` | Operational Data Store |
| `mart` | Data Mart (данные для дашборда) |
| `ing` | Ingestion (история загрузок) |
| `log` | Логирование |

## Ключевые сервисы

| Сервис | Файл | Назначение |
|--------|------|------------|
| Data API | `routes/dataRoutes.ts` | Универсальный endpoint `/api/data` |
| SQL Builder | `services/queryBuilder/builder.ts` | Генерация SQL из JSON-конфигов |
| Upload | `routes/uploadRoutes.ts` | Загрузка файлов (balance, fin_results) |
| Validation | `services/upload/validationService.ts` | Валидация данных + агрегатная проверка знака для balance (АКТИВЫ >=90% отрицательные, ПАССИВЫ >=90% положительные) |
| Ingestion | `services/upload/ingestionService.ts` | Загрузка STG→ODS + REFRESH MV (`loadToSTG`, `loadFinResultsToSTG`, `transformSTGToODS`, `transformFinResultsSTGToODS`, `refreshBalanceMaterializedViews`, `refreshFinResultsMaterializedViews`) |
| Local DB Bootstrap | `scripts/bootstrap-local-db.sh` | Идемпотентный bootstrap локальной БД (PostgreSQL, миграции, минимальный dataset через Upload API) |
| Dev Data Sanitization | `scripts/sanitize-and-seed-dev-db.sh` | Безопасная очистка чувствительных данных в `stg/ods/ing/log` + пересев из `test-data/uploads` с защитами от prod и ручным флагом `ALLOW_DATA_RESET=true`; по умолчанию загружает 3 balance периода (2024-12, 2025-01, 2025-02) и валидирует наличие `p1/p2/p3` в `mart.v_p_dates` |

## API Endpoints

| Endpoint | Метод | Назначение |
|----------|-------|------------|
| `/api/data` | GET | Универсальный endpoint для данных |
| `/api/upload` | POST | Загрузка файлов (XLSX, CSV) |
| `/api/uploads` | GET | История загрузок |
| `/api/uploads/:id/rollback` | POST | Откат загрузки |

## Паттерны кода

### Работа с БД (pool)
```typescript
import pool from '../config/database';

async function getData(): Promise<SomeType[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM mart.balance WHERE report_date = $1',
      [reportDate]  // Параметризованные запросы!
    );
    return result.rows;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();  // Всегда освобождай!
  }
}
```

### Express Route Handler
```typescript
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/endpoint', async (req: Request, res: Response) => {
  try {
    const data = await someService.getData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('GET /endpoint error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
```

### Сервис
```typescript
// services/mart/someService.ts
import pool from '../../config/database';

export async function getSomeData(params: SomeParams): Promise<SomeResult> {
  const client = await pool.connect();
  try {
    // Логика
    return result;
  } finally {
    client.release();
  }
}
```

## Критерии качества кода

### Код готов, если:
- ✅ TypeScript компилируется без ошибок
- ✅ Все параметры типизированы (избегать `any`)
- ✅ SQL использует параметризацию (`$1, $2`)
- ✅ Pool connection освобождается в `finally`
- ✅ Ошибки обрабатываются и логируются
- ✅ Unit-тесты написаны для критичной логики
- ✅ Тесты проходят: `cd backend && npm run test`

### Запрещено:
- ❌ SQL injection (конкатенация строк в запросах)
- ❌ Тип `any` без необходимости
- ❌ Забытые `client.release()`
- ❌ Игнорирование ошибок

## Текущее состояние

### Завершено:
- ✅ SQL Builder с поддержкой JSON-конфигов
- ✅ Универсальный getData API
- ✅ Загрузка Balance (XLSX с Excel-датами) — STG → ODS → MART
- ✅ Загрузка Financial Results — полный pipeline STG → ODS → MART с soft-delete
- ✅ Unit-тесты (108 тестов, все проходят)
- ✅ Разделение query_id и data_source_key (миграция 053)
- ✅ v_kpi_all с component_id (миграция 052) — KPI привязаны к карточкам через data_source_key
- ✅ v_kpi_all с layout_id (миграция 055) — KPI можно фильтровать по layout
- ✅ v_kpi_all дедупликация (миграция 058) — устранены дубликаты из layout_component_mapping
- ✅ Query `kpis` возвращает componentId для сопоставления на фронте
- ✅ VIEW mart.v_p_dates для дат периодов (миграции 056, 057) — header_dates через SQL Builder
- ✅ periodService и его unit-тест перенесены в `archive/backend/src/services/mart/base/` и удалены из runtime-кода `backend/`
- ✅ Локальный bootstrap БД через `scripts/bootstrap-local-db.sh` (macOS-first, optional Linux branch, миграции + dataset через Upload API)
- ✅ Darwin bootstrap fix: скрипт больше не пропускает `brew services start` только из-за наличия `psql`; при отсутствии server-формулы пытается установить `postgresql@16`
- ✅ Balance sign validation: в upload-валидации добавлен файловый порог `>= 90%` по знаку для АКТИВОВ/ПАССИВОВ
- ✅ В `mart.balance` добавлена инверсия знака для АКТИВОВ (миграции 060/062): через `tech_class='ASSETS'` и fallback по `class='АКТИВЫ'`
- ✅ В `mart.mv_kpi_derived` обновлена формула ROA: удалён `* -1` (т.к. после инверсии АКТИВЫ агрегируются с положительным знаком)
- ✅ В upload pipeline добавлен авто-refresh `mart.mv_kpi_derived` после обновления `mart.mv_kpi_balance` / `mart.mv_kpi_fin_results`
- ✅ Добавлен `scripts/sanitize-and-seed-dev-db.sh`: безопасный idempotent sanitize/reset только для `stg/ods/ing/log`, загрузка только тестовых CSV из `test-data/uploads`, затем refresh всех MART MV
- ✅ `scripts/sanitize-and-seed-dev-db.sh` теперь гарантирует strict flow для `header_dates`: минимум 3 периода (`p1/p2/p3`) на разных датах через множественную загрузку balance CSV и пост-валидацию `mart.v_p_dates`
- ✅ Добавлена миграция 072: восстановлены API query_id `assets_table` и `liabilities_table` (совместимость Stage 5 QA после перехода на `table_balance_*`)

### В работе:
- 🔄 E2E тесты (актуализация)

### Известные проблемы:
- ⚠️ В некоторых macOS окружениях bootstrap может упираться в права Homebrew (`Cellar is not writable`) до завершения QA-прогона

## Команды

```bash
# Unit-тесты ТОЛЬКО бэкенда
cd backend && npm run test

# Запуск dev-сервера
cd backend && npm run dev

# Миграции
cd backend && npm run migrate

# Build
cd backend && npm run build

# Локальный bootstrap БД + минимальный dataset
bash scripts/bootstrap-local-db.sh

# Очистка чувствительных данных и пересев test-data
ALLOW_DATA_RESET=true bash scripts/sanitize-and-seed-dev-db.sh
```

## Зависимости

```json
{
  "express": "^4.x",
  "pg": "^8.x",
  "multer": "^1.x",
  "exceljs": "^4.x",
  "csv-parse": "^5.x",
  "vitest": "^1.x"
}
```

Server: `http://localhost:3001`
