/* 418.8 — controlled kinetics: one event at a time, never the whole archive. */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

function stamp(text){
  const el=document.createElement('div');
  el.className='kinetic-stamp';
  el.textContent=text;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1200);
}

function cards(){ return $$('.grid-works .work-card'); }

function injectCommandBar(){
  if(document.body.dataset.page !== 'works' || $('.kinetic-command')) return;
  const bar=document.createElement('div');
  bar.className='kinetic-command';
  bar.innerHTML=`<span class="kinetic-command__signal">418://LIVE</span>
    <button data-k="witness">СВИДЕТЕЛЬ</button>
    <button data-k="jump">ПРЫГНУТЬ</button>
    <button data-k="panic">СЛОМАТЬ СЕТКУ</button>
    <span class="kinetic-command__hint">esc = снять режим · w = свидетель · g = глитч · r = раскидать</span>`;
  document.body.appendChild(bar);
  bar.addEventListener('click',e=>{
    const key=e.target?.dataset?.k;
    if(key==='witness') witnessRandom();
    if(key==='panic') togglePanic();
    if(key==='jump') jumpRandom();
  });
}

function applyComposition(){
  cards().forEach((card,i)=>{
    const tilt=[-1.4,1.0,-.6,1.7,-.8,.45][i%6];
    const y=[0,6,-4,9,-2,4][i%6];
    card.style.setProperty('--card-tilt',`${tilt}deg`);
    card.style.setProperty('--card-y',`${y}px`);
    card.style.setProperty('--card-depth',String(10+(i%7)));
  });
}

function witnessRandom(){
  const all=cards();
  if(!all.length) return;
  const active=all.find(c=>c.classList.contains('is-witness'));
  if(active) active.classList.remove('is-witness');
  const chosen=all[Math.floor(Math.random()*all.length)];
  chosen.classList.add('is-witness');
  document.body.classList.add('witness-mode');
  chosen.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center',inline:'nearest'});
  stamp('СВИДЕТЕЛЬ НАЙДЕН / ОСТАЛЬНЫМ НЕ СМОТРЕТЬ');
}

function clearWitness(){
  document.body.classList.remove('witness-mode');
  cards().forEach(c=>c.classList.remove('is-witness'));
}

function togglePanic(){
  document.body.classList.toggle('kinetic-violent');
  stamp(document.body.classList.contains('kinetic-violent')?'ПОРЯДОК ОТКЛЮЧЕН НА 418 СЕК.':'ПОРЯДОК ВЕРНУЛСЯ');
}

function scatterCards(){
  const grid=$('.grid-works');
  if(!grid || reduce) return;
  const list=cards();
  list.forEach((card,i)=>{
    const y=Math.round((Math.random()-.5)*18);
    const tilt=((Math.random()-.5)*4).toFixed(2);
    card.style.setProperty('--card-y',`${y}px`);
    card.style.setProperty('--card-tilt',`${tilt}deg`);
    card.style.setProperty('--scatter-order',String(Math.random()));
  });
  [...list].sort((a,b)=>Number(a.style.getPropertyValue('--scatter-order'))-Number(b.style.getPropertyValue('--scatter-order'))).forEach(c=>grid.appendChild(c));
  grid.classList.remove('is-scattering');
  void grid.offsetWidth;
  grid.classList.add('is-scattering');
  setTimeout(()=>grid.classList.remove('is-scattering'),260);
  stamp('АРХИВ РАСКИДАН / ПРИЧИНА НЕ УСТАНОВЛЕНА');
}

function jumpRandom(){
  const list=cards();
  if(list.length){
    list[Math.floor(Math.random()*list.length)].scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
    stamp('СЛУЧАЙНЫЙ УЗЕЛ');
  }
}

function oneCardGhost(card){
  if(reduce || card.dataset.ghostLock==='1') return;
  card.dataset.ghostLock='1';
  card.dataset.ghost='1';
  setTimeout(()=>{ delete card.dataset.ghost; delete card.dataset.ghostLock; },420);
}

function keyboard(){
  if(document.body.dataset.page !== 'works') return;
  document.addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const k=e.key.toLowerCase();
    if(e.key==='Escape'){
      clearWitness();
      document.body.classList.remove('kinetic-violent');
    }
    if(k==='w') witnessRandom();
    if(k==='r') scatterCards();
    if(k==='g'){
      document.body.classList.add('chaos-flash');
      setTimeout(()=>document.body.classList.remove('chaos-flash'),220);
    }
  });
}

function bindCardInteractions(){
  cards().forEach(card=>{
    if(card.dataset.kineticBound==='1') return;
    card.dataset.kineticBound='1';
    card.addEventListener('mouseenter',()=>{ if(Math.random()<0.08) oneCardGhost(card); },{passive:true});
    card.addEventListener('focusin',()=>{ card.classList.add('is-focus'); },{passive:true});
    card.addEventListener('focusout',()=>{ card.classList.remove('is-focus'); },{passive:true});
  });
}

function observeLibrary(){
  const root=$('[data-library-root]');
  if(!root) return;
  const grid=root.querySelector('.grid-works');
  if(!grid) return;
  const observer=new MutationObserver(()=>{ applyComposition(); bindCardInteractions(); });
  observer.observe(grid,{childList:true});
  if(!grid.querySelector('.is-witness')) document.body.classList.remove('witness-mode');
  applyComposition();
  bindCardInteractions();
}

function hookArchiveControls(){
  if(document.body.dataset.page !== 'works') return;
  const b=$('[data-archive-chaos]'); if(b) b.addEventListener('click',scatterCards);
  const c=$('[data-archive-collapse]'); if(c) c.addEventListener('click',()=>{document.body.classList.toggle('archive-collapsed'); stamp(document.body.classList.contains('archive-collapsed')?'РЕАЛЬНОСТЬ СЖАТА':'РЕАЛЬНОСТЬ РАСПРАВЛЕНА');});
}

function pointerField(){
  if(reduce) return;
  let raf=0,lastX=0,lastY=0;
  document.addEventListener('pointermove',e=>{
    lastX=e.clientX; lastY=e.clientY;
    if(raf) return;
    raf=requestAnimationFrame(()=>{
      document.documentElement.style.setProperty('--mouse-x',`${(lastX/window.innerWidth*100).toFixed(2)}%`);
      document.documentElement.style.setProperty('--mouse-y',`${(lastY/window.innerHeight*100).toFixed(2)}%`);
      raf=0;
    });
  },{passive:true});
}

window.addEventListener('DOMContentLoaded',()=>{
  injectCommandBar();
  keyboard();
  hookArchiveControls();
  pointerField();
  observeLibrary();
});
