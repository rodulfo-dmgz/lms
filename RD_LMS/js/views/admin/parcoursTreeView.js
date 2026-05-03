import { uploadBannerImage, validateBannerFile, listBannerImages, BANNER_BUCKET } from '../../utils/bannerUpload.js';

const SEANCE_TYPES = ['cours', 'tp', 'exercice', 'quiz', 'evaluation'];

export function renderParcoursTree(container, {
    pathway, configs, activeConfig, tree,
    financements = [],
    onConfigChange,
    onAddConfig,
    onImportCSV,
    onAddModule, onEditModule, onDeleteModule, onMoveModule,
    onAddSequence, onEditSequence, onDeleteSequence, onMoveSequence,
    onAddSeance, onEditSeance, onDeleteSeance, onMoveSeance,
    onEditContent,
    onCloneModule, onCloneSequence, onCloneSeance,
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
          <button class="btn btn-ghost btn-sm" id="btnImportCSV" title="Créer modules/séquences/séances depuis un fichier CSV">
            <i data-lucide="file-up" aria-hidden="true"></i> Import CSV
          </button>
          <button class="btn btn-ghost btn-sm" id="btnAddConfig" title="Ajouter un mode de financement à ce parcours">
            <i data-lucide="plus" aria-hidden="true"></i> Config
          </button>
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

    // Bouton Import CSV
    container.querySelector('#btnImportCSV')?.addEventListener('click', () => {
        showImportCSVModal(async (rows) => {
            const results = await onImportCSV?.(rows);
            return results;
        });
    });

    // Bouton + Config (ajouter un financement à ce parcours)
    container.querySelector('#btnAddConfig')?.addEventListener('click', () => {
        // Financements déjà assignés (noms des configs existantes)
        const assignedIds = new Set(configs.map(c => c.financement_id).filter(Boolean));
        const available   = financements.filter(f => !assignedIds.has(f.id));
        showAddConfigModal(available, onAddConfig);
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
            container.querySelector(`.tree-clone[data-level="sequence"][data-id="${seq.id}"]`)
                ?.addEventListener('click', () => onCloneSequence?.(seq));
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
                container.querySelector(`.tree-clone[data-level="seance"][data-id="${s.id}"]`)
                    ?.addEventListener('click', () => onCloneSeance?.(s));
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

    // Extras : seg control (modules) + upload bannière (tous)
    const isModuleForm   = type === 'module'   || type === 'new-module';
    const isSequenceForm = type === 'sequence' || type === 'new-sequence';
    const isSeanceForm   = type === 'seance'   || type === 'new-seance';
    if (isModuleForm)   _bindModuleExtras(overlay, data?.cours_id || '');
    if (isSequenceForm) _bindBannerExtras(overlay, data?.id || '', 'banners/sequences');
    if (isSeanceForm)   _bindBannerExtras(overlay, data?.id || '', 'banners/seances');

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

    // Bloc bannière réutilisé par les 3 types
    const bannerBlock = (imgUrl) => `
        <div class="form-group">
          <label class="form-label">Image bannière</label>
          <div class="banner-actions">
            <div class="banner-dz" id="bannerDz" role="button" tabindex="0" aria-label="Zone de dépôt d'image">
              <i data-lucide="image-up" aria-hidden="true"></i>
              <div class="banner-dz__text">
                <span>Glisser une image ici ou</span>
                <label class="banner-dz__browse" tabindex="0">
                  parcourir
                  <input type="file" id="bannerFileInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none" aria-label="Choisir un fichier image">
                </label>
              </div>
              <span class="banner-dz__hint">JPG · PNG · WebP · max 3 Mo</span>
            </div>
            <button type="button" class="banner-storage-btn" id="bannerBrowseBtn">
              <i data-lucide="database" aria-hidden="true"></i>
              <span>Parcourir<br><small>Supabase Storage</small></span>
            </button>
          </div>
          <div id="bannerProgress" class="banner-progress" style="display:none">
            <div class="banner-progress-bar"><div class="banner-progress-fill"></div></div>
            <span id="bannerProgressLabel" class="banner-progress-label">Envoi en cours…</span>
          </div>
          <p id="bannerError" class="form-error" style="display:none;margin-top:var(--space-2)"></p>
          <div class="banner-url-row">
            <span class="banner-url-sep">— ou coller une URL directe —</span>
            <input type="url" id="fImageUrl" class="form-input" value="${esc(imgUrl || '')}" placeholder="https://…">
            <p class="form-hint">L'URL est automatiquement renseignée après l'upload.</p>
          </div>
          <div id="bannerPreview" class="banner-preview" style="display:${imgUrl ? '' : 'none'}">
            ${imgUrl ? `<img src="${esc(imgUrl)}" alt="Aperçu bannière" onerror="this.parentElement.style.display='none'">` : ''}
          </div>
        </div>`;

    return `
    <div class="tree-modal tree-modal--lg">
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
        <div class="form-group">
          <label class="form-label">Durée (heures)</label>
          <input type="number" id="fDuree" class="form-input" value="${data?.duree_heures || 0}" min="0" step="1" style="max-width:140px">
          <p class="form-hint">Valeur entière (ex : 14). Le champ "Obligatoire" est géré dans la configuration du parcours.</p>
        </div>
        <!-- Type de compétence -->
        <div class="form-group">
          <label class="form-label">Type de compétence</label>
          <div class="form-seg-ctrl" role="group" aria-label="Type de compétence">
            <button type="button" class="form-seg-btn ${!data?.est_transversal ? 'active' : ''}" data-val="false">
              <i data-lucide="briefcase" aria-hidden="true"></i> Professionnelle
            </button>
            <button type="button" class="form-seg-btn ${data?.est_transversal ? 'active' : ''}" data-val="true">
              <i data-lucide="layers" aria-hidden="true"></i> Transversale
            </button>
          </div>
          <input type="hidden" id="fEstTransversal" value="${data?.est_transversal ? 'true' : 'false'}">
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
        ${bannerBlock(data?.image_url)}
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
            description:     overlay.querySelector('#fDesc')?.value.trim() || null,
            objectif:        overlay.querySelector('#fDesc')?.value.trim() || null,
            duree_heures:    parseFloat(overlay.querySelector('#fDuree')?.value) || 0,
            // obligatoire est dans lms_config_cours, pas lms_cours — pas envoyé ici
            image_url:       overlay.querySelector('#fImageUrl')?.value.trim() || null,
            est_transversal: overlay.querySelector('#fEstTransversal')?.value === 'true',
        };
    }
    if (isSequence) return {
        titre,
        objectif:  overlay.querySelector('#fDesc')?.value.trim() || null,
        image_url: overlay.querySelector('#fImageUrl')?.value.trim() || null,
    };
    if (isSeance)   return {
        titre,
        type:         overlay.querySelector('#fType')?.value,
        duree_heures: parseFloat(overlay.querySelector('#fDuree')?.value) || 3.5,
        image_url:    overlay.querySelector('#fImageUrl')?.value.trim() || null,
    };
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
          <button class="tree-clone btn-icon" data-level="sequence" data-id="${seq.id}" title="Cloner cette séquence vers un autre module"><i data-lucide="send-horizontal"></i></button>
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
          <button class="tree-clone btn-icon" data-level="seance" data-id="${s.id}" title="Cloner cette séance vers une autre séquence"><i data-lucide="send-horizontal"></i></button>
          <button class="tree-edit btn-icon btn-icon--edit"     data-level="seance" data-id="${s.id}" title="Infos"><i data-lucide="pencil"></i></button>
          <button class="tree-edit-content btn btn-sm btn-secondary" data-id="${s.id}" title="Éditer le contenu">
            <i data-lucide="layout-panel-left" aria-hidden="true"></i> Contenu
          </button>
          <button class="tree-delete btn-icon btn-icon--delete" data-level="seance" data-id="${s.id}"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    </div>`;
}

// ── Modale : Ajouter une configuration (financement) ────────────
function showAddConfigModal(available, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal">
      <div class="tree-modal-header">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="plus-circle" aria-hidden="true"></i>
          <h3>Ajouter une configuration</h3>
        </div>
        <button class="tree-modal-close btn-icon"><i data-lucide="x"></i></button>
      </div>
      <div class="tree-modal-body">
        <p class="form-hint" style="margin-bottom:var(--space-3)">
          Chaque configuration représente une version du parcours pour un mode de financement donné.
          Vous pourrez y ajouter les modules souhaités indépendamment.
        </p>
        <div class="form-group">
          <label class="form-label form-label--required">Mode de financement</label>
          <select id="cfgFinancement" class="form-input">
            <option value="">— Sélectionner —</option>
            ${available.map(f => {
                const suffix = f.type_financement ? ` (${f.type_financement})` : '';
                return `<option value="${f.id}">${esc(f.nom)}${suffix}</option>`;
            }).join('')}
            ${!available.length ? '<option value="" disabled>Tous les financements actifs sont déjà assignés</option>' : ''}
          </select>
          ${!available.length ? '<p class="form-hint" style="color:var(--color-warning)">Créez d\'abord un nouveau financement dans <a href="#/admin/financements">Admin → Financements</a>.</p>' : ''}
        </div>
        <div id="cfgStatus" class="clone-status-msg" style="display:none"></div>
      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Annuler</button>
        <button class="btn btn-cta" id="cfgConfirmBtn" ${!available.length ? 'disabled' : ''}>
          <i data-lucide="plus" aria-hidden="true"></i> Ajouter cette configuration
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    overlay.querySelectorAll('.tree-modal-close').forEach(b => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const sel        = overlay.querySelector('#cfgFinancement');
    const confirmBtn = overlay.querySelector('#cfgConfirmBtn');
    const statusEl   = overlay.querySelector('#cfgStatus');

    sel.addEventListener('change', () => { confirmBtn.disabled = !sel.value; statusEl.style.display = 'none'; });

    confirmBtn.addEventListener('click', async () => {
        const id = sel.value; if (!id) return;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Création…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        try {
            await onConfirm(id);
            statusEl.style.display = '';
            statusEl.className = 'clone-status-msg clone-status-msg--success';
            statusEl.textContent = '✓ Configuration créée ! Rechargement…';
            setTimeout(() => overlay.remove(), 1200);
        } catch (e) {
            statusEl.style.display = '';
            statusEl.className = 'clone-status-msg clone-status-msg--error';
            statusEl.textContent = `Erreur : ${e?.message || e}`;
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i data-lucide="plus"></i> Ajouter cette configuration';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        }
    });
}

// ── Modale : Import CSV ─────────────────────────────────────────
function showImportCSVModal(onImport) {
    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal tree-modal--lg">
      <div class="tree-modal-header">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="file-up" aria-hidden="true"></i>
          <h3>Import CSV — Contenu du parcours</h3>
        </div>
        <button class="tree-modal-close btn-icon"><i data-lucide="x"></i></button>
      </div>
      <div class="tree-modal-body">

        <!-- Format attendu -->
        <div class="admin-hint-box" style="margin-bottom:var(--space-4)">
          <i data-lucide="info" aria-hidden="true"></i>
          <div>
            <strong>Format CSV attendu</strong> — colonnes séparées par une virgule, une ligne par élément :
            <pre style="margin:var(--space-2) 0 0;font-size:var(--font-body2-size);white-space:pre-wrap">type,titre,description,duree_heures,type_seance
module,Anglais B1-B2,Formation anglais professionnel,40,
sequence,Compréhension écrite,Lire et comprendre des textes pro,10,
seance,Lire des mails,,2,cours
seance,Compte-rendus et rapports,,3,tp
sequence,Expression orale,,15,
seance,Conversations téléphoniques,,3,tp
module,Module 2,Description,20,</pre>
            <p style="margin-top:var(--space-2);font-size:var(--font-body2-size)">
              • <code>type</code> : <strong>module</strong> | <strong>sequence</strong> | <strong>seance</strong><br>
              • <code>type_seance</code> : cours | tp | exercice | quiz | evaluation (pour les séances seulement)<br>
              • La hiérarchie est déduite de l'ordre des lignes — chaque séquence appartient au dernier module listé
            </p>
          </div>
        </div>

        <!-- Zone de dépôt / upload -->
        <div class="form-group">
          <label class="form-label">Fichier CSV</label>
          <div class="banner-dz" id="csvImportDz" role="button" tabindex="0" style="max-height:120px">
            <i data-lucide="upload" aria-hidden="true"></i>
            <div class="banner-dz__text">
              <span>Glisser le fichier ici ou</span>
              <label class="banner-dz__browse" tabindex="0">
                parcourir
                <input type="file" id="csvImportFile" accept=".csv,text/csv" style="display:none">
              </label>
            </div>
            <span class="banner-dz__hint">Fichier .csv · UTF-8</span>
          </div>
        </div>

        <!-- Ou coller directement -->
        <div class="form-group">
          <label class="form-label">Ou coller le contenu CSV directement</label>
          <textarea id="csvImportText" class="form-input form-textarea" rows="8"
                    placeholder="type,titre,description,duree_heures,type_seance&#10;module,Mon module,..."></textarea>
        </div>

        <!-- Aperçu -->
        <div id="csvImportPreview" style="display:none">
          <div class="admin-section-header" style="margin-bottom:var(--space-2)">
            <i data-lucide="list" aria-hidden="true"></i>
            <h4 id="csvPreviewTitle">Aperçu (0 lignes)</h4>
          </div>
          <div id="csvPreviewContent" class="csv-import-preview"></div>
        </div>

        <!-- Résultats -->
        <div id="csvImportResults" style="display:none"></div>

      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close" id="csvCancelBtn">Annuler</button>
        <button class="btn btn-ghost" id="csvPreviewBtn">
          <i data-lucide="eye" aria-hidden="true"></i> Aperçu
        </button>
        <button class="btn btn-cta" id="csvImportBtn" disabled>
          <i data-lucide="file-up" aria-hidden="true"></i> Importer
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    overlay.querySelectorAll('.tree-modal-close').forEach(b => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const dz          = overlay.querySelector('#csvImportDz');
    const fileInput   = overlay.querySelector('#csvImportFile');
    const textArea    = overlay.querySelector('#csvImportText');
    const previewDiv  = overlay.querySelector('#csvImportPreview');
    const previewTitle = overlay.querySelector('#csvPreviewTitle');
    const previewContent = overlay.querySelector('#csvPreviewContent');
    const resultsDiv  = overlay.querySelector('#csvImportResults');
    const previewBtn  = overlay.querySelector('#csvPreviewBtn');
    const importBtn   = overlay.querySelector('#csvImportBtn');

    let parsedRows = [];

    // ── Lecture fichier ────────────────────────────────────────
    const loadFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            textArea.value = e.target.result;
            runPreview();
        };
        reader.readAsText(file, 'UTF-8');
    };

    fileInput.addEventListener('change', (e) => { loadFile(e.target.files?.[0]); e.target.value = ''; });
    dz.addEventListener('click', () => fileInput.click());
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
        e.preventDefault(); dz.classList.remove('dragover');
        loadFile(e.dataTransfer.files?.[0]);
    });

    // ── Parser CSV minimaliste ─────────────────────────────────
    function parseCSVText(text) {
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        if (!lines.length) return [];

        // Détecter le séparateur
        const sep = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/["']/g, ''));

        return lines.slice(1).map(line => {
            const vals = parseLine(line, sep);
            const obj  = {};
            headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim().replace(/^["']|["']$/g, ''); });
            return obj;
        }).filter(r => r.type && r.titre);
    }

    function parseLine(line, sep) {
        const result = [];
        let curr = '';
        let inQ  = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') { inQ = !inQ; }
            else if (c === sep && !inQ) { result.push(curr); curr = ''; }
            else { curr += c; }
        }
        result.push(curr);
        return result;
    }

    // ── Aperçu ────────────────────────────────────────────────
    function runPreview() {
        const text = textArea.value.trim();
        if (!text) { previewDiv.style.display = 'none'; importBtn.disabled = true; return; }

        parsedRows = parseCSVText(text);
        if (!parsedRows.length) {
            previewDiv.style.display = 'none';
            importBtn.disabled = true;
            return;
        }

        const modules   = parsedRows.filter(r => r.type === 'module').length;
        const sequences = parsedRows.filter(r => ['sequence','séquence'].includes(r.type)).length;
        const seances   = parsedRows.filter(r => ['seance','séance'].includes(r.type)).length;

        previewTitle.textContent = `Aperçu — ${parsedRows.length} ligne${parsedRows.length > 1 ? 's' : ''} (${modules} module${modules > 1 ? 's' : ''}, ${sequences} séquence${sequences > 1 ? 's' : ''}, ${seances} séance${seances > 1 ? 's' : ''})`;

        const ICONS = { module: '📚', sequence: '📋', seance: '📄', séquence: '📋', séance: '📄' };
        const INDENT = { module: 0, sequence: 1, seance: 2, séquence: 1, séance: 2 };
        previewContent.innerHTML = parsedRows.map(r => {
            const indent = (INDENT[r.type] ?? 0) * 20;
            const icon   = ICONS[r.type] || '•';
            const extra  = r.duree_heures ? ` — ${r.duree_heures}h` : '';
            const type2  = r.type_seance  ? ` [${r.type_seance}]` : '';
            return `<div class="csv-preview-row" style="padding-left:${indent}px">
              <span>${icon}</span>
              <span class="csv-preview-row__titre">${esc(r.titre)}</span>
              <span class="csv-preview-row__meta">${extra}${type2}</span>
            </div>`;
        }).join('');

        previewDiv.style.display = '';
        importBtn.disabled = parsedRows.length === 0;
        resultsDiv.style.display = 'none';
    }

    previewBtn.addEventListener('click', runPreview);
    textArea.addEventListener('input', () => { importBtn.disabled = true; previewDiv.style.display = 'none'; });

    // ── Import ────────────────────────────────────────────────
    importBtn.addEventListener('click', async () => {
        if (!parsedRows.length) return;
        importBtn.disabled = true;
        importBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Import en cours…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: importBtn });

        try {
            const results = await onImport(parsedRows);
            resultsDiv.style.display = '';

            if (results.errors.length === 0) {
                resultsDiv.innerHTML = `
                <div class="clone-status-msg clone-status-msg--success">
                  ✓ ${results.success} élément${results.success > 1 ? 's' : ''} créé${results.success > 1 ? 's' : ''} avec succès !
                  La page va se recharger…
                </div>`;
                setTimeout(() => overlay.remove(), 2000);
            } else {
                resultsDiv.innerHTML = `
                <div class="clone-status-msg clone-status-msg--${results.success > 0 ? 'success' : 'error'}" style="margin-bottom:var(--space-2)">
                  ${results.success > 0 ? `✓ ${results.success} créé${results.success > 1 ? 's' : ''}` : ''} — ${results.errors.length} erreur${results.errors.length > 1 ? 's' : ''}
                </div>
                <div class="admin-table-wrap">
                  <table class="admin-table" style="font-size:var(--font-body2-size)">
                    <thead><tr><th>Ligne</th><th>Titre</th><th>Erreur</th></tr></thead>
                    <tbody>
                      ${results.errors.map(e => `
                      <tr>
                        <td>${e.ligne}</td>
                        <td>${esc(e.titre)}</td>
                        <td style="color:var(--color-error)">${esc(e.message)}</td>
                      </tr>`).join('')}
                    </tbody>
                  </table>
                </div>`;
            }

            if (results.success > 0) {
                overlay.querySelector('#csvCancelBtn').textContent = 'Fermer';
            }
        } catch (e) {
            resultsDiv.style.display = '';
            resultsDiv.innerHTML = `<div class="clone-status-msg clone-status-msg--error">Erreur : ${esc(e?.message || String(e))}</div>`;
        } finally {
            importBtn.disabled = false;
            importBtn.innerHTML = '<i data-lucide="file-up"></i> Importer';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: importBtn });
        }
    });
}

