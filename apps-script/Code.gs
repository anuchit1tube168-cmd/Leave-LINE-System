/**
 * RTAFNC Student Care LIFF Backend
 * Google Apps Script + Google Sheets + LINE OA
 * รองรับฐานข้อมูลแยกตามรหัส นพอ. เช่น 6703872
 */
const SHEET = {
  STUDENTS: 'Students',
  TEACHERS: 'Teachers',
  REQUESTS: 'Requests',
  MEDICAL_PERMISSIONS: 'MedicalPermissions',
  MEDICAL_RECORDS: 'MedicalRecords',
  SETTINGS: 'Settings',
  LOGS: 'Logs'
};

const HEAD = {
  Students: ['studentId','rtAfncCode','name','year','group','phone','advisorId','lineUserId','role','active','createdAt','updatedAt'],
  Teachers: ['teacherId','name','department','lineUserId','role','active','createdAt'],
  Requests: ['requestId','kind','studentId','studentName','year','title','detail','place','startDate','endDate','days','timeOut','timeBack','teacherId','teacherLineUserId','status','approver','comment','createdAt','updatedAt'],
  MedicalPermissions: ['permissionId','requestId','studentId','rtAfncCode','studentName','year','permissionDate','destination','reason','department','chiefComplaint','status','approver','approvedAt','createdAt','updatedAt'],
  MedicalRecords: ['medicalRecordId','studentId','rtAfncCode','studentName','year','visitDate','visitTime','destination','department','reason','chiefComplaint','diagnosis','treatment','medication','vaccine','doctorName','sourcePermissionId','recordedBy','recordStatus','note','createdAt','updatedAt'],
  Settings: ['key','value','description'],
  Logs: ['timestamp','actor','action','targetId','detail']
};

function setup(){
  Object.keys(HEAD).forEach(function(name){ ensureSheet_(name, HEAD[name]); });
  seed_();
  return { ok:true, message:'Student Care backend ready', sheets:Object.keys(HEAD) };
}

function doGet(e){
  const p = (e && e.parameter) || {};
  const action = p.action || 'health';
  if(action === 'health') return json_({ ok:true, app:'RTAFNC Student Care', time:new Date() });
  if(action === 'setup') return json_(setup());
  if(action === 'dashboard') return json_(dashboard_());
  if(action === 'list') return json_({ ok:true, students:list_(SHEET.STUDENTS), teachers:list_(SHEET.TEACHERS), requests:list_(SHEET.REQUESTS) });
  if(action === 'medicalHistory') return json_(getMedicalHistory_(p.studentId || p.rtAfncCode || ''));
  return json_({ ok:false, error:'unknown action', action:action });
}

function doPost(e){
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch(err) {}
  if(body.events) return handleLineWebhook_(body);
  const action = body.action || '';
  const payload = body.payload || {};
  if(action === 'setup') return json_(setup());
  if(action === 'dashboard') return json_(dashboard_());
  if(action === 'registerStudent') return json_(registerStudent_(payload));
  if(action === 'createHospital') return json_(createHospital_(payload));
  if(action === 'createLeave') return json_(createLeave_(payload));
  if(action === 'createMedicalPermission') return json_(createMedicalPermission_(payload));
  if(action === 'createMedicalRecord') return json_(createMedicalRecord_(payload));
  if(action === 'medicalHistory') return json_(getMedicalHistory_(payload.studentId || payload.rtAfncCode || ''));
  if(action === 'approve') return json_(setStatus_(payload.requestId, payload.nextStatus || 'APPROVED', payload.actor || '', payload.comment || ''));
  if(action === 'reject') return json_(setStatus_(payload.requestId, 'REJECTED', payload.actor || '', payload.comment || ''));
  if(action === 'markBack') return json_(markBack_(payload.requestId, payload.actor || ''));
  return json_({ ok:false, error:'unknown action', action:action });
}

