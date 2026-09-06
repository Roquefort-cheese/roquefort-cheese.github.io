#!/usr/bin/env node
// scripts/build.mjs
//
// Генерирует /index.html, /works/index.html, /works/{slug}/index.html,
// /protocol/index.html из content/*.json. Ручного HTML на каждую работу
// нет — см. критерий приёмки в §8 ТЗ.
//
// content/private/consent-ledger.json НИКОГДА не читается и не копируется
// этим скриптом (§6.1).

import { writeFile, mkdir, readFile, copyFile, cp, rm } from 'node:fs/promises';
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
const EDITORIAL_MODE_LABEL = { absurd: 'абсурд', pathos: 'пафос', glitch: 'глитч', ground: 'земля' };
const DIST_DIR = path.join(SITE_ROOT, 'dist');

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mediaTag(work, { klass = '', loading = 'lazy' } = {}) {
  const m = work.media?.[0];
  if (!m) return '';
  const alt = esc(work.altText || '');
  const dimensions = m.width && m.height ? ` width="${Number(m.width)}" height="${Number(m.height)}"` : '';
  const priority = loading === 'eager' ? ' fetchpriority="high"' : '';
  return `<img class="${klass}" src="/${m.src}" alt="${alt}" loading="${loading}" decoding="async"${dimensions}${priority}>`;
}

function mediaFigure(work, { klass = '', loading = 'lazy' } = {}) {
  const caption = work.media?.[0]?.caption;
  return `<figure class="work-media ${klass}">
    ${mediaTag(work, { loading })}
    ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}
  </figure>`;
}

function mediaLocked(work) {
  return `<div class="media-locked" role="img" aria-label="Кадр «${esc(work.title)}» скрыто до подтверждения предупреждения о содержании">
    <span class="media-locked__code">MEDIA / 418</span>
    <strong>изображение удержано</strong>
    <span>предупреждение находится ниже по странице</span>
  </div>`;
}

function renderToneFormula(parts) {
  const total = parts.reduce((sum, part) => sum + Number(part.percent || 0), 0);
  if (total !== 100) throw new Error(`Тональная формула должна давать 100%, сейчас ${total}%.`);
  const aria = parts.map((part) => `${Number(part.percent)} процентов — ${part.title}`).join(', ');
  return `<div class="tone-formula" aria-label="Тональная формула проекта: ${esc(aria)}">
    <div class="tone-formula__bar" aria-hidden="true">${parts.map((part) => `<span class="tone-formula__segment tone-formula__segment--${esc(part.id)}" style="--portion:${Number(part.percent)}"></span>`).join('')}</div>
    <div class="tone-formula__legend">${parts.map((part) => `<div class="tone-formula__item tone-formula__item--${esc(part.id)}">
      <strong>${Number(part.percent)}%</strong>
      <span>${esc(part.title)}</span>
      <small>${esc(part.note)}</small>
    </div>`).join('')}</div>
  </div>`;
}


