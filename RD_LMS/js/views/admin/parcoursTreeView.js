const SEANCE_TYPES = ['cours', 'tp', 'exercice', 'quiz', 'evaluation'];

export function renderParcoursTree(container, {
    pathway, configs, activeConfig, tree,
    onConfigChange,
    onAddModule, onEditModule, onDeleteModule, onMoveModule,
    onAddSequence, onEditSequence, onDeleteSequence, onMoveSequence,
    onAddSeance, onEditSeance, onDeleteSeance, onMoveSeance,
    onEditContent,
    onCloneModule,
}) {
    container.innerHTML = `
    <div class="page-admin">

      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">${esc(pathway.titre)}</h1>
          ${pathway.titre_pro_intitule ? `<p class="admin-page-sub">${esc(pathway.titre_pro_intitule)}</p>` : ''}
        </div>
        <a href="#/admin/parcours" class="btn btn-ghost">
          <i data-lucide="arrow-left" aria-hidden="true"></i> Parcours
        </a>
      </div>

      <div class="tree-toolbar">
        ${configs.length > 1 ? `
        <div class="admin-filters" style="margin:0">
          <label class="admin-filter-label"><i data-lucide="filter"></i> Config</label>
          <select id="configSelect" class="form-input form-input--sm">
            ${configs.map(c => `<option value="${c.config_id}" ${c.config_id === activeConfig.config_id ? 'selected' : ''}>${esc(c.financement_nom || 'Sans financement')} (${c.nb_cours})</option>`).join('')}
          </select>
        </div>` : '<div></div>'}
        <div class="tree-toolbar-right">
          <button class="btn btn-ghost btn-sm" id="btnExpandAll">
            <i data-lucide="chevrons-down" aria-hidden="true"></i> Tout développer
          </button>
          <button class="btn btn-ghost btn-sm" id="btnCollapseAll">
            <i data-lucide="chevrons-up" aria-hidden="true"></i> Tout réduire
          </button>
        </div>
      </div>

      <!-- Arbre des modules (replié par défaut) -->
      <div id="tree-root" class="tree-root">
        ${tree.map((mod, mi) => renderModuleNode(mod, mi, tree.length)).join('')}
        <div class="tree-add-row" style="gap:var(--space-2)">
          <button class="btn btn-secondary btn-sm tree-add-module" id="btnAddModule">
            <i data-lucide="plus" aria-hidden="true"></i> Ajouter un module
          </button>
          <button class="btn btn-ghost btn-sm" id="btnCloneModule">
            <i data-lucide="copy" aria-hidden="true"></i> Cloner depuis un autre parcours
          </button>
        </div>
      </div>

      <!-- Inline forms (hidden by default) -->
      <div id="inline-form-container"></div>

    </div>`;

    // Config change
    container.querySelector('#configSelect')?.addEventListener('change', e => {
        onConfigChange(e.target.value);
    });

    // Expand / Collapse all
    container.querySelector('#btnExpandAll')?.addEventListener('click', () => {
        container.querySelectorAll('.tree-node--module, .tree-node--sequence').forEach(node => {
            node.classList.remove('tree-collapsed');
        });
    });
    container.querySelector('#btnCollapseAll')?.addEventListener('click', () => {
        container.querySelectorAll('.tree-node--module, .tree-node--sequence').forEach(node => {
            node.classList.add('tree-collapsed');
        });
    });

    // Toggle individuel sur le clic du header
    container.querySelectorAll('.tree-node-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const node = btn.closest('.tree-node--module, .tree-node--sequence');
            node?.classList.toggle('tree-collapsed');
        });
    });

    // Module events
    container.querySelectorAll('.tree-move-up[data-level="module"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const items = getOrderedItems(tree, 'config_cours_id', 'ordre');
            const moved = moveItem(items, btn.dataset.id, -1);
            if (moved) onMoveModule(moved.map((it, i) => ({ configCoursId: it.config_cours_id, ordre: i })));
        });
    });
    container.querySelectorAll('.tree-move-down[data-level="module"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const items = getOrderedItems(tree, 'config_cours_id', 'ordre');
            const moved = moveItem(items, btn.dataset.id, 1);
            if (moved) onMoveModule(moved.map((it, i) => ({ configCoursId: it.config_cours_id, ordre: i })));
        });
    });
    container.querySelectorAll('.tree-edit[data-level="module"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mod = tree.find(m => m.cours_id === btn.dataset.id);
            showInlineForm(container, 'module', mod, {
                onSave: async (data) => { await onEditModule(mod.cours_id, data); },
            });
        });
    });
    container.querySelectorAll('.tree-delete[data-level="module"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mod = tree.find(m => m.cours_id === btn.dataset.id);
            onDeleteModule(btn.dataset.cfgId, mod?.titre || 'ce module');
        });
    });

    // Add module
    container.querySelector('#btnAddModule')?.addEventListener('click', () => {
        showInlineForm(container, 'new-module', null, { onSave: onAddModule });
    });

    // Clone module from another pathway
    container.querySelector('#btnCloneModule')?.addEventListener('click', () => {
        onCloneModule?.();
    });

    // Sequence events
    tree.forEach(mod => {
        (mod.sequences || []).forEach((seq, si) => {
            container.querySelector(`.tree-move-up[data-level="sequence"][data-id="${seq.id}"]`)
                ?.addEventListener('click', () => {
                    const items = mod.sequences;
                    const moved = moveItem(items, seq.id, -1, 'id');
                    if (moved) onMoveSequence(moved.map((it, i) => ({ id: it.id, ordre: i })));
                });
            container.querySelector(`.tree-move-down[data-level="sequence"][data-id="${seq.id}"]`)
                ?.addEventListener('click', () => {
                    const items = mod.sequences;
                    const moved = moveItem(items, seq.id, 1, 'id');
                    if (moved) onMoveSequence(moved.map((it, i) => ({ id: it.id, ordre: i })));
                });
            container.querySelector(`.tree-edit[data-level="sequence"][data-id="${seq.id}"]`)
                ?.addEventListener('click', () => {
                    showInlineForm(container, 'sequence', seq, {
                        onSave: async (data) => { await onEditSequence(seq.id, data); },
                    });
                });
            container.querySelector(`.tree-delete[data-level="sequence"][data-id="${seq.id}"]`)
                ?.addEventListener('click', () => onDeleteSequence(seq.id, seq.titre));
            container.querySelector(`.tree-add-sequence[data-cours="${mod.cours_id}"]`)
                ?.addEventListener('click', () => {
                    showInlineForm(container, 'new-sequence', null, {
                        onSave: async (data) => { await onAddSequence(mod.cours_id, data); },
                    });
                });

            // Seance events
            (seq.seances || []).forEach(s => {
                container.querySelector(`.tree-move-up[data-level="seance"][data-id="${s.id}"]`)
                    ?.addEventListener('click', () => {
                        const items = seq.seances;
                        const moved = moveItem(items, s.id, -1, 'id');
                        if (moved) onMoveSeance(moved.map((it, i) => ({ id: it.id, ordre: i })));
                    });
                container.querySelector(`.tree-move-down[data-level="seance"][data-id="${s.id}"]`)
                    ?.addEventListener('click', () => {
                        const items = seq.seances;
                        const moved = moveItem(items, s.id, 1, 'id');
                        if (moved) onMoveSeance(moved.map((it, i) => ({ id: it.id, ordre: i })));
                    });
                container.querySelector(`.tree-edit[data-level="seance"][data-id="${s.id}"]`)
                    ?.addEventListener('click', () => {
                        showInlineForm(container, 'seance', s, {
                            onSave: async (data) => { await onEditSeance(s.id, data); },
                        });
                    });
                container.querySelector(`.tree-delete[data-level="seance"][data-id="${s.id}"]`)
                    ?.addEventListener('click', () => onDeleteSeance(s.id, s.titre));
                container.querySelector(`.tree-edit-content[data-id="${s.id}"]`)
                    ?.addEventListener('click', () => onEditContent(s.id));
            });

            container.querySelector(`.tree-add-seance[data-seq="${seq.id}"]`)
                ?.addEventListener('click', () => {
                    showInlineForm(container, 'new-seance', null, {
                        onSave: async (data) => { await onAddSeance(seq.id, data); },
                    });
                });
        });
    });
}

