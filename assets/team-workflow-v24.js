/* One News Calendar v2.4
   Restored fixed 5 team-role slots + automatic ordering + leave reason + delete whole day.
*/
(() => {
  const TEAM_SLOTS = [
    { id:'slot-1',  label:'1 รันดาวน์+คิว', order:1 },
    { id:'slot-2a', label:'2 เขียนข่าว', order:2 },
    { id:'slot-2b', label:'2 เขียนข่าว', order:2 },
    { id:'slot-3',  label:'3 ภาพ/Thumbnail/กราฟิก', order:3 },
    { id:'slot-4',  label:'4 ออนไลน์/ช่วยเย็น', order:4 }
  ];
  const LEAVE_PREFIX = 'ลา';
  let dayContext = null;

  const isLeave = label => {
    const s=String(label||'').trim();
    return s==='ลา'||s.startsWith('ลา · ')||s.startsWith('ลา:');
  };
  const leaveReason = label => {
    const s=String(label||'').trim();
    if(s.startsWith('ลา · '))return s.slice(4).trim();
    if(s.startsWith('ลา:'))return s.slice(3).trim();
    return '';
  };
  const leaveLabel = reason => String(reason||'').trim()?`ลา · ${String(reason).trim()}`:'ลา';

  const roleOrder = label => {
    const s=String(label||'').trim();
    if(isLeave(s)) return 100;
    if(s==='1 รันดาวน์+คิว'||s.startsWith('1 ')) return 1;
    if(s==='2 เขียนข่าว'||s.startsWith('2 ')) return 2;
    if(s==='3 ภาพ/Thumbnail/กราฟิก'||s.startsWith('3 ')) return 3;
    if(s==='4 ออนไลน์/ช่วยเย็น'||s.startsWith('4 ')) return 4;
    return 90;
  };

  const css=document.createElement('style');
  css.textContent=`
    .team-fixed-slots{display:grid;gap:10px}
    .team-fixed-slots-title{
      padding:10px 12px;border-radius:10px;background:#eef4ff;color:#1d4ed8;font-weight:800
    }
    .team-slot-row{
      display:grid;grid-template-columns:minmax(210px,1.25fr) minmax(210px,1fr);
      gap:12px;align-items:center;padding:11px 12px;border:1px solid #dfe4ec;
      border-radius:12px;background:#fff
    }
    .team-slot-row .slot-title{display:flex;gap:8px;align-items:center}
    .team-slot-number{
      display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;
      padding:0 8px;border-radius:8px;background:#111827;color:#fff;font-weight:800
    }
    .team-slot-row select{width:100%}
    .team-leave-section{
      margin-top:5px;padding:12px;border:1px dashed #c5cbd5;border-radius:12px;background:#f6f7f9
    }
    .team-leave-section h4{margin:0 0 5px}
    .team-leave-section>p{font-size:12px;color:#667085;margin:0 0 10px}
    .team-leave-list{display:grid;gap:8px}
    .team-leave-row{
      display:grid;grid-template-columns:minmax(150px,.85fr) minmax(190px,1.25fr);
      gap:10px;align-items:center;padding:8px 10px;border:1px solid #d9dde5;
      border-radius:10px;background:white
    }
    .team-leave-check{display:flex;align-items:center;gap:8px}
    .team-leave-reason{width:100%}
    .team-leave-reason:disabled{background:#f3f4f6;color:#98a2b3}
    .event.is-leave{--c:#9ca3af !important;background:#f3f4f6 !important;opacity:.94}
    .event.is-leave strong,.event.is-leave small{color:#6b7280 !important}
    .day-delete-btn{border:1px solid #efb5b5 !important;color:#b42318 !important;background:#fff7f7 !important}
    @media(max-width:650px){
      .team-slot-row,.team-leave-row{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(css);

  function rowsForTeamDay(dt){
    return currentDayEvents('team',dt).slice().sort((a,b)=>{
      const d=roleOrder(a.label)-roleOrder(b.label);
      if(d)return d;
      return (person(a.person_id)?.sort_order||999)-(person(b.person_id)?.sort_order||999);
    });
  }

  function slotValues(dt){
    const rows=rowsForTeamDay(dt).filter(r=>!isLeave(r.label));
    const used=new Set();
    return TEAM_SLOTS.map(slot=>{
      const idx=rows.findIndex((r,i)=>!used.has(i)&&String(r.label||'').trim()===slot.label);
      if(idx>=0){used.add(idx);return rows[idx].person_id}
      return '';
    });
  }

  function leaveValues(dt){
    const map=new Map();
    rowsForTeamDay(dt).filter(r=>isLeave(r.label)).forEach(r=>{
      map.set(r.person_id,leaveReason(r.label));
    });
    return map;
  }

  function teamEditorHTML(dt){
    const team=teams().slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const options=team.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    const leaves=leaveValues(dt);

    return `
      <div class="team-fixed-slots">
        <div class="team-fixed-slots-title">หน้าที่ของทีมในวันนี้ — เรียงอัตโนมัติ 1 → 2 → 2 → 3 → 4</div>

        ${TEAM_SLOTS.map((slot,i)=>`
          <label class="team-slot-row">
            <span class="slot-title">
              <span class="team-slot-number">${slot.order}</span>
              <b>${slot.label.replace(/^[1-4]\s/,'')}</b>
            </span>
            <select class="team-role-person" data-slot-index="${i}">
              <option value="">— ไม่เลือก —</option>
              ${options}
            </select>
          </label>
        `).join('')}

        <section class="team-leave-section">
          <h4>ลา</h4>
          <p>คนที่ลาจะถูกแสดงล่างสุดของวัน เป็นสีเทา พร้อมเหตุผลการลา</p>
          <div class="team-leave-list">
            ${team.map(p=>`
              <div class="team-leave-row">
                <label class="team-leave-check">
                  <input type="checkbox" class="team-leave-person" value="${p.id}" ${leaves.has(p.id)?'checked':''}>
                  <b>${p.name}</b>
                </label>
                <input type="text" class="team-leave-reason" data-id="${p.id}"
                  value="${String(leaves.get(p.id)||'').replace(/"/g,'&quot;')}"
                  placeholder="เช่น ลาป่วย / ลากิจ / ลาพักร้อน"
                  ${leaves.has(p.id)?'':'disabled'}>
              </div>
            `).join('')}
          </div>
        </section>
      </div>`;
  }

  function hydrateTeamEditor(dt){
    const values=slotValues(dt);
    document.querySelectorAll('.team-role-person').forEach((s,i)=>s.value=values[i]||'');
    document.querySelectorAll('.team-leave-person').forEach(c=>{
      c.onchange=()=>{
        const input=document.querySelector(`.team-leave-reason[data-id="${c.value}"]`);
        if(input)input.disabled=!c.checked;
      };
    });
  }

  const oldOpenBulkDay=window.openBulkDay;
  window.openBulkDay=function(kind,dt){
    dayContext={kind,dt};
    oldOpenBulkDay(kind,dt);
    ensureDeleteButton();

    if(kind!=='team')return;

    const holder=document.getElementById('bulkPeople');
    if(!holder)return;
    holder.innerHTML=teamEditorHTML(dt);
    hydrateTeamEditor(dt);

    const title=document.getElementById('bulkDayTitle');
    if(title)title.textContent=`จัดเวรทีมทั้งวัน · ${+dt.slice(-2)} ${monthName()}`;
  };

  async function replaceTeamDay(dt,rows,note,showNote){
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
        q=await S.db.from('day_notes').delete()
          .eq('board_id',boardId).eq('note_date',dt);
      }
      if(q.error)throw q.error;
    }else{
      S.events=S.events.filter(e=>!(e.kind==='team'&&e.board_id===boardId&&e.event_date===dt));
      rows.forEach((r,i)=>S.events.push({
        id:'local-team-'+Date.now()+'-'+i,
        person_id:r.person_id,event_date:dt,label:r.label,show_label:true,
        kind:'team',board_id:boardId
      }));
      S.dayNotes=S.dayNotes.filter(n=>!(n.board_id===boardId&&n.note_date===dt));
      if(note)S.dayNotes.push({
        id:'local-note-'+Date.now(),board_id:boardId,note_date:dt,note,show_note:showNote
      });
    }
  }

  const form=document.getElementById('bulkDayForm');
  form.addEventListener('submit',async e=>{
    if(!dayContext||dayContext.kind!=='team')return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const active=[...document.querySelectorAll('.team-role-person')]
      .map((s,i)=>({person_id:s.value,label:TEAM_SLOTS[i].label}))
      .filter(x=>x.person_id);

    const ids=active.map(x=>x.person_id);
    if(new Set(ids).size!==ids.length){
      toast('คนเดียวกันถูกเลือกมากกว่า 1 หน้าที่ กรุณาเลือกใหม่');
      return;
    }

    const leaves=[...document.querySelectorAll('.team-leave-person:checked')].map(c=>{
      const reason=document.querySelector(`.team-leave-reason[data-id="${c.value}"]`)?.value.trim()||'';
      return {person_id:c.value,label:leaveLabel(reason)};
    });

    const leaveIds=new Set(leaves.map(x=>x.person_id));
    const conflict=active.find(x=>leaveIds.has(x.person_id));
    if(conflict){
      toast(`${person(conflict.person_id)?.name||'คนนี้'} ถูกเลือกทั้งทำงานและลา`);
      return;
    }

    const rows=[...active,...leaves];
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
    if(!confirm(`ลบคิวทั้งหมดของวันที่ ${day} ${monthName()} ใช่ไหม?\n\nรายชื่อ หน้าที่ สถานะลา และหมายเหตุของวันนั้นจะถูกลบทั้งหมด`))return;

    const kind=dayContext.kind,dt=dayContext.dt,b=board(kind);
    try{
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
    }catch(err){toast(err?.message||'ลบคิวไม่สำเร็จ')}
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

  function sortAndDecorateTeamCalendar(){
    const cal=document.getElementById('teamCalendar');
    if(!cal)return;

    cal.querySelectorAll('.day[data-day]').forEach(day=>{
      const events=[...day.querySelectorAll('.event')];

      events.forEach(el=>{
        const row=S.events.find(x=>String(x.id)===String(el.dataset.id));
        el.classList.toggle('is-leave',isLeave(row?.label));
      });

      events.sort((a,b)=>{
        const ea=S.events.find(x=>String(x.id)===String(a.dataset.id));
        const eb=S.events.find(x=>String(x.id)===String(b.dataset.id));
        const byRole=roleOrder(ea?.label)-roleOrder(eb?.label);
        if(byRole)return byRole;
        return (person(ea?.person_id)?.sort_order||999)-(person(eb?.person_id)?.sort_order||999);
      });

      events.forEach(el=>day.appendChild(el));
    });
  }

  const priorRenderCalendar=renderCalendar;
  renderCalendar=function(kind){
    priorRenderCalendar(kind);
    if(kind==='team')sortAndDecorateTeamCalendar();
  };

  render();
  ensureDeleteButton();
  if(document.getElementById('versionBadge'))document.getElementById('versionBadge').textContent='v2.4';
})();