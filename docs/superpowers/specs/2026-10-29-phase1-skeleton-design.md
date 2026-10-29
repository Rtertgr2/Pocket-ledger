# Phase 1 Skeleton — Design (MonySave / Pocket Ledger)

Date: 2026-10-29
Status: implemented and verified (Phase 1 complete; see Verification)
Scope: Phase 1 only (scaffold + types + SQLite DDL + data self-check). No UI, no store, no backup.

## Intent

Get a runnable Expo TypeScript app whose local database creates cleanly and survives a
record/read round trip, so Phase 2 (Zustand + math) has a proven foundation.

Source of truth for behaviour: `system_workflow_technical_design_specification.md` and
`project_task_breakdown_roadmap.md` in the memory vault. This doc records only what
changed and what Phase 1 covers.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | Money stored as **integer satang** (1 baht = 100), not `REAL` | Exact arithmetic, no floating-point drift on repeated add/subtract. Supersedes the `REAL` DDL in the spec. |
| 2 | Columns renamed `*_satang` (`amount_satang`, `initial_balance_satang`, `current_balance_satang`) | A suffix makes "is this baht or satang?" impossible to get wrong at a call site. |
| 3 | `ROUND(SUM(...), 2)` dropped from the spec's SQL rules | Integers sum exactly; rounding is now only a display concern. |
| 4 | Scaffold via `create-expo-app --template blank-typescript`, then `expo-sqlite` only | Matches spec layout. Zustand (Phase 2) and MMKV (Phase 4) stay uninstalled until needed. |
| 5 | DDL lives as plain exported SQL strings in `schema.ts`, with **no expo-sqlite import**; `client.ts` opens the DB and runs them | Lets the same DDL be executed by the host `sqlite3` CLI for verification, without a device. |
| 6 | App scaffolded into a temp dir then moved into this repo root | `create-expo-app` refuses a non-empty directory, and `docs/` will already exist here. |
| 7 | Toolchain = **Android command-line tools only** (no Android Studio), JDK 17 | No custom native code in this project, so the IDE buys nothing here. ~700 MB instead of ~4 GB. Studio's device inspector is replaced by `adb` + pulling the `.db` into `sqlite3`. |

## Out of scope

Balances recompute on import, reconciliation UI, navigation, theming, GAS sync, CI, account
delete/edit.

## Phase 0 — toolchain setup (prerequisite for on-device verification)

Machine: EndeavourOS, 12 cores, 31 GB RAM, `/dev/kvm` present and world-writable, 494 GB free.
`jdk17-openjdk` is in `extra`.

1. `sudo pacman -S jdk17-openjdk` — **needs your password; I cannot run sudo.**
2. I download `commandlinetools-linux-*.zip` from Google into `~/Android/Sdk/cmdline-tools/latest`.
3. I run `sdkmanager` for: `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`,
   `emulator`, `system-images;android-36;google_apis;x86_64`.
4. I create one AVD (`avdmanager`) and boot it.
5. Set `ANDROID_HOME` + `PATH` in `~/.bashrc` (or `~/.zshrc` — confirm which shell).

Steps 2–5 are scripted, so they are reproducible on any machine; the SDK lives in `~/Android/Sdk`
outside this repo and is not committed.

## Money rules (the part Phase 2 will depend on)

- Parse user text: strip thousands separators, accept `,` or `.` as the decimal mark,
  keep at most 2 decimal digits, then build the integer from digits — **no float
  multiplication**. `"1,234.56"` → `123456`, `"12"` → `1200`, `"0.005"` → rejected/rounded
  down to `0` (documented in one line at the function).
- Format for display only: `(satang / 100).toFixed(2)`.
- Daily burn rate is computed in satang and kept integer (`Math.round`), formatted at render.

## Files

```text
src/types/index.ts            Account, Transaction, TransactionType, CreateTransactionDTO,
                              TransferFundsDTO, ReconcileBalanceDTO (satang fields)
src/services/db/schema.ts     DDL statements + initDatabase(db), no expo-sqlite runtime import
src/utils/money.ts            parseAmountToSatang / formatSatang
App.tsx                       <SQLiteProvider onInit={initDatabase}>, counts + demo insert
scripts/check-phase1.mjs      DDL + constraints + balances + money parsing on a temp sqlite3 DB
```

`client.ts` from the first draft was dropped: `<SQLiteProvider onInit={initDatabase}>` already owns
the connection, so a separate open helper would be dead code. `npm run check` runs the self-check,
`npm run typecheck` runs `tsc --noEmit`.

DDL keeps the spec's three tables, indexes, `CHECK (amount_satang > 0)`, and `PRAGMA
foreign_keys = ON`, with the two documented risks fixed: deleting an account is soft
delete only (`is_active = 0`), and `destination_account_id` is **not** `ON DELETE SET NULL`
(it keeps `ON DELETE RESTRICT`) so a deleted account can never orphan a transfer.

## Verification

1. `npx tsc --noEmit` clean.
2. `node scripts/check-phase1.mjs` — creates temp DB, seeds 2 accounts, inserts
   expense/income/transfer, asserts: balances match, transfer has no effect on monthly
   expense sum, `CHECK` rejects amount 0, foreign key rejects unknown account.
3. `npx expo run:android` on the emulator — account + transaction survive an app reload
   (proves `expo-sqlite` persistence, not just syntax). Then `adb exec-out run-as` / Device
   Explorer equivalent to pull the `.db` and confirm rows in `sqlite3`.

## Known environment gotcha (found while building)

`npx expo run:android` fails on this machine with
`Invalid Timestamp -16816402800000 for 'zip entry ...expo-modules-v2-react-0.2.6-cpp.zip!CMakeLists.txt'`.
Cause: Gradle 9.4.1 decodes zip DOS timestamps with the JVM default locale, and the machine's
`LANG=th_TH.UTF-8` (Buddhist calendar) yields a negative epoch for the `1980-02-01` entries in
that artifact; Gradle 9 rejects negative entry timestamps. `TZ` is irrelevant. Fixed by running
the build with `LANG=C` (or `en_US.UTF-8`). CI uses a C locale, so this does not affect the
Phase 6 pipeline.

## Follow-ups this change forces

- Memory vault spec docs still say `REAL` and `ROUND(SUM(...),2)`; they must be updated or
  they will contradict the code. I will update those two sections as part of the work.

## Risks / left to builder

- Field suffix change is permanent API surface; cheap now, expensive after Phase 2.
- MMKV will need a dev build (not Expo Go) — already true per spec's `expo run:android`.
- **Navigation conflict:** this repo's `AGENTS.md` mandates Expo Router (routes under `src/app/`),
  while the memory-vault roadmap says React Navigation + `src/navigation/RootNavigator.tsx`.
  Phase 1 has no navigation, so nothing is blocked; Phase 3 must pick one. Expo Router is the
  cheaper choice (file-based routes, no extra deps) and is what the repo rules require.
- Scaffolded with Expo SDK 58 / RN 0.88 / expo-sqlite 58.0.14 — newer than the spec assumed, so
  any old snippet from the vault should be checked against the v58 docs before use.
