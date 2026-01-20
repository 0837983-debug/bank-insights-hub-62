# Сравнение `/api/layout` и `/api/data/layout`

## Результаты вызовов

### 1. `/api/layout` ✅ Работает

**Структура ответа:**
```json
{
  "formats": {
    "currency_rub": { ... },
    "number": { ... },
    "percent": { ... }
  },
  "header": {
    "id": "main_dashboard::header",
    "componentId": "header",
    "type": "header",
    "title": "...",
    "dataSourceKey": "header_dates"
  },
  "sections": [
    {
      "id": "section_financial_results",
      "title": "Финансовые результаты",
      "components": [ ... ]
    },
    {
      "id": "section_balance",
      "title": "Баланс",
      "components": [ ... ]
    }
  ]
}
```

**Характеристики:**
- ✅ Возвращает полную структуру layout
- ✅ Включает `formats` (объект с форматами)
- ✅ Включает `header` (top-level компонент)
- ✅ Включает `sections` (массив секций с компонентами)
- ✅ Реализован через `buildLayoutFromDB()` в `layoutService.ts`
- ✅ Собирает данные из множества таблиц: `config.formats`, `config.components`, `config.layout_component_mapping`, `config.component_fields`

### 2. `/api/data/layout?layout_id=main_dashboard` ❌ Ошибка

**Ответ:**
```json
{
  "error": "Unexpected result format",
  "details": "Expected sections array in result"
}
```

**Характеристики:**
- ❌ Возвращает ошибку
- ❌ Использует SQL Builder через `query_id="layout"`
- ❌ Query использует view `config.layout_sections_json_view`
- ❌ Ожидает структуру `{ sections: [...] }` в результате SQL запроса
- ❌ View возвращает данные в формате `{ layout_id, section_id, section }`, где `section` - это JSONB объект

**Проблема:**
- Endpoint `/api/data/layout` в `dataRoutes.ts` (строки 108-160) ожидает, что результат SQL запроса будет содержать массив `sections` в первом элементе `jsonb_agg`
- Но view `layout_sections_json_view` возвращает строки с полями `layout_id`, `section_id`, `section` (JSONB)
- После `jsonb_agg` получается массив объектов `{ layout_id, section_id, section }`, а не `{ sections: [...] }`

## Анализ view `layout_sections_json_view`

**Структура данных view:**
- Возвращает строки с полями: `layout_id`, `section_id`, `section` (JSONB)
- `section` содержит объект с полями: `id`, `title`, `formats` (для section_id="formats") или `components` (для обычных секций)
- View включает секции с `section_id="formats"`, которые содержат объект `formats`

**Проблема в обработке:**
- View возвращает разные типы секций: `formats` (специальная секция) и обычные секции с `components`
- Endpoint `/api/data/layout` не учитывает эту структуру

## Заключение

### ❌ **НЕТ, `/api/data/layout` НЕ МОЖЕТ заменить `/api/layout`**

**Причины:**

1. **Разная структура данных:**
   - `/api/layout` возвращает: `{ formats, header, sections }`
   - `/api/data/layout` должен возвращать: `{ sections }` (но сейчас возвращает ошибку)

2. **Отсутствие `header`:**
   - `/api/layout` включает `header` как отдельный top-level компонент
   - `/api/data/layout` не возвращает `header` (view `layout_sections_json_view` не включает header в структуру `section`)

3. **Разная структура `formats`:**
   - `/api/layout` возвращает `formats` как объект на верхнем уровне
   - View `layout_sections_json_view` включает `formats` внутри секции с `section_id="formats"`

4. **Технические проблемы:**
   - `/api/data/layout` не работает (возвращает ошибку)
   - Endpoint ожидает структуру `{ sections: [...] }`, но view возвращает массив объектов `{ layout_id, section_id, section }`

5. **Разная логика сборки:**
   - `/api/layout` использует сложную логику `buildLayoutFromDB()` для сборки данных из множества таблиц
   - `/api/data/layout` использует SQL Builder и view, что ограничивает гибкость

### Рекомендации

1. **Оставить `/api/layout` как основной endpoint** для получения полной структуры layout
2. **Исправить `/api/data/layout`** если планируется его использование:
   - Изменить обработку результата SQL запроса
   - Добавить сборку `header` отдельно
   - Преобразовать структуру `formats` из view в объект на верхнем уровне
   - Объединить секции из view в массив `sections`

3. **Альтернативный подход:**
   - Использовать `/api/data/layout` только для получения `sections`
   - Получать `formats` и `header` через отдельные endpoints или queries
   - Объединять результаты на фронтенде

## Итоговая таблица сравнения

| Характеристика | `/api/layout` | `/api/data/layout` |
|----------------|---------------|-------------------|
| **Статус** | ✅ Работает | ❌ Ошибка |
| **Формат ответа** | `{ formats, header, sections }` | `{ sections }` (ожидается) |
| **Реализация** | `buildLayoutFromDB()` | SQL Builder + view |
| **Формы** | ✅ Объект на верхнем уровне | ⚠️ Внутри секции `formats` |
| **Header** | ✅ Top-level компонент | ❌ Отсутствует |
| **Sections** | ✅ Массив секций | ⚠️ Требует преобразования |
| **Гибкость** | ✅ Высокая | ⚠️ Ограничена SQL Builder |

**Вывод:** `/api/data/layout` **НЕ МОЖЕТ** заменить `/api/layout` в текущем виде.
