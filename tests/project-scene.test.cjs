const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(
  path.join(__dirname, '../assets/js/project-scene.js'),
  'utf8',
);

function setup(reduced = false) {
  const document = {
    activeElement: null,
    hidden: false,
    events: {},
    addEventListener(name, fn) {
      this.events[name] = fn;
    },
  };
  function element() {
    const classes = new Set(),
      attributes = {},
      style = {};
    return {
      events: {},
      classes,
      attributes,
      dataset: {},
      style: {
        setProperty(key, value) {
          style[key] = value;
        },
      },
      classList: {
        add(name) {
          classes.add(name);
        },
        toggle(name, on) {
          on ? classes.add(name) : classes.delete(name);
        },
      },
      addEventListener(name, fn) {
        this.events[name] = fn;
      },
      setAttribute(name, value) {
        attributes[name] = value;
      },
      toggleAttribute(name, on) {
        on ? (attributes[name] = '') : delete attributes[name];
      },
      closest() {
        return null;
      },
      setPointerCapture(id) {
        this.captured = id;
      },
      hasPointerCapture(id) {
        return this.captured === id;
      },
      releasePointerCapture() {
        this.captured = null;
      },
      focus() {
        document.activeElement = this;
      },
    };
  }
  const cards = Array.from({ length: 4 }, (_, i) => {
    const card = element(),
      link = element();
    card.dataset.tags = `Project ${i}`;
    card.link = link;
    card.querySelector = () => link;
    card.contains = (node) => node === link;
    return card;
  });
  const previous = element(),
    next = element(),
    toggle = element(),
    context = element(),
    viewport = element();
  viewport.hover = false;
  viewport.matches = () => viewport.hover;
  viewport.contains = (node) =>
    [previous, next, toggle, ...cards.map((c) => c.link)].includes(node);
  const scene = element();
  scene.dataset = {
    pauseLabel: 'Pause animation',
    playLabel: 'Play animation',
  };
  scene.querySelectorAll = () => cards;
  scene.querySelector = (selector) =>
    ({
      '[data-scene-viewport]': viewport,
      '[data-scene-prev]': previous,
      '[data-scene-next]': next,
      '[data-scene-toggle]': toggle,
      '[data-scene-context]': context,
    })[selector];
  scene.contains = viewport.contains;
  document.querySelector = () => scene;
  const timeouts = [];
  const timers = new Map(),
    observers = [];
  let timerId = 0;
  const media = {
    matches: reduced,
    addEventListener(name, fn) {
      this.change = fn;
    },
  };
  class Observer {
    constructor(fn) {
      observers.push(fn);
    }
    observe() {}
  }
  vm.runInNewContext(source, {
    document,
    IntersectionObserver: Observer,
    window: {
      matchMedia: () => media,
      IntersectionObserver: Observer,
      setInterval(fn, delay) {
        const id = ++timerId;
        timers.set(id, { fn, delay });
        return id;
      },
      setTimeout(fn) {
        timeouts.push(fn);
      },
      clearInterval(id) {
        timers.delete(id);
      },
    },
  });
  return {
    document,
    cards,
    previous,
    next,
    toggle,
    context,
    viewport,
    scene,
    timers,
    media,
    active: () => cards.findIndex((c) => c.classes.has('is-active')),
    flushTimeouts: () => timeouts.splice(0).forEach((fn) => fn()),
    tick: () => [...timers.values()].forEach((t) => t.fn()),
    visible: (on) => observers.forEach((fn) => fn([{ isIntersecting: on }])),
    fire: (target, name, event = {}) =>
      target.events[name]?.({
        button: 0,
        clientY: 0,
        pointerId: 1,
        target,
        ...event,
      }),
  };
}

test('carousel advances every six seconds and exposes only the active project', () => {
  const s = setup();
  assert.equal(s.timers.size, 1);
  assert.equal([...s.timers.values()][0].delay, 6000);
  s.tick();
  assert.equal(s.active(), 1);
  assert.equal(s.context.textContent, 'Project 1');
  assert.equal(s.cards.filter((c) => c.link.tabIndex === 0).length, 1);
  assert.equal(
    s.cards.filter((c) => c.attributes['aria-hidden'] === 'true').length,
    3,
  );
});

