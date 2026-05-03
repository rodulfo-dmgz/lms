/**
 * referentielView.js — Admin : Référentiel AT / CP
 *
 * Structure visible : AT → CP  (2 niveaux, comme dans le REAC officiel)
 * Structure DB       : lms_certificats_ccp (= AT) → lms_activites (auto) → lms_competences (= CP)
 *
 * Le niveau "lms_activites" est transparent pour l'utilisateur :
 * il est créé automatiquement lors du premier ajout de CP sur un AT.
 */

// ─── Rendu principal ──────────────────────────────────────────
export function renderReferentiel(container, {
    titre,
    referentiel  = [],   // [{id, code, intitule, ordre, competences:[...]}]
    onAddAT,    onEditAT,    onDeleteAT,
    onAddCP,    onEditCP,    onDeleteCP,
    onImportCSV,
}) {
    const totalCP = referentiel.reduce((s, at) => s + (at.competences?.length || 0), 0);

    container.innerHTML = `
    <div class="page-admin">

      <nav class="page-breadcrumb" aria-label="Fil d'ariane">
        <a href="#/admin" class="page-breadcrumb__link">Admin</a>
        <i data-lucide="chevron-right" aria-hidden="true"></i>
        <a href="#/admin/titres-pro" class="page-breadcrumb__link">Titres Pro</a>
        <i data-lucide="chevron-right" aria-hidden="true"></i>
        <span class="page-breadcrumb__current">
          ${esc(titre?.sigle || titre?.code_rncp || 'Référentiel')}
        </span>
      </nav>

      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">
            <i data-lucide="list-tree" aria-hidden="true"></i>
            Référentiel — Activités Types &amp; Compétences
          </h1>
          <p class="admin-page-sub">
            ${esc(titre?.intitule || '')}
            &ensp;·&ensp;
            <strong>${referentiel.length}</strong> AT
            &ensp;·&ensp;
            <strong>${totalCP}</strong> CP
          </p>
        </div>
        <div class="ref-header-actions">
          <a href="#/admin/titres-pro" class="btn btn-ghost">
            <i data-lucide="arrow-left" aria-hidden="true"></i> Retour
          </a>
          <button class="btn btn-secondary" id="btnImportCSV">
            <i data-lucide="upload" aria-hidden="true"></i> Importer CSV
          </button>
          <button class="btn btn-cta" id="btnAddAT">
            <i data-lucide="plus" aria-hidden="true"></i> Ajouter une AT
          </button>
        </div>
      </div>

      <!-- Guide CSV dépliable -->
      <details class="ref-csv-hint">
        <summary>
          <i data-lucide="file-spreadsheet" aria-hidden="true"></i>
          Format du fichier CSV
        </summary>
        <div class="ref-csv-hint__body">
          <p>Encodage <strong>UTF-8</strong>, séparateur <code>,</code>. Chaque ligne = 1 compétence.</p>
          <div class="ref-csv-hint__grid">
            <div>
              <div class="ref-csv-hint__section-label ref-csv-hint__section-label--required">Obligatoires</div>
              <div class="ref-csv-hint__cols">
                <code>code_at</code>
                <code>intitule_at</code>
                <code>intitule_cp</code>
              </div>
            </div>
            <div>
              <div class="ref-csv-hint__section-label">Optionnels</div>
              <div class="ref-csv-hint__cols">
                <code>ordre_at</code>
                <code>description_cp</code>
                <code>ordre_cp</code>
                <code>criteres_cp</code>
              </div>
            </div>
          </div>
          <div class="ref-csv-hint__note">
            <strong>criteres_cp</strong> : plusieurs critères séparés par <code>|</code>
            &nbsp;→&nbsp; <code>Les délais sont tenus|La qualité est conforme</code>
          </div>
          <div class="ref-csv-hint__example">
            <div class="ref-csv-hint__example-label">Exemple</div>
            <code>AT1,"Assurer les fonctions de support admin.",1,"Organiser les activités de l'équipe","Description…",1,"Critère 1|Critère 2"</code>
          </div>
        </div>
      </details>

      <!-- État vide -->
      ${referentiel.length === 0 ? `
      <div class="ref-empty-state">
        <div class="ref-empty-state__icon">
          <i data-lucide="clipboard-list" aria-hidden="true"></i>
        </div>
        <h3 class="ref-empty-state__title">Aucune Activité Type renseignée</h3>
        <p class="ref-empty-state__sub">
          Ajoutez les AT manuellement ou importez un fichier CSV depuis le REAC officiel.
        </p>
        <div style="display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap">
          <button class="btn btn-secondary" id="btnImportCSVEmpty">
            <i data-lucide="upload" aria-hidden="true"></i> Importer CSV
          </button>
          <button class="btn btn-cta" id="btnAddATEmpty">
            <i data-lucide="plus" aria-hidden="true"></i> Ajouter la première AT
          </button>
        </div>
      </div>` : ''}

      <!-- Arbre AT → CP -->
      ${referentiel.length ? `
      <div class="ref-tree">
        ${referentiel.map((at, idx) => buildATCard(at, idx)).join('')}
      </div>` : ''}

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Boutons globaux ──────────────────────────────────────
    container.querySelector('#btnAddAT')
        ?.addEventListener('click', () => openATModal(null, onAddAT));
    container.querySelector('#btnAddATEmpty')
        ?.addEventListener('click', () => openATModal(null, onAddAT));
    container.querySelector('#btnImportCSV')
        ?.addEventListener('click', () => openCSVModal(onImportCSV));
    container.querySelector('#btnImportCSVEmpty')
        ?.addEventListener('click', () => openCSVModal(onImportCSV));

    // ── AT : modifier / supprimer ────────────────────────────
    container.querySelectorAll('.js-edit-at').forEach(btn => {
        const at = referentiel.find(a => a.id === btn.dataset.id);
        if (at) btn.addEventListener('click', () =>
            openATModal(at, data => onEditAT(at.id, data)));
    });
    container.querySelectorAll('.js-delete-at').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm(`Supprimer l'AT "${btn.dataset.label}" ?\nToutes les compétences associées seront supprimées.`))
                return;
            onDeleteAT(btn.dataset.id);
        });
    });

    // ── CP : ajouter / modifier / supprimer ──────────────────
    container.querySelectorAll('.js-add-cp').forEach(btn => {
        btn.addEventListener('click', () =>
            openCPModal(null, data => onAddCP(btn.dataset.atId, data)));
    });
    container.querySelectorAll('.js-edit-cp').forEach(btn => {
        let found = null;
        for (const at of referentiel) {
            found = (at.competences || []).find(c => c.id === btn.dataset.id);
            if (found) break;
        }
        if (found) btn.addEventListener('click', () =>
            openCPModal(found, data => onEditCP(found.id, data)));
    });
    container.querySelectorAll('.js-delete-cp').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm(`Supprimer la compétence "${btn.dataset.label}" ?`)) return;
            onDeleteCP(btn.dataset.id);
        });
    });
}

