/* One News Calendar v3.2 — Compare Availability Pro
   1) add/remove day
   2) edit in manager
   3) clear month
   4) bulk add
   5) click color bar -> delete exact day; drag bar -> add availability to nearby day
   6) deleting availability removes assignment same day
   7) click summary name -> edit that host
*/
(() => {
  let draggedAvailability = null; // {personId, sourceDate}
  let clickedPersonId = '';
  let clickedDate = '';

  const css = document.createElement('style');
  css.textContent = `
    .compare-day.drag-copy-target{
      outline:3px solid #3566d6;
      outline-offset:-3px;
      background:#f5f8ff;
    }
    .color-bar{
      cursor:grab;
    }
    .color-bar:active{cursor:grabbing}
    #availabilityQuickDialog{width:min(420px,92vw)}
    #availabilityQuickDialog .quick-card{display:grid;gap:12px}
    #availabilityQuickDialog .quick-meta{
      padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc
    }
    #availabilityQuickDialog .quick-actions{display:flex;gap:8px;flex-wrap:wrap}
    #availabilityQuickDialog .danger{
      color:#b42318;border-color:#efb5b5!important;background:#fff7f7!important
    }
    #availabilityQuickDialog .close-quick{margin-left:auto}
  `;
  document.head.appendChild(css);

  const quick = document.createElement('dialog');
  quick.id = 'availabilityQuickDialog';
  quick.innerHTML = `
    <div class="quick-card">
      <h2>วันว่างพิธีกร</h2>
      <div id="availabilityQuickMeta" class="quick-meta"></div>
      <div class="quick-actions">
        <button type="button" id="quickEditPerson">จัดการวันว่างคนนี้</button>
        <button type="button" id="quickDeleteDay" class="danger">ลบวันว่างวันนี้</button>
        <button type="button" id="quickClose" class="close-quick">ปิด</button>
      </div>
    </div>`;
  document.body.appendChild(quick);

  const existingManagerButton = document.getElementById('manageAvailability');

  function hasAvailability(id, dt){
    return S.availability.some(a=>a.person_id===id && a.available_date===dt);
  }

  async function removeAvailability(id, dt){
    try{
      if(S.db){
        let q = await S.db.from('host_availability')
          .delete().eq('person_id',id).eq('available_date',dt);
        if(q.error) throw q.error;

        q = await S.db.from('host_assignments')
          .delete().eq('person_id',id).eq('assignment_date',dt);
        if(q.error) throw q.error;
      }

      S.availability = S.availability.filter(a=>!(a.person_id===id && a.available_date===dt));
      S.assignments = S.assignments.filter(a=>!(a.person_id===id && a.assignment_date===dt));

      touch();
      if(typeof renderCompare==='function') renderCompare();
      if(typeof renderAvailabilityDays==='function') renderAvailabilityDays();
      toast(`ลบวันว่างวันที่ ${+dt.slice(-2)} แล้ว`);
    }catch(err){
      toast(err?.message || 'ลบวันว่างไม่สำเร็จ');
    }
  }

  async function addAvailability(id, dt){
    if(hasAvailability(id,dt)){
      toast('วันนี้มีวันว่างของคนนี้อยู่แล้ว');
      return;
    }
    const row={person_id:id,available_date:dt};
    try{
      if(S.db){
        const q = await S.db.from('host_availability')
          .upsert(row,{onConflict:'person_id,available_date'});
        if(q.error) throw q.error;
      }
      S.availability.push(row);
      touch();
      if(typeof renderCompare==='function') renderCompare();
      if(typeof renderAvailabilityDays==='function') renderAvailabilityDays();
      toast(`เพิ่มวันว่างวันที่ ${+dt.slice(-2)} แล้ว`);
    }catch(err){
      toast(err?.message || 'เพิ่มวันว่างไม่สำเร็จ');
    }
  }

  function openQuick(personId, dt){
    clickedPersonId=personId;
    clickedDate=dt;
    const p=person(personId);
    document.getElementById('availabilityQuickMeta').innerHTML =
      `<b>${p?.name||''}</b><br>วันที่ ${+dt.slice(-2)} ${monthName()}`;
    quick.showModal();
  }

  document.getElementById('quickClose').onclick=()=>quick.close();

  document.getElementById('quickDeleteDay').onclick=async()=>{
    if(!clickedPersonId||!clickedDate)return;
    const p=person(clickedPersonId);
    if(!confirm(`ลบวันว่างของ ${p?.name||''} วันที่ ${+clickedDate.slice(-2)} ใช่ไหม?\nถ้ามี assignment วันนั้น ระบบจะเอาออกด้วย`))return;
    quick.close();
    await removeAvailability(clickedPersonId,clickedDate);
  };

  document.getElementById('quickEditPerson').onclick=()=>{
    quick.close();
    // Reuse manager from v3.1.x by clicking summary-like manager flow.
    // If openManager is in global scope, call directly. Otherwise switch person in dialog then open.
    if(typeof openManager==='function'){
      openManager(clickedPersonId);
      return;
    }
    const manager=document.getElementById('availabilityDialog');
    const select=document.getElementById('availabilityPerson');
    if(manager&&select){
      select.value=clickedPersonId;
      select.dispatchEvent(new Event('change'));
      manager.showModal();
    }else{
      existingManagerButton?.click();
    }
  };

  function enhanceCompareInteractions(){
    const cal=document.getElementById('compareCalendar');
    if(!cal)return;

    // Keep bars continuous: no wrappers, no gaps.
    cal.querySelectorAll('.compare-day[data-date]').forEach(day=>{
      const targetDate=day.dataset.date;

      day.ondragover=e=>{
        if(document.body.classList.contains('viewer-mode'))return;
        if(!draggedAvailability)return;
        e.preventDefault();
        e.dataTransfer.dropEffect='copy';
        day.classList.add('drag-copy-target');
      };

      day.ondragleave=()=>day.classList.remove('drag-copy-target');

      day.ondrop=async e=>{
        if(document.body.classList.contains('viewer-mode'))return;
        if(!draggedAvailability)return;
        e.preventDefault();
        e.stopPropagation();
        day.classList.remove('drag-copy-target');

        const {personId,sourceDate}=draggedAvailability;
        draggedAvailability=null;

        if(sourceDate===targetDate){
          toast('เป็นวันเดิมอยู่แล้ว');
          return;
        }
        await addAvailability(personId,targetDate);
      };
    });

    cal.querySelectorAll('.color-bar').forEach(bar=>{
      const parentDay=bar.closest('.compare-day[data-date]');
      const dt=parentDay?.dataset.date;
      const personId=bar.dataset.id;
      if(!dt||!personId)return;

      // Click exact person's bar -> quick actions
      bar.onclick=e=>{
        if(document.body.classList.contains('viewer-mode'))return;
        e.preventDefault();
        e.stopPropagation();
        openQuick(personId,dt);
      };

      // Drag = copy availability to another date. Source remains.
      bar.draggable = !document.body.classList.contains('viewer-mode');
      bar.ondragstart=e=>{
        if(document.body.classList.contains('viewer-mode')){
          e.preventDefault(); return;
        }
        draggedAvailability={personId,sourceDate:dt};
        e.dataTransfer.effectAllowed='copy';
        try{ e.dataTransfer.setData('text/plain',`${personId}|${dt}`); }catch{}
      };
      bar.ondragend=()=>{
        draggedAvailability=null;
        document.querySelectorAll('.compare-day.drag-copy-target').forEach(x=>x.classList.remove('drag-copy-target'));
      };
    });

    // Summary names open manager.
    document.querySelectorAll('#rangeSummary .range-pill').forEach(pill=>{
      pill.style.cursor='pointer';
      pill.title='คลิกเพื่อจัดการวันว่าง';
      pill.onclick=()=>{
        if(document.body.classList.contains('viewer-mode'))return;
        const name=pill.querySelector('b')?.textContent?.trim();
        const p=hosts().find(x=>x.name===name);
        if(!p)return;

        if(typeof openManager==='function'){
          openManager(p.id);
          return;
        }
        const manager=document.getElementById('availabilityDialog');
        const select=document.getElementById('availabilityPerson');
        if(manager&&select){
          select.value=p.id;
          select.dispatchEvent(new Event('change'));
          manager.showModal();
        }else{
          existingManagerButton?.click();
        }
      };
    });
  }

  // Patch compare render, preserving all v3.1.2 logic and continuous bars.
  const previousRenderCompare = renderCompare;
  renderCompare = function(){
    previousRenderCompare();
    enhanceCompareInteractions();
  };

  renderCompare();

  const badge=document.getElementById('versionBadge');
  if(badge)badge.textContent='v3.2';
})();