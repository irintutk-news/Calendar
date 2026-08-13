/* One News Calendar v2.3
   Team roles + save fix + leave + leave reason + delete whole day
*/
(() => {
  const ROLE_SLOTS = [
    { key:'1',  label:'1 รันดาวน์+คิว', order:1 },
    { key:'2a', label:'2 เขียนข่าว', order:2 },
    { key:'2b', label:'2 เขียนข่าว', order:2 },
    { key:'3',  label:'3 ภาพ/Thumbnail/กราฟิก', order:3 },
    { key:'4',  label:'4 ออนไลน์/ช่วยเย็น', order:4 }
  ];
  const LEAVE_PREFIX = 'ลา';
  let dayContext = null;

  const roleOrder = label => {
    const s = String(label || '').trim();
    if (s === LEAVE_PREFIX || s.startsWith(LEAVE_PREFIX + ' · ') || s.startsWith(LEAVE_PREFIX + ':')) return 100;
    if (s.startsWith('1 ')) return 1;
    if (s.startsWith('2 ')) return 2;
    if (s.startsWith('3 ')) return 3;
    if (s.startsWith('4 ')) return 4;
    return 90;
  };

  const isLeave = label => roleOrder(label) === 100;

  const leaveReasonFromLabel = label => {
    const s = String(label || '').trim();
    if (s.startsWith('ลา · ')) return s.slice(4).trim();
    if (s.startsWith('ลา:')) return s.slice(3).trim();
    return '';
  };

  const leaveLabel = reason => {
    const r = String(reason || '').trim();
    return r ? `ลา · ${r}` : 'ลา';
  };

  const css = document.createElement('style');
  css.textContent = `
    .team-role-editor{display:grid;gap:9px}
    .team-role-slot{
      display:grid;grid-template-columns:minmax(190px,1.15fr) minmax(190px,1fr);
      gap:10px;align-items:center;padding:10px 12px;border:1px solid #e5e7eb;
      border-radius:12px;background:#f8fafc
    }
    .team-role-slot b{font-size:14px}
    .team-role-slot select{width:100%}
    .team-role-help{font-size:12px;color:#667085;margin:0}
    .team-leave-box{
      margin-top:4px;padding:11px 12px;border:1px dashed #c8cdd6;border-radius:12px;background:#f7f7f8
    }
    .team-leave-box h4{margin:0 0 8px}
    .team-leave-list{display:grid;gap:8px}
    .team-leave-row{
      display:grid;grid-template-columns:minmax(150px,.9fr) minmax(180px,1.3fr);
      gap:10px;align-items:center;border:1px solid #d7dce5;border-radius:10px;
      padding:8px 10px;background:white
    }
    .team-leave-chip{display:flex;align-items:center;gap:7px}
    .team-leave-reason{width:100%}
    .team-leave-reason:disabled{background:#f3f4f6;color:#9ca3af}
    .event.is-leave{--c:#9ca3af !important;background:#f3f4f6 !important;opacity:.94}
    .event.is-leave strong,.event.is-leave small{color:#6b7280 !important}
    .day-delete-btn{
      border:1px solid #efb5b5 !important;color:#b42318 !important;background:#fff7f7 !important
    }
    @media(max-width:650px){
      .team-role-slot,.team-leave-row{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(css);

  function teamRowsForDate(dt) {
    return currentDayEvents('team', dt).slice().sort((a,b)=>{
      const d = roleOrder(a.label) - roleOrder(b.label);
      if (d) return d;
      return (person(a.person_id)?.sort_order||999)-(person(b.person_id)?.sort_order||999);
    });
  }

  function roleSelections(dt) {
    const rows = teamRowsForDate(dt).filter(r=>!isLeave(r.label));
    const used = new Set();
    return ROLE_SLOTS.map(slot=>{
      const idx = rows.findIndex((r,i)=>!used.has(i) && String(r.label||'').trim()===slot.label);
      if(idx>=0){used.add(idx);return rows[idx].person_id}
      return '';
    });
  }

  function leaveSelections(dt) {
    const map = new Map();
    teamRowsForDate(dt).filter(r=>isLeave(r.label)).forEach(r=>{
      map.set(r.person_id, leaveReasonFromLabel(r.label));
    });
    return map;
  }

  function teamEditorMarkup(dt) {
    const leave = leaveSelections(dt);
    const list = teams().slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const options = list.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    return `
      <div class="team-role-editor">
        <p class="team-role-help">เลือกคนตามหน้าที่ของวันนี้ ระบบเรียงบนปฏิทิน 1 → 2 → 2 → 3 → 4 และคนลาจะอยู่ล่างสุด</p>
        ${ROLE_SLOTS.map((slot,i)=>`
          <label class="team-role-slot">
            <b>${slot.label}</b>
            <select class="team-role-person" data-slot="${i}">
              <option value="">— ไม่เลือก —</option>${options}
            </select>
          </label>`).join('')}
        <section class="team-leave-box">
          <h4>ลา</h4>
          <div class="team-leave-list">
            ${list.map(p=>`
              <div class="team-leave-row">
                <label class="team-leave-chip">
                  <input type="checkbox" class="team-leave-person" value="${p.id}" ${leave.has(p.id)?'checked':''}>
                  <span>${p.name}</span>
                </label>
                <input type="text" class="team-leave-reason" data-id="${p.id}"
                  value="${(leave.get(p.id)||'').replace(/"/g,'&quot;')}"
                  placeholder="เหตุผล เช่น ลาป่วย / ลากิจ / ลาพักร้อน"
                  ${leave.has(p.id)?'':'disabled'}>
              </div>`).join('')}
          </div>
        </section>
      </div>`;
  }

  function installTeamValues(dt){
    const values=roleSelections(dt);
    [...document.querySelectorAll('.team-role-person')].forEach((s,i)=>s.value=values[i]||'');
    document.querySelectorAll('.team-leave-person').forEach(c=>{
      c.onchange=()=>{
        const input=document.querySelector(`.team-leave-reason[data-id="${c.value}"]`);
        if(input)input.disabled=!c.checked;
      };
    });
  }

  const previousOpenBulkDay = window.openBulkDay;
  window.openBulkDay = function(kind,dt){
    dayContext={kind,dt};
    previousOpenBulkDay(kind,dt);
    ensureDeleteButton();

    if(kind!=='team'){
      document.getElementById('bulkPeople')?.classList.remove('team-slots-mode');
      return;
    }

    const holder=document.getElementById('bulkPeople');
    if(!holder)return;
    holder.innerHTML=teamEditorMarkup(dt);
    holder.classList.add('team-slots-mode');
    installTeamValues(dt);

    const title=document.getElementById('bulkDayTitle');
    if(title)title.textContent=`จัดเวรทีมทั้งวัน · ${+dt.slice(-2)} ${monthName()}`;
  };

  async function replaceTeamDay(dt, rows, note, showNote){
    const boardId=board('team');
    if(S.db){
      let q=await S.db.from('calendar_events').delete()
        .eq('kind','team').eq('board_id',boardId).eq('event_date',dt);
      if(q.error)throw q.error;

      if(rows.length){
        q=await S.db.from('calendar_events').insert(rows.map(r=>({
          person_id:r.person_id,event_date:dt,label:r.label,show_label:true,
          kind:'team',board_id:boardId
        }))).select('*');
        if(q.error)throw q.error;
      }

      if(note){
        q=await S.db.from('day_notes').upsert({
          board_id:boardId,note_date:dt,note,show_note:showNote,
          updated_at:new Date().toISOString()
        },{onConflict:'board_id,note_date'});
      }else{
        q=await S.db.from('day_notes').delete().eq('board_id',boardId).eq('note_date',dt);
      }
      if(q.error)throw q.error;
    }else{
      S.events=S.events.filter(e=>!(e.kind==='team'&&e.board_id===boardId&&e.event_date===dt));
      rows.forEach((r,i)=>S.events.push({
        id:'local-team-'+Date.now()+'-'+i,person_id:r.person_id,event_date:dt,
        label:r.label,show_label:true,kind:'team',board_id:boardId
      }));
      S.dayNotes=S.dayNotes.filter(n=>!(n.board_id===boardId&&n.note_date===dt));
      if(note)S.dayNotes.push({
        id:'local-note-'+Date.now(),board_id:boardId,note_date:dt,note,show_note:showNote
      });
    }
  }

  const bulkForm=document.getElementById('bulkDayForm');
  bulkForm.addEventListener('submit',async e=>{
    if(!dayContext||dayContext.kind!=='team')return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const active=[...document.querySelectorAll('.team-role-person')]
      .map((s,i)=>({person_id:s.value,label:ROLE_SLOTS[i].label}))
      .filter(x=>x.person_id);

    const activeIds=active.map(x=>x.person_id);
    if(new Set(activeIds).size!==activeIds.length){
      toast('คนเดียวกันถูกเลือกมากกว่า 1 หน้าที่');
      return;
    }

    const leave=[...document.querySelectorAll('.team-leave-person:checked')].map(c=>{
      const reason=document.querySelector(`.team-leave-reason[data-id="${c.value}"]`)?.value.trim()||'';
      return {person_id:c.value,label:leaveLabel(reason)};
    });

    const leaveIds=new Set(leave.map(x=>x.person_id));
    const conflict=active.find(x=>leaveIds.has(x.person_id));
    if(conflict){
      toast(`${person(conflict.person_id)?.name||'คนนี้'} ถูกเลือกทั้ง “ทำงาน” และ “ลา”`);
      return;
    }

    const rows=[...active,...leave];
    const note=document.getElementById('bulkNote').value.trim();
    const showNote=document.getElementById('bulkShowNote').checked;
    const repeat=document.getElementById('bulkRepeatToggle').checked;
    const repeatDates=repeat
      ? [...document.querySelectorAll('#bulkRepeatGrid button.active')].map(b=>b.dataset.date)
      : [];
    const targets=[...new Set([dayContext.dt,...repeatDates])];

    try{
      for(const dt of targets)await replaceTeamDay(dt,rows,note,showNote);
      document.getElementById('bulkDayDialog').close();
      touch();
      if(S.db)await load();else render();
      toast(`บันทึกเวรทีม ${targets.length} วันแล้ว`);
    }catch(err){
      toast(err?.message||'บันทึกไม่สำเร็จ');
    }
  },true);

  async function deleteWholeDay(){
    if(!dayContext?.dt)return toast('เลือกวันที่ก่อน');
    const day=+dayContext.dt.slice(-2);
    if(!confirm(`ลบคิวทั้งหมดของวันที่ ${day} ${monthName()} ใช่ไหม?\n\nรายชื่อและหมายเหตุของวันนั้นจะถูกลบทั้งหมด`))return;

    try{
      const kind=dayContext.kind,dt=dayContext.dt,b=board(kind);
      if(S.db){
        let q=await S.db.from('calendar_events').delete()
          .eq('kind',kind).eq('board_id',b).eq('event_date',dt);
        if(q.error)throw q.error;
        q=await S.db.from('day_notes').delete().eq('board_id',b).eq('note_date',dt);
        if(q.error)throw q.error;
      }else{
        S.events=S.events.filter(e=>!(e.kind===kind&&e.board_id===b&&e.event_date===dt));
        S.dayNotes=S.dayNotes.filter(n=>!(n.board_id===b&&n.note_date===dt));
      }
      document.getElementById('bulkDayDialog').close();
      touch();
      if(S.db)await load();else render();
      toast(`ลบคิววันที่ ${day} แล้ว`);
    }catch(err){
      toast(err?.message||'ลบคิวไม่สำเร็จ');
    }
  }

  function ensureDeleteButton(){
    const actions=document.querySelector('#bulkDayForm .bulk-actions');
    if(!actions||document.getElementById('deleteWholeDay'))return;
    const b=document.createElement('button');
    b.type='button';b.id='deleteWholeDay';b.className='day-delete-btn';
    b.textContent='ลบคิววันนี้';
    b.onclick=deleteWholeDay;
    actions.appendChild(b);
  }
  ensureDeleteButton();

  function decorateAndSortTeam(){
    const cal=document.getElementById('teamCalendar');
    if(!cal)return;
    cal.querySelectorAll('.day[data-day]').forEach(day=>{
      const events=[...day.querySelectorAll('.event')];
      events.forEach(el=>{
        const row=S.events.find(x=>String(x.id)===String(el.dataset.id));
        if(isLeave(row?.label))el.classList.add('is-leave');
        else el.classList.remove('is-leave');
      });
      events.sort((a,b)=>{
        const ea=S.events.find(x=>String(x.id)===String(a.dataset.id));
        const eb=S.events.find(x=>String(x.id)===String(b.dataset.id));
        const o=roleOrder(ea?.label)-roleOrder(eb?.label);
        if(o)return o;
        return (person(ea?.person_id)?.sort_order||999)-(person(eb?.person_id)?.sort_order||999);
      });
      events.forEach(el=>day.appendChild(el));
    });
  }

  const prevRenderCalendar=renderCalendar;
  renderCalendar=function(kind){
    prevRenderCalendar(kind);
    if(kind==='team')decorateAndSortTeam();
  };

  render();
  ensureDeleteButton();
  if(document.getElementById('versionBadge'))document.getElementById('versionBadge').textContent='v2.3';
})();