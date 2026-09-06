#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const distRoot = path.join(projectRoot, 'dist');
const failures = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function resolvePublicRef(ref) {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean || /^(?:https?:|mailto:|tel:)/.test(clean)) return null;
  const absolute = clean.startsWith('/')
    ? path.join(distRoot, clean.slice(1))
    : path.join(distRoot, clean);
  if (clean.endsWith('/')) return path.join(absolute, 'index.html');
  return absolute;
}

const files = await walk(distRoot);
const htmlFiles = files.filter((file) => file.endsWith('.html'));

if (files.some((file) => file.includes(`${path.sep}private${path.sep}`))) {
  failures.push('В публичную сборку попала приватная директория.');
}

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const label = path.relative(projectRoot, file);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) failures.push(`${label} → повторяющиеся id: ${[...new Set(duplicates)].join(', ')}`);
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1) failures.push(`${label} → ожидается ровно один h1.`);
  if (!/<html[^>]+lang="ru"/.test(html)) failures.push(`${label} → отсутствует lang="ru".`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="[^"]*"/.test(image[0])) failures.push(`${label} → изображение без alt.`);
  }
  for (const match of html.matchAll(/(?:href|src|data)="([^"]+)"/g)) {
    const target = resolvePublicRef(match[1]);
    if (!target) continue;
    try {
      await access(target);
    } catch {
      failures.push(`${path.relative(projectRoot, file)} → отсутствует ${match[1]}`);
    }
  }
}

const home = await readFile(path.join(distRoot, 'index.html'), 'utf8');
if (!home.includes('tone-formula') || !home.includes('data-ritual-root')) {
  failures.push('Главная не содержит тональный калибратор или ритуальную машину.');
}
const worksIndex = await readFile(path.join(distRoot, 'works', 'index.html'), 'utf8');
if (worksIndex.includes('/assets/img/mudrets-tselibata.webp')) {
  failures.push('Медиа с предупреждением попало в витрину архива.');
}

if (failures.length) {
  console.error('Проверка публичной сборки не пройдена:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log(`Проверено ${htmlFiles.length} HTML-страниц и ${files.length} файлов: локальные ссылки разрешаются, приватные данные отсутствуют.`);
