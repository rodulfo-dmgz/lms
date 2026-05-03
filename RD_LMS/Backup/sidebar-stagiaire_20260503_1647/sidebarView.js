import { logout }        from '../controllers/authController.js';
import { store }         from '../store.js';
import { getCohortes }   from '../models/AdminModel.js';
import { getAvailableStagiaires } from '../models/AdminModel.js';

const NAV_ITEMS = {
    admin: [
        { hash: '#/dashboard',       icon: 'layout-dashboard', label: 'Dashboard'     },
        { hash: '#/modules',         icon: 'book-open',        label: 'Formation'     },
        { hash: '#/admin',           icon: 'shield',           label: 'Console Admin' },
        { hash: '#/notifications',   icon: 'bell',             label: 'Notifications' },
        { hash: '#/profil',          icon: 'user-circle',      label: 'Mon Profil'    },
    ],
    formateur_editeur: [
        { hash: '#/dashboard',          icon: 'layout-dashboard', label: 'Dashboard'           },
        { hash: '#/modules',            icon: 'book-open',        label: 'Formation'           },
        { hash: '#/admin/progression',  icon: 'bar-chart-2',      label: 'Progression'         },
        { hash: '#/admin/devoirs',      icon: 'upload',           label: 'Devoirs à corriger'  },
        { hash: '#/notifications',      icon: 'bell',             label: 'Notifications'       },
        { hash: '#/profil',             icon: 'user-circle',      label: 'Mon Profil'          },
    ],
    formateur: [
        { hash: '#/dashboard',          icon: 'layout-dashboard', label: 'Dashboard'           },
        { hash: '#/modules',            icon: 'book-open',        label: 'Formation'           },
        { hash: '#/admin/progression',  icon: 'bar-chart-2',      label: 'Progression'         },
        { hash: '#/admin/devoirs',      icon: 'upload',           label: 'Devoirs à corriger'  },
        { hash: '#/notifications',      icon: 'bell',             label: 'Notifications'       },
        { hash: '#/profil',             icon: 'user-circle',      label: 'Mon Profil'          },
    ],
    stagiaire: [
        { hash: '#/dashboard',       icon: 'layout-dashboard', label: 'Dashboard'    },
        { hash: '#/modules',         icon: 'book-open',        label: 'Ma Formation' },
        { hash: '#/mes-cours',       icon: 'list',             label: 'Mes Cours'    },
        { hash: '#/mes-devoirs',     icon: 'file-check',       label: 'Mes devoirs'  },
        { hash: '#/notifications',   icon: 'bell',             label: 'Notifications'},
        { hash: '#/profil',          icon: 'user-circle',      label: 'Mon Profil'   },
    ],
    invite: [
        { hash: '#/modules', icon: 'book-open', label: 'Catalogue' },
    ],
};

const ROLE_LABELS = {
    admin:             'Administrateur',
    formateur_editeur: 'Formateur Éditeur',
    formateur:         'Formateur',
    stagiaire:         'Stagiaire',
    invite:            'Invité',
};

