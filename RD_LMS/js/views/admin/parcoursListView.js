export function renderParcoursList(container, { pathways, titresPro = [], financements = [], onCreatePathway }) {
    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Parcours de formation</h1>
          <p class="admin-page-sub">${pathways.length} parcours disponible${pathways.length > 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn-cta" id="btnNewPathway">
          <i data-lucide="plus" aria-hidden="true"></i> Nouveau parcours
        </button>
      </div>

      ${pathways.length === 0 ? `
      <div class="admin-empty">
        <i data-lucide="map" aria-hidden="true"></i>
        <p>Aucun parcours pour l'instant. Cliquez sur « Nouveau parcours » pour commencer.</p>
      </div>` : `
      <div class="parcours-grid">
        ${pathways.map(pw => `
        <a href="#/admin/parcours/${pw.id}" class="parcours-card">
          <div class="parcours-card__icon">
            <i data-lucide="map" aria-hidden="true"></i>
          </div>
          <div class="parcours-card__body">
            <div class="parcours-card__titre">${esc(pw.titre)}</div>
            ${pw.titre_pro_intitule ? `
            <div class="parcours-card__tp">
              <span class="badge badge-primary">${esc(pw.titre_pro_sigle || '')}</span>
              ${esc(pw.titre_pro_intitule)}
            </div>` : ''}
            ${pw.description ? `<div class="parcours-card__desc">${esc(pw.description)}</div>` : ''}
          </div>
          <div class="parcours-card__arrow">
            <i data-lucide="chevron-right" aria-hidden="true"></i>
          </div>
        </a>`).join('')}
      </div>`}
    </div>`;

    container.querySelector('#btnNewPathway')?.addEventListener('click', () => {
        showCreatePathwayModal(container, titresPro, financements, onCreatePathway);
    });
}

// ── Modale de création d'un parcours ────────────────────────
function showCreatePathwayModal(container, titresPro, financements, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal tree-modal--lg">
      <div class="tree-modal-header">
        <h3><i data-lucide="map" aria-hidden="true"></i> Nouveau parcours</h3>
        <button class="tree-modal-close btn-icon" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="tree-modal-body">
        <div class="form-group">
          <label class="form-label form-label--required">Titre du parcours</label>
          <input type="text" id="pwTitre" class="form-input"
                 placeholder="Ex : Parcours Assistant Commercial…" autofocus required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="pwDesc" class="form-input form-textarea" rows="2"
                    placeholder="Présentation succincte…"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Titre professionnel</label>
            <select id="pwTitrePro" class="form-input">
              <option value="">— Aucun —</option>
              ${titresPro.map(t => `
              <option value="${t.id}">${esc(t.sigle)} — ${esc(t.intitule)} (Niv. ${t.niveau})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Mode de financement initial</label>
            <select id="pwFinancement" class="form-input">
              <option value="">— Sans financement —</option>
              ${financements.map(f => `<option value="${f.id}">${esc(f.nom)}</option>`).join('')}
            </select>
          </div>
        </div>
        <p class="form-hint">
          <i data-lucide="info" aria-hidden="true" style="width:12px;height:12px"></i>
          D'autres configurations (financements) pourront être ajoutées plus tard.
        </p>
      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Annuler</button>
        <button class="btn btn-cta" id="pwConfirmBtn">
          <i data-lucide="plus" aria-hidden="true"></i> Créer le parcours
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    overlay.querySelectorAll('.tree-modal-close').forEach(b =>
        b.addEventListener('click', () => overlay.remove())
    );
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
    });

    overlay.querySelector('#pwConfirmBtn')?.addEventListener('click', async () => {
        const titre = overlay.querySelector('#pwTitre')?.value.trim();
        if (!titre) { overlay.querySelector('#pwTitre')?.focus(); return; }

        const btn = overlay.querySelector('#pwConfirmBtn');
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Création…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        await onConfirm({
            titre,
            description:    overlay.querySelector('#pwDesc')?.value.trim()    || null,
            titre_pro_id:   overlay.querySelector('#pwTitrePro')?.value       || null,
            financement_id: overlay.querySelector('#pwFinancement')?.value    || null,
        });
        overlay.remove();
    });
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
