# Доработка Layout API: format, groupableFields, isDimension/isMeasure и миграция команд

## Обзор

Добавить недостающие поля в layout API для соответствия структуре мокапа и перенести функциональность `/api/commands/run` в терминальный скрипт.

## Задачи

### 1. Format для компонентов (проверить корректность)

**Файл:** `backend/src/services/layoutService.ts`

**Статус:** ✅ Уже реализовано

**Карточки (строки 113-141):**
- Format создается из полей с `parent_field_id` структурой
- Формат: `{ value: format_id, PPTD: format_id, YTD: format_id }`
- Соответствует мокапу: `format: { value: "currency_rub", PPTD: "percent", YTD: "percent" }`

**Таблицы (строки 163-165):**
- Format добавляется в каждую колонку отдельно
- Формат: `{ value: format_id }`
- Соответствует мокапу: каждый столбец имеет свой `format: { value: "currency_rub" }`

**Действие:** Проверить, что реализация корректна (уже реализовано)

---

### 2. Добавить groupableFields для таблиц

**Файл:** `backend/src/services/layoutService.ts`

**Где хранится:** `config.components.settings` (JSONB поле) как `{"groupableFields": ["product_line", "region"]}`

**Текущий запрос (строки 75-95):**
```typescript
const comps = await client.query(
  `SELECT 
     m.instance_id,
     m.title_override,
     m.tooltip_override,
     m.icon_override,
     m.data_source_key_override,
     c.id AS component_id,
     c.component_type,
     c.title AS component_title,
     c.tooltip,
     c.icon,
     c.data_source_key
   FROM config.layout_component_mapping m
   JOIN config.components c ON c.id = m.component_id
   ...
`);
```

**Изменения:**
1. Добавить `c.settings` в SELECT запрос
2. В блоке обработки таблиц (после строки 168) извлечь groupableFields:
   ```typescript
   const settings = r.settings 
     ? (typeof r.settings === 'string' ? JSON.parse(r.settings) : r.settings) 
     : null;
   const groupableFields = settings?.groupableFields;
   ```
3. Добавить в объект table (строка 168-174):
   ```typescript
   const table: any = {
     id: r.instance_id,
     type: "table",
     title: r.title_override ?? r.component_title ?? r.instance_id,
     columns,
     dataSourceKey: r.data_source_key_override ?? r.data_source_key,
     ...(groupableFields && { groupableFields }),
   };
   ```

---

### 3. Добавить isDimension и isMeasure для колонок таблиц

**Файл:** `backend/src/services/layoutService.ts`

**Логика определения (из мокапа):**
- `field_type === 'text'` → `isDimension: true` (например, "name", "Наименование")
- `field_type === 'number'` → `isMeasure: true` (например, "value", "percentage")

**Текущий код (строки 155-167):**
```typescript
const columns = fields.rows
  .filter((f) => f.is_visible !== false)
  .map((f) => {
    const col: any = {
      id: f.field_id,
      label: f.label ?? f.field_id,
      type: f.field_type,
    };
    if (f.format_id) {
      col.format = { value: f.format_id };
    }
    return col;
  });
```

**Изменения:**
Добавить определение isDimension/isMeasure перед добавлением format:
```typescript
const col: any = {
  id: f.field_id,
  label: f.label ?? f.field_id,
  type: f.field_type,
};

// Определить isDimension/isMeasure по field_type
if (f.field_type === 'text') {
  col.isDimension = true;
} else if (f.field_type === 'number') {
  col.isMeasure = true;
}

if (f.format_id) {
  col.format = { value: f.format_id };
}
```

---

### 4. Перенести команды в скрипт и удалить /api/commands/run

**Файлы для изменения:**
- `backend/src/routes/commandRoutes.ts` - удалить после переноса
- `backend/src/routes/index.ts` - удалить импорт и использование
- `backend/src/scripts/run-command.ts` - создать новый скрипт
- `backend/package.json` - добавить скрипт для запуска
- `src/pages/DevTools.tsx` - удалить использование /api/commands/run

