/**
 * moduleListView.js — Ma Formation (redesign v2)
 * Design source : claude.ai/design — Ma Formation.html
 * Bannières SVG génératives, filtres, search, statuts.
 * Pour revenir : renommer moduleListView.backup.js → moduleListView.js
 */

// ─── Icônes Lucide par section ─────────────────────────────
const CP_ICONS   = ['messages-square', 'layout-grid', 'calendar-days', 'boxes', 'trending-up',
                    'badge-check', 'shield-check', 'telescope', 'git-branch', 'folder-tree',
                    'file-text', 'languages', 'database', 'users', 'cpu', 'monitor'];
const TRSV_ICONS = ['book-open', 'layers', 'globe', 'heart', 'star',
                    'lightbulb', 'zap', 'target', 'award'];

// Mots à ignorer pour générer le code mnémonique
const STOPWORDS = new Set([
    'et','de','la','le','les','du','des','en','au','aux','un','une',
    'à','par','pour','sur','dans','avec','ou','que','qui','ne','pas',
    'se','sa','son','ses','l','d','cette','ce','cet','ces',
]);

// ─── Export principal ──────────────────────────────────────
export function renderModuleList(container, modules, { onModuleClick }) {
    const cp   = modules.filter(m => !m.est_transversal);
    const trsv = modules.filter(m =>  m.est_transversal);

    container.innerHTML = `
    <div class="page-formation">
      ${cp.length   ? buildSection('cp',   cp,   CP_ICONS)   : ''}
      ${trsv.length ? buildSection('trsv', trsv, TRSV_ICONS) : ''}
      ${!cp.length && !trsv.length ? `
        <div class="mc-empty-full">
          <i data-lucide="inbox" aria-hidden="true"></i>
          <span>Aucun module disponible pour le moment.</span>
        </div>` : ''}
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Recherche live ────────────────────────────────────────
    container.querySelectorAll('.mc-search-input').forEach(input => {
        input.addEventListener('input', () => _applyFilters(container));
    });

    // ── Filtres ───────────────────────────────────────────────
    container.querySelectorAll('.mc-filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.closest('.mc-section');
            section.querySelectorAll('.mc-filter-tab').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            _applyFilters(container);
        });
    });

    // ── Clic sur carte ────────────────────────────────────────
    container.querySelectorAll('.mc-card[data-id]').forEach(card => {
        card.addEventListener('click', () => {
            if (card.dataset.status !== 'locked') onModuleClick(card.dataset.id);
        });
        card.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ' ') && card.dataset.status !== 'locked') {
                e.preventDefault();
                onModuleClick(card.dataset.id);
            }
        });
    });
}

// ─── Construction d'une section ───────────────────────────
function buildSection(key, items, icons) {
    const inProgress = items.filter(m => m.status === 'in-progress').length;
    const done       = items.filter(m => m.status === 'done').length;
    const pending    = items.filter(m => m.status === 'pending').length;
    const sectionLabel = key === 'cp' ? 'Compétences Professionnelles' : 'Compétences Transversales';
    const sectionIcon  = key === 'cp' ? 'briefcase' : 'layers';

    return `
    <section class="mc-section formation-section" data-section="${key}">

      <!-- En-tête -->
      <div class="mc-section-header">
        <div>
          <h2 class="mc-section-title">
            <i data-lucide="${sectionIcon}" aria-hidden="true"></i>
            ${sectionLabel}
            <span class="mc-count">${items.length}</span>
          </h2>
          <p class="mc-section-sub">
            <span class="mc-seg mc-seg--progress">
              <span class="mc-seg-dot"></span>${inProgress} en cours
            </span>
            <span class="mc-sub-divider">·</span>
            <span class="mc-seg mc-seg--done">
              <span class="mc-seg-dot"></span>${done} terminée${done !== 1 ? 's' : ''}
            </span>
            <span class="mc-sub-divider">·</span>
            <span class="mc-seg mc-seg--pending">
              <span class="mc-seg-dot"></span>${pending} à démarrer
            </span>
          </p>
        </div>
        <div class="mc-section-tools">
          <div class="mc-search">
            <span class="mc-search-icon"><i data-lucide="search" aria-hidden="true"></i></span>
            <input
              type="search"
              class="mc-search-input"
              data-section="${key}"
              placeholder="Rechercher…"
              aria-label="Rechercher dans ${sectionLabel}"
            >
          </div>
          <div class="mc-filter-tabs" role="tablist" aria-label="Filtrer ${sectionLabel}">
            <button class="mc-filter-tab active" data-filter="all"          role="tab" aria-selected="true">Tous</button>
            <button class="mc-filter-tab"        data-filter="in-progress"  role="tab" aria-selected="false">En cours</button>
            <button class="mc-filter-tab"        data-filter="done"         role="tab" aria-selected="false">Terminés</button>
          </div>
        </div>
      </div>

      <!-- Grille de cartes -->
      <div class="mc-grid tuiles-grid" id="mc-grid-${key}">
        ${items.map((m, i) => buildCard(m, icons[i % icons.length])).join('')}
      </div>

      <!-- État vide (affiché par JS quand tout est filtré) -->
      <div class="mc-grid-empty hidden" id="mc-empty-${key}">
        <i data-lucide="search-x" aria-hidden="true"></i>
        <span>Aucun module ne correspond à la recherche.</span>
      </div>

    </section>`;
}

// ─── Carte compétence ─────────────────────────────────────
function buildCard(m, iconName) {
    const code     = generateCode(m.titre);
    const hue      = titleToHue(m.titre);
    const pct      = m.pourcentage ?? 0;
    const status   = m.status || 'pending';
    const duration = m.duree_reelle ?? 0;

    const statusLabel = {
        'in-progress': 'En cours',
        'done':        'Terminé',
        'pending':     'À démarrer',
        'locked':      'Verrouillé',
    }[status] || 'À démarrer';

    const statusIconKey = {
        'in-progress': 'play',
        'done':        'check',
        'pending':     'circle',
        'locked':      'lock',
    }[status] || 'circle';

    const bannerSVG = buildBannerSVG(code, hue);

    // Si une image_url est disponible, on l'utilise en priorité sur la bannière SVG
    const bannerContent = m.image_url
        ? `<img src="${escAttr(m.image_url)}" alt="" loading="lazy" class="mc-card__banner-img">`
        : bannerSVG;

    return `
    <article
      class="mc-card"
      data-id="${m.cours_id}"
      data-status="${status}"
      role="button"
      tabindex="${status === 'locked' ? '-1' : '0'}"
      aria-label="${esc(m.titre)}, ${pct}% complété"
    >
      <!-- Bannière -->
      <div class="mc-card__banner">
        ${bannerContent}
        <span class="mc-card__banner-code">${esc(code)}</span>
        <span class="mc-card__banner-status">${statusLabel}</span>
      </div>

      <!-- Corps -->
      <div class="mc-card__body">
        <h3 class="mc-card__title">${esc(m.titre)}</h3>
        <div class="mc-card__meta">
          <span class="mc-card__duration">
            <i data-lucide="clock-3" aria-hidden="true"></i>
            ${duration}h
          </span>
          <span
            class="mc-card__progress"
            role="progressbar"
            aria-valuenow="${pct}"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="${pct}% complété"
          ><span style="--p:${pct}%"></span></span>
          <span class="mc-card__pct">${pct}%</span>
        </div>
      </div>
    </article>`;
}

// ─── Filtrage client-side ─────────────────────────────────
function _applyFilters(container) {
    container.querySelectorAll('.mc-section').forEach(section => {
        const key    = section.dataset.section;
        const query  = (section.querySelector('.mc-search-input')?.value || '').toLowerCase().trim();
        const filter = section.querySelector('.mc-filter-tab.active')?.dataset.filter || 'all';
        const cards  = section.querySelectorAll('.mc-card');
        const empty  = section.querySelector(`#mc-empty-${key}`);
        let visible  = 0;

        cards.forEach(card => {
            const title  = (card.getAttribute('aria-label') || '').toLowerCase();
            const code   = (card.querySelector('.mc-card__banner-code')?.textContent || '').toLowerCase();
            const status = card.dataset.status;

            const matchFilter = filter === 'all' || status === filter;
            const matchQuery  = !query || title.includes(query) || code.includes(query);
            const show = matchFilter && matchQuery;

            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        empty?.classList.toggle('hidden', visible > 0);
    });
}

