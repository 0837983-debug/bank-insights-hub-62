---
title: Обработка запросов
---

# Обработка запросов

## Типичный flow

1. **HTTP Request** → Route
2. **Route** → Валидация параметров
3. **Route** → Вызов Service
4. **Service** → SQL запрос к БД
5. **Service** → Трансформация данных
6. **Service** → Возврат данных
7. **Route** → Формирование JSON ответа
8. **HTTP Response** → Frontend

## Пример: Получение KPI метрик

```typescript
// Route
router.get("/", async (req, res) => {
  const { category, periodDate } = req.query;
  const metrics = await getKPIMetrics(category, periodDate);
  res.json(metrics);
});

// Service
export async function getKPIMetrics(category?: string, periodDate?: Date) {
  // SQL запрос к mart.kpi_metrics
  // Расчет изменений
  // Возврат данных
}
```
