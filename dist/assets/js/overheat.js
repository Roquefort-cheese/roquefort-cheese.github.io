const root = document.querySelector('[data-overheat-root]');

if (root) {
  const payload = JSON.parse(document.getElementById('overheat-data')?.textContent || '{}');
  const works = Array.isArray(payload.works) ? payload.works : [];
  const lore = payload.lore || {};
  const storeKey = 'p418.canonizer.v1';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const image = root.querySelector('[data-evidence-image]');
  const media = root.querySelector('[data-evidence-media]');
  const indexLabel = root.querySelector('[data-evidence-index]');
  const sourceTitle = root.querySelector('[data-evidence-title]');
  const sourceLink = root.querySelector('[data-evidence-link]');
  const groundText = root.querySelector('[data-ground-text]');
  const wrongText = root.querySelector('[data-wrong-text]');
  const canonTitle = root.querySelector('[data-canon-title]');
  const decreeText = root.querySelector('[data-decree-text]');
  const verdictText = root.querySelector('[data-verdict-text]');
  const faultText = root.querySelector('[data-fault-text]');
  const residueText = root.querySelector('[data-residue-text]');
  const action = root.querySelector('[data-canon-action]');
  const reroll = root.querySelector('[data-canon-reroll]');
  const reset = root.querySelector('[data-canon-reset]');
  const status = root.querySelector('[data-machine-state]');
  const entropyLabel = root.querySelector('[data-entropy]');
  const historyRoot = root.querySelector('[data-canon-history]');
  const secretStamp = root.querySelector('[data-secret-stamp]');
  const steps = [...root.querySelectorAll('[data-canon-step]')];

  let workIndex = -1;
  let step = 0;
  let dossier = null;
  let glitchTimer = 0;
  let memory = readMemory();

  function readMemory() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey) || '{}');
      return {
        cycles: Number(saved.cycles || 0),
        history: Array.isArray(saved.history) ? saved.history.slice(0, 4) : [],
      };
    } catch {
      return { cycles: 0, history: [] };
    }
  }

  function saveMemory() {
    try { sessionStorage.setItem(storeKey, JSON.stringify(memory)); } catch {}
  }

  function hash(seed) {
    let value = 2166136261;
    for (const char of String(seed)) {
      value ^= char.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function pick(list, seed) {
    if (!Array.isArray(list) || !list.length) return 'данные съел линолеум';
    return list[hash(seed) % list.length];
  }

  function isTypingTarget(target) {
    return target instanceof HTMLElement
      && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName));
  }

  function currentWork() { return works[workIndex] || null; }

  function makeDossier(work) {
    const entropy = hash(`${Date.now()}-${work.id}-${memory.cycles}`) % 419;
    const base = `${work.id}-${entropy}-${memory.cycles}`;
    return {
      entropy,
      wrong: `Улику «${work.title}» предлагается ${pick(lore.wrongAssignments, `${base}-wrong`)}.`,
      title: pick(lore.titles, `${base}-title`),
      decree: pick(lore.decrees, `${base}-decree`),
      verdict: pick(lore.verdicts, `${base}-verdict`),
      fault: pick(lore.faults, `${base}-fault`),
      residue: pick(lore.residues, `${base}-residue`),
    };
  }

  function setStep(nextStep) {
    step = nextStep;
    const phases = ['ground', 'absurd', 'pathos', 'glitch', 'residue'];
    const labels = [
      'УЛИКА СТАБИЛЬНА / ПОКА',
      'НЕПРАВИЛЬНАЯ ФУНКЦИЯ НАЗНАЧЕНА',
      'ТИТУЛ ВОЗЛОЖЕН / НЕ РЖАТЬ',
      'ОШИБКА ДОПУЩЕНА В КАНОН',
      'ОСТАТОК ЗАРЕГИСТРИРОВАН',
    ];
    const actions = [
      'НАЗНАЧИТЬ НЕПРАВИЛЬНО',
      'ВОЗВЕСТИ В САН',
      'ДОПУСТИТЬ ОШИБКУ',
      'ЗАФИКСИРОВАТЬ ОСТАТОК',
      'СЛЕДУЮЩАЯ УЛИКА',
    ];
    root.dataset.phase = phases[step];
    status.textContent = labels[step];
    action.textContent = actions[step];
    steps.forEach((item, index) => {
      item.dataset.state = index < step ? 'done' : index === step ? 'current' : 'waiting';
      if (index === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
  }

  function clearReadout() {
    dossier = null;
    wrongText.textContent = 'должность ещё можно не выдавать';
    canonTitle.textContent = 'титул ожидает серьёзного лица';
    decreeText.textContent = 'декрет запечатан до следующего шага';
    verdictText.textContent = 'брань удерживается редакционной пломбой';
    faultText.textContent = 'E000 / МАШИНА ПРИТВОРЯЕТСЯ НОРМАЛЬНОЙ';
    residueText.textContent = 'остатка пока нет';
    entropyLabel.textContent = '000 / 418';
    root.dataset.secret = '0';
    secretStamp.hidden = true;
    setStep(0);
  }

  function updateURL(work) {
    if (!work?.pageNumber) return;
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(work.pageNumber).padStart(3, '0'));
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function selectWork(nextIndex) {
    if (!works.length) {
      action.disabled = true;
      reroll.disabled = true;
      status.textContent = 'КОРПУС НЕ ЗАГРУЖЕН';
      faultText.textContent = 'E404 / 105 СВИДЕТЕЛЕЙ НЕ ЯВИЛИСЬ';
      return;
    }
    workIndex = ((nextIndex % works.length) + works.length) % works.length;
    const work = currentWork();
    image.hidden = false;
    media.dataset.mediaError = '0';
    image.src = `/${String(work.image).replace(/^\/+/, '')}`;
    image.alt = work.alt || `Архивная улика: ${work.title}`;
    indexLabel.textContent = `УЛИКА ${String(work.pageNumber || workIndex + 1).padStart(3, '0')} / 105`;
    sourceTitle.textContent = work.title;
    sourceLink.href = `/works/${work.slug}/`;
    groundText.textContent = work.summary || work.analysis || 'Документ зафиксирован без дополнительных показаний.';
    clearReadout();
    updateURL(work);
  }

  function randomOtherIndex() {
    if (works.length < 2) return 0;
    let next = hash(`${Date.now()}-${memory.cycles}`) % works.length;
    if (next === workIndex) next = (next + 1) % works.length;
    return next;
  }

  function flashGlitch() {
    window.clearTimeout(glitchTimer);
    root.classList.add('is-glitching');
    glitchTimer = window.setTimeout(() => root.classList.remove('is-glitching'), reduceMotion ? 1 : 360);
  }

  function renderHistory() {
    historyRoot.replaceChildren();
    if (!memory.history.length) {
      const empty = document.createElement('li');
      empty.textContent = 'Журнал чист. Это подозрительно.';
      historyRoot.appendChild(empty);
      return;
    }
    memory.history.forEach((entry) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `/works/${entry.slug}/`;
      link.textContent = `${entry.evidence} → ${entry.title}`;
      const note = document.createElement('span');
      note.textContent = entry.fault;
      item.append(link, note);
      historyRoot.appendChild(item);
    });
  }

  function completeCycle() {
    const work = currentWork();
    memory.cycles += 1;
    memory.history.unshift({
      slug: work.slug,
      evidence: work.title,
      title: dossier.title,
      fault: dossier.fault,
    });
    memory.history = memory.history.slice(0, 4);
    saveMemory();
    renderHistory();
  }

  function advance() {
    const work = currentWork();
    if (!work) return;
    if (step === 4) {
      selectWork(randomOtherIndex());
      return;
    }
    if (!dossier) dossier = makeDossier(work);

    if (step === 0) {
      wrongText.textContent = dossier.wrong;
      verdictText.textContent = dossier.verdict;
      entropyLabel.textContent = `${String(dossier.entropy).padStart(3, '0')} / 418`;
      setStep(1);
      return;
    }
    if (step === 1) {
      canonTitle.textContent = dossier.title;
      decreeText.textContent = dossier.decree;
      setStep(2);
      return;
    }
    if (step === 2) {
      faultText.textContent = dossier.fault;
      setStep(3);
      flashGlitch();
      return;
    }
    residueText.textContent = dossier.residue;
    setStep(4);
    completeCycle();
  }

  function activateSecret() {
    const work = currentWork();
    if (!work || !lore.secret) return;
    dossier = {
      entropy: 418,
      wrong: `Улику «${work.title}» назначили ферментированным суперпользователем нижнего неба.`,
      title: lore.secret.title,
      decree: lore.secret.decree,
      verdict: lore.secret.verdict,
      fault: lore.secret.fault,
      residue: 'После root-доступа остаётся синяя плесень на журнале событий. Это не удалять.',
    };
    wrongText.textContent = dossier.wrong;
    canonTitle.textContent = dossier.title;
    decreeText.textContent = dossier.decree;
    verdictText.textContent = dossier.verdict;
    faultText.textContent = dossier.fault;
    entropyLabel.textContent = '418 / 418';
    root.dataset.secret = '1';
    secretStamp.hidden = false;
    setStep(3);
    flashGlitch();
  }

  image.addEventListener('error', () => {
    image.hidden = true;
    media.dataset.mediaError = '1';
    faultText.textContent = 'EIMG / СВИДЕТЕЛЬ НЕ ЗАГРУЗИЛСЯ / ПОКАЗАНО ОТСУТСТВИЕ';
    root.dataset.phase = 'glitch';
    status.textContent = 'МЕДИА ОТКАЗАЛОСЬ СВИДЕТЕЛЬСТВОВАТЬ';
  });
  image.addEventListener('load', () => { media.dataset.mediaError = '0'; image.hidden = false; });

  action.addEventListener('click', advance);
  reroll.addEventListener('click', () => selectWork(randomOtherIndex()));
  reset.addEventListener('click', clearReadout);

  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const keyBuffer = [];
  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
    keyBuffer.push(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    if (keyBuffer.length > konami.length) keyBuffer.shift();
    if (konami.every((key, index) => keyBuffer[index] === key)) {
      keyBuffer.length = 0;
      activateSecret();
    }
  });

  renderHistory();
  const requestedPage = Number(new URLSearchParams(window.location.search).get('page'));
  const requestedIndex = works.findIndex((work) => work.pageNumber === requestedPage);
  selectWork(requestedIndex >= 0 ? requestedIndex : hash(Date.now()) % Math.max(works.length, 1));
}
