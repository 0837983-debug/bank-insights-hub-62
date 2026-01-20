# Обновление отчета: QA — KPI через `/api/data`

**Дата:** 2026-01-20
**Статус:** ❌ Ошибка все еще присутствует

## Проверка после исправления Backend

### Результаты проверки

#### 1. Старый endpoint `/api/kpis` ✅
- ✅ Работает корректно
- ✅ Возвращает массив из 3 элементов
- ✅ Структура данных корректна

#### 2. Новый endpoint `/api/data?query_id=kpis` ❌
- ❌ **Ошибка все еще присутствует**
- ❌ Возвращает ошибку 500: `SQL execution error`
- ❌ Детали ошибки: `column "kpis_view.component_id" must appear in the GROUP BY clause or be used in an aggregate function`

### Детали ошибки

**Запрос:**
```bash
GET /api/data?query_id=kpis&component_Id=kpis&parametrs={"layout_id":"main_dashboard","p1":"2025-12-31","p2":"2025-11-30","p3":"2024-12-31"}
```

**Ответ:**
```json
{
  "error": "SQL execution error",
  "details": "column \"kpis_view.component_id\" must appear in the GROUP BY clause or be used in an aggregate function"
}
```

### Возможные причины

1. **Backend не перезапустил сервер** после исправления миграции
2. **Миграция не применена** к базе данных
3. **Исправление не полностью решает проблему** - возможно, нужно исправить SQL Builder, а не только конфиг

### Рекомендации для Backend

1. **Проверить, применена ли миграция:**
   ```sql
   SELECT * FROM config.component_queries WHERE query_id = 'kpis';
   ```

2. **Проверить сгенерированный SQL:**
   - В логах backend должен быть сгенерированный SQL для kpis
   - Проверить, правильно ли формируется GROUP BY

3. **Перезапустить backend сервер** после применения миграции

4. **Проверить SQL Builder:**
   - Возможно, проблема в том, как SQL Builder обрабатывает поля с алиасами в GROUP BY
   - Нужно убедиться, что GROUP BY использует исходное имя поля из view, а не алиас

### Следующие шаги

1. Backend должен:
   - Убедиться, что миграция применена
   - Перезапустить сервер
   - Проверить сгенерированный SQL в логах
   - Если проблема в SQL Builder - исправить его

2. После исправления:
   - Повторить проверку endpoint
   - Сравнить ответы старого и нового endpoint
   - Обновить отчет

## Текущий статус

- ❌ Новый endpoint `/api/data?query_id=kpis` **не работает** (SQL ошибка)
- ✅ Старый endpoint `/api/kpis` **работает корректно**
- ⏸️ Сравнение ответов **невозможно** из-за ошибки
- ⏸️ Frontend **не может перейти** на новый endpoint
