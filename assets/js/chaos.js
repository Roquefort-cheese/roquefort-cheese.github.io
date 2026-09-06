const MEMES = [
  'НОРМА НЕ НАЙДЕНА', 'СЫР РОКФОР API: 418', 'ЛИНОЛЕУМ ПРИНЯЛ РЕШЕНИЕ',
  'НЕ РЖАТЬ ДО ТИТУЛА', 'ПАФОС НЕ ПОДТВЕРЖДЁН', 'ОШИБКА: СЛИШКОМ ЧЕЛОВЕЧЕСКИЙ',
  'ДОШИРАК КАК КРОТОВАЯ НОРА', 'КОМЕНДАНТ ВИДЕЛ И НЕ ПОНЯЛ',
  'ЁБАНЫЙ ПАТЧ 418.7', 'НЕ ТРОГАТЬ. УЖЕ МИФ.', 'КАРМА ПРОЧИЩЕНА. РЕЗИНКА НЕТ.'
];
function seeded(i){const x=Math.sin(i*12.9898)*43758.5453;return x-Math.floor(x)}
function injectStamp(){
  if(document.querySelector('.site-chaos-stamp')) return;
  const el=document.createElement('div');el.className='site-chaos-stamp';
  el.innerHTML='<b>418.3</b><span>'+MEMES[Math.floor(Math.random()*MEMES.length)]+'</span>';
  document.body.appendChild(el);
}
function injectTicker(){
  const main=document.querySelector('main'); if(!main || document.querySelector('.chaos-ticker')) return;
  const phrases=[...MEMES,...MEMES];
  const wrap=document.createElement('div'); wrap.className='chaos-ticker';
  const track=document.createElement('div'); track.className='chaos-ticker__track';
  track.innerHTML=phrases.map((p,i)=>`<span>${p}</span>`).join('');
  wrap.appendChild(track); main.prepend(wrap);
}
function stampCards(){
  document.querySelectorAll('.work-card').forEach((card,i)=>{
    card.dataset.tiltSeed = String(Math.round(seeded(i+1)*999));
    if(!card.querySelector('.work-card__index')){
      const idx=card.querySelector('.work-card__body');
      if(idx){const n=document.createElement('span');n.className='work-card__index';n.textContent=String(i+1).padStart(3,'0');card.querySelector('.work-card__media')?.appendChild(n)}
    }
  });
}

function injectShuffle(){
  const root=document.querySelector('[data-library-root]');
  const controls=document.querySelector('.sort-control');
  if(!root || !controls || controls.querySelector('[data-chaos-shuffle]')) return;
  const btn=document.createElement('button'); btn.type='button'; btn.dataset.chaosShuffle='1';
  btn.className='btn btn--small'; btn.textContent='взорвать раскладку';
  controls.appendChild(btn);
  btn.addEventListener('click',()=>{
    const grid=root.querySelector('.grid-works'); if(!grid) return;
    [...grid.children].forEach((card,i)=>{
      const y=Math.round((seeded(Date.now()+i)*2-1)*24);
      const tilt=(seeded(Date.now()+i*11)*6-3).toFixed(2);
      card.style.setProperty('--chaos-y',`${y}px`);
      card.style.setProperty('--tilt',`${tilt}deg`);
      card.style.setProperty('--chaos-order',String(Math.round(seeded(Date.now()+i*17)*1000)));
    });
    [...grid.children].sort((a,b)=>Number(a.style.getPropertyValue('--chaos-order'))-Number(b.style.getPropertyValue('--chaos-order'))).forEach(card=>grid.appendChild(card));
    document.body.classList.add('chaos-shuffled');
    setTimeout(()=>document.body.classList.remove('chaos-shuffled'),380);
  });
}

function initGlitchOnKey(){
  document.addEventListener('keydown',(e)=>{
    if(e.key !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return;
    document.body.classList.add('chaos-flash');
    setTimeout(()=>document.body.classList.remove('chaos-flash'),260);
  });
}
window.addEventListener('DOMContentLoaded',()=>{injectStamp();injectTicker();injectShuffle();initGlitchOnKey();setTimeout(stampCards,30)});
