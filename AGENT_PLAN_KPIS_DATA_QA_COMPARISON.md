# Детальное сравнение: KPI через `/api/data`

**Дата:** 2026-01-20
**Статус:** ✅ Значения совпадают, но отсутствует `roe_card`

## Результаты детального сравнения

### 1. Структура данных ✅

**Полностью совпадает:**
- ✅ Поля идентичны: `id`, `periodDate`, `value`, `previousValue`, `ytdValue`, `ppChange`, `ppChangeAbsolute`, `ytdChange`, `ytdChangeAbsolute`
- ✅ Порядок полей совпадает
- ✅ Типы данных совпадают

### 2. Сравнение значений

#### `capital_card` ✅ **ПОЛНОСТЬЮ СОВПАДАЕТ**
```json
Старый endpoint:
{
  "id": "capital_card",
  "value": 11200000000,
  "previousValue": 10950000000,
  "ytdValue": 8200000000,
  "ppChange": 0.022799999999999997,
  "ppChangeAbsolute": 250000000,
  "ytdChange": 0.36590000000000006,
  "ytdChangeAbsolute": 3000000000
}

Новый endpoint:
{
  "id": "capital_card",
  "value": 11200000000,          ✅ СОВПАДАЕТ
  "previousValue": 10950000000,  ✅ СОВПАДАЕТ
  "ytdValue": 8200000000,        ✅ СОВПАДАЕТ
  "ppChange": 0.022799999999999997, ✅ СОВПАДАЕТ
  "ppChangeAbsolute": 250000000, ✅ СОВПАДАЕТ
  "ytdChange": 0.36590000000000006, ✅ СОВПАДАЕТ
  "ytdChangeAbsolute": 3000000000 ✅ СОВПАДАЕТ
}
```

#### `roa_card` ✅ **ПОЛНОСТЬЮ СОВПАДАЕТ**
```json
Старый endpoint:
{
  "id": "roa_card",
  "value": 0.041,
  "previousValue": 0.03922,
  "ytdValue": 0.03876,
  "ppChange": 0.0454,
  "ppChangeAbsolute": 0.0017800000000000038,
  "ytdChange": 0.057800000000000004,
  "ytdChangeAbsolute": 0.002239999999999999
}

Новый endpoint:
{
  "id": "roa_card",
  "value": 0.041,                ✅ СОВПАДАЕТ
  "previousValue": 0.03922,      ✅ СОВПАДАЕТ
  "ytdValue": 0.03876,           ✅ СОВПАДАЕТ
  "ppChange": 0.0454,            ✅ СОВПАДАЕТ
  "ppChangeAbsolute": 0.0017800000000000038, ✅ СОВПАДАЕТ
  "ytdChange": 0.057800000000000004, ✅ СОВПАДАЕТ
  "ytdChangeAbsolute": 0.002239999999999999 ✅ СОВПАДАЕТ
}
```

#### `roe_card` ❌ **ОТСУТСТВУЕТ В НОВОМ ENDPOINT**
```json
Старый endpoint:
{
  "id": "roe_card",
  "periodDate": "2025-12-31",
  "value": 0.22,
  "previousValue": 0.22,
  "ytdValue": 0.18,
  "ppChange": 0,
  "ppChangeAbsolute": 0,
  "ytdChange": 0.22219999999999998,
  "ytdChangeAbsolute": 0.04000000000000001
}

Новый endpoint:
❌ Отсутствует
```

### 3. Количество элементов

- **Старый endpoint:** 3 элемента (`capital_card`, `roa_card`, `roe_card`)
- **Новый endpoint:** 2 элемента (`capital_card`, `roa_card`)
- **Отсутствует:** `roe_card`

## Итоговая таблица сравнения

| KPI ID | Старый endpoint | Новый endpoint | Статус |
|--------|----------------|----------------|--------|
| `capital_card` | ✅ Есть | ✅ Есть | ✅ **Значения полностью совпадают** |
| `roa_card` | ✅ Есть | ✅ Есть | ✅ **Значения полностью совпадают** |
| `roe_card` | ✅ Есть | ❌ Отсутствует | ❌ **Нужно добавить** |

## Выводы

### ✅ Что работает отлично:
1. **Структура данных** полностью совпадает
2. **Значения для `capital_card`** полностью совпадают (все поля)
3. **Значения для `roa_card`** полностью совпадают (все поля)
4. **Endpoint работает без ошибок**

### ⚠️ Что нужно исправить:
1. **Отсутствует `roe_card`** в новом endpoint
   - Возможные причины:
     - `roe_card` отсутствует в `config.kpis_view` для `layout_id = "main_dashboard"`
     - Фильтрация в view исключает `roe_card`
     - Проблема с join в view `config.kpis_view`

## Рекомендации для Backend

1. **Проверить наличие `roe_card` в view:**
   ```sql
   SELECT * FROM config.kpis_view 
   WHERE layout_id = 'main_dashboard' 
     AND component_id = 'roe_card';
   ```

2. **Проверить привязку `roe_card` к layout:**
   ```sql
   SELECT * FROM config.layout_component_mapping 
   WHERE layout_id = 'main_dashboard' 
     AND component_id = 'roe_card';
   ```

3. **После добавления `roe_card`:**
   - Новый endpoint должен возвращать 3 элемента
   - Все значения должны совпадать со старым endpoint

## Заключение

✅ **Endpoint работает корректно!**
✅ **Значения для существующих KPI полностью совпадают!**
⚠️ **Отсутствует `roe_card` - нужно добавить в view или проверить фильтрацию.**

После добавления `roe_card` новый endpoint будет полностью идентичен старому.
