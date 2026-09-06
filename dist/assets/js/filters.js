// assets/js/filters.js
//
// FilterPanel читает/пишет состояние фильтров в query string, чтобы прямая
// ссылка на /works/?type=theophany&process=holding восстанавливала вид 1:1
// при перезагрузке. SortControl физически поддерживает только два режима —
// "chronicle" и "relations"; значения "popularity" не существует ни в
// разметке (см. works/index.html), ни здесь.

const FIELDS = ['process', 'phase', 'type', 'bodyNode', 'editorialMode', 'q'];
const SORT_MODES = ['chronicle', 'relations'];

export function readFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  const filters = {};
  for (const f of FIELDS) {
    const v = params.get(f);
    if (v) filters[f] = v;
  }
  const sort = params.get('sort');
  return { filters, sort: SORT_MODES.includes(sort) ? sort : 'chronicle' };
}

function serialize(filters, sort) {
  const params = new URLSearchParams();
  for (const f of FIELDS) {
    if (filters[f]) params.set(f, filters[f]);
  }
  if (sort && sort !== 'chronicle') params.set('sort', sort);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function initFilterPanel(root, { onChange }) {
  const panel = root.querySelector('.filter-panel');
  const sortButtons = root.querySelectorAll('.sort-control [data-sort]');
  const resetBtn = root.querySelector('[data-filters-reset]');

  let { filters, sort } = readFiltersFromURL();
  applyToControls();

  function applyToControls() {
    panel.querySelectorAll('select, input').forEach((el) => {
      const key = el.dataset.filterKey;
      if (!key) return;
      el.value = filters[key] || '';
    });
    sortButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.sort === sort));
    });
  }

  let debounceTimer = null;
  function commit() {
    document.dispatchEvent(new CustomEvent('library:filter-change', { detail: { filters } }));
    onChange({ filters, sort });
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      const qs = serialize(filters, sort);
      window.history.replaceState(null, '', qs || window.location.pathname);
      document.dispatchEvent(new CustomEvent('library:filters-serialized', { detail: { queryString: qs } }));
    }, 250);
  }

  panel.addEventListener('input', (e) => {
    const key = e.target.dataset.filterKey;
    if (!key) return;
    const v = e.target.value;
    if (v) filters[key] = v; else delete filters[key];
    commit();
  });

  sortButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      sort = btn.dataset.sort;
      sortButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      document.dispatchEvent(new CustomEvent('library:sort-change', { detail: { mode: sort } }));
      onChange({ filters, sort });
      const qs = serialize(filters, sort);
      window.history.replaceState(null, '', qs || window.location.pathname);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      filters = {};
      applyToControls();
      commit();
    });
  }

  // первичный рендер по состоянию из URL
  onChange({ filters, sort });
}
