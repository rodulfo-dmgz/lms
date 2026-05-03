/**
 * titresProView.js — Admin : Titres Professionnels (RNCP)
 * Liste + Formulaire modal + Gestion des documents (bucket titre_pro)
 */

const NIV_LABELS = {
    1:'Niv. 1', 2:'Niv. 2', 3:'Niv. 3', 4:'Niv. 4',
    5:'Niv. 5', 6:'Niv. 6 (Bac+3)', 7:'Niv. 7 (Bac+5)', 8:'Niv. 8 (Doctorat)',
};

const DOC_TYPES = {
    reac:        { label: 'REAC',                    icon: 'file-text',   color: 'primary'   },
    referentiel: { label: "Référentiel d'évaluation", icon: 'clipboard',   color: 'secondary' },
    dp_modele:   { label: 'Modèle Dossier Pro',      icon: 'folder-open', color: 'accent'    },
    grille_ecf:  { label: 'Grille ECF',              icon: 'pen-tool',    color: 'primary'   },
    annexe:      { label: 'Annexe',                  icon: 'paperclip',   color: 'secondary' },
    autre:       { label: 'Autre',                   icon: 'file',        color: 'secondary' },
};

// ─── Liste des titres professionnels ──────────────────────────
export function renderTitresProList(container, { titresPro, docsMap = {}, onCreate, onEdit, onDelete, onManageDocs }) {
    container.innerHTML = `
    <div class="page-admin">

      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">
            <i data-lucide="award" aria-hidden="true"></i>
            Titres Professionnels (RNCP)
          </h1>
          <p class="admin-page-sub">
            ${titresPro.length} titre${titresPro.length !== 1 ? 's' : ''} enregistré${titresPro.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style="display:flex;gap:var(--space-3)">
          <a href="https://travail-emploi.gouv.fr/les-titres-professionnels"
             target="_blank" rel="noopener noreferrer"
             class="btn btn-ghost" title="Site officiel Ministère du Travail">
            <i data-lucide="external-link" aria-hidden="true"></i> Référentiel officiel
          </a>
          <button class="btn btn-cta" id="btnNewTitre">
            <i data-lucide="plus" aria-hidden="true"></i> Nouveau titre
          </button>
        </div>
      </div>

      ${titresPro.length === 0 ? `
      <div class="admin-empty">
        <i data-lucide="award" aria-hidden="true"></i>
        <p>Aucun titre professionnel. Créez votre premier titre pour commencer.</p>
      </div>` : `
      <div class="admin-section">
        <div class="table-wrapper">
          <table class="table" aria-label="Titres professionnels">
            <thead>
              <tr>
                <th>Code RNCP</th>
                <th>Sigle</th>
                <th>Intitulé</th>
                <th>Niveau</th>
                <th>Secteur</th>
                <th>Date effet</th>
                <th>Documents</th>
                <th style="width:120px"></th>
              </tr>
            </thead>
            <tbody>
              ${titresPro.map(t => {
                  const nbDocs = docsMap[t.id]?.length || 0;
                  return `
                  <tr>
                    <td>
                      <span class="text-mono font-medium">${esc(t.code_rncp)}</span>
                      ${t.url_reac ? `
                      <a href="${escAttr(t.url_reac)}" target="_blank" rel="noopener noreferrer"
                         class="table-ext-link" title="Voir le REAC officiel">
                        <i data-lucide="external-link" aria-hidden="true"></i>
                      </a>` : ''}
                    </td>
                    <td>
                      ${t.sigle
                        ? `<span class="badge badge-primary">${esc(t.sigle)}</span>`
                        : '<span class="text-muted">—</span>'}
                    </td>
                    <td class="text-sm">${esc(t.intitule)}</td>
                    <td>
                      ${t.niveau
                        ? `<span class="badge badge-outline">${NIV_LABELS[t.niveau] || `Niv. ${t.niveau}`}</span>`
                        : '<span class="text-muted">—</span>'}
                    </td>
                    <td class="text-sm text-muted">${esc(t.secteur_activite || '—')}</td>
                    <td class="text-mono text-sm">
                      ${t.date_effet ? new Date(t.date_effet).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td>
                      <button class="btn-docs-count" data-id="${t.id}" title="Gérer les documents">
                        <i data-lucide="file-text" aria-hidden="true"></i>
                        <span>${nbDocs}</span>
                      </button>
                    </td>
                    <td class="table-actions">
                      <button class="btn-icon btn-icon--secondary" data-id="${t.id}" title="Gérer les documents">
                        <i data-lucide="folder-open" aria-hidden="true"></i>
                      </button>
                      <a href="#/admin/titres-pro/${t.id}/referentiel"
                         class="btn-icon btn-icon--referentiel"
                         title="Gérer le référentiel CCP / AT / CP">
                        <i data-lucide="list-tree" aria-hidden="true"></i>
                      </a>
                      <button class="btn-icon btn-icon--edit" data-id="${t.id}" title="Modifier">
                        <i data-lucide="pencil" aria-hidden="true"></i>
                      </button>
                      <button class="btn-icon btn-icon--delete"
                              data-id="${t.id}"
                              data-label="${esc(t.code_rncp)} — ${esc(t.intitule)}"
                              title="Supprimer">
                        <i data-lucide="trash-2" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`}

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Nouveau titre ────────────────────────────────────────
    container.querySelector('#btnNewTitre')?.addEventListener('click', () => {
        showTitreModal(container, null, onCreate);
    });

    // ── Éditer ───────────────────────────────────────────────
    container.querySelectorAll('.btn-icon--edit').forEach(btn => {
        const t = titresPro.find(x => x.id === btn.dataset.id);
        if (t) btn.addEventListener('click', () => showTitreModal(container, t, (data) => onEdit(t.id, data)));
    });

    // ── Supprimer ────────────────────────────────────────────
    container.querySelectorAll('.btn-icon--delete').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm(`Supprimer "${btn.dataset.label}" ?\nLes documents associés seront également supprimés.`)) return;
            onDelete(btn.dataset.id);
        });
    });

    // ── Documents (bouton folder + bouton count) ─────────────
    const openDocs = id => {
        const t = titresPro.find(x => x.id === id);
        if (t) onManageDocs(t, docsMap[id] || []);
    };
    container.querySelectorAll('.btn-icon--secondary').forEach(btn => {
        btn.addEventListener('click', () => openDocs(btn.dataset.id));
    });
    container.querySelectorAll('.btn-docs-count').forEach(btn => {
        btn.addEventListener('click', () => openDocs(btn.dataset.id));
    });
}

