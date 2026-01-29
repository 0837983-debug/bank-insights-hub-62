---
title: Безопасность
---

# Безопасность

## SQL Injection Protection

Все запросы используют параметризованные запросы:

```typescript
await pool.query(
  'SELECT * FROM table WHERE id = $1',
  [userId]
);
```

## Input Validation

Валидация на уровне routes:
- Проверка типов параметров
- Валидация форматов (даты, IDs)
- Ограничение размеров

## Error Handling

Безопасная обработка ошибок:
- Не утечка stack traces
- Стандартизированные сообщения
- Логирование для отладки
