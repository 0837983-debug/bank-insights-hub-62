# Аудит хардкода в репозитории

> Дата: 2026-02-03  
> Цель: собрать **явно захардкоженные значения** (секреты/URL/порты/пути/лимиты/статусы/SQL/ID), которые обычно стоит выносить в env/config/константы/БД.

## Как читался “хардкод”

- **Включено**: `backend/src/**`, `src/**`, `e2e/**`, `scripts/**`, `backend/*.js` (скрипты), конфиги (`playwright.config.ts`, `vitest.config.ts`).
- **Исключено из “сигнального” списка**: сгенерированные артефакты (`docs/.vitepress/cache/**`, `backend/coverage/**`) и “просто текст”/примеры в документации, если они не влияют на runtime (но см. отдельный раздел про docs ниже).
- **Важно**: это аудит по паттернам и ручной выборке — он покрывает “опасный/конфигурационный” хардкод. “Любые строки UI” намеренно не перечислялись.

---

## 1) Секреты / креды (CRITICAL)

### 1.1 Захардкоженный пароль PostgreSQL

- **Где**
  - `backend/src/config/database.ts:14-22` — дефолтные креды (включая пароль)
    - host: `bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com`
    - user: `pm`
    - password: `2Lu125JK$CB#NCJak`
  - Дубликаты в скриптах (все с тем же значением, по `grep`):
    - `backend/db.config.js:12`
    - `backend/create-schemas.js:16`
    - `backend/drop-all-tables.js:13`
    - `backend/drop-dashboard-schema.js:13`
    - `backend/list-all-tables.js:13`
    - `backend/refresh-balance-data.js:13`
    - `backend/test-connection.js:13`
    - `backend/src/scripts/check-db-connection.ts:15`
    - `backend/src/scripts/export-config-to-json.ts:15`
    - `backend/src/scripts/dump-config-schema.ts:18`

- **Почему это проблема**
  - Риск утечки секрета (репозиторий/логирование/скриншоты), невозможность безопасной ротации.

- **Что делать**
  - Удалить дефолтный пароль из кода, требовать `DB_PASSWORD` через env (в dev — через `.env`, не коммитить).
  - Для скриптов — использовать единый конфиг + `dotenv`, без хардкода.

---

## 2) URL/host/port (Высокий приоритет)

### 2.1 Backend server: порт, CORS origin, frontendUrl, timeout

- **Где**
  - `backend/src/server.ts:10` — `PORT = process.env.PORT || 3001`
  - `backend/src/server.ts:13-16` — CORS origins: `http://localhost:8080`, `http://localhost:5173`, `http://127.0.0.1:8080`
  - `backend/src/server.ts:22` — `FRONTEND_URL || "http://localhost:8080"`
  - `backend/src/server.ts:37` — timeout `3000`мс для health-check `fetch`
  - `backend/src/server.ts:168-212` — HTML API docs с жёстким `http://localhost:3001/api` и примерами curl
  - `backend/src/routes/uploadRoutes.ts:115-116, 151-152` — SSE headers с `Access-Control-Allow-Origin: '*'` и `X-Accel-Buffering: 'no'`

- **Что делать**
  - CORS origins и `FRONTEND_URL` держать в env (`CORS_ORIGINS`, `FRONTEND_URL`), не в коде.
  - Док-страницу генерировать на основе env/baseUrl (или убирать хардкод и писать относительные ссылки).
  - Для SSE — явно определить допустимые origin’ы (не `*`), особенно если включаются cookies/credentials.

### 2.2 Frontend: API base URL и dev URLs

