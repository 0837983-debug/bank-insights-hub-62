---
title: ABS БД — навигация
description: Документация по дампу АБС (Oracle DDL)
---

# Дамп АБС (DDL) — навигация

Источник: `fxldp_full_ddl.sql` (Oracle DDL).

В дампе присутствуют **14 схем**, основная бизнес‑схема — **`TBG` (4333 таблицы)**.

## Быстрый ответ: где лежат ключевые данные

См. [Ключевые данные](./key-data):

- **Справочник клиентов**: `TBG.MGC_CL_CLIENTS` (PK `CLIENT_ID`)
- **Справочник счетов (клиентские счета)**: `TBG.MGC_AC_ACCOUNTS` (PK `ACCT_ID`)
- **Маппинг клиент↔счет**:
  - прямой: `TBG.MGC_AC_ACCOUNTS.CLIENT_ID` → `TBG.MGC_CL_CLIENTS.CLIENT_ID`
  - расширенный (связи/роли): `TBG.MGC_CL_LINKS` + `TBG.MGC_CL_LINK_ACCOUNTS`
- **Транзакции / операции** (разные подсистемы):
  - проводки/строки проводок: `TBG.IOG_ACCT_ENTRIES`
  - платежные операции: `TBG.PCF_OPERATION`, `TBG.PCF_PAYM_TRAN`
  - операции CRP: `TBG.CRP_OPERATIONS`

## Разделы

- [Схемы](./schemas) — перечень схем и их роль (что «системное», что «бизнес»)
- [Связи](./relationships) — ключевые связи (FK) и схемы связей (Mermaid)
- [Ключевые данные](./key-data) — подробное описание таблиц и полей