**Функциональность для переноса из commandRoutes.ts:**
- `cleanAnsiCodes()` - функция очистки ANSI кодов (строки 17-31)
- `ALLOWED_COMMANDS` - список разрешенных команд (строки 34-43)
- `parseTestOutput()` - парсинг вывода тестов (строки 180-243)
- `parseE2EAPIResults()` - парсинг E2E API результатов (строки 248-436)
- `formatTestOutput()` - форматирование вывода тестов (строки 441-490)
- `formatE2ETestOutput()` - форматирование E2E тестов (строки 495-576)
- `formatBusinessFriendlyOutput()` - бизнес-дружественный формат (строки 581-663)
- `formatUnitTestOutput()` - форматирование unit тестов (строки 668-793)
- `formatLintOutput()` - форматирование lint (строки 798-849)
- `formatFormatOutput()` - форматирование format check (строки 854-899)
- `formatTypeCheckOutput()` - форматирование type check (строки 904-946)
- `formatValidateOutput()` - форматирование validate (строки 951-1354)

**Структура нового скрипта:**
```typescript
// backend/src/scripts/run-command.ts
#!/usr/bin/env node
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

// Все функции из commandRoutes.ts (cleanAnsiCodes, parseTestOutput, и т.д.)
// ...

const ALLOWED_COMMANDS: Record<string, string> = {
  test: "npm run test",
  lint: "npm run lint",
  format: "npm run format:check",
  typecheck: "npm run type-check",
  validate: "npm run validate",
  build: "npm run build",
  "test:e2e": "npm run test:e2e",
  "test:e2e:api": "npm run test:e2e:api",
};

async function main() {
  const commandKey = process.argv[2];
  
  if (!commandKey) {
    console.error("Usage: npm run script:run-command <commandKey>");
    console.error("Available commands:", Object.keys(ALLOWED_COMMANDS).join(", "));
    process.exit(1);
  }

  const command = ALLOWED_COMMANDS[commandKey];
  if (!command) {
    console.error(`Error: Command "${commandKey}" is not allowed`);
    console.error("Available commands:", Object.keys(ALLOWED_COMMANDS).join(", "));
    process.exit(1);
  }

  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command, {
      cwd: PROJECT_ROOT,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300000,
    });

    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(2) + "s";
    
    let output = stdout + (stderr ? `\n${stderr}` : "");
    output = cleanAnsiCodes(output);
    
    // Форматирование вывода в зависимости от типа команды
    // (использовать функции formatTestOutput, formatLintOutput и т.д.)
    
    console.log(output);
    
    // Определить успешность выполнения
    const isSuccessful = /* логика определения */;
    process.exit(isSuccessful ? 0 : 1);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
```

**Действие:**
1. Создать `backend/src/scripts/run-command.ts` со всей логикой из `commandRoutes.ts`
2. Добавить в `backend/package.json`:
   ```json
   "scripts": {
     "script:run-command": "tsx src/scripts/run-command.ts"
   }
   ```
3. Удалить `backend/src/routes/commandRoutes.ts`
4. В `backend/src/routes/index.ts` удалить:
   - `import commandRoutes from "./commandRoutes.js";`
   - `router.use("/commands", commandRoutes);`
5. В `src/pages/DevTools.tsx` удалить или заменить секцию с командами (строки 76-338)

---

## Итоговая структура Layout API

После доработки структура будет полностью соответствовать мокапу:

**Карточки:**
```json
{
  "id": "capital_card",
  "type": "card",
  "title": "Капитал",
  "tooltip": "...",
  "icon": "Landmark",
  "dataSourceKey": "capital",
  "format": {
    "value": "currency_rub",
    "PPTD": "percent",
    "YTD": "percent"
  }
}
```

**Таблицы:**
```json
{
  "id": "income_structure_table",
  "type": "table",
  "title": "Структура доходов",
  "dataSourceKey": "income_structure",
  "groupableFields": ["product_line", "region"],
  "columns": [
    {
      "id": "name",
      "label": "Наименование",
      "type": "text",
      "isDimension": true
    },
    {
      "id": "value",
      "label": "Значение",
      "type": "number",
      "isMeasure": true,
      "format": {
        "value": "currency_rub"
      }
    }
  ]
}
```