- **Где**
  - `src/lib/api.ts:5` — `VITE_API_URL || "http://localhost:3001/api"`
  - `src/hooks/useUploadProgress.ts:18` — `VITE_API_URL || "http://localhost:3001/api"`
  - `src/pages/DevTools.tsx:51-60, 98-119` — `http://localhost:8080`, `http://localhost:3001`, `http://localhost:5173`, `API_BASE = "http://localhost:3001"`
  - `src/pages/DevTools.tsx:226` — `fetch("http://localhost:3001/api/sql-builder", ...)`
  - `playwright.config.ts:29, 46, 52` — baseURL/health URLs завязаны на `http://localhost:8080` и `http://localhost:3001`
  - E2E: много мест вида `const API_BASE_URL = "http://localhost:3001/api"` и `page.goto("http://localhost:8080/...")` (например, `e2e/file-upload.spec.ts:6,11`)

- **Что делать**
  - Везде использовать `import.meta.env.VITE_API_URL`/`VITE_FRONTEND_URL` без fallback на localhost (или fallback только для локального dev, но централизованный).
  - В `DevTools.tsx` — брать baseUrl из env и формировать endpoint’ы от него.

---

## 3) База данных: хардкод окружения/пула/SSL (Высокий приоритет)

### 3.1 Захардкоженный RDS host + параметры пула

- **Где**
  - `backend/src/config/database.ts:8-9` — `requiresSSL` завязан на конкретный host `bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com`
  - `backend/src/config/database.ts:14-18` — дефолты `host/port/database/user/password`
  - `backend/src/config/database.ts:20-22` — pool: `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 10000`
  - `backend/src/config/database.ts:29` — `rejectUnauthorized: false`

- **Что делать**
  - Выносить host/SSL policy в конфиг окружения (разные env: dev/stage/prod).
  - `rejectUnauthorized: false` — только по явному флагу и с пониманием риска.

---

## 4) Локальные пути/директории (Средний приоритет)

### 4.1 Хардкод базовой директории для processed файлов

- **Где**
  - `backend/src/services/upload/storageService.ts:25-26` — `baseDir: "row/processed"`
  - `backend/src/utils/fileUtils.ts:70-74` — `baseDir: "row/processed"`

- **Что делать**
  - Вынести в env/config (например `UPLOADS_BASE_DIR`), либо хранить в настройке приложения.

---

## 5) Лимиты/таймауты/интервалы (Средний/Высокий приоритет)

### 5.1 Backend: batch size, max file size, SSE heartbeat, лимиты list’ов

- **Где**
  - `backend/src/services/upload/ingestionService.ts:14` — `const BATCH_SIZE = 1000`
  - `backend/src/routes/uploadRoutes.ts:77` — multer `fileSize: 50 * 1024 * 1024`
  - `backend/src/routes/uploadRoutes.ts:126-131` — тестовый SSE: остановка на `count >= 5`, interval `1000`мс
  - `backend/src/routes/uploadRoutes.ts:171-174` — heartbeat `15000`мс
  - `backend/src/services/progress/progressService.ts:5, 13` — TTL `5 * 60 * 1000`, cleanup interval `60 * 1000`
  - `backend/src/routes/uploadRoutes.ts:380-381` — fallback sessionId: `uploadId.toString()` если не пришёл `clientSessionId`

### 5.2 Frontend: React Query staleTime/refetchInterval и прочие задержки

- **Где**
  - `src/hooks/useAPI.ts:41` — `5 * 60 * 1000` (layout staleTime)
  - `src/hooks/useAPI.ts:58, 80, 118` — `1 * 60 * 1000`
  - `src/hooks/useAPI.ts:94-95` — `30 * 1000` (health staleTime/refetchInterval)
  - `src/hooks/useFileUpload.ts:92-94` — polling interval `2000`мс для статусов upload
  - `src/pages/FileUpload.tsx:88-89` — задержка `200`мс перед стартом upload (“чтобы SSE успел подключиться”)
  - `src/components/upload/FileUploader.tsx:24` — default `50 * 1024 * 1024`
  - `src/components/KPICard.tsx:162, 176, 200` — `TooltipProvider delayDuration={300}`
  - `src/components/CollapsibleSection.tsx:40-42` — `duration-300` и `max-h-[10000px]`
  - `src/components/upload/UploadStagesProgress.tsx:61-63` — порог `1000`мс для форматирования длительности (ms vs seconds)

