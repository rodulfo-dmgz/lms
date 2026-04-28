export function renderStagiaireForm(container, { stagiaire, cohortes, onSave, onCancel, onEnroll }) {
    const isEdit = !!stagiaire;
    const title  = isEdit ? `${esc(stagiaire.prenom)} ${esc(stagiaire.nom)}` : 'Nouveau stagiaire';

    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">${title}</h1>
          ${isEdit ? `<p class="admin-page-sub">Créé le ${new Date(stagiaire.created_at).toLocaleDateString('fr-FR')}</p>` : ''}
        </div>
        <button id="btnCancel" class="btn btn-ghost">
          <i data-lucide="x" aria-hidden="true"></i> Retour
        </button>
      </div>

      <div id="form-alert"   class="form-error-global"   style="display:none" role="alert"></div>
      <div id="form-success" class="form-success-global" style="display:none" role="status"></div>

      <!-- Profil -->
      <div class="admin-section">
        <div class="admin-section-header">
          <i data-lucide="user" aria-hidden="true"></i>
          <h2>Informations personnelles</h2>
        </div>
        <div class="admin-section-body">
          <div class="form-grid">

            <div class="form-group">
              <label class="form-label" for="s-civilite">Civilité</label>
              <select id="s-civilite" class="form-input">
                <option value="">—</option>
                ${['M.', 'Mme', 'Mlle'].map(v => `<option value="${v}" ${stagiaire?.civilite === v ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label form-label--required" for="s-nom">Nom</label>
              <input type="text" id="s-nom" class="form-input" value="${esc(stagiaire?.nom || '')}" required>
            </div>

            <div class="form-group">
              <label class="form-label form-label--required" for="s-prenom">Prénom</label>
              <input type="text" id="s-prenom" class="form-input" value="${esc(stagiaire?.prenom || '')}" required>
            </div>

            ${!isEdit ? `
            <div class="form-group">
              <label class="form-label form-label--required" for="s-email">Email</label>
              <input type="email" id="s-email" class="form-input" required autocomplete="off">
            </div>` : ''}

            <div class="form-group">
              <label class="form-label" for="s-naissance">Date de naissance</label>
              <input type="date" id="s-naissance" class="form-input" value="${stagiaire?.date_naissance || ''}">
            </div>

            <div class="form-group">
              <label class="form-label" for="s-tel">Téléphone</label>
              <input type="tel" id="s-tel" class="form-input" value="${esc(stagiaire?.telephone || '')}">
            </div>

          </div>

          <div class="form-actions">
            <button id="btnSave" class="btn btn-cta">
              <i data-lucide="save" aria-hidden="true"></i>
              ${isEdit ? 'Enregistrer les modifications' : 'Créer le stagiaire'}
            </button>
          </div>
        </div>
      </div>

      <!-- Cohorte -->
      <div class="admin-section">
        <div class="admin-section-header">
          <i data-lucide="users" aria-hidden="true"></i>
          <h2>Cohorte</h2>
        </div>
        <div class="admin-section-body">
          ${isEdit
            ? renderEnrollSection(stagiaire, cohortes, !!onEnroll)
            : renderCohorteSelect(cohortes)}
        </div>
      </div>

      <!-- Zone mot de passe temporaire (création) -->
      <div id="success-panel" style="display:none"></div>

    </div>`;

    container.querySelector('#btnCancel').addEventListener('click', onCancel);

    container.querySelector('#btnSave').addEventListener('click', async () => {
        const alert   = container.querySelector('#form-alert');
        const success = container.querySelector('#form-success');
        const btn     = container.querySelector('#btnSave');

        const nom      = container.querySelector('#s-nom').value.trim();
        const prenom   = container.querySelector('#s-prenom').value.trim();
        const civilite = container.querySelector('#s-civilite').value;
        const naissance = container.querySelector('#s-naissance').value;
        const tel      = container.querySelector('#s-tel').value.trim();

        if (!nom)    return showAlert(alert, 'Le nom est obligatoire.');
        if (!prenom) return showAlert(alert, 'Le prénom est obligatoire.');

        hideAlert(alert); hideAlert(success);
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        if (isEdit) {
            await onSave({ civilite: civilite || null, nom, prenom, date_naissance: naissance || null, telephone: tel || null });
            showSuccess(success, 'Modifications enregistrées.');
        } else {
            const email      = container.querySelector('#s-email').value.trim();
            const cohorte_id = container.querySelector('#s-cohorte-select')?.value || null;
            if (!email) { showAlert(alert, 'L\'email est obligatoire.'); btn.disabled = false; return; }

            await onSave(
                { civilite: civilite || null, nom, prenom, email, date_naissance: naissance || null, cohorte_id },
                (mdp, mail) => showPasswordPanel(container, mail, mdp),
            );
        }

        btn.disabled  = false;
        btn.innerHTML = `<i data-lucide="save"></i> ${isEdit ? 'Enregistrer les modifications' : 'Créer le stagiaire'}`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
    });

    if (isEdit && onEnroll) {
        const btnEnroll = container.querySelector('#btnEnroll');
        const selEnroll = container.querySelector('#s-enroll-select');
        btnEnroll?.addEventListener('click', async () => {
            const cohorteId = selEnroll?.value || null;
            await onEnroll(cohorteId);
        });
    }
}

function renderCohorteSelect(cohortes) {
    return `
    <div class="form-group">
      <label class="form-label" for="s-cohorte-select">Inscrire dans une cohorte (optionnel)</label>
      <select id="s-cohorte-select" class="form-input">
        <option value="">— Aucune cohorte —</option>
        ${cohortes.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}
      </select>
    </div>`;
}

function renderEnrollSection(stagiaire, cohortes, canEnroll) {
    const current = stagiaire.cohorte_nom
        ? `<span class="badge badge-primary">${esc(stagiaire.cohorte_nom)}</span>`
        : '<span class="text-muted">Non inscrit dans une cohorte</span>';

    if (!canEnroll) return `<div>Cohorte actuelle : ${current}</div>`;

    return `
    <div class="admin-enroll-row">
      <div>Cohorte actuelle : ${current}</div>
      <div class="admin-enroll-form">
        <select id="s-enroll-select" class="form-input form-input--sm">
          <option value="">— Aucune cohorte —</option>
          ${cohortes.map(c => `<option value="${c.id}" ${stagiaire.cohorte_id === c.id ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}
        </select>
        <button id="btnEnroll" class="btn btn-secondary btn-sm">
          <i data-lucide="check" aria-hidden="true"></i> Appliquer
        </button>
      </div>
    </div>`;
}

function showPasswordPanel(container, email, mdp) {
    const panel = container.querySelector('#success-panel');
    if (!panel) return;
    panel.style.display = 'block';
    panel.innerHTML = `
    <div class="admin-section admin-section--success">
      <div class="admin-section-header">
        <i data-lucide="check-circle" aria-hidden="true"></i>
        <h2>Stagiaire créé avec succès</h2>
      </div>
      <div class="admin-section-body">
        <p>Le compte a été créé pour <strong>${esc(email)}</strong>.</p>
        <p>Mot de passe temporaire à communiquer :</p>
        <div class="password-reveal">
          <span class="password-reveal__pwd" id="mdpText">${esc(mdp)}</span>
          <button class="btn btn-ghost btn-sm" id="btnCopyMdp">
            <i data-lucide="copy" aria-hidden="true"></i> Copier
          </button>
        </div>
        <p class="admin-hint">Le stagiaire devra choisir un nouveau mot de passe à la première connexion.</p>
      </div>
    </div>`;
    panel.querySelector('#btnCopyMdp')?.addEventListener('click', () => {
        navigator.clipboard.writeText(mdp).then(() => {
            const btn = panel.querySelector('#btnCopyMdp');
            if (btn) { btn.innerHTML = '<i data-lucide="check"></i> Copié !'; }
            setTimeout(() => { if (btn) btn.innerHTML = '<i data-lucide="copy"></i> Copier'; }, 2000);
        });
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: panel });
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showAlert(el, msg)   { if (el) { el.textContent = msg; el.style.display = 'block'; } }
function hideAlert(el)         { if (el) el.style.display = 'none'; }
function showSuccess(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
