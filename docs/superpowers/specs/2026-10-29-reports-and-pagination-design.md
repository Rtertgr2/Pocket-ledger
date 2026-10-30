# Reports, Categories & Ledger Paging — Design (MonySave / Pocket Ledger)

Date: 2026-10-29
Status: implemented and verified on `emulator-5554`
Scope: the two gaps left after Phase 4 — per-day / per-category expense charts, and paging for
the transaction list. The home-screen quick-entry widget is **not** part of this change (see
"Open question").

## Intent

The ledger could record and list money but never *show* it: no report of what a month cost, no
split by category, and the transaction screen read a fixed window of rows with no way to reach
older history. This change closes those two gaps without adding a chart library, a native module
or a new storage shape.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | `transactions.category TEXT` (nullable), added by migration 2 | Categories did not exist in the Phase 1 DDL. A nullable column keeps existing rows valid; NULL groups under one "ไม่ระบุหมวด" label. |
| 2 | Fixed list in `src/categories.ts`, not a `categories` table | No rename, no per-user ordering, no delete — a table would add joins for zero capability. TypeScript owns the vocabulary; SQL stores free text so a rename is a display concern. |
| 3 | Migration keyed by `PRAGMA user_version` (`SCHEMA_VERSION = 2`) | The device already had a v1 database. `DDL` is `CREATE ... IF NOT EXISTS`, so a fresh install gets the new shape and only upgrades run `ALTER TABLE`. |
| 4 | Charts drawn with plain `<View>`s, no SVG / chart library | 31 bars and 5–9 share bars are cheap; a chart dependency would be a native module and a rebuild. Colours come from the palette, so dark mode is free. |
| 5 | `listExpensesInRange` mirrors `sumExpensesInRange`'s WHERE clause | A chart that disagrees with the burn rate is a bug report waiting to happen. Same filters, one source of truth for "eligible expense". |
| 6 | Reports read the DB directly (`useFocusEffect`), not the store | The report is a month-scoped projection, not app state; it must not be invalidated by an unrelated write. |
| 7 | Paging = `LIMIT 51 OFFSET n`, keep 50 | The 51st row is the `hasMore` signal, so no `COUNT(*)` query per page. |
| 8 | Store holds only the pages loaded so far; every write re-reads page 1 | Paging state stays in one place, and a delete cannot leave a hole in the list. |
| 9 | Picker is optional and expense-only | Income categories would need their own vocabulary; the charts only break down expenses, so income would be a dead column value. |

## Files

```text
src/categories.ts                       fixed expense categories + label fallback
src/services/db/schema.ts               SCHEMA_VERSION 2, category column, MIGRATIONS, initDatabase
src/services/db/transactions.ts         category on insert; listTransactions(limit, offset); listExpensesInRange
src/utils/reports.ts                    dailyExpenseTotals / categoryTotals / peakDailyTotal (pure, node-tested)
src/utils/reports.test.ts               5 tests over the aggregation
src/store/slices/transactionSlice.ts    LEDGER_PAGE_SIZE, hasMore, loadMoreTransactions
src/components/reports/DailyBarChart.tsx
src/components/reports/CategoryBreakdown.tsx
src/app/(tabs)/reports.tsx              month switcher, summary, both charts
src/app/(tabs)/transactions.tsx         onEndReached paging + footer states
src/app/(tabs)/_layout.tsx              third tab
src/app/add.tsx                         category chips on the expense form
src/components/transactions/TransactionItem.tsx   category in the row subtitle
```

## Verification (emulator-5554)

1. `npx tsc --noEmit`, `npx expo lint`, `node --test` (12 tests), `npm run check` — all pass.
2. **Migration on the real device:** the existing v1 database came back as `user_version = 2`
   with `category` present in `table_info(transactions)`, and the one pre-existing row survived.
3. **Charts:** with 32 October expenses the report showed ฿942.34 total, ฿30.40/day
   (94234/31 satang, rounded), 5 category shares summing to 100%, and a 31-bar chart.
   Switching to September showed ฿1,931.25 over 30 items and ฿64.38/day.
4. **Paging:** with 61 rows the list opened on "50 รายการล่าสุด · เลื่อนลงเพื่อดูเพิ่ม";
   scrolling to the end appended the remaining 11, the header became "61 รายการล่าสุด" and the
   footer read "สิ้นสุดรายการ".
5. **Category write:** picking อาหาร in the add form stored `category = 'อาหาร'` in SQLite and
   the report total/category row updated on focus.
6. Test rows (60 seeded + 3 manual) were deleted afterwards; the device is back to one account
   (฿500.00) and one ฿500 income row.

## Quick entry from the home screen — resolved to launcher shortcuts

Two different products were hiding behind "widget": launcher shortcuts and a real home-screen
widget. Chosen: **launcher shortcuts** (`expo-quick-actions@6.0.2`, the only version on npm; its
README's version table stops at SDK 57, and it builds and runs fine on this SDK 58 / RN 0.88
project). A real widget (`react-native-android-widget`) would need a Glance surface plus a
background SQLite reader — deferred until it is actually asked for.

- `src/app/_layout.tsx` registers two actions in `useEffect`: `เพิ่มรายจ่าย` → `/add` and
  `โอนเงิน` → `/transfer`, with `params.href`, and mounts `useQuickActionRouting()`.
- Registration is guarded by `QuickActions.isSupported()` and a `try/catch` that logs a warning:
  a launcher that refuses shortcuts must not take the ledger down with it.
- Adding `expo-quick-actions` is a native module, so `prebuild --clean -p android` and a fresh
  dev build were required; the config plugin is registered in `app.json`.
- Verified on device: `dumpsys shortcut` lists both with the right labels, long-pressing the
  launcher icon shows both entries, and each opens the matching modal (`เพิ่มรายจ่าย` → the
  category form, `โอนเงิน` → the two-account guard, since only one account exists).

## Left for later

- Category filtering / editing an existing transaction's category.
- Category colours (the breakdown uses one accent for every bar).
- A `hasMore` cursor (`transaction_date, id`) instead of `OFFSET`, if the ledger ever gets large
  enough that offset paging skips rows under concurrent writes.
