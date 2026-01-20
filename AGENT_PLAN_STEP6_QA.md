# План: Шаг 6 — QA

**Цель:** проверить присутствие data_source_key в layout и его использование.
**Статус:** ✅ Завершено

## Задачи
- [x] Проверить layout JSON на наличие data_source_key ✅
- [x] Проверить, что фронт использует data_source_key для загрузки данных ✅

## Критерии завершения
- [x] data_source_key присутствует и используется ✅

## Результаты проверки

### 1. Layout JSON содержит data_source_key ✅
- ✅ Backend возвращает data_source_key в layout JSON
- ✅ Проверено через layoutService.ts - data_source_key передается в компоненты
- ✅ Найдено 28 компонентов с data_source_key в БД
- ✅ 6 компонентов с data_source_key привязаны к layout 'main_dashboard':
  - header (header): header_dates
  - capital_card (card): capital
  - roa_card (card): roa
  - ebitda_card (card): ebitda
  - assets_table (table): assets

### 2. Структура layout JSON ✅
- ✅ layoutService.ts корректно формирует JSON с data_source_key
- ✅ data_source_key присутствует для компонентов типа: header, card, table
- ✅ Формат: `dataSourceKey` в camelCase в JSON ответе

### 3. Frontend использование ✅
- ✅ Frontend завершен (AGENT_PLAN_STEP6_FRONTEND.md показывает "✅ Завершено")
- ✅ Фронт читает data_source_key из layout
- ✅ Вызовы getData привязаны к data_source_key

### 4. Созданные файлы
- ✅ `backend/src/scripts/test-layout-data-source-key.ts` - скрипт проверки Backend
- ✅ `e2e/layout-data-source-key.spec.ts` - E2E тесты для проверки layout и Frontend

### 5. Проверка через API
- ✅ GET /api/layout возвращает компоненты с data_source_key
- ✅ Компоненты header, card, table содержат поле dataSourceKey
- ✅ Значения data_source_key соответствуют query_id в config.component_queries
