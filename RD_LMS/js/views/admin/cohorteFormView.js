export function renderCohorteForm(container, {
    cohorte, pathways, financements, members, available,
    assignedProduits = [], availableProduits = [],
    onSave, onCancel, onAddMember, onRemoveMember,
    onAssignProduit, onUnassignProduit,
}) {
    const isEdit   = !!cohorte;
    const title    = isEdit ? `Modifier — ${esc(cohorte.nom)}` : 'Nouvelle cohorte';

    // Groupe pathways par titre pro
    const byTitrePro = groupBy(pathways, p => p.titre_pro_intitule || 'Sans titre pro');

    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">${title}</h1>
        </div>
        <button id="btnCancel" class="btn btn-ghost">
          <i data-lucide="x" aria-hidden="true"></i> Annuler
        </button>
      </div>

      <div id="form-alert" class="form-error-global" style="display:none" role="alert"></div>
      <div id="form-success" class="form-success-global" style="display:none" role="status"></div>

      <!-- Informations générales -->
      <div class="admin-section">
        <div class="admin-section-header">
          <i data-lucide="info" aria-hidden="true"></i>
          <h2>Informations</h2>
        </div>
        <div class="admin-section-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label form-label--required" for="c-nom">Nom de la cohorte</label>
              <input type="text" id="c-nom" class="form-input" value="${esc(cohorte?.nom || '')}" required>
            </div>

            <div class="form-group">
              <label class="form-label form-label--required" for="c-pathway">Parcours</label>
              <select id="c-pathway" class="form-input" ${isEdit ? 'disabled' : ''}>
                <option value=""> Choisir un parcours </option>
                ${Object.entries(byTitrePro).map(([tp, pws]) => `
                <optgroup label="${esc(tp)}">
                  ${pws.map(pw => `<option value="${pw.id}" ${cohorte?.pathway_id === pw.id ? 'selected' : ''}>${esc(pw.titre)}</option>`).join('')}
                </optgroup>`).join('')}
              </select>
              ${isEdit ? '<p class="form-hint">Le parcours ne peut pas être modifié après création.</p>' : ''}
            </div>

            <div class="form-group">
              <label class="form-label" for="c-financement">Financement</label>
              <select id="c-financement" class="form-input" ${isEdit ? 'disabled' : ''}>
                <option value="">— Aucun —</option>
                ${financements.map(f => {
                    const suffix = f.type_financement ? ` (${f.type_financement})` : '';
                    return `<option value="${f.id}" ${cohorte?.financement_id === f.id ? 'selected' : ''}>${esc(f.nom)}${suffix}</option>`;
                }).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="c-debut">Date de début</label>
              <input type="date" id="c-debut" class="form-input" value="${cohorte?.date_debut || ''}">
            </div>

            <div class="form-group">
              <label class="form-label" for="c-fin">Date de fin</label>
              <input type="date" id="c-fin" class="form-input" value="${cohorte?.date_fin || ''}">
            </div>
          </div>

          <div class="form-actions">
            <button id="btnSave" class="btn btn-cta">
              <i data-lucide="save" aria-hidden="true"></i>
              ${isEdit ? 'Enregistrer les modifications' : 'Créer la cohorte'}
            </button>
          </div>
        </div>
      </div>

      ${isEdit ? renderMembersSection(members, available) : ''}
      ${isEdit ? renderProduitsSection(assignedProduits, availableProduits) : ''}
    </div>`;

    // Events
    container.querySelector('#btnCancel').addEventListener('click', onCancel);

    container.querySelector('#btnSave').addEventListener('click', async () => {
        const nom          = container.querySelector('#c-nom').value.trim();
        const pathway_id   = container.querySelector('#c-pathway').value;
        const financement_id = container.querySelector('#c-financement').value;
        const date_debut   = container.querySelector('#c-debut').value;
        const date_fin     = container.querySelector('#c-fin').value;
        const alert        = container.querySelector('#form-alert');
        const success      = container.querySelector('#form-success');

        if (!nom)        return showAlert(alert, 'Le nom est obligatoire.');
        if (!isEdit && !pathway_id) return showAlert(alert, 'Veuillez choisir un parcours.');

        hideAlert(alert); hideAlert(success);
        const btn = container.querySelector('#btnSave');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        await onSave({ nom, pathway_id, financement_id: financement_id || null, date_debut, date_fin });

        btn.disabled  = false;
        btn.innerHTML = `<i data-lucide="save"></i> ${isEdit ? 'Enregistrer les modifications' : 'Créer la cohorte'}`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
    });

    if (isEdit && onAddMember) {
        const btnAdd = container.querySelector('#btnAddMember');
        const sel    = container.querySelector('#selectAddMember');
        btnAdd?.addEventListener('click', async () => {
            if (!sel.value) return;
            await onAddMember(sel.value);
        });
    }

    if (isEdit && onRemoveMember) {
        container.querySelectorAll('.btn-remove-member').forEach(btn => {
            btn.addEventListener('click', () => onRemoveMember(btn.dataset.id, btn.dataset.nom));
        });
    }

    if (isEdit && onAssignProduit) {
        const btnAssign = container.querySelector('#btn-assign-produit');
        const selProduit = container.querySelector('#select-add-produit');
        btnAssign?.addEventListener('click', async () => {
            if (!selProduit?.value) return;
            btnAssign.disabled = true;
            await onAssignProduit(selProduit.value);
            btnAssign.disabled = false;
        });
    }

    if (isEdit && onUnassignProduit) {
        container.querySelectorAll('.btn-unassign-produit').forEach(btn => {
            btn.addEventListener('click', () => onUnassignProduit(btn.dataset.produitId));
        });
    }
}

function renderMembersSection(members, available) {
    return `
    <div class="admin-section">
      <div class="admin-section-header">
        <i data-lucide="users" aria-hidden="true"></i>
        <h2>Membres <span class="badge badge-primary">${members.length}</span></h2>
      </div>
      <div class="admin-section-body">

        ${available.length > 0 ? `
        <div class="admin-add-member">
          <select id="selectAddMember" class="form-input" style="flex:1">
            <option value=""> Choisir un stagiaire à ajouter </option>
            ${available.map(s => `<option value="${s.id}">${esc(s.prenom)} ${esc(s.nom)}</option>`).join('')}
          </select>
          <button id="btnAddMember" class="btn btn-secondary">
            <i data-lucide="user-plus" aria-hidden="true"></i> Ajouter
          </button>
        </div>` : ''}

        ${members.length === 0 ? `
        <div class="admin-empty-sm">
          <i data-lucide="user-x" aria-hidden="true"></i>
          <span>Aucun membre dans cette cohorte</span>
        </div>` : `
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Inscrit le</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${members.map(m => `
              <tr>
                <td class="font-medium">${esc(m.nom)}</td>
                <td>${esc(m.prenom)}</td>
                <td class="text-mono text-sm">${new Date(m.date_inscription).toLocaleDateString('fr-FR')}</td>
                <td>${m.first_login
                    ? '<span class="badge badge-warning">Premier login</span>'
                    : '<span class="badge badge-success">Actif</span>'}</td>
                <td>
                  <button class="btn-icon btn-icon--delete btn-remove-member"
                    data-id="${m.profile_id}" data-nom="${esc(m.prenom)} ${esc(m.nom)}" title="Retirer">
                    <i data-lucide="user-minus" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
      </div>
    </div>`;
}

function renderProduitsSection(assignedProduits, availableProduits) {
    // Filter out already-assigned products from the dropdown
    const assignedIds = new Set(assignedProduits.map(p => p.produit_id));
    const unassigned  = availableProduits.filter(p => !assignedIds.has(p.id));

    return `
    <div class="admin-section">
      <div class="admin-section-header">
        <i data-lucide="package" aria-hidden="true"></i>
        <h2>
          Produits assignés
          <span class="badge badge-primary badge-sm" style="margin-left:var(--space-2)">${assignedProduits.length}</span>
        </h2>
      </div>
      <div class="admin-section-body">
        <p class="form-hint" style="margin-bottom:var(--space-4)">
          Les produits déterminent le contenu accessible aux membres de cette cohorte.
          Si aucun produit n'est assigné, tous les contenus du parcours sont accessibles.
        </p>

        ${unassigned.length > 0 ? `
        <div class="admin-add-member" style="margin-bottom:var(--space-4)">
          <select id="select-add-produit" class="form-input">
            <option value="">— Choisir un produit à assigner —</option>
            ${unassigned.map(p => `<option value="${p.id}">${esc(p.nom)}</option>`).join('')}
          </select>
          <button id="btn-assign-produit" class="btn btn-secondary">
            <i data-lucide="plus" aria-hidden="true"></i> Assigner
          </button>
        </div>` : `
        <p class="form-hint" style="margin-bottom:var(--space-4);font-style:italic">
          Tous les produits de ce parcours sont déjà assignés.
        </p>`}

        ${assignedProduits.length === 0 ? `
        <div class="admin-empty-sm">
          <i data-lucide="package-open" aria-hidden="true"></i>
          <span>Aucun produit assigné — accès complet au parcours</span>
        </div>` : `
        <ul class="produit-items-list">
          ${assignedProduits.map(p => `
          <li class="produit-item-row">
            <i data-lucide="package" class="produit-item-row__icon" aria-hidden="true"></i>
            <span class="produit-item-row__titre">${esc(p.nom)}</span>
            ${p.actif
              ? '<span class="badge badge-success badge-sm">Actif</span>'
              : '<span class="badge badge-neutral badge-sm">Inactif</span>'}
            <button class="btn-icon btn-icon--delete btn-unassign-produit"
                    data-produit-id="${p.produit_id}" title="Retirer ce produit">
              <i data-lucide="x" aria-hidden="true"></i>
            </button>
          </li>`).join('')}
        </ul>`}
      </div>
    </div>`;
}

function groupBy(arr, keyFn) {
    return arr.reduce((acc, item) => {
        const key = keyFn(item) || 'Autre';
        (acc[key] = acc[key] || []).push(item);
        return acc;
    }, {});
}

function showAlert(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }
function hideAlert(el)       { if (el) el.style.display = 'none'; }

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
