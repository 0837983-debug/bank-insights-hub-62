# Контекст задачи: SQL Builder по JSON-конфигу

## Цель
Сделать builder, который принимает JSON-конфиг с описанием запроса
(schema/table/select/filters/group/order/limit/offset/params)
и возвращает готовый параметризованный SQL + массив параметров.

## Ограничения
- Без JOIN (только одна таблица).
- Без raw SQL выражений.
- WHERE без вложенных групп (один уровень AND/OR).
- Именованные параметры в конфиге, в SQL — позиционные `$1..$n`.

## Пример запроса (должен поддерживаться)
SELECT
  SUM(CASE WHEN period_date = $1 THEN value END) AS value,
  SUM(CASE WHEN period_date = $2 THEN value END) AS ppValue,
  SUM(CASE WHEN period_date = $3 THEN value END) AS pyValue,
  class,
  section,
  item,
  sub_item
FROM mart.balance
WHERE class = 'assets'
  AND period_date IN ($1, $2, $3)
GROUP BY class, section, item, sub_item
ORDER BY class, section, item, sub_item;

## Требования безопасности
- Защита от SQL-инъекций.
- Все значения — параметризованные.
- Идентификаторы проверяются на допустимый формат.
- Никаких raw-выражений в select/where/group/order.

## Валидация
- Типы данных на уровне конфига (date/number/string/bool).
- Простые ошибки: "invalid config" без детализации.

## Ожидаемый результат
Библиотека/сервис в backend, который:
- принимает конфиг;
- валидирует;
- строит SQL + params;
- готов к интеграции в API.
