/* One News Calendar v2.6 — Password gate for Admin UI mode */
(() => {
  const ADMIN_PASSWORD='gmm25one31';
  const AUTH_KEY='oneNewsAdminAuthorizedV26';
  const MODE_KEY='oneNewsCalendarModeV25';

  const css=document.createElement('style');
  css.textContent=`
    #adminPasswordDialog{width:min(420px,92vw)}
    #adminPasswordDialog form{display:grid;gap:14px}
    #adminPasswordDialog label{display:grid;gap:7px}
    #adminPasswordDialog input{width:100%;box-sizing:border-box}
    #adminPasswordError{display:none;color:#b42318;font-size:13px}
    #adminPasswordError.show{display:block}
  `;
  document.head.appendChild(css);

  const dlg=document.createElement('dialog');
  dlg.id='adminPasswordDialog';
  dlg.innerHTML=`<form id="adminPasswordForm">
    <h2>เข้าสู่โหมดผู้ดูแล</h2>
    <label>รหัสผู้ดูแล
      <input id="adminPasswordInput" type="password" autocomplete="off" required>
    </label>
    <div id="adminPasswordError">รหัสไม่ถูกต้อง</div>
    <footer>
      <button type="button" id="adminPasswordCancel">ยกเลิก</button>
      <button type="submit">เข้าสู่โหมดผู้ดูแล</button>
    </footer>
  </form>`;
  document.body.appendChild(dlg);

  const adminBtn=document.querySelector('#modeSwitch button[data-mode="admin"]');
  const viewerBtn=document.querySelector('#modeSwitch button[data-mode="viewer"]');
  if(!adminBtn||!viewerBtn)return;

  // Password is required whenever a non-authorized browser session requests Admin.
  adminBtn.addEventListener('click',e=>{
    if(sessionStorage.getItem(AUTH_KEY)==='1')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const input=document.getElementById('adminPasswordInput');
    input.value='';
    document.getElementById('adminPasswordError').classList.remove('show');
    dlg.showModal();
    setTimeout(()=>input.focus(),0);
  },true);

  document.getElementById('adminPasswordCancel').onclick=()=>dlg.close();

  document.getElementById('adminPasswordForm').onsubmit=e=>{
    e.preventDefault();
    const input=document.getElementById('adminPasswordInput');
    if(input.value!==ADMIN_PASSWORD){
      document.getElementById('adminPasswordError').classList.add('show');
      input.select();
      return;
    }
    sessionStorage.setItem(AUTH_KEY,'1');
    localStorage.setItem(MODE_KEY,'admin');
    dlg.close();
    location.reload();
  };

  // Switching back to Viewer locks Admin again, so password is required next time.
  viewerBtn.addEventListener('click',()=>{
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.setItem(MODE_KEY,'viewer');
  },true);

  if(document.getElementById('versionBadge'))document.getElementById('versionBadge').textContent='v2.7';
})();