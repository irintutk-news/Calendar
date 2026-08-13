
/* One News Calendar - edit/delete people patch v1 */
(() => {
  const esc = (value) => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#39;");

  const style = document.createElement('style');
  style.textContent = `
    .personrow{gap:12px}
    .personrow .person-actions{margin-left:auto;display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    .personrow .person-actions button{border:1px solid #d7dce5;background:#fff;border-radius:9px;padding:7px 10px;font-weight:700;cursor:pointer}
    .personrow .person-actions .edit-person:hover{background:#f1f5ff;border-color:#9fb5ff}
    .personrow .person-actions .delete-person{color:#b42318;border-color:#f0b8b4}
    .personrow .person-actions .delete-person:hover{background:#fff1f0}
    #newPerson{margin-bottom:10px}
  `;
  document.head.appendChild(style);

  window.peopleDialog = function(kind='host'){
    $('peopleTitle').textContent = kind==='host' ? 'รูปและรายชื่อพิธีกร' : 'รูปและรายชื่อทีม';
    const list = S.people.filter(p=>p.kind===kind);
    $('peopleList').innerHTML =
      `<button id="newPerson">＋ เพิ่ม${kind==='host'?'พิธีกร':'ทีมงาน'}</button>` +
      list.map(p=>`
        <div class="personrow">
          <label class="photo">${pic(p)}<input type="file" accept="image/*" data-id="${esc(p.id)}"></label>
          <span>
            <b>${esc(p.name)}</b>
            <small>${kind==='host'?'หมวด '+esc(p.category||'-'):esc(p.role||'')}</small>
          </span>
          <div class="person-actions">
            <button type="button" class="edit-person" data-id="${esc(p.id)}">แก้ไข</button>
            <button type="button" class="delete-person" data-id="${esc(p.id)}">ลบ</button>
          </div>
        </div>`).join('');

    $('newPerson').onclick = () => openPersonEditor(kind);
    $('peopleList').querySelectorAll('input[type=file]').forEach(i=>{
      i.onchange=()=>upload(i.dataset.id,i.files[0]);
    });
    $('peopleList').querySelectorAll('.edit-person').forEach(b=>{
      b.onclick=()=>openPersonEditor(kind,b.dataset.id);
    });
    $('peopleList').querySelectorAll('.delete-person').forEach(b=>{
      b.onclick=()=>deletePerson(b.dataset.id);
    });
    if(!$('peopleDialog').open) $('peopleDialog').showModal();
  };

  window.openPersonEditor = function(kind,id=''){
    const p=id ? person(id) : null;
    $('personForm').reset();
    $('personKind').value=kind;
    $('personEditId').value=id;
    $('personDialogTitle').textContent=p
      ? `แก้ไข ${p.name}`
      : `เพิ่ม${kind==='host'?'พิธีกร':'ทีมงาน'}`;
    $('personName').value=p?.name||'';
    $('personMeta').value=kind==='host'?(p?.category||''):(p?.role||'');
    $('personColor').value=p?.color||'#3566d6';
    if(!$('personDialog').open) $('personDialog').showModal();
  };

  window.savePerson = async function(e){
    e.preventDefault();
    const kind=$('personKind').value;
    const id=$('personEditId').value;
    const name=$('personName').value.trim();
    const meta=$('personMeta').value.trim();
    if(!name) return toast('กรุณาใส่ชื่อ');

    if(id){
      const p=person(id);
      if(!p) return toast('ไม่พบรายชื่อนี้');
      const changes={
        name,
        category:kind==='host'?meta:null,
        role:kind==='team'?meta:null,
        color:$('personColor').value
      };
      if(S.db){
        const {error}=await S.db.from('people').update(changes).eq('id',id);
        if(error) return toast(error.message);
      }
      Object.assign(p,changes);
      if($('personPhoto').files[0]){
        await upload(id,$('personPhoto').files[0]);
      }
      $('personDialog').close();
      touch();
      render();
      peopleDialog(kind);
      toast('แก้ไขรายชื่อแล้ว');
      return;
    }

    const row={
      id:kind+'-'+Date.now(),
      kind,
      name,
      category:kind==='host'?meta:null,
      role:kind==='team'?meta:null,
      color:$('personColor').value,
      photo_url:null,
      include_in_compare:true,
      sort_order:S.people.filter(p=>p.kind===kind).length+1
    };
    if(S.db){
      const {error}=await S.db.from('people').insert(row);
      if(error) return toast(error.message);
    }
    S.people.push(row);
    if(kind==='host') S.compare.add(row.id);
    if($('personPhoto').files[0]) await upload(row.id,$('personPhoto').files[0]);
    $('personDialog').close();
    touch();
    render();
    peopleDialog(kind);
    toast('เพิ่มรายชื่อแล้ว');
  };

  window.deletePerson = async function(id){
    const p=person(id);
    if(!p) return;
    const label=p.kind==='host'?'พิธีกร':'ทีมงาน';
    const ok=confirm(
      `ลบ${label} “${p.name}” ใช่ไหม?\n\n`+
      `คิว วันว่าง และข้อมูลที่ผูกกับรายชื่อนี้จะถูกลบออกจากฐานข้อมูลด้วย`
    );
    if(!ok) return;

    if(S.db){
      const {error}=await S.db.from('people').delete().eq('id',id);
      if(error) return toast(error.message);
    }

    S.people=S.people.filter(x=>x.id!==id);
    S.events=S.events.filter(x=>x.person_id!==id);
    S.availability=S.availability.filter(x=>x.person_id!==id);
    S.assignments=S.assignments.filter(x=>x.person_id!==id);
    S.compare.delete(id);
    S.hostFilter.delete(id);
    touch();
    render();
    peopleDialog(p.kind);
    toast(`ลบ ${p.name} แล้ว`);
  };

  // The original app attached the old savePerson handler during initial load.
  // Replace it with the patched handler.
  $('personForm').onsubmit=window.savePerson;
})();
