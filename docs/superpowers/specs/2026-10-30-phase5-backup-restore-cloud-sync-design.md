# Phase 5 — Backup, Restore & Cloud Sync (Design)

Date: 2026-10-30
Status: implemented and verified on the Android emulator
Scope: Phase 5 of the roadmap — local JSON export/import and Google Sheets push backup.
No scheduling, no restore-replace mode, no encrypted transport yet.

## Intent

Phase 4 shipped a working app with a phone-only database. Phase 5 adds two disaster-recovery paths
that are deliberately different and deliberately non-destructive: a local JSON file people can move
between devices with the system share sheet, and a one-way push to the user's own Google Sheets through
an Apps Script Web App the user deploys themselves. The phone stays the source of truth in both cases —
nothing is written back from the cloud.

## Deliverables

| Path | Files | Notes |
|---|---|---|
| Local JSON envelope | `src/services/backup/format.ts` + `format.test.ts` | Envelope + validation + cross-row checks |
| Files + share sheet | `src/services/backup/files.ts` | `expo-file-system` File API + `expo-document-picker` + `expo-sharing` |
| Cloud push | `src/services/backup/cloud.ts` + `cloud.test.ts` | POST to Apps Script, timeout, error shapes |
| Merge into DB | `src/services/db/backup.ts` | `INSERT OR IGNORE` idempotent merge |
| Lifecycle hook | `src/hooks/useBackup.ts` | One hook, three flows |
| Settings UI | `src/app/(tabs)/settings.tsx` | Reuses Phase 4 endpoint/secret fields, adds two buttons |
| Apps Script | `backup/apps-script/Code.gs` + `README.md` | User deploys themselves, no platform dependency |

## Decisions

### 1. Versioned envelope, validated in one place

A backup file is not a raw dump of two tables. It is wrapped in:

```json
{
  "format": "pocket-ledger.backup",
  "version": 1,
  "exportedAt": "2026-10-30T10:00:00.000Z",
  "accounts": [...],
  "transactions": [...]
}
```

`BACKUP_FORMAT` and `BACKUP_VERSION` are constants in `format.ts`. A file is accepted only when both
match. That keeps a stray JSON file — or a future format — from being half-imported. The same module
is the single place that parses a file, so every row reaching SQLite has already been through
`parseBackup`.

The envelope also gives import a place to report a sensible error instead of crashing on a bad shape:
wrong format, wrong version, missing list, bad row, duplicate id.

### 2. Import is progressive — an old file must still restore

`parseBackup` fills in defaults for optional columns that older files may not have: `color_hex` defaults
to `#2E7D32`, `is_active` defaults to active. That way a file exported by an earlier version restores
without the user needing to re-export. Missing `created_at`/`updated_at` on accounts, and missing
`created_at` on transactions, also get a sensible fallback.

Required fields are still enforced strictly: id, name, the integer initial balance, the transaction id,
account, date, and positive integer amount. A transaction row must also pass the same business rule that
the app enforces when writing: a TRANSFER needs a destination that is not the source account; an amount
must be a positive integer.

### 3. Idempotent merge into SQLite — never destructive

`insertBackup` runs the whole restore in one `withTransactionAsync`. Inside it, accounts and transactions
are inserted with `INSERT OR IGNORE` keyed on the row id. The result counts only new rows. Importing the
same file twice is therefore a no-op the second time, and restoring into a partially-populated new device
only adds what is missing.

Nothing is ever deleted. The device's existing data survives an import untouched, so a wrong file cannot
wipe the ledger.

### 4. Cross-row reference check before any write

`missingAccountIds` walks the backup's transactions and reports any account id that a transaction points
at but that is neither in the file nor already on the device. The import hook checks this before calling
`insertBackup`, so a foreign file that references a missing account is rejected with a Thai toast that
names the missing-account count — not silently writing half a restore.

### 5. New native stack: `expo-file-system` File API, `expo-document-picker`, `expo-sharing`

