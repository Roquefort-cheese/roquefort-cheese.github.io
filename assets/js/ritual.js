// assets/js/ritual.js
//
// RitualButton + PhaseStage ("Комната 418"). Единственный модуль, которому
// разрешено запускать GlitchLayer и диалект-трансформацию (см. §3 ТЗ —
// "ни один компонент библиотеки или страницы работы не имеет права
// самостоятельно запускать глитч").
//
// DescendCTA физически не существует в DOM, пока не случится хотя бы
// один protocol:reset — это не CSS display:none, а буквальное отсутствие узла.

import { PhaseMachineController } from './state-machine.js';

const RECIPES = [
  {
    id: 'vantuz',
    dialect: 'holding',
    title: 'Мудрец Целибата',
    object: 'вантуз на деревянной ручке',
    wrongFunction: 'скипетр, прочищающий карму этажа',
    material: 'материальное возражение: треснувшая резиновая часть',
    img: 'assets/img/vantuz-sudby.svg',
  },
  {
    id: 'udlinitel',
    dialect: 'fixation',
    title: 'Архонт Недосланного',
    object: 'удлинитель для розетки на двоих',
    wrongFunction: 'чётки, перебираемые вместо ответа на сообщение',
    material: 'материальное возражение: зависший пиксель «печатает…»',
    img: 'assets/img/archont-nedoslannogo.svg',
  },
  {
    id: 'fedora',
    dialect: 'fixation',
    title: 'Властелин Дофамина',
    object: 'старая шляпа-федора',
    wrongFunction: 'трон для медитации перед бесконечной лентой',
    material: 'материальное возражение: обшарпанная кровать в кадре',
    img: 'assets/img/vlastelin-dofamina.svg',
  },
  {
    id: 'tablichka',
    dialect: 'generation',
    title: 'Осеменитель',
    object: 'самодельная табличка с расписанием на шее',
    wrongFunction: 'скрижаль творения, из которой рождаются галактики',
    material: 'материальное возражение: кустарный шрифт на табличке',
    img: 'assets/img/osemenitel.svg',
  },
];

function pick(arr, excludeId) {
  const pool = excludeId ? arr.filter((r) => r.id !== excludeId) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function initRitual(root) {
  const stage = root.querySelector('.phase-stage');
  const figureWrap = stage.querySelector('.phase-stage__figure');
  const caption = stage.querySelector('.phase-stage__caption');
  const titleReveal = stage.querySelector('.title-reveal');
  const materialMark = stage.querySelector('.material-mark');
  const glitchLayer = stage.querySelector('.glitch-layer');
  const comendantBanner = root.querySelector('.comendant-banner');
  const button = root.querySelector('.btn--ritual');
  const ritualZone = root.querySelector('.ritual-zone');

  const machine = new PhaseMachineController(root);
  let lastRecipeId = null;
  let descendMounted = false;

  function setPhase(p) {
    stage.dataset.phase = p;
  }

  function runTransformation() {
    const recipe = pick(RECIPES, lastRecipeId);
    lastRecipeId = recipe.id;

    document.dispatchEvent(new CustomEvent('ritual:pressure-start', {
      detail: { sourceImageId: recipe.id, dialect: recipe.dialect },
    }));

    stage.dataset.dialect = recipe.dialect;
    setPhase('pressure');
    caption.textContent = `давление: ${recipe.object}`;
    figureWrap.innerHTML = recipe.img.endsWith('.svg')
      ? `<object type="image/svg+xml" data="${recipe.img}" aria-hidden="true"></object>`
      : `<img src="${recipe.img}" alt="" aria-hidden="true">`;

    window.setTimeout(() => {
      document.dispatchEvent(new CustomEvent('ritual:wrong-assignment', {
        detail: { objectId: recipe.id, wrongFunction: recipe.wrongFunction, dialect: recipe.dialect },
      }));
      machine.transition('transformation');
      setPhase('wrong-assignment');
      caption.textContent = `неправильное назначение: ${recipe.wrongFunction}`;

      window.setTimeout(() => {
        setPhase('performance');
        caption.textContent = 'перформанс: свидетели не отводят взгляд';
      }, 650);

      window.setTimeout(() => {
        setPhase('title');
        titleReveal.textContent = recipe.title;
      }, 1300);

      window.setTimeout(() => {
        setPhase('apotheosis');
        materialMark.textContent = recipe.material;
      }, 2000);

      window.setTimeout(() => {
        setPhase('overheat');
        stage.dataset.glitch = '1';
        machine.transition('overheat');
      }, 2900);
    }, 900);
  }

  button.addEventListener('click', () => {
    if (machine.state !== 'idle') return;
    button.disabled = true;
    machine.transition('pressure');
    runTransformation();
  });

  document.addEventListener('protocol:comendant-arrived', () => {
    comendantBanner.dataset.active = '1';
    button.disabled = true;
  });
  document.addEventListener('protocol:comendant-collapse', () => {
    comendantBanner.dataset.active = '0';
    // краткая стерильная фаза перед обычным давлением, без ручного нажатия
    if (machine.state === 'idle') runTransformation();
  });

  document.addEventListener('protocol:reset', () => {
    setPhase('reset');
    stage.dataset.glitch = '0';
    titleReveal.textContent = '';
    materialMark.textContent = '';
    caption.textContent = 'сброс: интерфейс остывает';
  });

  document.addEventListener('protocol:phase-change', (e) => {
    if (e.detail.to === 'idle') {
      button.disabled = false;
      caption.textContent = '';
      if (!descendMounted) {
        mountDescendCTA(ritualZone);
        descendMounted = true;
      }
    }
  });

  function mountDescendCTA(container) {
    const wrap = document.createElement('div');
    wrap.className = 'descend-cta';
    wrap.innerHTML = `
      <a class="btn btn--ghost" data-descend href="/works/">Спуститься на линолеум</a>
      <a class="link-secondary" href="/protocol/">Изучить грамматику</a>
    `;
    container.appendChild(wrap);
    wrap.querySelector('[data-descend]').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('ritual:descend-to-linoleum', {}));
    });
  }

  return machine;
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-ritual-root]');
  if (root) initRitual(root);
});