// ─── Modal : Infos titre professionnel ────────────────────────
function showTitreModal(container, titre, onConfirm) {
    const isEdit = !!titre;
    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal tree-modal--lg">
      <div class="tree-modal-header">
        <h3><i data-lucide="award" aria-hidden="true"></i> ${isEdit ? 'Modifier le titre' : 'Nouveau titre professionnel'}</h3>
        <button class="tree-modal-close btn-icon" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="tree-modal-body">

        <!-- Identification -->
        <div class="admin-section-header" style="margin-bottom:var(--space-3)">
          <span class="admin-section-header__title">Identification RNCP</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label--required">Code RNCP</label>
            <input type="text" id="tpRncp" class="form-input" value="${esc(titre?.code_rncp || '')}"
                   placeholder="Ex: RNCP37576" autofocus required>
          </div>
          <div class="form-group">
            <label class="form-label">Sigle</label>
            <input type="text" id="tpSigle" class="form-input" value="${esc(titre?.sigle || '')}"
                   placeholder="Ex: AD, ACOM, ARH…">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label form-label--required">Intitulé complet</label>
          <input type="text" id="tpIntitule" class="form-input" value="${esc(titre?.intitule || '')}"
                 placeholder="Ex: Titre Professionnel Assistant de Direction" required>
        </div>

        <!-- Classification -->
        <div class="admin-section-header" style="margin:var(--space-5) 0 var(--space-3)">
          <span class="admin-section-header__title">Classification</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Niveau (EQF/RNCP)</label>
            <select id="tpNiveau" class="form-input">
              <option value="">— Non renseigné —</option>
              ${Object.entries(NIV_LABELS).map(([v, l]) =>
                `<option value="${v}"${titre?.niveau == v ? ' selected' : ''}>${l}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Secteur d'activité</label>
            <input type="text" id="tpSecteur" class="form-input" value="${esc(titre?.secteur_activite || '')}"
                   placeholder="Ex: Commerce, Services aux entreprises">
          </div>
        </div>

        <!-- Dates -->
        <div class="admin-section-header" style="margin:var(--space-5) 0 var(--space-3)">
          <span class="admin-section-header__title">Dates officielles</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Publication JO</label>
            <input type="date" id="tpDateJO" class="form-input" value="${titre?.date_publication_jo || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Date d'effet</label>
            <input type="date" id="tpDateEffet" class="form-input" value="${titre?.date_effet || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Révision prévue</label>
            <input type="date" id="tpDateRev" class="form-input" value="${titre?.date_previsionnelle_revision || ''}">
          </div>
        </div>

        <!-- Liens -->
        <div class="admin-section-header" style="margin:var(--space-5) 0 var(--space-3)">
          <span class="admin-section-header__title">Liens officiels</span>
        </div>
        <div class="form-group">
          <label class="form-label">URL REAC officiel (AFPA)</label>
          <div style="display:flex;gap:var(--space-2)">
            <input type="url" id="tpUrlReac" class="form-input" value="${esc(titre?.url_reac || '')}"
                   placeholder="https://www.banque.di.afpa.fr/…" style="flex:1">
            ${titre?.url_reac ? `
            <a href="${escAttr(titre.url_reac)}" target="_blank" rel="noopener noreferrer"
               class="btn btn-ghost btn-sm" title="Vérifier le lien">
              <i data-lucide="external-link" aria-hidden="true"></i>
            </a>` : ''}
          </div>
          <span class="form-hint">
            Cherchez sur
            <a href="https://www.banque.di.afpa.fr/EspaceEmployeursCandidatsActeurs/EGPRecherche.aspx"
               target="_blank" rel="noopener noreferrer" class="form-hint-link">banque.di.afpa.fr</a>
            puis collez l'URL ici.
          </span>
        </div>

      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Annuler</button>
        <button class="btn btn-cta" id="tpConfirmBtn">
          <i data-lucide="${isEdit ? 'save' : 'plus'}" aria-hidden="true"></i>
          ${isEdit ? 'Enregistrer' : 'Créer le titre'}
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const close = () => overlay.remove();
    overlay.querySelectorAll('.tree-modal-close').forEach(b => b.addEventListener('click', close));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const onEsc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);

    overlay.querySelector('#tpConfirmBtn')?.addEventListener('click', async () => {
        const code_rncp = overlay.querySelector('#tpRncp')?.value.trim();
        const intitule  = overlay.querySelector('#tpIntitule')?.value.trim();
        if (!code_rncp) { overlay.querySelector('#tpRncp').focus(); return; }
        if (!intitule)  { overlay.querySelector('#tpIntitule').focus(); return; }

        const btn = overlay.querySelector('#tpConfirmBtn');
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        await onConfirm({
            code_rncp,
            sigle:                        overlay.querySelector('#tpSigle')?.value.trim()   || null,
            intitule,
            niveau:                       overlay.querySelector('#tpNiveau')?.value          || null,
            secteur_activite:             overlay.querySelector('#tpSecteur')?.value.trim()  || null,
            date_publication_jo:          overlay.querySelector('#tpDateJO')?.value          || null,
            date_effet:                   overlay.querySelector('#tpDateEffet')?.value        || null,
            date_previsionnelle_revision: overlay.querySelector('#tpDateRev')?.value          || null,
            url_reac:                     overlay.querySelector('#tpUrlReac')?.value.trim()  || null,
        });
        close();
    });
}

// ─── Modal : Gestion des documents ────────────────────────────
export function showDocumentsModal(titre, docs, { onUpload, onDelete, onSync }) {
    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal tree-modal--xl">
      <div class="tree-modal-header">
        <h3>
          <i data-lucide="folder-open" aria-hidden="true"></i>
          Documents — ${esc(titre.sigle || titre.code_rncp)} · ${esc(titre.intitule)}
        </h3>
        <button class="tree-modal-close btn-icon" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="tree-modal-body">

        <!-- Explication bucket -->
        <div class="tp-notice tp-notice--info" style="margin-bottom:var(--space-5)">
          <i data-lucide="info" aria-hidden="true"></i>
          <div>
            Les fichiers sont stockés dans le bucket Supabase <code>titre_pro</code> →
            dossier <strong>${esc(titre.sigle || titre.code_rncp)}/</strong>.
            Les stagiaires rattachés à ce titre peuvent les consulter.
          </div>
        </div>

        <!-- Barre d'outils documents -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-3);flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text-muted)">
            <strong>${docs.length}</strong> document${docs.length !== 1 ? 's' : ''} enregistré${docs.length !== 1 ? 's' : ''}
          </span>
          ${onSync ? `
          <button class="btn btn-ghost btn-sm" id="btnSyncStorage" title="Détecter et enregistrer les fichiers déjà présents dans le bucket Supabase">
            <i data-lucide="refresh-cw" aria-hidden="true"></i>
            Synchroniser depuis Storage
          </button>` : ''}
        </div>

        <!-- Liste des documents existants -->
        <div id="tp-docs-list">
          ${buildDocsList(docs)}
        </div>

        <!-- Formulaire upload -->
        <div class="admin-section" style="margin-top:var(--space-5)">
          <div class="admin-section-header">
            <span class="admin-section-header__title">Ajouter un document</span>
          </div>
          <div class="admin-section-body">
            <div class="form-grid form-grid--3">
              <div class="form-group">
                <label class="form-label form-label--required">Type de document</label>
                <select id="docType" class="form-input">
                  ${Object.entries(DOC_TYPES).map(([v, d]) =>
                    `<option value="${v}">${d.label}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label form-label--required">Nom affiché</label>
                <input type="text" id="docNom" class="form-input"
                       placeholder="Ex: REAC TP AD Octobre 2024">
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <input type="text" id="docDesc" class="form-input"
                       placeholder="Optionnel — précision ou contexte">
              </div>
            </div>
            <div class="form-group" style="margin-top:var(--space-3)">
              <label class="form-label form-label--required">Fichier PDF</label>
              <div class="tp-file-drop" id="docFileDrop">
                <input type="file" id="docFile" accept=".pdf,.doc,.docx,.pptx"
                       style="position:absolute;opacity:0;inset:0;cursor:pointer;width:100%;height:100%">
                <i data-lucide="upload-cloud" aria-hidden="true"></i>
                <span class="tp-file-drop__text">
                  Glissez votre fichier ici ou <strong>parcourir</strong>
                </span>
                <span class="tp-file-drop__hint">PDF, DOC, DOCX, PPTX — max 20 Mo</span>
                <span class="tp-file-drop__name" id="docFileName" style="display:none"></span>
              </div>
            </div>
            <div class="form-actions" style="margin-top:var(--space-4)">
              <button class="btn btn-cta" id="btnUploadDoc">
                <i data-lucide="upload" aria-hidden="true"></i> Uploader le document
              </button>
            </div>
          </div>
        </div>

      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Fermer</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const close = () => overlay.remove();
    overlay.querySelectorAll('.tree-modal-close').forEach(b => b.addEventListener('click', close));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const onEsc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);

    // ── Synchroniser depuis Storage ──────────────────────────
    overlay.querySelector('#btnSyncStorage')?.addEventListener('click', async () => {
        const btn = overlay.querySelector('#btnSyncStorage');
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Scan en cours…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        try {
            const result = await onSync(titre);
            if (!result) return;

            const msg = result.added === 0
                ? `Aucun nouveau fichier trouvé (${result.skipped} déjà enregistré${result.skipped !== 1 ? 's' : ''}).`
                : `✅ ${result.added} fichier${result.added !== 1 ? 's' : ''} enregistré${result.added !== 1 ? 's' : ''} !${result.skipped ? ` (${result.skipped} déjà présent${result.skipped !== 1 ? 's' : ''})` : ''}${result.errors.length ? `\n⚠️ ${result.errors.length} erreur(s).` : ''}`;

            alert(msg);
            // onSync appelle refresh() côté controller → la page se recharge
        } finally {
            btn.disabled  = false;
            btn.innerHTML = '<i data-lucide="refresh-cw" aria-hidden="true"></i> Synchroniser depuis Storage';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
    });

    // ── Affichage du nom de fichier sélectionné ─────────────
    overlay.querySelector('#docFile')?.addEventListener('change', (e) => {
        const file     = e.target.files[0];
        const nameEl   = overlay.querySelector('#docFileName');
        const dropZone = overlay.querySelector('#docFileDrop');
        if (file && nameEl) {
            nameEl.textContent = `📄 ${file.name} (${formatSize(file.size)})`;
            nameEl.style.display = 'block';
            dropZone?.classList.add('tp-file-drop--has-file');
        }
    });

    // ── Upload ───────────────────────────────────────────────
    overlay.querySelector('#btnUploadDoc')?.addEventListener('click', async () => {
        const file    = overlay.querySelector('#docFile')?.files[0];
        const type    = overlay.querySelector('#docType')?.value;
        const nom     = overlay.querySelector('#docNom')?.value.trim();
        const desc    = overlay.querySelector('#docDesc')?.value.trim();

        if (!file)  { overlay.querySelector('#docFile').click(); return; }
        if (!nom)   { overlay.querySelector('#docNom').focus(); return; }

        const btn = overlay.querySelector('#btnUploadDoc');
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Upload en cours…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        try {
            const newDoc = await onUpload(titre, file, { type, nom, description: desc || null });
            if (newDoc) {
                docs = [...docs, newDoc];
                overlay.querySelector('#tp-docs-list').innerHTML = buildDocsList(docs);
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay.querySelector('#tp-docs-list') });
                // Reset form
                overlay.querySelector('#docFile').value     = '';
                overlay.querySelector('#docNom').value      = '';
                overlay.querySelector('#docDesc').value     = '';
                overlay.querySelector('#docFileName').style.display = 'none';
                overlay.querySelector('#docFileDrop')?.classList.remove('tp-file-drop--has-file');
            }
        } finally {
            btn.disabled  = false;
            btn.innerHTML = '<i data-lucide="upload" aria-hidden="true"></i> Uploader le document';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
    });

    // ── Supprimer un document ────────────────────────────────
    overlay.querySelector('#tp-docs-list')?.addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.btn-icon--delete');
        if (!delBtn) return;
        const docId  = delBtn.dataset.docId;
        const path   = delBtn.dataset.path;
        if (!confirm('Supprimer ce document ? Cette action est irréversible.')) return;

        delBtn.disabled = true;
        await onDelete(docId, path);
        docs = docs.filter(d => d.id !== docId);
        overlay.querySelector('#tp-docs-list').innerHTML = buildDocsList(docs);
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay.querySelector('#tp-docs-list') });
    });
}