// ─── Carte AT (avec ses CP inline) ───────────────────────────
function buildATCard(at, idx) {
    const cps = (at.competences || []);
    return `
    <div class="ref-at-card" id="ref-at-${at.id}">

      <div class="ref-at-card__header">
        <div class="ref-at-card__num">${idx + 1}</div>
        <div class="ref-at-card__info">
          <div class="ref-at-card__badge">AT — ${esc(at.code)}</div>
          <div class="ref-at-card__title">${esc(at.intitule)}</div>
        </div>
        <div class="ref-at-card__actions">
          <span class="ref-at-card__count">${cps.length} CP</span>
          <button class="ref-btn-add js-add-cp" data-at-id="${at.id}"
                  title="Ajouter une Compétence Professionnelle">
            <i data-lucide="plus" aria-hidden="true"></i>
            Ajouter une CP
          </button>
          <button class="btn-icon btn-icon--edit js-edit-at"
                  data-id="${at.id}" title="Modifier cette AT">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="btn-icon btn-icon--delete js-delete-at"
                  data-id="${at.id}"
                  data-label="${esc(at.code)} — ${esc(at.intitule)}"
                  title="Supprimer cette AT et toutes ses CP">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="ref-at-card__body">
        ${cps.length ? `
        <div class="ref-cp-list">
          ${cps.map((cp, cpIdx) => buildCPRow(cp, cpIdx)).join('')}
        </div>` : `
        <div class="ref-cp-empty">
          <i data-lucide="info" aria-hidden="true"></i>
          Aucune compétence — cliquez sur "Ajouter une CP" pour commencer.
        </div>`}
      </div>

    </div>`;
}

