# Phase 2 — Money Movement & Stats Logic (Design)

Date: 2026-10-29
Status: awaiting approval
Scope: business logic + state only. No UI beyond keeping the Phase 1 dev screen compiling.

## Intent

All balance/money rules work and are testable without a screen: record income/expense, transfer
between accounts, delete with correct result, reconcile to a real balance, and compute the daily
burn rate. Phase 3 then only renders state.

## The decision that shapes everything: balances are derived, not stored

`accounts.current_balance_satang` is **removed**. A balance is always:

```
initial_balance_satang
  + Σ(INCOME +, EXPENSE −) where account_id = me
  + Σ(TRANSFER ∓)          where I am source (−) or destination (+)
```

Materialized once as a SQL view (`v_account_balances`) so the expression exists in one place.

| | Stored (spec) | Derived (chosen) |
|---|---|---|
| Delete | reverse the right leg(s) per type | delete the row |
| Transfer | 2 UPDATE + 1 INSERT in a txn | 1 INSERT |
| Drift | possible, silent | impossible |
| Import recalc | required | not needed |

Consequence: roadmap Task 2.3's rollback maths and spec §2.5's Balance = Balance ± Amount cease to
exist. That is the point — the code is deleted, not moved.

## Schema v2

```sql
-- accounts loses current_balance_satang; transactions and all three indexes unchanged
CREATE VIEW IF NOT EXISTS v_account_balances AS
SELECT a.id, a.name, a.initial_balance_satang,
       a.initial_balance_satang
       + COALESCE((SELECT SUM(CASE t.type WHEN 'INCOME' THEN t.amount_satang
                                           ELSE -t.amount_satang END)
                   FROM transactions t
                   WHERE t.account_id = a.id AND t.type IN ('INCOME','EXPENSE')), 0)
       + COALESCE((SELECT SUM(CASE WHEN t.account_id = a.id THEN -t.amount_satang
                                   ELSE t.amount_satang END)
                   FROM transactions t
                   WHERE t.type = 'TRANSFER'
                     AND (t.account_id = a.id OR t.destination_account_id = a.id)), 0)
       AS balance_satang
FROM accounts a;
```

`PRAGMA user_version = 1` after DDL. No migration from Phase 1: the only Phase 1 database is the
emulator's, created by this project, and nothing has shipped. The app is reinstalled.

`accounts.is_active` stays and still governs the dashboard total; deleting an account remains
soft-delete only.

## Dates

`transaction_date` stays ISO-8601 UTC. Month windows for stats are computed as **local-time**
boundaries and converted to ISO strings for comparison — otherwise a 00:30 Bangkok entry on the 1st
is counted in the previous month.

`monthRange(year, monthIndex)` → `{ startIso, endIso }`, half-open (`>= start`, `< end`).

## Daily burn rate

```ts
calculateDailyBurnRate(expenseSumSatang: number, daysInMonth: number): number  // integer satang
daysInMonth(year, monthIndex): number
```

The SQL supplies the numerator (`type='EXPENSE' AND is_excluded_from_average=0` inside the month
window); the pure function divides and rounds to whole satang. Formula meaning (full-month
denominator) is unchanged from the spec.

## State

`zustand`, `.persist` is **not** used — SQLite is the truth. Store actions are pessimistic: `await`
the write, then re-read the affected data, then set state; on throw, state is untouched and the
error propagates to the caller for a toast in Phase 3.

Slices (as in the roadmap layout):
- `accountSlice`: `accounts: AccountBalance[]`, `totalSatang`, `fetchAccounts()`, `createAccount(dto)`
- `transactionSlice`: `recent: Transaction[]`, `addTransaction(dto)`, `transferFunds(dto)`,
  `deleteTransaction(id)`, `reconcileBalance(dto)`

## Rules the code must enforce (not just document)

1. Transfer must not touch monthly expense/income sums (already structural: `type='TRANSFER'`).
2. `reconcileBalance`: `delta = actual − derived`; `delta === 0` writes nothing; otherwise one
   INCOME/EXPENSE row with `is_excluded_from_average = 1` and `note = 'ปรับปรุงยอดคงเหลือ'`.
3. Deleting a transaction deletes only the row; every balance recovers because it is derived.
4. Every write that spans rows (none remain) would use `withExclusiveTransactionAsync`; a single
   INSERT does not need a transaction.
5. Amounts are integer satang everywhere; `amount_satang > 0` is enforced by the DB.

## Dependencies

- `zustand` (state)
- `expo-crypto` (`randomUUID()` — Hermes has no `crypto.randomUUID`)
- No test framework: `node --test` for pure functions (built in), `sqlite3` CLI for SQL.

## Out of scope

UI/screens/navigation, theming, MMKV, backup/restore, import conflict resolution, transaction
editing (delete + re-add covers MVP), charts.

## Files touched by the schema change

`src/services/db/schema.ts`, `src/types/index.ts`, `App.tsx`, `scripts/check-phase1.mjs`, the Phase 1
design doc, and the vault DDL — all must agree on the new shape or the next phase inherits a lie.

## Risks

- Losing `current_balance_satang` makes `GET` on a single account a join; trivial at personal-ledger
  scale (hundreds of rows), revisit only if it ever measures slow.
- Derived balances cannot represent a balance a user typed without a matching transaction — hence
  reconcile always writes a row.
