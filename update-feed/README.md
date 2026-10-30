# Update feed (Phase 6.3)

ช่องทางที่แอปอ่านเพื่อตรวจเวอร์ชันใหม่ — เป็น Worker + R2 bucket บน Freebuff Sites
ไม่พึ่ง GitHub Releases เพราะบัญชี GitHub ถูกจำกัด (ดู `docs/superpowers/specs/2026-10-30-phase6-delivery-pipeline-design.md`)

## สัญญาของ feed

`GET /latest.json` (ไม่ต้องมี token, ห้าม cache)

```json
{
  "format": "pocket-ledger.update",
  "version": "1.0.1",
  "notes": "ข้อความสั้น ๆ ที่จะโชว์ใน dialog",
  "apkUrl": "https://<site>/pocket-ledger-1.0.1.apk",
  "publishedAt": "2026-10-30T10:26:24.303Z"
}
```

`GET /<ไฟล์>` เสิร์ฟไฟล์จาก R2 (`application/vnd.android.package-archive` สำหรับ `.apk`)

`PUT /admin/<ไฟล์>` เขียนไฟล์ — ต้องมี `Authorization: Bearer $UPLOAD_TOKEN` (secret ของ Worker)
เท่านั้น; ไม่มี token = `403`, ไฟล์เกิน 60MB = `413`, key ที่มี `/` หรือ `..` = `400`

## ปล่อยเวอร์ชันใหม่

```bash
# 1) build APK arm64 (เล็ก ~31MB และอยู่ใต้เพดาน 60MB ของ feed)
cd android
ANDROID_HOME=$HOME/Android/Sdk LANG=C \
KEYSTORE_FILE=$HOME/.pocket-ledger/release.keystore \
KEYSTORE_PASSWORD=$(cat ~/.pocket-ledger/keystore-password.txt) \
KEY_ALIAS=pocketledger \
KEY_PASSWORD=$(cat ~/.pocket-ledger/keystore-password.txt) \
./gradlew --no-daemon assembleRelease -PreactNativeArchitectures=arm64-v8a

# 2) อัปโหลด APK + manifest (อัป APK ก่อน แล้วค่อย manifest เสมอ)
cd ../..
UPLOAD_TOKEN=$(cat .secrets/upload-token.txt) \
  node scripts/publish-feed.mjs android/app/build/outputs/apk/release/app-release.apk 1.0.1 "notes"
```

`scripts/publish-feed.mjs` รับ `--base <url>` เพื่อยิงไปที่ preview แทน production ได้

## โครงสร้างที่ deploy

- Site: `pocket-ledger-updates` (`5c1d9a44-7b1e-4d38-9c26-1a3f2ab7d5e1`)
- Worker: `update-feed/worker.js` (deploy manifest: `update-feed/sites.json`)
- R2 binding: `FILES` (แยก bucket ต่อ environment)
- Secret: `UPLOAD_TOKEN` (ค่าเดียวกับ `.secrets/upload-token.txt` ในเครื่อง — ไฟล์นี้อยู่ใน `.gitignore`)

## หมายเหตุ

- Manifest ตั้ง `no-store` และแอปใส่ cache-buster (`?t=`) ทุกครั้งที่เช็ก — กัน CDN คืน manifest เก่า
- Worker รับ body ได้สูงสุด ~100MB แต่ `MAX_UPLOAD_BYTES` ตั้งไว้ 60MB เพื่อกัน timeout และกันการเผลออัปไฟล์ universal APK 95MB
- เปลี่ยน token: สร้างค่าใหม่แล้ว `sites_set_secret` (requestId ใหม่) และอัปเดต `.secrets/upload-token.txt`
