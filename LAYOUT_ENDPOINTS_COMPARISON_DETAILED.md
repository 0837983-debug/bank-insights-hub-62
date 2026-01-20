# Детальное сравнение `/api/layout` и `/api/data?query_id=layout`

**Дата:** 2026-01-20

## Команды для вызова

### Новый endpoint (через /api/data)
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.'
```

### Старый endpoint (/api/layout)
```bash
curl -s "http://localhost:3001/api/layout" | jq '.'
```

---

## Ключевые различия

### 1. Структура верхнего уровня

| Характеристика | Новый endpoint (`/api/data`) | Старый endpoint (`/api/layout`) |
|----------------|------------------------------|----------------------------------|
| **Ключи верхнего уровня** | `sections` | `formats`, `header`, `sections` |
| **Количество секций** | 4 секции | 2 секции |
| **Форматы** | Внутри секции `id="formats"` | На верхнем уровне как объект |
| **Header** | Внутри секции `id="header"` | На верхнем уровне как объект |

### 2. Секции

#### Новый endpoint возвращает 4 секции:
1. `formats` - содержит объект `formats` с форматами
2. `header` - содержит компонент header в массиве `components`
3. `section_balance` - секция "Баланс" с 3 компонентами
4. `section_financial_results` - секция "Финансовые результаты" с 2 компонентами

#### Старый endpoint возвращает 2 секции:
1. `section_balance` - секция "Баланс" с 3 компонентами
2. `section_financial_results` - секция "Финансовые результаты" с 2 компонентами

### 3. Formats

#### Новый endpoint:
```json
{
  "sections": [
    {
      "id": "formats",
      "title": "Formats",
      "formats": {
        "currency_rub": {...},
        "number": {...},
        "percent": {...}
      }
    }
  ]
}
```

#### Старый endpoint:
```json
{
  "formats": {
    "currency_rub": {...},
    "number": {...},
    "percent": {...}
  }
}
```

**Различие:** В новом endpoint `formats` находится внутри секции, в старом - на верхнем уровне.

### 4. Header

#### Новый endpoint:
```json
{
  "sections": [
    {
      "id": "header",
      "title": "Компонент header для отображения дат периодов.",
      "components": [
        {
          "id": "main_dashboard::header::header",
          "componentId": "header",
          "type": "header",
          "title": "Компонент header для отображения дат периодов.",
          "dataSourceKey": "header_dates",
          "icon": null,
          "label": "Компонент header для отображения дат периодов.",
          "tooltip": null
        }
      ]
    }
  ]
}
```

#### Старый endpoint:
```json
{
  "header": {
    "id": "main_dashboard::header",
    "componentId": "header",
    "type": "header",
    "title": "Компонент header для отображения дат периодов.",
    "dataSourceKey": "header_dates"
  }
}
```

**Различия:**
- Новый: header внутри секции как компонент в массиве `components`
- Старый: header на верхнем уровне как отдельный объект
- Новый: содержит дополнительные поля (`icon`, `label`, `tooltip`)
- Новый: `id` имеет формат `main_dashboard::header::header` (3 части)
- Старый: `id` имеет формат `main_dashboard::header` (2 части)

### 5. Компоненты в секциях

**Одинаковые:** Компоненты в секциях `section_balance` и `section_financial_results` идентичны в обоих endpoints:
- `componentId`
- `type`
- `title`
- `dataSourceKey`
- Структура `columns`, `buttons`, `sub_columns` - идентична

---

## Итоговая таблица сравнения

| Элемент | Новый endpoint (`/api/data`) | Старый endpoint (`/api/layout`) |
|---------|------------------------------|----------------------------------|
| **Структура** | `{ sections: [...] }` | `{ formats: {...}, header: {...}, sections: [...] }` |
| **Форматы** | В секции `id="formats"` | На верхнем уровне |
| **Header** | В секции `id="header"` как компонент | На верхнем уровне |
| **Секции** | 4 (включая formats и header) | 2 (только контейнеры) |
| **Компоненты** | Идентичны | Идентичны |
| **Формат header.id** | `main_dashboard::header::header` | `main_dashboard::header` |
| **Дополнительные поля header** | `icon`, `label`, `tooltip` | Нет |

---

## Выводы

### ✅ Что одинаково:
1. Компоненты в секциях идентичны
2. Форматы содержат одинаковые данные
3. Структура компонентов (columns, buttons, sub_columns) идентична

### ⚠️ Что отличается:
1. **Структура верхнего уровня:**
   - Новый: все в `sections` (плоская структура)
   - Старый: `formats`, `header`, `sections` на верхнем уровне (иерархическая структура)

2. **Расположение formats и header:**
   - Новый: внутри секций
   - Старый: на верхнем уровне

3. **Количество секций:**
   - Новый: 4 секции (включая formats и header как секции)
   - Старый: 2 секции (только контейнеры)

4. **Формат header:**
   - Новый: header как компонент внутри секции
   - Старый: header как отдельный объект на верхнем уровне

---

## Рекомендации

### Для Frontend:
Если планируется переход на новый endpoint, необходимо:
1. Обновить логику парсинга: `formats` и `header` теперь внутри `sections`
2. Изменить доступ к `formats`: `response.sections.find(s => s.id === "formats").formats`
3. Изменить доступ к `header`: `response.sections.find(s => s.id === "header").components[0]`
4. Учесть, что `header.id` имеет другой формат (3 части вместо 2)

### Для Backend:
Если нужно унифицировать формат, можно:
1. Преобразовать ответ нового endpoint к формату старого (вынести `formats` и `header` на верхний уровень)
2. Или обновить старый endpoint, чтобы он возвращал такую же структуру, как новый

---

## Примеры использования

### Получить formats из нового endpoint:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections[] | select(.id == "formats") | .formats'
```

### Получить header из нового endpoint:
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections[] | select(.id == "header") | .components[0]'
```

### Получить только секции (без formats и header):
```bash
curl -s "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections[] | select(.id != "formats" and .id != "header")'
```
