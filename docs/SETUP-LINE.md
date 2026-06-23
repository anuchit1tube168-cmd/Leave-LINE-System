# คู่มือตั้งค่า LINE OA / LIFF / Webhook

## 1) สร้าง LINE Official Account และ Messaging API
1. เข้า LINE Developers Console
2. สร้าง Provider
3. สร้าง Messaging API Channel หรือเปิด Messaging API จาก LINE OA
4. คัดลอกค่าที่ระบบให้ แล้วเก็บใน Apps Script Properties
5. เปิด Webhook และปิด Auto-reply / Greeting message ถ้าต้องการให้ Bot คุมข้อความเอง

## 2) สร้าง LIFF App
1. ไปที่ Channel > LIFF > Add
2. Size: Full
3. Endpoint URL: URL GitHub Pages เช่น `https://<user>.github.io/<repo>/`
4. Scope: `profile`
5. คัดลอก LIFF ID ไปใส่ในหน้า Settings และ Script Properties

## 3) ตั้ง Webhook
- Webhook URL = Google Apps Script Web App URL
- กด Verify
- เปิด Use webhook

## 4) Rich Menu ที่แนะนำ
- ยื่นใบลา → LIFF URL
- ประวัติ → LIFF URL พร้อม query `?page=reports`
- ติดต่อ HR → LINE chat
- คู่มือ → GitHub Pages docs

## 5) ค่าใน Apps Script Properties
- `LINE_ACCESS_KEY`
- `LINE_CHANNEL_SECRET`
- `LIFF_ID`
- `APPROVAL_LEVELS` = `1` หรือ `2`
