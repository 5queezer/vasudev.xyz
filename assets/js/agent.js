/* ============================================================
   agent.js — vanilla JS chat island
   ------------------------------------------------------------
   Mounts onto #agent-chat and POSTs to a Cloudflare Worker that
   streams Server-Sent Events back. Each event carries a single
   "data: <text-chunk>" frame; an empty "data: [DONE]" frame ends.
   ------------------------------------------------------------
   If you'd rather use Vercel AI SDK's React useChat() hook, see
   README.md → "Swapping to useChat" — the wire protocol stays
   compatible.
   ============================================================ */
(() => {
  const root = document.getElementById('agent-chat');
  if (!root) return;

  const endpoint = root.dataset.agentEndpoint;
  const placeholder = root.dataset.agentPlaceholder || 'Ask the agent something…';
  const streamingText = root.dataset.agentStreaming || 'streaming response…';
  const welcome = root.dataset.agentWelcome || 'Hello.';
  let chips = [];
  try { chips = JSON.parse(root.dataset.agentChips || '[]'); } catch (_) {}

  // ---- markup ----
  root.innerHTML = `
    <div class="agent-chat-chrome">
      <span class="dot dot-primary"></span>
      <span class="agent-chat-chrome-label">agent.vasudev.xyz</span>
      <span class="agent-chat-chrome-meta">nemotron · streaming</span>
    </div>
    <div class="agent-chat-msgs" data-msgs></div>
    <div class="agent-chat-chips" data-chips></div>
    <form class="agent-chat-form" data-form>
      <span class="agent-prompt">&gt;</span>
      <input class="agent-input" data-input type="text" autocomplete="off"
             placeholder="${escapeAttr(placeholder)}" />
      <button class="agent-send" type="submit" aria-label="Send">↑</button>
    </form>
  `;

  const msgsEl   = root.querySelector('[data-msgs]');
  const chipsEl  = root.querySelector('[data-chips]');
  const formEl   = root.querySelector('[data-form]');
  const inputEl  = root.querySelector('[data-input]');
  const sendEl   = root.querySelector('.agent-send');

  // ---- state ----
  const history = [];   // [{ role, content }]
  let streaming = false;

  // ---- render helpers ----
  function escapeHTML(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return escapeHTML(String(s)); }

  function renderMessage(role, text, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'agent-msg ' + (role === 'user' ? 'is-user' : 'is-assistant');
    const bubble = document.createElement('div');
    bubble.className = 'agent-msg-bubble';
    if (role === 'assistant') {
      const tag = document.createElement('div');
      tag.className = 'agent-msg-role';
      tag.textContent = 'agent';
      bubble.appendChild(tag);
    }
    const span = document.createElement('span');
    span.textContent = text;
    bubble.appendChild(span);
    if (opts.streaming) {
      const cursor = document.createElement('span');
      cursor.className = 'agent-cursor';
      bubble.appendChild(cursor);
      wrap._cursor = cursor;
      wrap._textNode = span;
    }
    wrap.appendChild(bubble);
    msgsEl.appendChild(wrap);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return wrap;
  }

  function setStreaming(on) {
    streaming = on;
    inputEl.disabled = on;
    sendEl.disabled = on;
    inputEl.placeholder = on ? streamingText : placeholder;
    chipsEl.querySelectorAll('button').forEach(b => { b.disabled = on; });
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    chips.forEach(label => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'agent-chip';
      b.textContent = label;
      b.addEventListener('click', () => submit(label));
      chipsEl.appendChild(b);
    });
  }

  // ---- streaming POST ----
  async function submit(raw) {
    const q = (raw || '').trim();
    if (!q || streaming) return;
    if (!endpoint) {
      renderMessage('assistant', 'No agentEndpoint configured. Set [params].agentEndpoint in hugo.toml.');
      return;
    }

    history.push({ role: 'user', content: q });
    renderMessage('user', q);
    inputEl.value = '';
    setStreaming(true);

    const node = renderMessage('assistant', '', { streaming: true });
    let full = '';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by blank lines.
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of frame.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trimStart();
            if (data === '[DONE]') continue;
            full += data;
            node._textNode.textContent = full;
            msgsEl.scrollTop = msgsEl.scrollHeight;
          }
        }
      }
    } catch (err) {
      full = full || ('Sorry — the agent endpoint is unreachable. ' + err.message);
      node._textNode.textContent = full;
    } finally {
      if (node._cursor) node._cursor.remove();
      history.push({ role: 'assistant', content: full });
      setStreaming(false);
      inputEl.focus();
    }
  }

  // ---- bind ----
  formEl.addEventListener('submit', e => { e.preventDefault(); submit(inputEl.value); });

  renderMessage('assistant', welcome);
  renderChips();
})();
