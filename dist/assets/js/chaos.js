const MEMES = [
  'НОРМА НЕ НАЙДЕНА', 'СЫР РОКФОР API: 418', 'ЛИНОЛЕУМ ПРИНЯЛ РЕШЕНИЕ',
  'НЕ РЖАТЬ ДО ТИТУЛА', 'ПАФОС НЕ ПОДТВЕРЖДЁН', 'ОШИБКА: СЛИШКОМ ЧЕЛОВЕЧЕСКИЙ',
  'ДОШИРАК КАК КРОТОВАЯ НОРА', 'КОМЕНДАНТ ВИДЕЛ И НЕ ПОНЯЛ',
  'ЁБАНЫЙ ПАТЧ 418.7', 'НЕ ТРОГАТЬ. УЖЕ МИФ.', 'КАРМА ПРОЧИЩЕНА. РЕЗИНКА НЕТ.'
];
function injectStamp(){
  if(document.querySelector('.site-chaos-stamp')) return;
  const el=document.createElement('div');el.className='site-chaos-stamp';
  el.innerHTML='<b>418.8</b><span>'+MEMES[Math.floor(Math.random()*MEMES.length)]+'</span>';
  document.body.appendChild(el);
}
function injectTicker(){
  const main=document.querySelector('main'); if(!main || document.querySelector('.chaos-ticker')) return;
  const phrases=[...MEMES,...MEMES];
  const wrap=document.createElement('div'); wrap.className='chaos-ticker';
  const track=document.createElement('div'); track.className='chaos-ticker__track';
  track.innerHTML=phrases.map(p=>`<span>${p}</span>`).join('');
  wrap.appendChild(track); main.prepend(wrap);
}
function initGlitchOnKey(){
  document.addEventListener('keydown',(e)=>{
    if(e.key.toLowerCase()!=='g' || e.metaKey || e.ctrlKey || e.altKey) return;
    document.body.classList.add('chaos-flash');
    setTimeout(()=>document.body.classList.remove('chaos-flash'),260);
  });
}
window.addEventListener('DOMContentLoaded',()=>{injectStamp();injectTicker();initGlitchOnKey();});
