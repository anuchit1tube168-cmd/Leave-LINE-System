# คู่มือ Google Apps Script: RTAFNC Student Care LIFF

เอกสารนี้ใช้สำหรับต่อระบบหน้า LIFF Dashboard เข้ากับ Google Sheets และ LINE OA เดิมของวิทยาลัย

## 1) สร้าง Google Sheet

สร้าง Google Sheet ใหม่ชื่อเช่น

```text
RTAFNC Student Care Database
```

จากนั้นเปิด

```text
Extensions > Apps Script
```

แล้วคัดลอกโค้ดจากไฟล์นี้ไปวาง

```text
apps-script/Code.gs
```

## 2) Run setup

ใน Apps Script เลือกฟังก์ชัน

```text
setup
```

แล้วกด Run 1 ครั้ง

ระบบจะสร้างชีต:

```text
Students
Teachers
Requests
Settings
Logs
```

## 3) ตั้งค่า Script Properties

ไปที่

```text
Project Settings > Script Properties
```

เพิ่มค่าเหล่านี้:

```text
LINE_ACCESS_KEY = Channel access token ของ LINE OA
DEFAULT_TEACHER_LINE_ID = LINE userId ของอาจารย์เวรหลัก
LIFF_ID = LIFF ID
```

ถ้า Apps Script ไม่ได้ผูกกับ Google Sheet โดยตรง ให้เพิ่ม:

```text
DB_SPREADSHEET_ID = Spreadsheet ID
```

ห้ามนำ LINE_ACCESS_KEY ไปใส่ใน GitHub หรือหน้าเว็บ public

## 4) Deploy Web App

ไปที่

```text
Deploy > New deployment > Web app
```

ตั้งค่า:

```text
Execute as: Me
Who has access: Anyone
```

แล้วกด Deploy

นำ Web App URL ที่ได้ไปใช้เป็น API URL และ LINE Webhook URL

## 5) API ที่พร้อมใช้

### Health

```text
GET ?action=health
```

### Setup

```text
GET ?action=setup
```

### Dashboard

```text
GET ?action=dashboard
```

### ลงทะเบียนนักเรียน

```json
{
  "action": "registerStudent",
  "payload": {
    "studentId": "66001",
    "name": "นพอ. ตัวอย่าง 01",
    "year": "ปี 1",
    "phone": "0800000001",
    "lineUserId": "Uxxxxxxxx"
  }
}
```

### แจ้งไปโรงพยาบาล

```json
{
  "action": "createHospital",
  "payload": {
    "studentId": "66001",
    "symptom": "ปวดท้อง",
    "place": "ห้องพยาบาล",
    "timeOut": "09:20"
  }
}
```

### ยื่นใบลา

```json
{
  "action": "createLeave",
  "payload": {
    "studentId": "66001",
    "type": "ลาป่วย",
    "startDate": "2026-06-23",
    "endDate": "2026-06-23",
    "days": 1,
    "reason": "ป่วย"
  }
}
```

### อนุมัติ

```json
{
  "action": "approve",
  "payload": {
    "requestId": "H-20260623090000000",
    "nextStatus": "APPROVED",
    "actor": "teacher"
  }
}
```

### ไม่อนุมัติ

```json
{
  "action": "reject",
  "payload": {
    "requestId": "H-20260623090000000",
    "actor": "teacher",
    "comment": "ข้อมูลไม่ครบ"
  }
}
```

### บันทึกกลับแล้ว

```json
{
  "action": "markBack",
  "payload": {
    "requestId": "H-20260623090000000",
    "actor": "teacher"
  }
}
```

## 6) Flow การแจ้งเตือนที่ถูกต้อง

```text
นักเรียนส่งคำขอใน LIFF
↓
Apps Script บันทึกลง Requests
↓
LINE Push แจ้งเฉพาะอาจารย์เวร / อาจารย์ที่ปรึกษา
↓
อาจารย์เข้า Teacher Board กดอนุมัติ
↓
ระบบแจ้งผลกลับเฉพาะนักเรียนคนนั้น
```

## 7) หมายเหตุสำหรับนักเรียน 300 คน

เฉลี่ย 10 คนต่อวัน ระบบนี้ใช้ Google Sheets ได้สบาย เพราะประมาณ:

```text
10 รายการ/วัน
300 รายการ/เดือน
3,650 รายการ/ปี
```

หัวใจคืออย่า Push ข้อความไปหาทุกคน ให้ส่งเฉพาะผู้เกี่ยวข้องเท่านั้น
