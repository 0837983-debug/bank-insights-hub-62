# QA Report: BALANCE_SIGN_VALIDATION (Этап 2)

Дата: 2026-05-23  
Финальный ретест после migration `062` и обновления refresh в `ingestionService`  
Статус: ✅ Resolved

## Объём проверки

Проверены пункты Этапа 2 из `docs/plans/current/BALANCE_SIGN_VALIDATION.md`:
1. Валидация порога 90% знака на тестовых файлах (2 negative + 1 success).
2. Проверка инверсии знака АКТИВОВ в `mart.balance`.
3. Проверка доступности и корректности ROA/ROE без ручного `REFRESH`.

## Результаты финального ретеста

### 1) Валидация порога 90% — ✅ Passed

Запуск через `POST /api/upload` (`targetTable=balance`):

- `balance_invalid_assets_ratio_20260523_120001Z.csv` -> `HTTP 400`, `uploadId=18`  
  Ошибка: для АКТИВОВ доля отрицательных `66.7% (2 из 3)`, требуется минимум `90.0%`.
- `balance_invalid_liabilities_ratio_20260523_120001Z.csv` -> `HTTP 400`, `uploadId=19`  
  Ошибка: для ПАССИВОВ доля положительных `50.0% (1 из 2)`, требуется минимум `90.0%`.
- `balance_valid_signs_ru_20260523_120023Z.csv` -> `HTTP 200`, `uploadId=20`, загрузка `completed`.

Вывод: оба negative кейса корректно отклоняются, success кейс проходит.

### 2) Инверсия АКТИВОВ в `mart.balance` — ✅ Passed

Проверка после успешных загрузок (`uploadId IN (20, 21)`):

- `raw_class='АКТИВЫ'`, `tech_class='АКТИВЫ'`
- значения в `mart.balance.value` положительные:
  - `uploadId=20`: диапазон `3_500_000_000 .. 5_000_000_000`
  - `uploadId=21`: диапазон `500 .. 900`

Вывод: инверсия АКТИВОВ в mart применяется корректно.

### 3) ROA/ROE без ручного REFRESH — ✅ Passed

#### 3.1 Формула ROA в live БД — ✅ Passed

- Проверка `pg_matviews.definition` для `mart.mv_kpi_derived`: множитель `* -1` отсутствует (`no_*_-1`).

#### 3.2 Авто-обновление `mv_kpi_derived` после upload pipeline — ✅ Passed

Контрольный ретест (тот же `period_date=2025-02-01`) без ручного `REFRESH`:

- До upload: `ROA=0.24`, `ROE=0.96`.
- Upload изменённого probe-файла (`uploadId=22`, `HTTP 200`) с увеличенными АКТИВАМИ.
- Сразу после upload:
  - `ASSETS=4000`
  - `ROA=0.12`
  - `ROE=0.96`
- Расчёт совпадает с формулой:
  - `ROA = NET_PROFIT(40) / ASSETS(4000) * 12 = 0.12`
  - `ROE = NET_PROFIT(40) / CAPITAL(500) * 12 = 0.96`

Вывод: `mv_kpi_derived` обновляется автоматически в upload pipeline, ручной `REFRESH` не требуется.

## Финальный вывод

Блокеры сняты. Этап 2 подтверждён как выполненный:
- sign validation 90% работает по требованиям,
- инверсия знака АКТИВОВ в `mart.balance` работает,
- ROA/ROE доступны и корректны сразу после upload без ручного `REFRESH`.
