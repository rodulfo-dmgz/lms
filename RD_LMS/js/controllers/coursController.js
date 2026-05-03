import { getMesCoursDetail } from '../models/MesCoursModel.js';
import { renderMesCours }    from '../views/coursView.js';
import { safeCall }          from '../errorHandler.js';
import { store }             from '../store.js';

export async function loadMesCours(container) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement de vos cours…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const data = await safeCall(getMesCoursDetail, 'mes-cours');
    if (!data) return;

    // Passer le profil actif (viewAs ou propre profil) pour personnaliser l'affichage
    renderMesCours(container, { ...data, profile: store.getActiveProfile() });
    if (typeof lucide !== 'undefined') lucide.createIcons();

    container.querySelector('#printBtn')?.addEventListener('click', () => window.print());
}
