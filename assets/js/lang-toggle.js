/* Tiny scroll-state toggle for the navbar + persisted lang preference. */
(() => {
  const nav = document.querySelector('[data-navbar]');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Smooth-scroll for in-page anchors.
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    if (a.closest('[data-reading-toc]')) return;
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const mobileNav = document.querySelector('.mobile-nav');
  mobileNav?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => { mobileNav.open = false; });
  });

  const announcement = document.querySelector('[data-announcement]');
  announcement?.querySelector('[data-dismiss-announcement]')?.addEventListener('click', () => {
    announcement.hidden = true;
  });

  // Remember the last language the visitor picked. Hugo renders a separate
  // page per language, so we only need to persist for the next visit.
  const lang = document.body.dataset.lang;
  if (lang) {
    try { localStorage.setItem('vd_lang', lang); } catch (_) {}
  }
})();