The roadmap mentions "Native Share Sheet" but names no package. The implementation uses three Expo
modules that are already in the Expo family and fit the existing Expo Router stack:

- `expo-file-system` — the replacement is the `File` class (new API from Expo SDK 53+, not
  `FileSystem.writeAsStringAsync`). A backup file is created with `file.create({ overwrite: true })`,
  written with `await file.write(...)`, and read with `new File(uri).text()`.
- `expo-document-picker` — the system file picker for import. `copyToCacheDirectory: true` is set so the
  picked file's URI is readable by the `File` API immediately.
- `expo-sharing` — hands the written file to the system share sheet. `mimeType: 'application/json'` and
  `UTI: 'public.json'` are passed so share targets treat it as JSON.

`expo-file-system` and `expo-sharing` are installed alongside the project's existing `expo-sqlite`; they
were added because `expo-sqlite/kv-store` already includes a SQLite core that the whole app already
depends on. `expo-document-picker` is also added. All three are Expo-first, so they keep the app inside
the Expo ecosystem rather than pulling in a third-party file picker or sharing library.

Rebuild is required when a new native module is added. After `npx expo install` for the new modules, the
app is rebuilt with `npx expo prebuild --clean -p android` and a dev build is run on the emulator before
any on-device verification.

### 6. Cloud push is a single POST with a real timeout

`pushBackupToSheet` sends one `POST` with body `{ secret_key, timestamp, accounts, transactions }` to the
user's Apps Script Web App URL. The timeout is 10 seconds; the timeout is overridable so the timeout path
can be tested without waiting ten seconds in CI and on device.

The body shape is exported as `buildPushPayload` and asserted in a test, because the contract between the
app and the user's Apps Script is the one cross-boundary thing in this phase — if it drifts, the user's
spreadsheet silently rejects backups. `buildPushPayload` is part of the module interface, not an
implementation detail.

### 7. Apps Script always answers 200 — the app reads `status` from the body

Google Apps Script Web Apps always return HTTP 200, even for a rejected request. The app therefore does
not trust the HTTP status alone. It parses the JSON body for `status`, `count`, and `message`, and treats
any 200 with an `error` status as a failure. `readJson` deliberately returns `null` when the body is a
200 with an HTML response (a misconfigured deployment), so a "looks like a spreadsheet but is actually a
page" situation is treated as a failure with a generic "server replied" message rather than a misleading
success.

### 8. The Apps Script endpoint is the user's to deploy

`backup/apps-script/Code.gs` is a copy-paste endpoint. The user creates a Google Sheet, opens
Extensions → Apps Script, pastes the file, sets their own `SECRET_KEY`, and deploys it as a Web App with
"Execute as: Me, Who has access: Anyone". The app sends the same `secret_key` the user configured.
There is no OAuth in the app, no Google API key stored on the phone, and no Google credential anywhere in
the repo.

The Apps Script replaces the sheet contents on every backup rather than appending, so the spreadsheet is
always a mirror of the phone, not a log that drifts. `writeSheet` clears the sheet, writes the header row
in bold, and freezes the top row. Two sheets are maintained: `Accounts` and `Transactions`, with columns
matching the app's schema.

### 9. Every failure toast says the device data is still safe

Because the phone is the source of truth, every cloud error message ends with a reassurance: the data on
the device is still safe. That includes timeout, refused secret, non-2xx response, error-body response,
and connection failure. The local JSON flows have the same tone — export fails because sharing is not
available, import fails because the file is malformed or references a missing account.

## Verification (emulator-5554, dev build)

### Local JSON — export

1. On the Settings screen, tap **ส่งออกไฟล์**.
2. The system share sheet opens with one file selected:
   `pocket-ledger-backup-2026-10-30.json` (dated filename, so several exports can coexist).
3. The file content is the envelope with the current accounts and transactions.

Observed: share sheet appeared with the dated JSON file as the single share target —
`screenshots/phase5-share-sheet.png`.

### Local JSON — import

