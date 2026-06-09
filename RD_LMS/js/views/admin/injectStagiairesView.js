const CSV_COLUMNS = ['civilite','nom','prenom','email','date_naissance','adresse','code_postal','ville','telephone','cohorte_nom'];

export function renderInjectStagiaires(container, { cohortes, onImportRows, onCreateOne }) {
    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Injection de stagiaires</h1>
          <p class="admin-page-sub">Import CSV en masse ou saisie manuelle</p>
        </div>
        <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <label class="form-label" style="margin:0;white-space:nowrap">Cohorte par défaut</label>
            <select id="defaultCohorte" class="form-input form-input--sm" style="min-width:200px">
              <option value="">— Aucune —</option>
              ${cohortes.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-ghost btn-sm" id="btnDownloadTemplate">
            <i data-lucide="download" aria-hidden="true"></i> Modèle CSV
          </button>
        </div>
      </div>

      <!-- Onglets -->
      <div class="inject-tabs" role="tablist">
        <button class="inject-tab inject-tab--active" role="tab" data-tab="csv" aria-selected="true">
          <i data-lucide="file-text" aria-hidden="true"></i> Import CSV
        </button>
        <button class="inject-tab" role="tab" data-tab="manual" aria-selected="false">
          <i data-lucide="user-plus" aria-hidden="true"></i> Saisie manuelle
        </button>
      </div>

      <!-- ── Onglet CSV ── -->
      <div class="inject-panel" id="panelCsv">
        <div class="admin-section">
          <div class="admin-section-header">
            <i data-lucide="upload" aria-hidden="true"></i>
            <h2>Fichier CSV</h2>
          </div>
          <div class="admin-section-body" style="padding:var(--space-5)">
            <p class="admin-hint">
              <i data-lucide="info" style="width:14px;height:14px"></i>
              Colonnes : <code>civilite</code> (<code>M.</code> / <code>Mme</code> / <code>Mlle</code>),
              <code>nom</code>, <code>prenom</code>, <code>email</code> (obligatoire),
              <code>date_naissance</code> (jj/mm/aaaa), <code>adresse</code>, <code>code_postal</code>,
              <code>ville</code>, <code>telephone</code>, <code>cohorte_nom</code> (nom exact de la cohorte).<br>
              Laissez <code>cohorte_nom</code> vide et utilisez la « Cohorte par défaut » ci-dessus pour affecter tous les stagiaires à la même cohorte.<br>
              Si l'email existe déjà, le stagiaire sera seulement inscrit à la cohorte.
            </p>
            <div class="csv-drop-zone" id="injDropZone" role="button" tabindex="0">
              <i data-lucide="file-text" class="csv-drop-zone__icon" aria-hidden="true"></i>
              <p class="csv-drop-zone__text">Déposez votre fichier CSV ou cliquez pour sélectionner</p>
              <p class="csv-drop-zone__sub">Fichiers .csv · UTF-8 · séparateur virgule ou point-virgule</p>
              <input type="file" id="injFileInput" class="csv-file-input" accept=".csv" aria-hidden="true">
            </div>

            <div id="injPreviewWrap" style="display:none">
              <div class="inject-preview-header">
                <span id="injPreviewCount"></span>
                <button class="btn btn-ghost btn-sm" id="btnClearCsv">
                  <i data-lucide="x" aria-hidden="true"></i> Effacer
                </button>
              </div>
              <div class="table-wrapper">
                <table class="table" id="injPreviewTable">
                  <thead>
                    <tr>
                      <th>#</th><th>Civilité</th><th>Nom</th><th>Prénom</th>
                      <th>Email</th><th>Naissance</th><th>Ville</th><th>Cohorte ID</th><th>Statut</th>
                    </tr>
                  </thead>
                  <tbody id="injPreviewBody"></tbody>
                </table>
              </div>
              <div class="inject-actions">
                <button class="btn btn-cta" id="btnImportCsv">
                  <i data-lucide="users" aria-hidden="true"></i> Lancer l'import
                </button>
              </div>
            </div>

            <div id="injCsvResults" style="display:none"></div>
          </div>
        </div>
      </div>

      <!-- ── Onglet Manuel ── -->
      <div class="inject-panel" id="panelManual" style="display:none">
        <div class="admin-section">
          <div class="admin-section-header">
            <i data-lucide="user-plus" aria-hidden="true"></i>
            <h2>Créer un stagiaire</h2>
          </div>
          <div class="admin-section-body" style="padding:var(--space-5)">
            <div class="inject-form">
              <div class="form-row">
                <div class="form-group form-group--narrow">
                  <label class="form-label">Civilité</label>
                  <select id="mCivilite" class="form-input">
                    <option value="">—</option>
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Mlle">Mlle</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label form-label--required">Nom</label>
                  <input type="text" id="mNom" class="form-input" placeholder="DUPONT">
                </div>
                <div class="form-group">
                  <label class="form-label form-label--required">Prénom</label>
                  <input type="text" id="mPrenom" class="form-input" placeholder="Marie">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label form-label--required">Email</label>
                  <input type="email" id="mEmail" class="form-input" placeholder="marie.dupont@example.fr">
                </div>
                <div class="form-group">
                  <label class="form-label">Date de naissance</label>
                  <input type="date" id="mNaissance" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Téléphone</label>
                  <input type="tel" id="mTel" class="form-input" placeholder="06 12 34 56 78">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group" style="flex:2">
                  <label class="form-label">Adresse</label>
                  <input type="text" id="mAdresse" class="form-input" placeholder="12 rue de la Paix">
                </div>
                <div class="form-group form-group--narrow">
                  <label class="form-label">Code postal</label>
                  <input type="text" id="mCp" class="form-input" placeholder="75001">
                </div>
                <div class="form-group">
                  <label class="form-label">Ville</label>
                  <input type="text" id="mVille" class="form-input" placeholder="Paris">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Rôle</label>
                  <select id="mRole" class="form-input">
                    <option value="stagiaire" selected>Stagiaire</option>
                    <option value="formateur">Formateur</option>
                    <option value="formateur_editeur">Formateur éditeur</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Cohorte</label>
                  <select id="mCohorte" class="form-input">
                    <option value="">— Sans cohorte —</option>
                    ${cohortes.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="inject-password-preview" id="mPasswordPreview" style="display:none">
                <i data-lucide="key" style="width:14px;height:14px"></i>
                Mot de passe temporaire : <code id="mPasswordValue"></code>
              </div>

              <div class="inject-actions">
                <button class="btn btn-cta" id="btnCreateOne">
                  <i data-lucide="user-plus" aria-hidden="true"></i> Créer le compte
                </button>
              </div>
            </div>

            <div id="injManualResult" style="display:none"></div>

            <div id="injManualLog" style="display:none">
              <div class="inject-log-header">
                <i data-lucide="list" style="width:14px;height:14px"></i>
                Comptes créés cette session
                <button class="btn btn-ghost btn-sm" id="btnDownloadManualLog" style="margin-left:auto">
                  <i data-lucide="download" aria-hidden="true"></i> Télécharger CSV
                </button>
              </div>
              <div id="injManualLogBody"></div>
            </div>
          </div>
        </div>
      </div>

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Sélecteur cohorte par défaut ──────────────────────────
    const defaultCohorteSelect = container.querySelector('#defaultCohorte');

    // ── Téléchargement du modèle CSV ──────────────────────────
    container.querySelector('#btnDownloadTemplate')?.addEventListener('click', () => {
        const cohorteId = defaultCohorteSelect?.value || '';
        const cohorteName = cohorteId
            ? (cohortes.find(c => c.id === cohorteId)?.nom || '')
            : '';

        const header = CSV_COLUMNS.join(',');
        const ex1 = `"M.","DUPONT","Marie","marie.dupont@exemple.fr","15/03/1990","","","","","${cohorteName}"`;
        const ex2 = `"Mme","MARTIN","Sophie","sophie.martin@exemple.fr","22/07/1988","12 rue des Lilas","75001","Paris","06 12 34 56 78","${cohorteName}"`;
        const blob = new Blob([`${header}\n${ex1}\n${ex2}\n`], { type: 'text/csv;charset=utf-8;' });
        const name = cohorteName
            ? `stagiaires_${cohorteName.replace(/\s+/g,'_')}.csv`
            : 'stagiaires_modele.csv';
        downloadBlob(blob, name);
    });

    // ── Tabs ──────────────────────────────────────────────────
    container.querySelectorAll('.inject-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.inject-tab').forEach(t => {
                t.classList.toggle('inject-tab--active', t === tab);
                t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            });
            const active = tab.dataset.tab;
            container.querySelectorAll('.inject-panel').forEach(p => {
                p.style.display = p.id === `panel${capitalize(active)}` ? '' : 'none';
            });
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
        });
    });

    // ── CSV tab ───────────────────────────────────────────────
    let parsedRows = null;
    // Accumule les identifiants créés pour le download
    const sessionCredentials = [];

    const dropZone    = container.querySelector('#injDropZone');
    const fileInput   = container.querySelector('#injFileInput');
    const previewWrap = container.querySelector('#injPreviewWrap');
    const previewBody = container.querySelector('#injPreviewBody');
    const previewCount= container.querySelector('#injPreviewCount');
    const resultsDiv  = container.querySelector('#injCsvResults');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) parseAndPreview(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) parseAndPreview(fileInput.files[0]); });

    container.querySelector('#btnClearCsv')?.addEventListener('click', () => {
        parsedRows = null;
        previewWrap.style.display = 'none';
        resultsDiv.style.display  = 'none';
        fileInput.value           = '';
    });

    container.querySelector('#btnImportCsv')?.addEventListener('click', async () => {
        if (!parsedRows?.length) return;
        const btn = container.querySelector('#btnImportCsv');
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Import en cours…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        const defaultCohorteId = defaultCohorteSelect?.value || null;
        const results = { created: [], enrolled: [], errors: [] };

        for (let i = 0; i < parsedRows.length; i++) {
            const row = parsedRows[i];
            const tr  = previewBody.querySelector(`tr[data-idx="${i}"]`);
            const statusCell = tr?.querySelector('.inject-status');
            if (statusCell) {
                statusCell.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;height:14px"></i>';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: statusCell });
            }
            try {
                if (!row.email || !row.nom || !row.prenom) throw new Error('email, nom et prenom requis');
                // cohorte_id : priorité à la valeur du CSV, puis la cohorte par défaut
                const effectiveCohorte = row.cohorte_id || defaultCohorteId;
                const result = await onImportRows([{ ...row, cohorte_id: effectiveCohorte }]);
                if (!result) throw new Error('Erreur serveur (réponse vide)');
                if (result.errors.length) throw new Error(result.errors[0].message);

                const isExisting = result.success[0]?.enrolled_existing;
                const mdp        = result.success[0]?.mot_de_passe;

                if (isExisting) {
                    results.enrolled.push({ email: row.email, prenom: row.prenom, nom: row.nom });
                    if (statusCell) statusCell.innerHTML = '<span class="inject-ok" title="Existant — inscrit à la cohorte"><i data-lucide="user-check" style="width:14px;height:14px"></i> Inscrit</span>';
                } else {
                    results.created.push({ email: row.email, prenom: row.prenom, nom: row.nom, mot_de_passe: mdp });
                    sessionCredentials.push({ email: row.email, prenom: row.prenom, nom: row.nom, mot_de_passe: mdp });
                    if (statusCell) statusCell.innerHTML = '<span class="inject-ok"><i data-lucide="check-circle-2" style="width:14px;height:14px"></i> Créé</span>';
                }
            } catch (err) {
                results.errors.push({ email: row.email, message: err.message });
                if (statusCell) statusCell.innerHTML = `<span class="inject-err" title="${esc(err.message)}"><i data-lucide="x-circle" style="width:14px;height:14px"></i> Erreur</span>`;
            }
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: previewBody });
        }

        resultsDiv.style.display = 'block';
        renderCsvResults(resultsDiv, results);
        btn.disabled  = false;
        btn.innerHTML = '<i data-lucide="users" aria-hidden="true"></i> Lancer l\'import';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
    });

    function parseAndPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result.replace(/^﻿/, '');
            parsedRows = parseCSVText(text);
            if (!parsedRows.length) { alert('Aucune ligne valide trouvée dans le CSV.'); return; }

            // Résoudre cohorte_nom → cohorte_id
            const cohorteByName = new Map(cohortes.map(c => [c.nom.toLowerCase().trim(), c.id]));
            parsedRows = parsedRows.map(r => {
                if (!r.cohorte_id && r.cohorte_nom) {
                    r.cohorte_id = cohorteByName.get(r.cohorte_nom.toLowerCase().trim()) || null;
                }
                return r;
            });

            previewCount.textContent = `${parsedRows.length} ligne${parsedRows.length > 1 ? 's' : ''} détectée${parsedRows.length > 1 ? 's' : ''}`;
            previewBody.innerHTML = parsedRows.map((r, i) => `
            <tr data-idx="${i}">
              <td class="text-muted text-sm">${i + 1}</td>
              <td>${esc(r.civilite || '—')}</td>
              <td class="font-medium">${esc(r.nom || '—')}</td>
              <td>${esc(r.prenom || '—')}</td>
              <td class="text-sm">${esc(r.email || '—')}</td>
              <td class="text-sm">${esc(r.date_naissance || '—')}</td>
              <td class="text-sm">${esc(r.ville || '—')}</td>
              <td class="text-sm">${(() => {
                const cNom = r.cohorte_nom || (r.cohorte_id ? cohortes.find(c => c.id === r.cohorte_id)?.nom : null);
                return cNom
                  ? `<span class="badge badge-outline" style="font-size:10px">${esc(cNom)}</span>`
                  : r.cohorte_id
                    ? `<span class="badge badge-outline" style="font-size:10px;color:var(--color-warning)">${esc(r.cohorte_id.slice(0,8))}…</span>`
                    : '<span class="text-muted">—</span>';
              })()}</td>
              <td class="inject-status"><span class="text-muted">—</span></td>
            </tr>`).join('');

            previewWrap.style.display = 'block';
            resultsDiv.style.display  = 'none';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
        };
        reader.readAsText(file, 'UTF-8');
    }

    // ── Manuel tab ────────────────────────────────────────────
    const manualLog       = [];
    const mPrenom         = container.querySelector('#mPrenom');
    const mNom            = container.querySelector('#mNom');
    const pwPreview       = container.querySelector('#mPasswordPreview');
    const pwValue         = container.querySelector('#mPasswordValue');
    const logDiv          = container.querySelector('#injManualLog');
    const logBody         = container.querySelector('#injManualLogBody');
    const resultDiv       = container.querySelector('#injManualResult');

    function updatePasswordPreview() {
        const p = mPrenom?.value.trim();
        const n = mNom?.value.trim();
        if (p && n) {
            const year  = new Date().getFullYear();
            const clean = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z]/g,'');
            const cap   = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
            pwValue.textContent    = `${cap(clean(p))}.${cap(clean(n))}${year}`;
            pwPreview.style.display = 'flex';
        } else {
            pwPreview.style.display = 'none';
        }
    }

    mPrenom?.addEventListener('input', updatePasswordPreview);
    mNom?.addEventListener('input',    updatePasswordPreview);

    // Synchroniser avec la cohorte par défaut
    defaultCohorteSelect?.addEventListener('change', () => {
        const mCohorte = container.querySelector('#mCohorte');
        if (mCohorte && !mCohorte.value) mCohorte.value = defaultCohorteSelect.value;
    });

    container.querySelector('#btnCreateOne')?.addEventListener('click', async () => {
        const nom    = container.querySelector('#mNom')?.value.trim();
        const prenom = container.querySelector('#mPrenom')?.value.trim();
        const email  = container.querySelector('#mEmail')?.value.trim();
        if (!nom)    { container.querySelector('#mNom').focus();    return; }
        if (!prenom) { container.querySelector('#mPrenom').focus(); return; }
        if (!email)  { container.querySelector('#mEmail').focus();  return; }

        const btn = container.querySelector('#btnCreateOne');
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Création…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        try {
            const cohorteId = container.querySelector('#mCohorte')?.value || defaultCohorteSelect?.value || null;
            const result = await onCreateOne({
                nom, prenom, email,
                civilite:       container.querySelector('#mCivilite')?.value   || null,
                role:           container.querySelector('#mRole')?.value        || 'stagiaire',
                date_naissance: container.querySelector('#mNaissance')?.value   || null,
                telephone:      container.querySelector('#mTel')?.value.trim()  || null,
                adresse:        container.querySelector('#mAdresse')?.value.trim() || null,
                code_postal:    container.querySelector('#mCp')?.value.trim()   || null,
                ville:          container.querySelector('#mVille')?.value.trim() || null,
                cohorte_id:     cohorteId,
            });

            const isExisting = result.enrolled_existing;
            const mdp        = result.mot_de_passe;

            resultDiv.style.display = 'block';
            if (isExisting) {
                resultDiv.innerHTML = `
                <div class="inject-success-banner">
                  <i data-lucide="user-check" aria-hidden="true"></i>
                  <div>
                    <strong>${esc(prenom)} ${esc(nom)}</strong> existe déjà — inscrit à la cohorte.<br>
                    <span class="text-sm">Email : <code>${esc(email)}</code></span>
                  </div>
                </div>`;
            } else {
                resultDiv.innerHTML = `
                <div class="inject-success-banner">
                  <i data-lucide="check-circle-2" aria-hidden="true"></i>
                  <div>
                    <strong>${esc(prenom)} ${esc(nom)}</strong> créé avec succès.<br>
                    <span class="text-sm">Email : <code>${esc(email)}</code> · Mot de passe : <code>${esc(mdp || '—')}</code></span>
                  </div>
                </div>`;
                manualLog.push({ email, prenom, nom, mot_de_passe: mdp || '' });
                sessionCredentials.push({ email, prenom, nom, mot_de_passe: mdp || '' });
            }
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: resultDiv });

            // Ligne dans le log de session
            const row = document.createElement('div');
            row.className = 'inject-log-row';
            row.innerHTML = isExisting
                ? `<span class="inject-ok"><i data-lucide="user-check" style="width:12px;height:12px"></i></span>
                   <code>${esc(email)}</code>
                   <span class="text-sm text-muted">${esc(prenom)} ${esc(nom)}</span>
                   <span class="badge badge-outline" style="font-size:10px;margin-left:auto">Existant</span>`
                : `<span class="inject-ok"><i data-lucide="check" style="width:12px;height:12px"></i></span>
                   <code>${esc(email)}</code>
                   <span class="text-sm text-muted">${esc(prenom)} ${esc(nom)}</span>
                   <code class="inject-pw">${esc(mdp || '—')}</code>`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: row });
            logBody.prepend(row);
            logDiv.style.display = 'block';

            // Reset form
            ['#mNom','#mPrenom','#mEmail','#mNaissance','#mTel','#mAdresse','#mCp','#mVille'].forEach(sel => {
                const el = container.querySelector(sel);
                if (el) el.value = '';
            });
            container.querySelector('#mCivilite').value = '';
            container.querySelector('#mRole').value = 'stagiaire';
            pwPreview.style.display = 'none';

        } catch (err) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
            <div class="inject-error-banner">
              <i data-lucide="x-circle" aria-hidden="true"></i>
              <div><strong>Erreur :</strong> ${esc(err.message)}</div>
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: resultDiv });
        }

        btn.disabled  = false;
        btn.innerHTML = '<i data-lucide="user-plus" aria-hidden="true"></i> Créer le compte';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
    });

    // ── Télécharger log manuel ────────────────────────────────
    container.querySelector('#btnDownloadManualLog')?.addEventListener('click', () => {
        downloadCredentials(manualLog, 'identifiants_session.csv');
    });
}

