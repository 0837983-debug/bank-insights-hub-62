# План выполнения: DB_SEED_VOLUME_FIX — единый путь `db:seed` в Docker

> **Создан**: 2026-06-08  
> **Статус**: ✅ Завершено  
> **Roadmap**: Блок C.0+ — доработка после `DB_MIGRATE_INCREMENTAL`  
> **Приоритет**: P1.5 (быстрый fix до `ADMIN_COMPONENT_LIBRARY`)  
> **Зависимости**: `DB_MIGRATE_INCREMENTAL` ✅

---

## Контекст

### Проблема

Документация рекомендует:

```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run db:seed
```

Но сервис `backend` **не монтирует** `./test-data`, в отличие от `db-bootstrap`. Внутри контейнера `DATASET_DIR` указывает на `/test-data/uploads`, файлов там нет → ошибка:

```
Dataset file not found: /test-data/uploads/capital_seed_2024-12.csv
```

Обходной путь с CLI `-v "/d/Work/.../test-data:..."` работает, но:
- зависит от абсолютного пути на машине разработчика;
- на Windows Git Bash `-v ./test-data` не работает;
- непригоден для заказчика и CI.

### Цель

**Один канонический путь** для seed в Docker — как у bootstrap/migrate:

```bash
docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed
```

Без ручных `-v`, без абсолютных путей. Путь `./test-data` задаётся **в compose-файле** (относительно корня проекта — работает на macOS/Linux/Windows).

### Разделение ролей (не путать с prod)

| Способ загрузки данных | Назначение |
|------------------------|------------|
| **`db-seed` / `db-bootstrap`** | Автоматизация dev/demo/CI из `test-data/uploads/` |
| **UI `/upload`** | Реальные данные заказчика; полная валидация (формат, даты, mapping) — **это prod-путь** |

Валидация в UI — **фича, не недостаток**. `db:seed` использует тот же Upload API, но без ручного выбора файлов.

### Файлы для изучения

- `docker-compose.dev.yml` — эталон: сервис `db-bootstrap` (volume + env)
- `docker-compose.prod.yml` — аналог для prod-like demo
- `backend/src/scripts/seed-local-db.ts`
- `docs/guides/docker.md`, `docs/guides/customer-docker-run.md`
- `docs/context/backend.md`
- `e2e/docker-smoke.spec.ts`

---

## Этап 1: Docker — сервис `db-seed` ✅

**Субагент**: `backend-agent`  
**Зависимости**: Нет  
**Статус**: ✅ Завершено

### Задачи

- [x] В `docker-compose.dev.yml` добавить сервис **`db-seed`** по образцу `db-bootstrap`:
  - `profiles: [seed]`
  - `command: ["npm", "run", "db:seed"]`
  - `volumes: ./test-data:/test-data:ro`
  - `environment`:
    - `DATASET_DIR: /test-data/uploads`
    - `BOOTSTRAP_USE_TEMP_BACKEND: "true"`
    - `BALANCE_DATASET_FILES`, `FIN_RESULTS_DATASET_FILES` из `${...}` (как у bootstrap)
    - DB_* переменные
  - `depends_on: postgres: condition: service_healthy`
- [x] Добавить профиль **`seed`** к сервису `postgres` (рядом с `bootstrap`), чтобы `COMPOSE_PROFILES=seed` поднимал postgres при необходимости
- [x] В `docker-compose.prod.yml` добавить аналогичный сервис **`db-seed`** (image/build как у `db-bootstrap`, те же volume/env)
- [x] **НЕ** добавлять mount `test-data` в long-running `backend` — единый путь только через `db-seed`
- [x] Обновить комментарии в шапке compose-файлов (dev + prod)
- [x] Обновить `docs/context/backend.md` — каноническая команда seed, убрать упоминание CLI `-v`

### Файлы для изменения

- `docker-compose.dev.yml`
- `docker-compose.prod.yml`
- `docs/context/backend.md`

### Критерии завершения

- [x] `docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed` — exit 0, 6 upload'ов, `Seed completed successfully`
- [x] Команда работает **без** `-v` и **без** абсолютных путей из корня репозитория
- [x] `docker compose -f docker-compose.prod.yml --profile seed run --rm db-seed` — та же логика (postgres должен быть доступен)
- [x] Long-running `backend` не получает лишний volume

### Инструкции субагенту

```
ПЕРЕД НАЧАЛОМ РАБОТЫ:
1. Прочитай контекст: docs/context/backend.md
2. Сверь db-bootstrap в docker-compose.dev.yml — db-seed должен повторять паттерн volume/env
3. Редактируй ТОЛЬКО файлы указанные в плане

⛔ ЗАПРЕЩЕНО:
- Редактировать services/ в backend
- Добавлять fallback-пути в seed-local-db.ts (compose — единственный источник DATASET_DIR для Docker)
- Оставлять в документации workaround с абсолютным -v
- Дублировать логику seed в новых скриптах
```

### 📋 Команда для Executor

```javascript
Task(
  subagent_type: "backend-agent",
  description: "Add db-seed Docker service",
  prompt: `
    Прочитай контекст: docs/context/backend.md
    Прочитай план: docs/plans/current/DB_SEED_VOLUME_FIX.md, раздел "Этап 1"

    Добавь сервис db-seed в docker-compose.dev.yml и docker-compose.prod.yml.
    Скопируй паттерн volume/env с db-bootstrap, command = npm run db:seed.
    Добавь profile seed к postgres в dev compose.

    Проверь:
    docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed

    Обнови docs/context/backend.md.
    Обнови статус этапа в плане на ✅.
  `
)
```