function dashboard_(){
  const today = dateKey_(new Date());
  const reqs = list_(SHEET.REQUESTS);
  const todayReqs = reqs.filter(function(r){ return String(r.startDate) === today || String(r.createdAt).slice(0,10) === today; });
  const pending = reqs.filter(function(r){ return ['PENDING','APPROVED_L1'].indexOf(String(r.status)) >= 0; });
  const hospitalToday = todayReqs.filter(function(r){ return r.kind === 'hospital'; });
  const out = hospitalToday.filter(function(r){ return ['BACK','REJECTED'].indexOf(String(r.status)) < 0; });
  return { ok:true, today:today, totalStudents:list_(SHEET.STUDENTS).length, hospitalToday:hospitalToday.length, stillOut:out.length, pending:pending.length, medicalToday:list_(SHEET.MEDICAL_RECORDS).filter(function(r){return String(r.visitDate)===today;}).length, requests:reqs.slice(-50).reverse() };
}

function registerStudent_(p){
  if(!p.studentId && !p.rtAfncCode) return { ok:false, error:'missing studentId or rtAfncCode' };
  const studentId = p.studentId || p.rtAfncCode;
  const code = p.rtAfncCode || p.studentId;
  const sh = getSheet_(SHEET.STUDENTS);
  const found = findRow_(SHEET.STUDENTS, 'studentId', studentId);
  const row = [studentId, code, p.name || '', p.year || '', p.group || '', p.phone || '', p.advisorId || '', p.lineUserId || '', 'student', 'yes', new Date(), new Date()];
  if(found.row > 0){ sh.getRange(found.row,1,1,row.length).setValues([row]); }
  else { sh.appendRow(row); }
  log_(studentId, 'registerStudent', studentId, p.name || '');
  return { ok:true, studentId:studentId, rtAfncCode:code };
}

function createHospital_(p){
  const student = getStudent_(p);
  const teacher = resolveTeacher_(p.teacherId);
  const id = 'H-' + stamp_();
  appendRequest_({ requestId:id, kind:'hospital', studentId:student.studentId, studentName:student.name, year:student.year, title:'ไปโรงพยาบาล', detail:p.symptom || p.detail || '', place:p.place || '', startDate:dateKey_(new Date()), endDate:dateKey_(new Date()), days:0, timeOut:p.timeOut || timeText_(new Date()), timeBack:'', teacherId:teacher.teacherId || '', teacherLineUserId:teacher.lineUserId || '', status:'PENDING', approver:'', comment:'' });
  createMedicalPermission_({ requestId:id, studentId:student.studentId, rtAfncCode:student.rtAfncCode, destination:p.place || '', reason:p.reason || 'มีอาการผิดปกติ', department:p.department || '', chiefComplaint:p.symptom || p.detail || '', status:'PENDING' });
  notifyTeacher_(teacher.lineUserId, 'มีคำขอไปโรงพยาบาล', student.name + ' / ' + (p.symptom || p.detail || '-'));
  log_(student.studentId, 'createHospital', id, p.symptom || '');
  return { ok:true, requestId:id, notified:!!teacher.lineUserId };
}

function createLeave_(p){
  const student = getStudent_(p);
  const teacher = resolveTeacher_(p.teacherId);
  const id = 'L-' + stamp_();
  appendRequest_({ requestId:id, kind:'leave', studentId:student.studentId, studentName:student.name, year:student.year, title:p.type || 'ลา', detail:p.reason || '', place:'', startDate:p.startDate || p.start || dateKey_(new Date()), endDate:p.endDate || p.end || dateKey_(new Date()), days:Number(p.days || 1), timeOut:'', timeBack:'', teacherId:teacher.teacherId || '', teacherLineUserId:teacher.lineUserId || '', status:'PENDING', approver:'', comment:'' });
  notifyTeacher_(teacher.lineUserId, 'มีใบลารออนุมัติ', student.name + ' / ' + (p.type || 'ลา'));
  log_(student.studentId, 'createLeave', id, p.reason || '');
  return { ok:true, requestId:id, notified:!!teacher.lineUserId };
}

