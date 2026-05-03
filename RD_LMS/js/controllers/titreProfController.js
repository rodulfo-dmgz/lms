import { store }                              from '../store.js';
import { safeCall }                           from '../errorHandler.js';
import { getTitreProDocuments,
         getTitreProReferentielFlat }         from '../models/AdminModel.js';
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
            ? safeCall(() => getTitreProReferentielFlat(titrePro.id), 'référentiel') || []
            : Promise.resolve([]),
    ]);

    renderTitreProfPage(container, { page, titrePro, profile, docs, referentiel });
    // lucide.createIcons + .js-tp-view-pdf listeners câblés dans renderTitreProfPage

    // Câbler les toggles AT/CP
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


