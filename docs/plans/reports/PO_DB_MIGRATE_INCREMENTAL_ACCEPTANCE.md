# Product Owner Acceptance: Инкрементальные миграции (migrate / seed / reset)

**Дата**: 2026-06-30  
**План**: `docs/plans/current/DB_MIGRATE_INCREMENTAL.md` — Этап 4  
**QA-отчёт**: `docs/plans/reports/DB_MIGRATE_INCREMENTAL_QA.md`

## Вердикт
ACCEPTED

## Проверенные сценарии
- [x] Dev reset (`db-bootstrap` / `npm run db:reset`) не ломает дашборд на `http://localhost:8080`
- [x] После bootstrap: layout (4 секции), header_dates (p1/p2/p3), KPI (6 карточек), таблицы balance и fin_results с данными
- [x] Docker bootstrap завершается успешно (`Verified strict header_dates contract`, exit 0)
- [x] Документация для заказчика: bootstrap, migrate, seed, reset описаны и разделены
- [x] QA-регресс: docker-smoke 11/11, идемпотентность `db:migrate` × 2

## Что хорошо
- **Bootstrap для первого демо** — в `customer-docker-run.md` (A.4) пошагово: команда, что происходит внутри (DROP → миграции → 3 balance + 3 fin_results), предупреждение о деструктивности, критерий успеха (`Verified strict header_dates contract`). Заказчик может пройти путь без подсказок разработчика.
- **Чеклист перед демо** (A.9) — готовый copy-paste блок из 4 команд до открытия дашборда.
- **Prod-обновление без сброса данных** — в `customer-docker-run.md` (B.5) явно: `db-migrate` для новых SQL, bootstrap не использовать на prod с реальными данными.
- **Техническая документация** — `docker.md` разделяет reset (§3), migrate (§3a), seed (§3b) с таблицей «что когда использовать» и troubleshooting (пустой дашборд → нужен bootstrap).
- **Дашборд после reset** — проверено live: bootstrap ~21 с, затем API и frontend OK (4 секции, 3 периода, KPI и таблицы с данными).

## Что не устраивает

### Проблема 1: Команда `--profile migrate` без запущенного postgres
**Где:** `docs/guides/docker.md` §3a  
**Почему мешает пользователю:** при копировании команды `docker compose ... --profile migrate run --rm db-migrate` без одновременного `--profile full` (или без уже поднятого стека) compose падает с ошибкой про undefined service `postgres` — неочевидно для заказчика.  
**Ожидаемое поведение:** команда работает после стандартного `up -d` или в тексте явно указано, что postgres должен быть запущен.  
**Фактическое поведение:** работает альтернатива `run --rm --no-deps backend npm run db:migrate` (тоже задокументирована); основной путь заказчика (bootstrap + prod migrate через prod compose) не затронут.  
**Критичность:** minor

## Требования к доработке
- [ ] *(опционально, не блокирует приёмку)* В `docker.md` §3a добавить примечание: для dev нужен запущенный postgres (`COMPOSE_PROFILES=full` + `up -d`) или флаг `--profile full` вместе с `migrate`

## Итог
Задача решает бизнес-цель: dev-reset по-прежнему поднимает полный дашборд, prod-safe накат миграций документирован, три команды (migrate / seed / reset) разделены и понятны. Bootstrap проверен end-to-end на живом Docker-стеке. Незначительный пробел в формулировке dev-команды `db-migrate` не блокирует сценарии заказчика. **ACCEPTED.**
