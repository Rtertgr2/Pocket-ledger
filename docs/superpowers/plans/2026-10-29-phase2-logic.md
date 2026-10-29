# Phase 2 — Money Movement & Stats Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All money movement and stats logic works against SQLite and is proven by tests, with no UI work.

**Architecture:** Balances are derived by a SQL view over `transactions` (no stored balance column), so delete/transfer need no rollback maths. Pure date/stats functions live in `src/utils`, DB access in `src/services/db`, and thin Zustand slices coordinate write-then-refetch.

**Tech Stack:** Expo SDK 58 (RN 0.88), TypeScript, expo-sqlite, zustand, expo-crypto, Node's built-in `node:test`, host `sqlite3` CLI.

**Spec:** `docs/superpowers/specs/2026-10-29-phase2-logic-design.md`

## Global Constraints

- Money is integer satang; every money column/field ends in `_satang`. Never `REAL`, never `toFixed` on money arithmetic.
- `TRANSFER` never affects monthly income/expense sums or the daily burn rate.
- `is_excluded_from_average = 1` rows never enter the burn rate.
- Amounts must be `> 0` (DB `CHECK`); a zero-amount write is a bug, not an edge case.
- Month windows are half-open `[startIso, endIso)` computed from **local** time, compared as ISO strings.
- Store actions are pessimistic: DB first, then state; a throw leaves state untouched.
- Accounts are never DELETEd (soft-delete via `is_active = 0`).
- Build/run Android only as `LANG=C npx expo run:android` (see `AGENTS.md`).
- Verify every task with `npm run typecheck` and `npx eslint .` before committing.

## Review Focus

1. **A transfer where source and destination are the same account** — must be rejected, not recorded as ±0.
2. **Deleting one leg of a transfer or the account holding it** — balances of both accounts must be unchanged except that transfer; account delete must be blocked entirely.
3. **A transaction at 00:10 local time on the 1st of a month** — must count in the new month, not the previous one.
4. **Reconcile to exactly the current derived balance** — must not insert a zero-amount row (would violate `CHECK`) and must leave no trace.
5. **Excluded expenses (rent, adjustments)** — must appear in balances but never in the burn rate numerator.

---

### Task 0: Version control baseline

**Files:**
- Create: `.gitignore` (already generated), repo

**Interfaces:**
- Produces: a git repo so every later task can commit.

- [ ] **Step 1: Initialize the repo and commit Phase 1**

```bash
cd <project root>
git init -b main
git add -A
git commit -m "chore: phase 1 skeleton (satang storage, SQLite schema, self-check)"
```

- [ ] **Step 2: Verify**

Run: `git status --short`
Expected: no output (clean tree), and `git log --oneline` shows one commit.

---

### Task 1: Schema v2 — derived balances

**Files:**
- Modify: `src/services/db/schema.ts`
- Modify: `src/types/index.ts`
- Modify: `App.tsx`
- Modify: `scripts/check-phase1.mjs`
- Modify: `docs/superpowers/specs/2026-10-29-phase1-skeleton-design.md` (note the column removal)
- Modify: `/run/media/teerametr/3b44566d-03e0-4d76-8469-1bf9cf418a63/memory/MonySave APP/MonaySave APP/system_workflow_technical_design_specification.md` (DDL section)

**Interfaces:**
- Produces: `DDL: string[]` (now including `v_account_balances` and `PRAGMA user_version = 1`), `initDatabase(db)`, and type `AccountBalance` = `Account` fields minus `current_balance_satang`, plus `balance_satang: number`.

- [ ] **Step 1: Write the failing test**

In `scripts/check-phase1.mjs`, replace the stored-balance assertions with view-based ones:

```js
assert.deepEqual(
  query("SELECT id, balance_satang AS b FROM v_account_balances ORDER BY id").map((r) => [r.id, r.b]),
  [['cash', 38000], ['kbank', 210000]],
  'derived balances'
);
// delete the expense row: cash recovers, kbank untouched
query("DELETE FROM transactions WHERE id = 't1'");
assert.deepEqual(
  query("SELECT id, balance_satang AS b FROM v_account_balances ORDER BY id").map((r) => [r.id, r.b]),
  [['cash', 40000], ['kbank', 210000]],
  'deleting a transaction restores the balance with no rollback code'
);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run check`
Expected: FAIL — `no such table: v_account_balances` (or `no such column: balance_satang`).