// ─── Ligne CP ────────────────────────────────────────────────
function buildCPRow(cp, idx) {
    const criteres = cp.criteres_performance || [];
    return `
    <div class="ref-cp-row" id="ref-cp-${cp.id}">
      <div class="ref-cp-row__index">${idx + 1}</div>
      <div class="ref-cp-row__body">
        <div class="ref-cp-row__title">${esc(cp.intitule)}</div>
        ${cp.description_processus
            ? `<div class="ref-cp-row__desc">${esc(cp.description_processus)}</div>`
            : ''}
        ${criteres.length ? `
        <div class="ref-cp-row__criteres">
          ${criteres.map(c =>
              `<span class="ref-cp-row__critere">
                <i data-lucide="check" aria-hidden="true"></i>${esc(c)}
              </span>`
          ).join('')}
        </div>` : ''}
      </div>
      <div class="ref-cp-row__actions">
        <button class="btn-icon btn-icon--edit js-edit-cp"
                data-id="${cp.id}" title="Modifier">
          <i data-lucide="pencil" aria-hidden="true"></i>
        </button>
        <button class="btn-icon btn-icon--delete js-delete-cp"
                data-id="${cp.id}"
                data-label="${esc(cp.intitule)}"
                title="Supprimer">
          <i data-lucide="trash-2" aria-hidden="true"></i>
        </button>
      </div>
    </div>`;
}

// ─── Modal AT ────────────────────────────────────────────────
function openATModal(at, onConfirm) {
    const isEdit = !!at;
    const m = createModal({
        icon:  'briefcase',
        title: isEdit ? 'Modifier l\'Activité Type' : 'Nouvelle Activité Type',
        size:  'md',
        body: `
        <div class="ref-modal-field">
          <label class="ref-modal-label ref-modal-label--required" for="m-at-code">
            Code AT <span class="ref-modal-hint">ex : AT1, AT2…</span>
          </label>
          <input id="m-at-code" class="ref-modal-input" type="text"
                 maxlength="20" placeholder="AT1"
                 value="${esc(at?.code || '')}">
        </div>
        <div class="ref-modal-field">
          <label class="ref-modal-label ref-modal-label--required" for="m-at-intitule">
            Intitulé de l'Activité Type
          </label>
          <input id="m-at-intitule" class="ref-modal-input" type="text"
                 placeholder="Assurer les fonctions de support administratif…"
                 value="${esc(at?.intitule || '')}">
        </div>
        <div class="ref-modal-field ref-modal-field--sm">
          <label class="ref-modal-label" for="m-at-ordre">Ordre d'affichage</label>
          <input id="m-at-ordre" class="ref-modal-input" type="number"
                 min="0" step="1" value="${at?.ordre ?? 0}">
        </div>`,
        confirmLabel: isEdit ? 'Enregistrer' : 'Créer l\'AT',
        confirmIcon:  isEdit ? 'check' : 'plus',
    });

    m.overlay.querySelector('#m-at-code').focus();

    m.onConfirm = () => {
        const code     = m.overlay.querySelector('#m-at-code').value.trim().toUpperCase();
        const intitule = m.overlay.querySelector('#m-at-intitule').value.trim();
        const ordre    = parseInt(m.overlay.querySelector('#m-at-ordre').value || '0', 10);
        if (!code)     { highlight(m.overlay, '#m-at-code');     return false; }
        if (!intitule) { highlight(m.overlay, '#m-at-intitule'); return false; }
        onConfirm({ code, intitule, ordre });
        return true;
    };
}

