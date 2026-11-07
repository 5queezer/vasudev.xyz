/* Fit and zoom images inside a scrollable native dialog, without changing article layout. */
(() => {
  function imageLayout(width, height, viewportWidth, viewportHeight, zoom) {
    if (width <= 0 || height <= 0 || viewportWidth <= 0 || viewportHeight <= 0)
      return null;
    const ratio =
      Math.min(
        Math.max(1, viewportWidth - 32) / width,
        Math.max(1, viewportHeight - 32) / height,
      ) * zoom;
    const drawnWidth = width * ratio;
    const drawnHeight = height * ratio;
    return {
      width: drawnWidth,
      height: drawnHeight,
      canvasWidth: Math.max(viewportWidth, drawnWidth + 32),
      canvasHeight: Math.max(viewportHeight, drawnHeight + 32),
    };
  }
  if (typeof module !== 'undefined' && module.exports)
    module.exports = { imageLayout };
  if (typeof document === 'undefined') return;
  const images = [
    ...document.querySelectorAll('.reading-cover img, .reading-prose img'),
  ];
  if (!images.length || typeof HTMLDialogElement === 'undefined') return;
  const messages = JSON.parse(document.getElementById('site-i18n').textContent);
  const dialog = document.createElement('dialog');
  dialog.className = 'image-viewer';
  dialog.setAttribute('aria-label', messages.imageViewer);
  dialog.innerHTML = `<div class="image-viewer-toolbar"><p class="image-viewer-caption"></p><div class="image-viewer-controls"><button type="button" data-fit></button><button type="button" data-out>−</button><button type="button" data-in>+</button><button type="button" data-close autofocus>×</button></div></div><div class="image-viewer-stage" tabindex="0"><div class="image-viewer-canvas"><img class="image-viewer-image" alt=""></div></div>`;
  const caption = dialog.querySelector('.image-viewer-caption');
  const stage = dialog.querySelector('.image-viewer-stage');
  const canvas = dialog.querySelector('.image-viewer-canvas');
  const image = dialog.querySelector('img');
  const fit = dialog.querySelector('[data-fit]');
  const zoomOut = dialog.querySelector('[data-out]');
  const zoomIn = dialog.querySelector('[data-in]');
  const close = dialog.querySelector('[data-close]');
  stage.setAttribute('aria-label', messages.imageViewer);
  fit.textContent = messages.imageFit;
  fit.setAttribute('aria-label', messages.imageFit);
  for (const [button, label] of [
    [zoomOut, messages.imageZoomOut],
    [zoomIn, messages.imageZoomIn],
    [close, messages.imageClose],
  ]) {
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  document.body.appendChild(dialog);
  let opener = null;
  let zoom = 1;

  function render() {
    if (!dialog.open) return;
    const size = imageLayout(
      image.naturalWidth,
      image.naturalHeight,
      stage.clientWidth,
      stage.clientHeight,
      zoom,
    );
    if (!size) return;
    image.style.width = `${size.width}px`;
    image.style.height = `${size.height}px`;
    canvas.style.width = `${size.canvasWidth}px`;
    canvas.style.height = `${size.canvasHeight}px`;
    stage.scrollLeft = (size.canvasWidth - stage.clientWidth) / 2;
    stage.scrollTop = (size.canvasHeight - stage.clientHeight) / 2;
    zoomOut.disabled = zoom <= 1;
    zoomIn.disabled = zoom >= 4;
    image.classList.toggle('is-zoomed', zoom > 1);
  }
  function changeZoom(value) {
    zoom = Math.max(1, Math.min(4, value));
    render();
  }
  image.addEventListener('load', render);
  image.addEventListener('click', () => changeZoom(zoom === 1 ? 2 : 1));
  zoomIn.addEventListener('click', () => changeZoom(zoom + 0.5));
  zoomOut.addEventListener('click', () => changeZoom(zoom - 0.5));
  fit.addEventListener('click', () => changeZoom(1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (['+', '=', '-', '_', '0'].includes(event.key)) {
      event.preventDefault();
      changeZoom(
        event.key === '0'
          ? 1
          : zoom + (['+', '='].includes(event.key) ? 0.5 : -0.5),
      );
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('image-viewer-open');
    image.removeAttribute('src');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  window.addEventListener('resize', render);

  for (const original of images) {
    if (original.closest('button')) continue;
    const link = original.closest('a');
    if (
      link &&
      (link.hasAttribute('download') ||
        (![original.src, original.currentSrc].includes(link.href) &&
          !/\.(?:png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(link.href)))
    )
      continue;
    const trigger = link || document.createElement('button');
    if (!link) {
      trigger.type = 'button';
      const content = original.closest('picture') || original;
      content.parentNode.insertBefore(trigger, content);
      trigger.appendChild(content);
    } else trigger.setAttribute('role', 'button');
    trigger.classList.add('image-zoom-trigger');
    trigger.setAttribute('aria-haspopup', 'dialog');
    const description =
      original.alt ||
      document.querySelector('.reading-title')?.textContent ||
      messages.imageViewer;
    trigger.setAttribute('aria-label', `${messages.imageOpen}: ${description}`);
    trigger.title = messages.imageOpen;
    function open() {
      opener = trigger;
      zoom = 1;
      caption.textContent = description;
      image.alt = description;
      image.src =
        link?.href ||
        original.dataset.fullSrc ||
        original.currentSrc ||
        original.src;
      document.body.classList.add('image-viewer-open');
      dialog.showModal();
      close.focus({ preventScroll: true });
      if (image.complete) render();
    }
    trigger.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      open();
    });
    if (link)
      trigger.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
  }
})();
