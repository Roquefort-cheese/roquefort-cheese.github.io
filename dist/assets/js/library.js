// assets/js/library.js
//
// Владеет данными архива и рендером LibraryGrid. Фильтрует только по
// publicationStatus === 'published' — правило §4.4: publicationStatus
// фильтрует видимость, narrativePhase лишь описывает содержание, поэтому
// в библиотеке может стоять рядом «давление» и «апофеоз».

import { initFilterPanel } from './filters.js';

const DIALECT_LABEL = {
  holding: 'Удержание', fixation: 'Залипание', generation: 'Порождение', 'zero-reaction': 'Нулевая реакция',
};
const TYPE_LABEL = {
  theophany: 'теофания', chronicle: 'хроника', artifact: 'артефакт',
  'negative-icon': 'отрицательная икона', residue: 'остаток', protocol: 'протокол',
};
const PHASE_LABEL = {
  pressure: 'давление', 'wrong-assignment': 'неправильное назначение', performance: 'перформанс',
  title: 'титул', apotheosis: 'апофеоз', overheat: 'перегрев', trial: 'суд', linoleum: 'линолеум',
  residue: 'остаток', fermentation: 'брожение',
};

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function workCard(work) {
  const a = document.createElement('a');
  a.href = `/works/${work.slug}/`;
  a.className = 'work-card' + (work.publicationStatus === 'archived' ? ' work-card--archived' : '');
  a.dataset.dialect = work.visualDialect;
  a.dataset.type = work.type;
  const mediaSrc = String(work.thumb || '');
  a.innerHTML = `
    <div class="work-card__media"><img src="/${escapeHTML(mediaSrc)}" alt="" loading="lazy" decoding="async">
      ${work.mediaHeld ? '<span class="work-card__held">медиа удержано</span>' : ''}
    </div>
    <div class="work-card__body">
      <div class="work-card__tags">
        <span class="tag tag--dialect">${escapeHTML(DIALECT_LABEL[work.visualDialect] || work.visualDialect)}</span>
        <span class="tag">${escapeHTML(TYPE_LABEL[work.type] || work.type)}</span>
        ${work.publicationStatus === 'archived' ? '<span class="tag">архив</span>' : ''}
      </div>
      <h3 class="work-card__title">${escapeHTML(work.title)}</h3>
      ${work.pageNumber ? `<p class="tag">страница ${escapeHTML(work.pageNumber)}</p>` : ''}
      <p class="work-card__summary">${escapeHTML(work.summary)}</p>
      <span class="tag">${escapeHTML(PHASE_LABEL[work.narrativePhase] || work.narrativePhase)}</span>
    </div>
  `;
  return a;
}

export function initLibrary(root, allWorks) {
  const grid = root.querySelector('.grid-works');
  const meta = root.querySelector('.results-meta');
  const raiseBtn = root.querySelector('[data-raise]');

  const visible = allWorks.filter((w) => w.publicationStatus === 'published');
  document.dispatchEvent(new CustomEvent('library:loaded', { detail: { count: visible.length } }));

  let lastRaisedId = null;

  function matches(work, filters) {
    if (filters.process && work.process !== filters.process) return false;
    if (filters.phase && work.narrativePhase !== filters.phase) return false;
    if (filters.type && work.type !== filters.type) return false;
    if (filters.bodyNode && work.bodyNode !== filters.bodyNode) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = `${work.title} ${work.summary} ${work.wrongFunction || ''} ${work.originalFunction || ''} ${work.pageText || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function sortWorks(list, mode) {
    const copy = [...list];
    if (mode === 'relations') {
      copy.sort((a, b) => (b.relationDegree - a.relationDegree) || (a.chronologyIndex - b.chronologyIndex));
    } else {
      copy.sort((a, b) => a.chronologyIndex - b.chronologyIndex);
    }
    return copy;
  }

  function render({ filters, sort }) {
    const filtered = sortWorks(visible.filter((w) => matches(w, filters)), sort);
    grid.innerHTML = '';
    root.dataset.libraryState = filtered.length ? 'ready' : 'empty';
    filtered.forEach((w) => grid.appendChild(workCard(w)));
    meta.textContent = `${filtered.length} из ${visible.length} работ · сортировка: ${sort === 'relations' ? 'по связям' : 'по хронике'}`;
  }

  initFilterPanel(root, { onChange: render });

  if (raiseBtn) {
    raiseBtn.addEventListener('click', () => {
      const pool = visible.filter((w) => w.id !== lastRaisedId);
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      if (!chosen) return;
      lastRaisedId = chosen.id;
      document.dispatchEvent(new CustomEvent('library:raise-from-linoleum', { detail: { workId: chosen.id } }));
      window.location.href = `/works/${chosen.slug}/`;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-library-root]');
  if (!root) return;
  const dataEl = document.getElementById('works-data');
  const works = JSON.parse(dataEl.textContent);
  initLibrary(root, works);
});
