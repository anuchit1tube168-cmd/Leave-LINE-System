# SKILL.md — LINE Leave Approval Builder

## Purpose
สร้าง/แก้ไข/Deploy ระบบลาออนไลน์ผ่าน LINE สำหรับองค์กรไทย โดยใช้ GitHub Pages + Google Apps Script + Google Sheets + LINE Messaging API + LIFF

## Core Requirements
- ระบบต้องมี 4 บทบาท: employee, supervisor, hr, admin
- Supervisor เห็นเฉพาะแผนกตัวเอง
- HR/Admin เห็นทั้งระบบ
- สถานะใบลา: PENDING, APPROVED_L1, APPROVED, REJECTED, CANCELLED
- รองรับอนุมัติ 1 หรือ 2 ระดับ
- แจ้งเตือนผ่าน LINE Flex Message
- ใช้ Google Sheets เป็นฐานข้อมูลหลัก
- หน้าเว็บต้อง responsive รองรับมือถือ
- ห้าม hard-code secret ลง GitHub ให้ใช้ Apps Script Properties

## Database Sheets
- Employees(employeeId,name,department,position,email,phone,role,supervisorId,lineUserId,active,createdAt)
- LeaveRequests(requestId,employeeId,employeeName,department,leaveType,durationType,startDate,endDate,days,reason,contactName,contactPhone,attachmentUrl,status,approver1,approver2,comment,createdAt,updatedAt)
- LeaveTypes(code,name,annualQuota,requiresAttachment,color,active)
- LeaveBalance(year,employeeId,leaveType,quota,used,pending,remaining,updatedAt)
- Departments(department,supervisorIds,hrIds,active)
- Holidays(date,name,type)
- Users(username,passwordHash,employeeId,role,active,lastLogin)
- Settings(key,value,description)
- Logs(timestamp,actor,action,targetId,detail)

## Development Rules
1. เก็บ Frontend เป็น static file เท่านั้น เพื่อ deploy บน GitHub Pages ง่าย
2. API ต้องวิ่งผ่าน Apps Script Web App
3. ทุก action สำคัญต้อง log ลงชีต Logs
4. UI ต้องอ่านง่ายบนมือถือก่อน แล้วค่อย desktop
5. ถ้าเพิ่ม field ต้องแก้ทั้ง Apps Script HEADERS, form, render table และ docs

## Next Agent Tasks
- เพิ่มระบบ Login ด้วยรหัสพนักงาน + เบอร์โทรศัพท์
- เพิ่ม import CSV ในหน้า Admin
- เพิ่มหน้าจัดการโควตาวันลา
- เพิ่ม Flex Message แบบสมบูรณ์สำหรับอนุมัติ 2 ระดับ
- เพิ่ม PDF Export ใบลา
- เพิ่ม Dashboard แยกตามแผนก

## Acceptance Test
- เปิดหน้าเว็บบนมือถือได้
- ยื่นใบลาแล้วขึ้นในคิวอนุมัติ
- อนุมัติแล้วสถานะเปลี่ยนถูกต้อง
- รายงานนับวันลาถูกต้อง
- Apps Script setup() สร้างชีตได้ครบ
- ไม่มี secret อยู่ใน repository
