/**
 * renderProduitForm
 * @param {HTMLElement} container
 * @param {{
 *   produit: object|null,
 *   pathways: array,
 *   items: array,           // [] on create
 *   contentTree: array,     // [] on create
 *   onSave, onCancel,
 *   onAddItem, onRemoveItem
 * }} props
 */
export function renderProduitForm(container, {
    produit, pathways,
    items = [], contentTree = [],
    onSave, onCancel, onAddItem, onRemoveItem,
}) {
    const isEdit = !!produit;
    const title  = isEdit ? `Modifier — ${esc(produit.nom)}` : 'Nouveau produit';

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

      <div id="form-alert"   class="form-error-global"   style="display:none" role="alert"></div>
      <div id="form-success" class="form-success-global" style="display:none" role="status"></div>

      <!-- ── Informations ──────────────────────────────────── -->
      <div class="admin-section">
        <div class="admin-section-header">
          <i data-lucide="package" aria-hidden="true"></i>
          <h2>Informations du produit</h2>
        </div>
        <div class="admin-section-body">
          <div class="form-grid">

            <div class="form-group">
              <label class="form-label form-label--required" for="p-nom">Nom du produit</label>
              <input type="text" id="p-nom" class="form-input"
                     value="${esc(produit?.nom || '')}"
                     placeholder="Ex : Module Droit du Travail">
            </div>

            <div class="form-group">
              <label class="form-label form-label--required" for="p-pathway">Parcours associé</label>
              <select id="p-pathway" class="form-input" ${isEdit ? 'disabled' : ''}>
                <option value="">— Choisir un parcours —</option>
                ${pathways.map(pw => `
                <option value="${pw.id}" ${produit?.pathway_id === pw.id ? 'selected' : ''}>
                  ${esc(pw.titre)}
                </option>`).join('')}
              </select>
              ${isEdit
                ? '<p class="form-hint">Le parcours ne peut pas être modifié après création.</p>'
                : ''}
            </div>

            <div class="form-group form-group--full">
              <label class="form-label" for="p-desc">Description</label>
              <textarea id="p-desc" class="form-input form-textarea" rows="3"
                        placeholder="Décrivez brièvement le contenu inclus dans ce produit…">${esc(produit?.description || '')}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Statut</label>
              <label class="produit-toggle">
                <input type="checkbox" id="p-actif" ${(produit?.actif ?? true) ? 'checked' : ''}>
                <span class="produit-toggle__track">
                  <span class="produit-toggle__thumb"></span>
                </span>
                <span class="produit-toggle__label" id="p-actif-label">
                  ${(produit?.actif ?? true) ? 'Produit actif' : 'Produit inactif'}
                </span>
              </label>
            </div>

          </div>

          <div class="form-actions">
            <button id="btnSave" class="btn btn-cta">
              <i data-lucide="save" aria-hidden="true"></i>
              ${isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Contenu inclus (édition uniquement) ──────────── -->
      ${isEdit
        ? renderItemsSection(items, contentTree)
        : `<div class="admin-hint-box admin-hint-box--info">
             <i data-lucide="lightbulb" aria-hidden="true"></i>
             <div>Créez d'abord le produit, puis vous pourrez y ajouter des modules, séquences ou séances.</div>
           </div>`
      }
    </div>`;

    // ── Événements ────────────────────────────────────────────
    container.querySelector('#btnCancel').addEventListener('click', onCancel);

    // Toggle label dynamique
    const checkboxActif = container.querySelector('#p-actif');
    const labelActif    = container.querySelector('#p-actif-label');
    checkboxActif?.addEventListener('change', () => {
        if (labelActif) labelActif.textContent = checkboxActif.checked ? 'Produit actif' : 'Produit inactif';
    });

    // Sauvegarde
    container.querySelector('#btnSave').addEventListener('click', async () => {
        const nom     = container.querySelector('#p-nom').value.trim();
        const pathway = container.querySelector('#p-pathway')?.value || '';
        const desc    = container.querySelector('#p-desc').value.trim();
        const actif   = container.querySelector('#p-actif').checked;
        const alertEl = container.querySelector('#form-alert');
        const succEl  = container.querySelector('#form-success');

        alertEl.style.display = 'none';
        succEl.style.display  = 'none';

        if (!nom) { showAlert(alertEl, 'Le nom du produit est obligatoire.'); return; }
        if (!isEdit && !pathway) { showAlert(alertEl, 'Veuillez choisir un parcours.'); return; }

        const btn = container.querySelector('#btnSave');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Enregistrement…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        try {
            await onSave({
                nom,
                pathway_id:  pathway || produit?.pathway_id,
                description: desc,
                actif,
            });
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="save" aria-hidden="true"></i> ${isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
    });

    // Délégation d'événements pour les items
    if (isEdit) {
        bindItemsSection(container, onAddItem, onRemoveItem);
    }
}

// ── Section "Contenu inclus" ──────────────────────────────────
function renderItemsSection(items, contentTree) {
    return `
    <div class="admin-section" id="section-items">
      <div class="admin-section-header">
        <i data-lucide="list-tree" aria-hidden="true"></i>
        <h2>
          Contenu inclus
          <span class="badge badge-primary badge-sm" id="items-count"
                style="margin-left:var(--space-2)">${items.length}</span>
        </h2>
      </div>
      <div class="admin-section-body">

        <!-- Items sélectionnés -->
        <div id="items-list-wrap">
          ${items.length === 0
            ? '<p class="admin-empty-inline" id="items-empty-msg">Aucun contenu sélectionné. Utilisez l\'arbre ci-dessous pour en ajouter.</p>'
            : `<ul class="produit-items-list" id="items-list">
                 ${items.map(buildItemRow).join('')}
               </ul>`
          }
        </div>

        <!-- Séparateur -->
        <div class="produit-picker-divider"></div>

        <!-- Arbre de sélection -->
        <div class="produit-picker">
          <div class="produit-picker__header">
            <i data-lucide="folder-tree" aria-hidden="true"></i>
            <h3>Ajouter depuis le parcours</h3>
          </div>
          <p class="form-hint" style="margin-bottom:var(--space-3)">
            Cliquez sur <strong>+ Ajouter</strong> pour inclure un module, une séquence ou une séance dans ce produit.
          </p>
          <div class="produit-picker__tree" id="content-tree">
            ${contentTree.length === 0
              ? '<p class="text-muted">Aucun contenu disponible pour ce parcours.</p>'
              : contentTree.map(buildTreeModule).join('')}
          </div>
        </div>

      </div>
    </div>`;
}

// ── Ligne d'item sélectionné ──────────────────────────────────
function buildItemRow(item) {
    const META = {
        module:   { icon: 'book-open',  label: 'Module',   css: 'badge-primary' },
        sequence: { icon: 'layers',     label: 'Séquence',  css: 'badge-warning' },
        seance:   { icon: 'file-text',  label: 'Séance',    css: 'badge-neutral' },
    };
    const m = META[item.item_type] || { icon: 'file', label: item.item_type, css: 'badge-neutral' };
    return `
    <li class="produit-item-row" data-item-id="${item.id}">
      <i data-lucide="${m.icon}" class="produit-item-row__icon" aria-hidden="true"></i>
      <span class="badge ${m.css} badge-sm produit-item-row__type">${m.label}</span>
      <span class="produit-item-row__titre">${esc(item.titre)}</span>
      <button class="btn-icon btn-icon--delete btn-remove-item"
              data-item-id="${item.id}" title="Retirer ce contenu">
        <i data-lucide="x" aria-hidden="true"></i>
      </button>
    </li>`;
}

// ── Nœuds de l'arbre ─────────────────────────────────────────
function buildTreeModule(m) {
    return `
    <details class="tree-node tree-node--module">
      <summary class="tree-node__row">
        <i data-lucide="book-open" class="tree-node__icon" aria-hidden="true"></i>
        <span class="tree-node__label">${esc(m.titre)}</span>
        <button class="btn btn-sm btn-outline tree-node__add btn-add-item"
                data-type="module" data-id="${m.id}" data-titre="${escAttr(m.titre)}">
          <i data-lucide="plus" aria-hidden="true"></i> Ajouter
        </button>
      </summary>
      <div class="tree-node__children">
        ${m.sequences.length === 0
          ? '<p class="tree-node__empty">Aucune séquence</p>'
          : m.sequences.map(buildTreeSequence).join('')}
      </div>
    </details>`;
}

function buildTreeSequence(s) {
    return `
    <details class="tree-node tree-node--sequence">
      <summary class="tree-node__row">
        <i data-lucide="layers" class="tree-node__icon" aria-hidden="true"></i>
        <span class="tree-node__label">${esc(s.titre)}</span>
        <button class="btn btn-sm btn-outline tree-node__add btn-add-item"
                data-type="sequence" data-id="${s.id}" data-titre="${escAttr(s.titre)}">
          <i data-lucide="plus" aria-hidden="true"></i> Ajouter
        </button>
      </summary>
      <div class="tree-node__children">
        ${s.seances.length === 0
          ? '<p class="tree-node__empty">Aucune séance</p>'
          : s.seances.map(buildTreeSeance).join('')}
      </div>
    </details>`;
}

function buildTreeSeance(sc) {
    return `
    <div class="tree-node tree-node--seance tree-node__row">
      <i data-lucide="file-text" class="tree-node__icon" aria-hidden="true"></i>
      <span class="tree-node__label">${esc(sc.titre)}</span>
      <button class="btn btn-sm btn-outline tree-node__add btn-add-item"
              data-type="seance" data-id="${sc.id}" data-titre="${escAttr(sc.titre)}">
        <i data-lucide="plus" aria-hidden="true"></i> Ajouter
      </button>
    </div>`;
}

// ── Liaison événements items ──────────────────────────────────
function bindItemsSection(container, onAddItem, onRemoveItem) {
    container.addEventListener('click', async (e) => {
        // Ajouter un item depuis l'arbre
        const addBtn = e.target.closest('.btn-add-item');
        if (addBtn && !addBtn.disabled) {
            e.stopPropagation();
            addBtn.disabled = true;
            const origHTML = addBtn.innerHTML;
            addBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: addBtn });
            try {
                await onAddItem({
                    type:  addBtn.dataset.type,
                    id:    addBtn.dataset.id,
                    titre: addBtn.dataset.titre,
                });
            } finally {
                addBtn.innerHTML = origHTML;
                addBtn.disabled  = false;
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: addBtn });
            }
            return;
        }

        // Retirer un item
        const removeBtn = e.target.closest('.btn-remove-item');
        if (removeBtn && !removeBtn.disabled) {
            e.stopPropagation();
            removeBtn.disabled = true;
            try {
                await onRemoveItem(removeBtn.dataset.itemId);
            } finally {
                removeBtn.disabled = false;
            }
        }
    });
}

// ── Helpers ───────────────────────────────────────────────────
function showAlert(el, msg) {
    el.textContent    = msg;
    el.style.display  = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function esc(str) {
    const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML;
}
function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