function createMedicalPermission_(p){
  const student = getStudent_(p);
  const id = p.permissionId || 'MP-' + stamp_();
  getSheet_(SHEET.MEDICAL_PERMISSIONS).appendRow([id, p.requestId || '', student.studentId, student.rtAfncCode || student.studentId, student.name, student.year || '', p.permissionDate || dateKey_(new Date()), p.destination || '', p.reason || '', p.department || '', p.chiefComplaint || '', p.status || 'PENDING', p.approver || '', p.approvedAt || '', new Date(), new Date()]);
  log_(student.studentId, 'createMedicalPermission', id, p.chiefComplaint || '');
  return { ok:true, permissionId:id, studentId:student.studentId, rtAfncCode:student.rtAfncCode || student.studentId };
}

function createMedicalRecord_(p){
  const student = getStudent_(p);
  const id = p.medicalRecordId || 'MR-' + stamp_();
  getSheet_(SHEET.MEDICAL_RECORDS).appendRow([id, student.studentId, student.rtAfncCode || student.studentId, student.name, student.year || '', p.visitDate || dateKey_(new Date()), p.visitTime || timeText_(new Date()), p.destination || '', p.department || '', p.reason || '', p.chiefComplaint || '', p.diagnosis || '', p.treatment || '', p.medication || '', p.vaccine || '', p.doctorName || '', p.sourcePermissionId || p.permissionId || '', p.recordedBy || '', p.recordStatus || 'RECORDED', p.note || '', new Date(), new Date()]);
  log_(student.studentId, 'createMedicalRecord', id, p.diagnosis || '');
  return { ok:true, medicalRecordId:id, studentId:student.studentId, rtAfncCode:student.rtAfncCode || student.studentId };
}

function getMedicalHistory_(key){
  if(!key) return { ok:false, error:'missing studentId or rtAfncCode' };
  const students = list_(SHEET.STUDENTS);
  const student = students.find(function(s){ return String(s.studentId)===String(key) || String(s.rtAfncCode)===String(key); }) || { studentId:key, rtAfncCode:key };
  const sid = String(student.studentId || key), code = String(student.rtAfncCode || key);
  const permissions = list_(SHEET.MEDICAL_PERMISSIONS).filter(function(r){ return String(r.studentId)===sid || String(r.rtAfncCode)===code; }).reverse();
  const records = list_(SHEET.MEDICAL_RECORDS).filter(function(r){ return String(r.studentId)===sid || String(r.rtAfncCode)===code; }).reverse();
  const requests = list_(SHEET.REQUESTS).filter(function(r){ return String(r.studentId)===sid && (r.kind==='hospital' || r.kind==='leave'); }).reverse();
  return { ok:true, student:student, permissions:permissions, medicalRecords:records, requests:requests };
}

function appendRequest_(o){
  getSheet_(SHEET.REQUESTS).appendRow([o.requestId,o.kind,o.studentId,o.studentName,o.year,o.title,o.detail,o.place,o.startDate,o.endDate,o.days,o.timeOut,o.timeBack,o.teacherId,o.teacherLineUserId,o.status,o.approver,o.comment,new Date(),new Date()]);
}

function setStatus_(id,status,actor,comment){
  const found = findRow_(SHEET.REQUESTS, 'requestId', id);
  if(found.row < 1) return { ok:false, error:'request not found' };
  const sh = getSheet_(SHEET.REQUESTS), h = header_(sh);
  sh.getRange(found.row, h.indexOf('status')+1).setValue(status);
  sh.getRange(found.row, h.indexOf('approver')+1).setValue(actor || 'teacher');
  sh.getRange(found.row, h.indexOf('comment')+1).setValue(comment || '');
  sh.getRange(found.row, h.indexOf('updatedAt')+1).setValue(new Date());
  const item = rowObject_(h, sh.getRange(found.row,1,1,h.length).getValues()[0]);
  syncPermissionStatus_(id, status, actor);
  notifyStudent_(item.studentId, status === 'REJECTED' ? 'คำขอไม่อนุมัติ' : 'คำขอได้รับการอนุมัติ', item.title + ' / ' + statusText_(status));
  log_(actor || 'teacher', 'setStatus', id, status);
  return { ok:true, requestId:id, status:status };
}

