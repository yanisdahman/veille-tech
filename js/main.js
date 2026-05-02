const FEEDS_URL = './data/feeds.json';

const CAT_LABELS = {
  cybersecurite: 'Cybersécurité',
  reseau: 'Réseau & Infra',
  actu: 'Actu IT',
  outils: 'Outils',
};

let allArticles = [];
let activeCategory = 'all';
let searchQuery = '';

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Il y a ${d}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCard(article, index) {
  const catLabel = CAT_LABELS[article.category] || article.category;
  return `
    <article class="card" style="animation-delay:${index * 40}ms">
      <div class="card-meta">
        <span class="source-badge">${escapeHtml(article.source)}</span>
        <span class="cat-badge cat-${article.category}">${escapeHtml(catLabel)}</span>
      </div>
      <h2 class="card-title">${escapeHtml(article.title)}</h2>
      ${article.summary ? `<p class="card-summary">${escapeHtml(article.summary)}</p>` : ''}
      <div class="card-footer">
        <span class="card-date">${relativeTime(article.published)}</span>
        <a class="card-link" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">
          Lire
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
    </article>
  `;
}

function getFiltered() {
  return allArticles.filter(a => {
    const matchCat = activeCategory === 'all' || a.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.source.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

function render() {
  const grid = document.getElementById('articlesGrid');
  const empty = document.getElementById('emptyState');
  const stats = document.getElementById('statsCount');

  const filtered = getFiltered();

  stats.textContent = `${filtered.length} article${filtered.length > 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
  } else {
    empty.hidden = true;
    grid.innerHTML = filtered.map((a, i) => renderCard(a, i)).join('');
  }
}

function setLoading(show) {
  document.getElementById('loadingState').hidden = !show;
  document.getElementById('articlesGrid').style.display = show ? 'none' : '';
  document.getElementById('statsBar').style.display = show ? 'none' : '';
}

function updateLastUpdated(iso) {
  const el = document.getElementById('lastUpdated');
  el.querySelector('span:last-child').textContent = `Mise à jour ${relativeTime(iso)}`;
}

async function loadFeeds() {
  setLoading(true);
  try {
    const res = await fetch(FEEDS_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('Impossible de charger les articles');
    const data = await res.json();
    allArticles = data.articles || [];
    updateLastUpdated(data.last_updated);
    setLoading(false);
    render();
  } catch (err) {
    setLoading(false);
    document.getElementById('articlesGrid').style.display = '';
    document.getElementById('statsBar').style.display = '';
    document.getElementById('statsCount').textContent = 'Erreur de chargement — vérifiez que feeds.json est à jour';
    console.error(err);
  }
}

document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeCategory = btn.dataset.category;
  render();
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