// ─── SVG Banner generator ─────────────────────────────────
function buildBannerSVG(code, hue) {
    const seed    = hashStr(code);
    const variant = seed % 4;
    const r       = lcgRng(seed);
    const bg1     = `oklch(0.62 0.14 ${hue})`;
    const bg2     = `oklch(0.42 0.16 ${(hue + 30) % 360})`;
    const accent  = `oklch(0.95 0.05 ${hue})`;
    const fade    = `oklch(0.88 0.08 ${hue} / 0.35)`;
    const gid     = `mcg-${code}`;

    let pattern = '';

    if (variant === 0) {
        // Arcs concentriques
        pattern = [0, 1, 2, 3, 4].map(i =>
            `<circle cx="85%" cy="120%" r="${60 + i * 32}" fill="none" stroke="${accent}" stroke-width="1.2" opacity="${(0.18 + i * 0.08).toFixed(2)}"/>`
        ).join('');

    } else if (variant === 1) {
        // Grille de points
        const dots = [];
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 14; x++) {
                const off = (y % 2) * 16;
                dots.push(`<circle cx="${x * 32 + off}" cy="${y * 22}" r="${(1.6 + r() * 1.4).toFixed(1)}" fill="${accent}" opacity="${(0.25 + r() * 0.4).toFixed(2)}"/>`);
            }
        }
        pattern = dots.join('');

    } else if (variant === 2) {
        // Lignes diagonales
        const lines = [];
        for (let i = -4; i < 14; i++) {
            lines.push(`<line x1="${i * 40}" y1="0" x2="${i * 40 + 120}" y2="200" stroke="${accent}" stroke-width="${i % 3 === 0 ? 1.6 : 0.8}" opacity="${(0.2 + (i % 4) * 0.08).toFixed(2)}"/>`);
        }
        pattern = lines.join('');

    } else {
        // Polygones flottants
        const shapes = [];
        for (let i = 0; i < 6; i++) {
            const cx  = (r() * 340).toFixed(1);
            const cy  = (r() * 120).toFixed(1);
            const sz  = (18 + r() * 36).toFixed(1);
            const rot = (r() * 360).toFixed(1);
            const cx2 = (parseFloat(cx) + parseFloat(sz) / 2).toFixed(1);
            const cy2 = (parseFloat(cy) + parseFloat(sz) / 2).toFixed(1);
            shapes.push(`<rect x="${cx}" y="${cy}" width="${sz}" height="${sz}" fill="none" stroke="${accent}" stroke-width="1.4" opacity="${(0.25 + r() * 0.35).toFixed(2)}" transform="rotate(${rot} ${cx2} ${cy2})"/>`);
        }
        pattern = shapes.join('');
    }

    return `<svg viewBox="0 0 360 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="${bg1}"/>
                <stop offset="100%" stop-color="${bg2}"/>
            </linearGradient>
            <radialGradient id="${gid}-glow" cx="20%" cy="20%" r="80%">
                <stop offset="0%" stop-color="${fade}"/>
                <stop offset="100%" stop-color="transparent"/>
            </radialGradient>
        </defs>
        <rect width="360" height="140" fill="url(#${gid})"/>
        <rect width="360" height="140" fill="url(#${gid}-glow)"/>
        ${pattern}
    </svg>`;
}

// ─── Helpers ──────────────────────────────────────────────
function generateCode(titre) {
    // Détecter un préfixe-code existant : "ICP — …" ou "ICP - …"
    const prefixMatch = titre.match(/^([A-Z]{2,5})\s*[—–\-]\s*/);
    if (prefixMatch) return prefixMatch[1];

    // Fallback : initiales des mots significatifs
    const words = titre.split(/[\s''\-–]+/)
        .filter(w => w.length > 1 && !STOPWORDS.has(w.toLowerCase()));
    const letters = words.slice(0, 3).map(w => w[0].toUpperCase());
    if (letters.length >= 2) return letters.join('');
    return titre.replace(/[^a-zA-ZÀ-ÿ]/g, '').slice(0, 3).toUpperCase();
}

function titleToHue(titre) {
    return hashStr(titre) % 360;
}

function hashStr(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
    }
    return h;
}

function lcgRng(seed) {
    let s = seed >>> 0;
    return function () {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
