import { safeCall }           from '../errorHandler.js';
import { getArticles }        from '../models/ArticlesModel.js';
import { renderEspaceZenPage } from '../views/espaceZenView.js';

const VALID_PAGES = ['lecture', 'musique'];

export async function loadEspaceZenPage(container, page) {
    if (!VALID_PAGES.includes(page)) {
        window.location.hash = '#/dashboard';
        return;
    }

    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const articles = page === 'lecture'
        ? await safeCall(() => getArticles({ includeInactive: false }), 'articles') || []
        : [];

    renderEspaceZenPage(container, { page, articles });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
