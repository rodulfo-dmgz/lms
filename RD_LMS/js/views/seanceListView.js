import { formatDate }       from '../utils/dateUtils.js';
import { mountQuizBlocks }  from '../utils/quizPlayer.js';
import { mountDevoirBlocks } from '../utils/devoirUpload.js';
import { store }             from '../store.js';

const BADGE_CONFIG = {
    termine:      { label: 'Terminé',  css: 'badge-success', icon: 'check-circle' },
    en_cours:     { label: 'En cours', css: 'badge-warning', icon: 'clock' },
    non_commence: { label: 'À faire',  css: 'badge-neutral', icon: 'circle' }
};

export function renderSeanceList(container, seances, moduleId, sequenceId, { onToggle, onBack, seanceId: _unused }) {
    const profile     = store.getProfile();
    const stagiaireId = profile?.id;
    const isPreview   = store.getRole() === 'admin';
    const total    = seances.length;
    const termines = seances.filter(s => s.statut === 'termine').length;
    const pct      = total ? Math.round(termines / total * 100) : 0;

    container.innerHTML = `
    <div class="page-progression">
      <button class="btn-back" id="btn-back">
        <i data-lucide="arrow-left" aria-hidden="true"></i> Retour
      </button>

      <div class="progression-header">
        <h2 class="page-title">Séances</h2>
        <div class="progression-stats">
          <div class="progression-stat">
            <span class="progression-stat__value">${termines}/${total}</span>
            <span class="progression-stat__label">séances</span>
          </div>
          <div class="progression-stat">
            <span class="progression-stat__value" style="color:var(--action-secondary)">${pct}%</span>
            <span class="progression-stat__label">terminé</span>
          </div>
        </div>
      </div>

      <div class="progression-progress">
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${pct}%"
               role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>

      <div class="accordion" id="accordion-seances" role="list"></div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('btn-back').addEventListener('click', onBack);

    const accordion = document.getElementById('accordion-seances');
    accordion.innerHTML = seances.map(buildItem).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: accordion });

    // Re-run lucide + mount interactive blocks when accordion opens
    accordion.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            requestAnimationFrame(() => {
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: accordion });
                // Monter les blocs interactifs dans l'item qui vient de s'ouvrir
                const item = header.closest('.accordion-item');
                if (!item?.classList.contains('open')) return;
                const seanceId = item.dataset.seanceId;
                const content  = item.querySelector('.seance-contenu');
                if (!content || content.dataset.interactiveMounted === 'true') return;
                content.dataset.interactiveMounted = 'true';
                mountQuizBlocks(content, { seanceId, stagiaireId, previewMode: isPreview });
                mountDevoirBlocks(content, { seanceId, stagiaireId, previewMode: isPreview });
            });
        }, { capture: true });
    });

    // Toggle accordéon
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

function buildItem(s) {
    const b        = BADGE_CONFIG[s.statut] || BADGE_CONFIG.non_commence;
    const btnLabel = s.statut === 'termine' ? 'Réinitialiser' : 'Marquer terminé';
    const btnIcon  = s.statut === 'termine' ? 'rotate-ccw' : 'check';
    return `
    <div class="accordion-item" data-seance-id="${s.id}" role="listitem">
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
    const fill     = container.querySelector('.progress-bar__fill');
    if (fill) {
        fill.style.width = `${pct}%`;
        fill.setAttribute('aria-valuenow', pct);
    }
    const statEl = container.querySelector('.progression-stat__value');
    if (statEl) statEl.textContent = `${termines}/${total}`;
    const pctEl = container.querySelectorAll('.progression-stat__value')[1];
    if (pctEl) pctEl.textContent = `${pct}%`;
}

function sanitize(html) {
    if (typeof DOMPurify === 'undefined') return escapeText(html);
    return DOMPurify.sanitize(html, {
        ADD_TAGS:  ['iframe', 'audio', 'source'],
        ADD_ATTR:  ['allow', 'allowfullscreen', 'frameborder', 'loading',
                    'data-lucide', 'controls', 'preload', 'type', 'autoplay',
                    'loop', 'muted', 'src', 'poster',
                    'data-pdf-url', 'data-pdf-title',
                    'data-audio-url', 'data-audio-title',
                    'data-quiz', 'data-devoir'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|blob|data|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
}

function escapeText(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
