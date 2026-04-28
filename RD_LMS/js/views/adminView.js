export function renderAdmin(container, { profile, cohortes }) {
    container.innerHTML = `
    <div class="page-admin">

      <div class="dashboard-header">
        <div class="dashboard-greeting">
          <h1 class="dashboard-greeting__hello">Console Admin</h1>
          <p class="dashboard-greeting__date">Gestion des utilisateurs et imports</p>
        </div>
      </div>

      <!-- Import CSV -->
      <div class="admin-section">
        <div class="admin-section-header">
          <i data-lucide="upload" aria-hidden="true"></i>
          <h2>Import CSV — Stagiaires</h2>
        </div>
        <div class="admin-section-body">
          <p style="font-size:var(--font-body2-size);color:var(--text-tertiary)">
            Format CSV attendu : <code style="font-family:var(--font-mono);background:var(--surface-subtle);padding:2px 6px;border-radius:4px">civilite, nom, prenom, email, date_naissance, cohorte_id</code>
          </p>

          <div class="csv-drop-zone" id="csvDropZone" role="button" tabindex="0" aria-label="Zone de dépôt de fichier CSV">
            <i data-lucide="file-text" class="csv-drop-zone__icon" aria-hidden="true"></i>
            <p class="csv-drop-zone__text">Déposez votre fichier CSV ici ou cliquez pour sélectionner</p>
            <p class="csv-drop-zone__sub">Fichiers .csv uniquement · Encodage UTF-8</p>
            <input type="file" id="csvFileInput" class="csv-file-input" accept=".csv" aria-hidden="true">
          </div>

          <div id="csv-preview" style="display:none"></div>

          <div id="import-actions" style="display:none">
            <button class="btn btn-cta" id="btnImport">
              <i data-lucide="users" aria-hidden="true"></i>
              Importer les stagiaires
            </button>
          </div>

          <div id="import-results" style="display:none"></div>
        </div>
      </div>

      <!-- Liste utilisateurs -->
      <div class="admin-section">
        <div class="admin-section-header">
          <i data-lucide="users" aria-hidden="true"></i>
          <h2>Utilisateurs</h2>
        </div>
        <div class="admin-section-body">
          <div id="users-list">
            <div class="loading">
              <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
              Chargement…
            </div>
          </div>
        </div>
      </div>

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function renderUsersTable(container, users) {
    if (!users.length) {
        container.innerHTML = '<p class="empty-state">Aucun utilisateur.</p>';
        return;
    }
    const ROLE_LABELS = {
        admin: 'Admin', formateur_editeur: 'Formateur Éditeur',
        formateur: 'Formateur', stagiaire: 'Stagiaire', invite: 'Invité'
    };
    container.innerHTML = `
    <div class="table-wrapper">
      <table class="table" aria-label="Liste des utilisateurs">
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">Prénom</th>
            <th scope="col">Rôle</th>
            <th scope="col">Créé le</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
          <tr>
            <td>${escapeText(u.nom)}</td>
            <td>${escapeText(u.prenom)}</td>
            <td><span class="badge badge-primary">${ROLE_LABELS[u.role] || u.role}</span></td>
            <td style="font-family:var(--font-mono);font-size:var(--font-caption-size)">
              ${new Date(u.created_at).toLocaleDateString('fr-FR')}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

export function renderImportPreview(container, rows) {
    container.innerHTML = `
    <div class="csv-preview-info">
      <i data-lucide="info" style="width:16px;height:16px;flex-shrink:0"></i>
      ${rows.length} ligne${rows.length > 1 ? 's' : ''} détectée${rows.length > 1 ? 's' : ''}
    </div>
    <div class="table-wrapper">
      <table class="table" aria-label="Aperçu CSV">
        <thead>
          <tr>${Object.keys(rows[0]).map(k => `<th scope="col">${escapeText(k)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.slice(0, 5).map(r => `
          <tr>${Object.values(r).map(v => `<td>${escapeText(String(v || ''))}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${rows.length > 5 ? `<p style="font-size:var(--font-caption-size);color:var(--text-muted);margin-top:var(--space-2)">… et ${rows.length - 5} autre${rows.length - 5 > 1 ? 's' : ''} ligne${rows.length - 5 > 1 ? 's' : ''}</p>` : ''}`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

export function renderImportResults(container, results) {
    container.innerHTML = `
    <div class="import-results">
      <div class="import-results-header">
        <div class="import-stat import-stat--success">
          <i data-lucide="check-circle" aria-hidden="true"></i>
          ${results.success.length} succès
        </div>
        <div class="import-stat import-stat--error">
          <i data-lucide="x-circle" aria-hidden="true"></i>
          ${results.errors.length} erreur${results.errors.length > 1 ? 's' : ''}
        </div>
      </div>

      ${results.success.length ? `
      <div>
        <h3 style="font-size:var(--font-body2-size);font-weight:600;margin-bottom:var(--space-3)">
          Mots de passe temporaires générés
        </h3>
        <div class="password-list">
          ${results.success.map(r => `
          <div class="password-item">
            <span class="password-item__email">${escapeText(r.email)}</span>
            <span class="password-item__pwd">${escapeText(r.mot_de_passe)}</span>
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${results.errors.length ? `
      <div>
        <h3 style="font-size:var(--font-body2-size);font-weight:600;color:var(--text-danger);margin-bottom:var(--space-3)">
          Erreurs
        </h3>
        ${results.errors.map(e => `
        <div style="padding:var(--space-2) var(--space-3);background:var(--semantic-danger-bg);border-radius:var(--radius-md);font-size:var(--font-caption-size);color:var(--text-danger);margin-bottom:var(--space-2)">
          Ligne ${e.ligne} — ${escapeText(e.email)} : ${escapeText(e.message)}
        </div>`).join('')}
      </div>` : ''}
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

function escapeText(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