function renderEditorialCompensation(works, lore) {
  const corpus = works.filter((w) => w.editorialMode);
  const counts = { absurd: 0, pathos: 0, glitch: 0, ground: 0 };
  corpus.forEach((w) => { if (counts[w.editorialMode] !== undefined) counts[w.editorialMode] += 1; });
  const labels = {
    absurd: 'абсурд',
    pathos: 'пафос',
    glitch: 'глитч',
    ground: 'земля',
  };
  const percent = (n) => corpus.length ? Math.round((n / corpus.length) * 100) : 0;
  return `<div class="editorial-compensation">
    <div class="editorial-compensation__head">
      <span class="tag">режим 418.2 · компенсатор документальности</span>
      <strong>${esc(lore?.compensation?.title || 'Компенсатор документальности')}</strong>
      <p>${esc(lore?.compensation?.note || '')}</p>
    </div>
    <div class="editorial-compensation__grid">
      ${Object.entries(counts).map(([key, n]) => `<div class="editorial-compensation__item editorial-compensation__item--${key}">
        <div><strong>${n}</strong><span>${percent(n)}%</span></div>
        <b>${labels[key]}</b>
        <i style="--portion:${percent(n)}"></i>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderInternalMemes(lore) {
  const memes = lore?.internalMemes || [];
  return `<section class="section meme-section">
    <div class="section-heading section-heading--split">
      <div><p class="tag">служебное · не удалять</p><h2>Внутренние мемы Бюро</h2></div>
      <p>Эти формулировки не объясняют шутку. Они делают вид, что бюрократия умеет её администрировать.</p>
    </div>
    <div class="meme-grid">${memes.map((m, i) => `<article class="meme-card" data-meme-index="${i}">
      <span class="meme-card__stamp">MEMO / 418.${i+1}</span>
      <h3>${esc(m.title)}</h3>
      <p>${esc(m.text)}</p>
    </article>`).join('')}</div>
  </section>`;
}

function layout({ title, description, active, bodyClass = '', extraHead = '', content, extraScripts = '' }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Протокол 418</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/layout.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/states.css">
<link rel="stylesheet" href="/assets/css/chaos.css">
<link rel="stylesheet" href="/assets/css/identity.css">
<link rel="stylesheet" href="/assets/css/kinetic.css">
<link rel="stylesheet" href="/assets/css/ritual-engine.css">
${extraHead}
</head>
<body class="${bodyClass}" data-page="${esc(active)}">
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
  <span>ПРОТОКОЛ 418 · LOWER HEAVEN · иррациональная мифопоэтическая система.</span>
  <span>Согласие изображённых людей и данные о правах ведутся в приватном реестре и не публикуются.</span>
</footer>
<script type="module" src="/assets/js/media-viewer.js"></script>
<script type="module" src="/assets/js/chaos.js"></script>
<script type="module" src="/assets/js/kinetic.js"></script>
${extraScripts}
</body>
</html>`;
}

// ---------------------------------------------------------------- index.html
function renderHome(works, tone, lore) {
  const byId = Object.fromEntries(works.map((work) => [work.id, work]));
  const groundWork = byId['w-nepribrannoe-koyka'];
  const featured = ['w-mudrets-tselibata', 'w-vlastelin-dofamina', 'w-osemenitel']
    .map((id) => byId[id])
    .filter(Boolean);
  const featuredCards = featured.map((work, index) => {
    return `<article class="apotheosis-card" data-dialect="${esc(work.visualDialect)}">
      <a class="apotheosis-card__media" href="/works/${work.slug}/" aria-label="Открыть работу «${esc(work.title)}»">
        ${mediaTag(work, { loading: 'lazy' })}
        <span class="apotheosis-card__index">0${index + 1}</span>
      </a>
      <div class="apotheosis-card__body">
        <p class="tag tag--dialect">${esc(PROCESS_LABEL[work.process] || work.process)}</p>
        <h3><a href="/works/${work.slug}/">${esc(work.title)}</a></h3>
        <p>${esc(work.summary)}</p>
        <span class="source-chip">портрет-апофеоз</span>
      </div>
    </article>`;
  }).join('\n');

  const content = `
<section class="page page--wide page--home">
  <p class="tag">/ — Мембрана 418</p>
  <h1 class="home-title">Комната, которая<br>отвечает ошибкой</h1>
  <p class="page-lede">Сайт делает вид, что всё норм. Не верь ему. Тут можно нажать кнопку, сломать назначение, поймать глюк и случайно открыть то, чего никто не загружал.</p>

  <div class="membrane-hero">
    ${groundWork ? mediaFigure(groundWork, { klass: 'documentary-plate', loading: 'eager' }) : `<figure>${mediaTag({ media: [{ src: 'assets/img/membrane-hero.svg' }], altText: 'Потолок комнаты с лампой на проводе, приколотое расписание и календарь с обведённым дедлайном.' }, { loading: 'eager' })}</figure>`}
    <div class="stack">
      <p class="hero-quote">КОМНАТА 418 НЕ ОБЯЗАНА ИМЕТЬ СМЫСЛ.</p>
      <p class="page-lede">Пока тут только койка, коробка и кабель. Но дай предмету неправильную работу — и он начнёт вести себя так, будто у него есть лор.</p>
      <p class="source-stamp">источник: визуальная хроника / кадр 084 / без узнаваемых лиц</p>
    </div>
  </div>

  <div data-ritual-root>
    <div class="ritual-zone">
      <div class="ritual-head">
        <div>
          <p class="tag">интерактивный обряд / живой режим</p>
          <h2>Назначить неправильно</h2>
          <p class="ritual-kicker">Ты даёшь обычной вещи работу, для которой её никто не нанимал. Потом комната делает вид, что так и было.</p>
        </div>
        <div class="ritual-rule">не кнопка → решение → последствия</div>
      </div>
      <div class="ritual-cockpit">
        <aside class="ritual-brief" aria-label="Лист назначения">
          <div class="ritual-brief__stamp">ROOM 418 / APPOINTMENT SLIP</div>
          <div class="ritual-brief__row"><span>КОМУ</span><strong data-field="who">Комнате 418</strong></div>
          <div class="ritual-brief__row"><span>КОГДА</span><strong data-field="when">когда сверху стучат</strong></div>
          <div class="ritual-brief__row"><span>ЗАЧЕМ</span><strong data-field="why">чтобы обычная вещь перестала быть обычной</strong></div>
          <div class="ritual-brief__row"><span>ГДЕ ГРОТЕСК</span><strong data-field="absurdity">ожидаемая функция ломается, но предмет всё ещё бытовой</strong></div>
          <div class="ritual-brief__row"><span>ОБЪЕКТ</span><strong data-field="object">—</strong></div>
          <div class="ritual-brief__row"><span>ДОЛЖНОСТЬ</span><strong data-field="role">—</strong></div>
          <div class="ritual-brief__footer">статус: <b data-status>ничего не назначено</b></div>
          <div class="ritual-brief__actions">
            <button class="btn btn--ritual" type="button">Назначить неправильно</button>
            <button class="btn btn--ghost ritual-reroll" type="button" data-reroll disabled>другой объект</button>
          </div>
        </aside>

        <div class="ritual-stage" data-phase="idle">
          <div class="comendant-banner" data-active="0"><p>комендант приехал. всё, что сейчас происходит, формально не существует.</p></div>
          <div class="ritual-stage__topline"><span data-stage-label>КОМНАТА ЖДЁТ</span><span data-stage-count>цикл 000</span></div>
          <div class="ritual-stage__figure" aria-live="polite"></div>
          <div class="ritual-stage__overlay">
            <p class="ritual-stage__title" data-stage-title>Пока это просто предмет.</p>
            <p class="ritual-stage__caption" data-stage-caption>Нажми. Возьми ответственность. Дальше система сама начнёт врать.</p>
          </div>
          <div class="ritual-stage__glitch" data-stage-glitch aria-hidden="true"></div>
          <div class="ritual-stage__aftercare" data-aftercare>
            <span>ОСТАТОК</span><strong data-aftercare-text>—</strong>
          </div>
        </div>
      </div>

      <div class="ritual-foot">
        <div class="ritual-memoryline"><span>прошлые косяки</span><div data-history>пока чисто</div></div>
        <div class="ritual-hint">примечание: если всё выглядит логично — ты нажал не туда.</div>
      </div>
    </div>
  </div>

  <section class="section tone-section" data-kinetic-panel>
    <div class="section-heading">
      <p class="tag">тональный калибратор</p>
      <h2>Как это вообще работает?</h2>
      <p>45% реальность. 25% бытовой бред. 20% серьёзное лицо. 10% цифровая паника. При плохом настроении сервера пропорции могут временно врать.</p>
    </div>
    ${renderToneFormula(tone)}
  </section>

  <section class="section">
    <div class="section-heading section-heading--split">
      <div>
        <p class="tag">три главных босса</p>
        <h2>Не трогай. Уже стало мифом.</h2>
      </div>
      <p>Три режима: держать, залипать, плодить. Ни один не обещает адекватный финал.</p>
    </div>
    <div class="apotheosis-grid">${featuredCards}</div>
  </section>

  ${renderEditorialCompensation(works, lore)}

  ${renderInternalMemes(lore)}

  <section class="section formula-section">
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

function splitMapLabel(title) {
  if (title.length <= 18) return [title];
  const words = title.split(/\s+/);
  let first = '';
  let second = '';
  for (const word of words) {
    if (!second && `${first} ${word}`.trim().length <= 16) {
      first = `${first} ${word}`.trim();
    } else {
      second = `${second} ${word}`.trim();
    }
  }
  if (!second) return [first];
  return [first, second.length > 20 ? `${second.slice(0, 19)}…` : second];
}

function renderMobiusMap(works) {
  const nodes = buildableWorks(works);
  const nodeIds = new Set(nodes.map((work) => work.id));
  const positions = new Map(nodes.map((work, index) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / nodes.length);
    return [work.id, {
      x: Math.round(460 + (350 * Math.cos(angle))),
      y: Math.round(310 + (220 * Math.sin(angle))),
    }];
  }));
  const edges = [];
  for (const work of nodes) {
    for (const relation of work.relations || []) {
      if (!nodeIds.has(relation.workId)) continue;
      edges.push({ from: work, to: relation.workId, type: relation.type });
    }
  }

  const edgeMarkup = edges.map((edge) => {
    const from = positions.get(edge.from.id);
    const to = positions.get(edge.to);
    return `<line class="mobius-edge mobius-edge--${esc(edge.type)}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" marker-end="url(#mobius-arrow)"><title>${esc(edge.from.title)} — ${esc(RELATION_LABEL[edge.type])} — ${esc(nodes.find((node) => node.id === edge.to)?.title || edge.to)}</title></line>`;
  }).join('');

  const nodeMarkup = nodes.map((work) => {
    const pos = positions.get(work.id);
    const lines = splitMapLabel(work.title);
    const text = lines.map((line, index) => `<tspan x="${pos.x}" dy="${index === 0 ? (lines.length === 1 ? 5 : -2) : 17}">${esc(line)}</tspan>`).join('');
    return `<a class="mobius-node-link" href="/works/${work.slug}/" aria-label="${esc(work.title)}">
      <g class="mobius-node mobius-node--${esc(work.visualDialect)}${work.publicationStatus === 'archived' ? ' mobius-node--archived' : ''}">
        <rect x="${pos.x - 70}" y="${pos.y - 31}" width="140" height="62" rx="3"></rect>
        <text x="${pos.x}" y="${pos.y}" text-anchor="middle">${text}</text>
      </g>
    </a>`;
  }).join('');

  const relationList = edges.map((edge) => {
    const target = nodes.find((node) => node.id === edge.to);
    return `<li><a href="/works/${edge.from.slug}/">${esc(edge.from.title)}</a> — ${esc(RELATION_LABEL[edge.type])} — <a href="/works/${target.slug}/">${esc(target.title)}</a></li>`;
  }).join('');

  return `<div class="mobius-map">
    <div class="mobius-map__legend" aria-hidden="true">
      <span class="legend-edge legend-edge--cause">причина</span>
      <span class="legend-edge legend-edge--residue">остаток</span>
      <span class="legend-edge legend-edge--fermentation">брожение</span>
      <span class="legend-node legend-node--archived">архивный узел</span>
    </div>
    <div class="mobius-map__scroll" tabindex="0" aria-label="Прокручиваемая карта связей">
      <svg viewBox="0 0 920 620" role="img" aria-labelledby="mobius-title mobius-desc">
        <title id="mobius-title">Карта причинности Мёбиуса</title>
        <desc id="mobius-desc">Работы связаны как причины, остатки и брожение. Архивный узел «Вантуз Судьбы» остаётся частью графа.</desc>
        <defs><marker id="mobius-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z"></path></marker></defs>
        <path class="mobius-orbit" d="M460 90 C700 90 810 210 810 310 C810 430 670 530 460 530 C250 530 110 430 110 310 C110 190 250 90 460 90 Z"></path>
        <g class="mobius-edges">${edgeMarkup}</g>
        <g class="mobius-nodes">${nodeMarkup}</g>
      </svg>
    </div>
    <details class="mobius-map__text">
      <summary>Показать эту кашу списком</summary>
      <ul>${relationList}</ul>
    </details>
  </div>`;
}