function buildDocsList(docs) {
    if (!docs.length) return `
    <div class="admin-empty" style="padding: var(--space-5) 0">
      <i data-lucide="folder" aria-hidden="true"></i>
      <p>Aucun document pour ce titre. Utilisez le formulaire ci-dessous pour en ajouter.</p>
    </div>`;

    return `
    <div class="tp-docs-list">
      ${docs.map(d => {
          const dt = DOC_TYPES[d.type] || DOC_TYPES.autre;
          return `
          <div class="tp-doc-row">
            <div class="tp-doc-row__icon tp-doc-row__icon--${dt.color}">
              <i data-lucide="${dt.icon}" aria-hidden="true"></i>
            </div>
            <div class="tp-doc-row__body">
              <div class="tp-doc-row__name">${esc(d.nom)}</div>
              <div class="tp-doc-row__meta">
                <span class="badge badge-outline">${esc(dt.label)}</span>
                ${d.description ? `<span class="text-muted text-sm">${esc(d.description)}</span>` : ''}
                ${d.file_size ? `<span class="text-mono text-xs text-muted">${formatSize(d.file_size)}</span>` : ''}
              </div>
            </div>
            <div class="tp-doc-row__actions">
              ${d.url_public
                ? `<a href="${escAttr(d.url_public)}" target="_blank" rel="noopener noreferrer"
                      class="btn-icon" title="Télécharger / Voir">
                     <i data-lucide="download" aria-hidden="true"></i>
                   </a>`
                : ''}
              <button class="btn-icon btn-icon--delete"
                      data-doc-id="${d.id}"
                      data-path="${escAttr(d.storage_path)}"
                      title="Supprimer">
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
