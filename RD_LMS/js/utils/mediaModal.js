/**
 * mediaModal.js — Visionneuse PDF en modal
 *
 * Utilise la délégation d'événements sur document pour fonctionner
 * avec n'importe quel HTML injecté dynamiquement (blocs de séance,
 * aperçu éditeur, vue stagiaire, etc.).
 *
 * Usage :
 *   import { initMediaModals } from './utils/mediaModal.js';
 *   initMediaModals(); // appeler une seule fois dans app.js
 *
 * Dans le HTML sérialisé, ajouter :
 *   <button data-pdf-url="URL_EMBED" data-pdf-title="Titre">Aperçu</button>
 */

export function initMediaModals() {
    document.addEventListener('click', (e) => {
        const pdfTrigger = e.target.closest('[data-pdf-url]');
        if (!pdfTrigger) return;
        e.preventDefault();
        openPdfModal(pdfTrigger.dataset.pdfUrl, pdfTrigger.dataset.pdfTitle || 'Document PDF');
    });
}

function openPdfModal(url, title) {
    // Fermer un modal déjà ouvert
    document.getElementById('lmsPdfModal')?.remove();
    document.body.classList.remove('modal-open');

    const safeUrl   = url.replace(/"/g, '&quot;');
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Lien "Ouvrir" pointe vers /view (ou directement l'URL si pas Drive)
    const openUrl = safeUrl.includes('drive.google.com')
        ? safeUrl.replace('/preview', '/view')
        : safeUrl;

    const overlay = document.createElement('div');
    overlay.id        = 'lmsPdfModal';
    overlay.className = 'pdf-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', safeTitle);

    overlay.innerHTML = `
      <div class="pdf-modal">
        <div class="pdf-modal-header">
          <div class="pdf-modal-title">
            <i data-lucide="file-text" aria-hidden="true"></i>
            <span>${safeTitle}</span>
          </div>
          <div class="pdf-modal-actions">
            <a href="${openUrl}" target="_blank" rel="noopener"
               class="btn btn-ghost btn-sm" title="Ouvrir dans un onglet">
              <i data-lucide="external-link" aria-hidden="true"></i>
            </a>
            <button class="btn btn-ghost btn-sm pdf-modal-close" aria-label="Fermer">
              <i data-lucide="x" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="pdf-modal-body">
          <iframe src="${safeUrl}" class="pdf-modal-iframe"
                  allow="autoplay" loading="lazy" title="${safeTitle}">
          </iframe>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const close = () => {
        overlay.remove();
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', onKey);
    };

    function onKey(e) { if (e.key === 'Escape') close(); }

    overlay.querySelector('.pdf-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
}
