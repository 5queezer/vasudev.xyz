/* The wallpaper fades within the first 180px; ordinary page styles stay intact. */
(() => {
  const home = document.querySelector('body.home');
  if (!home) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let queued = false;
  const update = () => {
    const progress = Math.min(1, Math.max(0, window.scrollY / 180));
    const opacity = reducedMotion.matches ? (progress > 0 ? 0 : 1) : 1 - progress;
    home.style.setProperty('--intro-opacity', opacity);
    // Switch ink rather than blending white and dark text into a low-contrast grey.
    home.classList.toggle('intro-light', opacity > 0.65);
    home.classList.toggle('intro-fading', opacity > 0 && opacity < 1);
    queued = false;
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('pageshow', update);
  reducedMotion.addEventListener('change', update);
})();