// ─── Modal CP ────────────────────────────────────────────────
function openCPModal(cp, onConfirm) {
    const isEdit = !!cp;
    const criteresText = (cp?.criteres_performance || []).join('\n');
    const m = createModal({
        icon:  'check-square',
        title: isEdit ? 'Modifier la Compétence' : 'Nouvelle Compétence Professionnelle',
        size:  'lg',
        body: `
        <div class="ref-modal-field">
          <label class="ref-modal-label ref-modal-label--required" for="m-cp-intitule">
            Intitulé de la compétence
          </label>
          <input id="m-cp-intitule" class="ref-modal-input" type="text"
                 placeholder="Organiser et suivre les activités de l'équipe de direction…"
                 value="${esc(cp?.intitule || '')}">
        </div>
        <div class="ref-modal-field">
          <label class="ref-modal-label" for="m-cp-desc">
            Description du processus
            <span class="ref-modal-hint">optionnel</span>
          </label>
          <textarea id="m-cp-desc" class="ref-modal-textarea" rows="3"
                    placeholder="Comment cette compétence est mise en œuvre dans un contexte professionnel…">${esc(cp?.description_processus || '')}</textarea>
        </div>
        <div class="ref-modal-field">
          <label class="ref-modal-label" for="m-cp-criteres">
            Critères de performance
            <span class="ref-modal-hint">un par ligne — optionnel</span>
          </label>
          <textarea id="m-cp-criteres" class="ref-modal-textarea" rows="4"
                    placeholder="L'agenda est tenu à jour en temps réel&#10;Les conflits de planning sont anticipés&#10;Les priorités du manager sont respectées">${esc(criteresText)}</textarea>
        </div>
        <div class="ref-modal-field ref-modal-field--sm">
          <label class="ref-modal-label" for="m-cp-ordre">Ordre</label>
          <input id="m-cp-ordre" class="ref-modal-input" type="number"
                 min="0" step="1" value="${cp?.ordre ?? 0}">
        </div>`,
        confirmLabel: isEdit ? 'Enregistrer' : 'Créer la CP',
        confirmIcon:  isEdit ? 'check' : 'plus',
    });

    m.overlay.querySelector('#m-cp-intitule').focus();

    m.onConfirm = () => {
        const intitule              = m.overlay.querySelector('#m-cp-intitule').value.trim();
        const description_processus = m.overlay.querySelector('#m-cp-desc').value.trim() || null;
        const criteres_performance  = m.overlay.querySelector('#m-cp-criteres').value
            .split('\n').map(s => s.trim()).filter(Boolean);
        const ordre = parseInt(m.overlay.querySelector('#m-cp-ordre').value || '0', 10);
        if (!intitule) { highlight(m.overlay, '#m-cp-intitule'); return false; }
        onConfirm({ intitule, description_processus, criteres_performance, ordre });
        return true;
    };
}

