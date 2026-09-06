#!/usr/bin/env node
// scripts/build.mjs
//
// Генерирует /index.html, /works/index.html, /works/{slug}/index.html,
// /protocol/index.html из content/*.json. Ручного HTML на каждую работу
// нет — см. критерий приёмки в §8 ТЗ.
//
// content/private/consent-ledger.json НИКОГДА не читается и не копируется
// этим скриптом (§6.1).

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  SITE_ROOT, loadWorks, loadJSON, validateWorks, indexById, buildableWorks, listedWorks,
  TYPE_ENUM, PROCESS_ENUM, PHASE_ENUM, STATUS_ENUM,
} from './lib.mjs';

const TYPE_LABEL = {
  theophany: 'теофания', chronicle: 'хроника', artifact: 'артефакт',
  'negative-icon': 'отрицательная икона', residue: 'остаток', protocol: 'протокол',
};
const PROCESS_LABEL = { holding: 'Удержание', fixation: 'Залипание', generation: 'Порождение', 'zero-reaction': 'Нулевая реакция' };
const PHASE_LABEL = {
  pressure: 'давление', 'wrong-assignment': 'неправильное назначение', performance: 'перформанс',
  title: 'титул', apotheosis: 'апофеоз', overheat: 'перегрев', trial: 'суд', linoleum: 'линолеум',
  residue: 'остаток', fermentation: 'брожение',
};
const STATUS_LABEL = { draft: 'черновик', review: 'на проверке', 'rights-cleared': 'права подтверждены', published: 'опубликовано', archived: 'архив' };
const RELATION_LABEL = { 'cause-of': 'причина для', 'residue-of': 'остаток от', 'fermentation-of': 'брожение от' };

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mediaTag(work, { klass = '' } = {}) {
  const m = work.media?.[0];
  if (!m) return '';
  const alt = esc(work.altText || '');
  if (m.src.endsWith('.svg')) {
    return `<object class="${klass}" type="image/svg+xml" data="/${m.src}" aria-label="${alt}">${alt}</object>`;
  }
  return `<img class="${klass}" src="/${m.src}" alt="${alt}">`;
}