// ── Inline form modal ────────────────────────────────────────
function showInlineForm(container, type, data, { onSave }) {
    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = buildFormHTML(type, data);
    document.body.appendChild(overlay);

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    overlay.querySelector('.tree-modal-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#treeFormSubmit')?.addEventListener('click', async () => {
        const result = collectForm(overlay, type);
        if (!result) return;
        const btn = overlay.querySelector('#treeFormSubmit');
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        await onSave(result);
        overlay.remove();
    });
}

function buildFormHTML(type, data) {
    const isModule   = type === 'module'   || type === 'new-module';
    const isSequence = type === 'sequence' || type === 'new-sequence';
    const isSeance   = type === 'seance'   || type === 'new-seance';
    const isNew      = type.startsWith('new-');
    const titles     = { module: 'Module', sequence: 'Séquence', seance: 'Séance' };
    const label      = isModule ? 'Module' : isSequence ? 'Séquence' : 'Séance';
    const title      = `${isNew ? 'Ajouter' : 'Modifier'} un${['e', 'a', 'i', 'o', 'u'].includes(label[0].toLowerCase()) ? 'e' : ''} ${label}`;

    return `
    <div class="tree-modal">
      <div class="tree-modal-header">
        <h3>${title}</h3>
        <button class="tree-modal-close btn-icon" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="tree-modal-body">
        <div class="form-group">
          <label class="form-label form-label--required">Titre</label>
          <input type="text" id="fTitre" class="form-input" value="${esc(data?.titre || '')}" required autofocus>
        </div>
        ${(isModule || isSequence) ? `
        <div class="form-group">
          <label class="form-label">Description / Objectif</label>
          <textarea id="fDesc" class="form-input form-textarea" rows="3">${esc(data?.objectif || data?.description || '')}</textarea>
        </div>` : ''}
        ${isModule ? `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Durée (heures)</label>
            <input type="number" id="fDuree" class="form-input" value="${data?.duree_heures || 0}" min="0" step="0.5">
          </div>
          <div class="form-group">
            <label class="form-label">Obligatoire</label>
            <select id="fOblig" class="form-input">
              <option value="true"  ${data?.obligatoire !== false ? 'selected' : ''}>Oui</option>
              <option value="false" ${data?.obligatoire === false ? 'selected' : ''}>Non</option>
            </select>
          </div>
        </div>` : ''}
        ${isSeance ? `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select id="fType" class="form-input">
              ${['cours','tp','exercice','quiz','evaluation'].map(t => `<option value="${t}" ${(data?.type||'cours') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Durée (heures)</label>
            <input type="number" id="fDuree" class="form-input" value="${data?.duree_heures ?? 3.5}" min="0" step="0.5">
          </div>
        </div>` : ''}
      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Annuler</button>
        <button class="btn btn-cta" id="treeFormSubmit">
          <i data-lucide="save" aria-hidden="true"></i>
          ${isNew ? 'Créer' : 'Enregistrer'}
        </button>
      </div>
    </div>`;
}

function collectForm(overlay, type) {
    const titre = overlay.querySelector('#fTitre')?.value.trim();
    if (!titre) { overlay.querySelector('#fTitre')?.focus(); return null; }

    const isModule   = type === 'module'   || type === 'new-module';
    const isSeance   = type === 'seance'   || type === 'new-seance';
    const isSequence = type === 'sequence' || type === 'new-sequence';

    if (isModule) {
        return {
            titre,
            description:   overlay.querySelector('#fDesc')?.value.trim() || null,
            objectif:      overlay.querySelector('#fDesc')?.value.trim() || null,
            duree_heures:  parseFloat(overlay.querySelector('#fDuree')?.value) || 0,
            obligatoire:   overlay.querySelector('#fOblig')?.value !== 'false',
        };
    }
    if (isSequence) return { titre, objectif: overlay.querySelector('#fDesc')?.value.trim() || null };
    if (isSeance)   return { titre, type: overlay.querySelector('#fType')?.value, duree_heures: parseFloat(overlay.querySelector('#fDuree')?.value) || 3.5 };
    return { titre };
}

// ── Rendu des nœuds ──────────────────────────────────────────
function renderModuleNode(mod, idx, total) {
    const seqCount   = (mod.sequences || []).length;
    const seanceCount = (mod.sequences || []).reduce((n, s) => n + (s.seances || []).length, 0);
    return `
    <div class="tree-node tree-node--module tree-collapsed">
      <div class="tree-node-header">
        <button class="tree-node-toggle" aria-label="Développer/Réduire">
          <i data-lucide="chevron-right" class="tree-toggle-icon" aria-hidden="true"></i>
        </button>
        <div class="tree-node-label">
          <i data-lucide="book-open" class="tree-icon tree-icon--module" aria-hidden="true"></i>
          <span class="tree-node-title">${esc(mod.titre)}</span>
          <span class="badge badge-outline badge-sm">${seqCount} séq.</span>
          <span class="badge badge-outline badge-sm">${seanceCount} séance${seanceCount > 1 ? 's' : ''}</span>
          ${!mod.obligatoire ? '<span class="badge badge-warning badge-sm">Optionnel</span>' : ''}
        </div>
        <div class="tree-node-actions">
          <button class="tree-move-up  btn-icon" data-level="module" data-id="${mod.cours_id}" title="Monter" ${idx === 0 ? 'disabled' : ''}>
            <i data-lucide="chevron-up" aria-hidden="true"></i>
          </button>
          <button class="tree-move-down btn-icon" data-level="module" data-id="${mod.cours_id}" title="Descendre" ${idx === total - 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-down" aria-hidden="true"></i>
          </button>
          <button class="tree-edit btn-icon btn-icon--edit" data-level="module" data-id="${mod.cours_id}" title="Modifier">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="tree-delete btn-icon btn-icon--delete" data-level="module" data-id="${mod.cours_id}" data-cfg-id="${mod.config_cours_id}" title="Retirer">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div class="tree-node-children">
        ${(mod.sequences || []).map((seq, si) => renderSequenceNode(seq, si, (mod.sequences || []).length, mod.cours_id)).join('')}
        <div class="tree-add-row">
          <button class="btn btn-ghost btn-sm tree-add-sequence" data-cours="${mod.cours_id}">
            <i data-lucide="plus" aria-hidden="true"></i> Ajouter une séquence
          </button>
        </div>
      </div>
    </div>`;
}

function renderSequenceNode(seq, idx, total, coursId) {
    const count = (seq.seances || []).length;
    return `
    <div class="tree-node tree-node--sequence tree-collapsed">
      <div class="tree-node-header">
        <button class="tree-node-toggle" aria-label="Développer/Réduire">
          <i data-lucide="chevron-right" class="tree-toggle-icon" aria-hidden="true"></i>
        </button>
        <div class="tree-node-label">
          <i data-lucide="list" class="tree-icon tree-icon--sequence" aria-hidden="true"></i>
          <span class="tree-node-title">${esc(seq.titre)}</span>
          <span class="badge badge-outline badge-sm">${count} séance${count > 1 ? 's' : ''}</span>
        </div>
        <div class="tree-node-actions">
          <button class="tree-move-up  btn-icon" data-level="sequence" data-id="${seq.id}" ${idx === 0 ? 'disabled' : ''}><i data-lucide="chevron-up"></i></button>
          <button class="tree-move-down btn-icon" data-level="sequence" data-id="${seq.id}" ${idx === total - 1 ? 'disabled' : ''}><i data-lucide="chevron-down"></i></button>
          <button class="tree-edit btn-icon btn-icon--edit"   data-level="sequence" data-id="${seq.id}"><i data-lucide="pencil"></i></button>
          <button class="tree-delete btn-icon btn-icon--delete" data-level="sequence" data-id="${seq.id}"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="tree-node-children">
        ${(seq.seances || []).map((s, si) => renderSeanceNode(s, si, (seq.seances || []).length)).join('')}
        <div class="tree-add-row">
          <button class="btn btn-ghost btn-sm tree-add-seance" data-seq="${seq.id}">
            <i data-lucide="plus" aria-hidden="true"></i> Ajouter une séance
          </button>
        </div>
      </div>
    </div>`;
}

function renderSeanceNode(s, idx, total) {
    return `
    <div class="tree-node tree-node--seance">
      <div class="tree-node-header">
        <div class="tree-node-label">
          <i data-lucide="file-text" class="tree-icon tree-icon--seance" aria-hidden="true"></i>
          <span class="tree-node-title">${esc(s.titre)}</span>
          <span class="badge badge-outline badge-sm">${s.type || 'cours'}</span>
          <span class="tree-duree">${s.duree_heures ?? '?'}h</span>
          ${s.has_content ? '<span class="badge badge-success badge-sm">Contenu</span>' : '<span class="badge badge-warning badge-sm">Vide</span>'}
        </div>
        <div class="tree-node-actions">
          <button class="tree-move-up  btn-icon" data-level="seance" data-id="${s.id}" ${idx === 0 ? 'disabled' : ''}><i data-lucide="chevron-up"></i></button>
          <button class="tree-move-down btn-icon" data-level="seance" data-id="${s.id}" ${idx === total - 1 ? 'disabled' : ''}><i data-lucide="chevron-down"></i></button>
          <button class="tree-edit btn-icon btn-icon--edit"     data-level="seance" data-id="${s.id}" title="Infos"><i data-lucide="pencil"></i></button>
          <button class="tree-edit-content btn btn-sm btn-secondary" data-id="${s.id}" title="Éditer le contenu">
            <i data-lucide="layout-panel-left" aria-hidden="true"></i> Contenu
          </button>
          <button class="tree-delete btn-icon btn-icon--delete" data-level="seance" data-id="${s.id}"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    </div>`;
}

// ── Helpers ──────────────────────────────────────────────────
function getOrderedItems(arr, idKey, ordreKey) {
    return [...arr].sort((a, b) => a[ordreKey] - b[ordreKey]);
}

function moveItem(arr, id, direction, idKey = 'config_cours_id') {
    const sorted = [...arr].sort((a, b) => (a.ordre ?? a[idKey]) - (b.ordre ?? b[idKey]));
    const idx    = sorted.findIndex(i => (i[idKey] || i.id) === id);
    if (idx === -1) return null;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return null;
    [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
    return sorted;
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
