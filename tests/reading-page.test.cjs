const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(
  path.join(__dirname, '../assets/js/reading-page.js'),
  'utf8',
);

for (const [lang, labels] of Object.entries({
  de: ['Link kopieren', 'Kopiert!', 'Fehlgeschlagen'],
  es: ['Copiar enlace', '¡Copiado!', 'Error'],
})) {
  for (const failure of [false, true]) {
    test(`${lang}: link-copy ${failure ? 'failure' : 'success'} feedback stays localized`, async () => {
      let copied, click, reset;
      const feedback = { textContent: '' };
      const button = {
        dataset: {
          url: `https://vasudev.xyz/${lang}/blog/example/`,
          label: labels[0],
          copiedLabel: labels[1],
          failedLabel: labels[2],
        },
        attrs: {},
        parentElement: { querySelector: () => feedback },
        addEventListener(name, fn) {
          click = fn;
        },
        setAttribute(name, value) {
          this.attrs[name] = value;
        },
      };
      vm.runInNewContext(source, {
        document: {
          querySelector: () => null,
          querySelectorAll: () => [button],
        },
        navigator: {
          clipboard: {
            async writeText(value) {
              if (failure) throw new Error('denied');
              copied = value;
            },
          },
        },
        window: {
          isSecureContext: true,
          clearTimeout() {},
          setTimeout(fn) {
            reset = fn;
          },
        },
      });
      await click();
      if (!failure) assert.equal(copied, button.dataset.url);
      assert.equal(feedback.textContent, failure ? labels[2] : labels[1]);
      assert.equal(button.attrs['aria-label'], feedback.textContent);
      reset();
      assert.equal(feedback.textContent, '');
      assert.equal(button.attrs['aria-label'], labels[0]);
    });
  }
}

test('clipboard fallback removes its temporary field and restores focus after failure', async () => {
  let click,
    removed = false,
    focused = false;
  const feedback = {};
  const button = {
    dataset: {
      url: 'https://vasudev.xyz/blog/example/',
      label: 'Copy link',
      failedLabel: 'Failed',
    },
    parentElement: { querySelector: () => feedback },
    addEventListener(name, fn) {
      click = fn;
    },
    setAttribute() {},
    focus() {
      focused = true;
    },
  };
  vm.runInNewContext(source, {
    document: {
      querySelector: () => null,
      querySelectorAll: () => [button],
      createElement: () => ({
        style: {},
        setAttribute() {},
        select() {},
        remove() {
          removed = true;
        },
      }),
      body: { appendChild() {} },
      execCommand() {
        throw new Error('unavailable');
      },
    },
    navigator: {},
    window: { isSecureContext: false, clearTimeout() {}, setTimeout() {} },
  });
  await click();
  assert(removed);
  assert(focused);
  assert.equal(feedback.textContent, 'Failed');
});

function contents(reduced) {
  let scroll, hash, scheduled, focused;
  const links = ['#first', '#%C3%BCberblick'].map((href) => ({
    attrs: {},
    getAttribute: () => href,
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
    addEventListener(name, fn) {
      this.click = fn;
    },
  }));
  const targets = ['first', 'überblick'].map((id, index) => ({
    id,
    top: index ? 500 : 140,
    attrs: {},
    getBoundingClientRect() {
      return { top: this.top };
    },
    hasAttribute(name) {
      return name in this.attrs;
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    focus() {
      focused = this;
    },
    scrollIntoView(options) {
      scroll = options;
      this.top = 96;
    },
  }));
  const toc = { querySelectorAll: () => links };
  vm.runInNewContext(source, {
    document: {
      querySelector: (selector) =>
        selector === '[data-reading-toc]'
          ? toc
          : { getBoundingClientRect: () => ({ height: 72 }) },
      querySelectorAll: () => [],
      getElementById: (id) => targets.find((target) => target.id === id),
    },
    window: {
      matchMedia: () => ({ matches: reduced }),
      requestAnimationFrame(fn) {
        fn();
      },
      addEventListener(name, fn) {
        if (name === 'scroll') scheduled = fn;
      },
      history: {
        pushState(a, b, value) {
          hash = value;
        },
      },
    },
  });
  return {
    links,
    targets,
    update: () => scheduled(),
    state: () => ({ scroll, hash, focused }),
  };
}

test('contents highlight follows the current reading section', () => {
  const c = contents(false);
  assert.equal(c.links[0].attrs['aria-current'], 'location');
  c.targets[0].top = -200;
  c.targets[1].top = 80;
  c.update();
  assert.equal(c.links[1].attrs['aria-current'], 'location');
  assert.equal(c.links[0].attrs['aria-current'], undefined);
});

test('contents links decode translated heading IDs, focus the target and honor reduced motion', () => {
  const c = contents(true);
  let prevented = false;
  c.links[1].click({
    preventDefault() {
      prevented = true;
    },
  });
  assert(prevented);
  assert.equal(c.state().focused.id, 'überblick');
  assert.equal(c.state().scroll.behavior, 'auto');
  assert.equal(c.state().hash, '#%C3%BCberblick');
  assert.equal(c.links[1].attrs['aria-current'], 'location');
});
