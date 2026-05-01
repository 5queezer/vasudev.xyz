/* Adds copy buttons to Chroma/Hugo code blocks. */
(() => {
  const blocks = document.querySelectorAll('.prose .highlight');
  if (!blocks.length) return;

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  };

  blocks.forEach((block) => {
    if (block.querySelector('.code-copy')) return;

    const code = block.querySelector('code');
    if (!code) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');

    button.addEventListener('click', async () => {
      const text = code.innerText.replace(/\n$/, '');
      try {
        await copyText(text);
        button.textContent = 'Copied';
        button.classList.add('is-copied');
        window.setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('is-copied');
        }, 1400);
      } catch (_) {
        button.textContent = 'Failed';
        window.setTimeout(() => { button.textContent = 'Copy'; }, 1400);
      }
    });

    block.appendChild(button);
  });
})();
