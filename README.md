# Pocket Ledger · ป็อกเก็ตเลดเจอร์

แอปบันทึกรายรับ–รายจ่ายที่ทำงานออฟไลน์ 100% บน Android · An offline-first Android ledger for personal spending.

[ไทย](#ภาษาไทย) · [English](#english)

---

## ภาษาไทย

### แนวคิด

แอปนี้ถือว่า **"เครื่องคือแหล่งความจริง"** ข้อมูลทั้งหมดอยู่ใน SQLite บนมือถือ ออฟไลน์เต็มรูปแบบ
ไม่มีการล็อกอิน ไม่มีเซิร์ฟเวอร์ ไม่มีค่าใช้จ่ายรายเดือน — การสำรองข้อมูลเป็นการส่งออกไฟล์กับ
การ push ไปสเปรดชีตของผู้ใช้เองเท่านั้น

### ความสามารถ

- **บันทึกรายการ** — รายรับ / รายจ่าย / โอนระหว่างบัญชี พร้อมหมวดหมู่คงที่ 7 หมวด
- **ยอดคงเหลือคำนวณสด** — ไม่เคยเก็บยอดไว้ในฐานข้อมูล คำนวณจาก `initial_balance + รายการทั้งหมด`
  ผ่าน SQL view ทุกครั้ง จึงไม่มีปัญหา "ยอดค้างไม่ตรงกับรายการ"
- **หลายบัญชี** — ตั้งสี/ไอคอนได้ ปิดใช้งานบัญชีแบบ soft delete (ประวัติไม่หาย)
- **ภาพรวม** — ยอดรวม, การ์ดรายบัญชี, Daily Burn Rate (รายจ่าย ÷ จำนวนวันในเดือน), วงแหวนรายจ่ายวันนี้
- **รายงานรายเดือน** — กราฟแท่งรายวัน, สัดส่วนตามหมวด, เลื่อนดูเดือนก่อน/ถัดไปได้
- **รายการแบบแบ่งหน้า** — โหลดทีละหน้าและลบได้ทันที
- **ธีม** — สว่าง / มืด / ตามระบบ (ตรวจ contrast อัตโนมัติใน CI)
- **ทางลัดจาก launcher** — กดค้างที่ไอคอนแอปเพื่อเข้าหน้ากรอกเร็ว
- **สำรองข้อมูล 2 ทาง**
  - ไฟล์ JSON ผ่านแผงแชร์ของเครื่อง (นำเข้ากลับแบบ *เพิ่มอย่างเดียว* ไม่ทับข้อมูลเดิม)
  - push ขึ้น Google Sheets ผ่าน Apps Script ที่ผู้ใช้ deploy เอง — [`backup/apps-script/`](backup/apps-script/README.md)
- **ตรวจอัปเดตในแอป** — อ่าน manifest เวอร์ชันล่าสุดจากช่องทางอัปเดตของแอปเอง เทียบเวอร์ชัน แล้วเปิดเบราว์เซอร์ไปดาวน์โหลด APK

### เทคโนโลยี

| ชั้น | ที่ใช้ |
|---|---|
| Framework | Expo SDK 58 · React Native 0.88 · React 19 |
| Routing | Expo Router (ไฟล์ใน `src/app/` คือหน้าจอ) |
| ฐานข้อมูล | `expo-sqlite` — schema v2, เงินเก็บเป็น `INTEGER` สตางค์ |
| State | Zustand 5 (slice แยกบัญชี / รายการ) |
| ตั้งค่า | `expo-sqlite/kv-store` (ไม่ต้องเพิ่ม native module) |
| ภาษา | TypeScript strict |
| สถิติ | `node --test` (ไม่ต้องใช้ test runner เพิ่ม) |

### เริ่มใช้งาน

ต้องมี Node.js 22+ (ทดสอบบน 24), JDK 17 และ Android SDK

```bash
npm install

# เครื่องนี้ต้องกำหนด SDK path และ locale (Gradle พังถ้า locale เป็นไทย)
ANDROID_HOME=$HOME/Android/Sdk LANG=C npx expo run:android --device emulator-5554
```

หลังเพิ่ม native module ต้องสร้างโปรเจกต์ Android ใหม่: `npx expo prebuild --clean -p android`
(`android/` ถูก gitignore — สร้างจาก `app.json` + config plugin เท่านั้น ห้ามแก้ด้วยมือ)

### คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm start` | เปิด dev server (Metro) |
| `npm run android` | build + ติดตั้งลงเครื่อง/อีมูเลเตอร์ |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | unit test ของเงิน, การคำนวณ, รายงาน, backup, update check |
| `npm run check` | ตรวจ schema/constraint/ยอดคงเหลือ + ตรวจ contrast ของธีม |
| `npm run lint` | `expo lint` |

### โครงสร้างโปรเจกต์

```text
src/
├── app/                 # หน้าจอ (Expo Router) — (tabs)/index|transactions|reports|settings
│                        #   modal: add, transfer, reconcile, account/new, account/[id]
├── components/          # common / dashboard / reports / transactions
├── hooks/               # useBackup, useDeleteTransaction, useReducedMotion
├── providers/           # ThemeProvider
├── services/
│   ├── db/              # schema, query, backup merge, reset
│   ├── backup/          # format (envelope + validation), files, cloud
│   ├── storage/         # settings (kv-store)
│   └── updates/         # GitHub Releases check
├── store/               # Zustand root + slices
└── utils/               # money (สตางค์), calculations, reports, formatters
backup/apps-script/      # Code.gs + วิธีติดตั้ง Google Sheets backup
plugins/                 # config plugin: release signing
scripts/                 # check-phase1, check-contrast, stamp-version
```

### เงินและความถูกต้องของตัวเลข

- เก็บเป็นจำนวนเต็ม **สตางค์** (`amount_satang`) ไม่ใช้ `REAL` — ไม่มีปัญหาทศนิยมลอยตัว
- ยอดคงเหลือมาจาก view `v_account_balances` ไม่ใช่คอลัมน์ที่ต้องอัปเดตตามกัน
- ตรวจข้อมูลที่ฐานข้อมูล: `amount_satang > 0`, `type IN (INCOME, EXPENSE, TRANSFER)`,
  `TRANSFER` ต้องมีปลายทางและห้ามเป็นบัญชีเดียวกัน, ลบบัญชีไม่ได้ถ้ายังมีรายการ (`ON DELETE RESTRICT`)
- รายการที่ตั้ง `is_excluded_from_average` จะไม่ถูกนับใน Daily Burn Rate

### การปล่อย APK

```bash
git tag v1.0.0 && git push origin v1.0.0
```

workflow [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml) จะรัน check → stamp
เวอร์ชันจาก tag → `expo prebuild` → เซ็นด้วย keystore จาก repository secrets → แนบ
`pocket-ledger-<version>.apk` เข้า GitHub Release แบบ `--latest`

- การเซ็นถูก inject โดย [`plugins/withReleaseSigning.js`](plugins/withReleaseSigning.js) (อ่านรหัสจาก env
  ไม่เก็บความลับในไฟล์) ถ้าไม่มี `KEYSTORE_FILE` การ build ในเครื่องจะ fallback ไป debug key
- **สถานะปัจจุบัน:** GitHub ปิด Actions ให้บัญชีนี้ (`HTTP 422 Actions has been disabled for this user`)
  และบัญชีถูกซ่อนจากผู้ไม่ได้ล็อกอิน (404) — workflow จึงยังรันไม่ได้ และ release บน GitHub มือถือก็เข้าไม่ถึง

ทางที่ใช้ได้จริงตอนนี้คือ **ช่องทางอัปเดตของแอปเอง** (`update-feed/` — Worker + R2 บน Freebuff Sites):

```bash
# build arm64 ตัวเดียว (~31MB) แล้วอัปโหลด APK + manifest
UPLOAD_TOKEN=$(cat .secrets/upload-token.txt) \
  node scripts/publish-feed.mjs android/app/build/outputs/apk/release/app-release.apk 1.0.1 "notes"
```

สัญญาของ feed และวิธีหมุน token อยู่ใน [`update-feed/README.md`](update-feed/README.md) · เบอร์ชั่นปัจจุบันบน feed: **1.0.1**

### เอกสารเพิ่มเติม

- [`AGENTS.md`](AGENTS.md) — กติกาการทำงานกับโปรเจกต์นี้ (Expo, การปล่อย APK, keystore)
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — design ของแต่ละ phase
- [`backup/apps-script/README.md`](backup/apps-script/README.md) — วิธี deploy endpoint สำรองข้อมูล

---

## English

### Idea

The phone is the source of truth. Every row lives in SQLite on the device; the app is fully
offline, has no accounts, no server and no subscription. Backups are an exported file and an
optional push into a spreadsheet you deploy yourself.

### Features

- **Transactions** — income, expense and transfers between accounts, with seven fixed expense categories
- **Derived balances** — balances are never stored: a SQL view adds the opening balance and every
  transaction that touches the account, so a balance can't drift from the ledger
- **Multiple accounts** — colour and icon per account, deactivation is a soft delete so history survives
- **Dashboard** — total balance, per-account cards, daily burn rate, today's spending ring
- **Monthly reports** — daily bars and category breakdown, paged month by month
- **Paged transaction list** — loads a page at a time and deletes in place
- **Theming** — light, dark or system, with an automated contrast check
- **Launcher shortcuts** — long-press the app icon to jump into quick entry
- **Two backup paths**
  - JSON file through the system share sheet; import is *additive only* (`INSERT OR IGNORE`), so a wrong file cannot wipe the ledger
  - Push to Google Sheets through an Apps Script endpoint you deploy — see [`backup/apps-script/`](backup/apps-script/README.md)
- **In-app update check** — reads the app's own update manifest, compares versions and opens the APK in the browser

### Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 58 · React Native 0.88 · React 19 |
| Routing | Expo Router (every file in `src/app/` is a screen) |
| Database | `expo-sqlite` — schema v2, money stored as `INTEGER` satang |
| State | Zustand 5, split into account and transaction slices |
| Settings | `expo-sqlite/kv-store` (no extra native module) |
| Language | TypeScript, strict |
| Tests | `node --test` (no extra test runner) |

### Getting started

Requires Node.js 22+ (developed on 24), JDK 17 and the Android SDK.

```bash
npm install

# This machine needs the SDK path and a non-Thai locale (Gradle's zip timestamps break otherwise)
ANDROID_HOME=$HOME/Android/Sdk LANG=C npx expo run:android --device emulator-5554
```

`android/` is generated and gitignored — after adding a native module run
`npx expo prebuild --clean -p android` instead of editing it by hand.

### Scripts

| Command | What it does |
|---|---|
| `npm start` | Metro dev server |
| `npm run android` | Build and install on a device or emulator |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests for money, calculations, reports, backup and the update check |
| `npm run check` | Schema/constraint/balance checks plus the theme contrast audit |
| `npm run lint` | `expo lint` |

### Project layout

```text
src/
├── app/                 # screens (Expo Router) — (tabs)/index|transactions|reports|settings
│                        #   modals: add, transfer, reconcile, account/new, account/[id]
├── components/          # common / dashboard / reports / transactions
├── hooks/               # useBackup, useDeleteTransaction, useReducedMotion
├── providers/           # ThemeProvider
├── services/
│   ├── db/              # schema, queries, backup merge, reset
│   ├── backup/          # format (envelope + validation), files, cloud
│   ├── storage/         # settings (kv-store)
│   └── updates/         # GitHub Releases check
├── store/               # Zustand root + slices
└── utils/               # money (satang), calculations, reports, formatters
backup/apps-script/      # Code.gs + Google Sheets backup setup
plugins/                 # config plugin: release signing
scripts/                 # check-phase1, check-contrast, stamp-version
```

### Money and correctness rules

- Money is an integer number of **satang** (`amount_satang`), never `REAL` — no floating-point drift
- Balances come from the `v_account_balances` view rather than a column that several writes must keep in sync
- The database enforces the rules: `amount_satang > 0`, `type IN (INCOME, EXPENSE, TRANSFER)`,
  a `TRANSFER` needs a different destination account, and an account with transactions cannot be
  deleted (`ON DELETE RESTRICT`)
- Rows flagged `is_excluded_from_average` are left out of the daily burn rate

### Releasing an APK

```bash
git tag v1.0.0 && git push origin v1.0.0
```

[`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml) runs the checks, stamps the
tag's version, prebuilds `android/`, signs with the keystore from repository secrets and attaches
`pocket-ledger-<version>.apk` to a GitHub Release marked `--latest` (the in-app update check reads
`/releases/latest`).

- Signing is injected by [`plugins/withReleaseSigning.js`](plugins/withReleaseSigning.js), which reads
  the credentials from the environment instead of storing them; without `KEYSTORE_FILE` a local
  `assembleRelease` falls back to the debug key
- **Current status:** GitHub has Actions disabled for this account (`HTTP 422 Actions has been
  disabled for this user`) and hides it from anonymous requests (404), so the workflow cannot run and
  GitHub-hosted releases are unreachable from a phone

The path that works today is the app's own **update feed** (`update-feed/` — a Worker plus an R2
bucket on Freebuff Sites):

```bash
# build a single ABI (~31MB), then upload the APK and the manifest
UPLOAD_TOKEN=$(cat .secrets/upload-token.txt) \
  node scripts/publish-feed.mjs android/app/build/outputs/apk/release/app-release.apk 1.0.1 "notes"
```

The feed contract and token rotation live in [`update-feed/README.md`](update-feed/README.md); the
version currently advertised is **1.0.1**. Design record:
[`docs/superpowers/specs/2026-10-30-phase6-delivery-pipeline-design.md`](docs/superpowers/specs/2026-10-30-phase6-delivery-pipeline-design.md)

### More documentation

- [`AGENTS.md`](AGENTS.md) — working rules for this repository (Expo conventions, releasing, keystore)
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — the design record of each phase
- [`backup/apps-script/README.md`](backup/apps-script/README.md) — deploying the backup endpoint

---

### License

MIT — see [`LICENSE`](LICENSE).
