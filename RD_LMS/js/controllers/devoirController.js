import { renderDevoirGrade } from '../views/admin/devoirGradeView.js';
import { store }             from '../store.js';

export function loadDevoirGrade(container) {
    if (store.getRole() !== 'admin') {
        window.location.hash = '#/dashboard';
        return;
    }
    container.innerHTML = '';
    renderDevoirGrade(container);
}
