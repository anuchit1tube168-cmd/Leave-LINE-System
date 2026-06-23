# RTAFNC Student Care LIFF Dashboard

ระบบดูแลนักเรียนผ่าน LINE Official Account เดิมของวิทยาลัย รองรับงานหลัก 3 ส่วน:

- แจ้งไปโรงพยาบาล
- ยื่นใบลา
- อาจารย์อนุมัติผ่าน Teacher Board

ออกแบบสำหรับนักเรียนประมาณ 300 คน และเคสไปโรงพยาบาลเฉลี่ย 10 คนต่อวัน

## Demo

เปิดผ่าน GitHub Pages:

```text
https://anuchit1tube168-cmd.github.io/Leave-LINE-System/
```

## ฟีเจอร์หน้า LIFF

- Mobile-first dashboard แบบ LIFF Board
- Role switch: นักเรียน / อาจารย์ / Admin
- แจ้งไป รพ. พร้อมเวลาออกและอาการ
- ยื่นใบลา
- Teacher Approval Board
- ปุ่มบันทึกกลับแล้ว
- Admin จำลองข้อมูล 10 คนต่อวัน
- Export CSV รายงาน
- พร้อมต่อ LIFF SDK และ Google Apps Script

## Flow ระบบจริง

```text
นักเรียนกด Rich Menu ใน LINE OA
↓
เปิด LIFF Dashboard
↓
ลงทะเบียนครั้งแรกเพื่อผูก studentId + lineUserId
↓
แจ้งไป รพ. / ยื่นลา
↓
Apps Script บันทึกลง Google Sheets
↓
LINE Push แจ้งเฉพาะอาจารย์ผู้อนุมัติ
↓
อาจารย์กดอนุมัติใน Teacher Board
↓
แจ้งผลกลับเฉพาะนักเรียนคนนั้น
```

## Backend

ใช้ไฟล์:

```text
apps-script/Code.gs
```

เมื่อนำไปวางใน Apps Script แล้วรัน:

```text
setup
```

ระบบจะสร้างชีต:

```text
Students
Teachers
Requests
Settings
Logs
```

## คู่มือติดตั้ง

ดูรายละเอียดที่:

```text
docs/GOOGLE-APPS-SCRIPT.md
```

## ข้อควรระวัง

ห้ามใส่ LINE Channel Access Token ใน GitHub หรือ index.html

ให้ใส่ใน Apps Script > Project Settings > Script Properties เท่านั้น
