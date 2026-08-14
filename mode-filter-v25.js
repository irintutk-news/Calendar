/* One News Calendar v2.5 — Viewer/Admin mode + Team Work/Leave filter */
(() => {
  const MODE_KEY='oneNewsCalendarModeV25';
  let mode=localStorage.getItem(MODE_KEY)==='admin'?'admin':'viewer';
  let teamFilter='all';

  const isLeave=label=>{
    const s=String(label||'').trim();
    return s==='ลา'||s.startsWith('ลา · ')||s.startsWith('ลา:');
  };

  const css=document.createElement('style');
  css.textContent=`
    .header-tools{display:flex;align-items:center;gap:12px;margin-left:auto}
    .mode-switch{display:inline-flex;gap:2px;padding:3px;border:1px solid #d9dee8;border-radius:10px;background:#f4f6f8}
    .mode-switch button{border:0;background:transparent;border-radius:7px;padding:6px 10px;font-weight:700;cursor:pointer;color:#667085}
    .mode-switch button.active{background:#111827;color:#fff}
    body.viewer-mode .admin-only-hidden{display:none!important}
    body.viewer-mode input.title{pointer-events:none;border-color:transparent!important;background:transparent!important;box-shadow:none!important}
    body.viewer-mode .day,body.viewer-mode .event{cursor:default!important}
    .team-status-filter{display:inline-flex;gap:3px;padding:3px;border:1px solid #d9dee8;border-radius:10px;background:#f7f8fa}
    .team-status-filter button{border:0;background:transparent;padding:7px 10px;border-radius:7px;font-weight:700;color:#667085;cursor:pointer}
    .team-status-filter button.active{background:#111827;color:#fff}
    @media(max-width:700px){.header-tools{width:100%;justify-content:space-between}.team-status-filter{width:100%}.team-status-filter button{flex:1}}
  `;
  document.head.appendChild(css);

  function applyMode(){
    document.body.classList.toggle('viewer-mode',mode==='viewer');
    document.body.classList.toggle('admin-mode',mode==='admin');
    document.querySelectorAll('#modeSwitch button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    document.querySelectorAll('.manage,.addEvent,#addBoard,.copy-month-btn').forEach(el=>el.classList.toggle('admin-only-hidden',mode==='viewer'));
    document.querySelectorAll('input.title').forEach(input=>input.readOnly=mode==='viewer');
    document.querySelectorAll('.event').forEach(el=>el.draggable=mode==='admin');
    localStorage.setItem(MODE_KEY,mode);
  }

  document.querySelectorAll('#modeSwitch button').forEach(b=>{
    b.addEventListener('click',()=>{
      mode=b.dataset.mode;
      applyMode();
      if(typeof toast==='function')toast(mode==='admin'?'เปิดโหมดผู้ดูแลแล้ว':'เปลี่ยนเป็นโหมดผู้ชมแล้ว');
    });
  });

  document.addEventListener('click',e=>{
    if(mode!=='viewer')return;
    const t=e.target.closest('.day[data-day],.event,.manage,.addEvent,#addBoard,.copy-month-btn');
    if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(typeof toast==='function')toast('โหมดผู้ชม: ดูข้อมูลได้อย่างเดียว');
  },true);

  document.addEventListener('dragstart',e=>{
    if(mode==='viewer'&&e.target.closest('.event'))e.preventDefault();
  },true);

  document.addEventListener('drop',e=>{
    if(mode==='viewer'&&e.target.closest('.day')){e.preventDefault();e.stopImmediatePropagation();}
  },true);

  document.addEventListener('keydown',e=>{
    if(mode==='viewer'&&(e.ctrlKey||e.metaKey)&&['c','v'].includes(e.key.toLowerCase())){
      const tag=document.activeElement?.tagName;
      if(!['INPUT','TEXTAREA'].includes(tag)){
        e.preventDefault();e.stopImmediatePropagation();
        if(typeof toast==='function')toast('โหมดผู้ชม: ไม่สามารถคัดลอก/วางคิวได้');
      }
    }
  },true);

  function applyTeamFilter(){
    const cal=document.getElementById('teamCalendar');
    if(!cal)return;

    cal.querySelectorAll('.day[data-day]').forEach(day=>{
      const events=[...day.querySelectorAll('.event')];
      let visible=0;
      events.forEach(el=>{
        const row=S.events.find(x=>String(x.id)===String(el.dataset.id));
        const leave=isLeave(row?.label);
        const show=teamFilter==='all'||(teamFilter==='work'&&!leave)||(teamFilter==='leave'&&leave);
        el.style.display=show?'':'none';
        if(show)visible++;
      });

      const empty=day.querySelector('.team-filter-empty');
      if(empty)empty.remove();
    });
  }

  document.querySelectorAll('#teamStatusFilter button').forEach(b=>{
    b.addEventListener('click',()=>{
      teamFilter=b.dataset.filter;
      document.querySelectorAll('#teamStatusFilter button').forEach(x=>x.classList.toggle('active',x===b));
      applyTeamFilter();
    });
  });

  const oldRenderCalendar=renderCalendar;
  renderCalendar=function(kind){
    oldRenderCalendar(kind);
    if(kind==='team')applyTeamFilter();
    applyMode();
  };

  const oldRender=render;
  render=function(){
    oldRender();
    applyMode();
    applyTeamFilter();
  };

  applyMode();
  applyTeamFilter();
  if(document.getElementById('versionBadge'))document.getElementById('versionBadge').textContent='v2.5';
})();