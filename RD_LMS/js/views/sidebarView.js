import { logout }        from '../controllers/authController.js';
import { store }         from '../store.js';
import { getCohortes }   from '../models/AdminModel.js';

// ─── Navigation admins / formateurs (liste plate) ────────────
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
    invite: [
        { hash: '#/modules', icon: 'book-open', label: 'Catalogue' },
    ],
};

// ─── Navigation stagiaire — sections groupées ─────────────────
const STAGIAIRE_GROUPS = [
    {
        label: 'Navigation',
        items: [
            { hash: '#/dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
        ],
    },
    {
        label: 'Formation',
        items: [
            { hash: '#/modules',     icon: 'book-open',  label: 'Ma Formation', badge: true },
            { hash: '#/mes-cours',   icon: 'list',       label: 'Mes Cours'    },
            { hash: '#/mes-devoirs', icon: 'file-check', label: 'Mes devoirs'  },
        ],
    },
    {
        label: 'Titre Professionnel',
        id: 'titre-pro',
        collapsible: true,
        icon: 'award',
        items: [
            { hash: '#/titre-pro/reac',        icon: 'file-text',    label: 'REAC'                     },
            { hash: '#/titre-pro/competences',  icon: 'check-square', label: 'Compétences visées'        },
            { hash: '#/titre-pro/referentiel',  icon: 'clipboard',    label: "Référentiel d'évaluation"  },
            { hash: '#/titre-pro/ecf',          icon: 'pen-tool',     label: 'ECF'                       },
            { hash: '#/titre-pro/dossier-pro',  icon: 'folder',       label: 'Dossier professionnel'     },
        ],
    },
    {
        label: 'Espace Zen',
        id: 'espace-zen',
        collapsible: true,
        icon: 'leaf',
        items: [
            { hash: '#/espace-zen/lecture', icon: 'book',  label: 'Lecture' },
            { hash: '#/espace-zen/musique', icon: 'music', label: 'Musique' },
        ],
    },
    {
        label: 'Autres',
        items: [
            { hash: '#/notifications', icon: 'bell',        label: 'Notifications' },
            { hash: '#/profil',        icon: 'user-circle', label: 'Mon Profil'    },
        ],
    },
];

const ROLE_LABELS = {
    admin:             'Administrateur',
    formateur_editeur: 'Formateur Éditeur',
    formateur:         'Formateur',
    stagiaire:         'Stagiaire',
    invite:            'Invité',
};

// ─── Helpers collapse state ───────────────────────────────────
const _sbOpenKey = id => `lms_sb_open_${id}`;
const _sbIsOpen  = id => {
    try { return localStorage.getItem(_sbOpenKey(id)) === 'true'; } catch { return false; }
};
const _sbSetOpen = (id, val) => {
    try { localStorage.setItem(_sbOpenKey(id), String(val)); } catch {}
};

// ─── Sidebar stagiaire (sections groupées + collapsible) ──────
function buildStagiaireNav(hash) {
    const progressSummary = store.state.progressSummary || [];
    const globalPct = progressSummary.length
        ? Math.round(progressSummary.reduce((s, c) => s + (c.pourcentage || 0), 0) / progressSummary.length)
        : 0;

    const parts = STAGIAIRE_GROUPS.map(group => {
        const { label, id, collapsible, icon, items } = group;

        if (!collapsible) {
            const itemsHTML = items.map(item => {
                const active = hash === item.hash;
                const badgeHTML = item.badge && globalPct > 0
                    ? `<span class="sidebar-badge">${globalPct}%</span>` : '';
                return `
                <a href="${item.hash}"
                   class="sidebar-nav-item${active ? ' active' : ''}"
                   role="listitem"
                   aria-current="${active ? 'page' : 'false'}">
                  <i data-lucide="${item.icon}" aria-hidden="true"></i>
                  <span>${item.label}</span>
                  ${badgeHTML}
                </a>`;
            }).join('');
            return `<span class="sidebar-section-label">${label}</span>${itemsHTML}`;
        }

        // Section collapsible
        const hasActiveChild = items.some(it => hash === it.hash);
        const isOpen = hasActiveChild || _sbIsOpen(id);

        const subItemsHTML = items.map(item => {
            const active = hash === item.hash;
            return `
            <a href="${item.hash}"
               class="sidebar-nav-item sidebar-nav-item--sub${active ? ' active' : ''}"
               role="listitem"
               aria-current="${active ? 'page' : 'false'}">
              <i data-lucide="${item.icon}" aria-hidden="true"></i>
              <span>${item.label}</span>
            </a>`;
        }).join('');

        return `
        <button class="sidebar-section-toggle${isOpen ? ' open' : ''}"
                data-group="${id}"
                aria-expanded="${isOpen}"
                type="button">
          <span class="sidebar-section-toggle__left">
            <i data-lucide="${icon}" aria-hidden="true"></i>
            <span>${label}</span>
          </span>
          <i data-lucide="chevron-right" class="sidebar-section-toggle__arrow" aria-hidden="true"></i>
        </button>
        <div class="sidebar-group-body${isOpen ? ' open' : ''}" id="sbgrp-${id}">
          ${subItemsHTML}
        </div>`;
    });

    return `<div class="sidebar-nav" role="list">${parts.join('')}</div>`;
}

// ─── Sous-navigation contextuelle (admin / modules) ───────────
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
          <a href="#/admin/titres-pro"   class="sidebar-nav-item ${hash === '#/admin/titres-pro'   ? 'active' : ''}" role="listitem">
            <i data-lucide="award" aria-hidden="true"></i>
            <span>Titres professionnels</span>
          </a>
          <a href="#/admin/articles"     class="sidebar-nav-item ${hash === '#/admin/articles'     ? 'active' : ''}" role="listitem">
            <i data-lucide="newspaper" aria-hidden="true"></i>
            <span>Articles & RSS</span>
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

// ─── Rendu principal ──────────────────────────────────────────
export function renderSidebar(container, profile) {
    const actualRole  = profile.role;
    const displayRole = store.getRole();
    const hash        = location.hash || '#/dashboard';
    const initials    = `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`.toUpperCase();
    const viewingAs   = store.state.viewAs;

    // Footer : afficher l'intitulé complet du titre pro (pas le sigle)
    const roleDisplay = profile.titre_pro?.intitule
        ? profile.titre_pro.intitule
        : ROLE_LABELS[actualRole] || actualRole;

    const backNav = buildBackNav(hash, actualRole);

    // Navigation principale selon rôle
    let mainNav = '';
    if (!backNav) {
        if (displayRole === 'stagiaire') {
            mainNav = buildStagiaireNav(hash);
        } else {
            const items = NAV_ITEMS[displayRole] || NAV_ITEMS.stagiaire;
            mainNav = `
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
        }
    }

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
            <div class="sidebar-user__role" title="${roleDisplay}">${roleDisplay}</div>
          </div>
        </div>
        <button class="sidebar-nav-item" id="sidebarLogout" aria-label="Se déconnecter">
          <i data-lucide="log-out" aria-hidden="true"></i>
          <span>Déconnexion</span>
        </button>
      </div>
    </nav>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Collapsible sections (stagiaire) ─────────────────────
    container.querySelectorAll('.sidebar-section-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const groupId = btn.dataset.group;
            const body    = container.querySelector(`#sbgrp-${groupId}`);
            const isOpen  = btn.classList.contains('open');
            btn.classList.toggle('open', !isOpen);
            btn.setAttribute('aria-expanded', String(!isOpen));
            if (body) body.classList.toggle('open', !isOpen);
            _sbSetOpen(groupId, !isOpen);
        });
    });

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
        const newHash      = location.hash || '#/dashboard';
        const wasModule    = /^#\/modules\//.test(hash);
        const isModule     = /^#\/modules\//.test(newHash);
        const wasAdmin     = /^#\/admin/.test(hash);
        const isAdmin      = /^#\/admin/.test(newHash);
        const wasTitrePro  = /^#\/titre-pro/.test(hash);
        const isTitrePro   = /^#\/titre-pro/.test(newHash);
        const wasZen       = /^#\/espace-zen/.test(hash);
        const isZen        = /^#\/espace-zen/.test(newHash);

        // Re-rendu complet si le contexte viewAs a changé
        const newKey = _viewAsKey(store.state.viewAs);
        if (newKey !== renderSidebar._viewAsKey) {
            renderSidebar(container, profile);
            return;
        }

        if (
            wasModule    !== isModule    || (wasModule    && isModule)   ||
            wasAdmin     !== isAdmin     || (wasAdmin     && isAdmin)    ||
            wasTitrePro  !== isTitrePro  || (wasTitrePro  && isTitrePro) ||
            wasZen       !== isZen       || (wasZen       && isZen)
        ) {
            renderSidebar(container, profile);
            return;
        }

        // Mise à jour légère (état actif uniquement)
        container.querySelectorAll('.sidebar-nav-item[href]').forEach(el => {
            const active = el.getAttribute('href') === newHash;
            el.classList.toggle('active', active);
            el.setAttribute('aria-current', active ? 'page' : 'false');
        });
    };
    window.addEventListener('hashchange', renderSidebar._hashHandler);
}