// ── Module extras (seg control CP/Transversal + bannière) ─────
function _bindModuleExtras(overlay, coursId) {
    // ── Segmented control : CP / Transversal ──────────────────
    overlay.querySelectorAll('.form-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.form-seg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const hidden = overlay.querySelector('#fEstTransversal');
            if (hidden) hidden.value = btn.dataset.val;
        });
    });
    _bindBannerExtras(overlay, coursId, 'banners/cours');
}

// ── Banner extras (upload + drag-drop + storage picker) ───────
// Partagé par modules, séquences et séances.
// @param {HTMLElement} overlay
// @param {string}      entityId  — UUID de l'entité (pour le chemin de stockage)
// @param {string}      prefix    — ex: 'banners/cours' | 'banners/sequences' | 'banners/seances'
function _bindBannerExtras(overlay, entityId, prefix = 'banners/cours') {
    const urlInput  = overlay.querySelector('#fImageUrl');
    const preview   = overlay.querySelector('#bannerPreview');
    const errEl     = overlay.querySelector('#bannerError');
    const submitBtn = overlay.querySelector('#treeFormSubmit');

    const showPreview = (url) => {
        if (!preview) return;
        if (url && (url.startsWith('http') || url.startsWith('/'))) {
            preview.innerHTML = `<img src="${_escAttr(url)}" alt="Aperçu bannière" onerror="this.parentElement.style.display='none'">`;
            preview.style.display = '';
        } else {
            preview.style.display = 'none';
        }
    };

    const showError = (msg) => {
        if (!errEl) return;
        errEl.textContent = msg;
        errEl.style.display = msg ? '' : 'none';
    };

    urlInput?.addEventListener('input', () => showPreview(urlInput.value.trim()));
    if (urlInput?.value) showPreview(urlInput.value.trim());

    // ── Upload fichier ────────────────────────────────────────
    const dz        = overlay.querySelector('#bannerDz');
    const fileInput = overlay.querySelector('#bannerFileInput');
    const progress  = overlay.querySelector('#bannerProgress');
    const progLabel = overlay.querySelector('#bannerProgressLabel');

    const startUpload = async (file) => {
        if (!file) return;
        showError('');
        const validation = validateBannerFile(file);
        if (!validation.ok) { showError(validation.error); return; }

        if (progress)  progress.style.display = '';
        if (progLabel) progLabel.textContent   = `Envoi de ${file.name}…`;
        if (submitBtn) submitBtn.disabled      = true;
        if (dz)        dz.classList.add('uploading');

        try {
            const url = await uploadBannerImage(file, entityId, prefix);
            if (urlInput) urlInput.value = url;
            showPreview(url);
        } catch (err) {
            console.error('[bannerUpload]', err);
            showError(`Erreur d'upload : ${err.message || 'vérifiez le bucket Supabase.'}`);
        } finally {
            if (progress)  progress.style.display = 'none';
            if (submitBtn) submitBtn.disabled      = false;
            if (dz)        dz.classList.remove('uploading');
        }
    };

    fileInput?.addEventListener('change', (e) => {
        startUpload(e.target.files?.[0]);
        e.target.value = '';
    });

    if (dz) {
        dz.addEventListener('dragover',  (e) => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', ()  => dz.classList.remove('dragover'));
        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dz.classList.remove('dragover');
            startUpload(e.dataTransfer.files?.[0]);
        });
        dz.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); }
        });
    }

    // ── Parcourir Supabase Storage ────────────────────────────
    overlay.querySelector('#bannerBrowseBtn')?.addEventListener('click', () => {
        _openStoragePicker((selectedUrl) => {
            if (urlInput) urlInput.value = selectedUrl;
            showPreview(selectedUrl);
            showError('');
        });
    });
}

