// scripts/lib.mjs
// Общие функции для validate-schema.mjs, build.mjs, revocation-demo.mjs и тестов.
// Никакого внешнего JSON Schema валидатора: правила §6.2/§6.3 ТЗ реализованы вручную,
// чтобы сборка не зависела от сети (ajv и т.п. не устанавливаются).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = path.resolve(__dirname, '..');
export const CONTENT_DIR = path.join(SITE_ROOT, 'content');

export const BASE_REQUIRED = [
  'id', 'slug', 'type', 'title', 'summary',
  'process', 'narrativePhase', 'publicationStatus',
  'visualDialect', 'media', 'altText', 'credits', 'rights',
];

export const TYPE_ENUM = ['theophany', 'chronicle', 'artifact', 'negative-icon', 'residue', 'protocol'];
export const PROCESS_ENUM = ['holding', 'fixation', 'generation', 'zero-reaction'];
export const PHASE_ENUM = ['pressure', 'wrong-assignment', 'performance', 'title', 'apotheosis', 'overheat', 'trial', 'linoleum', 'residue', 'fermentation'];
export const STATUS_ENUM = ['draft', 'review', 'rights-cleared', 'published', 'archived'];
export const RIGHTS_ENUM = ['all-rights-reserved', 'cc-by-nc', 'cc-by-nc-sa', 'internal-only'];
export const RELATION_TYPE_ENUM = ['cause-of', 'residue-of', 'fermentation-of'];

// §6.2 — обязательные поля сверх базовых, по типу материала
export const TYPE_REQUIRED_EXTRA = {
  theophany: ['humanAnchor', 'bodyNode', 'object', 'internalDefect', 'judgment', 'materialObjection'],
  chronicle: ['witnesses', 'relations'],
  artifact: ['object', 'credits', 'rights'],
  'negative-icon': ['humanAnchor', 'object'],
  residue: ['materialObjection', 'relations'],
  protocol: ['title', 'summary'],
};

export async function loadJSON(relPath) {
  const full = path.join(SITE_ROOT, relPath);
  const raw = await readFile(full, 'utf-8');
  return JSON.parse(raw);
}

export async function loadWorks() {
  return loadJSON('content/works.json');
}

export async function loadLaws() {
  return loadJSON('content/laws.json');
}

export async function loadDialects() {
  return loadJSON('content/dialects.json');
}

/**
 * Валидирует массив works по правилам §6.2/§6.4.
 * Возвращает { errors: string[], warnings: string[] }.
 * errors — блокируют публикацию/сборку (обязательные поля, enum, дубли id/slug).
 * warnings — не блокируют (висячие ссылки после отзыва прав — ожидаемое состояние §7.6,
 * но заслуживает внимания куратора).
 */
