# Phase 3 — Interactive UI (Design)

Date: 2026-10-29
Status: implemented and verified on the Android emulator
Scope: Phase 3 of the roadmap — screens, navigation, modals. No theming, backup or charts.

## Intent

Phase 2 proved the money rules headlessly. Phase 3 lets a person use them: see balances, log an
entry in three taps, move money between accounts, reconcile a real balance, browse history.

## Decision: Expo Router, not React Navigation

Phase 1 flagged the conflict between `AGENTS.md` (routes in `src/app/`, Expo Router) and the
roadmap (React Navigation + `src/navigation/RootNavigator.tsx`). Expo Router wins:

| | React Navigation (roadmap) | Expo Router (chosen) |
|---|---|---|
| File layout | `src/screens/*` + one navigator file | `src/app/**` is the route tree |
| Deep links | extra linking config | derived from the file tree |
| Repo rules | contradicts `AGENTS.md` | matches it |

Consequence: `App.tsx` and `index.ts` are gone; `package.json#main` is `expo-router/entry`, and the
root layout owns the database provider. The roadmap's `src/screens/` folder never appears.

## Routes

```
src/app/_layout.tsx          SafeAreaProvider → SQLiteProvider(onInit) → ToastProvider → Stack
src/app/(tabs)/_layout.tsx   bottom tabs: ภาพรวม / รายการ / ตั้งค่า
src/app/(tabs)/index.tsx     dashboard
src/app/(tabs)/transactions.tsx  full history, day sections
src/app/(tabs)/settings.tsx  accounts list, future work
src/app/add.tsx              modal: income / expense
src/app/transfer.tsx         modal: transfer between accounts
src/app/reconcile.tsx        modal: reconcile to actual balance
src/app/account/new.tsx      modal: create account
```

Modals are stack entries with `presentation: 'modal'`; every one closes with `router.back()` and a
toast fired from the provider above the stack, so the confirmation survives the dismissal.

## Store change

`transactionSlice` previously exposed only `recent: Transaction[]` (5 rows). The history screen
needs the ledger, so it now exposes:

- `transactions: Transaction[]` — newest first, capped at 200 (`listTransactions(db, limit)`)
- `monthExpenseSatang` — the burn-rate numerator, shown next to the rate
- `fetchTransactions`, `fetchBurnRate`, `refreshAll(db)` (accounts + ledger + burn rate)

Screens call `refreshAll` on focus, so a modal write is reflected the moment it closes. Writes stay
pessimistic: DB first, then re-read, then state.

## Presentation rules

- Money is formatted once, at render: `formatSatangGrouped` / `formatBaht` add thousands
  separators and `฿`. Arithmetic stays integer satang.
- Burn-rate card always carries the spec-mandated label "อัตราการใช้เงินเทียบงบทั้งเดือน", so a low
  number early in the month is explained rather than surprising.
- Type colour is one map (`theme.typeColor`): green income, red expense, blue transfer.
- Deleting is long-press → `Alert` confirm, never a swipe that can fire by accident.
- Amounts are typed on a decimal pad into a single focused field; the save button is always visible.

## Two problems the device found

1. **The save button sat behind the keyboard.** With edge-to-edge enabled (RN 0.88 / SDK 58),
   `windowSoftInputMode="adjustResize"` no longer resizes the window and `KeyboardAvoidingView` has
   no Android behaviour to apply. `FormScreen` therefore listens to `keyboardDidShow`/`DidHide` and
   pads the footer by the reported IME height. Verified by dumping the view tree: the button moved
   from y≈2278 (below the keyboard) to y≈1616 (above it).
2. **`npm install` failed after adding expo-router.** `@expo/metro-runtime` pulls `react-dom`, whose
   19.3.1 release peers on `react@^19.3.1`, while Expo SDK 58 pins `react@19.3.0`. `package.json`
   now overrides `react-dom` to `19.3.0`; the tree installs cleanly and native builds are unaffected
   (web is not a target).

## Verification (emulator-5554, dev build)

Click-through on a cleared install, asserting with `uiautomator dump` and the pulled SQLite file:

| Case | Observed |
|---|---|
| Fresh install, no accounts | onboarding card, total ฿0.00, "ยังไม่มีรายการ" |
| Create account `Cash` from onboarding | 1 account, total ฿0.00 |
| INCOME 500 on Cash | total ฿500.00, burn rate unchanged ฿0.00 |
| EXPENSE 125.50 on Cash | total ฿334.50, month expenses ฿165.50, burn rate ฿5.34 |
| Transfer 50 KBank → Cash | both balances move, total and burn rate unchanged |
| Reconcile KBank to 1900 from 1950 | preview −฿50.00, saved as excluded EXPENSE, burn rate unchanged |
| Reconcile to the identical balance | "ยอดตรงกับในระบบแล้ว", save disabled, no row written |
| Delete that reconciliation row (long-press) | KBank returns to ฿1,950.00 with no rollback code |
| Transfer with one account | "ต้องมีอย่างน้อย 2 บัญชีจึงจะโอนเงินได้" |
| History screen | day sections ("วันนี้"), 5 rows, transfer rendered as `KBank → เงินสด` |

`npm run check`, `npm test` (7 tests), `npx tsc --noEmit`, `npx expo lint` all pass.

## Out of scope (unchanged)

Theme/dark mode, MMKV settings, backup/restore, Google Sheets sync, charts, transaction editing,
account deactivation UI, pagination beyond the 200-row cap.

## Follow-ups this change forces

- The roadmap and vault docs still say React Navigation and `src/screens/`; they must be updated or
  the next agent will rebuild the navigator by hand.
- `app.json` sets `userInterfaceStyle: light` but `expo-system-ui` is not installed (prebuild warns).
  Either install it or drop the key when Phase 4 adds theming.