1. Push a valid `pocket-ledger-backup-test.json` into the device's Downloads with `adb push`.
2. On the Settings screen, tap **นำเข้าไฟล์**.
3. The system document picker opens; select the file.
4. Verify the DB through `adb exec-out run-as com.anonymous.pocketledger cat ...` and `sqlite3`.

Observed on device: import of 1 account + 2 transaction rows reported
"นำเข้าสำเร็จ: 2 รายการใหม่ · 0 บัญชีใหม่", and the DB afterwards contained exactly the accounts and
transactions from the file. Re-importing the same file reported "ข้อมูลในไฟล์มีอยู่ครบแล้ว" (idempotent).
Import of an empty file reported "ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Pocket Ledger" and left the DB unchanged.
Import of a file referencing a non-existent account reported "ไฟล์อ้างถึงบัญชีที่ไม่มีอยู่ในเครื่อง (N
บัญชี) — ยังไม่นำเข้า" and did not write.

Screenshots: `screenshots/phase5-import-toast.png`, and the DB state pulled from the device.

### Cloud push — end-to-end

1. Start a local fake Apps Script server that accepts a POST and echoes the body back as JSON (the
   `/exec`-style response the app parses).
2. In the app: Settings → Google Sheets backup → paste the server URL + a matching secret → **บันทึกการตั้งค่า**.
3. Tap **สำรองข้อมูลขึ้นคลาวด์**.
4. Watch the server log; it receives the full payload with `secret_key`, `timestamp`, `accounts`, and
   `transactions`.
5. The app shows the success toast with the count.

Observed: the server received

```json
{
  "secret_key": "test-secret",
  "timestamp": "2026-10-30T...",
  "accounts": [{ "id": "a1", "name": "Cash", ... }],
  "transactions": [{ "id": "t1", "account_id": "a1", ... }]
}
```

and the app showed `สำรองข้อมูลสำเร็จ (1 รายการ)`.

Screenshot: `screenshots/phase5-cloud-success.png`.

### Cloud push — empty URL guard

Without a URL, **สำรองข้อมูลขึ้นคลาวด์** shows "กรุณาระบุ Web App URL แล้วบันทึกก่อน" and does not
make a request. Verified on device via the toast text.

Screenshot: `screenshots/phase5-cloud-no-url.png`.

### Settings persistence quirks verified

- After entering endpoint + secret and tapping **บันทึกการตั้งค่า**, rearming the Settings screen still
  shows both values (they were written to `expo-sqlite/kv-store`).
- The secret field shows masked dots (`••••••••`), not the raw value, because `secureTextEntry` is set on
  the `TextField`.
- Clearing both fields, saving, and re-opening the screen shows both placeholders — the keys are removed
  from the store when written empty.

### Static checks

`npm run check`, `npm test` (24 tests: 3 in `format.test.ts`, 6 in `cloud.test.ts`, plus the existing
money/format tests), `npx tsc --noEmit`, and `npx expo lint` all pass.

## Out of scope

- Scheduled / automatic backups.
- Restore mode that replaces the device's data with the file — import is always additive (`INSERT OR IGNORE`).
- Encrypted transport — the Apps Script is HTTPS, and the only shared secret is the user-chosen `secret_key`.
- Pulling from the sheet back into the app — the cloud path is push-only; the sheet is a mirror, not a source of truth.
- Any Google credential stored in the app or the repo.
- Conflict resolution between two devices that both push to the same sheet — that is the user's spreadsheet to manage.

## Follow-ups this change forces

- The user still needs to deploy their own Apps Script and paste the URL + secret — the app cannot do that
  for them, and `backup/apps-script/Code.gs` is the only artifact that lives outside the app bundle.
- If the `File` / `DocumentPicker` / `Sharing` APIs ever change across an SDK bump, the backup file I/O
  is the module to revisit (it is the only place using those three new native modules).
- If the payload shape ever changes, both `buildPushPayload` and `Code.gs` must change together — they are
  the cross-boundary contract.