// ── Storage picker ────────────────────────────────────────────
function _openStoragePicker(onSelect) {
    // Fermer un picker déjà ouvert
    document.getElementById('lms-storage-picker')?.remove();

    const picker = document.createElement('div');
    picker.id        = 'lms-storage-picker';
    picker.className = 'sp-overlay';
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');
    picker.setAttribute('aria-label', 'Choisir une image depuis Supabase Storage');

    picker.innerHTML = `
    <div class="sp-modal">
      <div class="sp-header">
        <div class="sp-header__left">
          <i data-lucide="database" aria-hidden="true"></i>
          <span>Supabase Storage</span>
          <span class="sp-bucket-badge">${BANNER_BUCKET}</span>
        </div>
        <button class="btn-icon sp-close" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="sp-search-bar">
        <i data-lucide="search" aria-hidden="true"></i>
        <input type="search" id="spSearch" class="sp-search-input" placeholder="Filtrer les images…" autocomplete="off">
        <span id="spCount" class="sp-count"></span>
      </div>
      <div class="sp-grid" id="spGrid">
        <div class="sp-loading">
          <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
          <span>Chargement du bucket…</span>
        </div>
      </div>
    </div>`;

    document.body.appendChild(picker);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: picker });

    const close = () => {
        picker.classList.add('sp-overlay--closing');
        setTimeout(() => picker.remove(), 180);
    };

    picker.querySelector('.sp-close')?.addEventListener('click', close);
    picker.addEventListener('click', e => { if (e.target === picker) close(); });
    document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });

    // ── Charger les images ────────────────────────────────────
    listBannerImages()
        .then(images => {
            const grid    = picker.querySelector('#spGrid');
            const countEl = picker.querySelector('#spCount');
            const search  = picker.querySelector('#spSearch');

            const renderItems = (items) => {
                if (!items.length) {
                    grid.innerHTML = `
                    <div class="sp-empty">
                      <i data-lucide="image-off" aria-hidden="true"></i>
                      <p>Aucune image trouvée.</p>
                      <small>Uploadez d'abord une image via la zone de dépôt.</small>
                    </div>`;
                    if (typeof lucide !== 'undefined') lucide.createIcons({ root: grid });
                    return;
                }

                if (countEl) countEl.textContent = `${items.length} image${items.length > 1 ? 's' : ''}`;

                grid.innerHTML = items.map(img => {
                    const label = img.name.replace(/^\d+_/, '').replace(/\.[^.]+$/, '');
                    const size  = img.size > 0
                        ? (img.size < 1024 * 1024
                            ? `${Math.round(img.size / 1024)} Ko`
                            : `${(img.size / 1024 / 1024).toFixed(1)} Mo`)
                        : '';
                    return `
                    <button type="button" class="sp-item" data-url="${_escAttr(img.url)}" title="${_escAttr(img.name)}">
                      <div class="sp-item__img-wrap">
                        <img src="${_escAttr(img.url)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('sp-item__img-wrap--error')">
                        <div class="sp-item__check"><i data-lucide="check" aria-hidden="true"></i></div>
                      </div>
                      <div class="sp-item__info">
                        <span class="sp-item__name">${_esc(label)}</span>
                        ${size ? `<span class="sp-item__size">${size}</span>` : ''}
                      </div>
                    </button>`;
                }).join('');

                if (typeof lucide !== 'undefined') lucide.createIcons({ root: grid });

                grid.querySelectorAll('.sp-item').forEach(btn => {
                    btn.addEventListener('click', () => {
                        onSelect(btn.dataset.url);
                        close();
                    });
                });
            };

            renderItems(images);

            // Filtre live
            search?.addEventListener('input', () => {
                const q = search.value.toLowerCase().trim();
                renderItems(q ? images.filter(img => img.name.toLowerCase().includes(q)) : images);
            });
            search?.focus();
        })
        .catch(err => {
            const grid = picker.querySelector('#spGrid');
            grid.innerHTML = `
            <div class="sp-empty sp-empty--error">
              <i data-lucide="alert-triangle" aria-hidden="true"></i>
              <p>${_esc(err.message)}</p>
              <small>Vérifiez que le bucket "<strong>${BANNER_BUCKET}</strong>" existe et est <strong>Public</strong>.</small>
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: grid });
        });
}

function _escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
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
