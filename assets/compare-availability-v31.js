(() => {
let managePersonId='';
const css=document.createElement('style');
css.textContent=`
body.viewer-mode #manageAvailability{display:none!important}
#availabilityDialog{width:min(720px,94vw);max-height:92vh}
#availabilityDialog form{display:grid;gap:14px}
.availability-top{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.availability-tools{display:flex;gap:8px;flex-wrap:wrap}
.availability-days{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;padding:10px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc}
.availability-day{min-height:50px;border:1px solid #d7dce5;border-radius:9px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer}
.availability-day.active{background:#eef4ff;border-color:#7b9cff;color:#1d4ed8}
.availability-day.assigned{box-shadow:inset 0 0 0 2px #111827}
.availability-help{font-size:12px;color:#667085}
.availability-danger{color:#b42318!important;border-color:#efb5b5!important;background:#fff7f7!important}
.compare-day{position:relative}
.availability-remove{position:absolute;right:3px;top:3px;width:18px;height:18px;border:0;border-radius:999px;background:#fff;color:#b42318;display:none;cursor:pointer;padding:0;line-height:18px;z-index:5;box-shadow:0 1px 4px rgba(0,0,0,.16)}
body.admin-mode .compare-day:hover .availability-remove{display:block}
`;
document.head.appendChild(css);

const dlg=document.createElement('dialog');
dlg.id='availabilityDialog';
dlg.innerHTML=`<form>
<h2>จัดการวันว่างพิธีกร</h2>
<div class="availability-top">
<label>พิธีกร<select id="availabilityPerson"></select></label>
<label>เดือน<input id="availabilityMonthLabel" readonly></label>
</div>
<div class="availability-tools">
<button type="button" id="availabilityAll">เลือกทุกวัน</button>
<button type="button" id="availabilityWeekdays">จ.–ศ.</button>
<button type="button" id="availabilityWeekends">ส.–อา.</button>
<button type="button" id="availabilityClear" class="availability-danger">ล้างวันว่างทั้งเดือน</button>
</div>
<p class="availability-help">กดวันที่เพื่อเพิ่ม/ลบวันว่าง • ถ้าวันนั้นถูกเลือกคิวไว้ แล้วลบวันว่าง ระบบจะเอาคนนั้นออกจากคิววันนั้นด้วย</p>
<div id="availabilityDays" class="availability-days"></div>
<footer><button type="button" id="availabilityClose">ปิด</button></footer>
</form>`;
document.body.appendChild(dlg);

const ymd=d=>`${S.month.getFullYear()}-${String(S.month.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const maxDay=()=>new Date(S.month.getFullYear(),S.month.getMonth()+1,0).getDate();
const hasA=(id,dt)=>S.availability.some(a=>a.person_id===id&&a.available_date===dt);
const hasS=(id,dt)=>S.assignments.some(a=>a.person_id===id&&a.assignment_date===dt);

function populatePeople(){
 const list=compareHosts(),sel=document.getElementById('availabilityPerson');
 sel.innerHTML=list.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
 if(!managePersonId||!list.some(p=>p.id===managePersonId))managePersonId=list[0]?.id||'';
 sel.value=managePersonId;
 document.getElementById('availabilityMonthLabel').value=monthName();
}
function renderDays(){
 const el=document.getElementById('availabilityDays');
 if(!managePersonId){el.innerHTML='';return}
 el.innerHTML=Array.from({length:maxDay()},(_,i)=>{
  const d=i+1,dt=ymd(d),dow=new Date(S.month.getFullYear(),S.month.getMonth(),d).getDay();
  const short=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][dow];
  return `<button type="button" class="availability-day ${hasA(managePersonId,dt)?'active':''} ${hasS(managePersonId,dt)?'assigned':''}" data-date="${dt}"><strong>${d}</strong><small>${short}</small></button>`;
 }).join('');
 el.querySelectorAll('.availability-day').forEach(b=>b.onclick=()=>toggle(managePersonId,b.dataset.date));
}
async function toggle(id,dt){
 const exists=hasA(id,dt);
 try{
  if(exists){
   if(S.db){
    let q=await S.db.from('host_availability').delete().eq('person_id',id).eq('available_date',dt); if(q.error)throw q.error;
    q=await S.db.from('host_assignments').delete().eq('person_id',id).eq('assignment_date',dt); if(q.error)throw q.error;
   }
   S.availability=S.availability.filter(a=>!(a.person_id===id&&a.available_date===dt));
   S.assignments=S.assignments.filter(a=>!(a.person_id===id&&a.assignment_date===dt));
  }else{
   const row={person_id:id,available_date:dt};
   if(S.db){const q=await S.db.from('host_availability').upsert(row,{onConflict:'person_id,available_date'});if(q.error)throw q.error}
   if(!hasA(id,dt))S.availability.push(row);
  }
  touch();renderDays();renderCompare();
 }catch(err){toast(err?.message||'แก้วันว่างไม่สำเร็จ')}
}
async function addSet(mode){
 const days=Array.from({length:maxDay()},(_,i)=>i+1).filter(d=>{
  const dow=new Date(S.month.getFullYear(),S.month.getMonth(),d).getDay();
  return mode==='all'||(mode==='weekdays'&&dow>=1&&dow<=5)||(mode==='weekends'&&(dow===0||dow===6));
 });
 const rows=days.map(d=>({person_id:managePersonId,available_date:ymd(d)}));
 try{
  if(S.db&&rows.length){const q=await S.db.from('host_availability').upsert(rows,{onConflict:'person_id,available_date'});if(q.error)throw q.error}
  const exists=new Set(S.availability.filter(a=>a.person_id===managePersonId).map(a=>a.available_date));
  rows.forEach(r=>{if(!exists.has(r.available_date))S.availability.push(r)});
  touch();renderDays();renderCompare();
 }catch(err){toast(err?.message||'เพิ่มวันว่างไม่สำเร็จ')}
}
async function clearMonth(){
 if(!managePersonId)return;
 const p=person(managePersonId);
 if(!confirm(`ล้างวันว่างของ ${p?.name||''} ทั้งเดือน ${monthName()} ใช่ไหม?`))return;
 const start=ym()+'-01',end=ym()+'-'+String(maxDay()).padStart(2,'0');
 try{
  if(S.db){
   let q=await S.db.from('host_availability').delete().eq('person_id',managePersonId).gte('available_date',start).lte('available_date',end);if(q.error)throw q.error;
   q=await S.db.from('host_assignments').delete().eq('person_id',managePersonId).gte('assignment_date',start).lte('assignment_date',end);if(q.error)throw q.error;
  }
  S.availability=S.availability.filter(a=>!(a.person_id===managePersonId&&a.available_date.startsWith(ym())));
  S.assignments=S.assignments.filter(a=>!(a.person_id===managePersonId&&a.assignment_date.startsWith(ym())));
  touch();renderDays();renderCompare();
 }catch(err){toast(err?.message||'ล้างวันว่างไม่สำเร็จ')}
}
function openManager(id=''){
 if(id)managePersonId=id;
 populatePeople();renderDays();dlg.showModal();
}

document.getElementById('manageAvailability').onclick=()=>openManager();
document.getElementById('availabilityPerson').onchange=e=>{managePersonId=e.target.value;renderDays()};
document.getElementById('availabilityAll').onclick=()=>addSet('all');
document.getElementById('availabilityWeekdays').onclick=()=>addSet('weekdays');
document.getElementById('availabilityWeekends').onclick=()=>addSet('weekends');
document.getElementById('availabilityClear').onclick=clearMonth;
document.getElementById('availabilityClose').onclick=()=>dlg.close();

const oldRenderCompare=renderCompare;
renderCompare=function(){
 oldRenderCompare();
 document.querySelectorAll('#compareCalendar .compare-day[data-date]').forEach(day=>{
  const dt=day.dataset.date;
  // Do not wrap or add spacing around color bars: keep all people's bars touching
  // as one continuous strip, exactly like the original compare view.
  day.querySelectorAll('.availability-remove').forEach(x=>x.remove());
  const bars=[...day.querySelectorAll('.color-bar')];
  if(!bars.length)return;
  const x=document.createElement('button');
  x.type='button';x.className='availability-remove';x.textContent='×';
  x.title='จัดการ/ลบวันว่างวันนี้';
  x.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    // If only one person is available, remove directly.
    if(bars.length===1){toggle(bars[0].dataset.id,dt);return;}
    // Multiple people: open manager instead, preserving the continuous bars.
    openManager(bars[0].dataset.id);
  };
  day.appendChild(x);
 });
 document.querySelectorAll('#rangeSummary .range-pill').forEach(pill=>{
  pill.style.cursor='pointer';pill.title='คลิกเพื่อจัดการวันว่าง';
  pill.onclick=()=>{
   if(document.body.classList.contains('viewer-mode'))return;
   const name=pill.querySelector('b')?.textContent?.trim();
   const p=hosts().find(x=>x.name===name);if(p)openManager(p.id);
  };
 });
};
renderCompare();
if(document.getElementById('versionBadge'))document.getElementById('versionBadge').textContent='v3.1.2';
})();