- **Что делать**
  - Все лимиты/таймауты собрать в `config/constants` (backend + frontend), сделать “объясняющие” имена.

---

## 6) Статусы / системные значения (Средний приоритет)

### 6.1 Upload status strings (union) и строки в SQL

- **Где**
  - `backend/src/services/upload/ingestionService.ts:310` — тип: `"pending" | "processing" | "completed" | "failed" | "rolled_back"`
  - `backend/src/services/progress/types.ts:1` — `'pending' | 'in_progress' | 'completed' | 'failed'`
  - `backend/src/services/upload/rollbackService.ts:29-31, 68-74` — `"rolled_back"` + SQL `SET status = 'rolled_back'`

### 6.2 Захардкоженный “system” пользователь

- **Где**
  - `backend/src/services/upload/ingestionService.ts:153-154, 170, 187` — `'system'` в ODS created_by/updated_by/deleted_by
  - `backend/src/services/upload/rollbackService.ts:14-15` — `rolledBackBy: string = "system"`

- **Что делать**
  - Ввести enum/константы (`UPLOAD_STATUS`, `PROGRESS_STAGE_STATUS`, `SYSTEM_USER_ID`) и использовать их в одном месте.

---

## 7) Бизнес-идентификаторы: table_component_id, currency_code, query_id/layout_id (Средний/Высокий)

### 7.1 Захардкоженные идентификаторы MART/таблиц/валют

- **Где**
  - `backend/src/services/upload/ingestionService.ts:244-245` — `table_component_id = 'balance_assets_table'`
  - `backend/src/services/upload/ingestionService.ts:254-255` — `currency_code = 'RUB'`
  - `backend/src/services/upload/ingestionService.ts:265-266` — `'balance_assets_table' as table_component_id`
  - `backend/src/services/upload/ingestionService.ts:273-274` — `'RUB' as currency_code`
  - `backend/src/routes/uploadRoutes.ts:334-337` — `supportedTables = ["balance", "fin_results"]`

### 7.2 Frontend: layoutId/queryId/componentId

- **Где**
  - `src/lib/api.ts:129` — `DEFAULT_LAYOUT_ID = "main_dashboard"`
  - `src/lib/api.ts:163-165` — query params `"layout"`/`"layout"` (query_id/component_Id)
  - (по проекту также встречается `"kpis"` и прочие query_id — см. `src/lib/api.ts` далее по файлу)
  - `src/pages/DynamicDashboard.tsx:28` — дефолтная иерархия `DEFAULT_HIERARCHY = ["class", "section", "item", "sub_item"]`
  - `src/pages/DynamicDashboard.tsx:55-58` — дефолтные measure поля `["value"]` и fallback `"value"`
  - `src/pages/DynamicDashboard.tsx:131-135` — генерация leaf id `leaf-${orderCounter}` + `sortOrder` через `orderCounter++`

### 7.3 Frontend: целевые таблицы upload

- **Где**
  - `src/pages/FileUpload.tsx:20` — default `targetTable = "balance"`
  - `src/pages/FileUpload.tsx:59` — типизированный выбор `"balance" | "fin_results"` для кнопок
  - `src/hooks/useFileUpload.ts:64-66` — fallback `options.targetTable || "balance"`
  - `backend/src/routes/uploadRoutes.ts:334-339` — backend whitelist `["balance", "fin_results"]`

- **Что делать**
  - Держать “ID сущностей” в одном конфиге (или в БД и загружать), не размазывать строками по коду.

---

## 8) SQL-строки и имена схем/таблиц внутри кода (Средний приоритет)

### 8.1 Backend: крупные SQL блоки в сервисах/роутах

