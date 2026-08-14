/* One News Calendar v3.0 — Complete clean export
   Host: show subtitle under name.
   Team: dynamic-height single-page image so every person + role fits.
*/
(() => {
  const W=2560;
  const HOST_H=1440;
  const HEADER_H=92,WEEK_H=58;
  const PAD_X=28,PAD_BOTTOM=26;
  const DAYS=7;
  const fontFamily='"Noto Sans Thai","Leelawadee UI",Tahoma,sans-serif';
  const monthNames=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

  function roundedRect(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function hexToRgba(hex,alpha){
    let h=String(hex||'#7c3aed').replace('#','');
    if(h.length===3)h=h.split('').map(c=>c+c).join('');
    const n=parseInt(h,16);
    const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function fitFont(ctx,text,maxWidth,start,min,weight=700){
    for(let s=start;s>=min;s--){
      ctx.font=`${weight} ${s}px ${fontFamily}`;
      if(ctx.measureText(String(text||'')).width<=maxWidth)return s;
    }
    return min;
  }

  function fitText(ctx,text,maxWidth){
    const raw=String(text||'');
    if(ctx.measureText(raw).width<=maxWidth)return raw;
    let t=raw;
    while(t.length>1 && ctx.measureText(t+'…').width>maxWidth)t=t.slice(0,-1);
    return t+'…';
  }

  function visibleIds(kind){
    const cal=document.getElementById(kind+'Calendar');
    if(!cal)return null;
    const set=new Set();
    cal.querySelectorAll('.event').forEach(el=>{
      const cs=getComputedStyle(el);
      if(cs.display!=='none'&&cs.visibility!=='hidden')set.add(String(el.dataset.id));
    });
    return set;
  }

  function roleOrder(label){
    const s=String(label||'').trim();
    if(s==='ลา'||s.startsWith('ลา · ')||s.startsWith('ลา:'))return 100;
    if(s.startsWith('1 '))return 1;
    if(s.startsWith('2 '))return 2;
    if(s.startsWith('3 '))return 3;
    if(s.startsWith('4 '))return 4;
    return 90;
  }

  function sortedEvents(kind,dt){
    let rows=S.events.filter(e=>e.kind===kind&&e.board_id===board(kind)&&e.event_date===dt);
    const vis=visibleIds(kind);
    if(vis)rows=rows.filter(e=>vis.has(String(e.id)));

    if(kind==='host'){
      return rows.sort((a,b)=>{
        const ca=person(a.person_id)?.category||'Z';
        const cb=person(b.person_id)?.category||'Z';
        return ca.localeCompare(cb)||(person(a.person_id)?.sort_order||999)-(person(b.person_id)?.sort_order||999);
      });
    }
    return rows.sort((a,b)=>roleOrder(a.label)-roleOrder(b.label)||(person(a.person_id)?.sort_order||999)-(person(b.person_id)?.sort_order||999));
  }

  function isLeaveLabel(label){
    const s=String(label||'').trim();
    return s==='ลา'||s.startsWith('ลา · ')||s.startsWith('ลา:');
  }

  function eventColors(e,p){
    if(isLeaveLabel(e.label))return {strip:'#9ca3af',bg:'rgba(156,163,175,.16)',text:'#68707c',sub:'#7b818b'};
    return {strip:p?.color||'#64748b',bg:hexToRgba(p?.color||'#64748b',.13),text:'#18212f',sub:'#667085'};
  }

  function drawEvent(ctx,e,x,y,w,h,kind){
    const p=person(e.person_id); if(!p)return;
    const c=eventColors(e,p);
    ctx.fillStyle=c.bg;
    roundedRect(ctx,x,y,w,h,10);
    ctx.fill();

    // Original left color strip
    ctx.fillStyle=c.strip;
    roundedRect(ctx,x,y,9,h,5);
    ctx.fill();

    const centerX=x+w/2;
    const nameMax=w-56;
    const hasSubtitle=e.show_label!==false&&String(e.label||'').trim();

    // Both Host and Team now support subtitle under the name.
    if(hasSubtitle){
      const nameStart=kind==='team'?28:29;
      const nameMin=kind==='team'?21:22;
      const subStart=kind==='team'?16:15;
      const subMin=12;
      const nameSize=fitFont(ctx,p.name,nameMax,nameStart,nameMin,700);
      const subSize=fitFont(ctx,e.label,nameMax,subStart,subMin,500);
      const gap=4;
      const blockH=nameSize+subSize+gap;
      let cy=y+(h-blockH)/2;

      ctx.textAlign='center';
      ctx.textBaseline='top';
      ctx.fillStyle=c.text;
      ctx.font=`700 ${nameSize}px ${fontFamily}`;
      ctx.fillText(fitText(ctx,p.name,nameMax),centerX,cy);

      cy+=nameSize+gap;
      ctx.fillStyle=c.sub;
      ctx.font=`500 ${subSize}px ${fontFamily}`;
      ctx.fillText(fitText(ctx,e.label,nameMax),centerX,cy);
    }else{
      const nameSize=fitFont(ctx,p.name,nameMax,31,23,700);
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle=c.text;
      ctx.font=`700 ${nameSize}px ${fontFamily}`;
      ctx.fillText(fitText(ctx,p.name,nameMax),centerX,y+h/2+1);
    }
  }

  function buildCells(){
    const y=S.month.getFullYear(),m=S.month.getMonth();
    const first=(new Date(y,m,1).getDay()+6)%7;
    const days=new Date(y,m+1,0).getDate();
    const prevDays=new Date(y,m,0).getDate();
    const arr=[];
    for(let i=first-1;i>=0;i--)arr.push({day:prevDays-i,out:true});
    for(let d=1;d<=days;d++)arr.push({day:d,out:false});
    let d=1;
    while(arr.length<42)arr.push({day:d++,out:true});
    return arr;
  }

  function exportTitle(kind){
    if(kind==='host')return document.getElementById('hostTitle')?.value||'ปฏิทินพิธีกร';
    return document.getElementById('teamTitle')?.value||'ตารางเวรทีม';
  }

  function dateString(day){
    return `${S.month.getFullYear()}-${String(S.month.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function teamDynamicHeight(){
    // Reserve enough space for the busiest day in each calendar week.
    // This guarantees no team rows are dropped.
    const cells=buildCells();
    const weeklyHeights=[];
    for(let week=0;week<6;week++){
      let maxEvents=0,maxHasNote=0;
      for(let col=0;col<7;col++){
        const c=cells[week*7+col];
        if(c.out)continue;
        const dt=dateString(c.day);
        maxEvents=Math.max(maxEvents,sortedEvents('team',dt).length);
        const n=S.dayNotes.find(n=>n.board_id===board('team')&&n.note_date===dt);
        if(n?.show_note!==false&&n?.note)maxHasNote=1;
      }
      // Date header + optional note + all team rows + breathing room.
      const rowH=58,gap=8;
      const needed=44+(maxHasNote?28:0)+(maxEvents?maxEvents*rowH+(maxEvents-1)*gap:0)+26;
      weeklyHeights.push(Math.max(170,needed));
    }
    return {
      weeklyHeights,
      height:HEADER_H+10+WEEK_H+weeklyHeights.reduce((a,b)=>a+b,0)+PAD_BOTTOM
    };
  }

  async function exportClean(kind){
    const dynamic=kind==='team'?teamDynamicHeight():null;
    const H=kind==='team'?Math.max(1550,dynamic.height):HOST_H;

    const canvas=document.createElement('canvas');
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');

    ctx.fillStyle='#f8fafc';
    ctx.fillRect(0,0,W,H);

    // Header
    const grad=ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0,'#101827');
    grad.addColorStop(.72,'#17243a');
    grad.addColorStop(1,'#981023');
    ctx.fillStyle=grad;
    ctx.fillRect(0,0,W,HEADER_H);

    ctx.fillStyle='#fff';
    ctx.textBaseline='middle';
    ctx.textAlign='left';
    ctx.font=`700 31px ${fontFamily}`;
    ctx.fillText(exportTitle(kind),36,HEADER_H/2);

    ctx.textAlign='center';
    ctx.font=`700 32px ${fontFamily}`;
    ctx.fillText(`${monthNames[S.month.getMonth()]} ${S.month.getFullYear()+543}`,W/2,HEADER_H/2);

    ctx.textAlign='right';
    ctx.font=`500 18px ${fontFamily}`;
    const now=new Date();
    const time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    ctx.fillText(`อัปเดตล่าสุด ${now.getDate()} ${monthNames[now.getMonth()].slice(0,3)}. ${now.getFullYear()+543} ${time}`,W-36,HEADER_H/2);

    const gridX=PAD_X,gridY=HEADER_H+10,gridW=W-PAD_X*2;
    const colW=gridW/DAYS;
    const weekdays=['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'];

    for(let i=0;i<7;i++){
      const x=gridX+i*colW;
      const wg=ctx.createLinearGradient(x,0,x+colW,0);
      wg.addColorStop(0,i<5?'#ed162a':'#dc1024');
      wg.addColorStop(1,i<5?'#d90c21':'#8d0615');
      ctx.fillStyle=wg;ctx.fillRect(x,gridY,colW,WEEK_H);
      ctx.strokeStyle='rgba(255,255,255,.35)';ctx.strokeRect(x,gridY,colW,WEEK_H);
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=`700 25px ${fontFamily}`;
      ctx.fillText(weekdays[i],x+colW/2,gridY+WEEK_H/2);
    }

    const cells=buildCells();
    const cellY0=gridY+WEEK_H;
    const fixedHostCellH=(H-cellY0-PAD_BOTTOM)/6;
    let weekY=cellY0;

    for(let week=0;week<6;week++){
      const cellH=kind==='team'?dynamic.weeklyHeights[week]:fixedHostCellH;

      for(let col=0;col<7;col++){
        const idx=week*7+col;
        const c=cells[idx];
        const x=gridX+col*colW,y=weekY;

        ctx.fillStyle=c.out?'#f2f5f8':'#fff';
        ctx.fillRect(x,y,colW,cellH);
        ctx.strokeStyle='#dce2e9';
        ctx.lineWidth=1;
        ctx.strokeRect(x,y,colW,cellH);

        // Number only, top-right.
        ctx.textAlign='right';ctx.textBaseline='top';
        ctx.font=`700 24px ${fontFamily}`;
        ctx.fillStyle=c.out?'#a3acb8':(col>=5?'#a91424':'#1c2532');
        ctx.fillText(String(c.day),x+colW-14,y+10);

        if(c.out)continue;

        const dt=dateString(c.day);
        const evs=sortedEvents(kind,dt);
        const note=S.dayNotes.find(n=>n.board_id===board(kind)&&n.note_date===dt);

        let top=y+43;
        if(note?.show_note!==false&&note?.note){
          ctx.textAlign='left';ctx.textBaseline='top';
          ctx.fillStyle='#8a1730';
          const fs=fitFont(ctx,note.note,colW-34,15,11,600);
          ctx.font=`600 ${fs}px ${fontFamily}`;
          ctx.fillText(fitText(ctx,note.note,colW-34),x+16,top);
          top+=fs+10;
        }

        if(!evs.length)continue;

        const gap=kind==='team'?8:7;
        const rowH=kind==='team'?58:52;
        const available=y+cellH-14-top;
        const required=evs.length*rowH+(evs.length-1)*gap;

        // Center vertically when there is spare room; never drop rows.
        let startY=top+Math.max(0,(available-required)/2);
        const rowX=x+12,rowW=colW-24;

        for(const e of evs){
          drawEvent(ctx,e,rowX,startY,rowW,rowH,kind);
          startY+=rowH+gap;
        }
      }

      weekY+=cellH;
    }

    const url=canvas.toDataURL('image/jpeg',.94);
    const preview=document.getElementById('exportPreview');
    const download=document.getElementById('exportDownload');
    const dialog=document.getElementById('exportDialog');

    if(preview)preview.src=url;
    if(download){
      download.href=url;
      const safe=exportTitle(kind).replace(/[\\/:*?"<>|]/g,'-');
      download.download=`${kind==='host'?'ตารางคิวพิธีกร':'ตารางคิวทีม'}-${safe}-${monthNames[S.month.getMonth()]} ${S.month.getFullYear()+543}.jpg`;
    }
    if(dialog&&!dialog.open)dialog.showModal();
  }

  // Capture Export before original export handler.
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.export');
    if(!btn)return;
    const kind=btn.closest('.view')?.id;
    if(kind!=='host'&&kind!=='team')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    exportClean(kind);
  },true);

  const badge=document.getElementById('versionBadge');
  if(badge)badge.textContent='v3.0';
})();