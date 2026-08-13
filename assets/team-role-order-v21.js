/* One News Calendar v2.1 — Team role slots + automatic ordering */
(() => {
  const ROLE_SLOTS = [
    {key:'1', label:'1 รันดาวน์+คิว', order:1},
    {key:'2a', label:'2 เขียนข่าว', order:2},
    {key:'2b', label:'2 เขียนข่าว', order:2},
    {key:'3', label:'3 ภาพ/Thumbnail/กราฟิก', order:3},
    {key:'4', label:'4 ออนไลน์/ช่วยเย็น', order:4}
  ];

  const roleOrder = label => {
    const s = String(label || '').trim();
    if (s.startsWith('1 ')) return 1;
    if (s.startsWith('2 ')) return 2;
    if (s.startsWith('3 ')) return 3;
    if (s.startsWith('4 ')) return 4;
    return 99;
  };

  const extraStyle = document.createElement('style');
  extraStyle.textContent = `
    .team-role-editor{display:grid;gap:9px}
    .team-role-slot{
      display:grid;
      grid-template-columns:minmax(170px,1.15fr) minmax(180px,1fr);
      gap:10px;align-items:center;padding:10px 12px;
      border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc
    }
    .team-role-slot b{font-size:14px}
    .team-role-slot select{width:100%}
    .team-role-help{font-size:12px;color:#667085;margin:0}
    @media(max-width:650px){.team-role-slot{grid-template-columns:1fr}}
  `;
  document.head.appendChild(extraStyle);

  function sortTeamDayDom() {
    const cal = document.getElementById('teamCalendar');
    if (!cal) return;

    cal.querySelectorAll('.day[data-day]').forEach(day => {
      const events = [...day.querySelectorAll('.event')];
      if (events.length < 2) return;

      events.sort((a,b) => {
        const ea = S.events.find(x => String(x.id) === String(a.dataset.id));
        const eb = S.events.find(x => String(x.id) === String(b.dataset.id));
        const oa = roleOrder(ea?.label);
        const ob = roleOrder(eb?.label);
        if (oa !== ob) return oa - ob;

        const pa = person(ea?.person_id);
        const pb = person(eb?.person_id);
        return (pa?.sort_order || 999) - (pb?.sort_order || 999);
      });

      events.forEach(el => day.appendChild(el));
    });
  }

  // Patch renderCalendar so team entries always appear 1 → 2 → 2 → 3 → 4.
  const previousRenderCalendar = renderCalendar;
  renderCalendar = function(kind) {
    previousRenderCalendar(kind);
    if (kind === 'team') sortTeamDayDom();
  };

  function teamRowsForDate(dt) {
    return currentDayEvents('team', dt)
      .slice()
      .sort((a,b)=>roleOrder(a.label)-roleOrder(b.label));
  }

  function roleSlotSelections(dt) {
    const rows = teamRowsForDate(dt);
    const used = new Set();
    return ROLE_SLOTS.map(slot => {
      const idx = rows.findIndex((r,i) => !used.has(i) && String(r.label||'').trim() === slot.label);
      if (idx >= 0) {
        used.add(idx);
        return rows[idx].person_id;
      }
      return '';
    });
  }

  function teamSlotMarkup(dt) {
    const selected = roleSlotSelections(dt);
    const options = teams().slice()
      .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
      .map(p=>`<option value="${p.id}">${p.name}</option>`).join('');

    return `
      <div class="team-role-editor">
        <p class="team-role-help">เลือกคนตามหน้าที่ของวันนี้ ระบบจะเรียงชื่อในปฏิทินตามเลขงานอัตโนมัติ</p>
        ${ROLE_SLOTS.map((slot,i)=>`
          <label class="team-role-slot">
            <b>${slot.label}</b>
            <select class="team-role-person" data-slot="${i}">
              <option value="">— ไม่เลือก —</option>
              ${options}
            </select>
          </label>
        `).join('')}
      </div>`;
  }

  function installTeamSlotValues(dt) {
    const values = roleSlotSelections(dt);
    [...document.querySelectorAll('.team-role-person')].forEach((sel,i)=>sel.value=values[i]||'');
  }

  // Override whole-day editor only for Team tab.
  const previousOpenBulkDay = window.openBulkDay;
  window.openBulkDay = function(kind, dt) {
    previousOpenBulkDay(kind, dt);
    if (kind !== 'team') return;

    const holder = document.getElementById('bulkPeople');
    if (!holder) return;
    holder.innerHTML = teamSlotMarkup(dt);
    holder.classList.add('team-slots-mode');
    installTeamSlotValues(dt);

    const title = document.getElementById('bulkDayTitle');
    if (title) title.textContent = `จัดเวรทีมทั้งวัน · ${+dt.slice(-2)} ${monthName()}`;
  };

  async function replaceTeamDay(dt, rows, note, showNote) {
    const boardId = board('team');

    if (S.db) {
      const del = await S.db.from('calendar_events')
        .delete()
        .eq('kind','team')
        .eq('board_id',boardId)
        .eq('event_date',dt);
      if (del.error) throw del.error;

      if (rows.length) {
        const payload = rows.map(r=>({
          person_id:r.person_id,
          event_date:dt,
          label:r.label,
          show_label:true,
          kind:'team',
          board_id:boardId
        }));
        const ins = await S.db.from('calendar_events').insert(payload).select('*');
        if (ins.error) throw ins.error;
      }

      if (note) {
        const up = await S.db.from('day_notes').upsert({
          board_id:boardId,
          note_date:dt,
          note,
          show_note:showNote,
          updated_at:new Date().toISOString()
        },{onConflict:'board_id,note_date'});
        if (up.error) throw up.error;
      } else {
        const nd = await S.db.from('day_notes')
          .delete()
          .eq('board_id',boardId)
          .eq('note_date',dt);
        if (nd.error) throw nd.error;
      }
    } else {
      S.events = S.events.filter(e=>!(
        e.kind==='team' && e.board_id===boardId && e.event_date===dt
      ));
      rows.forEach((r,i)=>S.events.push({
        id:'local-team-'+Date.now()+'-'+i,
        person_id:r.person_id,
        event_date:dt,
        label:r.label,
        show_label:true,
        kind:'team',
        board_id:boardId
      }));

      S.dayNotes = S.dayNotes.filter(n=>!(
        n.board_id===boardId && n.note_date===dt
      ));
      if (note) S.dayNotes.push({
        id:'local-note-'+Date.now(),
        board_id:boardId,note_date:dt,note,show_note:showNote
      });
    }
  }

  // Capture submit before v2's generic whole-day handler.
  const form = document.getElementById('bulkDayForm');
  form.addEventListener('submit', async e => {
    if (!selectedDay || selectedDay.kind !== 'team') return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const selects = [...document.querySelectorAll('.team-role-person')];
    const chosen = selects.map((s,i)=>({
      person_id:s.value,
      label:ROLE_SLOTS[i].label
    })).filter(x=>x.person_id);

    const ids = chosen.map(x=>x.person_id);
    if (new Set(ids).size !== ids.length) {
      toast('คนเดียวกันถูกเลือกมากกว่า 1 หน้าที่ กรุณาเลือกใหม่');
      return;
    }

    const note = document.getElementById('bulkNote').value.trim();
    const showNote = document.getElementById('bulkShowNote').checked;

    const repeat = document.getElementById('bulkRepeatToggle').checked;
    const repeatDates = repeat
      ? [...document.querySelectorAll('#bulkRepeatGrid button.active')].map(b=>b.dataset.date)
      : [];
    const targets = [...new Set([selectedDay.dt, ...repeatDates])];

    try {
      for (const dt of targets) {
        await replaceTeamDay(dt, chosen, note, showNote);
      }
      document.getElementById('bulkDayDialog').close();
      touch();
      if (S.db) await load(); else render();
      toast(`บันทึกเวรทีม ${targets.length} วันแล้ว`);
    } catch (err) {
      toast(err?.message || 'บันทึกไม่สำเร็จ');
    }
  }, true);

  // Copy/paste/repeat/month copy already preserve event.label,
  // therefore the role and sorting pattern travel with the copied data.

  // Re-render once so current team calendar is sorted immediately.
  render();
  const badge = document.getElementById('versionBadge');
  if (badge) badge.textContent = 'v2.1';
})();