function layout({ title, description, active, bodyClass = '', extraHead = '', content, extraScripts = '' }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Протокол 418</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=PT+Serif:ital,wght@0,400;0,700;1,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/layout.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/states.css">
${extraHead}
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">К содержанию</a>
<header class="site-header">
  <a class="site-header__mark" href="/">ПРОТОКОЛ <strong>418</strong></a>
  <nav aria-label="Основная навигация">
    <ul class="site-nav">
      <li><a href="/" ${active === 'home' ? 'aria-current="page"' : ''}>Мембрана</a></li>
      <li><a href="/works/" ${active === 'works' ? 'aria-current="page"' : ''}>Линолеумный архив</a></li>
      <li><a href="/protocol/" ${active === 'protocol' ? 'aria-current="page"' : ''}>Бюро</a></li>
    </ul>
  </nav>
</header>
<main id="main">
${content}
</main>
<footer class="site-footer">
  <span>Протокол 418. Линолеумное небо — иррациональная мифопоэтическая система.</span>
  <span>Согласие изображённых людей и данные о правах ведутся в приватном реестре и не публикуются.</span>
</footer>
<script type="module" src="/assets/js/media-viewer.js"></script>
${extraScripts}
</body>
</html>`;
}

// ---------------------------------------------------------------- index.html
function renderHome() {
  const content = `
<section class="page">
  <p class="tag">/ — Мембрана 418</p>
  <h1>Комната, которая отвечает ошибкой</h1>
  <p class="page-lede">Внешний мир посылает запрос нормы: будь студентом, специалистом, объяснимым. Комната № 418 пока молчит. Нажмите «Назначить неправильно» — единственное активное действие на этом экране.</p>

  <div class="membrane-hero">
    <figure>
      ${mediaTag({ media: [{ src: 'assets/img/membrane-hero.svg' }], altText: 'Потолок комнаты с лампой на проводе, приколотое расписание и календарь с обведённым дедлайном.' })}
      <figcaption>внешний запрос нормы: расписание, лампа, дедлайн</figcaption>
    </figure>
    <div class="stack">
      <p>«Не мир про общежитие, а общежитие как способ, которым мир ошибается насчёт самого себя».</p>
      <p class="page-lede">Ничего священного здесь ещё не произошло. Ни апофеоза, ни титула, ни золота — только нормативный слой: потолок, лампа, расписание.</p>
    </div>
  </div>

  <div data-ritual-root>
    <div class="ritual-zone">
      <button class="btn btn--ritual" type="button">Назначить неправильно</button>
      <div class="phase-stage" data-phase="idle">
        <div class="comendant-banner" data-active="0">
          <p>комендант приехал — интерфейс временно притворяется нормой</p>
        </div>
        <div class="phase-stage__figure" aria-hidden="true"></div>
        <p class="phase-stage__idle">Комната ждёт. Ничего не назначено — ни функция, ни титул, ни вина.</p>
        <div class="phase-stage__meta">
          <span class="title-reveal"></span>
          <span class="material-mark"></span>
        </div>
        <p class="phase-stage__caption" aria-live="polite"></p>
        <div class="glitch-layer" aria-hidden="true"></div>
      </div>
    </div>
  </div>

  <section class="section">
    <h2>Формула комнаты</h2>
    <p class="formula-strip">
      <span>давление сверху</span><span>неправильное назначение</span><span>перформанс</span>
      <span>титул</span><span>апофеоз</span><span>перегрев знаков</span><span>суд собственной системы</span>
      <span>линолеум</span><span>незаснятый остаток</span>
    </p>
  </section>
</section>`;
  return layout({
    title: 'Мембрана 418',
    description: 'Комната № 418 отвечает на запрос нормы ошибкой. Назначьте неправильно — и посмотрите, как обычный предмет становится теофанией.',
    active: 'home',
    content,
    extraScripts: '<script type="module" src="/assets/js/ritual.js"></script>',
  });
}

// -------------------------------------------------------------- works index
function renderWorksIndex(works) {
  const listed = listedWorks(works);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const processes = uniq(listed.map((w) => w.process));
  const phases = uniq(listed.map((w) => w.narrativePhase));
  const types = uniq(listed.map((w) => w.type));
  const bodyNodes = uniq(listed.map((w) => w.bodyNode)).filter((b) => b && b !== '—');

  const opt = (label, val) => `<option value="${esc(val)}">${esc(label)}</option>`;

  const noscriptList = listed.map((w) => `<li><a href="/works/${w.slug}/">${esc(w.title)}</a> — ${esc(w.summary)}</li>`).join('\n');

  const content = `
<section class="page page--wide">
  <p class="tag">/works — Линолеумный архив</p>
  <h1>Слой пола после катастрофы</h1>
  <p class="page-lede">Всё, что не поместилось в биографию обитателей комнаты, оседает здесь. Архивные записи делистятся из общей витрины, но их адреса остаются живыми.</p>

  <div data-library-root>
    <form class="filter-panel" aria-label="Фильтры архива">
      <div class="filter-field">
        <label for="f-process">Процесс</label>
        <select id="f-process" data-filter-key="process"><option value="">любой</option>${processes.map((p) => opt(PROCESS_LABEL[p] || p, p)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-phase">Фаза</label>
        <select id="f-phase" data-filter-key="phase"><option value="">любая</option>${phases.map((p) => opt(PHASE_LABEL[p] || p, p)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-type">Тип</label>
        <select id="f-type" data-filter-key="type"><option value="">любой</option>${types.map((t) => opt(TYPE_LABEL[t] || t, t)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-body">Телесный узел</label>
        <select id="f-body" data-filter-key="bodyNode"><option value="">любой</option>${bodyNodes.map((b) => opt(b, b)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-q">Предмет / поиск</label>
        <input id="f-q" type="search" data-filter-key="q" placeholder="вантуз, удлинитель…">
      </div>
      <div class="filter-panel__actions">
        <button type="button" class="btn btn--ghost btn--small" data-filters-reset>Сбросить</button>
      </div>
    </form>

    <div class="cluster" style="justify-content:space-between; margin-bottom:1rem;">
      <div class="sort-control">
        <span>Сортировка:</span>
        <div role="radiogroup" aria-label="Сортировка архива">
          <button type="button" data-sort="chronicle" aria-pressed="true">по хронике</button>
          <button type="button" data-sort="relations" aria-pressed="false">по связям</button>
        </div>
      </div>
      <button type="button" class="btn btn--ghost" data-raise>Поднять с линолеума</button>
    </div>

    <p class="results-meta" aria-live="polite"></p>
    <div class="grid-works" data-library-state="loading"></div>

    <noscript>
      <p class="status-note">JavaScript отключён — показан полный список без фильтров и сортировки.</p>
      <ul>${noscriptList}</ul>
    </noscript>

    <script type="application/json" id="works-data">${JSON.stringify(listed.map((w) => ({
      id: w.id, slug: w.slug, title: w.title, summary: w.summary, type: w.type,
      process: w.process, narrativePhase: w.narrativePhase, bodyNode: w.bodyNode,
      visualDialect: w.visualDialect, publicationStatus: w.publicationStatus,
      thumb: w.media?.[0]?.src, wrongFunction: w.object?.wrongFunction, originalFunction: w.object?.originalFunction,
      chronologyIndex: w._chronologyIndex, relationDegree: w._relationDegree,
    })))}</script>
  </div>
</section>`;
  return layout({
    title: 'Линолеумный архив',
    description: 'Библиотека работ Протокола 418: теофании, хроники, остатки и отрицательные иконы комнаты № 418.',
    active: 'works',
    content,
    extraScripts: '<script type="module" src="/assets/js/library.js"></script>',
  });
}

// -------------------------------------------------------------- work detail
function renderWorkDetail(work, byId) {
  const blocks = [];

  // 1. WorkHeader — человек и усталость раньше эффекта
  if (work.humanAnchor || work.deficit) {
    blocks.push(`
    <div class="work-detail__block work-header">
      <div class="work-header__media">${mediaTag(work)}</div>
      <div>
        <p class="work-header__eyebrow">${TYPE_LABEL[work.type] || work.type} · ${PROCESS_LABEL[work.process] || work.process}</p>
        <h1>${esc(work.title)}</h1>
        <p>${esc(work.summary)}</p>
        ${work.humanAnchor ? `<p>${esc(work.humanAnchor)}</p>` : ''}
        ${work.deficit ? `<p class="work-header__deficit">дефицит: ${esc(work.deficit)}</p>` : ''}
      </div>
    </div>`);
  } else {
    // если человеческого якоря нет (напр. residue) — всё равно человек/эффект блок в сокращённом виде, порядок не меняется
    blocks.push(`
    <div class="work-detail__block work-header">
      <div class="work-header__media">${mediaTag(work)}</div>
      <div>
        <p class="work-header__eyebrow">${TYPE_LABEL[work.type] || work.type} · ${PROCESS_LABEL[work.process] || work.process}</p>
        <h1>${esc(work.title)}</h1>
        <p>${esc(work.summary)}</p>
      </div>
    </div>`);
  }

  // 2. ObjectDossier — бытовой источник и неправильная функция
  if (work.object && (work.object.originalFunction || work.object.wrongFunction)) {
    blocks.push(`
    <div class="work-detail__block">
      <h2>Досье предмета</h2>
      <table class="dossier-table">
        ${work.object.originalFunction ? `<tr><th>исходная функция</th><td>${esc(work.object.originalFunction)}</td></tr>` : ''}
        ${work.object.wrongFunction ? `<tr><th>неправильное назначение</th><td>${esc(work.object.wrongFunction)}</td></tr>` : ''}
        ${work.bodyNode && work.bodyNode !== '—' ? `<tr><th>телесный источник</th><td>${esc(work.bodyNode)}</td></tr>` : ''}
      </table>
    </div>`);
  }

  // 3. TitleBadge + JudgmentPanel — способность, внутренний дефект, суд
  if (work.blessing || work.internalDefect || work.judgment) {
    blocks.push(`
    <div class="work-detail__block">
      <span class="title-badge" style="opacity:1;transform:none;">${esc(work.title)}</span>
      <dl class="judgment-panel">
        ${work.blessing ? `<div><dt>дар титула</dt><dd>${esc(work.blessing)}</dd></div>` : ''}
        ${work.internalDefect ? `<div><dt>внутренний дефект</dt><dd>${esc(work.internalDefect)}</dd></div>` : ''}
        ${work.judgment ? `<div><dt>суд</dt><dd>${esc(work.judgment)}</dd></div>` : ''}
      </dl>
    </div>`);
  } else if (work.type === 'negative-icon') {
    blocks.push(`
    <div class="work-detail__block">
      <p class="status-note">Отрицательная икона: дар и суд намеренно остаются пустыми — это фиксирует сам отказ от апофеоза.</p>
    </div>`);
  }

  // 4. MaterialObjectionMark — материальный остаток (обязателен там, где есть)
  if (work.materialObjection) {
    blocks.push(`
    <div class="work-detail__block">
      <div class="material-objection"><strong>материальное возражение</strong>${esc(work.materialObjection)}</div>
    </div>`);
  }

  // ContentNoticeGate — только если применимо
  const mediaBlock = work.contentNotice
    ? `<div class="work-detail__block">
        <details class="notice-gate" data-work-id="${esc(work.id)}">
          <summary>
            <h3>Предупреждение о содержании</h3>
            <p>${esc(work.contentNotice)}</p>
            <span class="btn">Показать материал</span>
          </summary>
          <div class="notice-gate__content">${mediaTag(work)}</div>
        </details>
      </div>`
    : '';
  blocks.push(mediaBlock);

  // 5. ProvenanceRights
  blocks.push(`
    <div class="work-detail__block">
      <h2>Происхождение и права</h2>
      <dl class="provenance">
        <div><dt>кредиты</dt><dd>${esc(work.credits)}</dd></div>
        <div><dt>права</dt><dd>${esc(work.rights)}</dd></div>
        <div><dt>статус</dt><dd>${STATUS_LABEL[work.publicationStatus] || work.publicationStatus}</dd></div>
      </dl>
      ${work.publicationStatus === 'archived' ? '<p class="status-note">Запись архивирована. Адрес остаётся живым по закону временной короны — это не удаление.</p>' : ''}
    </div>`);

  // 6. SilentGap
  blocks.push(`<div class="silent-gap" role="presentation"><span class="silent-gap-label">[ ]</span></div>`);

  // 7. MobiusRelations — исходящие + входящие
  const outgoing = (work.relations || []).map((r) => ({ ...r, dir: 'out' }));
  const incomingIds = new Set();
  const incoming = [];
  for (const other of Object.values(byId)) {
    if (other.id === work.id) continue;
    for (const r of other.relations || []) {
      if (r.workId === work.id) {
        incoming.push({ workId: other.id, type: r.type, dir: 'in' });
        incomingIds.add(other.id);
      }
    }
  }
  const allRel = [...outgoing, ...incoming];
  const relItems = allRel.map((r) => {
    const target = byId[r.workId];
    if (!target) {
      return `<li class="mobius-relations__orphan">orphaned-reference: связь на «${esc(r.workId)}» ведёт в никуда (согласие/права отозваны) — карточка не рендерится</li>`;
    }
    const relLabel = r.dir === 'out' ? RELATION_LABEL[r.type] : `${RELATION_LABEL[r.type]} ←`;
    return `<a class="mobius-relations__item" href="/works/${target.slug}/">
      <span>${esc(target.title)}</span>
      <span class="mobius-relations__rel">${esc(relLabel)}</span>
    </a>`;
  }).join('\n');
  blocks.push(`
    <div class="work-detail__block">
      <h2>Причинность Мёбиуса</h2>
      ${allRel.length ? `<div class="mobius-relations">${relItems}</div>` : '<p class="status-note">У этой работы пока нет зафиксированных связей.</p>'}
    </div>`);

  const content = `<section class="page">${blocks.join('\n')}</section>`;
  return layout({
    title: work.title,
    description: work.summary,
    active: 'works',
    content,
  });
}

// ----------------------------------------------------------------- protocol
async function renderProtocol(laws, dialects, editorialCases, works) {
  const caseById = Object.fromEntries(editorialCases.map((c) => [c.id, c]));
  const workById = indexById(works);

  const lawCards = laws.map((law) => {
    let caseHtml = '';
    if (law.caseWorkId && workById.get(law.caseWorkId)) {
      const w = workById.get(law.caseWorkId);
      caseHtml = `<p class="law-card__case">дело: <a href="/works/${w.slug}/">${esc(w.title)}</a></p>`;
    } else if (law.editorialCaseId && caseById[law.editorialCaseId]) {
      caseHtml = `<p class="law-card__case">дело: <a href="#trial">«${esc(caseById[law.editorialCaseId].title)}»</a></p>`;
    }
    return `<article class="law-card">
      <span class="law-card__number">закон ${law.number}</span>
      <h3>${esc(law.title)}</h3>
      <p>${esc(law.text)}</p>
      ${caseHtml}
    </article>`;
  }).join('\n');

  const dialectRows = dialects.map((d) => `<tr>
    <th>${esc(d.name)}</th>
    <td>${esc(d.bodyNode)}</td>
    <td>${esc(d.geometry)}</td>
    <td>${esc(d.description)}</td>
  </tr>`).join('\n');

  const phaseRow = PHASE_ENUM.map((p) => esc(PHASE_LABEL[p] || p)).join(' → ');
  const statusRow = STATUS_ENUM.map((s) => esc(STATUS_LABEL[s] || s)).join(' → ');

  const trialCase = caseById['case-comendant-face'];

  const content = `
<section class="page page--wide">
  <p class="tag">/protocol — Бюро неправильных назначений</p>
  <h1>Законы, обязательные и для богов</h1>
  <p class="page-lede">Псевдоофициальный, но не игровой реестр: десять законов, грамматика полей и суд над самой системой.</p>

  <section class="section">
    <h2>Десять законов</h2>
    <div class="grid-laws">${lawCards}</div>
  </section>

  <section class="section">
    <h2>Грамматика полей</h2>
    <h3>Визуальные диалекты (<code>visualDialect</code> / <code>process</code>)</h3>
    <table class="grammar-table">
      <thead><tr><th>диалект</th><th>телесный узел</th><th>геометрия</th><th>описание</th></tr></thead>
      <tbody>${dialectRows}</tbody>
    </table>
    <h3>Нарративная фаза (<code>narrativePhase</code>)</h3>
    <p class="page-lede" style="max-width:none;">Чисто редакторская разметка — автор выбирает фазу вручную, автомат не крутит её сам во времени: ${phaseRow}.</p>
    <h3>Редакционный статус (<code>publicationStatus</code>)</h3>
    <p class="page-lede" style="max-width:none;">Определяет только видимость в архиве, не содержание: ${statusRow}. Обратный переход «archived → published» не предусмотрен.</p>
  </section>

  <section class="section" id="trial">
    <h2>Суд над автором</h2>
    <div class="trial-note">
      <p>Закон «Самопожирающая власть» проверяется не по отдельной работе, а на уровне самой редколлегии: куратор и интерфейс тоже подотчётны.</p>
      ${trialCase ? `
      <h3>${esc(trialCase.title)} (${esc(trialCase.date)})</h3>
      <p>${esc(trialCase.summary)}</p>
      <p><strong>Итог:</strong> ${esc(trialCase.outcome)}</p>
      <p class="status-note">${esc(trialCase.note)}</p>
      ` : ''}
    </div>
  </section>
</section>`;
  return layout({
    title: 'Бюро неправильных назначений',
    description: 'Десять законов Протокола 418, грамматика полей и суд над автором.',
    active: 'protocol',
    content,
  });
}

// --------------------------------------------------------------------- main
async function main() {
  const rawWorks = await loadWorks();
  const { errors, warnings } = validateWorks(rawWorks);
  if (errors.length) {
    console.error('Сборка остановлена — ошибки валидации works.json:');
    errors.forEach((e) => console.error(' -', e));
    process.exit(1);
  }
  warnings.forEach((w) => console.warn('[warn]', w));

  // производные поля для сортировки "по хронике"/"по связям" — не часть
  // публичной схемы, используются только рантаймом библиотеки
  const inDegree = new Map(rawWorks.map((w) => [w.id, 0]));
  for (const w of rawWorks) {
    for (const r of w.relations || []) {
      if (inDegree.has(r.workId)) inDegree.set(r.workId, inDegree.get(r.workId) + 1);
    }
  }
  rawWorks.forEach((w, i) => {
    w._chronologyIndex = i;
    w._relationDegree = (w.relations || []).length + (inDegree.get(w.id) || 0);
  });

  const byId = Object.fromEntries(rawWorks.map((w) => [w.id, w]));
  const laws = await loadJSON('content/laws.json');
  const dialects = await loadJSON('content/dialects.json');
  const editorialCases = await loadJSON('content/editorial-cases.json');

  await mkdir(path.join(SITE_ROOT, 'works'), { recursive: true });
  await mkdir(path.join(SITE_ROOT, 'protocol'), { recursive: true });

  await writeFile(path.join(SITE_ROOT, 'index.html'), renderHome());
  await writeFile(path.join(SITE_ROOT, 'works/index.html'), renderWorksIndex(rawWorks));
  await writeFile(path.join(SITE_ROOT, 'protocol/index.html'), await renderProtocol(laws, dialects, editorialCases, rawWorks));

  const buildable = buildableWorks(rawWorks);
  for (const work of buildable) {
    const dir = path.join(SITE_ROOT, 'works', work.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderWorkDetail(work, byId));
  }

  console.log(`Собрано: 3 статические страницы + ${buildable.length} страниц работ (из ${rawWorks.length} записей).`);
  console.log(`Приватный реестр согласий (content/private/consent-ledger.json) в сборку не включён.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
