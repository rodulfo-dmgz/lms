import { initMediaModals }  from '../utils/mediaModal.js';
import { mountQuizBlocks }  from '../utils/quizPlayer.js';
import { mountDevoirBlocks } from '../utils/devoirUpload.js';

// Initialiser les modaux PDF pour cet onglet aperçu (délégation sur document)
initMediaModals();

export function loadSeancePreview(container) {
    // On initial open the editor copies data into sessionStorage before window.open().
    // On subsequent refreshes (or if sessionStorage was lost) fall back to localStorage.
    const raw =
        sessionStorage.getItem('lms_preview_seance') ||
        localStorage.getItem('lms_preview_seance');

    if (!raw) {
        container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    height:100vh;gap:var(--space-4);color:var(--text-muted);text-align:center;padding:var(--space-8)">
          <i data-lucide="eye-off" style="width:48px;height:48px"></i>
          <h2 style="margin:0;font-size:var(--font-h4-size)">Aucun aperçu disponible</h2>
          <p style="margin:0;font-size:var(--font-body2-size)">
            Ouvrez cet onglet depuis l'éditeur de séance via le bouton « Aperçu stagiaire ».
          </p>
          <button class="btn btn-secondary" onclick="window.close()">Fermer</button>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    renderPreview(container, raw);
}

function renderPreview(container, raw) {
    let data;
    try { data = JSON.parse(raw); } catch { data = { titre: 'Aperçu', html: raw }; }

    const { titre = 'Séance', html = '', ts } = data;
    const lastSaved = ts
        ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null;

    container.innerHTML = `
    <div class="preview-shell">
      <div class="preview-topbar">
        <div class="preview-topbar-left">
          <span class="badge badge-warning" style="font-size:11px;letter-spacing:.04em">
            <i data-lucide="eye" style="width:12px;height:12px"></i> APERÇU STAGIAIRE
          </span>
          <span class="preview-topbar-title">${escapeHtml(titre)}</span>
          ${lastSaved ? `<span class="preview-ts" title="Dernière mise à jour de l'éditeur">
            <i data-lucide="clock" style="width:12px;height:12px"></i> ${lastSaved}
          </span>` : ''}
        </div>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <button class="btn btn-sm btn-ghost" id="preview-refresh-btn" title="Recharger le contenu depuis l'éditeur">
            <i data-lucide="refresh-cw" aria-hidden="true"></i> Actualiser
          </button>
          <button class="btn btn-sm btn-secondary" onclick="window.close()">
            <i data-lucide="x" aria-hidden="true"></i> Fermer
          </button>
        </div>
      </div>

      <div class="preview-body">
        <div class="page-progression">
          <div class="accordion" id="preview-accordion">
            <div class="accordion-item open" data-seance-id="preview">
              <div class="accordion-header" role="button" tabindex="0" aria-expanded="true">
                <div class="accordion-header-left">
                  <i data-lucide="circle" class="badge-icon badge-neutral" aria-hidden="true"></i>
                  <span class="accordion-titre">${escapeHtml(titre)}</span>
                  <span class="badge badge-neutral">À faire</span>
                </div>
                <div class="accordion-header-right">
                  <button class="btn btn-sm btn-cta-soft" disabled>
                    <i data-lucide="check" aria-hidden="true"></i>
                    <span>Marquer terminé</span>
                  </button>
                  <i data-lucide="chevron-down" class="accordion-chevron" aria-hidden="true"></i>
                </div>
              </div>
              <div class="accordion-content" id="content-preview">
                <div class="accordion-inner">
                  <div class="seance-contenu">${sanitizePreview(html)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Monter les blocs quiz/devoir en mode aperçu (sans interaction DB)
    mountQuizBlocks(container,  { seanceId: 'preview', stagiaireId: null, previewMode: true });
    mountDevoirBlocks(container, { seanceId: 'preview', stagiaireId: null, previewMode: true });

    // Accordion toggle (cosmetic only — "Marquer terminé" is disabled)
    const header = container.querySelector('.accordion-header');
    header?.addEventListener('click', () => {
        const item = header.closest('.accordion-item');
        item.classList.toggle('open');
        header.setAttribute('aria-expanded', String(item.classList.contains('open')));
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
    });

    // Refresh button — re-reads localStorage for live editor updates
    const refreshBtn = container.querySelector('#preview-refresh-btn');
    refreshBtn?.addEventListener('click', () => {
        const latest = localStorage.getItem('lms_preview_seance');
        if (!latest) {
            refreshBtn.innerHTML = '<i data-lucide="alert-circle" aria-hidden="true"></i> Aucune donnée';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: refreshBtn });
            setTimeout(() => {
                refreshBtn.innerHTML = '<i data-lucide="refresh-cw" aria-hidden="true"></i> Actualiser';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: refreshBtn });
            }, 2000);
            return;
        }
        renderPreview(container, latest);
    });
}

function sanitizePreview(html) {
    if (typeof DOMPurify === 'undefined') return html;
    return DOMPurify.sanitize(html, {
        ADD_TAGS:  ['iframe', 'audio', 'source'],
        ADD_ATTR:  ['allow', 'allowfullscreen', 'frameborder', 'loading',
                    'data-lucide', 'controls', 'preload', 'type', 'autoplay',
                    'loop', 'muted', 'src', 'poster', 'width', 'height',
                    'data-pdf-url', 'data-pdf-title',
                    'data-audio-url', 'data-audio-title',
                    'data-quiz', 'data-devoir'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|blob|data|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
