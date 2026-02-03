## FXL_CUST — ключевые сущности (детализация)

Это “опорные” объекты, вокруг которых обычно строится витрина/канальный слой.

Полный список объектов см. в `object-list.md`.

---

## Таблицы (основные)

### FXL_CUST.FX_CLIENT

- **PK**: `ID`
- **FK**:
  - `CLIENT_GROUP_REF` → `FXL_CUST.FX_CLIENT_GROUP(ID)`
  - `TRANS_LEGAL_ADDR_REF` → `FXL_CUST.FX_ADDRESS(ID)`
  - `LEGAL_ADDR_REF` → `FXL_CUST.FX_ADDRESS(ID)`
- **Что хранит**: “витринный” профиль клиента для каналов (ФИО/название, ИНН, контакты, адресные поля, признаки, интеграционные идентификаторы `EXTERNAL_ID`/`ABS_CLIENT_ID`).
- **Ключевые поля (выборка)**:
  - `ID`, `CLASS`, `NAME`, `INN`
  - `EMAIL`, `PHONE`, `CITIZENSHIP`
  - `ABS_LOGIN`, `ABS_CLIENT_ID`, `EXTERNAL_ID`
  - `PID_*` (документ), `IS_VIP`, `IS_RESIDENT`, `BIRTH_DATE`

### FXL_CUST.FX_ACCOUNT

- **PK**: `ID`
- **FK**:
  - `OWNER_REF` → `FXL_CUST.FX_CLIENT(ID)`
  - `BANK_REF` → `FXL_CUST.FX_BANKS(ID)`
  - `ACCOUNT_PRODUCT_REF` → `FXL_CUST.FX_ACCOUNT_PRODUCT(ID)`
- **Что хранит**: счет в витрине (номер, владелец, банк, продукт/признаки доступных операций).
- **Ключевые поля**: `NUM`, `OWNER_REF`, `BANK_REF`, `TRANSIT`, `OPENDATE`, `CLOSEDATE`, `ABSCODE`, `EXTERNAL_ID`.

### FXL_CUST.FX_CONTRACT

- **PK**: `ID`
- **FK**:
  - `CLIENT_REF` → `FXL_CUST.FX_CLIENT(ID)`
  - `BANK_REF` → `FXL_CUST.FX_BANKS(ID)`
  - `OPERATOR_REF` → `FXL_CUST.FX_OPERATOR(ID)`
- **Что хранит**: договор/контракт обслуживания клиента в канальном контуре + настройки (lite, OTP, anti‑fraud и т.п.).

### FXL_CUST.FX_ADDRESS

- **PK**: `ID`
- **Что хранит**: адресная сущность (в т.ч. `FULL_ADDRESS`, `CITY`, `STREET`, `COUNTRY`, детали дома/корпуса/кв.).

### FXL_CUST.FX_BANKS

- **PK**: `ID`
- **Что хранит**: справочник банков (`BANK_NAME`, `BANK_BIC`, `BANK_SWIFT`, `BANK_REG_NUMBER`, …).

### FXL_CUST.FX_CLIENT_GROUP

- **PK**: `ID`
- **FK**:
  - `PARENT_REF` → `FXL_CUST.FX_CLIENT_GROUP(ID)`
- **Что хранит**: группировка клиентов (иерархия групп, директории inbox/outbox, признак default).

### FXL_CUST.FX_ACCOUNT_PRODUCT

- **PK**: `ID`
- **Что хранит**: справочник “продукта счета” (`PRODUCT_CODE`, `PRODUCT_NAME`).

---

## Документооборот/шлюз (канальный документ)

### FXL_CUST.FX_DOC

- **PK**: `GATE_ID`
- **FK**:
  - `CLIENT_ID` → `FXL_CUST.FX_CLIENT(ID)`
  - `BANK_REF` → `FXL_CUST.FX_BANKS(ID)`
  - `REVOKING_DOC` → `FXL_CUST.FX_DOC(GATE_ID)` (самоссылка)
