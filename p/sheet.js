/* Quiet Media call sheet renderer. Used by the app (live preview) and by p/index.html (the page crew open).
   QMSheet.render(data) → HTML. QMSheet.mount(root,data) → reveal animations, countdown, live schedule marker, weather. */
(function(root){
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines=s=>String(s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const fmtD=(ms,o)=>new Date(ms).toLocaleDateString('en-GB',o);
  const tel=p=>'tel:'+String(p||'').replace(/[^+\d]/g,'');
  const amaps=q=>'https://maps.apple.com/?q='+encodeURIComponent(q);
  const gmaps=q=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
  const embed=q=>'https://maps.google.com/maps?q='+encodeURIComponent(q)+'&z=14&output=embed';
  const isIOS=()=>/(iPhone|iPad|Mac)/.test(navigator.userAgent);
  const waNum=p=>{let n=String(p||'').replace(/[^\d+]/g,'');if(n.startsWith('+'))n=n.slice(1);else if(n.startsWith('00'))n=n.slice(2);else if(n.startsWith('0'))n='44'+n.slice(1);return n};
  const wa=(p,body)=>'https://wa.me/'+waNum(p)+'?text='+encodeURIComponent(body);
  const initials=n=>String(n||'').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  const CSS=`
.cs{--cs-line:rgba(128,128,128,.22);--cs-muted:#8E8A84;--cs-soft:rgba(128,128,128,.1);--cs-accent:currentColor;--cs-ease:cubic-bezier(.16,1,.3,1);font-variant-numeric:tabular-nums;line-height:1.45;position:relative}
.cs *{box-sizing:border-box}
.cs a{color:inherit}
.cs h1,.cs h2,.cs h3,.cs p,.cs ul,.cs dl{margin:0}
.cs .rv{opacity:0;transform:translateY(16px);transition:opacity .7s var(--cs-ease),transform .7s var(--cs-ease)}
.cs .rv.in,.cs.static .rv{opacity:1;transform:none}
.cs .cs-hero{border-radius:24px;padding:22px 22px 20px;background:var(--cs-soft);position:relative;overflow:hidden}
.cs .cs-hero::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--cs-accent);opacity:.9}
.cs .cs-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:22px}
.cs .cs-brand{display:flex;align-items:center;gap:9px;font-size:17px;font-weight:300;letter-spacing:-.2px}
.cs .cs-brand svg{width:24px;height:24px}
.cs .cs-kind{text-align:right;font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--cs-muted)}
.cs .cs-kind b{display:block;font-size:13px;font-weight:400;letter-spacing:0;text-transform:none;color:inherit;margin-top:3px}
.cs h1{font-size:clamp(30px,6vw,46px);font-weight:300;letter-spacing:-.9px;line-height:1.02;text-wrap:balance}
.cs .cs-lead{color:var(--cs-muted);margin-top:8px;font-size:15px}
.cs .cs-count{display:inline-flex;align-items:center;gap:8px;margin-top:18px;padding:8px 14px;border-radius:999px;background:currentColor;font-size:13px;font-weight:500}
.cs .cs-count span{color:var(--cs-inv,#0A0A0A)}
.cs .cs-count i{width:7px;height:7px;border-radius:50%;background:var(--cs-inv,#0A0A0A);opacity:.9;animation:cs-pulse 1.8s ease-in-out infinite}
@keyframes cs-pulse{50%{opacity:.25}}
.cs .cs-day{margin-top:18px}
.cs .cs-dayhead{display:flex;align-items:baseline;gap:10px;margin:10px 0 12px}
.cs .cs-dayhead b{font-size:22px;font-weight:400;letter-spacing:-.3px}
.cs .cs-dayhead span{color:var(--cs-muted);font-size:13px}
.cs .cs-times{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px}
.cs .cs-time{border-radius:16px;padding:14px 14px 12px;background:var(--cs-soft);min-width:0}
.cs .cs-time.main{background:currentColor}
.cs .cs-time.main *{color:var(--cs-inv,#0A0A0A)}
.cs .cs-time small{display:block;font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--cs-muted);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs .cs-time b{font-size:clamp(22px,6vw,30px);font-weight:300;letter-spacing:-.6px;line-height:1}
.cs .cs-card{border-radius:20px;padding:18px;background:var(--cs-soft);margin-top:10px}
.cs .cs-card h2{font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--cs-muted);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.cs .cs-card h2 svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.cs .cs-card p{font-size:15px}
.cs .cs-sub{color:var(--cs-muted);font-size:13px;margin-top:6px;white-space:pre-line}
.cs .cs-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:10px;margin-top:10px}
.cs .cs-two>.cs-card{margin-top:0}
.cs a.cs-link{text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--cs-line)}
.cs .cs-map{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:14px;margin-top:12px;background:var(--cs-soft);filter:saturate(.7) contrast(1.05)}
.cs .cs-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.cs .cs-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 16px;border-radius:999px;background:currentColor;text-decoration:none;font-size:13px;font-weight:500;min-height:42px;border:0;cursor:pointer;transition:transform .12s}
.cs .cs-btn:active{transform:scale(.97)}
.cs .cs-btn span{color:var(--cs-inv,#0A0A0A)}
.cs .cs-btn.ghost{background:transparent;box-shadow:inset 0 0 0 1px var(--cs-line)}
.cs .cs-btn.ghost span{color:inherit}
.cs .cs-wx{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px}
.cs .cs-wxt{border-radius:14px;padding:10px 12px;background:rgba(128,128,128,.08)}
.cs .cs-wxt small{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--cs-muted);margin-bottom:2px}
.cs .cs-wxt b{font-size:18px;font-weight:400;letter-spacing:-.3px}
.cs .cs-wxt.big{grid-column:span 2;display:flex;align-items:center;gap:12px}
.cs .cs-wxt.big b{font-size:34px;font-weight:300;letter-spacing:-.8px;line-height:1}
.cs .cs-wxt.big em{font-style:normal;color:var(--cs-muted);font-size:13px;display:block}
.cs .cs-wxt svg{width:34px;height:34px;stroke:currentColor;fill:none;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;flex:none}
.cs .cs-wxnote{color:var(--cs-muted);font-size:13px;margin-top:8px}
.cs .cs-tl{position:relative;padding-left:4px}
.cs .cs-tli{display:grid;grid-template-columns:58px 22px 1fr;gap:0 8px;align-items:start;position:relative;padding:7px 0}
.cs .cs-tli .tt{font-weight:500;font-size:14px;padding-top:1px}
.cs .cs-tli .td{position:relative;height:100%;min-height:22px}
.cs .cs-tli .td::before{content:'';position:absolute;left:10px;top:0;bottom:-14px;width:1px;background:var(--cs-line)}
.cs .cs-tli:last-child .td::before{display:none}
.cs .cs-tli .td::after{content:'';position:absolute;left:6px;top:6px;width:9px;height:9px;border-radius:50%;background:var(--cs-soft);box-shadow:inset 0 0 0 1.5px var(--cs-line)}
.cs .cs-tli.done .td::after{background:var(--cs-line)}
.cs .cs-tli.now .td::after{background:var(--cs-accent);box-shadow:0 0 0 4px rgba(128,128,128,.15);animation:cs-pulse 1.8s ease-in-out infinite}
.cs .cs-tli.now .tt,.cs .cs-tli.now .ti{font-weight:500}
.cs .cs-tli .ti{font-size:15px;padding-top:1px}
.cs .cs-crew{display:grid;gap:4px}
.cs .cs-person{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--cs-line)}
.cs .cs-person:first-child{border-top:0;padding-top:0}
.cs .cs-av{width:36px;height:36px;border-radius:50%;background:rgba(128,128,128,.14);display:grid;place-items:center;font-size:12px;font-weight:500;flex:none;letter-spacing:.02em}
.cs .cs-person .pn{min-width:0;flex:1}
.cs .cs-person .pn b{font-weight:500;font-size:15px;display:block}
.cs .cs-person .pn span{color:var(--cs-muted);font-size:13px}
.cs .cs-person .pr{text-align:right;font-size:13px;color:var(--cs-muted);white-space:nowrap}
.cs .cs-person .pr b{display:block;color:inherit;font-weight:500}
.cs ul.cs-list{list-style:none;display:grid;gap:6px;font-size:15px}
.cs ul.cs-list li{display:flex;gap:10px;align-items:flex-start}
.cs ul.cs-list li::before{content:'';width:16px;height:16px;border-radius:5px;box-shadow:inset 0 0 0 1.5px var(--cs-line);flex:none;margin-top:3px}
.cs .cs-foot{font-size:12px;color:var(--cs-muted);margin-top:22px;padding-bottom:70px}
.cs .cs-bar{color:#fff;position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:5;display:flex;gap:8px;padding:8px;border-radius:999px;background:var(--cs-bar,rgba(20,20,20,.92));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 14px 40px rgba(0,0,0,.35);transform:translateY(120%);transition:transform .6s var(--cs-ease)}
.cs .cs-bar.in{transform:none}
.cs .cs-bar .cs-btn{flex:1;min-height:44px;background:#fff}
.cs .cs-bar .cs-btn span{color:#0A0A0A}
.cs .cs-bar .cs-btn.ghost{background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
.cs .cs-bar .cs-btn.ghost span{color:#fff}
.cs.static .cs-bar{display:none}
.cs .cs-warn{font-size:13px;color:#C9894E}
@media (min-width:720px){.cs .cs-bar{left:auto;right:24px;width:360px}}
@media print{.cs .cs-acts,.cs .cs-bar,.cs .cs-count{display:none}.cs .cs-map{display:none}.cs .rv{opacity:1;transform:none}}
`;
  const LOGO='<svg viewBox="0 0 400 400" aria-hidden="true"><path d="M 296.555 343.549 A 173 173 0 1 1 343.549 296.555 L 302.822 255.828 A 117 117 0 1 0 255.828 302.822 L 296.555 343.549 Z" fill="currentColor"/></svg>';
  const IC={pin:'<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
    clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    wx:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
    crew:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M15 5.5a3 3 0 0 1 0 6M21 20a5.5 5.5 0 0 0-4.5-5.4"/></svg>',
    phone:'<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    cross:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    bed:'<svg viewBox="0 0 24 24"><path d="M3 18V8M3 14h18v4M3 14V11a2 2 0 0 1 2-2h5v5M21 14v-2a3 3 0 0 0-3-3h-8"/></svg>',
    bag:'<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    note:'<svg viewBox="0 0 24 24"><path d="M6 4h9l4 4v12H6z"/><path d="M9 12h6M9 16h6"/></svg>',
    check:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>'};
  const WXI={sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
    psun:'<svg viewBox="0 0 24 24"><path d="M7 17.5h9.5a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.4-1.4A4.2 4.2 0 0 0 7 17.5z"/><path d="M16 4v1.5M20.5 8H19M19.2 4.8l-1 1"/></svg>',
    cloud:'<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.5-1.3A4.6 4.6 0 0 0 7 18z"/></svg>',
    rain:'<svg viewBox="0 0 24 24"><path d="M7 15h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.5-1.3A4.6 4.6 0 0 0 7 15z"/><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/></svg>',
    snow:'<svg viewBox="0 0 24 24"><path d="M7 15h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.5-1.3A4.6 4.6 0 0 0 7 15z"/><path d="M9 19h.01M13 19h.01M17 19h.01M11 21.5h.01M15 21.5h.01"/></svg>',
    storm:'<svg viewBox="0 0 24 24"><path d="M7 14h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.5-1.3A4.6 4.6 0 0 0 7 14z"/><path d="M13 14l-2.5 4h3L11 22"/></svg>',
    fog:'<svg viewBox="0 0 24 24"><path d="M7 13h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.5-1.3A4.6 4.6 0 0 0 7 13z"/><path d="M5 17h14M7 20.5h10"/></svg>'};
  const WX={0:['Clear','sun'],1:['Mainly clear','sun'],2:['Partly cloudy','psun'],3:['Overcast','cloud'],45:['Fog','fog'],48:['Fog','fog'],51:['Light drizzle','rain'],53:['Drizzle','rain'],55:['Heavy drizzle','rain'],61:['Light rain','rain'],63:['Rain','rain'],65:['Heavy rain','rain'],66:['Freezing rain','rain'],67:['Freezing rain','rain'],71:['Light snow','snow'],73:['Snow','snow'],75:['Heavy snow','snow'],77:['Snow grains','snow'],80:['Showers','rain'],81:['Showers','rain'],82:['Heavy showers','rain'],85:['Snow showers','snow'],86:['Snow showers','snow'],95:['Thunderstorm','storm'],96:['Thunderstorm','storm'],99:['Thunderstorm','storm']};
  const timeBox=(label,val,main)=>val?'<div class="cs-time'+(main?' main':'')+'"><small>'+label+'</small><b>'+esc(val)+'</b></div>':'';
  const card=(icon,title,body,extra)=>'<section class="cs-card rv'+(extra?' '+extra:'')+'"><h2>'+(IC[icon]||'')+title+'</h2>'+body+'</section>';
  function placeCard(icon,title,pl,showMap){
    if(!pl||!(pl.name||pl.address))return '';
    const q=pl.address||pl.name;const link=pl.mapUrl||gmaps(q);
    return card(icon,title,'<p>'+(pl.name?'<b style="font-weight:500">'+esc(pl.name)+'</b>':'')+(pl.name&&pl.address?'<br>':'')+(pl.address?esc(pl.address):'')+'</p>'+(pl.phone?'<p style="margin-top:4px"><a class="cs-link" href="'+tel(pl.phone)+'">'+esc(pl.phone)+'</a></p>':'')+(pl.notes?'<p class="cs-sub">'+esc(pl.notes)+'</p>':'')+
      (showMap&&pl.address?'<iframe class="cs-map" loading="lazy" title="Map" referrerpolicy="no-referrer-when-downgrade" src="'+embed(pl.address)+'"></iframe>':'')+
      '<div class="cs-acts"><a class="cs-btn" target="_blank" rel="noopener" href="'+esc(link)+'"><span>Google Maps</span></a><a class="cs-btn ghost" target="_blank" rel="noopener" href="'+amaps(q)+'"><span>Apple Maps</span></a></div>');
  }
  function dayBlock(d,i,data){
    const n=data.days.length;const loc=d.location||{};
    const sched=(d.schedule||[]).filter(r=>r.item||r.time).slice().sort((a,b)=>String(a.time).localeCompare(String(b.time)));
    return '<section class="cs-day" data-day="'+i+'">'+(n>1?'<div class="cs-dayhead rv"><b>Day '+(i+1)+' of '+n+'</b><span>'+fmtD(d.date,{weekday:'long',day:'numeric',month:'long'})+'</span></div>':'')+
      (n>1||true?'<div class="cs-times rv">'+timeBox('Call time',d.call,true)+timeBox('Shooting call',d.shootCall)+timeBox('Est. wrap',d.wrap)+'</div>':'')+
      (data.weather!==false?card('wx','Weather','<div class="cs-wx" id="cs-wx-'+i+'"><div class="cs-wxt big"><div><b>—</b><em>'+(d.weatherNote?esc(d.weatherNote):'Forecast loads when the page opens')+'</em></div></div></div>'):'')+
      placeCard('pin','Location',loc,data.showMap!==false)+
      (sched.length?card('clock','Schedule','<div class="cs-tl" data-tl="'+i+'">'+sched.map(r=>'<div class="cs-tli" data-t="'+esc(r.time)+'"><span class="tt">'+esc(r.time)+'</span><span class="td"></span><span class="ti">'+esc(r.item)+'</span></div>').join('')+'</div>'):'')+
      '</section>';
  }
  function render(data){
    const days=data.days||[];const one=days.length===1;
    const dates=days.map(d=>fmtD(d.date,{weekday:'short',day:'numeric',month:'short'}));
    const crew=(data.crew||[]).filter(c=>c.name);const contacts=(data.contacts||[]).filter(c=>c.name);
    const kit=lines(data.equipment);const hosp=data.hospital||{};const hotel=data.hotel||{};
    const confirmBody=encodeURIComponent('Confirmed for '+data.title+' on '+dates.join(', ')+'. – ');
    const smsHref=data.replyPhone?wa(data.replyPhone,'Confirmed for '+data.title+' on '+dates.join(', ')+'. – '):'';
    const mailHref=data.replyEmail?'mailto:'+esc(data.replyEmail)+'?subject='+encodeURIComponent('Confirmed: '+data.title+' '+dates.join(', '))+'&body='+confirmBody:'';
    const firstLoc=days[0]&&days[0].location&&(days[0].location.mapUrl||days[0].location.address||days[0].location.name);
    return '<div class="cs'+(data.preview?' static':'')+'" style="--cs-accent:'+esc(data.accent||'currentColor')+'">'+
    '<header class="cs-hero rv"><div class="cs-top"><div class="cs-brand">'+LOGO+'<span>quiet media</span></div><div class="cs-kind">Call sheet'+(data.version?' · v'+data.version:'')+'<b>'+esc(one?dates[0]:dates[0]+' – '+dates[dates.length-1])+'</b></div></div>'+
    '<h1>'+esc(data.title)+'</h1>'+(data.ack&&data.ack.name?'<p class="cs-lead" style="margin-bottom:4px">For '+esc(data.ack.name)+'</p>':'')+'<p class="cs-lead">'+[data.production,one?fmtD(days[0].date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}):days.length+' shoot days'].filter(Boolean).map(esc).join(' · ')+'</p>'+
    '<div class="cs-count" id="cs-count" hidden><i></i><span></span></div></header>'+
    days.map((d,i)=>dayBlock(d,i,data)).join('')+
    (crew.length?card('crew','Crew','<div class="cs-crew">'+crew.map(c=>'<div class="cs-person"><span class="cs-av">'+esc(initials(c.name))+'</span><span class="pn"><b>'+esc(c.name)+'</b>'+(c.role?'<span>'+esc(c.role)+'</span>':'')+'</span><span class="pr">'+(c.call?'<b>'+esc(c.call)+'</b>':'')+(c.phone?'<a class="cs-link" href="'+tel(c.phone)+'">'+esc(c.phone)+'</a>':'')+'</span></div>').join('')+'</div>'):'')+
    '<div class="cs-two">'+
    (contacts.length?card('phone','Contacts on the day','<div class="cs-crew">'+contacts.map(c=>'<div class="cs-person"><span class="cs-av">'+esc(initials(c.name))+'</span><span class="pn"><b>'+esc(c.name)+'</b>'+(c.role?'<span>'+esc(c.role)+'</span>':'')+'</span><span class="pr">'+(c.phone?'<a class="cs-link" href="'+tel(c.phone)+'">'+esc(c.phone)+'</a>':'')+'</span></div>').join('')+'</div>'):'')+
    placeCard('cross','Nearest A&amp;E',{...hosp,notes:(hosp.notes?hosp.notes+'\n':'')+'In an emergency call 999.'},false)+
    placeCard('bed',hotel.label||'Hotel',hotel,false)+
    (kit.length?card('bag','Please bring','<ul class="cs-list">'+kit.map(k=>'<li>'+esc(k)+'</li>').join('')+'</ul>'):'')+
    '</div>'+
    (data.notes?card('note','Notes','<p style="white-space:pre-line">'+esc(data.notes)+'</p>'):'')+
    (data.ack&&data.interactive!==false?card('check',data.ack.confirmed>=(data.version||1)?'Timings confirmed':'Read and understood?',data.ack.confirmed>=(data.version||1)?'<p>Thanks'+(data.ack.name?', '+esc(data.ack.name.split(' ')[0]):'')+'. You confirmed you have read this call sheet and the timings work for you'+(data.ack.at?' on '+fmtD(data.ack.at,{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):'')+'. If anything changes you will get a new link to confirm again.</p><div class="cs-acts"><button class="cs-btn ghost" type="button" data-ics><span>Add to calendar</span></button></div>':'<p>Please confirm you have read the plan for the day and the timings work for you. This is not a booking confirmation; you are already booked.</p><div class="cs-acts"><button class="cs-btn" type="button" data-ack><span>Confirm timings</span></button><button class="cs-btn ghost" type="button" data-ics><span>Add to calendar</span></button></div><p class="cs-sub">Something does not work? '+(data.replyPhone?'Call or text '+esc(data.replyPhone)+'. ':'')+(data.replyEmail?'Email '+esc(data.replyEmail)+'.':'')+'</p>'):
    (data.interactive!==false&&(smsHref||mailHref)?card('check','Can you make it?','<p>One tap to let '+esc(data.from||'us')+' know.</p><div class="cs-acts">'+(smsHref?'<a class="cs-btn" href="'+smsHref+'"><span>Confirm on WhatsApp</span></a>':'')+(mailHref?'<a class="cs-btn'+(smsHref?' ghost':'')+'" href="'+mailHref+'"><span>Confirm by email</span></a>':'')+'<button class="cs-btn ghost" type="button" data-ics><span>Add to calendar</span></button></div><p class="cs-sub">'+(data.replyPhone?'Call or text '+esc(data.replyPhone)+'. ':'')+(data.replyEmail?'Email '+esc(data.replyEmail)+'.':'')+'</p>'):''))+
    '<p class="cs-foot">Updated '+fmtD(data.updated||Date.now(),{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+'. If anything changes you will get a new message and this page updates with it.</p>'+
    ((data.ack||smsHref||mailHref)&&data.interactive!==false?'<div class="cs-bar" id="cs-bar">'+(data.ack?(data.ack.confirmed>=(data.version||1)?'<span class="cs-btn" style="opacity:.75;pointer-events:none"><span>Timings confirmed ✓</span></span>':'<button class="cs-btn" type="button" data-ack><span>Confirm timings</span></button>'):smsHref?'<a class="cs-btn" href="'+smsHref+'"><span>Confirm</span></a>':'<a class="cs-btn" href="'+mailHref+'"><span>Confirm</span></a>')+(firstLoc?'<a class="cs-btn ghost" target="_blank" rel="noopener" href="'+esc(days[0].location.mapUrl||gmaps(days[0].location.address||days[0].location.name))+'"><span>Directions</span></a>':'')+'</div>':'')+
    '</div>';
  }
  function dayStart(d,hhmm){const dt=new Date(d.date);const [h,m]=String(hhmm||'').split(':').map(Number);if(isNaN(h))return null;return new Date(dt.getFullYear(),dt.getMonth(),dt.getDate(),h,m||0).getTime()}
  function countdown(rootEl,data){
    const el=rootEl.querySelector('#cs-count');if(!el)return;
    const tick=()=>{const now=Date.now();let txt='';
      for(const d of data.days){const c=dayStart(d,d.call),w=dayStart(d,d.wrap);if(!c)continue;
        if(now<c){const ms=c-now,dd=Math.floor(ms/864e5),hh=Math.floor(ms%864e5/36e5),mm=Math.floor(ms%36e5/6e4);txt='Call in '+(dd?dd+'d '+hh+'h':hh?hh+'h '+mm+'m':mm+'m');break}
        if(w&&now<w){txt='On set · wrap '+d.wrap;break}
        if(!w&&now<c+12*36e5){txt='On set';break}}
      if(!txt&&data.days.length){txt='Wrapped. Thank you.'}
      el.hidden=!txt;el.querySelector('span').textContent=txt};
    tick();return setInterval(tick,30000);
  }
  function liveSchedule(rootEl,data){
    const tick=()=>{const now=Date.now();rootEl.querySelectorAll('.cs-tl').forEach(tl=>{const d=data.days[+tl.dataset.tl];const items=[...tl.querySelectorAll('.cs-tli')];let cur=-1;items.forEach((it,i)=>{const t=dayStart(d,it.dataset.t);if(t&&t<=now)cur=i});
      const wrapped=d.wrap&&dayStart(d,d.wrap)&&now>dayStart(d,d.wrap);items.forEach((it,i)=>{it.classList.toggle('done',i<cur||(wrapped&&i<=cur));it.classList.toggle('now',i===cur&&!wrapped)})})};
    tick();return setInterval(tick,60000);
  }
  function reveal(rootEl){
    const els=[...rootEl.querySelectorAll('.rv')];const bar=rootEl.querySelector('#cs-bar');
    if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){els.forEach(e=>e.classList.add('in'));if(bar)bar.classList.add('in');return}
    els.slice(0,3).forEach((e,i)=>setTimeout(()=>e.classList.add('in'),80+i*110));
    const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.08});
    els.slice(3).forEach(e=>io.observe(e));
    if(bar)setTimeout(()=>bar.classList.add('in'),700);
    setTimeout(()=>els.forEach(e=>e.classList.add('in')),2500);
  }
  function ics(data){
    const pad=n=>String(n).padStart(2,'0');const st=ms=>{const d=new Date(ms);return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00'};
    const evs=data.days.map((d,i)=>{const s=dayStart(d,d.call)||new Date(d.date).setHours(8,0,0,0);const e=dayStart(d,d.wrap)||s+9*36e5;const loc=d.location||{};
      return 'BEGIN:VEVENT\r\nUID:qm-'+(data.ref||'sheet')+'-'+i+'@quietmedia.co.uk\r\nDTSTAMP:'+st(Date.now())+'\r\nDTSTART:'+st(s)+'\r\nDTEND:'+st(e)+'\r\nSUMMARY:'+String(data.title).replace(/[,;]/g,' ')+(data.days.length>1?' (day '+(i+1)+')':'')+'\r\nLOCATION:'+String(loc.address||loc.name||'').replace(/[,;]/g,' ')+'\r\nDESCRIPTION:Call sheet: '+location.href.replace(/[,;]/g,'')+'\r\nEND:VEVENT'});
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Quiet Media//Call sheet//EN\r\n'+evs.join('\r\n')+'\r\nEND:VCALENDAR\r\n';
  }
  /* UK postcode first (exact), then town names from the address, longest to shortest. */
  async function geocode(q){
    const pc=(q.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i)||[]);
    if(pc[0]){try{const r=await (await fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent((pc[1]+pc[2]).toUpperCase()))).json();if(r&&r.result)return {latitude:r.result.latitude,longitude:r.result.longitude,name:r.result.admin_district||r.result.parish||pc[0].toUpperCase()}}catch(e){}}
    const parts=q.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/ig,'').split(',').map(x=>x.trim()).filter(Boolean);
    const tries=[];for(let i=parts.length-1;i>=0;i--){tries.push(parts[i])}
    for(const t of tries){if(!t||/\d/.test(t))continue;try{const g=await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name='+encodeURIComponent(t))).json();if(g.results&&g.results[0])return g.results[0]}catch(e){}}
    return null;
  }
  async function weather(rootEl,data){
    if(data.weather===false)return;
    for(let i=0;i<(data.days||[]).length;i++){const d=data.days[i];const el=rootEl.querySelector('#cs-wx-'+i);if(!el)continue;
      const q=(d.location&&(d.location.address||d.location.name))||'';
      const iso=new Date(d.date);const ymd=iso.getFullYear()+'-'+String(iso.getMonth()+1).padStart(2,'0')+'-'+String(iso.getDate()).padStart(2,'0');
      const ahead=(new Date(ymd)-new Date(new Date().toDateString()))/864e5;
      const note=d.weatherNote?'<div class="cs-wxnote" style="grid-column:1/-1">'+esc(d.weatherNote)+'</div>':'';
      if(!q||ahead<-1||ahead>15){el.innerHTML='<div class="cs-wxt big"><div><b>—</b><em>'+(q?'Forecast available from 16 days before the shoot.':'Add a location to get a forecast.')+'</em></div></div>'+note;continue}
      try{
        const hit=await geocode(q);if(!hit)throw 0;
        const f=await (await fetch('https://api.open-meteo.com/v1/forecast?latitude='+hit.latitude+'&longitude='+hit.longitude+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=auto&start_date='+ymd+'&end_date='+ymd)).json();
        const dd=f.daily;if(!dd||!dd.time||!dd.time.length)throw 0;const t=s=>s.slice(11,16);const w=WX[dd.weather_code[0]]||['',''];
        el.innerHTML='<div class="cs-wxt big">'+(WXI[w[1]]||'')+'<div><b>'+Math.round(dd.temperature_2m_max[0])+'° <span style="font-size:16px;font-weight:300;color:var(--cs-muted)">/ '+Math.round(dd.temperature_2m_min[0])+'°</span></b><em>'+esc(w[0])+' · '+esc(hit.name)+'</em></div></div>'+
          '<div class="cs-wxt"><small>Rain</small><b>'+(dd.precipitation_probability_max[0]??'–')+'%</b></div><div class="cs-wxt"><small>Wind</small><b>'+Math.round(dd.wind_speed_10m_max[0])+' <span style="font-size:12px;font-weight:300">km/h</span></b></div><div class="cs-wxt"><small>Sunrise</small><b>'+t(dd.sunrise[0])+'</b></div><div class="cs-wxt"><small>Sunset</small><b>'+t(dd.sunset[0])+'</b></div>'+note;
      }catch(e){el.innerHTML='<div class="cs-wxt big"><div><b>—</b><em>Forecast unavailable right now.</em></div></div>'+note}
    }
  }
  function mount(rootEl,data){
    reveal(rootEl);countdown(rootEl,data);liveSchedule(rootEl,data);weather(rootEl,data);
    rootEl.querySelectorAll('[data-ack]').forEach(b=>b.addEventListener('click',()=>{if(data.onAck){b.disabled=true;b.querySelector('span').textContent='Confirming…';data.onAck()}}));
    rootEl.querySelectorAll('[data-ics]').forEach(b=>b.addEventListener('click',()=>{const blob=new Blob([ics(data)],{type:'text/calendar'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(data.title||'call-sheet').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}));
  }
  root.QMSheet={css:CSS,render,weather,mount,wa};
})(typeof window!=='undefined'?window:globalThis);
