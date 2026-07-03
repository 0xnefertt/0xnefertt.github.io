(() => {
  function readJsonScript(id, fallback) {
    if (!id) {
      return fallback;
    }

    const node = document.getElementById(id);
    if (!(node instanceof HTMLScriptElement)) {
      return fallback;
    }

    try {
      return JSON.parse(node.textContent || '');
    } catch {
      return fallback;
    }
  }

  async function loadPosts(config) {
    if (config.indexUrl) {
      try {
        const response = await fetch(config.indexUrl, { credentials: 'same-origin' });
        if (response.ok) {
          return await response.json();
        }
      } catch {
        return [];
      }
    }

    return readJsonScript(config.dataId, []);
  }

  function trackSearch(query, resultCount, source) {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery) {
      return;
    }

    const analytics = window.siteAnalytics;
    if (!analytics || typeof analytics.track !== 'function') {
      return;
    }

    analytics.track('search_used', {
      search_query: normalizedQuery.slice(0, 120),
      results_count: resultCount,
      source,
      page_path: window.location.pathname,
    });
  }

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s가-힣-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildHaystack(post) {
    return normalize([post.title, post.description, post.content, ...(post.tags || []), ...(post.categories || [])].join(' '));
  }

  function scorePost(post, query) {
    const title = normalize(post.title);
    const description = normalize(post.description);
    const content = normalize(post.content);
    const tags = normalize((post.tags || []).join(' '));
    const categories = normalize((post.categories || []).join(' '));
    const haystack = buildHaystack(post);

    let score = 0;
    if (title.includes(query)) score += 8;
    if (description.includes(query)) score += 4;
    if (content.includes(query)) score += 3;
    if (tags.includes(query)) score += 3;
    if (categories.includes(query)) score += 3;
    if (haystack.includes(query)) score += 1;

    return score;
  }

  function createPostItem(post) {
    const item = document.createElement('li');
    const previewImages = Array.isArray(post.gallery) ? post.gallery.slice(0, 6) : post.thumbnail ? [post.thumbnail] : [];
    item.className = previewImages.length > 0 ? 'post-item post-item--with-media' : 'post-item';

    if (previewImages.length > 0) {
      const visibleImages = previewImages.slice(0, 2);
      const hoverImages = previewImages.slice(2, 5);
      const mediaLink = document.createElement('a');
      mediaLink.className = 'post-card-media';
      mediaLink.href = post.href;
      mediaLink.setAttribute('aria-label', post.title);
      if (post.external) {
        mediaLink.target = '_blank';
        mediaLink.rel = 'noreferrer';
      }

      const preview = document.createElement('span');
      preview.className = `post-card-preview post-card-preview--${visibleImages.length}`;
      preview.setAttribute('aria-hidden', 'true');

      for (const image of visibleImages) {
        const previewImage = document.createElement('img');
        previewImage.src = image;
        previewImage.alt = '';
        previewImage.loading = 'lazy';
        preview.appendChild(previewImage);
      }

      mediaLink.appendChild(preview);

      if (hoverImages.length > 0) {
        const gallery = document.createElement('span');
        gallery.className = 'post-card-gallery';
        gallery.setAttribute('aria-hidden', 'true');

        for (const image of hoverImages) {
          const galleryImage = document.createElement('img');
          galleryImage.src = image;
          galleryImage.alt = '';
          galleryImage.loading = 'lazy';
          gallery.appendChild(galleryImage);
        }

        mediaLink.appendChild(gallery);
      }

      item.appendChild(mediaLink);
    }

    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.href = post.href;
    link.textContent = post.title;
    if (post.external) {
      link.target = '_blank';
      link.rel = 'noreferrer';
    }

    const content = document.createElement('div');
    content.className = 'post-card-content';

    heading.appendChild(link);
    content.appendChild(heading);

    const meta = document.createElement('p');
    meta.className = 'post-meta';
    meta.textContent = `${post.dateLabel} · ${post.readMinutes} min read${post.externalSource ? ` · ${post.externalSource}` : ''}`;
    content.appendChild(meta);

    if (post.description) {
      const description = document.createElement('p');
      description.textContent = post.description;
      content.appendChild(description);
    }

    const tags = Array.isArray(post.tags) ? post.tags : [];
    const categoryPaths = Array.isArray(post.categoryPaths) ? post.categoryPaths : [];
    const categories = Array.isArray(post.categories) ? post.categories : [];

    if (tags.length > 0 || categoryPaths.length > 0 || categories.length > 0) {
      const tagContainer = document.createElement('div');
      tagContainer.className = 'tags';

      for (const tag of tags) {
        const tagNode = document.createElement('span');
        tagNode.textContent = `#${tag}`;
        tagContainer.appendChild(tagNode);
      }

      if (categoryPaths.length > 0) {
        for (const categoryPath of categoryPaths) {
          const categoryNode = document.createElement('a');
          categoryNode.href = categoryPath.href;
          categoryNode.textContent = categoryPath.label;
          tagContainer.appendChild(categoryNode);
        }
      } else {
        for (const category of categories) {
          const categoryNode = document.createElement('span');
          categoryNode.textContent = category;
          tagContainer.appendChild(categoryNode);
        }
      }

      content.appendChild(tagContainer);
    }

    item.appendChild(content);

    return item;
  }

  function renderPosts(container, items) {
    container.textContent = '';

    for (const post of items) {
      container.appendChild(createPostItem(post));
    }
  }

  function updateUrl(query) {
    const nextUrl = new URL(window.location.href);
    if (query) {
      nextUrl.searchParams.set('q', query);
    } else {
      nextUrl.searchParams.delete('q');
    }
    window.history.replaceState(null, '', nextUrl);
  }

  function getSearchMatches(posts, query) {
    return posts
      .map((post) => ({
        post,
        score: scorePost(post, query),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || (b.post.dateValue || 0) - (a.post.dateValue || 0))
      .map((item) => item.post);
  }

  async function initBlogSearch(config) {
    const form = document.getElementById(config.formId);
    const input = document.getElementById(config.inputId);
    const resultsContainer = document.getElementById(config.resultsId);
    const metaNode = document.getElementById(config.metaId);
    const emptyNode = document.getElementById(config.emptyId);
    const paginationNode = config.paginationId ? document.getElementById(config.paginationId) : null;

    if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement)) {
      return;
    }

    if (form.dataset.blogSearchInitialized === 'true') {
      return;
    }
    form.dataset.blogSearchInitialized = 'true';

    if (!(resultsContainer instanceof HTMLUListElement) || !(metaNode instanceof HTMLParagraphElement) || !(emptyNode instanceof HTMLElement)) {
      return;
    }

    const posts = await loadPosts(config);
    const mode = config.mode === 'search-page' ? 'search-page' : 'inline';
    const initialResultsHtml = resultsContainer.innerHTML;
    const latestLimit = Number.isFinite(config.latestLimit) ? config.latestLimit : 12;

    const restoreDefaultList = () => {
      resultsContainer.innerHTML = initialResultsHtml;
      metaNode.hidden = true;
      metaNode.textContent = '';
      emptyNode.hidden = true;
      if (paginationNode) {
        paginationNode.hidden = false;
      }
    };

    const renderSearchPageDefault = () => {
      const latest = [...posts].sort((a, b) => (b.dateValue || 0) - (a.dateValue || 0)).slice(0, latestLimit);
      metaNode.hidden = false;
      metaNode.textContent = `Showing latest ${latest.length} posts. Enter a keyword to search all ${posts.length} posts.`;
      renderPosts(resultsContainer, latest);
      emptyNode.hidden = latest.length > 0;
      return latest.length;
    };

    const renderSearchResults = (items, rawQuery) => {
      renderPosts(resultsContainer, items);
      metaNode.hidden = false;
      metaNode.textContent = `${items.length} result${items.length === 1 ? '' : 's'} for "${rawQuery.trim()}".`;
      emptyNode.hidden = items.length > 0;
      if (paginationNode) {
        paginationNode.hidden = true;
      }
    };

    const runSearch = (rawQuery, mutateUrl = false) => {
      const trimmedQuery = rawQuery.trim();
      const query = normalize(rawQuery);

      if (mutateUrl) {
        updateUrl(trimmedQuery);
      }

      if (!query) {
        if (mode === 'search-page') {
          return renderSearchPageDefault();
        }

        restoreDefaultList();
        return 0;
      }

      const matches = getSearchMatches(posts, query);
      renderSearchResults(matches, rawQuery);
      return matches.length;
    };

    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q') || '';
    input.value = initialQuery;
    const initialCount = runSearch(initialQuery, false);
    if (initialQuery.trim()) {
      trackSearch(initialQuery, initialCount, 'page_load');
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const resultCount = runSearch(input.value, true);
      trackSearch(input.value, resultCount, 'submit');
    });

    input.addEventListener('input', () => {
      runSearch(input.value, true);
    });
  }

  function bootBlogSearch() {
    const configs = window.blogSearchConfigs;
    if (!Array.isArray(configs)) {
      return false;
    }

    for (const config of configs) {
      void initBlogSearch(config);
    }

    return true;
  }

  if (!bootBlogSearch()) {
    window.addEventListener('DOMContentLoaded', bootBlogSearch, { once: true });
    window.addEventListener('load', bootBlogSearch, { once: true });
    window.setTimeout(bootBlogSearch, 0);
  }
})();
