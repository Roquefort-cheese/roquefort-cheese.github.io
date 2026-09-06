// assets/js/state-machine.js
//
// Автомат состояния интерфейса (§4.3 ТЗ). Существует только на "/",
// ничего не пишет в works.json и не проверяет два других автомата
// (narrativePhase работы, publicationStatus работы) — они независимы
// по правилу §4.4.
//
// Состояния: idle -> pressure -> transformation -> overheat -> reset -> idle
// Спец. переход: idle -> pressure через редкое protocol:comendant-arrived.
//
// Единственная точка, где открывается DescendCTA — переход reset -> idle,
// произошедший хотя бы один раз (см. ritual.js, который слушает protocol:reset).

const STATES = ['idle', 'pressure', 'transformation', 'overheat', 'reset'];

export class PhaseMachineController {
  constructor(root) {
    this.root = root; // элемент, на который вешается data-interface-state
    this.state = 'idle';
    this.resetCount = 0;
    this.root.dataset.interfaceState = this.state;
    this._comendantTimer = null;
    this._armComendantWatch();
  }

  dispatch(event, detail = {}) {
    document.dispatchEvent(new CustomEvent(event, { detail }));
  }

  transition(to, { auto = false } = {}) {
    if (!STATES.includes(to)) return;
    const from = this.state;
    this.state = to;
    this.root.dataset.interfaceState = to;
    this.dispatch('protocol:phase-change', { from, to, auto });

    if (to === 'overheat') {
      this.dispatch('protocol:overheat', { intensity: 1 });
      // перегрев не бесконечен: автоматический сброс по истечении лимита
      window.setTimeout(() => this.transition('reset', { auto: true }), 1900);
    }
    if (to === 'reset') {
      this.resetCount += 1;
      window.setTimeout(() => {
        this.dispatch('protocol:reset', {});
        this.transition('idle', { auto: true });
      }, 700);
    }
  }

  // редкое событие: из idle, до начала обычного давления
  _armComendantWatch() {
    const tick = () => {
      if (this.state === 'idle' && Math.random() < 0.12) {
        this.dispatch('protocol:comendant-arrived', {});
        window.setTimeout(() => this.dispatch('protocol:comendant-collapse', {}), 2200);
      }
      this._comendantTimer = window.setTimeout(tick, 9000 + Math.random() * 6000);
    };
    this._comendantTimer = window.setTimeout(tick, 6000);
  }

  destroy() {
    if (this._comendantTimer) window.clearTimeout(this._comendantTimer);
  }
}
