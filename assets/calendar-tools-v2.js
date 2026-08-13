/* One News Calendar workflow v2.0 */
(() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let selectedDay = null;
  let dayClipboard = null;
  let dragCopyEventId = null;

  const style = document.createElement('style');
  style.textContent = `
    .personrow{gap:12px}.personrow .person-actions{margin-left:auto;display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    .personrow .person-actions button{border:1px solid #d7dce5;background:#fff;border-radius:9px;padding:7px 10px;font-weight:700;cursor:pointer}
    .personrow .person-actions .delete-person{color:#b42318;border-color:#f0b8b4}
    .day.selected-copy-day{outline:3px solid #3566d6;outline-offset:-3px}.copy-month-btn{white-space:nowrap}
    .bulk-dialog{width:min(760px,94vw);max-height:92vh}.bulk-dialog form{display:flex;flex-direction:column;gap:14px}
    .bulk-people{display:grid;gap:8px;max-height:38vh;overflow:auto;border:1px solid #e5e7eb;border-radius:12px;padding:10px}
    .bulk-person{display:grid;grid-template-columns:auto minmax(150px,1fr) minmax(180px,1.4fr);gap:10px;align-items:center;padding:8px;border-radius:10px;background:#f8fafc}
    .bulk-person.is-on{background:#eef4ff}.bulk-person .who{display:flex;gap:8px;align-items:center;min-width:0}.bulk-person .who b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bulk-person input[type=text]{width:100%}.bulk-note{display:grid;gap:7px}.bulk-actions{display:flex;gap:8px;flex-wrap:wrap}
    .bulk-actions button{border:1px solid #d7dce5;background:#fff;border-radius:9px;padding:8px 11px}.bulk-actions .primary{background:#111827;color:#fff}
    .repeat-panel{border:1px solid #e5e7eb;border-radius:12px;padding:10px}.repeat-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:8px}
    .repeat-grid button{padding:7px 2px;border:1px solid #d7dce5;background:#fff;border-radius:8px}.repeat-grid button.active{background:#3566d6;color:#fff;border-color:#3566d6}
    .month-copy-dialog{width:min(520px,92vw)}.month-copy-dialog form{display:grid;gap:14px}.month-copy-dialog .mode{display:grid;gap:8px}.shortcut-hint{font-size:12px;color:#667085}
    @media(max-width:650px){.bulk-person{grid-template-columns:auto 1fr}.bulk-person input[type=text]{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  window.peopleDialog = function(kind='host'){
    $('peopleTitle').textContent = kind==='host' ? 'รูปและรายชื่อพิธีกร' : 'รูปและรายชื่อทีม';
    const list = S.people.filter(p=>p.kind===kind);
    $('peopleList').innerHTML = `<button id="newPerson">＋ เพิ่ม${kind==='host'?'พิธีกร':'ทีมงาน'}</button>` + list.map(p=>`
      <div class="personrow"><label class="photo">${pic(p)}<input type="file" accept="image/*" data-id="${esc(p.id)}"></label>
      <span><b>${esc(p.name)}</b><small>${kind==='host'?'หมวด '+esc(p.category||'-'):esc(p.role||'')}</small></span>
      <div class="person-actions"><button type="button" class="edit-person" data-id="${esc(p.id)}">แก้ไข</button><button type="button" class="delete-person" data-id="${esc(p.id)}">ลบ</button></div></div>`).join('');
    $('newPerson').onclick=()=>openPersonEditor(kind);
    $('peopleList').querySelectorAll('input[type=file]').forEach(i=>i.onchange=()=>upload(i.dataset.id,i.files[0]));
    $('peopleList').querySelectorAll('.edit-person').forEach(b=>b.onclick=()=>openPersonEditor(kind,b.dataset.id));
    $('peopleList').querySelectorAll('.delete-person').forEach(b=>b.onclick=()=>deletePerson(b.dataset.id));
    if(!$('peopleDialog').open)$('peopleDialog').showModal();
  };

  window.openPersonEditor = function(kind,id=''){
    const p=id?person(id):null;$('personForm').reset();$('personKind').value=kind;$('personEditId').value=id;
    $('personDialogTitle').textContent=p?`แก้ไข ${p.name}`:`เพิ่ม${kind==='host'?'พิธีกร':'ทีมงาน'}`;
    $('personName').value=p?.name||'';$('personMeta').value=kind==='host'?(p?.category||''):(p?.role||'');$('personColor').value=p?.color||'#3566d6';
    if(!$('personDialog').open)$('personDialog').showModal();
  };

  window.savePerson = async function(e){
    e.preventDefault();const kind=$('personKind').value,id=$('personEditId').value,name=$('personName').value.trim(),meta=$('personMeta').value.trim();if(!name)return toast('กรุณาใส่ชื่อ');
    if(id){const p=person(id);if(!p)return toast('ไม่พบรายชื่อนี้');const changes={name,category:kind==='host'?meta:null,role:kind==='team'?meta:null,color:$('personColor').value};
      if(S.db){const {error}=await S.db.from('people').update(changes).eq('id',id);if(error)return toast(error.message)}Object.assign(p,changes);
      if($('personPhoto').files[0])await upload(id,$('personPhoto').files[0]);$('personDialog').close();touch();render();peopleDialog(kind);toast('แก้ไขรายชื่อแล้ว');return;}
    const row={id:kind+'-'+Date.now(),kind,name,category:kind==='host'?meta:null,role:kind==='team'?meta:null,color:$('personColor').value,photo_url:null,include_in_compare:true,sort_order:S.people.filter(p=>p.kind===kind).length+1};
    if(S.db){const {error}=await S.db.from('people').insert(row);if(error)return toast(error.message)}S.people.push(row);if(kind==='host')S.compare.add(row.id);if($('personPhoto').files[0])await upload(row.id,$('personPhoto').files[0]);$('personDialog').close();touch();render();peopleDialog(kind);toast('เพิ่มรายชื่อแล้ว');
  };

  window.deletePerson = async function(id){
    const p=person(id);if(!p)return;if(!confirm(`ลบ “${p.name}” ใช่ไหม?\n\nคิวและวันว่างที่ผูกกับรายชื่อนี้จะถูกลบด้วย`))return;
    if(S.db){const {error}=await S.db.from('people').delete().eq('id',id);if(error)return toast(error.message)}S.people=S.people.filter(x=>x.id!==id);S.events=S.events.filter(x=>x.person_id!==id);S.availability=S.availability.filter(x=>x.person_id!==id);S.assignments=S.assignments.filter(x=>x.person_id!==id);S.compare.delete(id);S.hostFilter.delete(id);touch();render();peopleDialog(p.kind);toast(`ลบ ${p.name} แล้ว`);
  };
  $('personForm').onsubmit=window.savePerson;

  const bulk = document.createElement('dialog');bulk.id='bulkDayDialog';bulk.className='bulk-dialog';bulk.innerHTML=`<form id="bulkDayForm">
    <h2 id="bulkDayTitle">จัดคิวทั้งวัน</h2><div class="shortcut-hint">เลือก/แก้หลายคนได้พร้อมกัน · Ctrl/Cmd+C คัดลอกทั้งวัน · Ctrl/Cmd+V วางทั้งวัน</div>
    <div id="bulkPeople" class="bulk-people"></div>
    <div class="bulk-note"><label>หมายเหตุบนหัววัน <input id="bulkNote" type="text" placeholder="เช่น ถ่ายทอดสด 18.00 น. / งดรายการ"></label><label class="check"><input id="bulkShowNote" type="checkbox" checked> แสดงหมายเหตุบนปฏิทิน</label></div>
    <div class="repeat-panel"><label class="check"><input id="bulkRepeatToggle" type="checkbox"> ทำซ้ำ “ทั้งชุด” ไปวันอื่น</label><div id="bulkRepeatWrap" hidden><div id="bulkRepeatGrid" class="repeat-grid"></div></div></div>
    <div class="bulk-actions"><button type="button" id="copyWholeDay">คัดลอกวันนี้</button><button type="button" id="pasteWholeDay">วางจากที่คัดลอก</button></div>
    <footer><button type="button" id="bulkCancel">ยกเลิก</button><button class="primary">บันทึกทั้งวัน</button></footer></form>`;document.body.appendChild(bulk);

  const getDayRows=(kind,dt)=>currentDayEvents(kind,dt).map(e=>({person_id:e.person_id,label:e.label||'',show_label:e.show_label!==false}));
  function renderBulkPeople(kind,dt,overrideRows=null){
    const rows=overrideRows||getDayRows(kind,dt),byId=new Map(rows.map(r=>[r.person_id,r]));
    const list=(kind==='host'?hosts():teams()).slice().sort((a,b)=>kind==='host'?(String(a.category||'Z').localeCompare(String(b.category||'Z'))||a.name.localeCompare(b.name)):((a.sort_order||0)-(b.sort_order||0)));
    $('bulkPeople').innerHTML=list.map(p=>{const r=byId.get(p.id),on=!!r;return `<div class="bulk-person ${on?'is-on':''}" data-id="${esc(p.id)}"><input class="bulk-check" type="checkbox" ${on?'checked':''}><div class="who">${pic(p)}<span><b>${esc(p.name)}</b><small>${kind==='host'?'หมวด '+esc(p.category||'-'):esc(p.role||'')}</small></span></div><input class="bulk-label" type="text" value="${esc(r?.label||'')}" placeholder="ข้อความใต้ชื่อ (ถ้ามี)" ${on?'':'disabled'}></div>`}).join('');
    $('bulkPeople').querySelectorAll('.bulk-person').forEach(row=>{const c=row.querySelector('.bulk-check'),input=row.querySelector('.bulk-label');c.onchange=()=>{row.classList.toggle('is-on',c.checked);input.disabled=!c.checked}});
  }
  function repeatDays(dt){const max=new Date(S.month.getFullYear(),S.month.getMonth()+1,0).getDate();$('bulkRepeatGrid').innerHTML=Array.from({length:max},(_,i)=>{const d=i+1,x=date(d),same=x===dt;return `<button type="button" data-date="${x}" ${same?'disabled':''}>${d}</button>`}).join('');$('bulkRepeatGrid').querySelectorAll('button:not([disabled])').forEach(b=>b.onclick=()=>b.classList.toggle('active'))}
  window.openBulkDay=function(kind,dt){selectedDay={kind,dt};document.querySelectorAll('.day').forEach(x=>x.classList.remove('selected-copy-day'));const dayNum=+dt.slice(-2),cell=$(kind+'Calendar')?.querySelector(`.day[data-day="${dayNum}"]`);cell?.classList.add('selected-copy-day');$('bulkDayTitle').textContent=`จัดคิวทั้งวัน · ${dayNum} ${monthName()}`;renderBulkPeople(kind,dt);const n=noteFor(kind,dt);$('bulkNote').value=n?.note||'';$('bulkShowNote').checked=n?.show_note!==false;$('bulkRepeatToggle').checked=false;$('bulkRepeatWrap').hidden=true;repeatDays(dt);if(!bulk.open)bulk.showModal()};
  function readBulk(){const rows=[...$('bulkPeople').querySelectorAll('.bulk-person')].filter(r=>r.querySelector('.bulk-check').checked).map(r=>({person_id:r.dataset.id,label:r.querySelector('.bulk-label').value.trim(),show_label:true}));return {rows,note:$('bulkNote').value.trim(),showNote:$('bulkShowNote').checked}}
  async function replaceDay(kind,dt,rows,note,showNote){const b=board(kind);if(S.db){let q=await S.db.from('calendar_events').delete().eq('kind',kind).eq('board_id',b).eq('event_date',dt);if(q.error)throw q.error;if(rows.length){const payload=rows.map(r=>({person_id:r.person_id,event_date:dt,label:r.label||'',show_label:r.show_label!==false,kind,board_id:b}));q=await S.db.from('calendar_events').insert(payload).select('*');if(q.error)throw q.error}if(note){q=await S.db.from('day_notes').upsert({board_id:b,note_date:dt,note,show_note:showNote,updated_at:new Date().toISOString()},{onConflict:'board_id,note_date'});if(q.error)throw q.error}else{q=await S.db.from('day_notes').delete().eq('board_id',b).eq('note_date',dt);if(q.error)throw q.error}}else{S.events=S.events.filter(e=>!(e.kind===kind&&e.board_id===b&&e.event_date===dt));rows.forEach((r,i)=>S.events.push({id:'local-'+Date.now()+'-'+i,person_id:r.person_id,event_date:dt,label:r.label||'',show_label:r.show_label!==false,kind,board_id:b}));S.dayNotes=S.dayNotes.filter(n=>!(n.board_id===b&&n.note_date===dt));if(note)S.dayNotes.push({id:'local-note-'+Date.now(),board_id:b,note_date:dt,note,show_note:showNote})}}
  $('bulkRepeatToggle').onchange=e=>$('bulkRepeatWrap').hidden=!e.target.checked;$('bulkCancel').onclick=()=>bulk.close();
  $('bulkDayForm').onsubmit=async e=>{e.preventDefault();if(!selectedDay)return;const data=readBulk(),targets=[selectedDay.dt,...($('bulkRepeatToggle').checked?[...$('bulkRepeatGrid').querySelectorAll('button.active')].map(b=>b.dataset.date):[])];try{for(const dt of [...new Set(targets)])await replaceDay(selectedDay.kind,dt,data.rows,data.note,data.showNote);bulk.close();touch();if(S.db)await load();else render();toast(`บันทึกทั้งชุด ${targets.length} วันแล้ว`)}catch(err){toast(err.message||'บันทึกไม่สำเร็จ')}};
  function copySelectedDay(){if(!selectedDay?.dt)return toast('เลือกวันที่ก่อน');const n=noteFor(selectedDay.kind,selectedDay.dt);dayClipboard={rows:getDayRows(selectedDay.kind,selectedDay.dt),note:n?.note||'',showNote:n?.show_note!==false,source:selectedDay.dt,kind:selectedDay.kind};toast(`คัดลอกคิววันที่ ${+selectedDay.dt.slice(-2)} แล้ว`)}
  async function pasteToSelected(){if(!selectedDay?.dt)return toast('เลือกวันที่ปลายทางก่อน');if(!dayClipboard)return toast('ยังไม่มีวันที่ที่คัดลอก');if(dayClipboard.kind!==selectedDay.kind)return toast('ประเภทตารางไม่ตรงกัน');const exists=currentDayEvents(selectedDay.kind,selectedDay.dt).length||noteFor(selectedDay.kind,selectedDay.dt)?.note;if(exists&&!confirm('วันที่ปลายทางมีข้อมูลอยู่แล้ว ต้องการแทนที่ทั้งวันหรือไม่?'))return;try{await replaceDay(selectedDay.kind,selectedDay.dt,dayClipboard.rows,dayClipboard.note,dayClipboard.showNote);bulk.close();touch();if(S.db)await load();else render();toast(`วางคิววันที่ ${+selectedDay.dt.slice(-2)} แล้ว`)}catch(err){toast(err.message||'วางไม่สำเร็จ')}}
  $('copyWholeDay').onclick=copySelectedDay;$('pasteWholeDay').onclick=pasteToSelected;
  document.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if(!(e.ctrlKey||e.metaKey))return;if(e.key.toLowerCase()==='c'){e.preventDefault();copySelectedDay()}if(e.key.toLowerCase()==='v'){e.preventDefault();pasteToSelected()}});

  const monthDlg=document.createElement('dialog');monthDlg.className='month-copy-dialog';monthDlg.innerHTML=`<form id="copyMonthForm"><h2>คัดลอกแพทเทิร์นทั้งเดือน</h2><label>เดือนปลายทาง <input id="copyTargetMonth" type="month" required></label><div class="mode"><label><input type="radio" name="copyMode" value="weekday" checked> ตามวันของสัปดาห์ (แนะนำ) เช่น จันทร์แรก → จันทร์แรก</label><label><input type="radio" name="copyMode" value="date"> ตามเลขวันที่ เช่น 1 → 1, 2 → 2</label></div><p class="shortcut-hint">คัดลอกทั้งรายชื่อ ข้อความใต้ชื่อ และหมายเหตุบนหัววัน วันที่ปลายทางที่ชนจะถูกแทนที่หลังยืนยัน</p><footer><button type="button" id="copyMonthCancel">ยกเลิก</button><button>คัดลอกเดือน</button></footer></form>`;document.body.appendChild(monthDlg);$('copyMonthCancel').onclick=()=>monthDlg.close();
  const monthInputValue=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,nextMonthValue=()=>monthInputValue(new Date(S.month.getFullYear(),S.month.getMonth()+1,1)),nthWeekday=d=>Math.floor((d-1)/7)+1;
  function targetByWeekday(sourceDay,ty,tm){const srcDate=new Date(S.month.getFullYear(),S.month.getMonth(),sourceDay),dow=srcDate.getDay(),nth=nthWeekday(sourceDay),first=new Date(ty,tm,1),offset=(dow-first.getDay()+7)%7,day=1+offset+(nth-1)*7;return day<=new Date(ty,tm+1,0).getDate()?day:null}
  function addCopyMonthButtons(){['host','team'].forEach(kind=>{const toolbar=$(kind)?.querySelector('.toolbar');if(!toolbar||toolbar.querySelector('.copy-month-btn'))return;const b=document.createElement('button');b.type='button';b.className='copy-month-btn';b.dataset.kind=kind;b.textContent='⧉ คัดลอกเดือน';b.onclick=()=>{selectedDay={kind,dt:null};$('copyTargetMonth').value=nextMonthValue();monthDlg.showModal()};toolbar.appendChild(b)})}
  $('copyMonthForm').onsubmit=async e=>{e.preventDefault();const kind=selectedDay?.kind;if(!kind)return;const [ty,mm]=$('copyTargetMonth').value.split('-').map(Number),tm=mm-1,mode=document.querySelector('input[name=copyMode]:checked').value;const sourceDays=[...new Set([...activeEvents(kind).map(x=>+x.event_date.slice(-2)),...S.dayNotes.filter(n=>n.board_id===board(kind)&&n.note_date.startsWith(ym())).map(n=>+n.note_date.slice(-2))])].sort((a,b)=>a-b);if(!sourceDays.length)return toast('เดือนนี้ยังไม่มีคิวให้คัดลอก');const mapped=sourceDays.map(sd=>{const td=mode==='date'?(sd<=new Date(ty,tm+1,0).getDate()?sd:null):targetByWeekday(sd,ty,tm);return {sd,td}}).filter(x=>x.td);if(!confirm(`คัดลอก ${mapped.length} วัน ไป ${$('copyTargetMonth').value} ใช่ไหม?\nวันที่ปลายทางที่มีข้อมูลจะถูกแทนที่`))return;try{for(const {sd,td} of mapped){const src=date(sd),target=`${ty}-${String(tm+1).padStart(2,'0')}-${String(td).padStart(2,'0')}`,rows=getDayRows(kind,src),n=noteFor(kind,src);await replaceDay(kind,target,rows,n?.note||'',n?.show_note!==false)}monthDlg.close();toast(`คัดลอกแพทเทิร์นไป ${$('copyTargetMonth').value} แล้ว`)}catch(err){toast(err.message||'คัดลอกเดือนไม่สำเร็จ')}};

  const originalRenderCalendar=renderCalendar;renderCalendar=function(kind){originalRenderCalendar(kind);const el=$(kind+'Calendar');if(!el)return;el.querySelectorAll('.event').forEach(ev=>{ev.onclick=e=>{e.stopPropagation();const item=S.events.find(x=>String(x.id)===String(ev.dataset.id));if(item)openBulkDay(kind,item.event_date)};ev.ondragstart=e=>{dragCopyEventId=ev.dataset.id;e.dataTransfer.effectAllowed='copy'}});el.querySelectorAll('.day[data-day]:not([data-day=""])').forEach(dayEl=>{const dt=date(+dayEl.dataset.day);dayEl.onclick=()=>openBulkDay(kind,dt);dayEl.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='copy'};dayEl.ondrop=async e=>{e.preventDefault();e.stopPropagation();const item=S.events.find(x=>String(x.id)===String(dragCopyEventId));if(!item)return;if(item.event_date===dt)return toast('เป็นวันเดียวกันอยู่แล้ว');if(currentDayEvents(kind,dt).some(x=>x.person_id===item.person_id))return toast('วันปลายทางมีคนนี้อยู่แล้ว');const row={person_id:item.person_id,event_date:dt,label:item.label||'',show_label:item.show_label!==false,kind,board_id:board(kind)};try{if(S.db){const {data,error}=await S.db.from('calendar_events').insert(row).select('*').single();if(error)throw error;S.events.push(data)}else S.events.push({...row,id:'local-'+Date.now()});touch();render();toast(`คัดลอก ${person(item.person_id)?.name||''} ไปวันที่ ${+dt.slice(-2)} แล้ว`)}catch(err){toast(err.message||'คัดลอกไม่สำเร็จ')}}})};
  document.querySelectorAll('.addEvent').forEach(b=>b.onclick=()=>openBulkDay(b.dataset.kind,date(1)));
  const oldRender=render;render=function(){oldRender();addCopyMonthButtons()};addCopyMonthButtons();render();if($('versionBadge'))$('versionBadge').textContent='v2.0';
})();
