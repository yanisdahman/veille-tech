const FEEDS_URL = './data/feeds.json';

const CAT_LABELS = {
  cybersecurite: 'Cybersécurité',
  reseau:        'Réseau & Infra',
  actu:          'Actu IT',
  outils:        'Outils',
};

let allArticles = [];
let activeCategory = 'all';
let searchQuery = '';

/* ── Utilities ─────────────────────────────────────────────────────── */
function relTime(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function sourceInitial(source) {
  return source.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

/* ── Filtered list ─────────────────────────────────────────────────── */
function getFiltered() {
  return allArticles.filter(a => {
    const catOk  = activeCategory === 'all' || a.category === activeCategory;
    const q      = searchQuery.toLowerCase();
    const textOk = !q || a.title.toLowerCase().includes(q) || a.source.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
    return catOk && textOk;
  });
}

/* ── Featured card ─────────────────────────────────────────────────── */
function renderFeatured(article, idx) {
  const cat   = article.category;
  const label = CAT_LABELS[cat] || cat;
  return `
    <div class="fc fc-cat-${esc(cat)}" style="animation-delay:${idx*60}ms"
         onclick="window.open('${esc(article.link)}','_blank','noopener')">
      <div class="fc-thumb">
        <span class="fc-cat-badge">${esc(label)}</span>
        <span class="fc-source">${esc(article.source)}</span>
      </div>
      <div class="fc-body">
        <h2 class="fc-title">
          <a href="${esc(article.link)}" target="_blank" rel="noopener"
             onclick="event.stopPropagation()">${esc(article.title)}</a>
        </h2>
        ${article.summary ? `<p class="fc-desc">${esc(article.summary)}</p>` : ''}
        <div class="fc-footer">
          <span class="fc-time">Il y a ${relTime(article.published)}</span>
          <span class="fc-read">Lire
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </div>
      </div>
    </div>`;
}

/* ── List item ──────────────────────────────────────────────────────── */
function renderListItem(article, idx) {
  const cat   = article.category;
  const label = CAT_LABELS[cat] || cat;
  const init  = sourceInitial(article.source);
  return `
    <div class="li-item" style="animation-delay:${idx*30}ms"
         onclick="window.open('${esc(article.link)}','_blank','noopener')">
      <div class="li-thumb li-cat-${esc(cat)}">${init}</div>
      <div class="li-content">
        <div class="li-top">
          <span class="li-badge badge-${esc(cat)}">${esc(label)}</span>
        </div>
        <div class="li-title">
          <a href="${esc(article.link)}" target="_blank" rel="noopener"
             onclick="event.stopPropagation()">${esc(article.title)}</a>
        </div>
        <div class="li-meta">
          <span>${esc(article.source)}</span>
          <span class="li-sep">·</span>
          <span>Il y a ${relTime(article.published)}</span>
        </div>
      </div>
    </div>`;
}

/* ── Top stories widget ─────────────────────────────────────────────── */
function renderTopWidget(articles) {
  const top5 = articles.slice(0, 5);
  if (!top5.length) return '<p style="font-size:.75rem;color:#94a3b8">Aucun article disponible.</p>';
  return top5.map(a => `
    <a class="wi-item" href="${esc(a.link)}" target="_blank" rel="noopener"
       onclick="event.stopPropagation()">
      <span class="wi-dot wi-dot-${esc(a.category)}"></span>
      <div class="wi-body">
        <span class="wi-source">${esc(a.source)}</span>
        <span class="wi-title">${esc(a.title)}</span>
      </div>
    </a>`).join('');
}

/* ── Categories widget ──────────────────────────────────────────────── */
function renderCatsWidget(articles) {
  const counts = {};
  articles.forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1; });
  return Object.entries(CAT_LABELS).map(([key, label]) => {
    const n = counts[key] || 0;
    if (!n) return '';
    return `
      <div class="cat-row" data-filter="${esc(key)}">
        <div class="cat-row-left">
          <span class="cat-bar cat-bar-${esc(key)}"></span>
          <span class="cat-row-name">${esc(label)}</span>
        </div>
        <span class="cat-row-count">${n}</span>
      </div>`;
  }).join('');
}

