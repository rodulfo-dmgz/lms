import { formatDate }              from '../utils/dateUtils.js';
import { mountQuizBlocks }         from '../utils/quizPlayer.js';
import { mountDevoirBlocks }       from '../utils/devoirUpload.js';
import { mountResourcesGroupBlocks } from './admin/seanceEditorView.js';
import { store }                   from '../store.js';

const STOPWORDS = new Set([
    'et','de','la','le','les','du','des','en','au','aux','un','une',
    'à','par','pour','sur','dans','avec','ou','que','qui','ne','pas',
    'se','sa','son','ses','l','d','cette','ce','cet','ces',
]);

const BADGE_CONFIG = {
    termine:      { label: 'Terminé',  css: 'badge-success', icon: 'check-circle' },
    en_cours:     { label: 'En cours', css: 'badge-warning', icon: 'clock' },
    non_commence: { label: 'À faire',  css: 'badge-neutral', icon: 'circle' }
};

/**
 * @param {HTMLElement} container
 * @param {Array}  seances
 * @param {string} moduleId
 * @param {string} sequenceId
 * @param {Object|null} sequence   — { titre, objectif, image_url }
 * @param {{ onToggle, onBack }} callbacks
 */
export function renderSeanceList(container, seances, moduleId, sequenceId, sequence, { onToggle, onBack }) {
    const stagiaireId = store.getActiveProfileId();
    const isPreview   = false;
    const total    = seances.length;
    const termines = seances.filter(s => s.statut === 'termine').length;
    const pct      = total ? Math.round(termines / total * 100) : 0;

    const imageUrl   = sequence?.image_url || null;
    const seqTitre   = sequence?.titre   || 'Séances';
    const seqObjectif = sequence?.objectif || null;

    container.innerHTML = `
    <div class="page-seances">

      <!-- ── Hero bannière séquence ──────────────────────── -->
      <div class="seq-hero${imageUrl ? ' seq-hero--has-img' : ''}">
        ${imageUrl
            ? `<img src="${escAttr(imageUrl)}" alt="" loading="lazy" class="seq-hero__bg">`
            : buildHeroSVG(seqTitre)}
        <div class="seq-hero__overlay"></div>
        <div class="seq-hero__content">
          <button class="seq-hero__back" id="btn-back">
            <i data-lucide="arrow-left" aria-hidden="true"></i>
            Retour aux séquences
          </button>
          <h1 class="seq-hero__title">${esc(seqTitre)}</h1>
          ${seqObjectif ? `<p class="seq-hero__sub">${esc(seqObjectif)}</p>` : ''}
        </div>
      </div>

      <!-- ── Barre de progression ────────────────────────── -->
      <div class="seance-progress-bar-row">
        <div class="seance-progress-bar-row__labels">
          <span class="seance-progress-bar-row__title">Progression</span>
          <div class="seance-progress-bar-row__stats">
            <span class="seance-progress-bar-row__count">${termines}/${total} séances</span>
            <span class="seance-progress-bar-row__pct">${pct}%</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" id="progress-fill" style="width:${pct}%"
               role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          </div>
        </div>
      </div>

      <!-- ── Accordéon séances ───────────────────────────── -->
      <div class="accordion" id="accordion-seances" role="list"></div>

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    container.querySelector('#btn-back').addEventListener('click', onBack);

    const accordion = container.querySelector('#accordion-seances');
    accordion.innerHTML = seances.map(buildItem).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: accordion });

    // Monter les blocs interactifs à l'ouverture d'un item
    accordion.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            requestAnimationFrame(() => {
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: accordion });
                const item = header.closest('.accordion-item');
                if (!item?.classList.contains('open')) return;
                const seanceId    = item.dataset.seanceId;
                const seanceTitre = item.dataset.seanceTitre || '';
                const content  = item.querySelector('.seance-contenu');
                if (!content || content.dataset.interactiveMounted === 'true') return;
                content.dataset.interactiveMounted = 'true';
                mountQuizBlocks(content, { seanceId, stagiaireId, previewMode: isPreview });
                mountDevoirBlocks(content, { seanceId, stagiaireId, seanceTitre, previewMode: isPreview });
                mountResourcesGroupBlocks(content);
            });
        }, { capture: true });
    });

    // Toggle accordéon (une seule ouverture à la fois)
    accordion.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.btn-toggle')) return;
            const item   = header.closest('.accordion-item');
            const isOpen = item.classList.contains('open');
            accordion.querySelectorAll('.accordion-item').forEach(i => {
                i.classList.remove('open');
                i.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'false');
            });
            if (!isOpen) {
                item.classList.add('open');
                header.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Toggle progression
    accordion.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const seanceId = btn.dataset.seanceId;
            btn.disabled = true;
            try {
                const newStatut = await onToggle(seanceId);
                updateItemUI(accordion, seanceId, newStatut);
                updateProgressBar(container, seances, seanceId, newStatut);
            } finally {
                btn.disabled = false;
            }
        });
    });
}

// ── Carte accordéon ────────────────────────────────────────────
function buildItem(s) {
    const b        = BADGE_CONFIG[s.statut] || BADGE_CONFIG.non_commence;
    const btnLabel = s.statut === 'termine' ? 'Réinitialiser' : 'Marquer terminé';
    const btnIcon  = s.statut === 'termine' ? 'rotate-ccw' : 'check';
    return `
    <div class="accordion-item" data-seance-id="${s.id}" data-seance-titre="${escapeText(s.titre)}" role="listitem">
      <div class="accordion-header" role="button" tabindex="0"
           aria-expanded="false" aria-controls="content-${s.id}">
        <div class="accordion-header-left">
          <i data-lucide="${b.icon}" class="badge-icon ${b.css}" aria-hidden="true"></i>
          <span class="accordion-titre">${escapeText(s.titre)}</span>
          <span class="badge ${b.css}" data-badge="${s.id}">${b.label}</span>
        </div>
        <div class="accordion-header-right">
          ${s.duree_heures ? `<span class="accordion-duree">${s.duree_heures}h</span>` : ''}
          <button class="btn btn-sm btn-toggle ${s.statut === 'termine' ? 'btn-secondary' : 'btn-cta-soft'}"
                  data-seance-id="${s.id}" aria-label="${btnLabel}">
            <i data-lucide="${btnIcon}" aria-hidden="true"></i>
            <span>${btnLabel}</span>
          </button>
          <i data-lucide="chevron-down" class="accordion-chevron" aria-hidden="true"></i>
        </div>
      </div>
      <div class="accordion-content" id="content-${s.id}" role="region">
        <div class="accordion-inner">
          ${s.type ? `<span class="tag-type tag-${s.type}">${s.type.toUpperCase()}</span>` : ''}
          ${s.contenu
              ? `<div class="seance-contenu">${sanitize(s.contenu)}</div>`
              : '<p class="empty-state">Contenu à venir.</p>'}
          ${s.date_completion
              ? `<p class="date-completion">
                   <i data-lucide="calendar-check" aria-hidden="true"></i>
                   Terminé le ${formatDate(s.date_completion)}
                 </p>`
              : ''}
        </div>
      </div>
    </div>`;
}

// ── Mises à jour dynamiques ────────────────────────────────────
function updateItemUI(accordion, seanceId, newStatut) {
    const item  = accordion.querySelector(`.accordion-item[data-seance-id="${seanceId}"]`);
    const badge = accordion.querySelector(`[data-badge="${seanceId}"]`);
    const btn   = accordion.querySelector(`.btn-toggle[data-seance-id="${seanceId}"]`);
    if (!item || !badge || !btn) return;
    const b = BADGE_CONFIG[newStatut] || BADGE_CONFIG.non_commence;
    badge.textContent = b.label;
    badge.className   = `badge ${b.css}`;
    const newLabel    = newStatut === 'termine' ? 'Réinitialiser' : 'Marquer terminé';
    const newIcon     = newStatut === 'termine' ? 'rotate-ccw' : 'check';
    btn.className     = `btn btn-sm btn-toggle ${newStatut === 'termine' ? 'btn-secondary' : 'btn-cta-soft'}`;
    btn.innerHTML     = `<i data-lucide="${newIcon}" aria-hidden="true"></i><span>${newLabel}</span>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
}