// ─── Modal Import CSV ─────────────────────────────────────────
function openCSVModal(onImportCSV) {
    let parsedRows = null;

    const m = createModal({
        icon:  'upload',
        title: 'Importer le référentiel (CSV)',
        size:  'xl',
        body: `
        <!-- Zone de dépôt -->
        <div class="ref-drop-zone" id="m-drop" tabindex="0" role="button"
             aria-label="Cliquer ou déposer un fichier CSV">
          <input type="file" id="m-file-input" accept=".csv,text/csv"
                 style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">
          <i data-lucide="file-spreadsheet" aria-hidden="true"></i>
          <div class="ref-drop-zone__text">Cliquez ou déposez votre fichier CSV ici</div>
          <div class="ref-drop-zone__hint">UTF-8 · séparateur virgule · max 5 Mo</div>
        </div>

        <!-- Résumé -->
        <div id="m-summary" class="ref-csv-summary" style="display:none"></div>

        <!-- Erreurs de validation -->
        <div id="m-errors" style="display:none"></div>

        <!-- Aperçu table -->
        <div id="m-preview" style="display:none">
          <div class="ref-preview-header">
            <strong>Aperçu</strong>
            <span id="m-preview-count" class="ref-stats"></span>
          </div>
          <div class="ref-preview-scroll">
            <table class="table table--sm">
              <thead><tr id="m-thead"></tr></thead>
              <tbody id="m-tbody"></tbody>
            </table>
          </div>
        </div>

        <!-- Résultats import -->
        <div id="m-results" style="display:none"></div>`,
        confirmLabel: 'Lancer l\'import',
        confirmIcon:  'upload',
    });

    const btnConfirm = m.overlay.querySelector('.ref-modal-confirm');
    btnConfirm.disabled = true;

    const dropZone  = m.overlay.querySelector('#m-drop');
    const fileInput = m.overlay.querySelector('#m-file-input');
    const summaryEl = m.overlay.querySelector('#m-summary');
    const errorsEl  = m.overlay.querySelector('#m-errors');
    const previewEl = m.overlay.querySelector('#m-preview');
    const countEl   = m.overlay.querySelector('#m-preview-count');
    const theadEl   = m.overlay.querySelector('#m-thead');
    const tbodyEl   = m.overlay.querySelector('#m-tbody');
    const resultsEl = m.overlay.querySelector('#m-results');

    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('ref-drop-zone--over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('ref-drop-zone--over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('ref-drop-zone--over');
        if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) readFile(fileInput.files[0]);
    });

    function readFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                parsedRows = parseCSVText(e.target.result);
                showPreview(parsedRows, file.name);
            } catch (err) {
                showErrors([{ ligne: 0, message: err.message }]);
            }
        };
        reader.readAsText(file, 'UTF-8');
    }

    function showPreview(rows, filename) {
        const errors = validateCSVRows(rows);
        showErrors(errors);

        // Résumé fichier
        summaryEl.style.display = 'flex';
        summaryEl.innerHTML = `
          <i data-lucide="${errors.length ? 'alert-triangle' : 'check-circle'}" aria-hidden="true"></i>
          <span><strong>${rows.length}</strong> ligne(s) lues dans <em>${esc(filename)}</em></span>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: summaryEl });
        dropZone.classList.add('ref-drop-zone--has-file');

        // Aperçu (5 premières lignes)
        const cols = Object.keys(rows[0] || {});
        theadEl.innerHTML = cols.map(c => `<th>${esc(c)}</th>`).join('');
        tbodyEl.innerHTML = rows.slice(0, 5).map(row =>
            `<tr>${cols.map(c => `<td class="text-sm">${esc(row[c] || '')}</td>`).join('')}</tr>`
        ).join('');
        countEl.textContent = `(${rows.length} ligne(s) au total)`;
        previewEl.style.display = 'block';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: previewEl });

        btnConfirm.disabled = errors.length > 0;
    }

    function showErrors(errors) {
        if (!errors.length) { errorsEl.style.display = 'none'; return; }
        errorsEl.style.display = 'block';
        errorsEl.innerHTML = `<div class="ref-errors-box">
          ${errors.map(e =>
            `<div class="ref-error-row">
               <i data-lucide="alert-circle" aria-hidden="true"></i>
               ${e.ligne > 0 ? `Ligne ${e.ligne} : ` : ''}${esc(e.message)}
             </div>`
          ).join('')}
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: errorsEl });
    }

    m.onConfirm = async () => {
        if (!parsedRows?.length) return false;
        btnConfirm.disabled  = true;
        btnConfirm.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Import en cours…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btnConfirm });

        const results = await onImportCSV(parsedRows);
        if (!results) { btnConfirm.disabled = false; return false; }

        const hasErr = (results.errors || []).length > 0;
        resultsEl.style.display = 'block';
        resultsEl.innerHTML = `
        <div class="ref-import-results ref-import-results--${hasErr ? 'partial' : 'ok'}">
          <i data-lucide="${hasErr ? 'alert-triangle' : 'check-circle'}" aria-hidden="true"></i>
          <div>
            <strong>${results.success} compétence(s) importée(s) avec succès</strong>
            ${hasErr ? `<br><span class="text-error">${results.errors.length} erreur(s) ignorées</span>` : ''}
            ${hasErr ? `<div class="ref-errors-box" style="margin-top:8px">
              ${results.errors.map(e =>
                `<div class="ref-error-row"><i data-lucide="x-circle"></i> Ligne ${e.ligne} : ${esc(e.message)}</div>`
              ).join('')}
            </div>` : ''}
          </div>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: resultsEl });

        if (!hasErr) {
            m.overlay.querySelector('.ref-modal-cancel').textContent = 'Fermer';
            btnConfirm.style.display = 'none';
        } else {
            btnConfirm.disabled  = false;
            btnConfirm.innerHTML = '<i data-lucide="upload"></i> Réessayer';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btnConfirm });
        }
        return false; // ne pas fermer automatiquement
    };
}

// ─── Factory modale ───────────────────────────────────────────
// Crée un overlay centré, propre, et retourne { overlay, onConfirm }
function createModal({ icon, title, size = 'md', body, confirmLabel, confirmIcon = 'check' }) {
    const overlay = document.createElement('div');
    overlay.className = 'ref-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
    <div class="ref-modal ref-modal--${size}">
      <div class="ref-modal-header">
        <div class="ref-modal-header__left">
          <div class="ref-modal-header__icon">
            <i data-lucide="${icon}" aria-hidden="true"></i>
          </div>
          <h3 class="ref-modal-header__title">${esc(title)}</h3>
        </div>
        <button class="ref-modal-close" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="ref-modal-body">${body}</div>
      <div class="ref-modal-footer">
        <button class="btn btn-ghost ref-modal-cancel">Annuler</button>
        <button class="btn btn-cta ref-modal-confirm">
          <i data-lucide="${confirmIcon}" aria-hidden="true"></i>
          ${esc(confirmLabel)}
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    // Animer l'ouverture
    requestAnimationFrame(() => overlay.classList.add('ref-modal-overlay--open'));

    const obj = { overlay, onConfirm: null };

    const close = () => {
        overlay.classList.remove('ref-modal-overlay--open');
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('.ref-modal-close').addEventListener('click', close);
    overlay.querySelector('.ref-modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    });

    overlay.querySelector('.ref-modal-confirm').addEventListener('click', async () => {
        if (obj.onConfirm) {
            const result = await obj.onConfirm();
            if (result !== false) close();
        }
    });

    return obj;
}

// ─── Utilitaires ─────────────────────────────────────────────
function highlight(root, selector) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.focus();
    el.classList.add('ref-modal-input--error');
    el.addEventListener('input', () => el.classList.remove('ref-modal-input--error'), { once: true });
}

// ─── Parseur CSV ──────────────────────────────────────────────
function parseCSVText(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('Le fichier doit contenir un en-tête et au moins une ligne.');
    const headers = splitCSVLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = splitCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
        return obj;
    });
}

function splitCSVLine(line) {
    const result = []; let current = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (inQ && line[i+1] === '"') { current += '"'; i++; } else inQ = !inQ; }
        else if (c === ',' && !inQ) { result.push(current); current = ''; }
        else current += c;
    }
    result.push(current);
    return result;
}

// ─── Validation CSV ───────────────────────────────────────────
function validateCSVRows(rows) {
    const REQUIRED = ['code_at', 'intitule_at', 'intitule_cp'];
    const errors   = [];
    if (!rows.length) { errors.push({ ligne: 0, message: 'Fichier vide.' }); return errors; }
    const cols = Object.keys(rows[0]);
    for (const req of REQUIRED) {
        if (!cols.includes(req))
            errors.push({ ligne: 0, message: `Colonne obligatoire manquante : "${req}"` });
    }
    if (errors.length) return errors;
    for (let i = 0; i < rows.length && errors.length < 15; i++) {
        const r = rows[i]; const ln = i + 2;
        if (!r.code_at?.trim())    errors.push({ ligne: ln, message: 'code_at vide' });
        if (!r.intitule_at?.trim()) errors.push({ ligne: ln, message: 'intitule_at vide' });
        if (!r.intitule_cp?.trim()) errors.push({ ligne: ln, message: 'intitule_cp vide' });
        if (r.code_at?.length > 20) errors.push({ ligne: ln, message: 'code_at trop long (max 20)' });
    }
    return errors;
}

// ─── Helper XSS ──────────────────────────────────────────────
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
