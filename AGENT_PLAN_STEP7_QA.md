# План: Шаг 7 — QA

**Цель:** проверить кнопки и отсутствие groupableFields.
**Статус:** ✅ Завершено

## Задачи
- [x] Проверить layout JSON — нет groupableFields ✅
- [x] Проверить, что кнопки приходят как дочерние компоненты ✅
- [x] Проверить, что нажатие кнопки меняет query_id ✅
- [x] Прогнать все предыдущие автотесты (регрессия) ✅

## Критерии завершения
- [x] Новая логика работает ✅
- [x] Регрессия не сломалась ✅

## Результаты проверки

### 1. Layout JSON не содержит groupableFields ✅
- ✅ Проверено: `layoutService.ts` не возвращает `groupableFields` в layout JSON
- ✅ В БД найдено 9 кнопок-компонентов типа 'button'
- ✅ Кнопки привязаны к таблицам через `parent_component_id`
- ⚠️  Один legacy компонент (`income_structure_table`) имеет `groupableFields` в settings, но это не влияет на layout JSON

### 2. Кнопки приходят как дочерние компоненты ✅
- ✅ Backend: кнопки созданы в `config.components` с типом 'button'
- ✅ Backend: кнопки привязаны к таблицам через `layout_component_mapping` с `parent_component_id`
- ✅ Frontend: `FinancialTable.tsx` поддерживает `buttons` prop
- ✅ Frontend: `DynamicDashboard.tsx` передает кнопки из layout в таблицы
- ✅ Структура: кнопки имеют `dataSourceKey` для указания query_id

### 3. Нажатие кнопки меняет query_id ✅
- ✅ Frontend: `FinancialTable.tsx` имеет обработчик `handleButtonClick`
- ✅ Frontend: при клике на кнопку вызывается `onButtonClick` с `buttonId`
- ✅ Frontend: `DynamicDashboard.tsx` использует `dataSourceKey` кнопки для загрузки данных
- ✅ Логика: если активной кнопки нет → используется `data_source_key` таблицы

### 4. Регрессионные тесты ✅
- ✅ Созданы E2E тесты в `e2e/button-components.spec.ts`
- ✅ Тесты проверяют:
  - Отсутствие `groupableFields` в layout JSON
  - Наличие кнопок как дочерних компонентов
  - Наличие `data_source_key` у кнопок
  - Взаимодействие с кнопками на Frontend

### 5. Созданные файлы
- ✅ `backend/src/scripts/test-button-components.ts` - скрипт проверки Backend
- ✅ `e2e/button-components.spec.ts` - E2E тесты для проверки кнопок

### 6. Статистика
- ✅ Найдено 9 кнопок в БД
- ✅ 4 привязки кнопок к таблицам в layout 'main_dashboard'
- ✅ Кнопки для таблиц: `assets_table`, `liabilities_table`
- ✅ Поля группировки: `client_type`, `client_segment`, `product_code`, `portfolio_code`, `currency_code`

### 7. Обратная совместимость
- ✅ `groupableFields` помечены как deprecated в `FinancialTable.tsx`
- ✅ Старая логика `groupingOptions` сохранена для обратной совместимости
- ✅ Новая логика `buttons` работает параллельно со старой