function buildBackNav(hash, role) {
    // ── Admin sub-navigation ──────────────────────────────────
    if (role === 'admin' && hash.startsWith('#/admin')) {
        const isSubPage = !/^#\/admin\/?$/.test(hash);
        return `
        <div class="sidebar-nav" role="list">
          <span class="sidebar-section-label">Administration</span>
          ${isSubPage ? `
          <a href="#/admin" class="sidebar-nav-item" role="listitem">
            <i data-lucide="arrow-left" aria-hidden="true"></i>
            <span>Vue d'ensemble</span>
          </a>` : ''}
          <a href="#/admin/cohortes"   class="sidebar-nav-item ${hash.startsWith('#/admin/cohortes')   ? 'active' : ''}" role="listitem">
            <i data-lucide="users" aria-hidden="true"></i>
            <span>Cohortes</span>
          </a>
          <a href="#/admin/stagiaires" class="sidebar-nav-item ${hash.startsWith('#/admin/stagiaires') ? 'active' : ''}" role="listitem">
            <i data-lucide="user" aria-hidden="true"></i>
            <span>Stagiaires</span>
          </a>
          <a href="#/admin/parcours"   class="sidebar-nav-item ${hash.startsWith('#/admin/parcours') || hash.startsWith('#/admin/seances') ? 'active' : ''}" role="listitem">
            <i data-lucide="map" aria-hidden="true"></i>
            <span>Parcours</span>
          </a>
          <a href="#/admin/devoirs"      class="sidebar-nav-item ${hash === '#/admin/devoirs'      ? 'active' : ''}" role="listitem">
            <i data-lucide="upload" aria-hidden="true"></i>
            <span>Devoirs à corriger</span>
          </a>
          <a href="#/admin/progression"  class="sidebar-nav-item ${hash === '#/admin/progression'  ? 'active' : ''}" role="listitem">
            <i data-lucide="bar-chart-2" aria-hidden="true"></i>
            <span>Progression</span>
          </a>
        </div>`;
    }

    // ── Module sub-navigation ─────────────────────────────────
    const seanceMatch = hash.match(/^#\/modules\/([^/]+)\/sequences\/([^/]+)$/);
    const seqMatch    = hash.match(/^#\/modules\/([^/]+)$/);

    if (seanceMatch) {
        return `
        <div class="sidebar-nav" role="list">
          <span class="sidebar-section-label">Navigation</span>
          <a href="#/modules/${seanceMatch[1]}" class="sidebar-nav-item" role="listitem">
            <i data-lucide="arrow-left" aria-hidden="true"></i>
            <span>Séquences</span>
          </a>
          <a href="#/modules" class="sidebar-nav-item" role="listitem">
            <i data-lucide="book-open" aria-hidden="true"></i>
            <span>Ma Formation</span>
          </a>
        </div>`;
    }
    if (seqMatch) {
        return `
        <div class="sidebar-nav" role="list">
          <span class="sidebar-section-label">Navigation</span>
          <a href="#/modules" class="sidebar-nav-item" role="listitem">
            <i data-lucide="arrow-left" aria-hidden="true"></i>
            <span>Ma Formation</span>
          </a>
        </div>`;
    }
    return null;
}

export function renderSidebar(container, profile) {
    const actualRole  = profile.role;
    const displayRole = store.getRole();
    const items       = NAV_ITEMS[displayRole] || NAV_ITEMS.stagiaire;
    const hash        = location.hash || '#/dashboard';
    const initials    = `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`.toUpperCase();
    const viewingAs   = store.state.viewAs;

    const roleDisplay = profile.titre_pro?.sigle
        ? profile.titre_pro.sigle
        : ROLE_LABELS[actualRole] || actualRole;

    const backNav = buildBackNav(hash, actualRole);
    const mainNav = backNav ? '' : `
      <div class="sidebar-nav" role="list">
        <span class="sidebar-section-label">Navigation</span>
        ${items.map(item => `
        <a href="${item.hash}"
           class="sidebar-nav-item ${hash === item.hash ? 'active' : ''}"
           role="listitem"
           aria-current="${hash === item.hash ? 'page' : 'false'}">
          <i data-lucide="${item.icon}" aria-hidden="true"></i>
          <span>${item.label}</span>
        </a>`).join('')}
      </div>`;

    container.innerHTML = `
    <nav class="sidebar" role="navigation" aria-label="Navigation principale">

      <a href="#/dashboard" class="sidebar-brand" aria-label="Accueil Dashboard">
        <img src="assets/images/logo.svg" alt="" class="sidebar-brand__logo" aria-hidden="true">
        <span class="sidebar-brand__name">DASHBOA<span>_</span>RD</span>
      </a>

      ${viewingAs?.role ? `
      <div class="sidebar-view-as-banner">
        <div class="sidebar-view-as-banner__info">
          <i data-lucide="eye" aria-hidden="true"></i>
          <span>Vue : <strong>${viewingAs.profileLabel || ROLE_LABELS[viewingAs.role] || viewingAs.role}</strong></span>
        </div>
        <button class="sidebar-view-as-banner__exit" id="sidebarExitViewAs" title="Revenir en mode Admin">
          <i data-lucide="x" aria-hidden="true"></i>
          <span>Quitter</span>
        </button>
      </div>` : ''}

      ${backNav || mainNav}

      ${actualRole === 'admin' ? `
      <div class="sidebar-role-switch">
        <span class="sidebar-section-label">Simuler une vue</span>
        <select class="sidebar-role-select" id="sidebarRoleSelect" aria-label="Simuler un rôle">
          <option value=""> Admin </option>
          <option value="formateur" ${viewingAs?.role === 'formateur' ? 'selected' : ''}>Formateur</option>
          <option value="stagiaire" ${viewingAs?.role === 'stagiaire' ? 'selected' : ''}>Stagiaire</option>
        </select>
        <div id="viewAsCohorteWrap" style="display:${viewingAs?.role === 'stagiaire' ? 'flex' : 'none'};flex-direction:column;gap:var(--space-2)">
          <select class="sidebar-role-select" id="sidebarCohorteSelect" aria-label="Choisir une cohorte">
            <option value=""> Cohorte </option>
          </select>
          <select class="sidebar-role-select" id="sidebarProfileSelect" aria-label="Choisir un stagiaire" style="display:none">
            <option value=""> Stagiaire </option>
          </select>
        </div>
      </div>` : ''}

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user__avatar" aria-hidden="true">
            ${profile.avatar_url
              ? `<img src="${profile.avatar_url}" alt="${profile.prenom}" class="sidebar-user__photo">`
              : initials}
          </div>
          <div class="sidebar-user__info">
            <div class="sidebar-user__name">${profile.prenom} ${profile.nom}</div>
            <div class="sidebar-user__role">${roleDisplay}</div>
          </div>
        </div>
        <button class="sidebar-nav-item" id="sidebarLogout" aria-label="Se déconnecter">
          <i data-lucide="log-out" aria-hidden="true"></i>
          <span>Déconnexion</span>
        </button>
      </div>
    </nav>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Bouton "Quitter la vue simulée" ─────────────────────
    container.querySelector('#sidebarExitViewAs')?.addEventListener('click', () => {
        store.setViewAs(null);
        store.setViewAsProfile(null);
        renderSidebar(container, profile);
        window.dispatchEvent(new Event('hashchange'));
    });

    // ── Role switch ──────────────────────────────────────────
    const roleSel = container.querySelector('#sidebarRoleSelect');
    roleSel?.addEventListener('change', (e) => {
        const role = e.target.value;
        const cohorteWrap = container.querySelector('#viewAsCohorteWrap');
        if (!role) {
            store.setViewAs(null);
            store.setViewAsProfile(null);
            if (cohorteWrap) cohorteWrap.style.display = 'none';
            renderSidebar(container, profile);
            window.dispatchEvent(new Event('hashchange'));
        } else if (role === 'stagiaire') {
            store.setViewAs({ role });
            if (cohorteWrap) cohorteWrap.style.display = 'flex';
            loadCohortesForViewAs(container, profile);
        } else {
            store.setViewAs({ role });
            if (cohorteWrap) cohorteWrap.style.display = 'none';
            window.dispatchEvent(new Event('hashchange'));
        }
    });

    // ── Cohort selector (admin view-as stagiaire) ────────────
    if (actualRole === 'admin' && viewingAs?.role === 'stagiaire') {
        loadCohortesForViewAs(container, profile);
    }

    // ── Logout ───────────────────────────────────────────────
    container.querySelector('#sidebarLogout')?.addEventListener('click', async () => {
        await logout();
    });

    // Mémoriser la clé viewAs courante pour détecter les changements
    renderSidebar._viewAsKey = _viewAsKey(store.state.viewAs);

    // ── hashchange ───────────────────────────────────────────
    if (renderSidebar._hashHandler) {
        window.removeEventListener('hashchange', renderSidebar._hashHandler);
    }
    renderSidebar._hashHandler = () => {
        const newHash   = location.hash || '#/dashboard';
        const wasModule = /^#\/modules\//.test(hash);
        const isModule  = /^#\/modules\//.test(newHash);
        const wasAdmin  = /^#\/admin/.test(hash);
        const isAdmin   = /^#\/admin/.test(newHash);

        // Re-rendu complet si le contexte viewAs a changé (nouveau stagiaire, sortie, etc.)
        const newKey = _viewAsKey(store.state.viewAs);
        if (newKey !== renderSidebar._viewAsKey) {
            renderSidebar(container, profile);
            return;
        }

        if (wasModule !== isModule || (wasModule && isModule) || wasAdmin !== isAdmin || (wasAdmin && isAdmin)) {
            renderSidebar(container, profile);
            return;
        }
        container.querySelectorAll('.sidebar-nav-item[href]').forEach(el => {
            const active = el.getAttribute('href') === newHash;
            el.classList.toggle('active', active);
            el.setAttribute('aria-current', active ? 'page' : 'false');
        });
    };
    window.addEventListener('hashchange', renderSidebar._hashHandler);
}

async function loadCohortesForViewAs(container, profile) {
    const cohorteSel = container.querySelector('#sidebarCohorteSelect');
    if (!cohorteSel) return;

    let cohortes = [];
    try { cohortes = await getCohortes(); } catch {}

    cohorteSel.innerHTML = `<option value=""> Choisir une cohorte </option>` +
        cohortes.map(c => `<option value="${c.id}" ${store.state.viewAs?.cohorteId === c.id ? 'selected' : ''}>${c.nom}</option>`).join('');

    // Restaurer la liste des stagiaires si une cohorte est déjà choisie
    if (store.state.viewAs?.cohorteId) {
        await _loadMembersIntoSelect(container, store.state.viewAs.cohorteId);
    }

    cohorteSel.addEventListener('change', async (e) => {
        const cohorteId = e.target.value;
        const profileSel = container.querySelector('#sidebarProfileSelect');

        // Réinitialiser le stagiaire sélectionné
        store.setViewAs({ role: 'stagiaire', cohorteId: cohorteId || undefined });
        store.setViewAsProfile(null);

        if (!cohorteId) {
            if (profileSel) {
                profileSel.style.display = 'none';
                profileSel.innerHTML = '<option value="">— Stagiaire… —</option>';
            }
            // Rafraîchir la page avec la vue admin (plus de stagiaire sélectionné)
            window.dispatchEvent(new Event('hashchange'));
            return;
        }
        await _loadMembersIntoSelect(container, cohorteId);
        // Rafraîchir la page (aucun stagiaire sélectionné pour l'instant)
        window.dispatchEvent(new Event('hashchange'));
    });
}

async function _loadMembersIntoSelect(container, cohorteId) {
    const profileSel = container.querySelector('#sidebarProfileSelect');
    if (!profileSel) return;

    profileSel.style.display = 'block';

    let members = [];
    try {
        const { db } = await import('../lib/supabaseClient.js');
        const { data } = await db.rpc('admin_get_cohorte_members', { p_cohorte_id: cohorteId });
        members = data || [];
    } catch {}

    profileSel.innerHTML = `<option value=""> Choisir un stagiaire </option>` +
        members.map(m =>
            `<option value="${m.profile_id}" ${store.state.viewAs?.profileId === m.profile_id ? 'selected' : ''}>${m.prenom} ${m.nom}</option>`
        ).join('');

    // ── Remplacer le nœud pour supprimer les anciens listeners ──────────────
    // Sans ça, chaque changement de cohorte empile un nouveau handler sur l'ancien select.
    const freshSel = profileSel.cloneNode(true);
    profileSel.parentNode.replaceChild(freshSel, profileSel);

    freshSel.addEventListener('change', async (e) => {
        const profileId = e.target.value;
        const selected  = members.find(m => m.profile_id === profileId);

        if (!profileId) {
            store.setViewAs({ role: 'stagiaire', cohorteId });
            store.setViewAsProfile(null);
            window.dispatchEvent(new Event('hashchange'));
            return;
        }

        store.setViewAs({
            role:         'stagiaire',
            cohorteId,
            profileId,
            profileLabel: `${selected?.prenom || ''} ${selected?.nom || ''}`.trim(),
        });

        // Charger le profil complet pour les vues (nom, avatar, civilite…)
        try {
            const { db } = await import('../lib/supabaseClient.js');
            const { data: vp } = await db
                .from('lms_profiles')
                .select('id, prenom, nom, civilite, role, date_naissance, telephone, avatar_url')
                .eq('id', profileId)
                .single();
            store.setViewAsProfile(vp ?? null);
        } catch { store.setViewAsProfile(null); }

        window.dispatchEvent(new Event('hashchange'));
    });
}

/** Clé stable représentant le contexte viewAs courant (pour détecter les changements). */
function _viewAsKey(viewAs) {
    if (!viewAs) return '';
    return `${viewAs.role ?? ''}|${viewAs.profileId ?? ''}|${viewAs.cohorteId ?? ''}`;
}
