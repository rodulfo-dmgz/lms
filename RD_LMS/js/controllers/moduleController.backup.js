import { getModulesForStudent }  from '../models/ModuleModel.js';
import { renderModuleList }      from '../views/moduleListView.js';
import { safeCall }              from '../errorHandler.js';

export async function loadModules(container) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement des modules…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const modules = await safeCall(getModulesForStudent, 'modules');

    renderModuleList(container, modules || [], {
        onModuleClick: (coursId) => {
            window.location.hash = `#/modules/${coursId}`;
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
