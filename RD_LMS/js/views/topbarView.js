const PAGE_TITLES = {
    '/':                   'Dashboard',
    '/dashboard':          'Dashboard',
    '/modules':            'Ma Formation',
    '/admin':              'Console Admin',
    '/profil':             'Mon Profil',
    '/mes-cours':          'Mes Cours',
};

/** Clé localStorage pour mémoriser l'état masqué de la sidebar */
const LS_SIDEBAR_KEY = 'lms_sidebar_hidden';

/** Retourne true si on est en mode mobile (< 768 px) */
function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
}

/** Met à jour l'icône et l'aria-label du bouton selon l'état courant */
function syncToggleIcon(btn, hidden) {
    if (!btn) return;
    const iconName = hidden ? 'panel-left-open' : 'panel-left-close';
    const label    = hidden ? 'Afficher la navigation' : 'Masquer la navigation';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = `<i data-lucide="${iconName}" aria-hidden="true"></i>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
}

export function renderTopbar(container, profile) {
    container.innerHTML = `
    <header class="topbar" role="banner">
      <div class="topbar-left">
        <button class="topbar-btn sidebar-toggle" id="sidebarToggleBtn" aria-label="Masquer la navigation">
          <i data-lucide="panel-left-close" aria-hidden="true"></i>
        </button>
        <span class="topbar-title" id="topbar-page-title">Dashboard</span>
      </div>
      <div class="topbar-right">
        <!-- Slot cloche notifications — rempli par notificationBell.js -->
        <div id="notif-bell-slot"></div>
        <button class="topbar-btn" id="themeToggle" data-theme-toggle aria-label="Basculer le thème" aria-pressed="false">
          <i data-lucide="moon" aria-hidden="true"></i>
        </button>
      </div>
    </header>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // Mettre à jour l'icône du bouton thème (l'événement est géré par délégation dans theme.js)
    if (window.themeManager) {
        window.themeManager.updateToggleButton();
    }

    // ── Restaurer l'état sidebar depuis localStorage (desktop uniquement) ──
    const appLayout = document.querySelector('.app-layout');
    const toggleBtn = document.getElementById('sidebarToggleBtn');

    /** Sidebar cachée si editor-focus OU sidebar-hidden sont présents */
    function isSidebarHidden() {
        return appLayout
            ? appLayout.classList.contains('editor-focus') ||
              appLayout.classList.contains('sidebar-hidden')
            : false;
    }

    if (!isMobile() && appLayout) {
        const savedHidden = localStorage.getItem(LS_SIDEBAR_KEY) === 'true';
        if (savedHidden) {
            appLayout.classList.add('sidebar-hidden');
        }
        syncToggleIcon(toggleBtn, savedHidden || isSidebarHidden());
    }

    // ── Synchronisation automatique de l'icône ─────────────────────────
    // Quand l'éditeur de séance ajoute/retire editor-focus, l'icône doit
    // se mettre à jour même si le topbar n'a pas reçu de clic.
    if (appLayout && !isMobile()) {
        new MutationObserver(() => {
            syncToggleIcon(document.getElementById('sidebarToggleBtn'), isSidebarHidden());
        }).observe(appLayout, { attributes: true, attributeFilter: ['class'] });
    }

    // ── Toggle sidebar : mobile → classe "open" / desktop → unified ────
    toggleBtn?.addEventListener('click', () => {
        if (isMobile()) {
            // Comportement mobile : overlay slide-in
            document.getElementById('sidebar')?.classList.toggle('open');
        } else {
            if (!appLayout) return;

            if (isSidebarHidden()) {
                // Afficher la sidebar : retirer les deux classes possibles
                appLayout.classList.remove('editor-focus');
                appLayout.classList.remove('sidebar-hidden');
                localStorage.setItem(LS_SIDEBAR_KEY, 'false');
                // L'icône sera mise à jour par le MutationObserver
            } else {
                // Masquer la sidebar
                appLayout.classList.add('sidebar-hidden');
                localStorage.setItem(LS_SIDEBAR_KEY, 'true');
            }
        }
    });

    // Mise à jour du titre de page
    updatePageTitle();
    window.addEventListener('hashchange', updatePageTitle);

    // Titre dynamique injecté par les contrôleurs (ex. nom de séquence)
    window.addEventListener('lms:pagetitle', (e) => {
        const el = document.getElementById('topbar-page-title');
        if (el) el.textContent = e.detail;
    });
}

function updatePageTitle() {
    const hash  = location.hash.slice(1) || '/';
    const title = PAGE_TITLES[hash] || deriveTitleFromHash(hash);
    const el = document.getElementById('topbar-page-title');
    if (el) el.textContent = title;
}

function deriveTitleFromHash(hash) {
    if (hash.match(/^\/modules\/[^/]+\/sequences\/[^/]+$/)) return 'Séances';
    if (hash.match(/^\/modules\/[^/]+$/)) return 'Séquences';
    return 'DASHBOA_RD';
}
