import { store }                              from '../store.js';
import { safeCall }                           from '../errorHandler.js';
import { getTitreProDocuments,
         getTitreProReferentiel }             from '../models/AdminModel.js';
import { renderTitreProfPage }               from '../views/titreProfView.js';

const VALID_PAGES = ['reac', 'competences', 'referentiel', 'ecf', 'dossier-pro'];

export async function loadTitreProfPage(container, page) {
    if (!VALID_PAGES.includes(page)) {
        window.location.hash = '#/dashboard';
        return;
    }

    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    const profile  = store.getActiveProfile();
    const titrePro = profile?.titre_pro ?? null;

    // Charger docs + référentiel AT/CP en parallèle
    const [docs, referentiel] = await Promise.all([
        titrePro?.id
            ? safeCall(() => getTitreProDocuments(titrePro.id), 'documents') || []
            : Promise.resolve([]),
        titrePro?.id && (page === 'competences' || page === 'reac')
            ? safeCall(() => getTitreProReferentiel(titrePro.id), 'référentiel') || []
            : Promise.resolve([]),
    ]);

    renderTitreProfPage(container, { page, titrePro, profile, docs, referentiel });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // Câbler les toggles après injection HTML
    mountPDFToggles(container);
    mountCCPToggles(container);
}

function mountCCPToggles(container) {
    container.querySelectorAll('.js-ccp-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const bodyId = btn.dataset.target;
            const body   = container.querySelector(`#${bodyId}`);
            if (!body) return;
            const isOpen = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!isOpen));
            body.style.display = isOpen ? 'none' : 'block';
            // Swap chevron icon — ré-injection <i> obligatoire car lucide.createIcons remplace <i> par <svg>
            const arrow = btn.querySelector('.tp-ccp__arrow, [data-lucide="chevron-up"], [data-lucide="chevron-down"]');
            if (arrow) {
                const newIcon = document.createElement('i');
                newIcon.setAttribute('data-lucide', isOpen ? 'chevron-down' : 'chevron-up');
                newIcon.className = 'tp-ccp__arrow';
                newIcon.setAttribute('aria-hidden', 'true');
                arrow.replaceWith(newIcon);
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            }
        });
    });
}

function mountPDFToggles(container) {
    container.querySelectorAll('.js-pdf-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const wrapperId = btn.dataset.target;
            const wrapper   = container.querySelector(`#${wrapperId}`);
            if (!wrapper) return;
            const isOpen = btn.classList.contains('tp-pdf-toggle--open');
            btn.classList.toggle('tp-pdf-toggle--open', !isOpen);
            btn.setAttribute('aria-expanded', String(!isOpen));
            wrapper.style.display = isOpen ? 'none' : 'block';

            // Swap chevron — ré-injection <i> (Lucide remplace <i> par <svg>)
            const arrow = btn.querySelector('.tp-pdf-toggle__arrow, [data-lucide="chevron-down"], [data-lucide="chevron-up"]');
            if (arrow) {
                const newIcon = document.createElement('i');
                newIcon.setAttribute('data-lucide', isOpen ? 'chevron-down' : 'chevron-up');
                newIcon.className = 'tp-pdf-toggle__arrow';
                newIcon.setAttribute('aria-hidden', 'true');
                arrow.replaceWith(newIcon);
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            }

            // Injecter le src de l'iframe seulement quand on ouvre (lazy load)
            if (!isOpen) {
                const iframe = wrapper.querySelector('iframe[data-src]');
                if (iframe) {
                    iframe.src = iframe.dataset.src;
                    delete iframe.dataset.src;
                }
            }
        });
    });
}
