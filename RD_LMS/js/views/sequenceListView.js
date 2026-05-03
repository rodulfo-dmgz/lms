/**
 * sequenceListView.js — Vue liste des séquences (redesign v2)
 * Design cohérent avec moduleListView : mc-card, bannières SVG génératives,
 * hero bannière module avec image_url si disponible.
 */

const STOPWORDS = new Set([
    'et','de','la','le','les','du','des','en','au','aux','un','une',
    'à','par','pour','sur','dans','avec','ou','que','qui','ne','pas',
    'se','sa','son','ses','l','d','cette','ce','cet','ces',
]);

export function renderSequenceList(container, { cours, sequences, onSequenceClick, onBack }) {
    const imageUrl = cours?.image_url || null;
    const count    = sequences.length;

    container.innerHTML = `
    <div class="page-sequences">

      <!-- Hero bannière module ─────────────────────────── -->
      <div class="seq-hero${imageUrl ? ' seq-hero--has-img' : ''}">
        ${imageUrl
            ? `<img src="${escAttr(imageUrl)}" alt="" loading="lazy" class="seq-hero__bg">`
            : buildHeroSVG(cours?.titre || '')}
        <div class="seq-hero__overlay"></div>
        <div class="seq-hero__content">
          <button class="seq-hero__back" id="btn-back">
            <i data-lucide="arrow-left" aria-hidden="true"></i>
            Retour aux modules
          </button>
          ${cours ? `
          <h1 class="seq-hero__title">${esc(cours.titre)}</h1>
          ${cours.objectif_pedagogique || cours.description
              ? `<p class="seq-hero__sub">${esc(cours.objectif_pedagogique || cours.description)}</p>`
              : ''}` : ''}
        </div>
      </div>

      <!-- Section séquences ───────────────────────────── -->
      <section class="mc-section seq-section">
        <div class="mc-section-header">
          <div>
            <h2 class="mc-section-title">
              <i data-lucide="list" aria-hidden="true"></i>
              Séquences
              <span class="mc-count">${count}</span>
            </h2>
          </div>
        </div>

        ${count ? `
        <div class="mc-grid" id="grid-sequences">
          ${sequences.map((s, i) => buildSeqCard(s, i)).join('')}
        </div>` : `
        <div class="mc-grid-empty">
          <i data-lucide="inbox" aria-hidden="true"></i>
          <span>Aucune séquence disponible.</span>
        </div>`}
      </section>

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
    container.querySelector('#btn-back')?.addEventListener('click', onBack);

    container.querySelectorAll('.mc-card[data-id]').forEach(card => {
        const id = card.dataset.id;
        card.addEventListener('click',   () => onSequenceClick(id));
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSequenceClick(id); }
        });
    });
}

// ─── Carte séquence ────────────────────────────────────────────
function buildSeqCard(s, i) {
    const hue    = titleToHue(s.titre);
    const code   = generateCode(s.titre);
    const banner = s.image_url
        ? `<img src="${escAttr(s.image_url)}" alt="" loading="lazy" class="mc-card__banner-img">`
        : buildBannerSVG(code, hue);

    return `
    <article
      class="mc-card"
      data-id="${s.id}"
      role="button"
      tabindex="0"
      aria-label="${esc(s.titre)}"
    >
      <div class="mc-card__banner">
        ${banner}
        <span class="mc-card__banner-code">${esc(code)}</span>
        <span class="mc-card__banner-status">Séquence ${i + 1}</span>
      </div>
      <div class="mc-card__body">
        <h3 class="mc-card__title">${esc(s.titre)}</h3>
        ${s.objectif
            ? `<p class="seq-card__objectif">${esc(s.objectif)}</p>`
            : ''}
      </div>
    </article>`;
}

// ─── SVG héro (grand format, fond coloré) ─────────────────────
function buildHeroSVG(titre) {
    const hue  = titleToHue(titre);
    const code = generateCode(titre);
    const seed = hashStr(code || titre);
    const r    = lcgRng(seed);
    const bg1  = `oklch(0.52 0.17 ${hue})`;
    const bg2  = `oklch(0.36 0.19 ${(hue + 40) % 360})`;
    const acc  = `oklch(0.92 0.06 ${hue})`;
    const gid  = `shg-${code}`;
    const variant = seed % 3;

    let pattern = '';
    if (variant === 0) {
        pattern = [0,1,2,3,4,5].map(i =>
            `<circle cx="88%" cy="115%" r="${90 + i * 60}" fill="none" stroke="${acc}" stroke-width="1.5" opacity="${(0.10 + i * 0.06).toFixed(2)}"/>`
        ).join('');
    } else if (variant === 1) {
        const lines = [];
        for (let i = -6; i < 22; i++) {
            lines.push(`<line x1="${i*60}" y1="0" x2="${i*60+200}" y2="280" stroke="${acc}" stroke-width="${i%4===0?2:0.8}" opacity="${(0.12+(i%5)*0.06).toFixed(2)}"/>`);
        }
        pattern = lines.join('');
    } else {
        const dots = [];
        for (let y = 0; y < 9; y++) for (let x = 0; x < 24; x++) {
            const off = (y % 2) * 22;
            dots.push(`<circle cx="${x*42+off}" cy="${y*36}" r="${(1.6+r()*2).toFixed(1)}" fill="${acc}" opacity="${(0.15+r()*0.4).toFixed(2)}"/>`);
        }
        pattern = dots.join('');
    }

    return `<svg viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true" class="seq-hero__svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="${bg1}"/>
                <stop offset="100%" stop-color="${bg2}"/>
            </linearGradient>
        </defs>
        <rect width="900" height="280" fill="url(#${gid})"/>
        ${pattern}
    </svg>`;
}

// ─── Banner SVG cartes (identique à moduleListView) ────────────
function buildBannerSVG(code, hue) {
    const seed    = hashStr(code);
    const variant = seed % 4;
    const r       = lcgRng(seed);
    const bg1     = `oklch(0.62 0.14 ${hue})`;
    const bg2     = `oklch(0.42 0.16 ${(hue + 30) % 360})`;
    const accent  = `oklch(0.95 0.05 ${hue})`;
    const fade    = `oklch(0.88 0.08 ${hue} / 0.35)`;
    const gid     = `sqg-${code}`;

    let pattern = '';
    if (variant === 0) {
        pattern = [0,1,2,3,4].map(i =>
            `<circle cx="85%" cy="120%" r="${60+i*32}" fill="none" stroke="${accent}" stroke-width="1.2" opacity="${(0.18+i*0.08).toFixed(2)}"/>`
        ).join('');
    } else if (variant === 1) {
        const dots = [];
        for (let y = 0; y < 6; y++) for (let x = 0; x < 14; x++) {
            const off = (y%2)*16;
            dots.push(`<circle cx="${x*32+off}" cy="${y*22}" r="${(1.6+r()*1.4).toFixed(1)}" fill="${accent}" opacity="${(0.25+r()*0.4).toFixed(2)}"/>`);
        }
        pattern = dots.join('');
    } else if (variant === 2) {
        const lines = [];
        for (let i = -4; i < 14; i++) {
            lines.push(`<line x1="${i*40}" y1="0" x2="${i*40+120}" y2="200" stroke="${accent}" stroke-width="${i%3===0?1.6:0.8}" opacity="${(0.2+(i%4)*0.08).toFixed(2)}"/>`);
        }
        pattern = lines.join('');
    } else {
        const shapes = [];
        for (let i = 0; i < 6; i++) {
            const cx = (r()*340).toFixed(1), cy = (r()*120).toFixed(1);
            const sz = (18+r()*36).toFixed(1), rot = (r()*360).toFixed(1);
            const cx2 = (parseFloat(cx)+parseFloat(sz)/2).toFixed(1);
            const cy2 = (parseFloat(cy)+parseFloat(sz)/2).toFixed(1);
            shapes.push(`<rect x="${cx}" y="${cy}" width="${sz}" height="${sz}" fill="none" stroke="${accent}" stroke-width="1.4" opacity="${(0.25+r()*0.35).toFixed(2)}" transform="rotate(${rot} ${cx2} ${cy2})"/>`);
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

// ─── Helpers ───────────────────────────────────────────────────
function generateCode(titre) {
    const prefixMatch = titre.match(/^([A-Z]{2,5})\s*[—–\-]\s*/);
    if (prefixMatch) return prefixMatch[1];
    const words = titre.split(/[\s''\-–]+/)
        .filter(w => w.length > 1 && !STOPWORDS.has(w.toLowerCase()));
    const letters = words.slice(0, 3).map(w => w[0].toUpperCase());
    if (letters.length >= 2) return letters.join('');
    return titre.replace(/[^a-zA-ZÀ-ÿ]/g, '').slice(0, 3).toUpperCase();
}

function titleToHue(titre) { return hashStr(titre) % 360; }

function hashStr(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
    return h;
}

function lcgRng(seed) {
    let s = seed >>> 0;
    return function() {
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
