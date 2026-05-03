(() => {
  const root = document.querySelector('[data-blog-search]');
  if (!root) return;

  const input = root.querySelector('[data-blog-search-input]');
  const suggestions = root.querySelector('[data-blog-search-suggestions]');
  const status = root.querySelector('[data-blog-search-status]');
  const results = document.querySelector('[data-blog-search-results]');
  const pagination = document.querySelector('[data-blog-pagination]');
  const indexUrl = root.dataset.indexUrl;
  const maxSuggestions = 8;
  let posts = [];
  let firstPostSuggestionUrl = '';

  const normalize = value => (value || '').toString().trim().toLowerCase();
  const escapeHtml = value => (value || '').toString().replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));

  const renderTags = tags => (tags || []).map(tag => `<span class="tag tag-sm">${escapeHtml(tag)}</span>`).join('');

  const renderPost = post => `
    <a href="${post.url}" class="essay-card">
      <div class="essay-meta">
        <span>${escapeHtml(post.date)}</span>
        <span>${escapeHtml(post.readingTime)}</span>
      </div>
      <h4 class="essay-title">${escapeHtml(post.title)}</h4>
      <p class="essay-desc">${escapeHtml(post.description)}</p>
      <div class="tag-row mt-auto">${renderTags(post.tags)}</div>
    </a>
  `;

  const setStatus = message => {
    status.textContent = message;
  };

  const matchingPosts = query => {
    const q = normalize(query);
    if (!q) return posts;
    return posts.filter(post => normalize(post.searchText).includes(q));
  };

  const buildSuggestions = query => {
    const q = normalize(query);
    firstPostSuggestionUrl = '';
    suggestions.innerHTML = '';
    if (!q) return;

    const seen = new Set();
    const items = [];

    posts.forEach(post => {
      if (normalize(post.title).includes(q) && !seen.has(`post:${post.url}`)) {
        seen.add(`post:${post.url}`);
        items.push({ type: 'post', label: post.title, url: post.url });
      }

      (post.tags || []).forEach(tag => {
        const key = `tag:${normalize(tag)}`;
        if (normalize(tag).includes(q) && !seen.has(key)) {
          seen.add(key);
          items.push({ type: 'tag', label: tag });
        }
      });
    });

    items.slice(0, maxSuggestions).forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `blog-search-suggestion is-${item.type}`;
      button.textContent = item.type === 'tag' ? `#${item.label}` : item.label;
      button.addEventListener('click', () => {
        if (item.type === 'post') {
          window.location.href = item.url;
          return;
        }
        input.value = item.label;
        update();
        input.focus();
      });
      suggestions.appendChild(button);
    });

    const firstPost = items.find(item => item.type === 'post');
    firstPostSuggestionUrl = firstPost ? firstPost.url : '';
  };

  function update() {
    const query = input.value;
    const matches = matchingPosts(query);

    if (matches.length === 0) {
      results.innerHTML = '<div class="blog-search-empty">No posts match that search.</div>';
    } else {
      results.innerHTML = matches.map(renderPost).join('');
    }

    buildSuggestions(query);

    const hasQuery = Boolean(normalize(query));
    if (pagination) pagination.hidden = hasQuery;

    if (!hasQuery) {
      setStatus('');
    } else if (matches.length === 1) {
      setStatus('1 matching post');
    } else {
      setStatus(`${matches.length} matching posts`);
    }
  }

  input.addEventListener('input', update);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && firstPostSuggestionUrl) {
      event.preventDefault();
      window.location.href = firstPostSuggestionUrl;
    }
  });

  fetch(indexUrl, { headers: { Accept: 'application/json' } })
    .then(response => {
      if (!response.ok) throw new Error(`Search index failed with ${response.status}`);
      return response.json();
    })
    .then(index => {
      posts = Array.isArray(index) ? index : [];
      update();
    })
    .catch(() => {
      input.disabled = true;
      root.classList.add('is-unavailable');
      setStatus('Search is unavailable right now.');
    });
})();
