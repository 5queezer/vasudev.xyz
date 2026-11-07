(() => {
  const scene = document.querySelector('[data-project-scene]');
  if (!scene) return;

  const cards = [...scene.querySelectorAll('[data-scene-card]')];
  const viewport = scene.querySelector('[data-scene-viewport]');
  const previousButton = scene.querySelector('[data-scene-prev]');
  const nextButton = scene.querySelector('[data-scene-next]');
  const toggleButton = scene.querySelector('[data-scene-toggle]');
  const context = scene.querySelector('[data-scene-context]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palettes = [
    ['#ffcb68', '#a6d1d2', '#f6ddc5'],
    ['#c7d68d', '#92c7bd', '#f3d5aa'],
    ['#aacfd5', '#9ab8d2', '#e5c6db'],
    ['#e9b9c8', '#9dcad0', '#f4d28e'],
  ];
  let activeIndex = 0;
  let playing = !reducedMotion.matches;
  let pointerStart = null;
  let suppressPointerClick = 0;
  let swipeGesture = 0;
  let visible = true;
  let timer;

  const signedSlot = (index) => {
    let value = index - activeIndex;
    if (value > cards.length / 2) value -= cards.length;
    if (value < -cards.length / 2) value += cards.length;
    return value;
  };

  function render() {
    cards.forEach((card, index) => {
      const position = signedSlot(index);
      card.style.setProperty('--scene-slot', position);
      card.classList.toggle('is-active', index === activeIndex);
      card.toggleAttribute('data-near', Math.abs(position) === 1);
      card.setAttribute(
        'aria-hidden',
        index === activeIndex ? 'false' : 'true',
      );
      card.querySelector('a').tabIndex = index === activeIndex ? 0 : -1;
    });

    const palette = palettes[activeIndex % palettes.length];
    ['a', 'b', 'c'].forEach((name, index) => {
      scene.style.setProperty(`--scene-${name}`, palette[index]);
    });
    context.textContent = cards[activeIndex].dataset.tags;
  }

  function stopTimer() {
    window.clearInterval(timer);
    timer = undefined;
  }

  function restartTimer() {
    stopTimer();
    const userIsInteracting =
      viewport.matches(':hover') ||
      (viewport.contains(document.activeElement) &&
        document.activeElement !== toggleButton);
    if (
      playing &&
      visible &&
      !document.hidden &&
      !reducedMotion.matches &&
      !userIsInteracting
    ) {
      timer = window.setInterval(() => step(1), 6000);
    }
  }

  function step(direction) {
    const moveFocus = cards.some((card) =>
      card.contains(document.activeElement),
    );
    activeIndex = (activeIndex + direction + cards.length) % cards.length;
    render();
    if (moveFocus)
      cards[activeIndex].querySelector('a').focus({ preventScroll: true });
    restartTimer();
  }

  function updateToggle() {
    scene.classList.toggle('is-paused', !playing);
    toggleButton.textContent = playing ? 'Ⅱ' : '▶';
    toggleButton.setAttribute(
      'aria-label',
      playing ? scene.dataset.pauseLabel : scene.dataset.playLabel,
    );
  }

  function setPlaying(value) {
    playing = value && !reducedMotion.matches;
    updateToggle();
    restartTimer();
  }

  previousButton.addEventListener('click', () => step(-1));
  nextButton.addEventListener('click', () => step(1));
  toggleButton.addEventListener('click', () => setPlaying(!playing));
  viewport.addEventListener('mouseenter', stopTimer);
  viewport.addEventListener('mouseleave', restartTimer);
  viewport.addEventListener('focusin', stopTimer);
  viewport.addEventListener('focusout', (event) => {
    if (!viewport.contains(event.relatedTarget)) restartTimer();
  });
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  });
  viewport.addEventListener('pointerdown', (event) => {
    suppressPointerClick = 0;
    if (event.button !== 0 || event.target.closest('button')) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
      viewport.setPointerCapture(event.pointerId);
    }
  });
  viewport.addEventListener('pointerup', (event) => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (viewport.hasPointerCapture(event.pointerId))
      viewport.releasePointerCapture(event.pointerId);
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
      const gesture = ++swipeGesture;
      suppressPointerClick = gesture;
      window.setTimeout(() => {
        if (suppressPointerClick === gesture) suppressPointerClick = 0;
      }, 100);
      step(dx > 0 ? -1 : 1);
    }
  });
  viewport.addEventListener('pointercancel', () => {
    pointerStart = null;
  });
  viewport.addEventListener('dragstart', (event) => event.preventDefault());
  viewport.addEventListener(
    'click',
    (event) => {
      if (!suppressPointerClick || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
      suppressPointerClick = 0;
    },
    true,
  );
  document.addEventListener('visibilitychange', restartTimer);
  reducedMotion.addEventListener('change', () =>
    setPlaying(!reducedMotion.matches),
  );
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        restartTimer();
      },
      { threshold: 0.15 },
    ).observe(scene);
  }

  scene.classList.add('is-enhanced');
  render();
  updateToggle();
  restartTimer();
})();
