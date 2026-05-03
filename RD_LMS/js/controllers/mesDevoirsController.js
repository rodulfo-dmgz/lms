import { renderMesDevoirs } from '../views/mesDevoirsView.js';
import { getMesDevoirs }    from '../models/DevoirModel.js';
import { safeCall }         from '../errorHandler.js';
import { store }            from '../store.js';

export async function loadMesDevoirs(container) {
    container.innerHTML = `<div class="loading">
      <i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Chargement…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    const profileId = store.getActiveProfileId();
    const devoirs   = await safeCall(() => getMesDevoirs(profileId), 'mes devoirs') ?? [];

    renderMesDevoirs(container, { devoirs, profile: store.getActiveProfile() });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}
