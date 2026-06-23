window.LEAVE_SYSTEM_CONFIG = {
  apiUrl: '',
  liffId: '',
  approvalLevels: 2,
  demoMode: true
};

// Hotfix: make mobile/iPhone taps work even when browser caches old app.js.
(function () {
  function qs(q){ return document.querySelector(q); }
  function qsa(q){ return Array.prototype.slice.call(document.querySelectorAll(q)); }
  function closeDrawer(){ document.body.classList.remove('drawer-open'); var s=qs('#sidebar'); if(s) s.classList.remove('open'); }
  function toggleDrawer(){ var s=qs('#sidebar'); if(!s) return; var open=s.classList.toggle('open'); document.body.classList.toggle('drawer-open', open); }
  function safeRender(){ try{ if(typeof window.render==='function') window.render(); }catch(e){ console.warn(e); } }
  function showPage(page){
    if(!page) return;
    qsa('.page').forEach(function(el){ el.classList.remove('active'); });
    var target=qs('#page-'+page); if(target) target.classList.add('active');
    qsa('.nav-item').forEach(function(el){ el.classList.toggle('active', el.getAttribute('data-page')===page); });
    var titles={dashboard:'แดชบอร์ด',request:'ยื่นใบลา',approvals:'คิวอนุมัติ',calendar:'ปฏิทินการลา',employees:'พนักงาน',reports:'รายงาน',settings:'ตั้งค่า',guide:'คู่มือ'};
    if(qs('#pageTitle')) qs('#pageTitle').textContent=titles[page]||page;
    if(qs('#pageSubtitle')) qs('#pageSubtitle').textContent=page==='dashboard'?'ภาพรวมการทำงานวันนี้':'ระบบลาออนไลน์ผ่าน LINE';
    closeDrawer(); safeRender();
    try{ window.scrollTo(0,0); }catch(e){}
  }
  function setupMobileActions(){
    document.addEventListener('click', function(e){
      var menu=e.target.closest && e.target.closest('#menuBtn');
      if(menu){ e.preventDefault(); e.stopPropagation(); toggleDrawer(); return; }
      var nav=e.target.closest && e.target.closest('[data-page]');
      if(nav){ e.preventDefault(); e.stopPropagation(); showPage(nav.getAttribute('data-page')); return; }
      var go=e.target.closest && e.target.closest('[data-go]');
      if(go){ e.preventDefault(); e.stopPropagation(); showPage(go.getAttribute('data-go')); return; }
      var tab=e.target.closest && e.target.closest('[data-tab]');
      if(tab){ e.preventDefault(); e.stopPropagation(); var name=tab.getAttribute('data-tab'); qsa('.tab').forEach(function(x){x.classList.remove('active')}); qsa('.tab-panel').forEach(function(x){x.classList.remove('active')}); tab.classList.add('active'); var p=qs('#tab-'+name); if(p)p.classList.add('active'); return; }
      if(document.body.classList.contains('drawer-open')){ var side=qs('#sidebar'); if(side && !side.contains(e.target)){ closeDrawer(); } }
    }, true);
    qsa('button:not([type])').forEach(function(b){ b.setAttribute('type','button'); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', setupMobileActions); else setupMobileActions();
})();

// วิธีใช้งานจริง:
// 1) copy เป็น js/config.js
// 2) ใส่ apiUrl จาก Google Apps Script Web App
// 3) ใส่ liffId จาก LINE Developers Console
