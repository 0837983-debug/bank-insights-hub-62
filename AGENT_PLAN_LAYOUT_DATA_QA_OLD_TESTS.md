# Отчет: Проверка старых тестов фронта для layout

**Дата:** 2026-01-20

## Статус старых тестов

### Тесты, использующие `/api/layout` (старый endpoint):

1. **`e2e/layout-data-source-key.spec.ts`** - проверяет `data_source_key` в layout
2. **`e2e/button-components.spec.ts`** - проверяет кнопки и отсутствие `groupableFields`
3. **`e2e/header-component.spec.ts`** - проверяет header компонент
4. **`e2e/step8-header-top-level.spec.ts`** - проверяет header как top-level элемент
5. **`e2e/api.integration.spec.ts`** - интеграционные тесты API
6. **`e2e/security.spec.ts`** - тесты безопасности

### Проверка совместимости

#### Старый endpoint `/api/layout` ✅ Работает
- ✅ Возвращает формат `{ formats, header, sections }`
- ✅ Форматы присутствуют: `currency_rub`, `number`, `percent`
- ✅ Header присутствует как top-level элемент
- ✅ Секции присутствуют: `section_balance`, `section_financial_results`
- ✅ Компоненты содержат `dataSourceKey`

#### Frontend использует новый endpoint `/api/data` ✅
- ✅ Функция `fetchLayout` в `src/lib/api.ts` использует `/api/data?query_id=layout`
- ✅ Преобразует новый формат `{ sections: [...] }` в старый формат `{ formats, header, sections }`
- ✅ Обратная совместимость сохранена

## Вывод

✅ **Старые тесты актуальны и должны работать:**
- Старый endpoint `/api/layout` все еще работает (через `buildLayoutFromDB`)
- Frontend использует новый endpoint, но преобразует данные в старый формат
- Тесты проверяют структуру данных, которая остается неизменной

⚠️ **Примечание:**
- Тесты не запускались из-за отсутствия браузеров Playwright
- Но логика тестов актуальна, так как они проверяют структуру данных, которая не изменилась
- Frontend преобразует новый формат в старый, поэтому тесты должны работать

## Рекомендации

1. **Старые тесты можно оставить как есть** - они проверяют структуру данных, которая не изменилась
2. **Новые тесты** (`e2e/layout-data-endpoint.spec.ts`) проверяют новый endpoint напрямую
3. **При запуске тестов** нужно установить браузеры Playwright: `npx playwright install`