- [ ] **Step 3: Update the DDL and types**

In `src/services/db/schema.ts`: delete `current_balance_satang` from `accounts`, append the view from the spec (as one more `DDL` entry), and end `initDatabase` with `await db.execAsync('PRAGMA user_version = 1')`.
In `src/types/index.ts`: remove `current_balance_satang` from `Account`; add `export interface AccountBalance extends Omit<Account, 'current_balance_satang'> { balance_satang: number }`.
In `App.tsx`: read totals from `v_account_balances` (`SELECT COALESCE(SUM(balance_satang),0) AS satang FROM v_account_balances`) and drop the `UPDATE accounts ...` line from `addDemoExpense`.
Update the two documentation files to the new DDL.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check`
Expected: PASS — `Phase 1 check passed: ...` with the derived-balance assertions.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npx eslint .
git add -A && git commit -m "refactor(db): derive account balances from transactions (schema v2)"
```

---

### Task 2: Date window and burn rate (pure functions)

**Files:**
- Create: `src/utils/calculations.ts`
- Create: `src/utils/calculations.test.ts`
- Modify: `package.json` (add `"test": "node --test --experimental-strip-types src/**/*.test.ts"`)

**Interfaces:**
- Produces:
  - `monthRange(year: number, monthIndex: number): { startIso: string; endIso: string }`
  - `daysInMonth(year: number, monthIndex: number): number`
  - `calculateDailyBurnRate(expenseSumSatang: number, daysInMonth: number): number`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDailyBurnRate, daysInMonth, monthRange } from './calculations.ts';

test('monthRange uses local month boundaries as UTC ISO', () => {
  const { startIso, endIso } = monthRange(2026, 10); // November 2026
  assert.equal(startIso, new Date(2026, 10, 1).toISOString());
  assert.equal(endIso, new Date(2026, 11, 1).toISOString());
});

test('daysInMonth handles leap years', () => {
  assert.equal(daysInMonth(2026, 1), 28);
  assert.equal(daysInMonth(2028, 1), 29);
  assert.equal(daysInMonth(2026, 9), 31);
});