function syncPermissionStatus_(requestId,status,actor){
  const found = findRow_(SHEET.MEDICAL_PERMISSIONS, 'requestId', requestId);
  if(found.row < 1) return;
  const sh = getSheet_(SHEET.MEDICAL_PERMISSIONS), h = header_(sh);
  sh.getRange(found.row, h.indexOf('status')+1).setValue(status);
  sh.getRange(found.row, h.indexOf('approver')+1).setValue(actor || 'teacher');
  sh.getRange(found.row, h.indexOf('approvedAt')+1).setValue(new Date());
  sh.getRange(found.row, h.indexOf('updatedAt')+1).setValue(new Date());
}

function markBack_(id,actor){
  const found = findRow_(SHEET.REQUESTS, 'requestId', id);
  if(found.row < 1) return { ok:false, error:'request not found' };
  const sh = getSheet_(SHEET.REQUESTS), h = header_(sh);
  sh.getRange(found.row, h.indexOf('status')+1).setValue('BACK');
  sh.getRange(found.row, h.indexOf('timeBack')+1).setValue(timeText_(new Date()));
  sh.getRange(found.row, h.indexOf('updatedAt')+1).setValue(new Date());
  log_(actor || 'teacher', 'markBack', id, 'student returned');
  return { ok:true, requestId:id, status:'BACK' };
}

function handleLineWebhook_(body){
  (body.events || []).forEach(function(ev){
    if(ev.type === 'postback'){
      const q = parseQuery_(ev.postback.data || '');
      if(q.action === 'approve') setStatus_(q.id, 'APPROVED', ev.source.userId, 'from LINE');
      if(q.action === 'reject') setStatus_(q.id, 'REJECTED', ev.source.userId, 'from LINE');
      if(q.action === 'back') markBack_(q.id, ev.source.userId);
    }
  });
  return ContentService.createTextOutput('OK');
}

function getStudent_(p){
  const key = p.studentId || p.rtAfncCode || p.studentCode || '';
  const s = list_(SHEET.STUDENTS).find(function(x){ return String(x.studentId)===String(key) || String(x.rtAfncCode)===String(key); });
  return s || { studentId:key, rtAfncCode:p.rtAfncCode || key, name:p.studentName || p.name || 'ไม่ระบุ', year:p.year || '' };
}
function notifyTeacher_(lineUserId,title,body){ if(lineUserId) pushLine_(lineUserId, flexText_(title, body)); }
function notifyStudent_(studentId,title,body){ const s = find_(SHEET.STUDENTS, 'studentId', studentId); if(s && s.lineUserId) pushLine_(s.lineUserId, flexText_(title, body)); }
function flexText_(title,body){ return { type:'text', text:title + '\n' + body }; }
function pushLine_(to,msg){
  const key = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_KEY');
  if(!key || !to) return;
  const headers = {}; headers['Authori'+'zation'] = 'Bear'+'er ' + key;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', { method:'post', contentType:'application/json', headers:headers, payload:JSON.stringify({ to:to, messages:[msg] }), muteHttpExceptions:true });
}