// ─── Chargement des cohortes (admin viewAs) ───────────────────
async function loadCohortesForViewAs(container, profile) {
    const cohorteSel = container.querySelector('#sidebarCohorteSelect');
    if (!cohorteSel) return;

    let cohortes = [];
    try { cohortes = await getCohortes(); } catch {}

    cohorteSel.innerHTML = `<option value=""> Choisir une cohorte </option>` +
        cohortes.map(c => `<option value="${c.id}" ${store.state.viewAs?.cohorteId === c.id ? 'selected' : ''}>${c.nom}</option>`).join('');

    if (store.state.viewAs?.cohorteId) {
        await _loadMembersIntoSelect(container, store.state.viewAs.cohorteId);
    }

    cohorteSel.addEventListener('change', async (e) => {
        const cohorteId  = e.target.value;
        const profileSel = container.querySelector('#sidebarProfileSelect');

        store.setViewAs({ role: 'stagiaire', cohorteId: cohorteId || undefined });
        store.setViewAsProfile(null);

        if (!cohorteId) {
            if (profileSel) {
                profileSel.style.display = 'none';
                profileSel.innerHTML = '<option value="">— Stagiaire… —</option>';
            }
            window.dispatchEvent(new Event('hashchange'));
            return;
        }
        await _loadMembersIntoSelect(container, cohorteId);
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

function _viewAsKey(viewAs) {
    if (!viewAs) return '';
    return `${viewAs.role ?? ''}|${viewAs.profileId ?? ''}|${viewAs.cohorteId ?? ''}`;
}
