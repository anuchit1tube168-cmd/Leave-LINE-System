# คู่มือ Google Apps Script

## ติดตั้ง
1. สร้าง Google Sheet ใหม่ หรือใช้ชีตที่สร้างไว้ใน Google Drive
2. Extensions > Apps Script
3. วางไฟล์ `apps-script/Code.gs`
4. ตั้งค่า Script Properties
5. Run `setup()` หนึ่งครั้งเพื่อสร้างชีตทั้งหมด
6. Deploy > New deployment > Web app
   - Execute as: Me
   - Who has access: Anyone
7. นำ Web App URL ไปใส่ LINE Webhook และหน้าเว็บ Settings

## ชีตที่สร้าง
- Employees
- LeaveRequests
- LeaveTypes
- Settings
- Logs

## API ที่รองรับ
- GET `?action=health`
- GET `?action=init`
- GET `?action=requests`
- POST `{ action:'submitLeave', payload:{...} }`
- POST `{ action:'approveLeave', payload:{ id:'...' } }`
- POST `{ action:'rejectLeave', payload:{ id:'...' } }`

## หมายเหตุ
โค้ดในชุดนี้เป็น MVP ใช้งานจริงได้ในระดับเริ่มต้น ก่อนเปิดจริงควรเพิ่มการตรวจสิทธิ์ผู้ใช้และการตรวจลายเซ็น Webhook
