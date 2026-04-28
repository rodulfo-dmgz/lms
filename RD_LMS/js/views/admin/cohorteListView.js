export function renderCohorteList(container, { cohortes, onEdit, onDelete }) {
    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Cohortes</h1>
          <p class="admin-page-sub">${cohortes.length} cohorte${cohortes.length > 1 ? 's' : ''}</p>
        </div>
        <a href="#/admin/cohortes/nouveau" class="btn btn-cta">
          <i data-lucide="plus" aria-hidden="true"></i> Nouvelle cohorte
        </a>
      </div>

      ${cohortes.length === 0 ? `
      <div class="admin-empty">
        <i data-lucide="users" aria-hidden="true"></i>
        <p>Aucune cohorte. <a href="#/admin/cohortes/nouveau">Créer la première.</a></p>
      </div>` : `
      <div class="admin-section">
        <div class="table-wrapper">
          <table class="table" aria-label="Liste des cohortes">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Parcours</th>
                <th>Financement</th>
                <th class="text-center">Membres</th>
                <th>Période</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${cohortes.map(c => `
              <tr>
                <td class="font-medium">${esc(c.nom)}</td>
                <td class="text-secondary">${esc(c.pathway_titre)}</td>
                <td>${c.financement_nom ? `<span class="badge badge-outline">${esc(c.financement_nom)}</span>` : '<span class="text-muted">—</span>'}</td>
                <td class="text-center">
                  <span class="badge badge-primary">${c.nb_membres}</span>
                </td>
                <td class="text-mono text-sm">${formatPeriode(c.date_debut, c.date_fin)}</td>
                <td class="table-actions">
                  <button class="btn-icon btn-icon--edit"   data-id="${c.id}" data-nom="${esc(c.nom)}" title="Modifier">
                    <i data-lucide="pencil" aria-hidden="true"></i>
                  </button>
                  <button class="btn-icon btn-icon--delete" data-id="${c.id}" data-nom="${esc(c.nom)}" title="Supprimer">
                    <i data-lucide="trash-2" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`}
    </div>`;

    container.querySelectorAll('.btn-icon--edit').forEach(btn => {
        btn.addEventListener('click', () => onEdit(btn.dataset.id));
    });
    container.querySelectorAll('.btn-icon--delete').forEach(btn => {
        btn.addEventListener('click', () => onDelete(btn.dataset.id, btn.dataset.nom));
    });
}

function formatPeriode(debut, fin) {
    const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '?';
    if (!debut && !fin) return '—';
    return `${fmt(debut)} → ${fmt(fin)}`;
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
