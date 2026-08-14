/* One News Calendar v3.3
   Compare day manager + large circular photo export.
*/
(() => {
  const fontFamily='"Noto Sans Thai","Leelawadee UI",Tahoma,sans-serif';
  let activeDate='';

  const css=document.createElement('style');
  css.textContent=`
    #compareDayDialog{width:min(760px,94vw);max-height:92vh}
    #compareDayDialog form{display:grid;gap:14px}
    .compare-day-manager-list{display:grid;gap:8px}
    .compare-person-row{
      display:grid;grid-template-columns:minmax(170px,1fr) 130px 160px;
      gap:10px;align-items:center;padding:10px 12px;border:1px solid #e4e7ec;
      border-radius:12px;background:#fff
    }
    .compare-person-info{display:flex;align-items:center;gap:10px;min-width:0}
    .compare-person-info .avatar{width:38px;height:38px;flex:0 0 38px}
    .compare-person-info span:last-child{min-width:0}
    .compare-person-info b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .compare-person-info small{color:#667085}
    .compare-toggle{display:flex;align-items:center;gap:7px}
    .compare-day-tools{display:flex;gap:8px;flex-wrap:wrap}
    .compare-day-hint{font-size:12px;color:#667085;margin:0}
    .compare-day[data-date]{cursor:pointer}
    @media(max-width:650px){
      .compare-person-row{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(css);

  const dlg=document.createElement('dialog');
  dlg.id='compareDayDialog';
  dlg.innerHTML=`<form id="compareDayForm">
    <h2 id="compareDayTitle">จัดการเทียบคิว</h2>
    <p class="compare-day-hint">จัดการวันว่างและเลือกคนสำหรับโชว์รูปของวันนี้ได้ในที่เดียว</p>
    <div class="compare-day-tools">
      <button type="button" id="compareAllAvailable">ให้ทุกคนว่าง</button>
      <button type="button" id="compareClearDay">ล้างวันว่างวันนี้</button>
    </div>
    <div id="compareDayPeople" class="compare-day-manager-list"></div>
    <footer>
      <button type="button" id="compareDayCancel">ยกเลิก</button>
      <button type="submit">บันทึกวันนี้</button>
    </footer>
  </form>`;
  document.body.appendChild(dlg);

  const hasA=(id,dt)=>S.availability.some(a=>a.person_id===id&&a.available_date===dt);
  const hasS=(id,dt)=>S.assignments.some(a=>a.person_id===id&&a.assignment_date===dt);

  function openDayManager(dt){
    if(document.body.classList.contains('viewer-mode'))return;
    activeDate=dt;
    document.getElementById('compareDayTitle').textContent=`จัดการเทียบคิว · วันที่ ${+dt.slice(-2)} ${monthName()}`;
    const list=compareHosts();
    document.getElementById('compareDayPeople').innerHTML=list.map(p=>`
      <div class="compare-person-row" data-id="${p.id}" data-cat="${p.category||''}">
        <div class="compare-person-info">${pic(p)}<span><b>${p.name}</b><small>หมวด ${p.category||'-'}</small></span></div>
        <label class="compare-toggle"><input class="cmp-available" type="checkbox" ${hasA(p.id,dt)?'checked':''}> วันว่าง</label>
        <label class="compare-toggle"><input class="cmp-selected" type="checkbox" ${hasS(p.id,dt)?'checked':''}> เลือกโชว์รูป</label>
      </div>`).join('');

    document.querySelectorAll('.compare-person-row').forEach(row=>{
      const a=row.querySelector('.cmp-available'),s=row.querySelector('.cmp-selected');
      s.onchange=()=>{
        if(s.checked){
          a.checked=true;
          const cat=row.dataset.cat;
          document.querySelectorAll('.compare-person-row').forEach(other=>{
            if(other!==row && other.dataset.cat===cat)other.querySelector('.cmp-selected').checked=false;
          });
        }
      };
      a.onchange=()=>{ if(!a.checked)s.checked=false; };
    });
    dlg.showModal();
  }

  document.getElementById('compareDayCancel').onclick=()=>dlg.close();
  document.getElementById('compareAllAvailable').onclick=()=>{
    document.querySelectorAll('.cmp-available').forEach(x=>x.checked=true);
  };
  document.getElementById('compareClearDay').onclick=()=>{
    document.querySelectorAll('.cmp-available,.cmp-selected').forEach(x=>x.checked=false);
  };

  document.getElementById('compareDayForm').onsubmit=async e=>{
    e.preventDefault();
    if(!activeDate)return;

    const rows=[...document.querySelectorAll('.compare-person-row')];
    const avail=rows.filter(r=>r.querySelector('.cmp-available').checked).map(r=>r.dataset.id);
    const selected=rows.filter(r=>r.querySelector('.cmp-selected').checked).map(r=>r.dataset.id);
    const ids=compareHosts().map(p=>p.id);

    try{
      if(S.db){
        if(ids.length){
          let q=await S.db.from('host_availability').delete().eq('available_date',activeDate).in('person_id',ids);
          if(q.error)throw q.error;
          q=await S.db.from('host_assignments').delete().eq('assignment_date',activeDate).in('person_id',ids);
          if(q.error)throw q.error;
        }
        if(avail.length){
          const q=await S.db.from('host_availability').insert(avail.map(id=>({person_id:id,available_date:activeDate})));
          if(q.error)throw q.error;
        }
        if(selected.length){
          const q=await S.db.from('host_assignments').insert(selected.map(id=>({person_id:id,assignment_date:activeDate})));
          if(q.error)throw q.error;
        }
      }

      S.availability=S.availability.filter(a=>!(a.available_date===activeDate&&ids.includes(a.person_id)));
      avail.forEach(id=>S.availability.push({person_id:id,available_date:activeDate}));

      S.assignments=S.assignments.filter(a=>!(a.assignment_date===activeDate&&ids.includes(a.person_id)));
      selected.forEach(id=>S.assignments.push({person_id:id,assignment_date:activeDate}));

      dlg.close();
      touch();
      renderCompare();
      toast('บันทึกเทียบคิววันนี้แล้ว');
    }catch(err){toast(err?.message||'บันทึกไม่สำเร็จ')}
  };

  function enhanceDayClicks(){
    document.querySelectorAll('#compareCalendar .compare-day[data-date]').forEach(day=>{
      const dt=day.dataset.date;
      day.onclick=e=>{
        if(document.body.classList.contains('viewer-mode'))return;
        // A drag gesture should not open dialog.
        if(e.detail===0)return;
        e.preventDefault();
        e.stopPropagation();
        openDayManager(dt);
      };
    });

    // Bars are visual/drag handles only now. No separate click menu.
    document.querySelectorAll('#compareCalendar .color-bar').forEach(bar=>{
      bar.onclick=null;
      bar.title='ลากเพื่อเพิ่มวันว่างวันอื่น หรือกดช่องวันเพื่อจัดการ';
    });

    // Selected photos also open the whole day manager.
    document.querySelectorAll('#compareCalendar .big-pic').forEach(btn=>{
      const day=btn.closest('.compare-day[data-date]');
      btn.onclick=e=>{
        if(document.body.classList.contains('viewer-mode'))return;
        e.preventDefault();e.stopPropagation();
        if(day)openDayManager(day.dataset.date);
      };
    });
  }

  const prevRenderCompare=renderCompare;
  renderCompare=function(){
    prevRenderCompare();
    enhanceDayClicks();
  };

  // ---------- Compare JPG export ----------
  function loadImage(url){
    return new Promise(resolve=>{
      if(!url)return resolve(null);
      const img=new Image();
      img.crossOrigin='anonymous';
      img.onload=()=>resolve(img);
      img.onerror=()=>resolve(null);
      img.src=url;
    });
  }

  function circleImage(ctx,img,cx,cy,r,borderColor){
    ctx.save();
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.closePath();
    ctx.fillStyle='#eef1f5';ctx.fill();
    if(img){
      ctx.save();
      ctx.beginPath();ctx.arc(cx,cy,r-5,0,Math.PI*2);ctx.clip();
      const ratio=Math.max((r*2-10)/img.width,(r*2-10)/img.height);
      const w=img.width*ratio,h=img.height*ratio;
      ctx.drawImage(img,cx-w/2,cy-h/2,w,h);
      ctx.restore();
    }
    ctx.lineWidth=10;
    ctx.strokeStyle=borderColor||'#64748b';
    ctx.beginPath();ctx.arc(cx,cy,r-4,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }

  async function exportCompare(){
    const W=2560,H=1440,HEADER=92,WEEK=58,PADX=28,PADB=26;
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,W,H);

    const grad=ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0,'#101827');grad.addColorStop(.72,'#17243a');grad.addColorStop(1,'#981023');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,HEADER);
    ctx.fillStyle='#fff';ctx.textBaseline='middle';
    ctx.textAlign='left';ctx.font=`700 31px ${fontFamily}`;
    ctx.fillText(document.getElementById('compareTitle')?.value||'ตารางเทียบคิวพิธีกร',36,HEADER/2);
    ctx.textAlign='center';ctx.font=`700 32px ${fontFamily}`;ctx.fillText(monthName(),W/2,HEADER/2);

    const gridX=PADX,gridY=HEADER+10,gridW=W-PADX*2,colW=gridW/7;
    ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'].forEach((d,i)=>{
      const x=gridX+i*colW;
      ctx.fillStyle=i<5?'#df1227':'#9e0d20';ctx.fillRect(x,gridY,colW,WEEK);
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`700 25px ${fontFamily}`;
      ctx.fillText(d,x+colW/2,gridY+WEEK/2);
    });

    const y=S.month.getFullYear(),m=S.month.getMonth();
    const first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();
    const cells=[];
    for(let i=first-1;i>=0;i--)cells.push({d:prev-i,out:1});
    for(let d=1;d<=days;d++)cells.push({d});
    let nx=1;while(cells.length<42)cells.push({d:nx++,out:1});

    const cellY0=gridY+WEEK,cellH=(H-cellY0-PADB)/6;
    const photoCache=new Map();
    for(const p of compareHosts())photoCache.set(p.id,await loadImage(p.photo_url));

    for(let i=0;i<42;i++){
      const c=cells[i],row=Math.floor(i/7),col=i%7,x=gridX+col*colW,cy=cellY0+row*cellH;
      ctx.fillStyle=c.out?'#f1f4f7':'#fff';ctx.fillRect(x,cy,colW,cellH);
      ctx.strokeStyle='#dce2e9';ctx.strokeRect(x,cy,colW,cellH);
      ctx.textAlign='right';ctx.textBaseline='top';ctx.font=`700 23px ${fontFamily}`;
      ctx.fillStyle=c.out?'#a3acb8':(col>=5?'#a91424':'#1c2532');
      ctx.fillText(String(c.d),x+colW-13,cy+9);
      if(c.out)continue;

      const dt=`${y}-${String(m+1).padStart(2,'0')}-${String(c.d).padStart(2,'0')}`;
      const free=compareHosts().filter(p=>S.availability.some(a=>a.person_id===p.id&&a.available_date===dt));
      const selected=S.assignments.filter(a=>a.assignment_date===dt).map(a=>person(a.person_id)).filter(Boolean);

      // Continuous availability bars.
      if(free.length){
        const bx=x+12,by=cy+38,bw=colW-24,bh=12,seg=bw/free.length;
        free.forEach((p,j)=>{
          ctx.fillStyle=p.color||'#64748b';
          ctx.fillRect(bx+j*seg,by,seg+.5,bh);
        });
      }

      // Large selected circular faces.
      if(selected.length){
        const count=selected.length;
        const maxR=count<=2?54:count===3?46:38;
        const gap=14,total=count*(maxR*2)+(count-1)*gap;
        let sx=x+(colW-total)/2+maxR;
        const py=cy+cellH/2+12;
        for(const p of selected){
          circleImage(ctx,photoCache.get(p.id),sx,py,maxR,p.color);
          ctx.textAlign='center';ctx.textBaseline='top';
          ctx.fillStyle='#172033';ctx.font=`700 15px ${fontFamily}`;
          const name=String(p.name||'');
          ctx.fillText(name,sx,py+maxR+7,maxR*2+24);
          sx+=maxR*2+gap;
        }
      }
    }

    const url=canvas.toDataURL('image/jpeg',.95);
    document.getElementById('exportPreview').src=url;
    const a=document.getElementById('exportDownload');
    a.href=url;a.download=`ตารางเทียบคิว-${monthName()}.jpg`;
    const ex=document.getElementById('exportDialog');if(!ex.open)ex.showModal();
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('#compare .export');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    exportCompare();
  },true);

  renderCompare();
  if(document.getElementById('versionBadge'))document.getElementById('versionBadge').textContent='v3.3';
})();