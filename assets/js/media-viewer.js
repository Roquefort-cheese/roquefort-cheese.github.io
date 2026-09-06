// assets/js/media-viewer.js
//
// Два самостоятельных, но связанных долга:
// 1) обнаружить prefers-reduced-motion один раз при загрузке и объявить
//    об этом всему сайту через media:reduced-motion-detected — глушится
//    сайтвайд через [data-reduced-motion] на <html>, не точечно;
// 2) отрисовать ContentNoticeGate для работ с contentNotice и не пускать
//    к медиа без явного действия пользователя.

export function initReducedMotionGate() {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = (enabled) => {
    document.documentElement.dataset.reducedMotion = enabled ? '1' : '0';
    document.dispatchEvent(new CustomEvent('media:reduced-motion-detected', { detail: { enabled } }));
  };
  apply(mql.matches);
  if (mql.addEventListener) mql.addEventListener('change', (e) => apply(e.matches));
}

export function initContentNoticeGates(root = document) {
  // <details> раскрывается и без JS — это и есть обязательное "явное
  // действие" перед показом медиа. JS только фиксирует событие на шине.
  root.querySelectorAll('details.notice-gate').forEach((gate) => {
    gate.addEventListener('toggle', () => {
      if (!gate.open) return;
      gate.querySelectorAll('[data-notice-src]').forEach((media) => {
        if (!media.getAttribute('src')) media.setAttribute('src', media.dataset.noticeSrc);
        media.hidden = false;
      });
      const pending = gate.querySelector('[data-notice-pending]');
      if (pending) pending.hidden = true;
      const workId = gate.dataset.workId || null;
      document.dispatchEvent(new CustomEvent('media:content-notice-ack', { detail: { workId } }));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initReducedMotionGate();
  initContentNoticeGates();
});