test('burn rate spreads the month expenses over the whole month', () => {
  assert.equal(calculateDailyBurnRate(310000, 31), 10000); // 3,100.00 THB over 31 days
  assert.equal(calculateDailyBurnRate(0, 30), 0);
  assert.equal(calculateDailyBurnRate(100, 31), 3); // rounds to whole satang
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./calculations.ts`.

- [ ] **Step 3: Implement the functions**

`monthRange` builds the boundaries with `new Date(year, monthIndex, 1)` / `new Date(year, monthIndex + 1, 1)` and returns `.toISOString()`. `daysInMonth` uses `new Date(year, monthIndex + 1, 0).getDate()`. `calculateDailyBurnRate` returns `Math.round(expenseSumSatang / daysInMonth)`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/calculations.ts src/utils/calculations.test.ts package.json
git commit -m "feat(calc): local month windows and daily burn rate"
```

---

### Task 3: SQL access layer

**Files:**
- Create: `src/services/db/accounts.ts`
- Create: `src/services/db/transactions.ts`
- Modify: `scripts/check-phase1.mjs` (add coverage for the new queries' SQL)

**Interfaces:**
- Consumes: `DDL`/`initDatabase` from Task 1.
- Produces (`accounts.ts`):
  - `listAccounts(db: SQLiteDatabase): Promise<AccountBalance[]>`
  - `insertAccount(db: SQLiteDatabase, input: { id: string; name: string; initial_balance_satang: number }): Promise<void>`
- Produces (`transactions.ts`):
  - `insertTransaction(db: SQLiteDatabase, input: { id: string; account_id: string; destination_account_id?: string; type: TransactionType; amount_satang: number; note?: string; is_excluded_from_average?: number; transaction_date: string }): Promise<void>`
  - `deleteTransactionById(db: SQLiteDatabase, id: string): Promise<number>` (returns `changes`)
  - `listRecentTransactions(db: SQLiteDatabase, limit: number): Promise<Transaction[]>`
  - `sumExpensesInRange(db: SQLiteDatabase, startIso: string, endIso: string): Promise<number>` — `SUM(amount_satang)` over `type='EXPENSE' AND is_excluded_from_average=0 AND transaction_date >= ? AND transaction_date < ?`, `COALESCE(...,0)`.

- [ ] **Step 1: Write the failing test**

Extend `scripts/check-phase1.mjs` with the month-window query as the test harness for `sumExpensesInRange`'s SQL (it executes the identical statement), asserting that an excluded expense and the transfer are both ignored:

```js
query(`INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date, is_excluded_from_average)
       VALUES ('t3', 'kbank', 'EXPENSE', 999900, '2026-10-15T03:00:00Z', 1)`);
assert.equal(query(`SELECT COALESCE(SUM(amount_satang),0) AS s FROM transactions
  WHERE type='EXPENSE' AND is_excluded_from_average=0
    AND transaction_date >= '2026-10-01T00:00:00.000Z' AND transaction_date < '2026-11-01T00:00:00.000Z'`)[0].s, 2000);
assert.equal(query(`SELECT COALESCE(SUM(amount_satang),0) AS s FROM transactions
  WHERE type='EXPENSE' AND is_excluded_from_average=0
    AND transaction_date >= '2026-11-01T00:00:00.000Z'`)[0].s, 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run check`
Expected: FAIL on the second assertion (the transfer/excluded rows leak into the 999900 sum) if the statement is wrong; otherwise this step passes and proves the SQL before it becomes code.

- [ ] **Step 3: Implement the four modules' functions**

Single-statement queries via `db.getAllAsync` / `db.getFirstAsync` / `db.runAsync`, always parameterised (`?`), never string-concatenated. `listAccounts` selects from `v_account_balances` ordered by `is_active DESC, name`.

- [ ] **Step 4: Run checks**

Run: `npm run check && npm run typecheck && npx eslint .`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/db scripts/check-phase1.mjs
git commit -m "feat(db): account and transaction queries over the balance view"
```

---

### Task 4: Zustand store — accounts

**Files:**
- Create: `src/store/slices/accountSlice.ts`
- Create: `src/store/useAppStore.ts`
- Modify: `package.json` (dependency `zustand`)

**Interfaces:**
- Consumes: `listAccounts`, `insertAccount` (Task 3), `AccountBalance` (Task 1).
- Produces:
  - `useAppStore` with `accounts: AccountBalance[]`, `totalSatang: number`, `loading: boolean`
  - `fetchAccounts(db: SQLiteDatabase): Promise<void>`
  - `createAccount(db: SQLiteDatabase, input: { name: string; initial_balance_satang: number }): Promise<void>` — generates `id` with `Crypto.randomUUID()` from `expo-crypto`.

- [ ] **Step 1: Add the dependency**

Run: `npx expo install zustand expo-crypto`

- [ ] **Step 2: Implement the slice**

`fetchAccounts` sets `loading`, awaits `listAccounts`, derives `totalSatang` as the sum of active accounts' `balance_satang`, and sets state only on success. `createAccount` inserts then re-runs `fetchAccounts`. Both swallow nothing: on throw, `loading` is reset in a `finally` and the error is rethrown.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npx eslint .`
Expected: pass. (No unit test: the slice is a 3-line orchestration over tested functions; behaviour is proven on device in Task 6.)

- [ ] **Step 4: Commit**

```bash
git add src/store package.json package-lock.json
git commit -m "feat(store): account slice with derived balances"
```

---

### Task 5: Zustand store — transactions, transfer, delete, reconcile

**Files:**
- Create: `src/store/slices/transactionSlice.ts`
- Modify: `src/store/useAppStore.ts`

**Interfaces:**
- Consumes: Task 3's `insertTransaction`, `deleteTransactionById`, `listRecentTransactions`, `sumExpensesInRange`; Task 2's `monthRange`, `daysInMonth`, `calculateDailyBurnRate`.
- Produces:
  - `recent: Transaction[]`, `burnRateSatang: number`
  - `addTransaction(db, dto: CreateTransactionDTO): Promise<void>`
  - `transferFunds(db, dto: TransferFundsDTO): Promise<void>`
  - `deleteTransaction(db, id: string): Promise<void>`
  - `reconcileBalance(db, dto: ReconcileBalanceDTO): Promise<void>`
  - `fetchStats(db: SQLiteDatabase, now?: Date): Promise<void>`

- [ ] **Step 1: Implement the write actions**

- `addTransaction`: insert with `type` from the DTO, `transaction_date ?? new Date().toISOString()`, then `fetchAccounts` + `fetchStats`.
- `transferFunds`: reject `account_id === destination_account_id` by throwing `new Error('source and destination must differ')` **before** any write; insert one row with `type: 'TRANSFER'`, `is_excluded_from_average: 1`; then refetch. No balance update.
- `deleteTransaction`: `deleteTransactionById`, then refetch; throw if `changes === 0`.
- `reconcileBalance`: read the current `balance_satang` from `v_account_balances`; `delta = actual − current`; if `delta === 0` return without writing; otherwise insert one INCOME/EXPENSE row for `Math.abs(delta)` with `is_excluded_from_average: 1` and `note: 'ปรับปรุงยอดคงเหลือ'`, then refetch.
- `fetchStats`: `monthRange(now.getFullYear(), now.getMonth())` → `sumExpensesInRange` → `calculateDailyBurnRate(sum, daysInMonth(...))`; also load `listRecentTransactions(db, 5)`.

- [ ] **Step 2: Add the Review-Focus tests to the SQL check script**

In `scripts/check-phase1.mjs`, append assertions that: (a) a same-account transfer row is rejected by the DB `CHECK`; (b) deleting `t2` (the transfer) restores both accounts to their pre-transfer balances; (c) an excluded expense leaves the burn-rate window sum unchanged.

- [ ] **Step 3: Run checks**

Run: `npm run check && npm test && npm run typecheck && npx eslint .`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/store scripts/check-phase1.mjs
git commit -m "feat(store): transaction, transfer, delete and reconcile actions"
```

---

### Task 6: Wire the dev screen and verify on the emulator

**Files:**
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `useAppStore` actions from Tasks 4 and 5.

- [ ] **Step 1: Replace the inline SQL in `App.tsx` with store calls**

On mount: `fetchAccounts(db)` + `fetchStats(db)`. Buttons: "add 20.00 expense" → `addTransaction` on the first account; "transfer 10.00 cash → kbank" → `transferFunds` (create kbank first if absent); "reconcile to 500.00" → `reconcileBalance`. Show account balances, `burnRateSatang` via `formatSatang`, and the last transactions.

- [ ] **Step 2: Run on the emulator**

Run: `LANG=C npx expo run:android --device emulator-5554`
Expected: app opens, balances shown from the view.

- [ ] **Step 3: Verify the five Review Focus cases by hand**

Tap through: add expense (balance drops), transfer (both balances change, burn rate unchanged), delete a transaction (balance returns), reconcile to a value (one excluded INCOME/EXPENSE row, burn rate unchanged), reconcile to the identical balance (nothing added). Pull the DB and confirm with `sqlite3`:

```bash
adb exec-out run-as com.anonymous.pocketledger cat files/SQLite/pocket-ledger.db > /tmp/pocket.db
sqlite3 /tmp/pocket.db "SELECT * FROM v_account_balances; SELECT type,amount_satang,is_excluded_from_average FROM transactions;"
```

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: drive the dev screen from the store"
```

---

## Self-Review

- **Spec coverage:** derived balances (T1), local month windows + burn rate (T2), account/transaction SQL (T3), accounts state (T4), add/transfer/delete/reconcile + stats (T5), on-device proof (T6). Spec's "no transaction editing" and "no persist middleware" are honoured by omission.
- **Review Focus:** (1) same-account transfer → T5 Step 2a and DB `CHECK` from Phase 1; (2) delete/transfer removal → T5 Step 2b; (3) local month boundary → T2 `monthRange` test; (4) reconcile delta 0 → T5 Step 3 manual case; (5) excluded expenses → T3 Step 1.
- **Type consistency:** `AccountBalance.balance_satang` used in T1, T3, T4, T5; `sumExpensesInRange(startIso, endIso)` matches `monthRange` output names in T2; `daysInMonth` name identical in T2 and T5.
- **Proportion:** 6 tasks, ~250 lines of implementation. No task body is transcribed; signatures and assertions only.
