import { PhaseMachineController } from './state-machine.js';

const CASES = [
  {
    id: 'vantuz',
    object: 'Вантуз', role: 'судья канализации', who: 'этажу 418', when: 'когда слив опять решил стать судьбой',
    why: 'чтобы канализация наконец получила власть, которой она давно добивалась',
    absurdity: 'инструмент для прочистки объявляется судебной инстанцией. Он всё ещё липкий.',
    title: 'ВАНТУЗ СУДЬБЫ',
    img: '/assets/img/vantuz-sudby.svg',
    caption: 'Судебное заседание началось. Первое решение: прочистить всё, включая отношения между соседями.',
    fail: 'Вантуз отказался давать комментарии и потребовал воды.',
    glitch: 'ERROR 418 / JURISDICTION = DRAIN / APPEAL = PUDDLE',
    after: 'Серёга нашёл изоленту. Заседание закрыто. Вантуз снова просто вантуз.',
  },
  {
    id: 'vlastelin',
    object: 'Телефон + федора', role: 'начальник отдела бесконечного скролла', who: 'тому, кто уже третий час листает ленту', when: 'когда палец снова делает «обновить»',
    why: 'чтобы назначение внимания наконец оформилось в должность',
    absurdity: 'интерфейс получает человека в собственность, но делает вид, что это карьерный рост.',
    title: 'ВЛАСТЕЛИН ДОФАМИНА',
    img: '/assets/img/vlastelin-dofamina.webp',
    caption: 'Пошёл официальный апгрейд: зависание признано формой медитации. Лайки признаны налогом.',
    fail: 'Контроль завис на 99%. Кнопка «выйти» зарегистрирована как миф.',
    glitch: 'BUFFERING / CONSCIOUSNESS = 99% / CANCEL = NOT AVAILABLE',
    after: 'Телефон положили экраном вниз. В комнате на восемь секунд стало тихо.',
  },
  {
    id: 'mudrets',
    object: 'Федора', role: 'держатель тёмной материи', who: 'Мудрецу Целибата', when: 'когда молчание стало слишком тяжёлым',
    why: 'чтобы неловкость наконец получила физический вес и перестала притворяться характером',
    absurdity: 'обычная шляпа объявляется космическим контейнером. Шов всё ещё кривой.',
    title: 'МУДРЕЦ ЦЕЛИБАТА',
    img: '/assets/img/mudrets-tselibata.webp',
    caption: 'Тёмная материя прошла через федору. Мудрец делает вид, что так и планировал. Никто ему не верит.',
    fail: 'Сдерживание лопнуло первым. Потом титул начал отвечать за человека.',
    glitch: 'NULL / SHAME MASS = 418 / HAT = TOO IMPORTANT',
    after: 'Кто-то просто спросил: «Ты норм?» И на секунду вся магия стала не нужна.',
  },
  {
    id: 'osemenitel',
    object: 'Картонная табличка', role: 'скрижаль производства новых вселенных', who: 'тому, кто опять придумал новый проект', when: 'когда идей уже больше, чем места в чате',
    why: 'чтобы производство форм наконец признало, что оно не остановится само',
    absurdity: 'самодельный картон получает полномочия космогенеза. На обороте остаётся ценник.',
    title: 'ОСЕМЕНИТЕЛЬ',
    img: '/assets/img/osemenitel.webp',
    caption: 'Открыт новый отдел по производству галактик. Штат: один человек, три идеи и слишком много энергии.',
    fail: 'Новая вселенная появилась до того, как согласовали название. Теперь это проблема отдела.',
    glitch: 'SPAWN FAILED / TOO MANY WORLDS / DELETE BUTTON HAS CHILDREN',
    after: 'Список дел всё-таки закрыли. Одну идею оставили жить. Остальные пошли в сон.',
  },
];

const GLITCHES = [
  'ПОДТВЕРЖДЕНО / НО НЕ УПОЛНОМОЧЕНО',
  'ОБЪЕКТ СТАЛ СЛИШКОМ УВЕРЕН В СЕБЕ',
  '418 / НАЗНАЧЕНИЕ УШЛО В САМОСТОЯТЕЛЬНОЕ ПЛАВАНИЕ',
  'СИСТЕМА ПЕРЕДУМАЛА. ПОЗДНО.',
];