// -------------------------------------------------------------- works index
function renderWorksIndex(works) {
  const listed = listedWorks(works);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const processes = uniq(listed.map((w) => w.process));
  const phases = uniq(listed.map((w) => w.narrativePhase));
  const types = uniq(listed.map((w) => w.type));
  const bodyNodes = uniq(listed.map((w) => w.bodyNode)).filter((b) => b && b !== '—');
  const editorialModes = uniq(listed.map((w) => w.editorialMode));

  const opt = (label, val) => `<option value="${esc(val)}">${esc(label)}</option>`;

  const noscriptList = listed.map((w) => `<li><a href="/works/${w.slug}/">${esc(w.title)}</a> — ${esc(w.summary)}</li>`).join('\n');

  const content = `
<section class="page page--wide">
  <p class="tag">/works — LINОLEUM ARCHIVE / LOWER HEAVEN</p>
  <h1>Слой пола после катастрофы / 105 свидетельств</h1>
  <p class="page-lede">Тут не музей. Тут пол. Листай как найдётся. Хочешь порядок — есть фильтр. Хочешь правду — жми «случайную жесть».</p>
  <p class="corpus-status"><strong>${listed.length}</strong> кадров в ленте · <strong>${works.filter((work) => work.source?.kind === 'страница визуального корпуса').length}</strong> страниц корпуса · <strong>${buildableWorks(works).length}</strong> узлов вообще</p>

  <div data-library-root>
    <form class="filter-panel" aria-label="Фильтры архива">
      <div class="filter-field">
        <label for="f-process">что прёт</label>
        <select id="f-process" data-filter-key="process"><option value="">любой</option>${processes.map((p) => opt(PROCESS_LABEL[p] || p, p)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-phase">где сейчас</label>
        <select id="f-phase" data-filter-key="phase"><option value="">любая</option>${phases.map((p) => opt(PHASE_LABEL[p] || p, p)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-type">что это вообще</label>
        <select id="f-type" data-filter-key="type"><option value="">любой</option>${types.map((t) => opt(TYPE_LABEL[t] || t, t)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-body">где болит</label>
        <select id="f-body" data-filter-key="bodyNode"><option value="">любой</option>${bodyNodes.map((b) => opt(b, b)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-mode">температура</label>
        <select id="f-mode" data-filter-key="editorialMode"><option value="">любая</option>${editorialModes.map((m) => opt(EDITORIAL_MODE_LABEL[m] || m, m)).join('')}</select>
      </div>
      <div class="filter-field">
        <label for="f-q">вбей что-нибудь</label>
        <input id="f-q" type="search" data-filter-key="q" placeholder="койка, федора, «бля»…">
      </div>
      <div class="filter-panel__actions">
        <button type="button" class="btn btn--ghost btn--small" data-filters-reset>Стереть фильтры</button>
      </div>
    </form>

    <div class="cluster" style="justify-content:space-between; margin-bottom:1rem;">
      <div class="sort-control">
        <span>режим взгляда:</span>
        <div role="radiogroup" aria-label="Сортировка архива">
          <button type="button" data-sort="chronicle" aria-pressed="true">хронология</button>
          <button type="button" data-sort="relations" aria-pressed="false">по связям</button>
        </div>
      </div>
      <button type="button" class="btn btn--ghost" data-raise>Случайная жесть</button>
    </div>

    <p class="results-meta" aria-live="polite"></p><div class="archive-command-row">
    <span class="archive-live-state" aria-live="polite">архив не должен дёргаться сам по себе</span><button type="button" class="btn btn--ghost" data-archive-chaos>РАЗМЕШАТЬ АРХИВ</button><button type="button" class="btn btn--ghost" data-archive-collapse>СЖАТЬ РЕАЛЬНОСТЬ</button><span class="archive-whisper" aria-live="polite">архив делает вид, что помнит порядок</span></div>
    <div class="grid-works" data-library-state="loading"></div>

    <noscript>
      <p class="status-note">JavaScript отключён — показан полный список без фильтров и сортировки.</p>
      <ul>${noscriptList}</ul>
    </noscript>

    <script type="application/json" id="works-data">${JSON.stringify(listed.map((w) => ({
      id: w.id, slug: w.slug, title: w.title, summary: w.summary, type: w.type,
      process: w.process, narrativePhase: w.narrativePhase, bodyNode: w.bodyNode,
      visualDialect: w.visualDialect, publicationStatus: w.publicationStatus, editorialMode: w.editorialMode || null,
      glitchLabel: w.glitchLabel || null,
      thumb: w.thumbnail?.src || w.media?.[0]?.src, mediaHeld: Boolean(w.contentNotice),
      wrongFunction: w.object?.wrongFunction, originalFunction: w.object?.originalFunction,
      chronologyIndex: w._chronologyIndex, relationDegree: w._relationDegree, pageNumber: w.pageNumber || null, pageText: w.pageText || '', visualAnalysis: w.visualAnalysis || '', altText: w.altText || '',
    })))}</script>
  </div>

  <section class="section mobius-section">
    <div class="section-heading section-heading--split">
      <div>
        <p class="tag">нелинейный режим</p>
        <h2>Сюда можно попасть не с начала.</h2>
      </div>
      <p>Кликни на любой узел. Прыжок по связям теперь главнее хронологии. Причина иногда появляется после результата. Это не баг. Это Мёбиус.</p>
    </div>
    ${renderMobiusMap(works)}
  </section>
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
  const headerMedia = work.contentNotice
    ? mediaLocked(work)
    : mediaFigure(work, { klass: 'work-media--primary', loading: 'eager' });

  // 1. WorkHeader — человек и усталость раньше эффекта
  if (work.humanAnchor || work.deficit) {
    blocks.push(`
    <div class="work-detail__block work-header">
      <div class="work-header__media">${headerMedia}</div>
      <div>
        <p class="work-header__eyebrow">${TYPE_LABEL[work.type] || work.type} · ${PROCESS_LABEL[work.process] || work.process}${work.pageNumber ? ` · страница ${work.pageNumber} / 105` : ''}</p>
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
      <div class="work-header__media">${headerMedia}</div>
      <div>
        <p class="work-header__eyebrow">${TYPE_LABEL[work.type] || work.type} · ${PROCESS_LABEL[work.process] || work.process}${work.pageNumber ? ` · страница ${work.pageNumber} / 105` : ''}</p>
        <h1>${esc(work.title)}</h1>
        <p>${esc(work.summary)}</p>
      </div>
    </div>`);
  }

  if (work.editorialMode || work.glitchLabel || work.editorialNote) {
    blocks.push(`
    <div class="work-detail__block editorial-layer editorial-layer--${esc(work.editorialMode || 'ground')}">
      <div class="editorial-layer__signal"><span>${esc(work.glitchLabel || 'ARCHIVE / 418')}</span><em>${esc(work.editorialMode || 'ground')}</em></div>
      ${work.editorialNote ? `<p>${esc(work.editorialNote)}</p>` : ''}
    </div>`);
  }

  if (work.visualAnalysis) {
    blocks.push(`
    <div class="work-detail__block visual-analysis">
      <div class="visual-analysis__stamp">ВИДИМЫЕ ДАННЫЕ · НЕ ФИЛЬТРОВАТЬ</div>
      <h2>Что здесь действительно видно</h2>
      <p>${esc(work.visualAnalysis)}</p>
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
      <div class="material-objection"><strong>вещь, которая ломает пафос</strong>${esc(work.materialObjection)}</div>
    </div>`);
  }

  if (Array.isArray(work.fieldNotes) && work.fieldNotes.length) {
    blocks.push(`
    <div class="work-detail__block field-notes">
      <p class="tag">что заметили с первого взгляда</p>
      <div class="field-notes__grid">${work.fieldNotes.map((note, index) => `<div>
        <span>0${index + 1}</span>
        <p>${esc(note)}</p>
      </div>`).join('')}</div>
    </div>`);
  }

  if (work.pageText) {
    blocks.push(`
    <div class="work-detail__block source-transcript">
      <p class="tag">текст с исходного листа</p>
      <p>${esc(work.pageText)}</p>
    </div>`);
  }

  // ContentNoticeGate — только если применимо
  const mediaBlock = work.contentNotice
    ? `<div class="work-detail__block">
        <details class="notice-gate" data-work-id="${esc(work.id)}">
          <summary>
            <h3>СТОП. СНАЧАЛА ТЕКСТ</h3>
            <p>${esc(work.contentNotice)}</p>
            <span class="btn">ладно, показывай</span>
          </summary>
          <div class="notice-gate__content">${mediaFigure(work, { klass: 'work-media--gated' })}</div>
        </details>
      </div>`
    : '';
  blocks.push(mediaBlock);

  // 5. ProvenanceRights
  blocks.push(`
    <div class="work-detail__block">
      <h2>Кто это снял и почему мы это всё ещё видим</h2>
      <dl class="provenance">
        <div><dt>кредиты</dt><dd>${esc(work.credits)}</dd></div>
        <div><dt>права</dt><dd>${esc(work.rights)}</dd></div>
        <div><dt>статус</dt><dd>${STATUS_LABEL[work.publicationStatus] || work.publicationStatus}</dd></div>
        ${work.source ? `<div><dt>источник</dt><dd>${esc(work.source.collection)}, ${esc(work.source.item)} · ${esc(work.source.kind)}</dd></div>` : ''}
      </dl>
      ${work.publicationStatus === 'archived' ? '<p class="status-note">Запись ушла в архив. ссылка жива. так захотел линолеум.</p>' : ''}
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
      <h2>Почему это вообще случилось</h2>
      ${allRel.length ? `<div class="mobius-relations">${relItems}</div>` : '<p class="status-note">Связей пока нет. Может, и слава богу.</p>'}
    </div>`);

  const content = `<section class="page" data-dialect="${esc(work.visualDialect)}">${blocks.join('\n')}</section>`;
  return layout({
    title: work.title,
    description: work.summary,
    active: 'works',
    content,
  });
}

// ----------------------------------------------------------------- protocol
async function renderProtocol(laws, dialects, editorialCases, works, tone, lore) {
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
  const sourcedWorks = works.filter((work) => work.source);
  const documentaryCount = sourcedWorks.filter((work) => work.source.kind === 'документальная фотография').length;
  const apotheosisCount = sourcedWorks.filter((work) => work.source.kind === 'портрет-апофеоз').length;
  const sourcePageCount = works.filter((work) => work.source?.kind === 'страница визуального корпуса').length;

  const trialCase = caseById['case-comendant-face'];

  const content = `
<section class="page page--wide">
  <p class="tag">/protocol — BUREAU OF WRONG ASSIGNMENTS / 418</p>
  <h1>Правила комнаты. Богам тоже прилетает.</h1>
  <p class="page-lede">Псевдоофициальный, но не игровой реестр: десять законов, грамматика полей и суд над самой системой.</p>

  <section class="section protocol-calibrator">
    <div class="section-heading section-heading--split">
      <div>
        <p class="tag">формула тона</p>
        <h2>ОБЩАГА / МИР ПОЕХАЛ</h2>
      </div>
      <p>Документальность удерживает землю, абсурд взламывает назначение, пафос на секунду делает чудо действительным, а цифровой сбой показывает машину внутри события.</p>
    </div>
    ${renderToneFormula(tone)}
    <div class="calibration-rule">
      <strong>Правило коррекции</strong>
      <span>слишком весело — добавить пафоса</span>
      <span>слишком серьёзно — вернуть бытовую деталь</span>
    </div>
  </section>

  ${renderEditorialCompensation(works, lore)}

  ${renderInternalMemes(lore)}

  <section class="section corpus-ledger">
    <div>
      <p class="tag">корпус / первая загрузка</p>
      <h2>Материал уже вошёл в систему</h2>
    </div>
    <dl>
      <div><dt>${apotheosisCount}</dt><dd>портрета-апофеоза подключены из стайл-гайда</dd></div>
      <div><dt>${documentaryCount}</dt><dd>предметных документальных кадра опубликованы без узнаваемых лиц</dd></div>
      <div><dt>${works.filter((work) => work.publicationStatus === 'published').length}</dt><dd>материалов доступны в общей витрине</dd></div>
      <div><dt>${sourcePageCount}</dt><dd>страниц исходного визуального корпуса подключено</dd></div>
      <div><dt>${buildableWorks(works).length}</dt><dd>адресов остаются живыми с учётом архива</dd></div>
    </dl>
  </section>

  <section class="section">
    <h2>Десять законов</h2>
    <div class="grid-laws">${lawCards}</div>
  </section>

  <section class="section">
    <h2>Что за режим тут вообще</h2>
    <h3>Визуальные диалекты (<code>visualDialect</code> / <code>process</code>)</h3>
    <table class="grammar-table">
      <thead><tr><th>диалект</th><th>телесный узел</th><th>геометрия</th><th>описание</th></tr></thead>
      <tbody>${dialectRows}</tbody>
    </table>
    <h3>Где сейчас этот кадр (<code>narrativePhase</code>)</h3>
    <p class="page-lede" style="max-width:none;">Чисто редакторская разметка — автор выбирает фазу вручную, автомат не крутит её сам во времени: ${phaseRow}.</p>
    <h3>Кто дал добро (<code>publicationStatus</code>)</h3>
    <p class="page-lede" style="max-width:none;">Определяет только видимость в архиве, не содержание: ${statusRow}. Обратный переход «archived → published» не предусмотрен.</p>
  </section>

  <section class="section" id="trial">
    <h2>Разнос автора</h2>
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

async function exportPublicBuild(buildable) {
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(path.join(DIST_DIR, 'works'), { recursive: true });
  await mkdir(path.join(DIST_DIR, 'protocol'), { recursive: true });
  await cp(path.join(SITE_ROOT, 'assets'), path.join(DIST_DIR, 'assets'), { recursive: true });
  await copyFile(path.join(SITE_ROOT, 'index.html'), path.join(DIST_DIR, 'index.html'));
  await copyFile(path.join(SITE_ROOT, 'works/index.html'), path.join(DIST_DIR, 'works/index.html'));
  await copyFile(path.join(SITE_ROOT, 'protocol/index.html'), path.join(DIST_DIR, 'protocol/index.html'));
  for (const work of buildable) {
    const target = path.join(DIST_DIR, 'works', work.slug);
    await mkdir(target, { recursive: true });
    await copyFile(path.join(SITE_ROOT, 'works', work.slug, 'index.html'), path.join(target, 'index.html'));
  }
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
  const tone = await loadJSON('content/tone.json');
  const lore = await loadJSON('content/lore.json');

  await mkdir(path.join(SITE_ROOT, 'works'), { recursive: true });
  await mkdir(path.join(SITE_ROOT, 'protocol'), { recursive: true });

  await writeFile(path.join(SITE_ROOT, 'index.html'), renderHome(rawWorks, tone, lore));
  await writeFile(path.join(SITE_ROOT, 'works/index.html'), renderWorksIndex(rawWorks));
  await writeFile(path.join(SITE_ROOT, 'protocol/index.html'), await renderProtocol(laws, dialects, editorialCases, rawWorks, tone, lore));

  const buildable = buildableWorks(rawWorks);
  for (const work of buildable) {
    const dir = path.join(SITE_ROOT, 'works', work.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderWorkDetail(work, byId));
  }

  await exportPublicBuild(buildable);

  console.log(`Собрано: 3 статические страницы + ${buildable.length} страниц работ (из ${rawWorks.length} записей).`);
  console.log(`Публичная сборка: dist/ (без content/private и исходных редакционных данных).`);
  console.log(`Приватный реестр согласий (content/private/consent-ledger.json) в сборку не включён.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
