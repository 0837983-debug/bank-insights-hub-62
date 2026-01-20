# План: Шаг 5 — QA

**Цель:** проверить header как компонент + data_source_key и фронт загрузку дат.
**Статус:** ✅ Завершено (Backend проверен, Frontend ожидает реализации)

## Задачи
- [x] Проверить, что header компонент есть в `config.components` ✅
- [x] Проверить связь в `layout_component_mapping` ✅
- [x] Проверить `data_source_key = header_dates` ✅
- [ ] Проверить, что фронт дергает getData и получает dates (Frontend еще не реализован)

## Критерии завершения
- [x] Данные присутствуют и корректны ✅ (Backend)
- [ ] Даты реально используются в запросах (Frontend еще не реализован)

## Результаты проверки Backend

### 1. Header компонент в config.components ✅
- ✅ Компонент 'header' найден
- ✅ component_type: 'header'
- ✅ title: 'Header'
- ✅ data_source_key: 'header_dates'
- ✅ is_active: true

### 2. Привязка header к layout ✅
- ✅ Header привязан к layout 'main_dashboard'
- ✅ parent_component_id: NULL (верхний уровень)
- ✅ display_order: 0 (первый компонент)
- ✅ is_visible: true

### 3. Query header_dates ✅
- ✅ Query 'header_dates' найден в config.component_queries
- ✅ title: 'Даты периодов для header'
- ✅ is_active: true
- ✅ Конфиг доступен и валиден:
  - from: mart.kpi_metrics
  - select items: 1
  - wrap_json: false

### 4. Возможность получения данных через getData ✅
- ✅ Endpoint /api/data работает с query_id='header_dates'
- ✅ Данные возвращаются в корректном формате

### 5. Созданные файлы
- ✅ `backend/src/scripts/test-header-component.ts` - скрипт проверки Backend
- ✅ `e2e/header-component.spec.ts` - E2E тесты для header компонента

### Статус Frontend
- ⏳ Frontend еще не реализован (AGENT_PLAN_STEP5_FRONTEND.md показывает статус "⏳ Ожидает начала")
- Тесты для Frontend подготовлены в `e2e/header-component.spec.ts`, но пропущены до реализации
