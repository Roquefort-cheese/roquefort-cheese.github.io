/* 418.9 — archive mechanics: explicit actions only, no autonomous movement. */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

function stamp(text){
  const el=document.createElement('div'); el.className='kinetic-stamp'; el.textContent=text;
  document.body.appendChild(el); setTimeout(()=>el.remove(),1200);
}
function cards(){ return $$('.grid-works .work-card'); }

function applyComposition(){
  cards().forEach((card,i)=>{
    const tilt=[-1.2,.8,-.6,1.4,-.8,.4][i%6];
    const y=[0,4,-2,6,-1,3][i%6];
    card.style.setProperty('--card-tilt',`${tilt}deg`);
    card.style.setProperty('--card-y',`${y}px`);
    card.style.setProperty('--card-depth',String(10+(i%7)));
  });
}

function witnessRandom(){
  const all=cards(); if(!all.length) return;
  all.forEach(c=>c.classList.remove('is-witness'));
  const chosen=all[Math.floor(Math.random()*all.length)];
  chosen.classList.add('is-witness'); document.body.classList.add('witness-mode');
  chosen.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
  stamp('СВИДЕТЕЛЬ ВЫБРАН / ОСТАЛЬНЫЕ МОГУТ ПОДОЖДАТЬ');
}
function clearWitness(){ document.body.classList.remove('witness-mode'); cards().forEach(c=>c.classList.remove('is-witness')); }

function scatterCards(){
  const grid=$('.grid-works'); if(!grid) return;
  grid.classList.add('dada-scatter');
  const list=cards(); list.forEach((card,i)=>{
    const y=Math.round((Math.random()-.5)*20);
    const tilt=((Math.random()-.5)*5).toFixed(2);
    card.style.setProperty('--scatter-y',`${y}px`);
    card.style.setProperty('--scatter-r',`${tilt}deg`);
    card.style.setProperty('--scatter-z',String(20+(i%17)));
  });
  grid.dataset.scatterSeed=String(Date.now());
  stamp('РАСКИДАНО / СОБРАТЬ ПОЧТИ НЕЧЕГО');
}

function toggleCollapse(){
  const grid=$('.grid-works'); if(!grid) return;
  const on=!grid.classList.contains('dada-compressed');
  grid.classList.toggle('dada-compressed',on);
  document.body.classList.toggle('archive-collapsed',on);
  stamp(on?'РЕАЛЬНОСТЬ СЖАТА / КАДРЫ ПОТЕРЯЛИ ВОЗДУХ':'РЕАЛЬНОСТЬ ОТПУСТИЛА');
}

function jumpRandom(){
  const list=cards(); if(!list.length) return;
  list[Math.floor(Math.random()*list.length)].scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
  stamp('СЛУЧАЙНЫЙ УЗЕЛ / НЕ СПРАШИВАЙ ПОЧЕМУ');
}

function oneCardGhost(card){
  if(reduce || card.dataset.ghostLock==='1') return;
  card.dataset.ghostLock='1'; card.dataset.ghost='1';
  setTimeout(()=>{delete card.dataset.ghost; delete card.dataset.ghostLock;},360);
}

function keyboard(){
  if(document.body.dataset.page!=='works') return;
  document.addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const k=e.key.toLowerCase();
    if(k==='w') witnessRandom();
    if(k==='r') scatterCards();
    if(k==='g'){document.body.classList.add('chaos-flash');setTimeout(()=>document.body.classList.remove('chaos-flash'),220);}
    if(e.key==='Escape'){clearWitness();document.body.classList.remove('archive-collapsed');$('.grid-works')?.classList.remove('dada-compressed');}
  });
}

function bindCardInteractions(){
  cards().forEach(card=>{
    if(card.dataset.kineticBound==='1') return;
    card.dataset.kineticBound='1';
    card.addEventListener('mouseenter',()=>{if(Math.random()<.06) oneCardGhost(card);},{passive:true});
    card.addEventListener('focusin',()=>card.classList.add('is-focus'),{passive:true});
    card.addEventListener('focusout',()=>card.classList.remove('is-focus'),{passive:true});
  });
}

function observeLibrary(){
  const root=$('[data-library-root]'); if(!root) return;
  const grid=root.querySelector('.grid-works'); if(!grid) return;
  const observer=new MutationObserver(()=>{bindCardInteractions();});
  observer.observe(grid,{childList:true}); bindCardInteractions(); applyComposition();
}

function delegatedControls(){
  if(document.body.dataset.page!=='works') return;
  document.addEventListener('click',e=>{
    const target=e.target.closest?.('[data-archive-chaos],[data-archive-collapse]');
    if(!target) return;
    if(target.matches('[data-archive-chaos]')) scatterCards();
    if(target.matches('[data-archive-collapse]')) toggleCollapse();
  });
}

function pointerField(){
  if(reduce) return;
  let raf=0,lastX=0,lastY=0;
  document.addEventListener('pointermove',e=>{
    lastX=e.clientX;lastY=e.clientY;if(raf)return;
    raf=requestAnimationFrame(()=>{
      document.documentElement.style.setProperty('--mouse-x',`${(lastX/window.innerWidth*100).toFixed(2)}%`);
      document.documentElement.style.setProperty('--mouse-y',`${(lastY/window.innerHeight*100).toFixed(2)}%`);
      raf=0;
    });
  },{passive:true});
}

window.addEventListener('DOMContentLoaded',()=>{keyboard();delegatedControls();pointerField();observeLibrary();});
