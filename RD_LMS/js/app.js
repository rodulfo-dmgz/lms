import { db }                        from './lib/supabaseClient.js';
import { store }                      from './store.js';
import { initRouter }                 from './router.js';
import { getProfile, getTitrePro }    from './models/ProfileModel.js';
import { renderSidebar }              from './views/sidebarView.js';
import { renderTopbar }               from './views/topbarView.js';
import { handleError }                from './errorHandler.js';
import { initLoginPage }              from './controllers/authController.js';
import { initMediaModals }            from './utils/mediaModal.js';
import { mountNotificationBell }      from './utils/notificationBell.js';

const loginPage = document.getElementById('login-page');
const appShell  = document.getElementById('app-shell');
const app       = document.getElementById('app');

let routerReady = false;
let loginReady  = false;

function showLogin() {
    loginPage.style.display = 'flex';
    appShell.style.display  = 'none';
    if (!loginReady) {
        initLoginPage();
        if (typeof lucide !== 'undefined') lucide.createIcons();
        loginReady = true;
    }
}

function showApp(profile) {
    loginPage.style.display = 'none';
    appShell.style.display  = '';
    // loginReady stays true — listeners on the static form must not be re-added

    renderSidebar(document.getElementById('sidebar'), profile);
    renderTopbar(document.getElementById('topbar'),   profile);
    mountNotificationBell(profile.id);  // cloche notifications (async, non-bloquant)

    if (!routerReady) {
        initRouter(app);
        routerReady = true;
    }
}

async function loadFullProfile(userId) {
    const profile = await getProfile(userId);
    if (profile.role === 'stagiaire') {
        profile.titre_pro = await getTitrePro(profile.id).catch(() => null);
    }
    return profile;
}

async function init() {
    const { data: { session } } = await db.auth.getSession();

    if (session?.user) {
        store.setUser(session.user);
        try {
            const profile = await loadFullProfile(session.user.id);
            store.setProfile(profile);
            showApp(profile);
            if (!location.hash || location.hash === '#/login') {
                window.location.hash = profile.first_login
                    ? '#/changer-mot-de-passe'
                    : '#/dashboard';
            }
        } catch (err) {
            handleError(err, 'Chargement profil');
            showLogin();
        }
    } else {
        showLogin();
    }

    db.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            if (store.getUser()?.id === session.user.id && appShell.style.display !== 'none') return;

            store.setUser(session.user);
            try {
                const profile = await loadFullProfile(session.user.id);
                store.setProfile(profile);
                showApp(profile);
                window.location.hash = profile.first_login
                    ? '#/changer-mot-de-passe'
                    : '#/dashboard';
            } catch (err) {
                handleError(err, 'Auth state change');
                // Remettre le bouton si la page login est encore visible
                if (loginPage.style.display !== 'none') {
                    const btn = document.getElementById('submitBtn');
                    if (btn) {
                        btn.disabled  = false;
                        btn.innerHTML = '<i data-lucide="log-in" aria-hidden="true"></i> Accéder au dashboard';
                        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
                    }
                }
            }
        } else if (event === 'SIGNED_OUT') {
            store.reset();
            routerReady = false;
            history.replaceState(null, '', location.pathname);
            const emailInput = document.getElementById('email');
            const passInput  = document.getElementById('password');
            if (emailInput) emailInput.value = '';
            if (passInput)  passInput.value  = '';
            showLogin();
        }
    });
}

// Initialisation globale des modaux médias (délégation d'événements)
initMediaModals();

init().catch(err => handleError(err, 'Init app'));