test('keyboard navigation moves focus to the newly visible project', () => {
  const s = setup();
  s.cards[0].link.focus();
  s.fire(s.viewport, 'keydown', { key: 'ArrowRight', preventDefault() {} });
  assert.equal(s.active(), 1);
  assert.equal(s.document.activeElement, s.cards[1].link);
});

test('manual play can resume while its own button remains focused', () => {
  const s = setup();
  s.fire(s.toggle, 'click');
  assert.equal(s.timers.size, 0);
  assert(s.scene.classes.has('is-paused'));
  s.toggle.focus();
  s.fire(s.toggle, 'click');
  assert.equal(s.timers.size, 1);
  assert(!s.scene.classes.has('is-paused'));
});

test('hover and card focus pause rotation even after manual slide changes', () => {
  const s = setup();
  s.viewport.hover = true;
  s.fire(s.viewport, 'mouseenter');
  s.fire(s.next, 'click');
  assert.equal(s.timers.size, 0);
  s.viewport.hover = false;
  s.fire(s.viewport, 'mouseleave');
  assert.equal(s.timers.size, 1);
  s.cards[s.active()].link.focus();
  s.fire(s.viewport, 'focusin');
  assert.equal(s.timers.size, 0);
});

test('reduced motion, hidden tabs and offscreen scenes stop automatic rotation', () => {
  const s = setup(true);
  assert.equal(s.timers.size, 0);
  s.fire(s.next, 'click');
  assert.equal(s.active(), 1);
  s.media.matches = false;
  s.media.change();
  assert.equal(s.timers.size, 1);
  s.visible(false);
  assert.equal(s.timers.size, 0);
  s.visible(true);
  assert.equal(s.timers.size, 1);
  s.document.hidden = true;
  s.document.events.visibilitychange();
  assert.equal(s.timers.size, 0);
});

test('dragging hero copy does not change projects; swiping the scene does', () => {
  const s = setup();
  s.fire(s.scene, 'pointerdown', { clientX: 0 });
  s.fire(s.scene, 'pointerup', { clientX: 80 });
  assert.equal(s.active(), 0);
  s.fire(s.viewport, 'pointerdown', { clientX: 0 });
  s.fire(s.viewport, 'pointerup', { clientX: 80 });
  assert.equal(s.active(), 3);
});

test('arrow keys on the hero call to action do not change projects', () => {
  const s = setup();
  s.fire(s.scene, 'keydown', { key: 'ArrowRight', preventDefault() {} });
  assert.equal(s.active(), 0);
});

test('horizontal swipes capture the pointer and suppress accidental link activation', () => {
  const s = setup(true);
  s.fire(s.viewport, 'pointerdown', { clientX: 100, clientY: 100 });
  s.fire(s.viewport, 'pointermove', { clientX: 30, clientY: 104 });
  assert.equal(s.viewport.captured, 1);
  s.fire(s.viewport, 'pointerup', { clientX: 30, clientY: 104 });
  assert.equal(s.active(), 1);
  let prevented = false;
  s.fire(s.viewport, 'click', {
    detail: 1,
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {},
  });
  assert(prevented);
  s.fire(s.viewport, 'pointerdown', { clientX: 100, clientY: 100 });
  s.fire(s.viewport, 'pointerup', { clientX: 104, clientY: 180 });
  assert.equal(
    s.active(),
    1,
    'Vertical page scrolling must not change projects',
  );
});

test('swipe click suppression expires when the browser emits no synthetic click', () => {
  const s = setup(true);
  s.fire(s.viewport, 'pointerdown', { clientX: 100, clientY: 100 });
  s.fire(s.viewport, 'pointerup', { clientX: 30, clientY: 104 });
  s.flushTimeouts();
  let prevented = false;
  s.fire(s.viewport, 'click', {
    detail: 1,
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {},
  });
  assert.equal(prevented, false, 'The next intentional tap must remain usable');
});
