const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, '../assets/js', name), 'utf8');

for (const [lang, messages] of Object.entries({
  de: { searchEmpty: 'Keine Treffer.', searchUnavailable: 'Suche nicht verfügbar.', searchMatchingOne: '1 passender Beitrag', searchMatchingMany: '{count} passende Beiträge', codeCopy: 'Kopieren', codeCopied: 'Kopiert', codeCopyFailed: 'Fehlgeschlagen', codeCopyLabel: 'Code kopieren' },
  es: { searchEmpty: 'Sin resultados.', searchUnavailable: 'Búsqueda no disponible.', searchMatchingOne: '1 artículo encontrado', searchMatchingMany: '{count} artículos encontrados', codeCopy: 'Copiar', codeCopied: 'Copiado', codeCopyFailed: 'Error', codeCopyLabel: 'Copiar código' },
})) {
  const dictionary = { textContent: JSON.stringify(messages) };
  test(`${lang}: search preserves locale through count, empty and reset states`, async () => {
    const input = { value: '', events: {}, addEventListener(event, fn) { this.events[event] = fn; } };
    const suggestions = { innerHTML: '', appendChild() {} };
    const status = { textContent: '' };
    const serverPageHtml = '<a class="essay-card" href="/page-one/">Server page card</a>';
    const results = { innerHTML: serverPageHtml };
    const pagination = {};
    const controls = { '[data-blog-search-input]': input, '[data-blog-search-suggestions]': suggestions, '[data-blog-search-status]': status };
    const root = { dataset: { indexUrl: `/${lang}/blog/search.json` }, querySelector: selector => controls[selector] };
    vm.runInNewContext(source('blog-search.js'), {
      document: {
        getElementById: () => dictionary,
        querySelector: selector => ({ '[data-blog-search]': root, '[data-blog-search-results]': results, '[data-blog-pagination]': pagination })[selector],
        createElement: () => ({ addEventListener() {} }),
      },
      fetch: async () => ({ ok: true, json: async () => [
        { title: 'Alpha', searchText: 'alpha system', url: `/${lang}/alpha/` },
        { title: 'Beta', searchText: 'beta system', url: `/${lang}/beta/` },
        { title: 'Gamma', searchText: 'gamma', url: `/${lang}/gamma/` },
        { title: 'Delta', searchText: 'delta', url: `/${lang}/delta/` },
      ] }),
    });
    await new Promise(setImmediate);
    assert.equal(results.innerHTML, serverPageHtml, 'loading the full index must preserve the paginated server page');
    assert.equal(status.textContent, '');
    input.value = 'system'; input.events.input();
    assert.equal(status.textContent, messages.searchMatchingMany.replace('{count}', '2'));
    assert.equal(pagination.hidden, true);
    input.value = 'alpha'; input.events.input();
    assert.equal(status.textContent, messages.searchMatchingOne);
    input.value = 'missing'; input.events.input();
    assert.ok(results.innerHTML.includes(messages.searchEmpty));
    input.value = ''; input.events.input();
    assert.equal(results.innerHTML, serverPageHtml, 'clearing search must restore the paginated server page');
    assert.equal(pagination.hidden, false);
    assert.equal(status.textContent, '');
  });

  test(`${lang}: unavailable search displays localized failure`, async () => {
    const input = { addEventListener() {} };
    const status = {};
    const root = { dataset: {}, querySelector: selector => selector === '[data-blog-search-input]' ? input : status, classList: { add() {} } };
    vm.runInNewContext(source('blog-search.js'), {
      document: { getElementById: () => dictionary, querySelector: () => root },
      fetch: async () => { throw new Error('offline'); },
    });
    await new Promise(setImmediate);
    assert.equal(input.disabled, true);
    assert.equal(status.textContent, messages.searchUnavailable);
  });

  for (const fails of [false, true]) {
    test(`${lang}: copy ${fails ? 'failure' : 'success'} and reset remain localized`, async () => {
      let button, copied, reset;
      const block = {
        querySelector: selector => selector === 'code' ? { innerText: 'const example = 1;\n' } : null,
        appendChild: element => { button = element; },
      };
      vm.runInNewContext(source('code-copy.js'), {
        document: {
          getElementById: () => dictionary,
          querySelectorAll: () => [block],
          createElement: () => ({ attrs: {}, events: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, v) { this.events[k] = v; }, classList: { add() {}, remove() {} } }),
        },
        navigator: { clipboard: { async writeText(text) { if (fails) throw new Error('denied'); copied = text; } } },
        window: { isSecureContext: true, setTimeout(fn) { reset = fn; } },
      });
      assert.equal(button.textContent, messages.codeCopy);
      assert.equal(button.attrs['aria-label'], messages.codeCopyLabel);
      await button.events.click();
      assert.equal(button.textContent, fails ? messages.codeCopyFailed : messages.codeCopied);
      if (!fails) assert.equal(copied, 'const example = 1;');
      reset();
      assert.equal(button.textContent, messages.codeCopy);
    });
  }
}

test('rendered controls expose accessible status and labels', () => {
  const blogTemplate = fs.readFileSync(path.join(__dirname, '../layouts/blog/list.html'), 'utf8');
  const agentScript = source('agent.js');
  const navigationScript = source('lang-toggle.js');
  const navbarTemplate = fs.readFileSync(path.join(__dirname, '../layouts/partials/navbar.html'), 'utf8');

  assert.match(blogTemplate, /role="status"[^>]+aria-live="polite"/);
  assert.match(agentScript, /class="agent-input"[\s\S]+aria-label="\$\{escapeAttr\(placeholder\)\}"/);
  assert.match(navbarTemplate, /<details class="mobile-nav">[\s\S]+i18n "nav_guides"[\s\S]+<\/details>/);
  assert.match(navigationScript, /mobileNav\.open = false/);
});
