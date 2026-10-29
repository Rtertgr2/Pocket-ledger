# Phase 4 — Settings, Theme & Account Management (Design)

Date: 2026-10-29
Status: implemented and verified on the Android emulator
Scope: Phase 4 of the roadmap — theme, settings storage, account management, backup endpoint fields.
No upload logic (Phase 5), no charts, no pagination.

## Intent

Phase 3 shipped a usable app with one hardcoded light theme and no way to retire an account. Phase 4
makes the app livable: pick light/dark/system, keep settings on the device, rename or recolour an
account, and stop using one without losing its history.

## Decision: `expo-sqlite/kv-store` instead of MMKV

The roadmap asks for `react-native-mmkv`. Rejected in favour of a store that is already installed:

| | MMKV (roadmap) | expo-sqlite/kv-store (chosen) |
|---|---|---|
| Native module | new module + Nitro dependency | already inside `expo-sqlite` 58.0.14 |
| API | sync | sync (`getItemSync`/`setItemSync`) **and** async |
| First paint | needs a sync read | sync read, same |
| Rebuild risk | new autolinking surface | none |

`src/services/storage/settings.ts` wraps it with typed accessors:

- `readThemeMode()` / `writeThemeMode('light' | 'dark' | 'system')` — defaults to `system`
- `readBackupEndpoint()` / `readBackupSecret()` / `writeBackupConfig(endpoint, secret)`

Keys live in one `KEYS` object. Nothing else in the app reads the store directly.

## Decision: palettes + `makeStyles`, not a global mutable colour object

`StyleSheet.create` freezes values at module load, so a theme switch cannot work by swapping a
module-level `colors` object. Instead:

- `src/theme.ts` exports `palettes: Record<'light' | 'dark', Palette>` plus spacing/radius and
  `ACCOUNT_COLORS`. A `Palette` carries `bg/surface/surfaceMuted/border/primary/primarySoft/text/
  muted/income/expense/transfer/onPrimary/onPrimaryMuted/overlayBg/overlayText`.
- `src/providers/ThemeProvider.tsx` owns the mode, resolves `scheme` from `useColorScheme()` when the
  mode is `system`, and calls `Appearance.setColorScheme(mode === 'system' ? 'auto' : mode)` so
  native chrome (alerts, keyboard, status bar) matches the JS palette.
- `makeStyles((palette) => ({...}))` returns a hook that memoises the style object per palette, and
  its constraint mirrors RN's own `StyleSheet.create` typing so invalid styles still fail the build.
  Every component now does `const styles = useStyles()`.

`StyleSheet.create` is an identity function in RN 0.88 (`<S extends ____Styles_Internal>(obj: S &
____Styles_Internal) => Readonly<S>`), so `makeStyles` returns the factory result directly and the
constraint — not `create` — is what keeps typos out.

Dark palette is chosen for contrast, not by inverting: `primary` lifts to `#3E9B46`, `income` to
`#5DBE62`, `expense` to `#EF6B6B`, page `#0F1214`, cards `#191E22`. The toast uses an inverted
`overlayBg`/`overlayText` pair so one component reads correctly in both schemes.

## Account management

- `updateAccount(db, { id, name?, color_hex?, is_active? })` builds a parameterised `SET` from the
  fields actually provided; accounts are still never `DELETE`d (Phase 1 rule).
- `src/app/account/[id].tsx` is the edit modal: balance summary, rename, colour swatch, and a
  deactivate/reactivate button. Deactivating keeps every transaction, removes the account from the
  dashboard total and from every account picker (they filter `is_active = 1`).
- `src/app/account/new.tsx` now also picks a card colour.

## Verification (emulator-5554, dev build)

Asserted by sampling screenshot pixels with ImageMagick, and by reading the two SQLite files
(`pocket-ledger.db` for ledger data, `ExpoSQLiteStorage` for settings) after each step.

| Case | Observed |
|---|---|
| Theme = มืด | page `#0F1214`, card `#191E22`, hero `#3E9B46`, tab bar `#191E22`; radio `selected=true` |
| Restart while dark | page still `#0F1214`; KV `settings.themeMode = dark` before the switch back |
| Theme = ตามระบบ | page `#F4F6F8`; `adb shell cmd uimode night yes` → page `#0F1214`; `night no` → back to light, no restart |
| Recolour account | `accounts.color_hex` `#2E7D32` → `#2B6CB0` |
| Deactivate | `is_active = 0`; settings row shows "ปิดใช้งาน"; dashboard total ฿0.00, 0 accounts, onboarding card |
| Reactivate | `is_active = 1`; dashboard back to ฿500.00, 1 account |
| Backup fields | typed URL + secret → KV has `settings.backupEndpoint` / `settings.backupSecret`; after restart the URL is restored and the secret shows as `••••••` |

`npm run check`, `npm test` (7 tests), `npx tsc --noEmit`, `npx expo lint` all pass; the build was
regenerated with `expo prebuild --clean -p android` because `expo-system-ui` is a new native module.

## Out of scope (unchanged)

Google Sheets upload (Phase 5), local JSON export/import (Phase 5), charts, pagination beyond 200
rows, account deletion (forbidden by design), per-account icons (colour only).

## Follow-ups this change forces

- `Skill.md` in the vault still numbers CI/CD as "Phase 5" while the roadmap calls it Phase 6; fixed in
  the same pass as this phase.
- Dark-mode contrast was checked by palette + pixel sampling, not by a contrast-ratio tool; the
  `muted` text on `surfaceMuted` is the pair most worth measuring if accessibility matters later.
