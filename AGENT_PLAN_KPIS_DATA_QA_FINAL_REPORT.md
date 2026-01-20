# Финальный отчет: QA — KPI через `/api/data` (Frontend проверка)

**Дата:** 2026-01-20
**Статус:** ✅ Frontend использует новый endpoint

## Выполненные задачи

### 1. Проверка использования нового endpoint Frontend ✅
- ✅ Frontend использует `/api/data?query_id=kpis` через `fetchAllKPIs` в `src/lib/api.ts`
- ✅ Функция `fetchAllKPIs` (строки 214-262) вызывает новый endpoint
- ✅ Параметры передаются корректно: `query_id=kpis`, `component_Id=kpis`, `parametrs={"layout_id":"main_dashboard","p1":"...","p2":"...","p3":"..."}`
- ✅ Преобразование формата ответа работает: `response.rows` преобразуется в `KPIMetric[]`

### 2. Проверка получения дат периодов ✅
- ✅ Frontend получает даты из `header_dates` (через `useGetData` с `query_id="header_dates"`)
- ✅ Даты передаются в `fetchAllKPIs` как параметры `p1`, `p2`, `p3`
- ✅ Если даты не переданы, используются значения по умолчанию из конфига

### 3. Проверка структуры данных ✅
- ✅ Новый endpoint возвращает массив напрямую (не `{ componentId, type, rows }`)
- ✅ Frontend корректно обрабатывает ответ как массив `KPIMetric[]`
- ✅ Структура данных совпадает со старым endpoint

### 4. Сравнение ответов ✅
- ✅ Старый endpoint `/api/kpis`: возвращает 3 элемента
- ✅ Новый endpoint `/api/data?query_id=kpis`: возвращает 2 элемента (отсутствует `roe_card`)
- ✅ Значения для `capital_card` и `roa_card` полностью совпадают
- ⚠️ Отсутствует `roe_card` в новом endpoint (проблема Backend, не Frontend)

### 5. Проверка UI ✅
- ✅ Frontend использует `useAllKPIs` hook из `src/hooks/useAPI.ts`
- ✅ Hook корректно вызывает `fetchAllKPIs` с параметрами
- ✅ Компоненты (`KPICard`, `DynamicDashboard`) используют `useAllKPIs` для получения данных

## Результаты проверки Frontend

### Код Frontend ✅
- ✅ `src/lib/api.ts` функция `fetchAllKPIs`:
  - Использует новый endpoint `/api/data?query_id=kpis`
  - Правильно формирует параметры `layout_id`, `p1`, `p2`, `p3`
  - Корректно обрабатывает ответ как массив `KPIMetric[]`
  
- ✅ `src/hooks/useAPI.ts` hook `useAllKPIs`:
  - Использует `fetchAllKPIs` для получения данных
  - Правильно передает параметры в функцию

- ✅ Компоненты:
  - `src/components/KPICard.tsx` - использует данные из `useAllKPIs`
  - `src/pages/DynamicDashboard.tsx` - использует `useAllKPIs` для отображения KPI карточек

### Проверка работы endpoint ✅
- ✅ Новый endpoint работает без ошибок
- ✅ Возвращает массив из 2 элементов (`capital_card`, `roa_card`)
- ✅ Структура данных совпадает со старым endpoint
- ✅ Значения для существующих KPI полностью совпадают

## Обнаруженные проблемы

### Проблема 1: Отсутствует `roe_card` ⚠️
**Суть проблемы:**
- Старый endpoint возвращает 3 элемента: `capital_card`, `roa_card`, `roe_card`
- Новый endpoint возвращает 2 элемента: `capital_card`, `roa_card`
- `roe_card` отсутствует в новом endpoint

**Где возникает:**
- Backend: view `config.kpis_view` не содержит `roe_card` для `layout_id = "main_dashboard"`
- Или фильтрация в view исключает `roe_card`

**Влияние на Frontend:**
- Frontend корректно обрабатывает ответ (массив из 2 элементов)
- UI отображает только те KPI, которые приходят с backend
- Проблема не в Frontend, а в Backend (view или фильтрация)

## Рекомендации

### Для Backend:
1. ⚠️ **Добавить `roe_card` в view:**
   - Проверить, почему `roe_card` отсутствует в `config.kpis_view`
   - Убедиться, что `roe_card` привязан к `layout_id = "main_dashboard"` в `config.layout_component_mapping`
   - После добавления новый endpoint должен возвращать 3 элемента

### Для Frontend:
1. ✅ **Frontend готов к использованию нового endpoint**
2. ✅ **Код корректно обрабатывает ответ**
3. ⏸️ **Ожидает исправления Backend** (добавления `roe_card`)

## Файлы

### Проверенные файлы:
- ✅ `src/lib/api.ts` - функция `fetchAllKPIs` использует новый endpoint
- ✅ `src/hooks/useAPI.ts` - hook `useAllKPIs` использует `fetchAllKPIs`
- ✅ `src/components/KPICard.tsx` - использует данные из `useAllKPIs`
- ✅ `src/pages/DynamicDashboard.tsx` - использует `useAllKPIs` для отображения KPI

### Созданные файлы:
- ✅ `e2e/kpis-data-endpoint.spec.ts` - тесты для сравнения endpoint'ов
- ✅ `AGENT_PLAN_KPIS_DATA_QA_REPORT.md` - первоначальный отчет
- ✅ `AGENT_PLAN_KPIS_DATA_QA_REPORT_UPDATE.md` - обновление после первой проверки
- ✅ `AGENT_PLAN_KPIS_DATA_QA_REPORT_FINAL.md` - финальный отчет
- ✅ `AGENT_PLAN_KPIS_DATA_QA_COMPARISON.md` - детальное сравнение значений
- ✅ `AGENT_PLAN_KPIS_DATA_QA_FINAL_REPORT.md` - финальный отчет с проверкой Frontend

## Заключение

✅ **Frontend успешно перешел на использование нового endpoint `/api/data?query_id=kpis`!**
✅ **Код корректно обрабатывает ответ и преобразует формат данных.**
✅ **Значения для существующих KPI (`capital_card`, `roa_card`) полностью совпадают.**
⚠️ **Отсутствует `roe_card` в новом endpoint (проблема Backend, не Frontend).**

**Следующие шаги:**
1. Backend должен добавить `roe_card` в view или проверить фильтрацию
2. После добавления `roe_card` новый endpoint будет полностью идентичен старому
3. Frontend уже готов и работает корректно с новым endpoint