export function validateWorks(works) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const seenSlugs = new Set();
  const knownIds = new Set(works.map((w) => w.id));

  for (const w of works) {
    const tag = w.slug || w.id || '(без slug)';

    for (const field of BASE_REQUIRED) {
      if (w[field] === undefined || w[field] === null || w[field] === '') {
        errors.push(`[${tag}] отсутствует обязательное базовое поле "${field}"`);
      }
    }

    if (w.id) {
      if (seenIds.has(w.id)) errors.push(`[${tag}] дублирующийся id "${w.id}"`);
      seenIds.add(w.id);
    }
    if (w.slug) {
      if (!/^[a-z0-9-]+$/.test(w.slug)) errors.push(`[${tag}] slug "${w.slug}" не соответствует шаблону ^[a-z0-9-]+$`);
      if (seenSlugs.has(w.slug)) errors.push(`[${tag}] дублирующийся slug "${w.slug}"`);
      seenSlugs.add(w.slug);
    }

    if (w.type && !TYPE_ENUM.includes(w.type)) errors.push(`[${tag}] недопустимый type "${w.type}"`);
    if (w.process && !PROCESS_ENUM.includes(w.process)) errors.push(`[${tag}] недопустимый process "${w.process}"`);
    if (w.narrativePhase && !PHASE_ENUM.includes(w.narrativePhase)) errors.push(`[${tag}] недопустимая narrativePhase "${w.narrativePhase}"`);
    if (w.publicationStatus && !STATUS_ENUM.includes(w.publicationStatus)) errors.push(`[${tag}] недопустимый publicationStatus "${w.publicationStatus}"`);
    if (w.visualDialect && !PROCESS_ENUM.includes(w.visualDialect)) errors.push(`[${tag}] недопустимый visualDialect "${w.visualDialect}"`);
    if (w.rights && !RIGHTS_ENUM.includes(w.rights)) errors.push(`[${tag}] недопустимые rights "${w.rights}"`);

    if (w.media && (!Array.isArray(w.media) || w.media.length < 1)) {
      errors.push(`[${tag}] media должен быть непустым массивом`);
    }

    // Ровно одно значение "популярность" не существует физически — жёсткая проверка §2.3
    if (w.sortMode === 'popularity' || w.popularity !== undefined || w.viewCount !== undefined || w.likeCount !== undefined) {
      errors.push(`[${tag}] обнаружено поле вовлечённости (viewCount/likeCount/popularity) — нарушение закона «Не всё становится контентом»`);
    }

    // §6.2 required-extra по типу
    if (w.type && TYPE_REQUIRED_EXTRA[w.type]) {
      for (const field of TYPE_REQUIRED_EXTRA[w.type]) {
        if (w[field] === undefined || w[field] === null) {
          errors.push(`[${tag}] тип "${w.type}" требует поле "${field}" (§6.2)`);
        }
      }
    }

    // §6.3 — residue обязан иметь хотя бы одну связь residue-of
    if (w.type === 'residue') {
      const hasResidueOf = Array.isArray(w.relations) && w.relations.some((r) => r.type === 'residue-of');
      if (!hasResidueOf) errors.push(`[${tag}] тип residue обязан иметь связь residue-of (§6.3)`);
    }

    // relations: enum + dangling refs (dangling → warning, не error: может быть следствием
    // санкционированного полного отзыва прав §7.6, а не опечаткой автора)
    if (Array.isArray(w.relations)) {
      for (const r of w.relations) {
        if (!r.workId || !r.type) {
          errors.push(`[${tag}] relation без workId/type`);
          continue;
        }
        if (!RELATION_TYPE_ENUM.includes(r.type)) {
          errors.push(`[${tag}] недопустимый relation.type "${r.type}"`);
        }
        if (!knownIds.has(r.workId)) {
          warnings.push(`[${tag}] relation указывает на несуществующий workId "${r.workId}" (orphaned-reference — проверьте, не связано ли это с отзывом прав §7.6)`);
        }
      }
    }

    // §6.3 — сирота допустим только для artifact/protocol
    const isOrphan = (!Array.isArray(w.relations) || w.relations.length === 0)
      && !works.some((other) => Array.isArray(other.relations) && other.relations.some((r) => r.workId === w.id));
    if (isOrphan && w.type !== 'artifact' && w.type !== 'protocol') {
      errors.push(`[${tag}] тип "${w.type}" не может быть «сиротой» без единой связи (§6.3)`);
    }
  }

  return { errors, warnings };
}

/** Возвращает Map<workId, work> и учитывает только «видимые» статусы для перекрёстных ссылок в build. */
export function indexById(works) {
  return new Map(works.map((w) => [w.id, w]));
}

/** Работы, у которых должна собраться статическая страница: published и archived (URL остаётся живым, §7.6). */
export function buildableWorks(works) {
  return works.filter((w) => w.publicationStatus === 'published' || w.publicationStatus === 'archived');
}

/** Работы, видимые в общей витрине /works (архивные — делистинг, но URL жив). */
export function listedWorks(works) {
  return works.filter((w) => w.publicationStatus === 'published');
}
