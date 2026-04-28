import { renderProgression } from '../views/admin/progressionView.js';
import { store }             from '../store.js';

export async function loadProgression(container) {
    const role = store.getRole();
    if (!['admin', 'formateur', 'formateur_editeur'].includes(role)) {
        window.location.hash = '#/dashboard';
        return;
    }
    await renderProgression(container);
}
