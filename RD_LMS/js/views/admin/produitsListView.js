export function renderProduitsList(container, { produits, onEdit, onDelete }) {
    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Produits</h1>
          <p class="admin-page-sub">${produits.length} produit${produits.length !== 1 ? 's' : ''}</p>
        </div>
        <a href="#/admin/produits/nouveau" class="btn btn-cta">
          <i data-lucide="plus" aria-hidden="true"></i> Nouveau produit
        </a>
      </div>

      <div class="admin-hint-box">
        <i data-lucide="info" aria-hidden="true"></i>
        <div>
          <strong>Qu'est-ce qu'un produit ?</strong>
          Un produit est un bundle de contenu (modules, séquences ou séances) que vous assignez
          à une cohorte ou à un stagiaire pour contrôler précisément son accès au parcours.
        </div>
      </div>

      ${produits.length === 0 ? `
      <div class="admin-empty">
        <i data-lucide="package" aria-hidden="true"></i>
        <p>Aucun produit. <a href="#/admin/produits/nouveau">Créer le premier.</a></p>
      </div>` : `
      <div class="admin-section">
        <div class="table-wrapper">
          <table class="table" aria-label="Liste des produits">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Parcours</th>
                <th class="text-center">Contenu</th>
                <th class="text-center">Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${produits.map(p => `
              <tr>
                <td class="font-medium">${esc(p.nom)}</td>
                <td class="text-secondary">${esc(p.pathway_titre)}</td>
                <td class="text-center">
                  <span class="badge badge-primary">${p.nb_items} item${p.nb_items !== 1 ? 's' : ''}</span>
                </td>
                <td class="text-center">
                  ${p.actif
                    ? '<span class="badge badge-success">Actif</span>'
                    : '<span class="badge badge-neutral">Inactif</span>'}
                </td>
                <td class="table-actions">
                  <button class="btn-icon btn-icon--edit"
                          data-id="${p.id}" title="Modifier">
                    <i data-lucide="pencil" aria-hidden="true"></i>
                  </button>
                  <button class="btn-icon btn-icon--delete"
                          data-id="${p.id}" data-nom="${escAttr(p.nom)}" title="Supprimer">
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

function esc(str) {
    const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML;
}
function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
