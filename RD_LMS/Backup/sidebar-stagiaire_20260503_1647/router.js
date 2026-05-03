import { loadChangePassword }                          from './controllers/authController.js';
import { loadDashboard }                              from './controllers/dashboardController.js';
import { loadModules }                               from './controllers/moduleController.js';
import { loadSequences }                             from './controllers/sequenceController.js';
import { loadSeances }                               from './controllers/seanceController.js';
import { loadAdmin }                                 from './controllers/adminController.js';
import { loadParcoursAdmin, loadParcoursTree, loadSeanceEditor } from './controllers/parcoursController.js';
import { loadDevoirGrade }  from './controllers/devoirController.js';
import { loadProgression }  from './controllers/progressionController.js';
import { loadProfile }                               from './controllers/profileController.js';
import { loadMesCours }                              from './controllers/coursController.js';
import { loadMesDevoirs }                            from './controllers/mesDevoirsController.js';
import { loadNotifications }                         from './controllers/notificationsController.js';
import { loadSeancePreview }                         from './controllers/previewController.js';
import { store }                                     from './store.js';

export function initRouter(container) {
    window.addEventListener('hashchange', () => route(container));
    route(container);
}

async function route(container) {
    const hash    = location.hash.slice(1) || '/dashboard';
    const profile = store.getProfile();

    if (profile?.first_login && hash !== '/changer-mot-de-passe') {
        window.location.hash = '#/changer-mot-de-passe'; return;
    }

    if (hash === '/changer-mot-de-passe') return loadChangePassword(container);
    if (hash === '/preview/seance')       return loadSeancePreview(container);
    if (hash === '/' || hash === '/dashboard') return loadDashboard(container);
    if (hash === '/modules')                   return loadModules(container);
    if (hash === '/profil')                    return loadProfile(container);
    if (hash === '/mes-cours')                 return loadMesCours(container);
    if (hash === '/mes-devoirs')               return loadMesDevoirs(container);
    if (hash === '/notifications')             return loadNotifications(container);

    // Routes accessibles aux formateurs aussi
    if (hash === '/admin/progression') {
        const r = store.getRole();
        if (!['admin','formateur','formateur_editeur'].includes(r)) {
            window.location.hash = '#/dashboard'; return;
        }
        return loadProgression(container);
    }

    if (hash.startsWith('/admin') || hash.startsWith('/admin/seances')) {
        if (store.getRole() !== 'admin') { window.location.hash = '#/dashboard'; return; }

        if (hash === '/admin/devoirs')      return loadDevoirGrade(container);

        const seanceEditMatch = hash.match(/^\/admin\/seances\/([^/]+)\/edit$/);
        if (seanceEditMatch) return loadSeanceEditor(container, seanceEditMatch[1]);

        const parcoursMatch = hash.match(/^\/admin\/parcours\/([^/?]+)/);
        if (parcoursMatch) return loadParcoursTree(container, parcoursMatch[1]);
        if (hash.startsWith('/admin/parcours')) return loadParcoursAdmin(container);

        return loadAdmin(container);
    }

    const seqMatch = hash.match(/^\/modules\/([^/]+)$/);
    if (seqMatch) return loadSequences(container, seqMatch[1]);

    const seanceMatch = hash.match(/^\/modules\/([^/]+)\/sequences\/([^/]+)$/);
    if (seanceMatch) return loadSeances(container, seanceMatch[1], seanceMatch[2]);

    container.innerHTML = `<div class="page-error">
      <i data-lucide="frown" style="width:48px;height:48px;color:var(--text-muted)"></i>
      <h2>Page introuvable</h2>
      <a href="#/dashboard" class="btn btn-cta">Retour au dashboard</a>
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
