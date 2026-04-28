import { getMesCoursDetail } from '../models/MesCoursModel.js';
import { renderMesCours }    from '../views/coursView.js';
import { safeCall }          from '../errorHandler.js';

export async function loadMesCours(container) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement de vos cours…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const data = await safeCall(getMesCoursDetail, 'mes-cours');
    if (!data) return;

    renderMesCours(container, data);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    container.querySelector('#printBtn')?.addEventListener('click', () => window.print());
}
