# Google Sheets backup (Phase 5.2)

ตัวแอปส่งสำรองขึ้น Google Sheets ผ่าน Apps Script Web App — ไม่มี OAuth ในแอป ไม่มี API key
ของ Google เก็บไว้ในเครื่อง มีแค่ URL กับ secret ที่ผู้ใช้ตั้งเอง

## ขั้นตอนติดตั้ง (ทำครั้งเดียว)

1. สร้าง Google Sheets ใหม่ ตั้งชื่อ เช่น `Pocket Ledger Backup`
2. เปิด **Extensions → Apps Script**
3. วางเนื้อหาไฟล์ [`Code.gs`](Code.gs) ทับไฟล์เดิมทั้งหมด
4. แก้บรรทัด `var SECRET_KEY = 'change-me-to-a-long-random-string';`
   เป็นรหัสยาว ๆ ของคุณเอง (เช่น 32+ ตัวอักษรสุ่ม) — รหัสนี้ต้องตรงกับช่อง *Secret key* ในแอป
5. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (ไม่ใช่ "Anyone with Google account")
6. กด **Deploy** แล้ว copy **Web app URL** ที่ลงท้ายด้วย `/exec`
7. เปิด URL นั้นในเบราว์เซอร์ ควรเห็น `{"status":"ok","service":"pocket-ledger-backup"}`
8. ในแอป → **ตั้งค่า → สำรองข้อมูลขึ้น Google Sheets**
   ใส่ Web App URL + Secret key → **บันทึกการตั้งค่า** → **สำรองข้อมูลขึ้นคลาวด์**

> แก้ `Code.gs` ภายหลังต้อง **Deploy → Manage deployments → Edit → New version** ไม่งั้น URL เดิม
> จะยังรันโค้ดเก่า

## สัญญาการเรียก (contract)

แอปส่ง `POST` เป็น JSON:

```json
{
  "secret_key": "…",
  "timestamp": "2026-10-30T08:00:00.000Z",
  "accounts": [{ "id": "…", "name": "เงินสด", "initial_balance_satang": 50000, "…": "…" }],
  "transactions": [{ "id": "…", "account_id": "…", "type": "EXPENSE", "amount_satang": 1250, "…": "…" }]
}
```

ตอบกลับ (HTTP 200 เสมอ เพราะ Apps Script กำหนด status code เองไม่ได้):

| กรณี | body |
| --- | --- |
| สำเร็จ | `{"status":"success","count":42,"accounts":1}` |
| secret ผิด | `{"status":"error","message":"unauthorized"}` |
| payload เสีย | `{"status":"error","message":"…"}` |

แอปอ่าน `status` จาก body: `success` → toast "สำรองข้อมูลสำเร็จ (n รายการ)",
`error` → toast ตาม `message` (และกรณี `unauthorized` แอปจะบอกให้ตรวจ Secret key)

## พฤติกรรมของชีต

- ชีต `Accounts` และ `Transactions` ถูกสร้างอัตโนมัติถ้ายังไม่มี
- ทุกครั้งที่สำรอง **เขียนทับทั้งชีต** (ไม่ต่อท้าย) เพื่อให้ชีตสะท้อนเครื่องแบบ 1:1
- เงินเก็บเป็นจำนวนเต็มสตางค์ (`amount_satang`) ตามฐานข้อมูล ไม่แปลงเป็นทศนิยม