---

## Этап 2: Документация ✅

**Субагент**: `docs-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено

### Задачи

- [x] `docs/guides/docker.md`:
  - Заменить `run backend npm run db:seed` на `--profile seed run --rm db-seed`
  - Удалить workaround с `-v ./test-data` и абсолютными путями
  - Добавить таблицу: bootstrap vs migrate vs seed — когда что
  - Явно: **prod-данные → UI `/upload`**, seed — только dev/demo
- [x] `docs/guides/customer-docker-run.md`:
  - Секция «Только пересев CSV» с `db-seed`
  - Примечание Windows: compose-путь `./test-data` в YAML работает; CLI `-v ./test-data` — не использовать
- [x] При необходимости — краткая заметка в `docs/guides/local-db.md`

### Файлы для изменения

- `docs/guides/docker.md`
- `docs/guides/customer-docker-run.md`
- `docs/guides/local-db.md` (если есть устаревшая команда seed)

### Критерии завершения

- [x] В документации **одна** команда seed для Docker (через `db-seed`)
- [x] Объяснено отличие seed (автоматизация) vs UI upload (prod + валидация)
- [x] Нет инструкций с абсолютными путями `-v /d/Work/...`

### 📋 Команда для Executor

```javascript
Task(
  subagent_type: "docs-agent",
  description: "Update seed Docker docs",
  prompt: `
    Прочитай план: docs/plans/current/DB_SEED_VOLUME_FIX.md, раздел "Этап 2"
    Прочитай docs/guides/docker.md и docs/guides/customer-docker-run.md

    Обнови документацию: каноническая команда db-seed, убери workaround -v.
    Объясни роль UI /upload для prod.

    Обнови статус этапа в плане на ✅.
  `
)
```

---

## Этап 3: QA ✅

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 1, 2 ✅  
**Статус**: ✅ Завершено

### Задачи

- [x] Расширить `e2e/docker-smoke.spec.ts` (или добавить `e2e/docker-db-seed.spec.ts`):
  - Предусловие: стек up, схема есть (после bootstrap или migrate)
  - Запуск `docker compose ... --profile seed run --rm db-seed` через `exec`/`spawn` или документировать manual step в smoke
  - Проверка: exit 0, `mart.fin_results` не пустой
- [x] Регресс: `E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts`
- [x] Отчёт: `docs/plans/reports/DB_SEED_VOLUME_FIX_QA.md`

### Файлы для изменения

- `e2e/docker-smoke.spec.ts` и/или `e2e/docker-db-seed.spec.ts`

### Критерии завершения

- [x] `db-seed` через compose проходит без ручного `-v`
- [x] Smoke/regress без новых падений
- [x] QA-отчёт создан

### 📋 Команда для Executor

```
Запусти qa-agent:
- Прочитай docs/plans/current/DB_SEED_VOLUME_FIX.md, раздел "Этап 3: QA"
- Добавь проверку db-seed в Docker smoke
- Запусти: E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
- Создай docs/plans/reports/DB_SEED_VOLUME_FIX_QA.md
- Обнови статус этапа в плане на ✅
```

---

## Этап 4: Product Owner Acceptance ✅

**Субагент**: `product-owner-agent`  
**Зависимости**: Этапы 1, 2, 3 ✅  
**Статус**: ✅ Завершено

### Задачи

- [x] Прочитать обновлённый `customer-docker-run.md`
- [x] Проверить: заказчик может пересевать CSV одной compose-командой без знания путей
- [x] Проверить: в документации понятно, что prod-данные — через `/upload`
- [x] Отчёт: `docs/plans/reports/PO_DB_SEED_VOLUME_FIX_ACCEPTANCE.md`

### Критерии завершения

- [x] Вердикт `ACCEPTED` или `CHANGES_REQUESTED`
- [x] Документация понятна нетехническому пользователю

### 📋 Команда для Executor

```
Запусти product-owner-agent:
- Прочитай docs/plans/current/DB_SEED_VOLUME_FIX.md, раздел "Этап 4"
- Прочитай docs/guides/customer-docker-run.md (секция seed)
- Прочитай QA-отчёт если есть
- Создай docs/plans/reports/PO_DB_SEED_VOLUME_FIX_ACCEPTANCE.md
```

---

## Финальная проверка (Executor)

```bash
# Стек + схема
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap

# Seed без -v (главная проверка плана)
docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed

# Идемпотентность migrate
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run db:migrate

# UI
curl -s http://localhost:3001/api/health
# → http://localhost:8080 дашборд с данными
```

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-06-08 | План | Создан | Workaround -v выявлен на Windows Git Bash |
| 2026-07-02 | Этап 1 | ✅ | `db-seed` в dev/prod compose, profile `seed` на postgres |
| 2026-07-02 | Этап 2 | ✅ | Документация: канонический `db-seed`, таблица bootstrap/migrate/seed, UI `/upload` для prod |
| 2026-07-02 | Этап 3 | ✅ | E2E `docker-db-seed.spec.ts`, регресс 11/11, `mart.fin_results` = 30 rows |
| 2026-07-02 | Этап 4 | ✅ | PO ACCEPTED — одна compose-команда, prod → `/upload`, без `-v` workaround |
