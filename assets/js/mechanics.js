/* 418.5 — Dissonance Engine */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const storeKey = 'p418.dissonance.v1';

const EXTRA_FATES = [
  'назначить комнату свидетелем',
  'выдать предмету право на исповедь',
  'запретить объекту быть полезным до конца цикла',
  'объявить бытовую деталь источником космологии',
  'передать полномочия самому дешёвому предмету',
  'разрешить следствию самостоятельно придумать причину',
];
const CONSEQUENCES = [
  'объект начинает требовать титул',
  'титул начинает требовать свидетеля',
  'свидетель внезапно становится частью ритуала',
  'интерфейс регистрирует лишнего бога',
  'комендант получает временный доступ к космосу',
  'линолеум объявляет апелляцию',
];
const NORMALIZED = [
  'Пожалуйста, выберите корректное назначение.',
  'Запрос отклонён по причине слишком человеческого содержания.',
  'Система рекомендует вести себя нормально.',
];

function pick(arr, seed=Date.now()) {
  const n = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
  return arr[Math.floor((n - Math.floor(n)) * arr.length)];
}
function now(){ return new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function state(){
  try { return JSON.parse(sessionStorage.getItem(storeKey) || '{}'); } catch { return {}; }
}
function save(s){ try { sessionStorage.setItem(storeKey, JSON.stringify(s)); } catch {} }
function logEvent(root, kind, text){
  const body = $('.dissonance-feed__body', root); if(!body) return;
  const line = document.createElement('div'); line.className='dissonance-feed__line'; line.dataset.kind=kind;
  line.innerHTML = `<span class="dissonance-feed__time">${now()}</span><strong>${text}</strong>`;
  body.prepend(line);
  while(body.children.length>5) body.lastElementChild.remove();
}

function makeTelemetry(stage){
  if ($('.phase-stage__telemetry', stage)) return $('.phase-stage__telemetry', stage);
  const t=document.createElement('div'); t.className='phase-stage__telemetry'; t.innerHTML='<b>INTERFACE TELEMETRY</b><span data-t="state">state: idle</span><span data-t="entropy">entropy: 001</span><span data-t="memory">memory: 000</span>';
  stage.appendChild(t); return t;
}

function initHomeMechanics(root){
  const stage=$('.phase-stage',root), button=$('.btn--ritual',root), zone=$('.ritual-zone',root);
  if(!stage || !button || !zone) return;
  const telemetry=makeTelemetry(stage);
  const st=state();
  st.cycles=Number(st.cycles||0); st.entropy=Number(st.entropy||7); st.memory=Array.isArray(st.memory)?st.memory:[];
  save(st);

  const consoleEl=document.createElement('section');
  consoleEl.className='dissonance-console';
  consoleEl.setAttribute('aria-label','Машина неправильного назначения');
  consoleEl.innerHTML=`
    <div class="dissonance-console__grid">
      <div class="dissonance-console__left">
        <div class="assignment-stack">
          <div class="assignment-row"><div class="assignment-row__label">Объект</div><div class="assignment-row__value" data-field="object">ожидает вмешательства<small>предмет будет взят из реального корпуса апофеозов</small></div></div>
          <div class="assignment-row"><div class="assignment-row__label">Неверная роль</div><div class="assignment-row__value" data-field="role">не назначена<small>система не гарантирует пригодность должности</small></div></div>
          <div class="assignment-row"><div class="assignment-row__label">Последствие</div><div class="assignment-row__value" data-field="fate">не рассчитано<small>причина может появиться после результата</small></div></div>
        </div>
        <div class="assignment-controls" role="group" aria-label="Режим вмешательства">
          <button type="button" class="assignment-chip" data-mode="absurd" aria-pressed="true">бытовой перегиб</button>
          <button type="button" class="assignment-chip" data-mode="pathos" aria-pressed="false">абсолютный титул</button>
          <button type="button" class="assignment-chip" data-mode="glitch" aria-pressed="false">цифровой паразит</button>
          <button type="button" class="assignment-chip" data-mode="ground" aria-pressed="false">не трогать человека</button>
        </div>
        <div class="wrongness-meter"><div class="wrongness-meter__head"><span>степень ошибочности</span><b data-wrongness>07 / 418</b></div><div class="wrongness-meter__track"><div class="wrongness-meter__fill" data-fill></div></div></div>
        <button type="button" class="assignment-submit" data-commit>назначить неправильно</button>
      </div>
      <div class="dissonance-console__right">
        <div class="dissonance-feed"><div class="dissonance-feed__head"><span>журнал инцидентов</span><span>SESS / LIVE</span></div><div class="dissonance-feed__body"></div></div>
        <div class="ritual-memory"><div class="ritual-memory__label">остатки прошлого цикла</div><div data-memory-slot></div><div data-memory-slot></div></div>
      </div>
    </div>`;
  zone.appendChild(consoleEl);

  const fields={object:$('[data-field="object"]',consoleEl),role:$('[data-field="role"]',consoleEl),fate:$('[data-field="fate"]',consoleEl)},
    chips=$$('.assignment-chip',consoleEl), commit=$('[data-commit]',consoleEl), fill=$('[data-fill]',consoleEl), wrong=$('[data-wrongness]',consoleEl);
  let currentMode='absurd'; let currentAssignment=null; let locked=false;

  const recipes=[
    {id:'vantuz',object:'вантуз',role:'скипетр кармы',dialect:'holding',title:'Вантуз Судьбы'},
    {id:'fedora',object:'федора',role:'трон для думскроллинга',dialect:'fixation',title:'Властелин Дофамина'},
    {id:'tablichka',object:'самодельная табличка',role:'скрижаль творения',dialect:'generation',title:'Осеменитель'},
  ];

  function refreshAssignment(seed=Date.now()){
    const r=pick(recipes,seed); const fate=pick(CONSEQUENCES,seed+3); const extra=pick(EXTRA_FATES,seed+7);
    currentAssignment={...r,fate:`${fate}; ${extra}`};
    fields.object.childNodes[0].textContent=`${r.object}`;
    fields.role.childNodes[0].textContent=`${r.role}`;
    fields.fate.childNodes[0].textContent=currentAssignment.fate;
    const n=Math.min(418,Math.max(7,(st.entropy+Math.floor((seed%17))+r.object.length*5)));
    st.entropy=n; wrong.textContent=`${String(n).padStart(3,'0')} / 418`; fill.style.width=`${(n/418*100).toFixed(1)}%`;
    telemetry.querySelector('[data-t="entropy"]').textContent=`entropy: ${String(n).padStart(3,'0')}`;
  }

  chips.forEach(ch=>ch.addEventListener('click',()=>{chips.forEach(c=>c.setAttribute('aria-pressed','false'));ch.setAttribute('aria-pressed','true');currentMode=ch.dataset.mode;refreshAssignment();logEvent(root,currentMode,`режим: ${ch.textContent}`);}));
  button.addEventListener('click',()=>{refreshAssignment(Date.now()+Math.floor(Math.random()*1000)); commit.focus(); logEvent(root,'absurd','кнопка открыла бункер назначения');});

  function renderMemory(){
    const slots=$$('[data-memory-slot]',consoleEl);
    slots.forEach((slot,i)=>{
      slot.innerHTML=''; const m=st.memory[i]; if(!m){slot.className='memory-token';slot.innerHTML='<span class="memory-token__n">—</span><div class="memory-token__text">пока пусто</div><div class="memory-token__sub">остаток появится после перегрева</div>';return;}
      slot.className='memory-token'; slot.innerHTML=`<span class="memory-token__n">${m.n}</span><div class="memory-token__text">${m.text}</div><div class="memory-token__sub">${m.mode} / ${m.title}</div>`;
    });
  }
  renderMemory();

  commit.addEventListener('click',()=>{
    if(locked || !currentAssignment) return;
    locked=true; commit.disabled=true; button.disabled=true;
    document.body.dataset.dissonance=String((st.cycles%2)+1);
    stage.dataset.interfaceHot='1';
    logEvent(root,currentMode,'назначение подтверждено / обратимость временно отменена');
    document.dispatchEvent(new CustomEvent('ritual:assignment-committed',{detail:{...currentAssignment,mode:currentMode}}));
    window.setTimeout(()=>{ if(Math.random()<Math.min(.35, st.entropy/800)) logEvent(root,'glitch',pick(NORMALIZED)); },420);

    const oldText=button.textContent;
    button.textContent=['УЖЕ ПОЗДНО','НЕ ПОВТОРЯТЬ','ТЕПЕРЬ ЭТО КАНОН'][st.cycles%3];
    window.setTimeout(()=>{button.textContent=oldText;},2400);
    window.setTimeout(()=>{
      const consequence=pick(CONSEQUENCES, st.cycles+st.entropy+11);
      logEvent(root,'absurd',consequence);
      st.cycles+=1; st.entropy=Math.min(418,st.entropy+31+(currentMode==='glitch'?18:0));
      st.memory.unshift({n:String(st.cycles).padStart(3,'0'),text:`${currentAssignment.object}: ${currentAssignment.role}`,mode:currentMode,title:currentAssignment.title});
      st.memory=st.memory.slice(0,2);save(st);renderMemory();
      telemetry.querySelector('[data-t="memory"]').textContent=`memory: ${String(st.cycles).padStart(3,'0')}`;
    },3300);

    /* contradiction event: a late authority tries to overwrite meaning */
    if(Math.random()<0.38){
      window.setTimeout(()=>{
        stage.dataset.authority='1';
        logEvent(root,'pathos','КОМЕНДАНТ: объект признан недостаточно нормальным.');
        window.setTimeout(()=>{stage.dataset.authority='0';},900);
      },1400);
    }
  });

  /* Pointer dissonance: the stage subtly follows the viewer, then refuses. */
  stage.addEventListener('pointermove',(e)=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r=stage.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
    stage.style.setProperty('--pointer-x',`${(x*8).toFixed(2)}px`);
    stage.style.setProperty('--pointer-y',`${(y*8).toFixed(2)}px`);
  });
  stage.addEventListener('pointerleave',()=>{stage.style.removeProperty('--pointer-x');stage.style.removeProperty('--pointer-y')});

  document.addEventListener('protocol:phase-change',(e)=>{
    telemetry.querySelector('[data-t="state"]').textContent=`state: ${e.detail.to}`;
    if(e.detail.to==='idle' && locked){
      locked=false; commit.disabled=false; button.disabled=false; stage.dataset.interfaceHot='0';
      logEvent(root,'ground','система снова делает вид, что всё нормально');
      refreshAssignment(Date.now()+st.cycles*19);
    }
  });
  document.addEventListener('protocol:comendant-arrived',()=>{logEvent(root,'pathos','КОМЕНДАНТ ВОШЁЛ В КАДР. НЕ ДЫШИТЕ.');});
  document.addEventListener('protocol:overheat',()=>{logEvent(root,'glitch','перегрев: причинность Мёбиуса взяла управление');});
  document.addEventListener('protocol:reset',()=>{logEvent(root,'ground','остаток сохранён / миф временно охлаждён');});
  refreshAssignment();
}

function initGlobal(){
  const cursor=document.createElement('div');cursor.className='dissonance-cursor';cursor.textContent='не назначено';document.body.appendChild(cursor);
  document.addEventListener('pointermove',e=>{cursor.style.left=`${e.clientX+14}px`;cursor.style.top=`${e.clientY+14}px`});
  let enabled=false;
  document.addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    if(e.key.toLowerCase()==='x'){enabled=!enabled;document.body.dataset.cursor=enabled?'1':'0';cursor.textContent=enabled?'ОБЪЕКТ СЛЕВАЕТСЯ С ФОНОМ':'НЕ НАЗНАЧЕНО';}
    if(e.key==='1'){document.body.classList.toggle('panic-418');}
  });
  document.querySelectorAll('.work-card').forEach(card=>{
    card.addEventListener('mouseenter',()=>{
      if(Math.random()<.22){card.dataset.ghost='1';setTimeout(()=>delete card.dataset.ghost,700)}
    });
  });
}

window.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('[data-ritual-root]'); if(root) initHomeMechanics(root);
  initGlobal();
});