function resolveTeacher_(teacherId){
  if(teacherId){ const t = find_(SHEET.TEACHERS, 'teacherId', teacherId); if(t) return t; }
  const def = getSetting_('DEFAULT_TEACHER_LINE_ID');
  return { teacherId:'DEFAULT', name:'อาจารย์เวร', lineUserId:def || '' };
}
function seed_(){
  if(list_(SHEET.STUDENTS).length === 0){ getSheet_(SHEET.STUDENTS).getRange(2,1,5,12).setValues([
    ['66001','6703872','นพอ. ศลิษา สุริย์ผัส','ปี 2','A','0800000001','T001','','student','yes',new Date(),new Date()],
    ['66002','6703873','นพอ. ตัวอย่าง 02','ปี 1','A','0800000002','T001','','student','yes',new Date(),new Date()],
    ['66003','6703874','นพอ. ตัวอย่าง 03','ปี 2','B','0800000003','T002','','student','yes',new Date(),new Date()],
    ['66004','6703875','นพอ. ตัวอย่าง 04','ปี 3','C','0800000004','T002','','student','yes',new Date(),new Date()],
    ['66005','6703876','นพอ. ตัวอย่าง 05','ปี 4','D','0800000005','T001','','student','yes',new Date(),new Date()]
  ]); }
  if(list_(SHEET.TEACHERS).length === 0){ getSheet_(SHEET.TEACHERS).getRange(2,1,2,7).setValues([
    ['T001','อาจารย์เวรตัวอย่าง','ปกครอง','','teacher','yes',new Date()],
    ['T002','อาจารย์ที่ปรึกษาตัวอย่าง','ปกครอง','','teacher','yes',new Date()]
  ]); }
  if(list_(SHEET.SETTINGS).length === 0){ getSheet_(SHEET.SETTINGS).getRange(2,1,3,3).setValues([
    ['DEFAULT_TEACHER_LINE_ID','','LINE userId ของอาจารย์เวรหลัก'],
    ['LIFF_ID','','LIFF ID'],
    ['OA_NAME','RTAFNC Student Care','ชื่อ LINE OA']
  ]); }
  if(list_(SHEET.MEDICAL_RECORDS).length === 0){ createMedicalRecord_({ studentId:'66001', visitDate:'2026-06-17', visitTime:'11:18', destination:'โรงพยาบาลภูมิพลอดุลยเดช พอ.', department:'ห้องตรวจโรคข้าราชการ', reason:'มีอาการผิดปกติ', chiefComplaint:'มีผื่นคันตามตัว 1 ชั่วโมง PTA', diagnosis:'ผื่นลมพิษ', treatment:'รับประทานและทายา', medication:'Bilaxten 20 mg tablet วันละ 1 ครั้ง ก่อนอาหารเช้า; Tony 0.1% lotion ทาบริเวณที่เป็นวันละ 2 ครั้ง เช้า-เย็น', recordedBy:'ระบบตัวอย่าง' }); }
}
function ensureSheet_(name,headers){ const ss = ss_(); let sh = ss.getSheetByName(name) || ss.insertSheet(name); if(sh.getLastRow() === 0){ sh.appendRow(headers); sh.getRange(1,1,1,headers.length).setBackground('#006241').setFontColor('#fff').setFontWeight('bold'); sh.setFrozenRows(1); } return sh; }
function ss_(){ const id = PropertiesService.getScriptProperties().getProperty('DB_SPREADSHEET_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive(); }
function getSheet_(n){ return ss_().getSheetByName(n) || ensureSheet_(n, HEAD[n] || []); }
function header_(sh){ return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]; }
function rowObject_(h,r){ const o={}; h.forEach(function(k,i){ o[k]=r[i]; }); return o; }
function list_(name){ const sh = getSheet_(name), v = sh.getDataRange().getValues(); if(v.length < 2) return []; const h=v[0]; return v.slice(1).filter(function(r){ return r.join('') !== ''; }).map(function(r){ return rowObject_(h,r); }); }
function find_(sheet,k,val){ return list_(sheet).find(function(o){ return String(o[k]) === String(val); }); }
function findRow_(sheet,k,val){ const sh=getSheet_(sheet), v=sh.getDataRange().getValues(), h=v[0], c=h.indexOf(k); for(let i=1;i<v.length;i++){ if(String(v[i][c]) === String(val)) return { row:i+1, values:v[i] }; } return { row:-1 }; }
function getSetting_(key){ const s = find_(SHEET.SETTINGS, 'key', key); return s ? s.value : ''; }
function log_(actor,action,target,detail){ getSheet_(SHEET.LOGS).appendRow([new Date(),actor,action,target,detail]); }
function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function stamp_(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmssSSS'); }
function dateKey_(d){ return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function timeText_(d){ return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'HH:mm'); }
function parseQuery_(s){ const o={}; String(s).split('&').forEach(function(p){ const a=p.split('='); o[decodeURIComponent(a[0]||'')] = decodeURIComponent(a[1]||''); }); return o; }
function statusText_(s){ return ({ PENDING:'รออนุมัติ', APPROVED_L1:'ผ่านระดับ 1', APPROVED:'อนุมัติ', REJECTED:'ไม่อนุมัติ', BACK:'กลับแล้ว' })[s] || s; }