- **Что хранит**: документ/платеж в шлюзе (статус, даты, реквизиты, XML, признаки online/incoming, внешние id).
- **Ключевые поля**: `GLOBAL_ID`, `DOC_TYPE`, `DOC_NUM`, `DOC_DATE`, `STATE`, `OPER_DATE`, `PAYER_ACCOUNT`, `SUMM`, `XML`, `ABS_DOC_ID`, `PAYMENT_INFO`.

### FXL_CUST.FX_DOC_PAY

- **PK**: `DOC`
- **FK**: `DOC` → `FXL_CUST.FX_DOC(GATE_ID)`
- **Что хранит**: доп. данные по оплате (например, `ACCNUM`).

### FXL_CUST.FX_DOC_MSG

- **PK**: `DOC`
- **FK**: `DOC` → `FXL_CUST.FX_DOC(GATE_ID)`
- **Что хранит**: сообщение/письмо, связанное с документом (`SENDER`, `RECIPIENTS`, `MSG_SUBJECT`, `MSG_BODY`, `ATTACHMENT`).

### FXL_CUST.FX_DOC_LOG

- **PK**: `ID`
- **FK**: `DOC_ID` → `FXL_CUST.FX_DOC(GATE_ID)`
- **Что хранит**: журнал смены статусов/комментариев документа.

---

## Доступ/пользователи/роли

### FXL_CUST.FX_USER

- **PK**: `ID`
- **UNIQUE**: (`SUBJECT_DN`, `ISSUER_DN`) — похоже на связку к сертификату/ЭП
- **FK**: `PERSON_REF` → `FXL_CUST.FX_CLIENT(ID)`
- **Что хранит**: пользователь канала (признаки lite/mobile/enabled, DN сертификата).

### FXL_CUST.FX_ROLES

- **PK**: `ID`
- **Что хранит**: роли/права с флагами возможностей (`CAN_*`).

### FXL_CUST.FX_OPERATOR

- **PK**: `ID`
- **Что хранит**: справочник операторов (`NAME`).

---

## Витринные представления (views) — “готовые” наборы для каналов

### FXL_CUST.FFB_CUSTOMERS (view)

- **Колонки (30)**: `CLIENTNO`, `FULLNAME`, `BIRTHDAY`, `EMAIL`, `MOBILEPHONE`, `INN`, документные/адресные поля и т.п.
- **Смысл**: “витрина клиента” в удобном виде (часто используется фронтом вместо сырого `TBG`).

### FXL_CUST.FFB_ACCOUNTS (view)

- **Колонки (8)**: `BRANCH`, `ACC_ID`, `CCY_CODE`, `TAX_NUMBER`, `NAME`, `ACC_TYPE`, `ISACTIVE`, `BALANCE`
- **Смысл**: витрина счетов + признак активности + остаток (для отображения).

### FXL_CUST.FFB_ACC_INFO (view)

- **Колонки (17)**: `CLIENTNO`, `OUT_AMOUNT_CUR`, `PSS_ACC_ID`, `CARD_*`, `ACC_STATUS`, `FLAG_OF_BLOCK`, …
- **Смысл**: “счет + карта + остаток/статусы + флаги” в одном месте (типичная витрина ДБО).

### FXL_CUST.FX_VW_CARD (view)

- **Колонки (5)**: `NUM`, `BANK_BIC`, `PAN_ENCRYPTED`, `PC_CLIENT_NAME`, `EXP_DATE`
- **Смысл**: карточная витрина (в т.ч. защищенные данные PAN).

### FXL_CUST.V_TARIFF_OPER_CALC (view)

- **Колонки (22)**: `OP_DATE`, `AMOUNT`, `CLIENTNO`, `OPER_TYPE`, `TARIFF_ID`, `SUM_COM`, `ACC_ID`, `CCY`, …
- **Смысл**: расчет комиссии/тарифа по операциям (витрина “операция → комиссия/лимиты”).

