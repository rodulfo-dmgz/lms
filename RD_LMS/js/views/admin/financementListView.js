const TYPE_LABELS = {
    CPF:          'CPF',
    OPCO:         'OPCO',
    PÔLE_EMPLOI:  'Pôle Emploi',
    ENTREPRISE:   'Entreprise',
    PERSONNEL:    'Personnel',
    AUTRE:        'Autre',
};

const TYPE_BADGE = {
    CPF:          'badge-info',
    OPCO:         'badge-success',
    PÔLE_EMPLOI:  'badge-warning',
    ENTREPRISE:   'badge-primary',
    PERSONNEL:    'badge-outline',
    AUTRE:        'badge-outline',
};

export function renderFinancementList(container, { financements, onEdit, onDelete }) {
    container.innerHTML = `
    <div class="page-admin">

      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Modes de financement</h1>
          <p class="admin-page-sub">${financements.length} financement${financements.length > 1 ? 's' : ''}</p>
        </div>
        <a href="#/admin/financements/nouveau" class="btn btn-cta">
          <i data-lucide="plus" aria-hidden="true"></i> Nouveau financement
        </a>
      </div>

      ${financements.length === 0 ? `
      <div class="admin-empty">
        <i data-lucide="credit-card" aria-hidden="true"></i>
        <p>Aucun mode de financement. Cliquez sur « Nouveau financement » pour commencer.</p>
      </div>` : `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Financeur</th>
              <th>Prix HT</th>
              <th>Prise en charge</th>
              <th>Statut</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${financements.map(f => renderRow(f)).join('')}
          </tbody>
        </table>
      </div>`}

    </div>`;

    // Boutons Éditer
    container.querySelectorAll('.btn-edit-financement').forEach(btn => {
        btn.addEventListener('click', () => onEdit?.(btn.dataset.id));
    });

    // Boutons Supprimer
    container.querySelectorAll('.btn-delete-financement').forEach(btn => {
        btn.addEventListener('click', () => onDelete?.(btn.dataset.id, btn.dataset.nom));
    });
}

function renderRow(f) {
    const typeLabel = TYPE_LABELS[f.type_financement] || f.type_financement || '—';
    const typeBadge = TYPE_BADGE[f.type_financement]  || 'badge-outline';

    const prixHT = f.prix_ht != null
        ? `${Number(f.prix_ht).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
        : '—';

    const prise = f.taux_prise_charge != null
        ? `${f.taux_prise_charge} %`
        : (f.plafond_montant != null
            ? `Plafond ${Number(f.plafond_montant).toLocaleString('fr-FR')} €`
            : '—');

    return `
    <tr>
      <td>
        <div class="admin-table-name">${esc(f.nom)}</div>
        ${f.code_cpf ? `<div class="admin-table-sub">CPF : ${esc(f.code_cpf)}</div>` : ''}
      </td>
      <td>
        ${f.type_financement
          ? `<span class="badge badge-sm ${typeBadge}">${typeLabel}</span>`
          : '<span class="text-muted">—</span>'}
      </td>
      <td>
        <div>${esc(f.financeur || '—')}</div>
        ${f.organisme_gestionnaire ? `<div class="admin-table-sub">${esc(f.organisme_gestionnaire)}</div>` : ''}
      </td>
      <td>${prixHT}</td>
      <td>${prise}</td>
      <td>
        <span class="badge badge-sm ${f.actif ? 'badge-success' : 'badge-outline'}">
          ${f.actif ? 'Actif' : 'Inactif'}
        </span>
      </td>
      <td style="text-align:right">
        <div class="admin-table-actions">
          <button class="btn btn-ghost btn-sm btn-edit-financement"
                  data-id="${f.id}" data-nom="${esc(f.nom)}"
                  title="Modifier">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-delete-financement"
                  data-id="${f.id}" data-nom="${esc(f.nom)}"
                  title="Supprimer">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
}