function updateProgressBar(container, seances, seanceId, newStatut) {
    const idx = seances.findIndex(s => s.id === seanceId);
    if (idx !== -1) seances[idx].statut = newStatut;
    const total    = seances.length;
    const termines = seances.filter(s => s.statut === 'termine').length;
    const pct      = total ? Math.round(termines / total * 100) : 0;

    const fill = container.querySelector('#progress-fill');
    if (fill) { fill.style.width = `${pct}%`; fill.setAttribute('aria-valuenow', pct); }

    const countEl = container.querySelector('.seance-progress-bar-row__count');
    if (countEl) countEl.textContent = `${termines}/${total} séances`;

    const pctEl = container.querySelector('.seance-progress-bar-row__pct');
    if (pctEl) pctEl.textContent = `${pct}%`;
}

// ── Hero SVG générative (réutilisé depuis sequenceListView) ────
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

// ── Helpers ────────────────────────────────────────────────────
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
function sanitize(html) {
    if (typeof DOMPurify === 'undefined') return escapeText(html);
    return DOMPurify.sanitize(html, {
        ADD_TAGS:  ['iframe', 'audio', 'source', 'details', 'summary'],
        ADD_ATTR:  [
            'target', 'rel', 'download', 'open',
            'allow', 'allowfullscreen', 'frameborder', 'loading',
            'controls', 'preload', 'type', 'autoplay',
            'loop', 'muted', 'src', 'poster',
            'data-lucide',
            'data-pdf-url', 'data-pdf-title',
            'data-audio-url', 'data-audio-title',
            'data-quiz', 'data-devoir',
            'data-rg-files', 'data-rg-zip',
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|blob|data|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
}
function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
function escAttr(str) { return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeText(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
