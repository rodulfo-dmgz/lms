const ROLE_LABELS = {
    admin: 'Admin', formateur_editeur: 'Form. Éditeur',
    formateur: 'Formateur', stagiaire: 'Stagiaire', invite: 'Invité',
};

export function renderStagiaireList(container, { stagiaires, cohortes, onEdit }) {
    const cohorteMap = Object.fromEntries(cohortes.map(c => [c.id, c.nom]));

    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Utilisateurs</h1>
          <p class="admin-page-sub">${stagiaires.length} personne${stagiaires.length > 1 ? 's' : ''}</p>
        </div>
        <a href="#/admin/stagiaires/nouveau" class="btn btn-cta">
          <i data-lucide="user-plus" aria-hidden="true"></i> Nouvel utilisateur
        </a>
      </div>

      <!-- Filtres rôle + cohorte -->
      <div class="admin-filters">
        <label class="admin-filter-label" for="filterRole">
          <i data-lucide="tag" aria-hidden="true"></i> Type
        </label>
        <select id="filterRole" class="form-input form-input--sm">
          <option value="">Tous les types</option>
          ${Object.entries(ROLE_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
        <label class="admin-filter-label" for="filterCohorte">
          <i data-lucide="filter" aria-hidden="true"></i> Cohorte
        </label>
        <select id="filterCohorte" class="form-input form-input--sm">
          <option value="">Toutes les cohortes</option>
          <option value="__none__">Sans cohorte</option>
          ${cohortes.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}
        </select>
      </div>

      ${stagiaires.length === 0 ? `
      <div class="admin-empty">
        <i data-lucide="users" aria-hidden="true"></i>
        <p>Aucun utilisateur. <a href="#/admin/stagiaires/nouveau">Créer le premier utilisateur.</a></p>
      </div>` : `
      <div class="admin-section">
        <div class="table-wrapper">
          <table class="table" aria-label="Liste des utilisateurs" id="stagiaireTable">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Type</th>
                <th>Cohorte</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${stagiaires.map(s => `
              <tr data-cohorte="${s.cohorte_id || '__none__'}" data-role="${s.role}">
                <td class="font-medium">${esc(s.nom)}</td>
                <td>${esc(s.prenom)}</td>
                <td><span class="badge badge-outline">${ROLE_LABELS[s.role] || s.role}</span></td>
                <td>${s.cohorte_nom
                    ? `<span class="badge badge-primary">${esc(s.cohorte_nom)}</span>`
                    : '<span class="text-muted">—</span>'}</td>
                <td>${s.first_login
                    ? '<span class="badge badge-warning">Premier login</span>'
                    : '<span class="badge badge-success">Actif</span>'}</td>
                <td class="text-mono text-sm">${new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                  <button class="btn-icon btn-icon--edit" data-id="${s.id}" title="Modifier">
                    <i data-lucide="pencil" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`}
    </div>`;

    // Filtres rôle + cohorte (client-side, cumulatifs)
    const filterRole    = container.querySelector('#filterRole');
    const filterCohorte = container.querySelector('#filterCohorte');
    function applyFilters() {
        const role    = filterRole?.value    || '';
        const cohorte = filterCohorte?.value || '';
        container.querySelectorAll('#stagiaireTable tbody tr').forEach(row => {
            const matchRole    = !role    || row.dataset.role    === role;
            const matchCohorte = !cohorte || row.dataset.cohorte === cohorte;
            row.style.display = (matchRole && matchCohorte) ? '' : 'none';
        });
    }
    filterRole?.addEventListener('change', applyFilters);
    filterCohorte?.addEventListener('change', applyFilters);

    container.querySelectorAll('.btn-icon--edit').forEach(btn => {
        btn.addEventListener('click', () => onEdit(btn.dataset.id));
    });
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
