/* 418.6 — Kinetic UI / non-linear navigation */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const seeded = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

function stamp(text){
  const el=document.createElement('div'); el.className='kinetic-stamp'; el.textContent=text; document.body.appendChild(el);
  setTimeout(()=>el.remove(),1400);
}

function injectCommandBar(){
  if($('.kinetic-command')) return;
  const bar=document.createElement('div'); bar.className='kinetic-command';
  bar.innerHTML=`<span class="kinetic-command__signal">418://LIVE</span><button data-k="shuffle">РАЗМЕШАТЬ</button><button data-k="jump">ПРЫГНУТЬ</button><button data-k="panic">СЛОМАТЬ СЕТКУ</button><span class="kinetic-command__hint">esc = обратно в комнату · g = глитч · x = режим слияния</span>`;
  document.body.appendChild(bar);
  bar.addEventListener('click',e=>{
    const key=e.target?.dataset?.k;
    if(key==='shuffle') shuffleCards();
    if(key==='panic'){document.body.classList.toggle('kinetic-violent');stamp(document.body.classList.contains('kinetic-violent')?'ПОРЯДОК ОТКЛЮЧЕН':'ПОРЯДОК ВЕРНУЛСЯ');}
    if(key==='jump') jumpRandom();
  });
}
function shuffleCards(){
  const grid=$('.grid-works'); if(!grid) return;
  const cards=$$('.work-card',grid); if(!cards.length) return;
  const pool=[...cards].sort(()=>Math.random()-.5);
  pool.forEach((c,i)=>{c.style.setProperty('--k-span', [2,2,3,3,4,5][i%6]); c.style.setProperty('--k-rows',[28,34,42,50,60][i%5]); c.style.setProperty('--k-shift',`${Math.round((Math.random()-.5)*14)}px`); c.style.setProperty('--k-tilt',`${(Math.random()-.5)*2.8}deg`); grid.appendChild(c);});
  stamp('АРХИВ РАЗМЕШАН / ПРИЧИНА ПОТЕРЯНА');
}
function prepareCards(){
  const cards=$$('.work-card'); cards.forEach((c,i)=>{c.style.setProperty('--k-span',[3,4,3,2,5,3][i%6]); c.style.setProperty('--k-rows',[34,48,42,30,58,38][i%6]); c.style.setProperty('--k-shift',`${Math.round((seeded(i+7)-.5)*16)}px`); c.style.setProperty('--k-tilt',`${((seeded(i+31)-.5)*2.2).toFixed(2)}deg`);});
  $$('.work-card').forEach(card=>card.addEventListener('mouseenter',()=>{ if(!reduce && Math.random()<.12){card.dataset.ghost='1';setTimeout(()=>delete card.dataset.ghost,500)} }));
}
function jumpRandom(){
  const cards=$$('.work-card');
  if(cards.length){ cards[Math.floor(Math.random()*cards.length)].scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'}); stamp('СЛУЧАЙНЫЙ УЗЕЛ'); return; }
  const links=$$('a[href*="/works/"]'); if(links.length){links[Math.floor(Math.random()*links.length)].click();}
}
function hookArchiveButtons(){
  const b=$('[data-archive-chaos]'); if(b) b.addEventListener('click',shuffleCards);
  const c=$('[data-archive-collapse]'); if(c) c.addEventListener('click',()=>{document.body.classList.toggle('archive-collapsed');stamp(document.body.classList.contains('archive-collapsed')?'РЕАЛЬНОСТЬ СЖАТА':'РЕАЛЬНОСТЬ РАСПРАВЛЕНА')});
}
function keyboard(){
 document.addEventListener('keydown',e=>{ if(e.metaKey||e.ctrlKey||e.altKey)return; if(e.key==='Escape') { document.body.classList.remove('kinetic-violent'); stamp('ОБРАТНО В КОМНАТУ'); }
  if(e.key.toLowerCase()==='g'){ document.body.classList.add('chaos-flash'); setTimeout(()=>document.body.classList.remove('chaos-flash'),220); }
  if(e.key.toLowerCase()==='r') shuffleCards();
 });
}
function pointerField(){
 if(reduce)return;
 document.addEventListener('pointermove',e=>{document.documentElement.style.setProperty('--mouse-x',`${(e.clientX/window.innerWidth*100).toFixed(2)}%`);document.documentElement.style.setProperty('--mouse-y',`${(e.clientY/window.innerHeight*100).toFixed(2)}%`);});
}
window.addEventListener('DOMContentLoaded',()=>{injectCommandBar();prepareCards();hookArchiveButtons();keyboard();pointerField(); if($('.grid-works')) setTimeout(()=>shuffleCards(),420);});
