# ฐานข้อมูลบันทึกการตรวจ/รักษา นพอ.

เอกสารนี้ออกแบบจากแบบฟอร์มตัวอย่าง 2 แบบ:

1. ใบขออนุญาตไปตรวจ หรือ ไปรักษา
2. บันทึกการตรวจ/รักษา นพอ.

ระบบจะเก็บข้อมูลแยกตามรหัสนักเรียนหรือรหัส นพอ. เช่น `6703872`

## ชีตหลักที่เพิ่ม

```text
MedicalPermissions
MedicalRecords
```

## 1) MedicalPermissions

ใช้เก็บใบขออนุญาตไปตรวจ/รักษา ก่อนหรือระหว่างการขออนุมัติ

| field | ความหมาย |
|---|---|
| permissionId | รหัสใบอนุญาต เช่น MP-20260617110900000 |
| requestId | รหัสคำขอใน Requests เช่น H-xxxx |
| studentId | รหัสนักเรียนในระบบ |
| rtAfncCode | รหัส นพอ. เช่น 6703872 |
| studentName | ชื่อ-สกุล |
| year | ชั้นปี |
| permissionDate | วันที่ขออนุญาต |
| destination | ไปตรวจ/รักษาที่ |
| reason | เนื่องจาก |
| department | แผนกที่ไปตรวจ/รักษา |
| chiefComplaint | อาการสำคัญ CC |
| status | PENDING / APPROVED / REJECTED |
| approver | ผู้อนุมัติ |
| approvedAt | เวลาอนุมัติ |
| createdAt | เวลาสร้าง |
| updatedAt | เวลาแก้ไข |

## 2) MedicalRecords

ใช้เก็บผลตรวจ/รักษาหลังกลับจากโรงพยาบาล

| field | ความหมาย |
|---|---|
| medicalRecordId | รหัสบันทึกการรักษา เช่น MR-20260617111800000 |
| studentId | รหัสนักเรียนในระบบ |
| rtAfncCode | รหัส นพอ. เช่น 6703872 |
| studentName | ชื่อ-สกุล |
| year | ชั้นปี |
| visitDate | วันที่ตรวจ/รักษา |
| visitTime | เวลาบันทึก |
| destination | โรงพยาบาล / สถานพยาบาล |
| department | แผนกที่ตรวจ |
| reason | เหตุผลที่ไปตรวจ |
| chiefComplaint | อาการสำคัญ CC |
| diagnosis | การวินิจฉัย Dx |
| treatment | การรักษาของแพทย์ |
| medication | ยา / วัคซีนที่ได้รับ |
| vaccine | วัคซีน ถ้ามี |
| doctorName | แพทย์ผู้รักษา |
| sourcePermissionId | อ้างอิงใบอนุญาต |
| recordedBy | ผู้บันทึก |
| recordStatus | RECORDED / VERIFIED |
| note | หมายเหตุ |
| createdAt | เวลาสร้าง |
| updatedAt | เวลาแก้ไข |

## ตัวอย่างจากภาพ

```json
{
  "action": "createMedicalRecord",
  "payload": {
    "rtAfncCode": "6703872",
    "studentName": "นพอ. ศลิษา สุริย์ผัส",
    "year": "ปี 2",
    "visitDate": "2026-06-17",
    "visitTime": "11:18",
    "destination": "โรงพยาบาลภูมิพลอดุลยเดช พอ.",
    "department": "ห้องตรวจโรคข้าราชการ",
    "reason": "มีอาการผิดปกติ",
    "chiefComplaint": "มีผื่นคันตามตัว 1 ชั่วโมง PTA",
    "diagnosis": "ผื่นลมพิษ",
    "treatment": "รับประทานและทายา",
    "medication": "Bilaxten 20 mg tablet วันละ 1 ครั้ง ก่อนอาหารเช้า; Tony 0.1% lotion ทาบริเวณที่เป็นวันละ 2 ครั้ง เช้า-เย็น"
  }
}
```

## เรียกประวัตินักเรียนรายคน

ใช้รหัสนักเรียนหรือรหัส นพอ. ก็ได้

```text
GET ?action=medicalHistory&studentId=6703872
```

หรือ POST:

```json
{
  "action": "medicalHistory",
  "payload": {
    "rtAfncCode": "6703872"
  }
}
```

ผลลัพธ์จะรวม:

```text
student
permissions
medicalRecords
requests
```

## หลักการจัดเก็บ

ให้ใช้ `rtAfncCode` เป็นรหัสอ้างอิงหลักสำหรับค้นหาประวัติสุขภาพรายคน และใช้ `studentId` เป็นรหัสระบบภายใน

```text
rtAfncCode = รหัส นพอ. บนเอกสาร
studentId = รหัสนักเรียนในระบบ LIFF
```

ถ้าหน่วยงานต้องการให้สองรหัสเป็นตัวเดียวกัน ให้กำหนด `studentId = rtAfncCode` ได้เลย