// ── Résultats CSV ────────────────────────────────────────────
function renderCsvResults(el, { created, enrolled, errors }) {
    const total = created.length + enrolled.length + errors.length;
    el.innerHTML = `
    <div class="inject-results">
      <div class="inject-results-summary">
        <span class="inject-results-stat inject-results-stat--ok">
          <i data-lucide="user-plus" aria-hidden="true"></i> ${created.length} créé${created.length > 1 ? 's' : ''}
        </span>
        <span class="inject-results-stat" style="color:var(--action-primary)">
          <i data-lucide="user-check" aria-hidden="true"></i> ${enrolled.length} inscrit${enrolled.length > 1 ? 's' : ''} (existants)
        </span>
        <span class="inject-results-stat inject-results-stat--err">
          <i data-lucide="x-circle" aria-hidden="true"></i> ${errors.length} erreur${errors.length > 1 ? 's' : ''}
        </span>
        <span class="inject-results-stat">
          <i data-lucide="users" aria-hidden="true"></i> ${total} total
        </span>
      </div>

      ${created.length ? `
      <div class="inject-actions">
        <button class="btn btn-secondary btn-sm" id="btnDownloadCreds">
          <i data-lucide="download" aria-hidden="true"></i> Télécharger les identifiants (${created.length})
        </button>
      </div>` : ''}

      ${created.length ? `
      <details class="inject-details">
        <summary>Comptes créés (${created.length})</summary>
        <div class="inject-log-body">
          ${created.map(s => `
          <div class="inject-log-row">
            <span class="inject-ok"><i data-lucide="check" style="width:12px;height:12px"></i></span>
            <code>${esc(s.email)}</code>
            <span class="text-sm text-muted">${esc(s.prenom)} ${esc(s.nom)}</span>
            <code class="inject-pw">${esc(s.mot_de_passe || '—')}</code>
          </div>`).join('')}
        </div>
      </details>` : ''}

      ${enrolled.length ? `
      <details class="inject-details">
        <summary>Existants — inscrits à la cohorte (${enrolled.length})</summary>
        <div class="inject-log-body">
          ${enrolled.map(s => `
          <div class="inject-log-row">
            <span class="inject-ok"><i data-lucide="user-check" style="width:12px;height:12px"></i></span>
            <code>${esc(s.email)}</code>
            <span class="text-sm text-muted">${esc(s.prenom)} ${esc(s.nom)}</span>
            <span class="badge badge-outline" style="font-size:10px;margin-left:auto">Existant</span>
          </div>`).join('')}
        </div>
      </details>` : ''}

      ${errors.length ? `
      <details class="inject-details" open>
        <summary>Erreurs (${errors.length})</summary>
        <div class="inject-log-body">
          ${errors.map(e => `
          <div class="inject-log-row inject-log-row--err">
            <span class="inject-err"><i data-lucide="x" style="width:12px;height:12px"></i></span>
            <code>${esc(e.email)}</code>
            <span class="text-sm text-muted">${esc(e.message)}</span>
          </div>`).join('')}
        </div>
      </details>` : ''}
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: el });

    el.querySelector('#btnDownloadCreds')?.addEventListener('click', () => {
        downloadCredentials(created, 'identifiants_import.csv');
    });
}

// ── Téléchargement CSV identifiants ──────────────────────────
function downloadCredentials(rows, filename) {
    if (!rows.length) return;
    const header = 'prenom,nom,email,mot_de_passe';
    const lines  = rows.map(r =>
        `"${(r.prenom||'').replace(/"/g,'""')}","${(r.nom||'').replace(/"/g,'""')}","${(r.email||'').replace(/"/g,'""')}","${(r.mot_de_passe||'').replace(/"/g,'""')}"`
    );
    const blob = new Blob([`${header}\n${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Parsing CSV ───────────────────────────────────────────────
function parseCSVText(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const sep     = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/["\s]/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = splitCSVLine(lines[i], sep);
        if (cells.every(c => !c.trim())) continue;
        const obj = {};
        headers.forEach((h, j) => { obj[h] = (cells[j] || '').trim().replace(/^"|"$/g, ''); });

        // Normaliser civilité
        if (obj.civilite) {
            const cv = obj.civilite.trim();
            if (/^m\.?$/i.test(cv) || /^monsieur$/i.test(cv))       obj.civilite = 'M.';
            else if (/^mme\.?$/i.test(cv) || /^madame$/i.test(cv))  obj.civilite = 'Mme';
            else if (/^mlle\.?$/i.test(cv) || /^mademoiselle$/i.test(cv)) obj.civilite = 'Mlle';
        }
        // Normaliser date jj/mm/aaaa → aaaa-mm-jj
        if (obj.date_naissance) {
            const raw = obj.date_naissance.trim();
            if (raw.includes('/')) {
                const parts = raw.split('/');
                if (parts.length === 3) {
                    const [d, m, y] = parts;
                    obj.date_naissance = `${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                }
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                obj.date_naissance = raw; // déjà au bon format
            } else {
                // Série Excel (ex: 31685) ou format inconnu → ignorer
                obj.date_naissance = '';
            }
        }
        rows.push(obj);
    }
    return rows;
}

function splitCSVLine(line, sep) {
    const result = [];
    let cur = '', inQ = false;
    for (const ch of line) {
        if (ch === '"')             { inQ = !inQ; }
        else if (ch === sep && !inQ){ result.push(cur); cur = ''; }
        else                        { cur += ch; }
    }
    result.push(cur);
    return result;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
