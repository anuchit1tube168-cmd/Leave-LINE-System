# ระบบลาออนไลน์ผ่าน LINE

โปรเจกต์ Web App สำหรับจัดการการลาในองค์กร ถอดจากภาพต้นแบบและจัดชุดให้พร้อมขึ้น GitHub Pages + Google Apps Script + Google Sheets + LINE LIFF

## ฟีเจอร์หลัก
- Dashboard ภาพรวมการลา
- ยื่นใบลาผ่านเว็บ/มือถือ/LINE LIFF
- คิวอนุมัติสำหรับหัวหน้าและ HR
- ปฏิทินการลารายเดือน
- จัดการพนักงานและสถานะผูก LINE
- รายงานสรุปรายบุคคล
- Backend Google Apps Script
- ใช้ Google Sheets เป็นฐานข้อมูล

## โครงไฟล์
```text
index.html
css/styles.css
js/app.js
js/config.example.js
apps-script/Code.gs
data/*.csv
docs/*.md
SKILL.md
.github/workflows/pages.yml
```

## ทดสอบเร็ว
เปิด `index.html` แล้วทดลองกดยื่นใบลา / อนุมัติ / ดูรายงานได้ทันที ระบบจะใช้ LocalStorage เป็น Demo Mode

## ใช้งานจริง
1. เปิด Google Sheet แล้วไปที่ Extensions > Apps Script
2. วางโค้ดจาก `apps-script/Code.gs`
3. Run `setup()` หนึ่งครั้ง
4. Deploy เป็น Web App
5. นำ Web App URL ไปใส่ใน LINE Webhook และหน้า Settings
6. ตั้งค่า LIFF Endpoint URL เป็น URL ของ GitHub Pages

## GitHub Pages
เมื่อ Push เข้า `main` แล้ว Workflow จะ deploy static site อัตโนมัติ หรือเปิด Settings > Pages แล้วเลือก GitHub Actions

## ความปลอดภัย
อย่าใส่ค่า secret ของ LINE ลงในไฟล์หน้าเว็บหรือ repository ให้เก็บไว้ใน Apps Script Properties เท่านั้น
