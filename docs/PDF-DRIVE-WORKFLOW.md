# PDF + Google Drive Workflow

ระบบนี้เพิ่มความสามารถให้ Apps Script สร้าง PDF จากข้อมูลนักเรียนรายคน แล้วเก็บไฟล์ใน Google Drive แยกโฟลเดอร์ตามรหัส นพอ. / studentId

## ไฟล์ที่เกี่ยวข้อง

```text
apps-script/Code.gs
apps-script/PDF.gs
```

ให้วางทั้ง 2 ไฟล์ใน Apps Script project เดียวกัน

## โฟลเดอร์ใน Google Drive

เมื่อรัน `setup()` หรือ `setupPdfDrive()` ระบบจะสร้าง root folder:

```text
RTAFNC Student Care Files
```

จากนั้นเมื่อสร้าง PDF นักเรียน ระบบจะสร้างโฟลเดอร์รายคน เช่น:

```text
RTAFNC Student Care Files
└── 6703872 - นพอ. ศลิษา สุริย์ผัส
    ├── Permission_6703872_2026-06-17.pdf
    ├── MedicalRecord_6703872_2026-06-17.pdf
    └── StudentMedicalSummary_6703872_2026-06-23.pdf
```

## ชีต DriveFiles

ระบบจะบันทึก metadata ของไฟล์ PDF ทุกไฟล์ลงชีต:

```text
DriveFiles
```

คอลัมน์หลัก:

```text
fileId
studentId
rtAfncCode
studentName
fileType
sourceId
fileName
folderId
folderUrl
fileUrl
downloadUrl
mimeType
createdAt
createdBy
note
```

## API สร้าง PDF ใบขออนุญาตไปตรวจ/รักษา

```json
{
  "action": "createMedicalPermissionPdf",
  "payload": {
    "studentId": "66001",
    "rtAfncCode": "6703872",
    "permissionDate": "2026-06-17",
    "destination": "โรงพยาบาลภูมิพลอดุลยเดช พอ.",
    "reason": "มีอาการผิดปกติ",
    "department": "ห้องตรวจโรคข้าราชการ",
    "chiefComplaint": "มีผื่นคันตามตัว 1 ชั่วโมง PTA",
    "createdBy": "admin"
  }
}
```

ผลลัพธ์:

```json
{
  "ok": true,
  "fileId": "...",
  "fileName": "Permission_6703872_2026-06-17.pdf",
  "fileUrl": "https://drive.google.com/...",
  "downloadUrl": "https://drive.google.com/uc?export=download&id=...",
  "folderId": "...",
  "folderUrl": "https://drive.google.com/..."
}
```

## API สร้าง PDF บันทึกการตรวจ/รักษา

```json
{
  "action": "createMedicalRecordPdf",
  "payload": {
    "studentId": "66001",
    "rtAfncCode": "6703872",
    "visitDate": "2026-06-17",
    "visitTime": "11:18",
    "destination": "โรงพยาบาลภูมิพลอดุลยเดช พอ.",
    "department": "ห้องตรวจโรคข้าราชการ",
    "reason": "มีอาการผิดปกติ",
    "chiefComplaint": "มีผื่นคันตามตัว 1 ชั่วโมง PTA",
    "diagnosis": "ผื่นลมพิษ",
    "treatment": "รับประทานและทายา",
    "medication": "Bilaxten 20 mg tablet วันละ 1 ครั้ง ก่อนอาหารเช้า; Tony 0.1% lotion ทาบริเวณที่เป็นวันละ 2 ครั้ง เช้า-เย็น",
    "recordedBy": "admin"
  }
}
```

## API สร้าง PDF สรุปประวัติรายคน

```json
{
  "action": "createStudentSummaryPdf",
  "payload": {
    "rtAfncCode": "6703872",
    "createdBy": "admin"
  }
}
```

## API ดูไฟล์ PDF ของนักเรียน

```text
GET ?action=studentFiles&rtAfncCode=6703872
```

หรือ POST:

```json
{
  "action": "studentFiles",
  "payload": {
    "rtAfncCode": "6703872"
  }
}
```

## การให้เด็กดาวน์โหลด PDF

ใน LIFF ให้แสดงค่า `downloadUrl` เป็นปุ่ม:

```text
ดาวน์โหลด PDF
```

ระบบตั้ง sharing เป็น anyone with link เฉพาะไฟล์ PDF ที่สร้างแล้ว เพื่อให้นักเรียนดาวน์โหลดได้จาก LINE LIFF

## ข้อมูลสถิติ

ข้อมูลที่ใช้ทำสถิติยังเก็บใน Google Sheets:

```text
Students
Requests
MedicalPermissions
MedicalRecords
DriveFiles
Logs
```

ตัวอย่างสถิติที่ทำได้:

```text
จำนวนไป รพ. รายวัน
จำนวนไป รพ. แยกชั้นปี
อันดับอาการสำคัญ CC
จำนวน Dx ต่อเดือน
จำนวน PDF ที่สร้างต่อคน
รายชื่อนักเรียนที่ยังไม่กลับ
```

## หมายเหตุความปลอดภัย

- LINE Token ต้องอยู่ใน Script Properties เท่านั้น
- PDF ที่ตั้ง anyone with link ควรใช้เฉพาะเอกสารที่นักเรียนเจ้าของข้อมูลเข้าถึงได้
- ถ้าต้องการความปลอดภัยสูง ให้ใช้ Drive permission แบบเฉพาะอีเมลนักเรียน/อาจารย์แทน anyone with link
