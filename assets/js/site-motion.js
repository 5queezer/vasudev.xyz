/* Gentle artwork drift as feature panels pass through the viewport. */
(() => {
  const panels = [...document.querySelectorAll('[data-reveal]')];
  if (!panels.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  let queued = false;

  function update() {
    queued = false;
    visible.forEach((panel) => {
      const bounds = panel.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(
          0,
          (window.innerHeight - bounds.top) /
            (window.innerHeight + bounds.height),
        ),
      );
      const offset = reduced.matches ? 0 : 40 - progress * 80;
      panel.style.setProperty('--feature-shift', `${offset.toFixed(2)}px`);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      schedule();
    },
    { rootMargin: '80px' },
  );
  panels.forEach((panel) => observer.observe(panel));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  reduced.addEventListener('change', () => {
    panels.forEach((panel) =>
      panel.style.setProperty('--feature-shift', '0px'),
    );
    schedule();
  });
})();
