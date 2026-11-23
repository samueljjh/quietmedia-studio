/* Quiet Media shot list. One file, used by Studio (signed in: build and edit the list) and by the crew link page on the
   Sheets site (tick shots, log grabs, add notes). The page that loads it supplies an "adapter" that knows how to read and save.
   QMShots.mount(el, adapter) draws it; QMShots.refresh() redraws after data changes; QMShots.fromSeed() turns an import file into records. */
(function(root){
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const pad=n=>String(n).padStart(2,'0');
  const dkey=ms=>{const d=new Date(ms);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  const dparse=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null};
  const dfmt=(s,o)=>{const d=dparse(s);return d?d.toLocaleDateString('en-GB',o||{weekday:'short',day:'numeric',month:'short'}):(s||'')};
  const tfmt=ms=>new Date(ms).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const when=ms=>{if(!ms)return '';return (dkey(ms)===dkey(Date.now())?'':new Date(ms).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+', ')+tfmt(ms)};
  const lines=s=>String(s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const cam=c=>{c=c||{};const head=[c.setup,c.lens].filter(Boolean).join(', ');return head&&c.note?head+': '+c.note:head||c.note||''};
  const IC={
    x:'<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    back:'<svg viewBox="0 0 16 16"><path d="M10 3L5 8l5 5"/></svg>',
    undo:'<svg viewBox="0 0 16 16"><path d="M3 6h7a3.5 3.5 0 0 1 0 7H6M3 6l3-3M3 6l3 3"/></svg>',
    share:'<svg viewBox="0 0 16 16"><path d="M8 10V2M5 5l3-3 3 3M3 9v4h10V9"/></svg>',
    tick:'<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>',
    plus:'<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>',
    cam:'<svg viewBox="0 0 16 16"><path d="M2 5h3l1-1.5h4L11 5h3v8H2z"/><circle cx="8" cy="9" r="2.3"/></svg>',
    note:'<svg viewBox="0 0 16 16"><path d="M3 3h10v8H7l-3 2.5V11H3z"/></svg>'};
  const CSS=`
#shotsRoot{position:fixed;inset:0;z-index:150;background:var(--bg);overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding-top:env(safe-area-inset-top,0px)}
body.sl-open{overflow:hidden}
.sl{font-family:var(--font);color:var(--fg);font-weight:300;font-size:15px;line-height:1.45;max-width:1040px;margin:0 auto;padding:0 16px calc(110px + env(safe-area-inset-bottom,0px));font-variant-numeric:tabular-nums}
.sl.sl-ov{padding:0;max-width:none;margin:0}
.sl *{box-sizing:border-box}
.sl button{font-family:inherit;color:inherit;cursor:pointer}
.sl h1,.sl h2,.sl h3,.sl p,.sl ul{margin:0;padding:0}
.sl svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
.sl-bar{display:flex;align-items:center;gap:8px;padding:12px 0 6px}
.sl-bar .sp{flex:1;min-width:0}
.sl-ib{width:40px;height:40px;border-radius:50%;border:0;background:var(--raise);display:grid;place-items:center;flex:none}
.sl-ib[disabled]{opacity:.3}
.sl-brand{display:flex;align-items:center;gap:8px;font-size:15px;min-width:0}.sl-brand svg{width:22px;height:22px;stroke:none;fill:currentColor}
.sl-brand span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sl-net{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);white-space:nowrap}.sl-net.off{color:var(--warn)}
.sl-eyebrow{font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--tan)}
.sl h1{font-size:clamp(28px,6vw,44px);font-weight:300;letter-spacing:-.8px;line-height:1.05;margin:4px 0 14px;text-wrap:balance}
.sl-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}
.sl-stat{background:var(--surface);border-radius:16px;padding:12px 14px;border:0;text-align:left;min-width:0}
.sl-stat small{display:block;font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sl-stat b{display:block;font-size:clamp(22px,6vw,30px);font-weight:300;letter-spacing:-.5px;line-height:1.15}
.sl-stat b i{font-style:normal;font-size:13px;color:var(--muted);letter-spacing:0;margin-left:5px}
.sl-stat.main{background:var(--fg);color:var(--bg)}.sl-stat.main small,.sl-stat.main b i{color:inherit;opacity:.65}
.sl-stat.clear{background:var(--surface);color:var(--ok)}
.sl-prog{height:3px;border-radius:2px;background:var(--raise);margin-top:8px;overflow:hidden}.sl-prog i{display:block;height:100%;background:currentColor;border-radius:2px}
.sl-scroll{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}.sl-scroll::-webkit-scrollbar{display:none}
.sl-tabs{margin-bottom:12px;position:sticky;top:0;z-index:5;background:var(--bg);padding-top:8px;padding-bottom:8px}
.sl-tab,.sl-chip{border:0;border-radius:999px;background:var(--raise);padding:9px 15px;font-size:13px;font-weight:400;white-space:nowrap;flex:none;min-height:38px}
.sl-tab[aria-pressed=true],.sl-chip[aria-pressed=true]{background:var(--fg);color:var(--bg);font-weight:500}
.sl-chip{padding:7px 13px;min-height:34px;background:transparent;box-shadow:inset 0 0 0 1px var(--line-strong)}
.sl-chip[aria-pressed=true]{box-shadow:none}
.sl-filters{display:grid;gap:8px;margin-bottom:16px}
.sl-filters .lab{font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);align-self:center;flex:none;width:44px}
.sl-dayhead{margin:22px 0 10px}.sl-dayhead b{font-size:22px;font-weight:400;letter-spacing:-.3px}.sl-dayhead span{color:var(--muted);font-size:13px;margin-left:8px}
.sl-block{background:var(--surface);border-radius:20px;padding:6px 14px 8px;margin-bottom:12px}
.sl-bhead{display:flex;align-items:center;gap:10px;padding:12px 0 10px;flex-wrap:wrap}
.sl-bcode{width:34px;height:34px;border-radius:10px;background:var(--fg);color:var(--bg);display:grid;place-items:center;font-weight:500;font-size:15px;flex:none}
.sl-bhead h3{font-size:16px;font-weight:400;flex:1;min-width:140px;line-height:1.25}
.sl-bhead .n{font-size:12px;color:var(--muted);white-space:nowrap}
.sl-look{display:inline-block;font-size:11px;font-weight:500;letter-spacing:.04em;padding:3px 8px;border-radius:7px;background:var(--raise);color:var(--sand);white-space:nowrap}
.sl-bnote{font-size:13px;color:var(--muted);padding:0 0 10px;max-width:70ch}
.sl-shot{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:12px 0;border-top:1px solid var(--line);align-items:start}
.sl-tick{width:44px;height:44px;border-radius:50%;border:0;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);display:grid;place-items:center;transition:transform .12s}
.sl-tick:active{transform:scale(.9)}
.sl-tick svg{width:20px;height:20px;stroke-width:2.2;opacity:0}
.sl-tick[aria-pressed=true]{background:var(--ok);box-shadow:none;color:var(--bg)}.sl-tick[aria-pressed=true] svg{opacity:1}
.sl-body{display:grid;gap:5px;text-align:left;background:none;border:0;padding:0;min-width:0;width:100%;font-size:inherit;font-weight:inherit}
.sl-c1{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.sl-id{font-weight:500;font-size:16px;letter-spacing:-.1px}
.sl-pri,.sl-flag{font-size:10px;font-weight:500;letter-spacing:.08em;padding:2px 7px;border-radius:999px;white-space:nowrap}
.sl-pri.P1{background:var(--fg);color:var(--bg)}.sl-pri.P2{box-shadow:inset 0 0 0 1px var(--line-strong)}.sl-pri.P3{color:var(--muted);box-shadow:inset 0 0 0 1px var(--line)}
.sl-flag.grab{color:var(--warn);box-shadow:inset 0 0 0 1px var(--warn)}.sl-flag.match{color:var(--sand);box-shadow:inset 0 0 0 1px var(--sand)}
.sl-nn{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--muted)}.sl-nn svg{width:13px;height:13px}
.sl-act{font-size:15px}
.sl-note{font-size:13px;color:var(--muted)}
.sl-c3{display:flex;gap:4px 14px;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.sl-cam{display:inline-flex;gap:6px;align-items:baseline;min-width:0}.sl-cam i{font-style:normal;font-weight:500;font-size:10px;letter-spacing:.06em;color:var(--tan);flex:none}
.sl-shot.done .sl-body{opacity:.45}
.sl-grab{display:flex;gap:10px;align-items:center;margin-top:4px;padding:6px;border-radius:12px;background:var(--raise);font-size:12px;color:var(--muted);max-width:420px}
.sl-grab img{width:76px;height:48px;object-fit:cover;border-radius:7px;flex:none;background:var(--bg)}
.sl-grab b{font-weight:500;color:var(--fg)}
.sl-grab.none{color:var(--warn);background:transparent;box-shadow:inset 0 0 0 1px var(--line-strong);padding:7px 10px}
.sl-add{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:10px 0;font-size:13px;color:var(--sand)}
.sl-empty{padding:28px 0;color:var(--muted)}
.sl-panel{background:var(--surface);border-radius:20px;padding:16px;margin-bottom:12px}
.sl-panel h2{font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--tan);margin-bottom:10px;display:flex;justify-content:space-between;gap:10px;align-items:center}
.sl-panel h2 b{font-size:18px;font-weight:400;letter-spacing:-.2px;text-transform:none;color:var(--fg)}
.sl-row{display:grid;grid-template-columns:58px 64px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid var(--line);align-items:baseline;width:100%;background:none;border-left:0;border-right:0;border-bottom:0;text-align:left;font-size:inherit;font-weight:inherit}
.sl-row:first-of-type{border-top:0}
.sl-row .t{font-weight:500}.sl-row .b{display:flex;gap:5px;flex-wrap:wrap;align-items:center;font-size:13px}.sl-row .w small{display:block;color:var(--muted);font-size:12px}
.sl-row.now{background:var(--raise);margin:0 -10px;padding:10px;border-radius:12px;border-top-color:transparent;width:calc(100% + 20px)}
.sl-ul{list-style:none;display:grid;gap:6px;font-size:14px;color:var(--muted)}.sl-ul li{padding-left:14px;position:relative}.sl-ul li::before{content:'';position:absolute;left:0;top:.6em;width:5px;height:5px;border-radius:50%;background:var(--tan)}
.sl-check{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:10px;padding:10px 0;border-top:1px solid var(--line);align-items:start}
.sl-check:first-of-type{border-top:0}
.sl-cb{width:28px;height:28px;border-radius:9px;border:0;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);display:grid;place-items:center;margin-top:1px}
.sl-cb svg{opacity:0;stroke-width:2.2}.sl-cb[aria-pressed=true]{background:var(--ok);box-shadow:none;color:var(--bg)}.sl-cb[aria-pressed=true] svg{opacity:1}
.sl-cb[disabled]{opacity:.6;cursor:default}
.sl-check.done .tx{opacity:.5}
.sl-check .tx b{font-weight:500}.sl-check .tx small{display:block;color:var(--muted);font-size:13px}
.sl-ed{background:none;border:0;color:var(--sand);font-size:12px;text-decoration:underline;text-underline-offset:3px;padding:4px 0}
.sl-kv{display:grid;grid-template-columns:86px minmax(0,1fr);gap:8px 14px;font-size:14px}.sl-kv dt{color:var(--muted)}.sl-kv dd{margin:0;min-width:0}
.sl a{color:inherit;text-underline-offset:3px}
.sl details{border-top:1px solid var(--line);padding:12px 0}.sl details:first-of-type{border-top:0}
.sl summary{cursor:pointer;font-size:15px;font-weight:400}
.sl details .bd{font-size:14px;color:var(--muted);white-space:pre-line;margin-top:8px;max-width:75ch}
.sl-sc{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:14px}.sl-sc b{font-weight:500}.sl-sc small{display:block;color:var(--muted);font-size:13px}
.sl-scrim{position:fixed;inset:0;z-index:160;background:rgba(0,0,0,.55);display:grid;place-items:end center}
.sl-sheet{background:var(--bg);width:min(620px,100vw);max-height:calc(100% - env(safe-area-inset-top,0px) - 20px);overflow:auto;overscroll-behavior:contain;border-radius:22px 22px 0 0;padding:16px 18px calc(22px + env(safe-area-inset-bottom,0px));display:grid;gap:14px;box-shadow:0 18px 50px rgba(0,0,0,.5);animation:slUp .28s cubic-bezier(.16,1,.3,1)}
@keyframes slUp{from{transform:translateY(24px);opacity:0}}
@media (min-width:700px){.sl-scrim{place-items:center}.sl-sheet{border-radius:22px;max-height:calc(100% - 48px)}}
.sl-sheet .hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sl-sheet .hd .sp{flex:1}
.sl-sheet h2{font-size:24px;font-weight:300;letter-spacing:-.4px;line-height:1.15}
.sl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:999px;background:var(--fg);color:var(--bg)!important;border:0;font-size:14px;font-weight:500;min-height:46px;text-decoration:none}
.sl-btn.ghost{background:var(--raise);color:var(--fg)!important}
.sl-btn.ok{background:var(--ok)}
.sl-btn.danger{background:transparent;color:var(--danger,#C46A5A)!important;box-shadow:inset 0 0 0 1px var(--danger,#C46A5A)}
.sl-btn.small{padding:8px 14px;min-height:36px;font-size:13px}
.sl-btn.wide{width:100%}
.sl-acts{display:flex;gap:8px;flex-wrap:wrap}.sl-acts .sp{flex:1}
.sl-f{display:grid;gap:5px;font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--tan);min-width:0}
.sl-f input,.sl-f select,.sl-f textarea,.sl-in{font-family:inherit;font-size:16px;font-weight:300;color:var(--fg);background:var(--raise);border:1px solid transparent;border-radius:12px;padding:10px 12px;width:100%;min-width:0;text-transform:none;letter-spacing:0;-webkit-appearance:none;appearance:none}
.sl-f textarea,textarea.sl-in{min-height:72px;resize:vertical;line-height:1.4}
.sl-f input:focus,.sl-f select:focus,.sl-f textarea:focus,.sl-in:focus{outline:none;border-color:var(--line-strong)}
.sl-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.sl-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.sl-sec{border-top:1px solid var(--line);padding-top:14px;display:grid;gap:10px}
.sl-sec>.sl-eyebrow{display:flex;justify-content:space-between;align-items:center;gap:10px}
.sl-photo{position:relative;border-radius:14px;overflow:hidden;background:var(--raise);aspect-ratio:16/9;display:grid;place-items:center;color:var(--muted);font-size:13px;border:0;width:100%;padding:0}
.sl-photo img{width:100%;height:100%;object-fit:contain;background:#000;display:block}
.sl-file{position:relative;overflow:hidden}.sl-file input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;font-size:0}
.sl-twins{display:flex;gap:6px;flex-wrap:wrap}
.sl-twin{border:0;border-radius:999px;background:var(--raise);padding:7px 12px;font-size:13px;display:inline-flex;gap:6px;align-items:center}.sl-twin.done{color:var(--ok)}
.sl-n{display:grid;gap:2px;padding:8px 12px;border-radius:12px;background:var(--raise);font-size:14px}
.sl-n small{color:var(--muted);font-size:11px;display:flex;justify-content:space-between;gap:10px}
.sl-n p{white-space:pre-line}
.sl-full{position:fixed;inset:0;z-index:170;background:#000;display:grid;place-items:center;border:0;padding:0;width:100%}
.sl-full img{max-width:100%;max-height:100%;object-fit:contain}
.sl-full span{position:absolute;left:0;right:0;bottom:calc(14px + env(safe-area-inset-bottom,0px));text-align:center;color:#fff;font-size:13px;text-shadow:0 1px 4px #000;padding:0 16px}
.sl-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(22px + env(safe-area-inset-bottom,0px));background:var(--fg);color:var(--bg);padding:7px 8px 7px 16px;border-radius:999px;font-size:13px;font-weight:500;z-index:180;display:flex;gap:12px;align-items:center;white-space:nowrap;max-width:calc(100% - 24px)}
.sl-toast span{overflow:hidden;text-overflow:ellipsis;padding:4px 8px 4px 0}
.sl-toast button{background:var(--bg);color:var(--fg);border:0;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:500}
.sl-linkbox{background:var(--raise);border-radius:12px;padding:10px 12px;font-size:12px;word-break:break-all;user-select:all}
@media (min-width:860px){
  .sl-body{grid-template-columns:150px minmax(0,1fr) minmax(0,300px);gap:16px;align-items:start}
  .sl-c3{display:grid;gap:3px}
  .sl-block{padding:6px 20px 10px}
  .sl-filters{grid-template-columns:auto auto 1fr;gap:8px 22px}.sl-filters .sl-scroll{margin:0;padding:0}
}
@media print{#shotsRoot{position:static}.sl-bar,.sl-tabs,.sl-filters,.sl-add,.sl-ed{display:none!important}}
`;
  let A=null,el=null,T=null,toastT=null;
  const fresh=()=>({tab:'shots',day:null,block:'',pri:'',left:false,sheet:null,imgs:{}});
  let ST=fresh();

  /* ---------- reading the data ---------- */
  const L=()=>A.list()||{};
  const days=()=>L().days||[];
  const blocks=()=>L().blocks||[];
  const byN=(a,b)=>(a.n||0)-(b.n||0)||String(a.id).localeCompare(String(b.id));
  const allShots=()=>A.shots().slice().sort(byN);
  const shot=id=>A.shots().find(s=>s.id===id);
  const blockOf=s=>blocks().find(b=>b.id===s.blockId);
  const dayOfShot=s=>{const b=blockOf(s);return b?b.dayId:''};
  const notesOf=id=>A.notes().filter(n=>n.shotId===id).sort((a,b)=>(a.at||0)-(b.at||0));
  const srcOf=s=>s.flag==='match'&&s.matchOf?shot(s.matchOf):null;
  const twinsOf=s=>allShots().filter(x=>x.flag==='match'&&x.matchOf===s.id);
  const logLine=g=>{g=g||{};return [g.focal,g.stop,g.focus&&('focus '+g.focus),g.height&&('height '+g.height),g.other].filter(Boolean).join(' · ')};
  function stats(shots){const p1=shots.filter(s=>s.pri==='P1');return {n:shots.length,done:shots.filter(s=>s.done).length,p1:p1.length,p1left:p1.filter(s=>!s.done).length}}
  function defaultDay(){const ds=days();if(!ds.length)return 'all';const t=dkey(Date.now());const today=ds.find(d=>d.date===t);if(today)return today.id;
    const sh=A.shots();const open=ds.find(d=>sh.some(s=>!s.done&&dayOfShot(s)===d.id));return (open||ds[0]).id}
  function visible(){return allShots().filter(s=>{const b=blockOf(s);if(!b)return false;if(ST.day!=='all'&&b.dayId!==ST.day)return false;if(ST.block&&b.id!==ST.block)return false;if(ST.pri&&s.pri!==ST.pri)return false;if(ST.left&&s.done)return false;return true})}

  /* ---------- the page ---------- */
  function head(){const l=L();const st=stats(A.shots());const link=A.mode==='link';
    return '<div class="sl-bar">'+(link?'<div class="sl-brand"><svg viewBox="0 0 400 400" aria-hidden="true"><path d="M 296.555 343.549 A 173 173 0 1 1 343.549 296.555 L 302.822 255.828 A 117 117 0 1 0 255.828 302.822 L 296.555 343.549 Z"/></svg><span>quiet media</span></div>':'<button class="sl-ib" data-sl="close" aria-label="Back to Studio">'+IC.back+'</button>')+
      '<div class="sp"></div>'+(A.net?'<span class="sl-net'+(A.net()==='ok'?'':' off')+'" id="sl-net">'+esc(netLabel())+'</span>':'')+
      '<button class="sl-ib" data-sl="undo" aria-label="Undo" title="Undo"'+(A.canUndo()?'':' disabled')+'>'+IC.undo+'</button>'+
      (A.can.edit?'<button class="sl-ib" data-sl="share" aria-label="Share with crew" title="Share with crew">'+IC.share+'</button>':'')+'</div>'+
      '<div class="sl-eyebrow">Shot list'+(l.sub?' · '+esc(l.sub):'')+'</div><h1>'+esc(l.title||'Shot list')+(A.can.edit?' <button class="sl-ed" data-sl="edlist">Edit</button>':'')+'</h1>'+
      '<div class="sl-stats"><button class="sl-stat '+(st.p1left?'main':'clear')+'" data-sl="p1left"><small>P1 left</small><b>'+st.p1left+'<i>of '+st.p1+'</i></b></button>'+
      '<div class="sl-stat"><small>Shots done</small><b>'+st.done+'<i>of '+st.n+'</i></b><div class="sl-prog"><i style="width:'+(st.n?Math.round(st.done/st.n*100):0)+'%"></i></div></div>'+
      (()=>{const d=days().find(x=>x.id===ST.day);if(!d)return '<div class="sl-stat"><small>Days</small><b>'+days().length+'</b></div>';const s=stats(A.shots().filter(x=>dayOfShot(x)===d.id));return '<div class="sl-stat"><small>'+esc(dfmt(d.date,{weekday:'short',day:'numeric',month:'short'}))+'</small><b>'+s.done+'<i>of '+s.n+'</i></b><div class="sl-prog"><i style="width:'+(s.n?Math.round(s.done/s.n*100):0)+'%"></i></div></div>'})()+'</div>'+
      '<div class="sl-scroll sl-tabs">'+[['shots','Shots'],['order','Running order'],['looks','Looks'],['props','Props'],['qs','Questions'],['info','Info']].map(([k,t])=>{const n=k==='qs'?(l.questions||[]).filter(q=>!q.done).length:0;return '<button class="sl-tab" data-sl="tab" data-v="'+k+'" aria-pressed="'+(ST.tab===k)+'">'+t+(n?' · '+n:'')+'</button>'}).join('')+'</div>'}
  function netLabel(){const s=A.net();return s==='ok'?'Live':s==='saving'?'Saving…':'Offline · saved here'}

  function shotRow(s){const src=srcOf(s);const nn=notesOf(s.id).length;const g=s.grab||{};
    let strip='';
    if(s.flag==='grab')strip=g.thumb||logLine(g)?'<div class="sl-grab">'+(g.thumb?'<img src="'+esc(g.thumb)+'" alt="">':'')+'<span><b>Grab logged</b>'+(logLine(g)?'<br>'+esc(logLine(g)):'')+'</span></div>':'<div class="sl-grab none">Grab not taken yet</div>';
    if(s.flag==='match')strip=src?(((src.grab||{}).thumb||logLine(src.grab))?'<div class="sl-grab">'+((src.grab||{}).thumb?'<img src="'+esc(src.grab.thumb)+'" alt="">':'')+'<span><b>Match '+esc(src.label)+'</b>'+(logLine(src.grab)?'<br>'+esc(logLine(src.grab)):'')+'</span></div>':'<div class="sl-grab none">Match '+esc(src.label)+': grab not taken yet</div>'):'';
    return '<div class="sl-shot'+(s.done?' done':'')+'"><button class="sl-tick" data-sl="tick" data-id="'+esc(s.id)+'" aria-pressed="'+!!s.done+'" aria-label="'+(s.done?'Done: ':'Mark done: ')+esc(s.label)+'">'+IC.tick+'</button>'+
      '<button class="sl-body" data-sl="open" data-id="'+esc(s.id)+'"><div class="sl-c1"><span class="sl-id">'+esc(s.label)+'</span>'+(s.pri?'<span class="sl-pri '+esc(s.pri)+'">'+esc(s.pri)+'</span>':'')+(s.flag==='grab'?'<span class="sl-flag grab">GRAB</span>':s.flag==='match'?'<span class="sl-flag match">MATCH'+(src?' '+esc(src.label):'')+'</span>':'')+(s.look?'<span class="sl-look">'+esc(s.look)+'</span>':'')+(nn?'<span class="sl-nn">'+IC.note+nn+'</span>':'')+'</div>'+
      '<div class="sl-c2"><div class="sl-act">'+esc(s.action)+'</div>'+(s.notes?'<div class="sl-note">'+esc(s.notes)+'</div>':'')+strip+'</div>'+
      '<div class="sl-c3">'+(cam(s.a)?'<span class="sl-cam"><i>A</i>'+esc(cam(s.a))+'</span>':'')+(cam(s.b)?'<span class="sl-cam"><i>B</i>'+esc(cam(s.b))+'</span>':'')+'</div></button></div>'}

  function vShots(){const ds=days();const vis=visible();const l=L();
    const dayBlocks=blocks().filter(b=>ST.day==='all'||b.dayId===ST.day);
    let h='<div class="sl-filters"><div class="sl-scroll"><span class="lab">Day</span>'+[['all','All']].concat(ds.map(d=>[d.id,dfmt(d.date,{weekday:'short',day:'numeric'})])).map(([k,t])=>'<button class="sl-chip" data-sl="day" data-v="'+k+'" aria-pressed="'+(ST.day===k)+'">'+esc(t)+'</button>').join('')+'</div>'+
      '<div class="sl-scroll"><span class="lab">Block</span><button class="sl-chip" data-sl="block" data-v="" aria-pressed="'+(!ST.block)+'">All</button>'+dayBlocks.map(b=>'<button class="sl-chip" data-sl="block" data-v="'+b.id+'" aria-pressed="'+(ST.block===b.id)+'">'+esc(b.code)+'</button>').join('')+'</div>'+
      '<div class="sl-scroll"><span class="lab">Show</span>'+[['','All'],['P1','P1'],['P2','P2'],['P3','P3']].map(([k,t])=>'<button class="sl-chip" data-sl="pri" data-v="'+k+'" aria-pressed="'+(ST.pri===k)+'">'+t+'</button>').join('')+'<button class="sl-chip" data-sl="left" aria-pressed="'+ST.left+'">Left to shoot</button></div></div>';
    if(!ds.length)return h+'<div class="sl-empty">No shoot days yet.'+(A.can.edit?' Add one on the Info tab, then add blocks and shots here.':'')+'</div>';
    let any=false;
    ds.filter(d=>ST.day==='all'||d.id===ST.day).forEach(d=>{
      const bs=blocks().filter(b=>b.dayId===d.id&&(!ST.block||b.id===ST.block));
      let dh='';
      bs.forEach(b=>{const all=A.shots().filter(s=>s.blockId===b.id);const rows=vis.filter(s=>s.blockId===b.id);if(!rows.length&&(ST.pri||ST.left)&&all.length)return;const st=stats(all);
        dh+='<section class="sl-block"><div class="sl-bhead"><span class="sl-bcode">'+esc(b.code)+'</span><h3>'+esc(b.title)+(b.where?' <span class="sl-note">· '+esc(b.where)+'</span>':'')+'</h3>'+(b.looks||[]).map(x=>'<span class="sl-look">'+esc(x)+'</span>').join('')+'<span class="n">'+st.done+' of '+st.n+(st.p1left?' · '+st.p1left+' P1 left':'')+'</span>'+(A.can.edit?'<button class="sl-ed" data-sl="edblock" data-id="'+b.id+'">Edit</button>':'')+'</div>'+
          (b.note?'<div class="sl-bnote">'+esc(b.note)+'</div>':'')+rows.map(shotRow).join('')+(A.can.edit?'<button class="sl-add" data-sl="addshot" data-id="'+b.id+'">'+IC.plus+'Add a shot</button>':'')+'</section>'});
      if(dh||A.can.edit){any=any||!!dh;h+='<div class="sl-dayhead"><b>'+esc(dfmt(d.date,{weekday:'long',day:'numeric',month:'long'}))+'</b><span>'+esc(d.name||'')+'</span></div>'+dh+(A.can.edit&&!ST.block?'<button class="sl-add" data-sl="addblock" data-id="'+d.id+'">'+IC.plus+'Add a block</button>':'')}});
    if(!any&&!A.can.edit)h+='<div class="sl-empty">'+(ST.left||ST.pri?'Nothing left here. Change the filters to see everything.':'No shots yet.')+'</div>';
    else if(!vis.length&&(ST.left||ST.pri))h+='<div class="sl-empty">Nothing left with these filters.</div>';
    return h}

  function vOrder(){const l=L();const now=new Date();const hm=pad(now.getHours())+':'+pad(now.getMinutes());
    return days().map(d=>{const rows=(l.running||[]).filter(r=>r.dayId===d.id).sort((a,b)=>String(a.time).localeCompare(String(b.time)));const today=d.date===dkey(Date.now());
      let cur=-1;if(today)rows.forEach((r,i)=>{if(r.time<=hm)cur=i});
      return '<section class="sl-panel"><h2><b>'+esc(dfmt(d.date,{weekday:'long',day:'numeric',month:'long'}))+'</b><span>'+esc(d.name||'')+'</span></h2>'+
        (rows.length?rows.map((r,i)=>{const b=blocks().find(x=>x.dayId===d.id&&x.code===r.block);const st=b?stats(A.shots().filter(s=>s.blockId===b.id)):null;
          return '<button class="sl-row'+(i===cur?' now':'')+'" data-sl="'+(A.can.edit?'edrun':b?'goblock':'')+'" data-id="'+esc(A.can.edit?r.id:b?b.id:'')+'"><span class="t">'+esc(r.time)+'</span><span class="b">'+(b?'<span class="sl-bcode" style="width:26px;height:26px;font-size:13px;border-radius:8px">'+esc(r.block)+'</span>':'<span class="sl-note">'+esc(r.block)+'</span>')+(r.look?'<span class="sl-look">'+esc(r.look)+'</span>':'')+'</span><span class="w">'+esc(r.what)+(st?'<small>'+st.done+' of '+st.n+' shots done'+(st.p1left?' · '+st.p1left+' P1 left':'')+'</small>':'')+'</span></button>'}).join(''):'<p class="sl-note">No running order for this day yet.</p>')+
        (A.can.edit?'<button class="sl-add" data-sl="addrun" data-id="'+d.id+'">'+IC.plus+'Add a line</button>':'')+
        ((d.notes||[]).length?'<ul class="sl-ul" style="margin-top:12px">'+d.notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>':'')+'</section>'}).join('')||'<div class="sl-empty">No shoot days yet.</div>'}

  function checklist(kind,items,row,title,addLabel){const canTick=A.can.check!==false;
    return '<section class="sl-panel">'+(title?'<h2>'+title+'</h2>':'')+(items.length?items.map(it=>'<div class="sl-check'+(it.done?' done':'')+'"><button class="sl-cb" data-sl="check" data-k="'+kind+'" data-id="'+esc(it.id)+'" aria-pressed="'+!!it.done+'" aria-label="Tick"'+(canTick?'':' disabled')+'>'+IC.tick+'</button><div class="tx">'+row(it)+'</div>'+(A.can.edit?'<button class="sl-ed" data-sl="editem" data-k="'+kind+'" data-id="'+esc(it.id)+'">Edit</button>':'<span></span>')+'</div>').join(''):'<p class="sl-note">Nothing here yet.</p>')+
      (A.can.edit?'<button class="sl-add" data-sl="additem" data-k="'+kind+'"'+(addLabel&&addLabel.g?' data-g="'+esc(addLabel.g)+'"':'')+'>'+IC.plus+(addLabel&&addLabel.t||'Add')+'</button>':'')+'</section>'}
  function vLooks(){const l=L();return checklist('looks',l.looks||[],it=>'<b><span class="sl-look">'+esc(it.code)+'</span> '+esc(it.what)+'</b><small>'+esc([it.day,it.blocks&&('Block '+it.blocks)].filter(Boolean).join(' · '))+'</small>','<span>Wardrobe looks · tick when ready and photographed</span>',{t:'Add a look'})+notesHtml('looks')}
  function vProps(){const l=L();return checklist('props',l.props||[],it=>'<b>'+esc(it.name)+'</b>'+days().map(d=>{const v=(it.d||{})[d.id];return v?'<small>'+esc(dfmt(d.date,{day:'numeric',month:'short'}))+': '+esc(v)+'</small>':''}).join('')+(it.note?'<small>'+esc(it.note)+'</small>':''),'<span>Props · tick when packed</span>',{t:'Add a prop'})+notesHtml('props')}
  function vQs(){const l=L();const qs=l.questions||[];const groups=[...new Set(qs.map(q=>q.group||''))];if(!groups.length)groups.push('');
    return groups.map(g=>checklist('questions',qs.filter(q=>(q.group||'')===g),it=>esc(it.text)+(it.answer?'<small>'+esc(it.answer)+'</small>':''),'<span>'+esc(g||'Open questions')+'</span>',{t:'Add a question',g})).join('')}
  function notesHtml(tab){const ns=(L().notes||[]).filter(n=>(n.tab||'info')===tab);if(!ns.length&&!(A.can.edit&&tab==='info'))return '';
    return '<section class="sl-panel">'+(tab==='info'?'<h2><span>Notes</span></h2>':'')+ns.map(n=>'<details'+(tab!=='info'?' open':'')+'><summary>'+esc(n.title)+(A.can.edit?' <button class="sl-ed" data-sl="ednote" data-id="'+esc(n.id)+'">Edit</button>':'')+'</summary><div class="bd">'+esc(n.body)+'</div></details>').join('')+(A.can.edit&&tab==='info'?'<button class="sl-add" data-sl="addnote">'+IC.plus+'Add a notes section</button>':'')+'</section>'}
  function vInfo(){const l=L();
    return days().map(d=>'<section class="sl-panel"><h2><b>'+esc(dfmt(d.date,{weekday:'long',day:'numeric',month:'long'}))+'</b>'+(A.can.edit?'<button class="sl-ed" data-sl="edday" data-id="'+d.id+'">Edit</button>':'')+'</h2><dl class="sl-kv">'+
        (d.name||d.address?'<dt>Location</dt><dd>'+esc(d.name||'')+(d.address?(d.name?'<br>':'')+'<a target="_blank" rel="noopener" href="https://maps.apple.com/?q='+encodeURIComponent(d.address)+'">'+esc(d.address)+'</a>':'')+'</dd>':'')+
        (d.hours?'<dt>Hours</dt><dd>'+esc(d.hours)+'</dd>':'')+(d.parking?'<dt>Parking</dt><dd>'+esc(d.parking)+'</dd>':'')+(d.shooting?'<dt>Shooting</dt><dd>'+esc(d.shooting)+'</dd>':'')+'</dl>'+
        ((d.rules||[]).length?'<div class="sl-eyebrow" style="margin:16px 0 8px">House rules</div><ul class="sl-ul">'+d.rules.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul>':'')+'</section>').join('')+
      (A.can.edit?'<button class="sl-add" data-sl="addday">'+IC.plus+'Add a shoot day</button>':'')+
      ((l.scenes||[]).length?'<section class="sl-panel"><h2><span>Scenes · shot IDs are scene.shot</span></h2>'+l.scenes.map(s=>'<div class="sl-sc"><b>'+esc(s.n)+'</b><div><b>'+esc(s.title)+'</b>'+(s.at?' <span class="sl-note">· '+esc(s.at)+'</span>':'')+'<small>'+esc(s.what)+'</small></div></div>').join('')+'</section>':'')+
      notesHtml('info')+
      (A.mode==='link'?'<section class="sl-panel"><h2><span>Your name</span></h2><p class="sl-note" style="margin-bottom:8px">Shown next to the shots you tick and the notes you add.</p><input class="sl-in" id="sl-who" value="'+esc(A.who()||'')+'" placeholder="Your name" maxlength="40"></section>':'')+
      (A.can.edit?'<div class="sl-acts" style="margin-top:20px"><button class="sl-btn ghost small" data-sl="export">Download a copy (JSON)</button><button class="sl-btn danger small" data-sl="dellist">Delete this shot list</button></div>':'')}

  function draw(){if(!el||!A)return;const l=A.list();
    if(!l){el.innerHTML='<div class="sl"><div class="sl-bar">'+(A.mode==='link'?'':'<button class="sl-ib" data-sl="close" aria-label="Back">'+IC.back+'</button>')+'</div><div class="sl-empty">'+esc(A.missing||'This shot list has gone.')+'</div></div><div id="sl-over" class="sl sl-ov"></div>';return}
    if(ST.day==null||(ST.day!=='all'&&!days().some(d=>d.id===ST.day)))ST.day=defaultDay();
    if(ST.block&&!blocks().some(b=>b.id===ST.block&&(ST.day==='all'||b.dayId===ST.day)))ST.block='';
    const body=ST.tab==='shots'?vShots():ST.tab==='order'?vOrder():ST.tab==='looks'?vLooks():ST.tab==='props'?vProps():ST.tab==='qs'?vQs():vInfo();
    let main=el.querySelector('.sl:not(.sl-ov)');if(!main){el.innerHTML='<div class="sl"></div><div id="sl-over" class="sl sl-ov"></div><div id="sl-toast" class="sl sl-ov"></div>';main=el.querySelector('.sl:not(.sl-ov)')}
    const who=main.querySelector('#sl-who');if(who&&document.activeElement===who)return;
    main.innerHTML=head()+'<div class="sl-view">'+body+'</div>'}

  /* ---------- sheets over the page ---------- */
  function over(){return el&&el.querySelector('#sl-over')}
  function busyTyping(){const o=over();const a=document.activeElement;return !!(o&&a&&o.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))}
  function drawSheet(force){const o=over();if(!o)return;const s=ST.sheet;if(!s){o.innerHTML='';return}
    if(!force&&busyTyping())return;
    if(s.type==='img'){o.innerHTML='<button class="sl-full" data-sl="closeimg"><img src="'+esc(s.src)+'" alt=""><span>'+esc(s.cap||'')+' · tap to close</span></button>';return}
    const keep=o.querySelector('.sl-sheet');const top=keep?keep.scrollTop:0;const draft=keep&&keep.querySelector('#sl-newnote')?keep.querySelector('#sl-newnote').value:'';
    o.innerHTML='<div class="sl-scrim" data-sl="scrim"><div class="sl-sheet" role="dialog" aria-modal="true">'+(s.type==='shot'?shotSheet(s):s.type==='form'?formSheet(s):s.type==='share'?shareSheet():s.type==='name'?nameSheet():'')+'</div></div>';
    const sh=o.querySelector('.sl-sheet');if(sh&&keep)sh.scrollTop=top;
    if(draft&&!force){const t=o.querySelector('#sl-newnote');if(t)t.value=draft}
    if(s.type==='name'){const i=o.querySelector('#sl-name');if(i)i.focus()}}
  function closeSheet(){ST.sheet=null;drawSheet(true)}

  function shotSheet(sh){const s=shot(sh.id);if(!s)return '<p class="sl-empty">This shot has been removed.</p><button class="sl-btn ghost" data-sl="closesheet">Close</button>';
    const b=blockOf(s)||{};const d=days().find(x=>x.id===b.dayId)||{};const src=srcOf(s);const g=s.grab||{};const ns=notesOf(s.id);const me=A.who();
    const full=ST.imgs[s.flag==='match'&&src?src.id:s.id];
    const grabView=(o,owner)=>{const og=o.grab||{};const img=ST.imgs[o.id]||og.thumb;return img?'<button class="sl-photo" data-sl="zoom" data-id="'+esc(o.id)+'"><img src="'+esc(img)+'" alt="Monitor grab for '+esc(o.label)+'"></button>':'<div class="sl-photo">'+(owner?'No grab yet':'The grab for '+esc(o.label)+' has not been taken yet')+'</div>'};
    return '<div class="hd"><span class="sl-id" style="font-size:20px">'+esc(s.label)+'</span>'+(s.pri?'<span class="sl-pri '+esc(s.pri)+'">'+esc(s.pri)+'</span>':'')+(s.flag==='grab'?'<span class="sl-flag grab">GRAB</span>':s.flag==='match'?'<span class="sl-flag match">MATCH'+(src?' '+esc(src.label):'')+'</span>':'')+(s.look?'<span class="sl-look">'+esc(s.look)+'</span>':'')+'<span class="sp"></span>'+(A.can.edit?'<button class="sl-ed" data-sl="edshot" data-id="'+esc(s.id)+'">Edit</button>':'')+'<button class="sl-ib" data-sl="closesheet" aria-label="Close">'+IC.x+'</button></div>'+
      '<div><div class="sl-eyebrow">'+esc([d.date&&dfmt(d.date,{weekday:'short',day:'numeric',month:'short'}),b.code&&('Block '+b.code),(b.looks||[]).join('/')].filter(Boolean).join(' · '))+'</div><h2 style="margin-top:4px">'+esc(s.action)+'</h2>'+(s.notes?'<p class="sl-note" style="font-size:14px;margin-top:6px">'+esc(s.notes)+'</p>':'')+'</div>'+
      (cam(s.a)||cam(s.b)?'<dl class="sl-kv">'+(cam(s.a)?'<dt>A cam'+(L().cams&&L().cams.a?' · '+esc(L().cams.a):'')+'</dt><dd>'+esc(cam(s.a))+'</dd>':'')+(cam(s.b)?'<dt>B cam'+(L().cams&&L().cams.b?' · '+esc(L().cams.b):'')+'</dt><dd>'+esc(cam(s.b))+'</dd>':'')+'</dl>':'')+
      '<button class="sl-btn wide '+(s.done?'ghost':'ok')+'" data-sl="tick" data-id="'+esc(s.id)+'">'+(s.done?'Done'+(s.done.at?' at '+esc(when(s.done.at)):'')+(s.done.by?' by '+esc(s.done.by):'')+' · tap to untick':IC.tick+'Mark as done')+'</button>'+
      (s.flag==='grab'?'<div class="sl-sec"><div class="sl-eyebrow"><span>Monitor grab</span>'+(g.at?'<span style="letter-spacing:0;text-transform:none;font-weight:300;color:var(--muted)">'+esc(when(g.at))+(g.by?' · '+esc(g.by):'')+'</span>':'')+'</div>'+grabView(s,true)+
        '<div class="sl-acts"><label class="sl-btn ghost small sl-file">'+IC.cam+(g.thumb?'Replace the photo':'Take or choose a photo')+'<input type="file" accept="image/*" data-slf="grab" data-id="'+esc(s.id)+'"></label></div>'+
        '<div class="sl-g2">'+[['focal','Focal length','50mm'],['stop','Stop','T2.8'],['focus','Focus distance','3.2 m'],['height','Camera height','1.4 m']].map(([k,t,ph])=>'<label class="sl-f">'+t+'<input type="text" data-slg="'+k+'" data-id="'+esc(s.id)+'" value="'+esc(g[k]||'')+'" placeholder="'+ph+'" autocomplete="off"></label>').join('')+'</div>'+
        '<label class="sl-f">Anything else to match (tilt, angle, distance to the glass, tape marks)<textarea data-slg="other" data-id="'+esc(s.id)+'" rows="2">'+esc(g.other||'')+'</textarea></label>'+
        (twinsOf(s).length?'<div><div class="sl-eyebrow" style="margin-bottom:8px">Twin shots that match this frame</div><div class="sl-twins">'+twinsOf(s).map(t=>'<button class="sl-twin'+(t.done?' done':'')+'" data-sl="open" data-id="'+esc(t.id)+'">'+(t.done?IC.tick:'')+esc(t.label)+'</button>').join('')+'</div></div>':'')+'</div>':'')+
      (s.flag==='match'?'<div class="sl-sec"><div class="sl-eyebrow"><span>Line up against '+(src?esc(src.label):'its grab')+'</span></div>'+(src?grabView(src,false)+(logLine(src.grab)?'<dl class="sl-kv">'+[['focal','Focal length'],['stop','Stop'],['focus','Focus distance'],['height','Camera height'],['other','Also']].filter(([k])=>(src.grab||{})[k]).map(([k,t])=>'<dt>'+t+'</dt><dd>'+esc(src.grab[k])+'</dd>').join('')+'</dl>':'<p class="sl-note">No lens or height logged against '+esc(src.label)+' yet.</p>')+'<div class="sl-acts"><button class="sl-btn ghost small" data-sl="open" data-id="'+esc(src.id)+'">Open '+esc(src.label)+'</button></div>':'<p class="sl-note">Not linked to a grab shot yet.'+(A.can.edit?' Use Edit to choose which shot it matches.':'')+'</p>')+'</div>':'')+
      '<div class="sl-sec"><div class="sl-eyebrow"><span>Notes from set</span></div>'+ns.map(n=>'<div class="sl-n"><small><span>'+esc(n.by||'Crew')+' · '+esc(when(n.at))+'</span>'+(A.can.edit||(n.by&&n.by===me)?'<button class="sl-ed" data-sl="delnote" data-id="'+esc(n.id)+'">Remove</button>':'')+'</small><p>'+esc(n.text)+'</p></div>').join('')+
        '<textarea class="sl-in" id="sl-newnote" rows="2" placeholder="Add a note: take numbers, problems, what to pick up"></textarea><div class="sl-acts"><button class="sl-btn small" data-sl="addsnote" data-id="'+esc(s.id)+'">Add note</button></div></div>'}

  /* a small form: fields are [{k,label,type:'text'|'area'|'select'|'date'|'time',opts,ph}] */
  function formSheet(f){return '<div class="hd"><h2>'+esc(f.title)+'</h2><span class="sp"></span><button class="sl-ib" data-sl="closesheet" aria-label="Close">'+IC.x+'</button></div>'+
    f.fields.map(x=>{if(x.row)return '<div class="'+(x.row.length===3?'sl-g3':'sl-g2')+'">'+x.row.map(field).join('')+'</div>';return field(x)}).join('')+
    '<div class="sl-acts">'+(f.del?'<button class="sl-btn danger small" data-sl="formdel">'+esc(f.delLabel||'Delete')+'</button>':'')+'<span class="sp"></span><button class="sl-btn ghost" data-sl="closesheet">Cancel</button><button class="sl-btn" data-sl="formsave">Save</button></div>';
    function field(x){const v=f.val[x.k]==null?'':f.val[x.k];
      if(x.type==='select')return '<label class="sl-f">'+esc(x.label)+'<select data-f="'+x.k+'">'+x.opts.map(o=>{const [ov,ot]=Array.isArray(o)?o:[o,o];return '<option value="'+esc(ov)+'"'+(String(ov)===String(v)?' selected':'')+'>'+esc(ot)+'</option>'}).join('')+'</select></label>';
      if(x.type==='area')return '<label class="sl-f">'+esc(x.label)+'<textarea data-f="'+x.k+'" rows="'+(x.rows||3)+'" placeholder="'+esc(x.ph||'')+'">'+esc(v)+'</textarea></label>';
      return '<label class="sl-f">'+esc(x.label)+'<input type="'+(x.type||'text')+'" data-f="'+x.k+'" value="'+esc(v)+'" placeholder="'+esc(x.ph||'')+'" autocomplete="off"></label>'}}
  function form(o){ST.sheet={type:'form',...o};drawSheet(true)}
  function formVals(){const v={};over().querySelectorAll('[data-f]').forEach(i=>{v[i.dataset.f]=i.value.trim()});return v}

  function shareSheet(){const l=L();const sh=l.share||{};const url=sh.key?A.shareUrl(l):'';
    return '<div class="hd"><h2>Share with crew</h2><span class="sp"></span><button class="sl-ib" data-sl="closesheet" aria-label="Close">'+IC.x+'</button></div>'+
      (sh.on&&url?'<p class="sl-note" style="font-size:14px">Anyone with this link can see the shot list, tick shots, log grabs and add notes. It updates live for everyone. They cannot change the list itself. Only send it to people working the shoot.</p><div class="sl-linkbox">'+esc(url)+'</div><div class="sl-acts"><button class="sl-btn" data-sl="copylink">Copy link</button><button class="sl-btn ghost" data-sl="shareoff">Switch the link off</button></div><p class="sl-note">Switching it off stops the link working straight away. Switching it on again makes a new link; the old one stays dead.</p>'
        :'<p class="sl-note" style="font-size:14px">Make a private link for the crew. Anyone with it can see the shot list, tick shots, log grabs and add notes, live. They cannot change the list itself.</p><div class="sl-acts"><button class="sl-btn" data-sl="shareon">Make the link</button></div>')}
  function nameSheet(){return '<div class="hd"><h2>Who is ticking?</h2></div><p class="sl-note" style="font-size:14px">Your name goes next to the shots you tick and the notes you add, so everyone on the link knows who did what.</p><input class="sl-in" id="sl-name" placeholder="Your name" maxlength="40" autocomplete="name"><div class="sl-acts"><span class="sp"></span><button class="sl-btn ghost" data-sl="closesheet">Cancel</button><button class="sl-btn" data-sl="savename">Carry on</button></div>'}
  function withName(fn){if(A.who())return fn();ST.sheet={type:'name',then:fn,back:ST.sheet};drawSheet(true)}

  function toast(msg,undo){const t=el&&el.querySelector('#sl-toast');if(!t)return;t.innerHTML='<div class="sl-toast" role="status"><span>'+esc(msg)+'</span>'+(undo?'<button data-sl="undo">Undo</button>':'')+'</div>';clearTimeout(toastT);toastT=setTimeout(()=>{t.innerHTML=''},undo?5000:2600)}

  /* ---------- grabs: the photo is shrunk on the device; a small copy travels with the shot, the full one is stored on its own ---------- */
  function shrink(file,max,q){return new Promise((ok,no)=>{const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);ok(c.toDataURL('image/jpeg',q))};im.onerror=()=>{URL.revokeObjectURL(url);no(new Error('That file is not a photo this device can read.'))};im.src=url})}
  const idb=()=>new Promise((ok,no)=>{try{const r=indexedDB.open('qm-shots',1);r.onupgradeneeded=()=>r.result.createObjectStore('grabs');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}});
  const idbDo=(mode,fn)=>idb().then(db=>new Promise((ok,no)=>{const tx=db.transaction('grabs',mode);const rq=fn(tx.objectStore('grabs'));tx.oncomplete=()=>ok(rq&&rq.result);tx.onerror=()=>no(tx.error)})).catch(()=>null);
  const pendKey='qm-shots-pending';
  const pending=()=>{try{return JSON.parse(localStorage.getItem(pendKey)||'[]')}catch(e){return []}};
  const setPending=a=>{try{localStorage.setItem(pendKey,JSON.stringify(a))}catch(e){}};
  async function sendGrab(id,img){try{await A.saveGrab(id,img);setPending(pending().filter(x=>x!==id));return true}catch(e){if(!pending().includes(id))setPending(pending().concat(id));return false}}
  async function flushGrabs(){for(const id of pending()){if(!shot(id)){setPending(pending().filter(x=>x!==id));continue}const img=await idbDo('readonly',s=>s.get(id));if(img)await sendGrab(id,img);else setPending(pending().filter(x=>x!==id))}}
  async function addGrab(id,file){const s=shot(id);if(!s)return;toast('Saving the grab…');
    let full,thumb;try{full=await shrink(file,1920,.82);if(full.length>1300000)full=await shrink(file,1600,.7);thumb=await shrink(file,480,.6)}catch(e){toast(e.message);return}
    ST.imgs[id]=full;await idbDo('readwrite',st=>st.put(full,id));
    A.patchShot(id,{grab:{...(s.grab||{}),thumb,img:Date.now(),at:Date.now(),by:A.who()||''}});
    const ok=await sendGrab(id,full);toast(ok?'Grab saved':'Grab saved on this device. The full-size photo uploads when you are back online.');refresh()}
  async function loadFull(id){if(ST.imgs[id])return ST.imgs[id];let img=await idbDo('readonly',s=>s.get(id));const s=shot(id);const stamp=s&&s.grab&&s.grab.img;
    const key='qm-shots-g'+id;let seen=0;try{seen=+localStorage.getItem(key)||0}catch(e){}
    if(!img||(stamp&&stamp!==seen&&!pending().includes(id))){try{const got=await A.loadGrab(id);if(got){img=got;await idbDo('readwrite',st=>st.put(got,id));try{localStorage.setItem(key,stamp||1)}catch(e){}}}catch(e){}}
    if(img)ST.imgs[id]=img;return img||null}
  function wantFull(){const s=ST.sheet;if(!s||s.type!=='shot')return;const o=shot(s.id);if(!o)return;const t=o.flag==='match'?srcOf(o):o.flag==='grab'?o:null;if(!t||!(t.grab&&t.grab.img)||ST.imgs[t.id])return;
    loadFull(t.id).then(img=>{if(img&&ST.sheet===s)drawSheet()})}

  /* ---------- editing (Studio only) ---------- */
  const camF=(p,t)=>({row:[{k:p+'.setup',label:t+' set-up',ph:'Tripod, Handheld, Gimbal'},{k:p+'.lens',label:t+' lens',ph:'50mm'},{k:p+'.note',label:t+' detail',ph:'low, high frame rate'}]});
  function editShot(id,blockId){const s=id?shot(id):{blockId,pri:'P1',a:{},b:{},flag:''};if(!s)return;const l=L();const grabs=allShots().filter(x=>x.flag==='grab'&&x.id!==id);
    const val={label:s.label||'',ids:(s.ids||[]).join(', '),pri:s.pri||'',blockId:s.blockId,look:s.look||'',action:s.action||'',notes:s.notes||'',flag:s.flag||'',matchOf:s.matchOf||'',n:s.n==null?'':s.n,
      'a.setup':(s.a||{}).setup||'','a.lens':(s.a||{}).lens||'','a.note':(s.a||{}).note||'','b.setup':(s.b||{}).setup||'','b.lens':(s.b||{}).lens||'','b.note':(s.b||{}).note||''};
    form({title:id?'Edit shot '+s.label:'New shot',val,del:id?()=>{A.removeShot(id);toast('Shot removed',true)}:null,delLabel:'Delete shot',
      fields:[{row:[{k:'label',label:'Shot ID',ph:'2.1'},{k:'pri',label:'Priority',type:'select',opts:[['P1','P1 · edit breaks without it'],['P2','P2 · important'],['P3','P3 · if time'],['','None']]}]},
        {k:'action',label:'Shot and action',type:'area',rows:2},camF('a','A cam'),camF('b','B cam'),{k:'notes',label:'Notes',type:'area',rows:2},
        {row:[{k:'flag',label:'Matched frame',type:'select',opts:[['','No'],['grab','GRAB · take a grab'],['match','MATCH · line up to a grab']]},{k:'matchOf',label:'Matches which grab',type:'select',opts:[['','None']].concat(grabs.map(g=>[g.id,g.label+' · '+(g.action||'').slice(0,40)]))}]},
        {row:[{k:'blockId',label:'Block',type:'select',opts:blocks().map(b=>{const d=days().find(x=>x.id===b.dayId)||{};return [b.id,dfmt(d.date,{day:'numeric',month:'short'})+' · '+b.code+' · '+b.title]})},{k:'look',label:'Look (if not the block’s)',ph:'G4'}]},
        {row:[{k:'ids',label:'Scene.shot IDs it covers',ph:'3.5, 3.6'},{k:'n',label:'Position in block',type:'number',ph:'1, 2, 3'}]}],
      save:v=>{if(!v.label){toast('Give the shot an ID first.');return false}
        const inBlock=A.shots().filter(x=>x.blockId===v.blockId&&x.id!==id);const n=v.n!==''?+v.n:(id&&s.blockId===v.blockId?s.n:inBlock.reduce((m,x)=>Math.max(m,x.n||0),0)+1);
        const d={label:v.label,ids:v.ids?v.ids.split(/\s*,\s*/).filter(Boolean):[v.label],pri:v.pri,blockId:v.blockId,look:v.look,action:v.action,notes:v.notes,flag:v.flag,matchOf:v.flag==='match'?v.matchOf:'',n,
          a:{setup:v['a.setup'],lens:v['a.lens'],note:v['a.note']},b:{setup:v['b.setup'],lens:v['b.lens'],note:v['b.note']}};
        if(id){A.patchShot(id,d);ST.sheet={type:'shot',id};drawSheet(true);return false}A.addShot(d)}})}
  function saveItem(kind,item){const arr=(L()[kind]||[]).slice();const i=arr.findIndex(x=>x.id===item.id);if(i<0)arr.push(item);else arr[i]={...arr[i],...item};A.patchList({[kind]:arr})}
  function delItem(kind,id){A.patchList({[kind]:(L()[kind]||[]).filter(x=>x.id!==id)});toast('Removed',true)}
  function editDay(id){const d=id?days().find(x=>x.id===id):{};form({title:id?'Edit shoot day':'New shoot day',val:{...d,rules:(d.rules||[]).join('\n'),notes:(d.notes||[]).join('\n')},
    del:id?()=>{if(blocks().some(b=>b.dayId===id)){toast('Move or delete this day’s blocks first.');return false}delItem('days',id)}:null,delLabel:'Delete day',
    fields:[{row:[{k:'date',label:'Date',type:'date'},{k:'name',label:'Location name',ph:'Rivoli Ballroom'}]},{k:'address',label:'Address'},{k:'hours',label:'Hours',ph:'10:00 to 19:00'},{k:'parking',label:'Parking',type:'area',rows:2},{k:'shooting',label:'What we are shooting',type:'area',rows:2},{k:'rules',label:'House rules (one per line)',type:'area',rows:5},{k:'notes',label:'Running order notes (one per line)',type:'area',rows:4}],
    save:v=>{if(!v.date){toast('Add the date first.');return false}saveItem('days',{...v,id:id||'d'+rid(),rules:lines(v.rules),notes:lines(v.notes)});const arr=(L().days||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));A.patchList({days:arr})}})}
  function editBlock(id,dayId){const b=id?blocks().find(x=>x.id===id):{dayId};form({title:id?'Edit block '+b.code:'New block',val:{...b,looks:(b.looks||[]).join(', ')},
    del:id?()=>{if(A.shots().some(s=>s.blockId===id)){toast('Move or delete this block’s shots first.');return false}delItem('blocks',id)}:null,delLabel:'Delete block',
    fields:[{row:[{k:'code',label:'Block letter',ph:'A'},{k:'looks',label:'Look codes',ph:'Y1, S2'}]},{k:'title',label:'What it is',ph:'Young Kele on stage and the meeting'},{row:[{k:'dayId',label:'Day',type:'select',opts:days().map(d=>[d.id,dfmt(d.date)])},{k:'where',label:'Where (if not the day’s location)',ph:'Green screen'}]},{k:'note',label:'Note for the block',type:'area',rows:3}],
    save:v=>{if(!v.code){toast('Give the block a letter first.');return false}saveItem('blocks',{...v,id:id||'b'+rid(),looks:v.looks?v.looks.split(/\s*[,/]\s*/).filter(Boolean):[]})}})}
  function editRun(id,dayId){const r=id?(L().running||[]).find(x=>x.id===id):{dayId};form({title:id?'Edit running order line':'New running order line',val:r,del:id?()=>delItem('running',id):null,
    fields:[{row:[{k:'time',label:'Time',type:'time'},{k:'block',label:'Block or what',ph:'B, Lunch, Wrap'},{k:'look',label:'Look',ph:'Y1'}]},{k:'what',label:'What happens',type:'area',rows:2},{k:'dayId',label:'Day',type:'select',opts:days().map(d=>[d.id,dfmt(d.date)])}],
    save:v=>{saveItem('running',{...v,id:id||'r'+rid()})}})}
  function editItem(kind,id,group){const it=id?(L()[kind]||[]).find(x=>x.id===id):{group:group||''};const pre=kind==='looks'?'k':kind==='props'?'p':'q';
    const fields=kind==='looks'?[{row:[{k:'code',label:'Look code',ph:'Y1'},{k:'day',label:'Day',ph:'24th'},{k:'blocks',label:'Blocks',ph:'B, C'}]},{k:'what',label:'What it is',type:'area',rows:2}]
      :kind==='props'?[{k:'name',label:'Prop'}].concat(days().map(d=>({k:'d.'+d.id,label:'Needed '+dfmt(d.date,{day:'numeric',month:'short'}),ph:'Yes, or what it is for. Leave empty if not needed.'})),[{k:'note',label:'Note'}])
      :[{k:'text',label:'Question',type:'area',rows:2},{k:'answer',label:'Answer',type:'area',rows:2},{k:'group',label:'Group',ph:'Decide before the 27th'}];
    const val={...it};if(kind==='props')days().forEach(d=>{val['d.'+d.id]=(it.d||{})[d.id]||''});
    form({title:(id?'Edit ':'New ')+(kind==='looks'?'look':kind==='props'?'prop':'question'),val,del:id?()=>delItem(kind,id):null,fields,
      save:v=>{const o={...v,id:id||pre+rid()};if(kind==='props'){o.d={};days().forEach(d=>{if(v['d.'+d.id])o.d[d.id]=v['d.'+d.id];delete o['d.'+d.id]})}saveItem(kind,o)}})}
  function editNote(id){const n=id?(L().notes||[]).find(x=>x.id===id):{tab:'info'};form({title:id?'Edit notes':'New notes section',val:n,del:id?()=>delItem('notes',id):null,
    fields:[{k:'title',label:'Heading'},{k:'body',label:'Notes',type:'area',rows:8},{k:'tab',label:'Show on',type:'select',opts:[['info','Info'],['looks','Looks'],['props','Props']]}],save:v=>{saveItem('notes',{...v,id:id||'n'+rid()})}})}
  function editList(){const l=L();form({title:'Shot list details',val:{title:l.title||'',sub:l.sub||'',ca:(l.cams||{}).a||'',cb:(l.cams||{}).b||''},
    fields:[{k:'title',label:'Title'},{k:'sub',label:'Subtitle',ph:'Music video'},{row:[{k:'ca',label:'A cam',ph:'FX6'},{k:'cb',label:'B cam',ph:'A7S III'}]}],save:v=>{A.patchList({title:v.title||'Shot list',sub:v.sub,cams:{a:v.ca,b:v.cb}})}})}

  /* ---------- actions ---------- */
  function tick(id){const s=shot(id);if(!s)return;withName(()=>{const done=s.done?null:{at:Date.now(),by:A.who()||''};A.patchShot(id,{done});if(navigator.vibrate){try{navigator.vibrate(done?14:5)}catch(e){}}
    const st=stats(A.shots().map(x=>x.id===id?{...x,done}:x));toast(done?s.label+' done · '+(st.p1left?st.p1left+' P1 left':'all P1 shots done'):s.label+' unticked',true);drawSheet()})}
  function onClick(ev){const b=ev.target.closest('[data-sl]');if(!b||!el.contains(b))return;const a=b.dataset.sl,id=b.dataset.id,v=b.dataset.v;
    if(a==='scrim'){if(ev.target===b){if(ST.sheet&&ST.sheet.type==='form'&&busyTyping())return;closeSheet()}return}
    switch(a){
      case 'close':A.close&&A.close();break;
      case 'undo':if(A.canUndo()){A.undo();const t=el.querySelector('#sl-toast');if(t)t.innerHTML=''}break;
      case 'tab':ST.tab=v;draw();el.scrollTop=0;if(el.id!=='shotsRoot')window.scrollTo(0,0);break;
      case 'day':ST.day=v;ST.block='';draw();break;
      case 'block':ST.block=v;draw();break;
      case 'pri':ST.pri=v;draw();break;
      case 'left':ST.left=!ST.left;draw();break;
      case 'p1left':ST.tab='shots';ST.day='all';ST.block='';ST.pri='P1';ST.left=true;draw();break;
      case 'goblock':if(id){const bl=blocks().find(x=>x.id===id);ST.tab='shots';ST.day=bl.dayId;ST.block=id;ST.pri='';ST.left=false;draw();window.scrollTo(0,0);el.scrollTop=0}break;
      case 'tick':tick(id);break;
      case 'open':ST.sheet={type:'shot',id};drawSheet(true);wantFull();break;
      case 'closesheet':{const s=ST.sheet;ST.sheet=s&&s.type==='name'?s.back:null;drawSheet(true);break}
      case 'zoom':{const s=shot(id);const src=ST.imgs[id]||(s.grab||{}).thumb;if(src){ST.sheet={type:'img',src,cap:s.label+(logLine(s.grab)?' · '+logLine(s.grab):''),back:ST.sheet};drawSheet(true)}break}
      case 'closeimg':ST.sheet=ST.sheet.back||null;drawSheet(true);break;
      case 'savename':{const n=(over().querySelector('#sl-name').value||'').trim().slice(0,40);if(!n)break;A.setWho(n);const s=ST.sheet;ST.sheet=s.back||null;drawSheet(true);s.then&&s.then();break}
      case 'addsnote':{const t=over().querySelector('#sl-newnote');const text=(t.value||'').trim();if(!text)break;withName(()=>{A.addNote({shotId:id,text:text.slice(0,2000)});t.value='';t.blur();drawSheet(true);draw()});break}
      case 'delnote':A.removeNote(id);toast('Note removed',true);drawSheet(true);draw();break;
      case 'check':{const k=b.dataset.k;const it=(L()[k]||[]).find(x=>x.id===id);if(!it||b.disabled)break;withName(()=>{A.checkItem(k,id,!it.done)});break}
      case 'formsave':{const f=ST.sheet;const r=f.save(formVals());if(r!==false){closeSheet()}break}
      case 'formdel':{const f=ST.sheet;if(!confirm('Delete this? Undo brings it back.'))break;const r=f.del();if(r!==false)closeSheet();break}
      case 'edshot':editShot(id);break;case 'addshot':editShot(null,id);break;
      case 'edblock':editBlock(id);break;case 'addblock':editBlock(null,id);break;
      case 'edday':editDay(id);break;case 'addday':editDay();break;
      case 'edrun':editRun(id);break;case 'addrun':editRun(null,id);break;
      case 'editem':editItem(b.dataset.k,id);break;case 'additem':editItem(b.dataset.k,null,b.dataset.g);break;
      case 'ednote':ev.preventDefault();editNote(id);break;case 'addnote':editNote();break;
      case 'edlist':editList();break;
      case 'share':ST.sheet={type:'share'};drawSheet(true);break;
      case 'shareon':A.patchList({share:{key:A.newKey(),on:true}});drawSheet(true);break;
      case 'shareoff':A.patchList({share:{on:false}});drawSheet(true);toast('The link is off');break;
      case 'copylink':{const url=A.shareUrl(L());(navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Link copied')).catch(()=>toast('Press and hold the link to copy it'));break}
      case 'export':{const blob=new Blob([JSON.stringify(toSeed(),null,1)],{type:'application/json'});const u=URL.createObjectURL(blob);const x=document.createElement('a');x.href=u;x.download=(L().title||'shot-list').replace(/[^\w]+/g,'-').toLowerCase()+'.json';x.click();setTimeout(()=>URL.revokeObjectURL(u),2000);break}
      case 'dellist':if(confirm('Delete this whole shot list, its ticks, grabs and notes? Undo brings it back for a few minutes only.'))A.removeList&&A.removeList();break;
    }}
  function onChange(ev){const t=ev.target;if(!el.contains(t))return;
    if(t.dataset.slf==='grab'&&t.files&&t.files[0]){const f=t.files[0];const id=t.dataset.id;withName(()=>addGrab(id,f));return}
    if(t.dataset.slg){const s=shot(t.dataset.id);if(!s)return;const k=t.dataset.slg;const v=t.value.trim().slice(0,300);if(((s.grab||{})[k]||'')===v)return;withName(()=>{A.patchShot(s.id,{grab:{...(shot(s.id).grab||{}),[k]:v,at:Date.now(),by:A.who()||''}})});return}
    if(t.id==='sl-who'){A.setWho(t.value.trim().slice(0,40));toast('Name saved')}}
  function onKey(ev){if(ev.key==='Escape'&&ST.sheet){ev.stopPropagation();if(ST.sheet.type==='img'){ST.sheet=ST.sheet.back||null;drawSheet(true)}else closeSheet()}}

  /* ---------- import and export ---------- */
  /* An import file holds the list and its shots. Shots name their block by id and their grab by `matchKey`; every shot gets a new id here. */
  function fromSeed(seed,lid){if(!seed||seed.qmShotList!==1||!seed.list||!Array.isArray(seed.shots))throw new Error('That file is not a Quiet Media shot list.');
    const list=JSON.parse(JSON.stringify(seed.list));delete list.share;delete list.projectId;const map={};const cnt={};
    const shots=seed.shots.map((s,i)=>{const id=lid+'-'+(i+1).toString(36)+rid().slice(-4);if(s.key)map[s.key]=id;const d=JSON.parse(JSON.stringify(s));delete d.key;delete d.id;cnt[d.blockId]=(cnt[d.blockId]||0)+1;if(d.n==null)d.n=cnt[d.blockId];if(!seed.keepProgress){delete d.done;delete d.grab}return {id,data:{...d,listId:lid}}});
    shots.forEach(s=>{if(s.data.matchKey){s.data.matchOf=map[s.data.matchKey]||'';delete s.data.matchKey}});
    return {list,shots}}
  function toSeed(){const l=JSON.parse(JSON.stringify(L()));delete l.id;delete l._u;delete l.share;delete l.projectId;
    return {qmShotList:1,exported:new Date().toISOString(),list:l,shots:allShots().map(s=>{const d=JSON.parse(JSON.stringify(s));const key=d.id;delete d.id;delete d._u;delete d.listId;delete d.done;delete d.grab;if(d.matchOf){d.matchKey=d.matchOf}delete d.matchOf;return {...d,key}})}}
  function blank(title){return {title:title||'Shot list',sub:'',cams:{a:'FX6',b:'A7S III'},days:[],blocks:[],running:[],looks:[],props:[],questions:[],scenes:[],notes:[],created:Date.now()}}

  /* ---------- lifecycle ---------- */
  function mount(root_,adapter){unmount();A=adapter;el=root_;ST=fresh();
    if(!document.getElementById('sl-css')){const st=document.createElement('style');st.id='sl-css';st.textContent=CSS;document.head.appendChild(st)}
    el.addEventListener('click',onClick);el.addEventListener('change',onChange);document.addEventListener('keydown',onKey,true);
    el.innerHTML='';draw();flushGrabs();T=setInterval(flushGrabs,45000)}
  function refresh(){if(!el||!A)return;draw();clearTimeout(refresh.t);refresh.t=setTimeout(()=>{if(el&&A){drawSheet();wantFull()}},60);const n=el.querySelector('#sl-net');if(n&&A.net){n.textContent=netLabel();n.className='sl-net'+(A.net()==='ok'?'':' off')}}
  function unmount(){if(el){el.removeEventListener('click',onClick);el.removeEventListener('change',onChange);el.innerHTML=''}document.removeEventListener('keydown',onKey,true);clearInterval(T);A=null;el=null}
  root.QMShots={mount,refresh,unmount,fromSeed,blank,stats,toast:(m,u)=>toast(m,u),open:()=>!!el};
})(typeof window!=='undefined'?window:globalThis);
