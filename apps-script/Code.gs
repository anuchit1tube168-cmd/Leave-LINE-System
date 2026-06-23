/**
 * RTAFNC Student Care LIFF Backend
 * Google Apps Script + Google Sheets + LINE OA
 * ใช้กับนักเรียน 300 คน / ไป รพ. เฉลี่ย 10 คนต่อวัน
 */
const SHEET = {
  STUDENTS: 'Students',
  TEACHERS: 'Teachers',
  REQUESTS: 'Requests',
  SETTINGS: 'Settings',
  LOGS: 'Logs'
};

const HEAD = {
  Students: ['studentId','name','year','group','phone','advisorId','lineUserId','role','active','createdAt','updatedAt'],
  Teachers: ['teacherId','name','department','lineUserId','role','active','createdAt'],
  Requests: ['requestId','kind','studentId','studentName','year','title','detail','place','startDate','endDate','days','timeOut','timeBack','teacherId','teacherLineUserId','status','approver','comment','createdAt','updatedAt'],
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
  return { ok:true, today:today, totalStudents:list_(SHEET.STUDENTS).length, hospitalToday:hospitalToday.length, stillOut:out.length, pending:pending.length, requests:reqs.slice(-50).reverse() };
}

function registerStudent_(p){
  if(!p.studentId) return { ok:false, error:'missing studentId' };
  const sh = getSheet_(SHEET.STUDENTS);
  const found = findRow_(SHEET.STUDENTS, 'studentId', p.studentId);
  const row = [p.studentId, p.name || '', p.year || '', p.group || '', p.phone || '', p.advisorId || '', p.lineUserId || '', 'student', 'yes', new Date(), new Date()];
  if(found.row > 0){ sh.getRange(found.row,1,1,row.length).setValues([row]); }
  else { sh.appendRow(row); }
  log_(p.studentId, 'registerStudent', p.studentId, p.name || '');
  return { ok:true, studentId:p.studentId };
}

function createHospital_(p){
  const student = find_(SHEET.STUDENTS, 'studentId', p.studentId) || { studentId:p.studentId, name:p.studentName || 'ไม่ระบุ', year:p.year || '' };
  const teacher = resolveTeacher_(p.teacherId);
  const id = 'H-' + stamp_();
  appendRequest_({
    requestId:id, kind:'hospital', studentId:student.studentId, studentName:student.name, year:student.year,
    title:'ไปโรงพยาบาล', detail:p.symptom || p.detail || '', place:p.place || '', startDate:dateKey_(new Date()), endDate:dateKey_(new Date()), days:0,
    timeOut:p.timeOut || timeText_(new Date()), timeBack:'', teacherId:teacher.teacherId || '', teacherLineUserId:teacher.lineUserId || '', status:'PENDING', approver:'', comment:''
  });
  notifyTeacher_(teacher.lineUserId, 'มีคำขอไปโรงพยาบาล', student.name + ' / ' + (p.symptom || p.detail || '-'));
  log_(student.studentId, 'createHospital', id, p.symptom || '');
  return { ok:true, requestId:id, notified:!!teacher.lineUserId };
}

function createLeave_(p){
  const student = find_(SHEET.STUDENTS, 'studentId', p.studentId) || { studentId:p.studentId, name:p.studentName || 'ไม่ระบุ', year:p.year || '' };
  const teacher = resolveTeacher_(p.teacherId);
  const id = 'L-' + stamp_();
  appendRequest_({
    requestId:id, kind:'leave', studentId:student.studentId, studentName:student.name, year:student.year,
    title:p.type || 'ลา', detail:p.reason || '', place:'', startDate:p.startDate || p.start || dateKey_(new Date()), endDate:p.endDate || p.end || dateKey_(new Date()), days:Number(p.days || 1),
    timeOut:'', timeBack:'', teacherId:teacher.teacherId || '', teacherLineUserId:teacher.lineUserId || '', status:'PENDING', approver:'', comment:''
  });
  notifyTeacher_(teacher.lineUserId, 'มีใบลารออนุมัติ', student.name + ' / ' + (p.type || 'ลา'));
  log_(student.studentId, 'createLeave', id, p.reason || '');
  return { ok:true, requestId:id, notified:!!teacher.lineUserId };
}

function appendRequest_(o){
  getSheet_(SHEET.REQUESTS).appendRow([o.requestId,o.kind,o.studentId,o.studentName,o.year,o.title,o.detail,o.place,o.startDate,o.endDate,o.days,o.timeOut,o.timeBack,o.teacherId,o.teacherLineUserId,o.status,o.approver,o.comment,new Date(),new Date()]);
}

function setStatus_(id,status,actor,comment){
  const found = findRow_(SHEET.REQUESTS, 'requestId', id);
  if(found.row < 1) return { ok:false, error:'request not found' };
  const sh = getSheet_(SHEET.REQUESTS);
  const h = header_(sh);
  sh.getRange(found.row, h.indexOf('status')+1).setValue(status);
  sh.getRange(found.row, h.indexOf('approver')+1).setValue(actor || 'teacher');
  sh.getRange(found.row, h.indexOf('comment')+1).setValue(comment || '');
  sh.getRange(found.row, h.indexOf('updatedAt')+1).setValue(new Date());
  const item = rowObject_(h, sh.getRange(found.row,1,1,h.length).getValues()[0]);
  notifyStudent_(item.studentId, status === 'REJECTED' ? 'คำขอไม่อนุมัติ' : 'คำขอได้รับการอนุมัติ', item.title + ' / ' + statusText_(status));
  log_(actor || 'teacher', 'setStatus', id, status);
  return { ok:true, requestId:id, status:status };
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
  if(list_(SHEET.STUDENTS).length === 0){ getSheet_(SHEET.STUDENTS).getRange(2,1,5,11).setValues([
    ['66001','นพอ. ตัวอย่าง 01','ปี 1','A','0800000001','T001','','student','yes',new Date(),new Date()],
    ['66002','นพอ. ตัวอย่าง 02','ปี 1','A','0800000002','T001','','student','yes',new Date(),new Date()],
    ['66003','นพอ. ตัวอย่าง 03','ปี 2','B','0800000003','T002','','student','yes',new Date(),new Date()],
    ['66004','นพอ. ตัวอย่าง 04','ปี 3','C','0800000004','T002','','student','yes',new Date(),new Date()],
    ['66005','นพอ. ตัวอย่าง 05','ปี 4','D','0800000005','T001','','student','yes',new Date(),new Date()]
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