const pick = (arr, seed = Date.now()) => arr[Math.floor(Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % arr.length)];
const readMemory = () => { try { return JSON.parse(sessionStorage.getItem('p418.ritual.v2') || '{}'); } catch { return {}; } };
const writeMemory = (x) => { try { sessionStorage.setItem('p418.ritual.v2', JSON.stringify(x)); } catch {} };
const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function initRitual(root) {
  const button = root.querySelector('.btn--ritual');
  const reroll = root.querySelector('[data-reroll]');
  const stage = root.querySelector('.ritual-stage');
  const figure = root.querySelector('.ritual-stage__figure');
  const stageLabel = root.querySelector('[data-stage-label]');
  const stageCount = root.querySelector('[data-stage-count]');
  const stageTitle = root.querySelector('[data-stage-title]');
  const caption = root.querySelector('[data-stage-caption]');
  const glitch = root.querySelector('[data-stage-glitch]');
  const aftercare = root.querySelector('[data-aftercare]');
  const aftercareText = root.querySelector('[data-aftercare-text]');
  const history = root.querySelector('[data-history]');
  const fields = Object.fromEntries(['who','when','why','absurdity','object','role','status'].map(k=>[k,root.querySelector(`[data-field="${k}"]`) || root.querySelector(`[data-status]`)]));
  if (!button || !stage || !figure) return null;

  const machine = new PhaseMachineController(root);
  let memory = readMemory();
  memory.cycles = Number(memory.cycles || 0);
  memory.history = Array.isArray(memory.history) ? memory.history : [];
  let current = null;
  let busy = false;

  function setField(key, text) { const el = fields[key]; if (el) el.textContent = text; }
  function renderHistory() {
    if (!history) return;
    history.innerHTML = memory.history.length
      ? memory.history.slice(0,3).map(h=>`<span>${esc(h.title)} <i>/${esc(h.mode)}</i></span>`).join('')
      : 'пока чисто';
  }
  function choose(seed = Date.now()) {
    const pool = CASES.filter(x=>x.id !== current?.id);
    current = pick(pool, seed);
    setField('who', current.who); setField('when', current.when); setField('why', current.why);
    setField('absurdity', current.absurdity); setField('object', current.object); setField('role', current.role);
    setField('status', 'назначение не подтверждено');
    reroll.disabled = false;
    reroll.textContent = 'другой объект';
    stage.dataset.phase = 'brief';
    stage.dataset.dialect = current.id === 'mudrets' ? 'holding' : current.id === 'vlastelin' ? 'fixation' : current.id === 'osemenitel' ? 'generation' : 'holding';
    figure.innerHTML = `<img src="${esc(current.img)}" alt="${esc(current.title)}" decoding="async">`;
    stageLabel.textContent = 'ПРОЕКТ НАЗНАЧЕНИЯ';
    stageTitle.textContent = current.title;
    caption.textContent = 'Вот кандидат. Можно ещё отступить. Через секунду будет поздно.';
    figure.innerHTML = '';
    glitch.textContent = '';
    aftercare.hidden = true;
  }

  function setButton(text, disabled=false) { button.textContent = text; button.disabled = disabled; }
  function finish() {
    machine.transition('reset', { auto: true });
  }
  function commit() {
    if (!current || busy) return;
    busy = true;
    reroll.disabled = true;
    setField('status','ОТМЕНА ЗАПРЕЩЕНА');
    setButton('НАЗНАЧЕНИЕ ПРИНЯТО', true);
    document.dispatchEvent(new CustomEvent('ritual:assignment-committed', { detail: current }));
    machine.transition('pressure');

    stage.dataset.phase = 'appointment';
    stageLabel.textContent = 'НАЗНАЧЕНИЕ ВСТУПИЛО В СИЛУ';
    figure.innerHTML = `<img src="${esc(current.img)}" alt="${esc(current.title)}" decoding="async">`;
    stageTitle.textContent = current.title;
    caption.textContent = current.caption;

    window.setTimeout(() => {
      machine.transition('transformation');
      stage.dataset.phase = 'consequence';
      stageLabel.textContent = 'ПОШЛО НЕ ТАК';
      caption.textContent = current.fail;
    }, 1200);

    window.setTimeout(() => {
      stage.dataset.phase = 'glitch';
      stageLabel.textContent = 'СИСТЕМА ПРОСИТ НЕ ДЕЛАТЬ ВИД, ЧТО ЭТО НОРМАЛЬНО';
      glitch.textContent = current.glitch + ' // ' + pick(GLITCHES);
      document.body.classList.add('ritual-glitch');
      window.setTimeout(() => document.body.classList.remove('ritual-glitch'), 320);
    }, 2100);

    window.setTimeout(() => {
      stage.dataset.phase = 'aftercare';
      stageLabel.textContent = 'И ЧТО ОСТАЛОСЬ ПОСЛЕ';
      caption.textContent = 'Гротеск заканчивается там, где кто-то остаётся человеком.';
      aftercare.hidden = false;
      aftercareText.textContent = current.after;
      memory.cycles += 1;
      memory.history.unshift({ title: current.title, mode: current.role });
      memory.history = memory.history.slice(0, 3);
      writeMemory(memory);
      stageCount.textContent = `цикл ${String(memory.cycles).padStart(3,'0')}`;
      renderHistory();
    }, 3000);

    window.setTimeout(() => finish(), 4700);
  }

  button.addEventListener('click', () => {
    if (busy) return;
    if (!current || stage.dataset.phase === 'idle') {
      choose();
      setButton('Да. Это плохая идея', false);
      return;
    }
    if (stage.dataset.phase === 'brief') commit();
  });
  reroll.addEventListener('click', () => { if (!busy) choose(Date.now() + 97); });

  document.addEventListener('protocol:phase-change', (e) => {
    if (e.detail.to === 'idle') {
      busy = false;
      current = null;
      setButton('Назначить неправильно', false);
      reroll.disabled = true;
      setField('status','можно повторить');
      stage.dataset.phase = 'idle';
      stageLabel.textContent = 'КОМНАТА ЖДЁТ';
      stageTitle.textContent = 'Последствия закончились. Следствие — нет.';
      caption.textContent = 'Следующий цикл может опровергнуть предыдущий. Это нормально для 418.';
    }
  });
  document.addEventListener('protocol:comendant-arrived',()=>{
    root.dataset.comendant='1';
    root.querySelector('.comendant-banner').dataset.active='1';
  });
  document.addEventListener('protocol:comendant-collapse',()=>{
    root.dataset.comendant='0';
    root.querySelector('.comendant-banner').dataset.active='0';
  });
  document.addEventListener('protocol:reset',()=>{
    writeMemory(memory);
  });

  renderHistory();
  stageCount.textContent = `цикл ${String(memory.cycles).padStart(3,'0')}`;
  return machine;
}

document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('[data-ritual-root]');
  if(root) initRitual(root);
});
