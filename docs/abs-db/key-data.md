## Где хранятся ключевые данные (по DDL)

Ниже — “костяк” по 4 пунктам из запроса. Это вывод **по структуре таблиц и FK** из `fxldp_full_ddl.sql`.

---

## 1) Справочник счетов

### 1.1 Клиентские счета (основная таблица)

**`TBG.MGC_AC_ACCOUNTS`**

- **PK**: `ACCT_ID`
- **FK → клиент**: `CLIENT_ID` → `TBG.MGC_CL_CLIENTS.CLIENT_ID`
- **Похоже на ключевые поля счета**:
  - `ACCT_NO` — номер счета (VARCHAR2(25))
  - `BRANCH` — филиал/подразделение (VARCHAR2(8))
  - `CCY` — валюта (VARCHAR2(3))
  - `OPEN_DATE`, `CLOSE_DATE` — даты открытия/закрытия
  - `STATUS` — статус (по умолчанию `'I'`)
  - `PLAN_CODE`, `PLAN_TYPE` — привязка к плану счетов (см. ниже)
  - `LEDGER`, `SUBLEDGER` — признаки учета/книги

### 1.2 План счетов / справочник бухгалтерских “план‑кодов”

Если под “справочником счетов” подразумевается **план счетов (chart of accounts)**, то его роль выполняет:

**`TBG.MGC_AC_PLANS`**

- **PK**: (`PLAN_CODE`, `PLAN_TYPE`)
- **Ключевые поля**:
  - `CODE_NAME` — наименование
  - `BALANCE_TYPE_C`, `ACCT_TYPE_C` — классификация/тип
  - `PARENT_PLAN_ID` — иерархия
  - `OPEN_DATE`, `CLOSE_DATE`

### 1.3 Витрина/каналы (если нужен “фронтовый” справочник)

**`FXL_CUST.FX_ACCOUNT`**

- **PK**: `ID`
- **FK → владелец**: `OWNER_REF` → `FXL_CUST.FX_CLIENT.ID`
- **Поля**: `NUM` (номер), `NAME`, `OPENDATE`, `CLOSEDATE`, `BANK_REF`, …

---

## 2) Справочник клиентов

### 2.1 Основной справочник клиентов

**`TBG.MGC_CL_CLIENTS`**

- **PK**: `CLIENT_ID`
- **Часто используемые идентификаторы/атрибуты**:
  - `CLIENTNO` — внешний номер/код клиента (VARCHAR2(40))
  - `BRANCH` — филиал
  - `NAME_CYR`, `NAME_LAT`, `NAME_SHORT` — ФИО/названия
  - `TAX_NUMBER` — ИНН/налоговый номер (VARCHAR2(15))
  - `BIRTH_DATE` — дата рождения
  - `STATUS_C`, `RESIDENT`, `BANK_CUSTOMER` — признаки/статусы

### 2.2 Витрина/каналы

**`FXL_CUST.FX_CLIENT`**

- **PK**: `ID`
- среди полей встречается `ABS_CLIENT_ID` (VARCHAR2(40)) — выглядит как ссылка на “ABS клиента”/внешний ключ из АБС (это поле удобно для сопоставления с `TBG.MGC_CL_CLIENTS.CLIENTNO`/`CLIENT_ID` в конкретной инсталляции, но DDL не задает FK напрямую)

---

## 3) Маппинг клиент ↔ счет

### 3.1 Прямой маппинг (рекомендуемая “база”)

**`TBG.MGC_AC_ACCOUNTS.CLIENT_ID` → `TBG.MGC_CL_CLIENTS.CLIENT_ID`**

Это самый простой и надежный путь “клиент → все его счета”.

Шаблон запроса:

```sql
select
  c.client_id,
  c.clientno,
  c.name_cyr,
  a.acct_id,
  a.acct_no,
  a.ccy,
  a.open_date,
  a.close_date,
  a.status
from tbg.mgc_cl_clients c
join tbg.mgc_ac_accounts a
  on a.client_id = c.client_id;
```

### 3.2 Расширенный маппинг через связи (LINK_ID)

Используйте, если важна **роль/тип связи** и/или “связанный клиент”:

- `TBG.MGC_CL_LINKS`:
  - `LINK_ID` (PK)
  - `CLIENT_ID` (FK → `MGC_CL_CLIENTS`)
  - `LINKED_CLIENT_ID` (связанный клиент)
  - `LINK_TYPE_C` (тип связи)

- `TBG.MGC_CL_LINK_ACCOUNTS`:
  - `LINK_ID` (FK → `MGC_CL_LINKS`)
  - `ACCT_ID` (FK → `MGC_AC_ACCOUNTS`)

---

## 4) Транзакции / операции

В дампе видно, что “транзакции” хранятся **в разных подсистемах**. Ниже — основные кандидаты, которые уже можно использовать как опорные точки.

### 4.1 Проводки / строки проводок

**`TBG.IOG_ACCT_ENTRIES`**

- похоже на таблицу строк проводок:
  - `DOC_ID`, `ENTRY_NUM`
  - `DEB_ACCT`, `CRED_ACCT` (строковые коды/номера счетов)
  - `DEB_SUMM`, `CRED_SUMM`
  - `VALUE_DATE`, `CCY`

Важно: в DDL **нет FK** из `IOG_ACCT_ENTRIES` в `MGC_AC_ACCOUNTS`, поэтому сопоставление обычно делается по “номеру/коду” (`DEB_ACCT`/`CRED_ACCT`) с `MGC_AC_ACCOUNTS.ACCT_NO` (или через план счетов/ledger‑коды — зависит от бизнес‑логики инсталляции).

### 4.2 Платежные операции (PCF)

**`TBG.PCF_OPERATION`**

- **PK**: `NO`
- ключевые поля: `BRANCH`, `VALUE_DATE`, `AMOUNT_1/2/3`, `CCY_NO`, `STATUS`, `DOC_TYPE`, `DOC_NO`, …
- есть поля‑ссылки: `AGR_NO` (договор), `ACC_ID` (строковый идентификатор счета), `PARENT_NO` (иерархия операций)

**`TBG.PCF_PAYM_TRAN`**

- **PK**: (`BATCH_ID`, `ENTRY_NUM`)
- есть **FK** на `TBG.PCF_AGR` по `AGR_NO`

### 4.3 Операции (CRP)

**`TBG.CRP_OPERATIONS`**

- **PK**: `ID`
- поля: `ACCOUNTID` (числовой идентификатор счета/учета), `POSTDATE`, суммы/валюты, статусы

---

## Что дальше (если нужно “точно найти” таблицу транзакций для вашего сценария)

DDL показывает несколько контуров (`IOG_*`, `PCF_*`, `CRP_*`, `STM_*`, …). Чтобы однозначно выбрать “главную” таблицу транзакций, обычно нужна привязка к вашему бизнес‑потоку (платежи юрлиц, карты, бух.проводки, касса и т.д.). По структуре DDL можно быстро построить “граф” связей вокруг нужной подсистемы (по FK), но для проводок часто используется сопоставление по номеру счета, а не FK.

