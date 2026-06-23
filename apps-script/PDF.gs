/**
 * PDF + Google Drive storage module for RTAFNC Student Care
 * วางไฟล์นี้เป็นไฟล์ .gs เพิ่มใน Apps Script เดียวกับ Code.gs
 * โครงโฟลเดอร์: Root / รุ่น นพอ.xx / ชั้นปี / รหัส 7 ตัว - ลำดับ 4 ตัว - ชื่อ
 */
const PDF_SHEET_NAME = 'DriveFiles';
const PDF_FILE_HEADERS = ['fileId','studentId','rtAfncCode','studentName','fileType','sourceId','fileName','folderId','folderUrl','fileUrl','downloadUrl','mimeType','createdAt','createdBy','note'];

function setupPdfDrive(){
  ensureSheet_('DriveFiles', PDF_FILE_HEADERS);
  const root = getOrCreateRootFolder_();
  return { ok:true, rootFolderId:root.getId(), rootFolderUrl:root.getUrl(), sheet:'DriveFiles' };
}

function getOrCreateRootFolder_(){
  const prop = PropertiesService.getScriptProperties();
  const existing = prop.getProperty('STUDENT_CARE_ROOT_FOLDER_ID');
  if(existing){ try { return DriveApp.getFolderById(existing); } catch(err) {} }
  const name = prop.getProperty('STUDENT_CARE_ROOT_FOLDER_NAME') || 'RTAFNC Student Care Files';
  const folders = DriveApp.getFoldersByName(name);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
  prop.setProperty('STUDENT_CARE_ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function parseRtAfncCode_(code){
  const raw = String(code || '').replace(/\D/g,'');
  return {
    raw: raw,
    cohort: raw.length >= 2 ? raw.slice(0,2) : 'ไม่ระบุรุ่น',
    middle: raw.length === 7 ? raw.slice(2,3) : '',
    sequence: raw.length >= 4 ? raw.slice(-4) : raw,
    isValid7: raw.length === 7
  };
}

function getYearFolderName_(student, parsed){
  const y = String(student.year || student.classYear || '').trim();
  if(y) return y.indexOf('ปี') >= 0 ? y : 'ปี ' + y;
  return 'ไม่ระบุชั้นปี';
}

function getOrCreateChildFolder_(parent, name){
  const safe = String(name || 'ไม่ระบุ').replace(/[\\/:*?"<>|]/g,'-');
  const folders = parent.getFoldersByName(safe);
  return folders.hasNext() ? folders.next() : parent.createFolder(safe);
}

function getOrCreateStudentFolder_(student){
  const root = getOrCreateRootFolder_();
  const code = student.rtAfncCode || student.studentId || '';
  const parsed = parseRtAfncCode_(code);
  const cohortFolder = getOrCreateChildFolder_(root, 'รุ่น นพอ.' + parsed.cohort);
  const yearFolder = getOrCreateChildFolder_(cohortFolder, getYearFolderName_(student, parsed));
  const studentName = student.name || student.studentName || 'ไม่ระบุชื่อ';
  const studentFolderName = parsed.raw + ' - ลำดับ ' + parsed.sequence + ' - ' + studentName;
  return getOrCreateChildFolder_(yearFolder, studentFolderName);
}

function createMedicalPermissionPdf(payload){
  const p = payload || {};
  const student = getStudent_(p);
  const html = buildPermissionHtml_(student, p);
  const filename = 'Permission_' + (student.rtAfncCode || student.studentId) + '_' + (p.permissionDate || dateKey_(new Date())) + '.pdf';
  return savePdfForStudent_(student, html, filename, 'permission', p.permissionId || p.requestId || '', p.createdBy || 'system');
}

function createMedicalRecordPdf(payload){
  const p = payload || {};
  const student = getStudent_(p);
  const html = buildMedicalRecordHtml_(student, p);
  const filename = 'MedicalRecord_' + (student.rtAfncCode || student.studentId) + '_' + (p.visitDate || dateKey_(new Date())) + '.pdf';
  return savePdfForStudent_(student, html, filename, 'medicalRecord', p.medicalRecordId || p.sourcePermissionId || '', p.recordedBy || 'system');
}

function createStudentSummaryPdf(payload){
  const p = payload || {};
  const key = p.studentId || p.rtAfncCode || p.key;
  const h = getMedicalHistory_(key);
  if(!h.ok) return h;
  const student = h.student;
  const html = buildStudentSummaryHtml_(student, h);
  const filename = 'StudentMedicalSummary_' + (student.rtAfncCode || student.studentId || key) + '_' + dateKey_(new Date()) + '.pdf';
  return savePdfForStudent_(student, html, filename, 'studentSummary', key, p.createdBy || 'system');
}

function savePdfForStudent_(student, html, filename, fileType, sourceId, createdBy){
  setupPdfDrive();
  const folder = getOrCreateStudentFolder_(student);
  const blob = Utilities.newBlob(html, 'text/html', filename.replace('.pdf','.html')).getAs(MimeType.PDF).setName(filename);
  const file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(err) {}
  const row = [file.getId(), student.studentId || '', student.rtAfncCode || student.studentId || '', student.name || student.studentName || '', fileType, sourceId || '', filename, folder.getId(), folder.getUrl(), file.getUrl(), 'https://drive.google.com/uc?export=download&id=' + file.getId(), MimeType.PDF, new Date(), createdBy || 'system', 'cohort=' + parseRtAfncCode_(student.rtAfncCode || student.studentId).cohort];
  getSheet_('DriveFiles').appendRow(row);
  return { ok:true, fileId:file.getId(), fileName:filename, fileUrl:file.getUrl(), downloadUrl:'https://drive.google.com/uc?export=download&id=' + file.getId(), folderId:folder.getId(), folderUrl:folder.getUrl() };
}

function listStudentFiles(payload){
  const p = payload || {};
  const key = p.studentId || p.rtAfncCode || p.key || '';
  if(!key) return { ok:false, error:'missing studentId or rtAfncCode' };
  setupPdfDrive();
  const rows = list_('DriveFiles').filter(function(f){ return String(f.studentId)===String(key) || String(f.rtAfncCode)===String(key); }).reverse();
  return { ok:true, key:key, files:rows };
}

function buildPermissionHtml_(s,p){
  return htmlPage_('การขออนุญาตการไปตรวจ หรือ ไปรักษา', `
    <div class="meta"><span>วันที่ ${thaiDate_(p.permissionDate || new Date())}</span><span>รหัส นพอ. : ${esc_(s.rtAfncCode || s.studentId || '')}</span></div>
    <h1>การขออนุญาต<br>การไปตรวจ หรือ ไปรักษา</h1>
    <section>
      <p><b>ชื่อ - สกุล :</b> ${esc_(s.name || s.studentName || '')} <b class="right">ชั้นปีที่ :</b> ${esc_(s.year || p.year || '')}</p>
      <p><b>ไปตรวจ/รักษาที่ :</b> ${esc_(p.destination || p.place || '')}</p>
      <p><b>เนื่องจาก :</b> ${esc_(p.reason || '')}</p>
      <p><b>แผนกที่ไปตรวจ/รักษา :</b> ${esc_(p.department || '')}</p>
      <p><b>อาการสำคัญ (CC) :</b> ${esc_(p.chiefComplaint || p.symptom || '')}</p>
    </section>
    <div class="sign">บันทึกเมื่อ ${thaiDateTime_(new Date())}</div>`);
}

function buildMedicalRecordHtml_(s,p){
  return htmlPage_('บันทึก การตรวจ/รักษา นพอ.', `
    <div class="meta"><span>วันที่ ${thaiDate_(p.visitDate || new Date())}</span><span>รหัส นพอ. : ${esc_(s.rtAfncCode || s.studentId || '')}</span></div>
    <h1>บันทึก การตรวจ/รักษา นพอ.</h1>
    <section>
      <h2>ส่วนที่ 1 : การไปตรวจ/รักษาอาการ</h2>
      <p><b>ชื่อ - สกุล :</b> ${esc_(s.name || s.studentName || '')} <b class="right">ชั้นปีที่ :</b> ${esc_(s.year || p.year || '')}</p>
      <p><b>ไปตรวจ/รักษาที่ :</b> ${esc_(p.destination || '')}</p>
      <p><b>เนื่องจาก :</b> ${esc_(p.reason || '')}</p>
      <p><b>แผนกที่ไปตรวจ/รักษา :</b> ${esc_(p.department || '')}</p>
      <p><b>อาการสำคัญ (CC) :</b> ${esc_(p.chiefComplaint || '')}</p>
      <h2>ส่วนที่ 2 : การวินิจฉัย และ การรักษา</h2>
      <p><b>การวินิจฉัยของแพทย์ (Dx) :</b> ${esc_(p.diagnosis || '')}</p>
      <p><b>การรักษาของแพทย์ :</b> ${esc_(p.treatment || '')}</p>
      <p><b>ยา/วัคซีนที่ได้รับ :</b> ${esc_(p.medication || p.vaccine || '')}</p>
    </section>
    <div class="sign">บันทึกเมื่อ ${thaiDateTime_(new Date())}</div>`);
}

function buildStudentSummaryHtml_(s,h){
  const recs = (h.medicalRecords || []).map(function(r){ return '<tr><td>'+esc_(r.visitDate)+'</td><td>'+esc_(r.destination)+'</td><td>'+esc_(r.chiefComplaint)+'</td><td>'+esc_(r.diagnosis)+'</td><td>'+esc_(r.medication)+'</td></tr>'; }).join('');
  const perms = (h.permissions || []).map(function(r){ return '<tr><td>'+esc_(r.permissionDate)+'</td><td>'+esc_(r.destination)+'</td><td>'+esc_(r.chiefComplaint)+'</td><td>'+esc_(r.status)+'</td></tr>'; }).join('');
  return htmlPage_('สรุปประวัติสุขภาพรายบุคคล', `
    <div class="meta"><span>รหัส นพอ. : ${esc_(s.rtAfncCode || s.studentId || '')}</span><span>${thaiDate_(new Date())}</span></div>
    <h1>สรุปประวัติสุขภาพรายบุคคล</h1>
    <section><p><b>ชื่อ - สกุล :</b> ${esc_(s.name || s.studentName || '')} <b class="right">ชั้นปี :</b> ${esc_(s.year || '')}</p></section>
    <h2>ใบขออนุญาตไปตรวจ/รักษา</h2><table><thead><tr><th>วันที่</th><th>สถานที่</th><th>CC</th><th>สถานะ</th></tr></thead><tbody>${perms || '<tr><td colspan="4">ไม่พบข้อมูล</td></tr>'}</tbody></table>
    <h2>บันทึกการตรวจ/รักษา</h2><table><thead><tr><th>วันที่</th><th>สถานที่</th><th>CC</th><th>Dx</th><th>ยา</th></tr></thead><tbody>${recs || '<tr><td colspan="5">ไม่พบข้อมูล</td></tr>'}</tbody></table>`);
}

function htmlPage_(title, body){
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:16mm}body{font-family:'Sarabun','TH Sarabun New',Arial,sans-serif;color:#13233a;font-size:18px}.meta{display:flex;justify-content:space-between;margin-bottom:24px}.logo{text-align:center;font-size:14px;color:#64748b;margin-bottom:6px}h1{text-align:center;font-size:30px;line-height:1.25;margin:10px 0 22px;color:#0b2445}h2{border:3px solid #0b2445;display:inline-block;padding:7px 14px;font-size:22px;margin:18px 0 10px}section{border:3px solid #0b2445;padding:18px;margin-top:10px}p{border-bottom:1px solid #334155;padding-bottom:5px;line-height:1.7}.right{margin-left:30px}.sign{text-align:right;margin-top:18px;font-size:16px}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px}th,td{border:1px solid #94a3b8;padding:7px;vertical-align:top}th{background:#eaf2ff}
  </style></head><body><div class="logo">วิทยาลัยพยาบาลทหารอากาศ</div>${body}</body></html>`;
}
function esc_(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
function thaiDate_(d){ const x=new Date(d); return Utilities.formatDate(x, Session.getScriptTimeZone(), 'dd/MM/') + (x.getFullYear()+543); }
function thaiDateTime_(d){ const x=new Date(d); return Utilities.formatDate(x, Session.getScriptTimeZone(), 'dd/MM/') + (x.getFullYear()+543) + Utilities.formatDate(x, Session.getScriptTimeZone(), ' HH:mm'); }
