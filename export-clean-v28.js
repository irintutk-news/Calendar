/* One News Calendar v2.8 — Clean 16:9 JPG export */
(() => {
  const W=2560,H=1440;
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
      if(cs.display!=='none' && cs.visibility!=='hidden')set.add(String(el.dataset.id));
    });
    return set;
  }

  function sortedEvents(kind,dt){
    let rows=S.events.filter(e=>e.kind===kind && e.board_id===board(kind) && e.event_date===dt);
    const vis=visibleIds(kind);
    if(vis)rows=rows.filter(e=>vis.has(String(e.id)));

    if(kind==='host'){
      return rows.sort((a,b)=>{
        const ca=person(a.person_id)?.category||'Z';
        const cb=person(b.person_id)?.category||'Z';
        return ca.localeCompare(cb) || (person(a.person_id)?.sort_order||999)-(person(b.person_id)?.sort_order||999);
      });
    }

    const order=label=>{
      const s=String(label||'').trim();
      if(s==='ลา'||s.startsWith('ลา · ')||s.startsWith('ลา:'))return 100;
      if(s.startsWith('1 '))return 1;
      if(s.startsWith('2 '))return 2;
      if(s.startsWith('3 '))return 3;
      if(s.startsWith('4 '))return 4;
      return 90;
    };
    return rows.sort((a,b)=>order(a.label)-order(b.label)||(person(a.person_id)?.sort_order||999)-(person(b.person_id)?.sort_order||999));
  }

  function eventColors(e,p){
    const isLeave=String(e.label||'').trim()==='ลา'||String(e.label||'').startsWith('ลา · ')||String(e.label||'').startsWith('ลา:');
    if(isLeave)return {strip:'#9ca3af',bg:'rgba(156,163,175,.16)',text:'#68707c'};
    return {strip:p?.color||'#64748b',bg:hexToRgba(p?.color||'#64748b',.13),text:'#18212f'};
  }

  function drawEvent(ctx,e,x,y,w,h,kind){
    const p=person(e.person_id); if(!p)return;
    const c=eventColors(e,p);
    const radius=10;

    ctx.fillStyle=c.bg;
    roundedRect(ctx,x,y,w,h,radius);
    ctx.fill();

    // Original-style colored strip on the left, no number badge.
    ctx.fillStyle=c.strip;
    roundedRect(ctx,x,y,9,h,5);
    ctx.fill();

    const centerX=x+w/2;
    const nameMax=w-44;

    if(kind==='team' && e.show_label!==false && e.label){
      const nameSize=fitFont(ctx,p.name,nameMax,22,16,700);
      const labelSize=fitFont(ctx,e.label,nameMax,14,11,500);
      const blockH=nameSize+labelSize+5;
      let cy=y+(h-blockH)/2;

      ctx.textAlign='center';
      ctx.textBaseline='top';
      ctx.fillStyle=c.text;
      ctx.font=`700 ${nameSize}px ${fontFamily}`;
      ctx.fillText(fitText(ctx,p.name,nameMax),centerX,cy);

      cy+=nameSize+4;
      ctx.fillStyle=String(e.label||'').startsWith('ลา')?'#7b818b':'#6b7280';
      ctx.font=`500 ${labelSize}px ${fontFamily}`;
      ctx.fillText(fitText(ctx,e.label,nameMax),centerX,cy);
    }else{
      const nameSize=fitFont(ctx,p.name,nameMax,24,17,700);
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
    for(let i=first-1;i>=0;i--)arr.push({day:prevDays-i,out:true,where:'prev'});
    for(let d=1;d<=days;d++)arr.push({day:d,out:false});
    let d=1;
    while(arr.length<42)arr.push({day:d++,out:true,where:'next'});
    return arr;
  }

  function exportTitle(kind){
    if(kind==='host')return document.getElementById('hostTitle')?.value||'ปฏิทินพิธีกร';
    return document.getElementById('teamTitle')?.value||'ตารางเวรทีม';
  }

  async function exportClean(kind){
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

    // Weekday header
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
    const rows=6;
    const cellY0=gridY+WEEK_H;
    const cellH=(H-cellY0-PAD_BOTTOM)/rows;

    for(let idx=0;idx<42;idx++){
      const c=cells[idx],r=Math.floor(idx/7),col=idx%7;
      const x=gridX+col*colW,y=cellY0+r*cellH;

      ctx.fillStyle=c.out?'#f2f5f8':'#fff';
      ctx.fillRect(x,y,colW,cellH);
      ctx.strokeStyle='#dce2e9';
      ctx.lineWidth=1;
      ctx.strokeRect(x,y,colW,cellH);

      // Date: number only, top-right.
      ctx.textAlign='right';ctx.textBaseline='top';
      ctx.font=`700 24px ${fontFamily}`;
      ctx.fillStyle=c.out?'#a3acb8':(col>=5?'#a91424':'#1c2532');
      ctx.fillText(String(c.day),x+colW-14,y+10);

      if(c.out)continue;

      const dt=`${S.month.getFullYear()}-${String(S.month.getMonth()+1).padStart(2,'0')}-${String(c.day).padStart(2,'0')}`;
      const evs=sortedEvents(kind,dt);
      const note=S.dayNotes.find(n=>n.board_id===board(kind)&&n.note_date===dt);

      let top=y+43;
      if(note?.show_note!==false && note?.note){
        ctx.textAlign='left';ctx.textBaseline='top';
        ctx.fillStyle='#8a1730';
        const fs=fitFont(ctx,note.note,colW-34,15,11,600);
        ctx.font=`600 ${fs}px ${fontFamily}`;
        ctx.fillText(fitText(ctx,note.note,colW-34),x+16,top);
        top+=fs+9;
      }

      const available=y+cellH-12-top;
      if(!evs.length)continue;

      const gap=7;
      const ideal=kind==='team'?48:42;
      let rowH=Math.min(ideal,(available-gap*(evs.length-1))/evs.length);
      rowH=Math.max(kind==='team'?32:30,rowH);
      const total=rowH*evs.length+gap*(evs.length-1);
      let startY=top+Math.max(0,(available-total)/2);

      // Extra breathing room: rows never touch cell borders.
      const rowX=x+12,rowW=colW-24;
      for(const e of evs){
        if(startY+rowH>y+cellH-10)break;
        drawEvent(ctx,e,rowX,startY,rowW,rowH,kind);
        startY+=rowH+gap;
      }
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

  // Capture Export clicks before the original app handler.
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.export');
    if(!btn)return;
    const view=btn.closest('.view');
    const kind=view?.id;
    if(kind!=='host'&&kind!=='team')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    exportClean(kind);
  },true);

  const badge=document.getElementById('versionBadge');
  if(badge)badge.textContent='v2.8';
})();