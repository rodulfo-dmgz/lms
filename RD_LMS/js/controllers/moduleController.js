import { getModulesForStudent }  from '../models/ModuleModel.js';
import { getProgressSummary }    from '../models/DashboardModel.js';
import { renderModuleList }      from '../views/moduleListView.js';
import { safeCall }              from '../errorHandler.js';
import { store }                 from '../store.js';

export async function loadModules(container) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement des modules…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const profileId = store.getActiveProfileId();

    // Fetch modules + progression en parallèle
    const [modules, progress] = await Promise.all([
        safeCall(getModulesForStudent, 'modules'),
        safeCall(() => getProgressSummary(profileId), 'progress'),
    ]);

    // Construire un index progress par cours_id
    const progressMap = new Map((progress || []).map(p => [p.cours_id, p]));

    // Enrichir chaque module avec sa progression
    const enriched = (modules || []).map(m => {
        const p = progressMap.get(m.cours_id) || {};
        const pct = p.pourcentage ?? 0;
        return {
            ...m,
            pourcentage:   pct,
            total_seances: p.total_seances ?? 0,
            terminees:     p.terminees ?? 0,
            status: pct === 100 ? 'done' : pct > 0 ? 'in-progress' : 'pending',
        };
    });

    renderModuleList(container, enriched, {
        onModuleClick: (coursId) => {
            window.location.hash = `#/modules/${coursId}`;
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
