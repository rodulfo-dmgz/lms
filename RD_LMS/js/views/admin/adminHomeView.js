export function renderAdminHome(container, { stats, cohortes, stagiaires }) {
    container.innerHTML = `
    <div class="page-admin">

      <div class="dashboard-header">
        <div class="dashboard-greeting">
          <h1 class="dashboard-greeting__hello">Console Admin</h1>
          <p class="dashboard-greeting__date">Gestion des cohortes, stagiaires et imports</p>
        </div>
        <div class="admin-quick-actions">
          <a href="#/admin/cohortes/nouveau" class="btn btn-cta">
            <i data-lucide="plus" aria-hidden="true"></i> Nouvelle cohorte
          </a>
          <a href="#/admin/stagiaires/nouveau" class="btn btn-secondary">
            <i data-lucide="user-plus" aria-hidden="true"></i> Nouveau stagiaire
          </a>
        </div>
      </div>

      <!-- Stats -->
      <div class="admin-stats-grid">
        ${statCard('users', stats.nb_stagiaires, 'Stagiaires', '#/admin/stagiaires')}
        ${statCard('school', stats.nb_cohortes, 'Cohortes', '#/admin/cohortes')}
        ${statCard('map', stats.nb_pathways, 'Parcours', null)}
        ${statCard('book-open', stats.nb_cours, 'Modules', null)}
      </div>

      <!-- Raccourcis -->
      <div class="admin-shortcuts">
        <a href="#/admin/cohortes" class="admin-shortcut-card">
          <i data-lucide="users" aria-hidden="true"></i>
          <div>
            <div class="admin-shortcut-card__title">Gérer les cohortes</div>
            <div class="admin-shortcut-card__sub">${stats.nb_cohortes} cohorte${stats.nb_cohortes > 1 ? 's' : ''} active${stats.nb_cohortes > 1 ? 's' : ''}</div>
          </div>
          <i data-lucide="chevron-right" class="admin-shortcut-card__arrow" aria-hidden="true"></i>
        </a>
        <a href="#/admin/stagiaires" class="admin-shortcut-card">
          <i data-lucide="user" aria-hidden="true"></i>
          <div>
            <div class="admin-shortcut-card__title">Gérer les stagiaires</div>
            <div class="admin-shortcut-card__sub">${stats.nb_stagiaires} stagiaire${stats.nb_stagiaires > 1 ? 's' : ''} inscrit${stats.nb_stagiaires > 1 ? 's' : ''}</div>
          </div>
          <i data-lucide="chevron-right" class="admin-shortcut-card__arrow" aria-hidden="true"></i>
        </a>
        <a href="#/admin/titres-pro" class="admin-shortcut-card">
          <i data-lucide="award" aria-hidden="true"></i>
          <div>
            <div class="admin-shortcut-card__title">Titres professionnels</div>
            <div class="admin-shortcut-card__sub">Gérer le référentiel RNCP</div>
          </div>
          <i data-lucide="chevron-right" class="admin-shortcut-card__arrow" aria-hidden="true"></i>
        </a>
        <a href="#/admin/inject-stagiaires" class="admin-shortcut-card">
          <i data-lucide="user-round-plus" aria-hidden="true"></i>
          <div>
            <div class="admin-shortcut-card__title">Injection stagiaires</div>
            <div class="admin-shortcut-card__sub">Import CSV ou saisie manuelle</div>
          </div>
          <i data-lucide="chevron-right" class="admin-shortcut-card__arrow" aria-hidden="true"></i>
        </a>
        <a href="#/admin/produits" class="admin-shortcut-card">
          <i data-lucide="package" aria-hidden="true"></i>
          <div>
            <div class="admin-shortcut-card__title">Produits</div>
            <div class="admin-shortcut-card__sub">Gérer les bundles de contenu</div>
          </div>
          <i data-lucide="chevron-right" class="admin-shortcut-card__arrow" aria-hidden="true"></i>
        </a>
        <a href="#/admin/financements" class="admin-shortcut-card">
          <i data-lucide="credit-card" aria-hidden="true"></i>
          <div>
            <div class="admin-shortcut-card__title">Financements</div>
            <div class="admin-shortcut-card__sub">Tarifs, OPCO, CPF, prise en charge</div>
          </div>
          <i data-lucide="chevron-right" class="admin-shortcut-card__arrow" aria-hidden="true"></i>
        </a>
        <a href="#/admin/articles" class="admin-shortcut-card">
          <i data-lucide="newspaper" aria-hidden="true"></i>
          <div>
            <div class="admin-shortcut-card__title">Espace Zen — Articles</div>
            <div class="admin-shortcut-card__sub">Gérer les articles et sources RSS</div>
          </div>
          <i data-lucide="chevron-right" class="admin-shortcut-card__arrow" aria-hidden="true"></i>
        </a>
      </div>

      <!-- Import CSV -->
      <div class="admin-section">
        <div class="admin-section-header">
          <i data-lucide="upload" aria-hidden="true"></i>
          <h2>Import CSV — Stagiaires</h2>
        </div>
        <div class="admin-section-body">
          <p class="admin-hint">Format attendu : <code>civilite, nom, prenom, email, date_naissance, cohorte_id</code></p>
          <div class="csv-drop-zone" id="csvDropZone" role="button" tabindex="0" aria-label="Zone de dépôt CSV">
            <i data-lucide="file-text" class="csv-drop-zone__icon" aria-hidden="true"></i>
            <p class="csv-drop-zone__text">Déposez votre fichier CSV ou cliquez pour sélectionner</p>
            <p class="csv-drop-zone__sub">Fichiers .csv uniquement · UTF-8</p>
            <input type="file" id="csvFileInput" class="csv-file-input" accept=".csv" aria-hidden="true">
          </div>
          <div id="csv-preview"    style="display:none"></div>
          <div id="import-actions" style="display:none">
            <button class="btn btn-cta" id="btnImport">
              <i data-lucide="users" aria-hidden="true"></i> Importer les stagiaires
            </button>
          </div>
          <div id="import-results" style="display:none"></div>
        </div>
      </div>

    </div>`;
}

function statCard(icon, value, label, href) {
    const inner = `
      <i data-lucide="${icon}" class="admin-stat-card__icon" aria-hidden="true"></i>
      <div class="admin-stat-card__value">${value ?? '—'}</div>
      <div class="admin-stat-card__label">${label}</div>`;
    return href
        ? `<a href="${href}" class="admin-stat-card admin-stat-card--link">${inner}</a>`
        : `<div class="admin-stat-card">${inner}</div>`;
}
