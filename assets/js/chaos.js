const MEMES = [
  'НОРМА НЕ НАЙДЕНА','СЫР РОКФОР ONLINE','ЛИНОЛЕУМ УЖЕ РЕШИЛ','НЕ РЖАТЬ ДО ТИТУЛА',
  'ПАФОС НЕ ПОДТВЕРЖДЁН','ОШИБКА: СЛИШКОМ ЧЕЛОВЕЧЕСКИЙ','ДОШИРАК.EXE','КОМЕНДАНТ ОНЛАЙН',
  'ПАТЧ НЕ НУЖЕН','НЕ ТРОГАТЬ. УЖЕ МИФ.','РЕЗИНКА ОТВАЛИЛАСЬ'
];
function stampOnce(){
  if(document.querySelector('.site-chaos-stamp')) return;
  const el=document.createElement('div'); el.className='site-chaos-stamp';
  el.innerHTML='<b>418.9</b><span>'+MEMES[Math.floor(Math.random()*MEMES.length)]+'</span>';
  document.body.appendChild(el);
}
function initGlitchOnKey(){
  document.addEventListener('keydown',(e)=>{
    const typing=e.target instanceof HTMLElement
      && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName));
    if(e.key.toLowerCase()!=='g' || e.metaKey || e.ctrlKey || e.altKey || typing) return;
    document.body.classList.add('chaos-flash');
    setTimeout(()=>document.body.classList.remove('chaos-flash'),260);
    stampOnce();
  });
}
window.addEventListener('DOMContentLoaded',()=>{initGlitchOnKey();});