- **Где (примеры)**
  - `backend/src/services/upload/ingestionService.ts:99-109` — `INSERT INTO stg.balance_upload ... unnest(...)`
  - `backend/src/services/upload/ingestionService.ts:143-158` — `SELECT DISTINCT ... FROM stg.balance_upload`, затем `UPDATE ods.balance ... deleted_by = 'system'`
  - `backend/src/services/upload/ingestionService.ts:166-179` — `UPDATE ods.balance ...`
  - `backend/src/services/upload/ingestionService.ts:185-201` — `INSERT INTO ods.balance ... 'system'`
  - `backend/src/services/upload/ingestionService.ts:227-232` — `DELETE FROM mart.balance ...`
  - `backend/src/routes/uploadRoutes.ts:197-203` — `SELECT ... FROM ing.uploads WHERE id = $1`
  - `backend/src/routes/sqlBuilderRoutes.ts:16-20` — `SELECT query_id, title, config_json FROM config.component_queries ...`
  - `backend/src/services/upload/rollbackService.ts:35-75` — `DELETE/UPDATE/SELECT DISTINCT/UPDATE ing.uploads SET status='rolled_back'`

- **Что делать**
  - Минимум: вынести SQL в отдельные “query constants” модули + унифицировать имена схем/таблиц.
  - Лучше: использовать query builder/DAO слой (особенно для повторяющихся запросов).

---

## 9) Хардкод дат/периодов (Высокий приоритет)

### 9.1 Временные тестовые даты в `periodService`

- **Где**
  - `backend/src/services/mart/base/periodService.ts:209-214`
    - `current: new Date('2025-12-01')`
    - `previousMonth: new Date('2025-11-01')`
    - `previousYear: new Date('2025-01-01')`

- **Почему важно**
  - Это напрямую влияет на данные/дашборд в runtime (не просто тесты).

- **Что делать**
  - Убрать временный блок, восстановить расчёт через БД или параметры запроса.

### 9.2 Excel serial date / epoch “магические числа”

- **Где**
  - `backend/src/utils/dateUtils.ts:39-46` — `millisecondsPerDay = 86400000`, `excelEpoch = 25569`
  - `backend/src/utils/dateUtils.ts:67-70` — диапазон Excel serial date: `30000-100000`
  - `backend/src/utils/dateUtils.ts:138-145` — `maxAge: number = 10`, а также “конец следующего года” и “начало года maxAge лет назад”

---

## 10) Отдельно: документация и примеры (Low)

В `docs/**` очень много захардкоженных `http://localhost:3001`, `http://localhost:8080`, тестовых дат и путей (curl примеры, гайды, планы). Это **не runtime хардкод**, но влияет на воспроизводимость:

- **Рекомендация**: завести единые placeholders (`$API_URL`, `$FRONTEND_URL`) и генерировать их в примерах через переменные окружения/шаблоны.

---

## 11) Frontend UI “магические” числа/строки (Low/Medium)

### 11.1 Mock-детализация в `FinancialTable`

- **Где**
  - `src/components/FinancialTable.tsx:192-225` — проценты и коэффициенты детализации: `0.35/35%`, `0.28/28%`, `0.22/22%`, `0.15/15%`

- **Почему важно**
  - Это выглядит как продуктовая логика/демо-данные внутри продового компонента.

### 11.2 Locale и формат даты

- **Где**
  - `src/lib/formatters.ts:219-227` — locale `"ru-RU"`
  - `src/lib/formatters.ts:217-218` — split по `'T'` через `toISOString().split("T")[0]`

### 11.3 Округления/проценты

- **Где**
  - `src/lib/calculations.ts:92-94` — умножение на `100` и округление до 2 знаков через `Math.round(percentage * 100) / 100`

### 11.4 Статусы UI для истории загрузок

- **Где**
  - `src/components/upload/UploadHistory.tsx:17-23` — статус-маппинг `pending/processing/completed/failed/rolled_back`
  - `src/components/upload/UploadHistory.tsx:94-95` — label по `targetTable`: `"balance" → "Баланс"`, `"fin_results" → "Финрез"`

