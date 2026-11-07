/* Reading tools: heading navigation, scroll position and localized link copying. */
(() => {
  const toc = document.querySelector('[data-reading-toc]');
  if (toc) {
    const items = [...toc.querySelectorAll('a[href^="#"]')]
      .map((link) => {
        let target;
        try {
          target = document.getElementById(
            decodeURIComponent(link.getAttribute('href').slice(1)),
          );
        } catch (_) {
          return null;
        }
        return target ? { link, target } : null;
      })
      .filter(Boolean);
    let active = null;
    let queued = false;

    function update() {
      queued = false;
      const header = document.querySelector('[data-navbar]');
      const offset = (header?.getBoundingClientRect().height || 72) + 32;
      let current = items[0];
      items.forEach((item) => {
        if (item.target.getBoundingClientRect().top <= offset) current = item;
      });
      if (!current || current === active) return;
      active = current;
      items.forEach((item) => {
        if (item === current)
          item.link.setAttribute('aria-current', 'location');
        else item.link.removeAttribute('aria-current');
      });
    }
    function schedule() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    }
    items.forEach(({ link, target }) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const reduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        if (!target.hasAttribute('tabindex'))
          target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'start',
        });
        window.history.pushState(null, '', link.getAttribute('href'));
        schedule();
      });
    });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('pageshow', schedule);
    update();
  }

  document.querySelectorAll('[data-copy-link]').forEach((button) => {
    let reset;
    button.addEventListener('click', async () => {
      const feedback = button.parentElement.querySelector(
        '[data-copy-feedback]',
      );
      window.clearTimeout(reset);
      try {
        const text = button.dataset.url;
        if (navigator.clipboard && window.isSecureContext)
          await navigator.clipboard.writeText(text);
        else {
          const field = document.createElement('textarea');
          field.value = text;
          field.setAttribute('readonly', '');
          field.style.position = 'fixed';
          field.style.top = '-9999px';
          document.body.appendChild(field);
          field.select();
          try {
            if (!document.execCommand('copy'))
              throw new Error('Copy unavailable');
          } finally {
            field.remove();
            button.focus({ preventScroll: true });
          }
        }
        if (feedback) feedback.textContent = button.dataset.copiedLabel;
        button.setAttribute('aria-label', button.dataset.copiedLabel);
      } catch (_) {
        if (feedback) feedback.textContent = button.dataset.failedLabel;
        button.setAttribute('aria-label', button.dataset.failedLabel);
      }
      reset = window.setTimeout(() => {
        if (feedback) feedback.textContent = '';
        button.setAttribute('aria-label', button.dataset.label);
      }, 1800);
    });
  });
})();
