---
title: Сравнение Layout API
description: Сравнение структуры Layout API с мокапом и выявление различий
related:
  - /api/layout-api
---

# Сравнение структуры Layout API с мокапом

## Структура мокапа (`layout.json`)

```json
{
  "formats": { ... },
  "filters": [ ... ],  // ⚠️ ОТСУТСТВУЕТ в buildLayoutFromDB
  "sections": [ ... ]
}
```

## Структура из buildLayoutFromDB

```json
{
  "formats": { ... },
  "sections": [ ... ]
  // filters отсутствует
}
```

---

## Основные различия

### 1. ❌ Отсутствует поле `filters`

**Мокап:**
```json
"filters": [
  {
    "group": "period",
    "items": [
      {
        "id": "dateFrom",
        "label": "Дата начала",
        "type": "date"
      },
      {
        "id": "dateTo",
        "label": "Дата окончания",
        "type": "date"
      }
    ]
  },
  {
    "group": "region",
    "items": [
      {
        "id": "region",
        "label": "Регион",
        "type": "select",
        "params": {
          "options": [...]
        }
      }
    ]
  }
]
```

**buildLayoutFromDB:** 
- Поле `filters` не возвращается
- В коде есть комментарий: `// Filters will be projected into filters[] later if needed; skip adding as component`
- Но логика построения filters не реализована

---

### 2. ✅ У таблиц есть кнопки вместо `groupableFields`

**Мокап (устаревший):**
```json
{
  "id": "income_structure_table",
  "type": "table",
  "title": "Структура доходов",
  "dataSourceKey": "income_structure",
  "groupableFields": ["product_line", "region"],  // ⚠️ УСТАРЕЛО
  "columns": [...]
}
```

**buildLayoutFromDB (актуально):**
- Поле `groupableFields` удалено (устарело)
- Вместо него используется массив `buttons` с кнопками-компонентами
- Каждая кнопка имеет `settings.groupBy` для группировки данных
```json
{
  "id": "income_structure_table",
  "type": "table",
  "title": "Структура доходов",
  "dataSourceKey": "income_structure",
  "buttons": [
    {
      "id": "button_income_structure_product_line",
      "type": "button",
      "title": "Продуктовая линейка",
      "dataSourceKey": "income_structure",
      "settings": {
        "fieldId": "product_line",
        "groupBy": "product_line"
      }
    },
    {
      "id": "button_income_structure_region",
      "type": "button",
      "title": "Регион",
      "dataSourceKey": "income_structure",
      "settings": {
        "fieldId": "region",
        "groupBy": "region"
      }
    }
  ],
  "columns": [...]
}
```

---

### 3. ❌ У колонок таблиц отсутствуют поля `isDimension` и `isMeasure`

**Мокап:**
```json
{
  "id": "name",
  "label": "Наименование",
  "type": "text",
  "isDimension": true  // ⚠️ ОТСУТСТВУЕТ
},
{
  "id": "value",
  "label": "Значение",
  "type": "number",
  "isMeasure": true,  // ⚠️ ОТСУТСТВУЕТ
  "format": {
    "value": "currency_rub"
  }
}
```

**buildLayoutFromDB:**
- Поля `isDimension` и `isMeasure` не добавляются к колонкам
- Возвращается только: `id`, `label`, `type`, `format`

---

### 4. ❌ У карточек отсутствует поле `compactDisplay`

**Мокап:**
```json
{
  "id": "capital_card",
  "type": "card",
  "title": "Капитал",
  "tooltip": "...",
  "icon": "Landmark",
  "dataSourceKey": "capital",
  "format": {...},
  "compactDisplay": false  // ⚠️ ОТСУТСТВУЕТ
}
```

**buildLayoutFromDB:**
- Поле `compactDisplay` не добавляется к карточкам

---

## Что совпадает ✅

1. **Формат `formats`** - структура совпадает
2. **Структура `sections`** - базовая структура совпадает
3. **Компоненты `card`** - основные поля совпадают (id, type, title, tooltip, icon, dataSourceKey, format)
4. **Компоненты `table`** - основные поля совпадают (id, type, title, dataSourceKey, columns)
5. **Формат колонок** - структура `format: { value: "..." }` совпадает

---

## Рекомендации

1. **Добавить поддержку `filters`** - реализовать логику построения filters из БД
2. ✅ **Кнопки для группировки** - реализовано через кнопки-компоненты (заменяют `groupableFields`)
3. **Добавить `isDimension` и `isMeasure` для колонок** - получить из БД (возможно из `field_type` или отдельного поля)
4. **Добавить `compactDisplay` для карточек** - получить из БД или использовать значение по умолчанию
