# QA Report: Full Regression Run

Date: 2026-05-23  
Executor: QA Agent  
Scope: Full Playwright E2E regression + dedicated API/Security regression scripts

## Commands Executed

```bash
npm run test:e2e -- --reporter=list
npm run test:e2e:api -- --reporter=list
npm run test:e2e:security -- --reporter=list
```

## Run Results

### 1) Full E2E (`npm run test:e2e -- --reporter=list`)
- Total: 142
- Passed: 107
- Failed: 26
- Skipped: 9
- Duration: ~58.5s

### 2) API regression script (`npm run test:e2e:api -- --reporter=list`)
- Total: 17
- Passed: 12
- Failed: 2
- Skipped: 3
- Duration: ~1.5s

### 3) Security regression script (`npm run test:e2e:security -- --reporter=list`)
- Total: 20
- Passed: 18
- Failed: 1
- Skipped: 1
- Duration: ~4.1s

## Key Failures (Top-10)

1. `e2e/api-data-new-contract.spec.ts`  
   `should return data for header_dates query with required parameters`  
   Error: response row misses `ppDate` / `pyDate` (has only `periodDate` + flags).

2. `e2e/api-data-new-contract.spec.ts`  
   `should return data for assets_table query with all parameters`  
   Error: `response.ok()` is `false`.

3. `e2e/api-get-data-fix.spec.ts`  
   `should return { componentId, type, rows } format`  
   Error: `response.ok()` is `false`.

4. `e2e/api-get-data.spec.ts`  
   `should return data for header_dates query`  
   Error: response row misses `ppDate` / `pyDate`.

5. `e2e/api.integration.spec.ts`  
   `should fetch all KPIs via /api/data`  
   Error: `response.ok()` is `false`.

6. `e2e/api.integration.spec.ts`  
   `should fetch layout structure`  
   Error: expected `headerSection` is `undefined`.

7. `e2e/header-component.spec.ts`  
   `should have header component in config.components`  
   Error: header component is `undefined` in returned layout JSON.

8. `e2e/layout-query-id.spec.ts`  
   `should return queryId in layout JSON for data loading`  
   Error: expected header component in layout is `undefined`.

9. `e2e/frontend-table-display.spec.ts`  
   `should display Assets table with data`  
   Error: `locator('table').first()` not found (timeout waiting table visible).

10. `e2e/security.spec.ts`  
    `should handle rapid requests`  
    Error: all parallel requests failed (`successCount = 0`).

## Failure Classification

### Product/contract issues (most failures)
- API contract mismatch for `header_dates` fields (`ppDate`, `pyDate` absent).
- Layout contract mismatch (missing `header` component / `headerSection` in returned layout).
- Data/API availability issues causing `response.ok() === false` for KPI/table queries.
- Frontend E2E consequences: table rendering assertions fail because table data/layout is unavailable.
- Security rapid-request behavior fails functional expectation.

### Environment/setup signals
- No hard blocker from test infrastructure (Playwright runs are stable, web servers auto-started).
- Repeated warning `NO_COLOR ignored due to FORCE_COLOR` is cosmetic only.
- Therefore current run failures are primarily product/backend-contract/data related, not CI/runtime environment failures.

## Notes

- Regression run is reproducible with the exact commands above.
- There are also skipped legacy tests (mainly old endpoint scenarios), but they do not explain current failures.
