# План: Шаг 8 — Frontend — Header как top‑level элемент

**Цель:** отрисовывать header над секциями на основе layout.header.
**Статус:** ✅ Завершено

## Задачи
- [x] В `DynamicDashboard`:
  - Использовать `layout.header` вместо поиска header внутри `sections`.
  - Рендерить `<Header />` над секциями.
- [x] Брать `title/label` из layout (пока только отображение текста).
- [x] Убедиться, что даты (getData) продолжают загружаться через `dataSourceKey`.

## Файлы для изменения
- `src/pages/DynamicDashboard.tsx`
- `src/components/Header.tsx` (если потребуется принимать props)

## Критерии завершения
- [x] Header отображается над секциями.
- [x] Даты продолжают загружаться.
- [x] Таблицы работают как раньше.