/* ── Sources widget ─────────────────────────────────────────────────── */
function renderSourcesWidget(articles) {
  const counts = {};
  articles.forEach(a => { counts[a.source] = (counts[a.source] || 0) + 1; });
  return Object.entries(counts)
    .sort((a,b) => b[1]-a[1])
    .map(([src, n]) => `
      <div class="source-row">
        <span class="source-name">${esc(src)}</span>
        <span class="source-count">${n} articles</span>
      </div>`).join('');
}

/* ── Main render ────────────────────────────────────────────────────── */
function render() {
  const filtered  = getFiltered();
  const featured  = filtered.slice(0, 2);
  const listItems = filtered.slice(2);

  const featuredGrid = document.getElementById('featuredGrid');
  const articleList  = document.getElementById('articleList');
  const listHeader   = document.getElementById('listHeader');
  const listCount    = document.getElementById('listCount');
  const listLabel    = document.getElementById('listLabel');
  const emptyState   = document.getElementById('emptyState');

  if (!filtered.length) {
    featuredGrid.innerHTML = '';
    articleList.innerHTML  = '';
    listHeader.hidden = true;
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  featuredGrid.innerHTML = featured.map((a,i) => renderFeatured(a, i)).join('');

  if (listItems.length) {
    const label = activeCategory === 'all'
      ? 'Derniers articles'
      : CAT_LABELS[activeCategory] || 'Articles';
    listLabel.textContent   = label;
    listCount.textContent   = `${listItems.length} article${listItems.length > 1 ? 's' : ''}`;
    listHeader.hidden       = false;
    articleList.innerHTML   = listItems.map((a,i) => renderListItem(a,i)).join('');
  } else {
    listHeader.hidden      = true;
    articleList.innerHTML  = '';
  }

  /* Cat rows click */
  document.querySelectorAll('.cat-row[data-filter]').forEach(row => {
    row.addEventListener('click', () => setCategory(row.dataset.filter));
  });
}

/* ── Sidebar render ─────────────────────────────────────────────────── */
function renderSidebar(articles) {
  const topWidget     = document.getElementById('topWidget');
  const catsWidget    = document.getElementById('catsWidget');
  const sourcesWidget = document.getElementById('sourcesWidget');
  const statCount     = document.getElementById('statCount');

  if (statCount)     statCount.textContent = articles.length;
  if (topWidget)     topWidget.innerHTML   = renderTopWidget(articles);
  if (catsWidget)    catsWidget.innerHTML  = renderCatsWidget(articles);
  if (sourcesWidget) sourcesWidget.innerHTML = renderSourcesWidget(articles);

  document.querySelectorAll('.cat-row[data-filter]').forEach(row => {
    row.addEventListener('click', () => setCategory(row.dataset.filter));
  });
}

/* ── Category switching ─────────────────────────────────────────────── */
function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.catlink').forEach(el => {
    el.classList.toggle('active', el.dataset.cat === cat);
  });
  render();
}

/* ── Load ──────────────────────────────────────────────────────────── */
async function loadFeeds() {
  const loading = document.getElementById('loadingState');
  try {
    const res = await fetch(FEEDS_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    allArticles = data.articles || [];

    const updated  = document.getElementById('statUpdated');
    const navStatus = document.getElementById('navStatus');
    const timeStr  = `Mise à jour il y a ${relTime(data.last_updated)}`;
    if (updated)  updated.textContent  = timeStr;
    if (navStatus) navStatus.textContent = timeStr;

    if (loading) loading.hidden = true;

    renderSidebar(allArticles);
    render();

  } catch (err) {
    if (loading) {
      loading.innerHTML = `<p style="color:#ef4444;font-size:.85rem">Erreur de chargement — vérifiez que feeds.json est à jour.</p>`;
    }
    console.error(err);
  }
}

/* ── Events ─────────────────────────────────────────────────────────── */
document.getElementById('catNav').addEventListener('click', e => {
  const link = e.target.closest('.catlink');
  if (link) setCategory(link.dataset.cat);
});

let searchTimer;
document.getElementById('searchInput').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    render();
  }, 200);
});

loadFeeds();
