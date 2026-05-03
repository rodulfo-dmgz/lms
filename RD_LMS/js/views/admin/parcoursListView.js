export function renderParcoursList(container, { pathways, titresPro = [], financements = [], onCreatePathway, onToggleTemplate, onInstantiate }) {
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
      </div>` : renderPathwayGroups(pathways)}

    </div>`;

    container.querySelector('#btnNewPathway')?.addEventListener('click', () => {
        showCreatePathwayModal(container, titresPro, financements, onCreatePathway);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // Boutons "Marquer comme modèle / Retirer"
    container.querySelectorAll('.btn-toggle-template').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            onToggleTemplate?.(btn.dataset.id);
        });
    });

    // Boutons "Instancier pour une cohorte"
    container.querySelectorAll('.btn-instantiate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            onInstantiate?.(btn.dataset.id, btn.dataset.titre);
        });
    });
}

// ── Rendu groupé : modèles / instances / standalone ─────────
function renderPathwayGroups(pathways) {
    const templates   = pathways.filter(p => p.is_template);
    const instances   = pathways.filter(p => !p.is_template && p.template_id);
    const standalone  = pathways.filter(p => !p.is_template && !p.template_id);

    const cardHTML = (pw) => {
        const isTemplate = pw.is_template;
        const isInstance = !!pw.template_id;

        return `
        <div class="parcours-card-wrap">
          <a href="#/admin/parcours/${pw.id}" class="parcours-card ${isTemplate ? 'parcours-card--template' : ''} ${isInstance ? 'parcours-card--instance' : ''}">
            <div class="parcours-card__icon">
              <i data-lucide="${isTemplate ? 'layout-template' : isInstance ? 'copy' : 'map'}" aria-hidden="true"></i>
            </div>
            <div class="parcours-card__body">
              <div class="parcours-card__titre-row">
                <span class="parcours-card__titre">${esc(pw.titre)}</span>
                ${isTemplate  ? `<span class="badge badge-template">Modèle</span>` : ''}
                ${isInstance  ? `<span class="badge badge-instance">Instance</span>` : ''}
              </div>
              ${isTemplate && pw.instance_count > 0 ? `
              <div class="parcours-card__meta">
                <i data-lucide="git-branch" style="width:12px;height:12px"></i>
                ${pw.instance_count} instance${pw.instance_count > 1 ? 's' : ''}
              </div>` : ''}
              ${isInstance && pw.template_titre ? `
              <div class="parcours-card__meta">
                <i data-lucide="link" style="width:12px;height:12px"></i>
                Modèle : ${esc(pw.template_titre)}
              </div>` : ''}
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
          </a>
          <!-- Actions rapides sous la carte -->
          <div class="parcours-card-actions">
            ${isTemplate ? `
            <button class="btn btn-sm btn-cta btn-instantiate"
                    data-id="${pw.id}" data-titre="${esc(pw.titre)}"
                    title="Créer une instance de ce modèle pour une cohorte">
              <i data-lucide="git-branch" aria-hidden="true"></i> Instancier
            </button>` : ''}
            <button class="btn btn-sm btn-ghost btn-toggle-template"
                    data-id="${pw.id}"
                    title="${isTemplate ? 'Retirer le statut modèle' : 'Marquer comme modèle de formation'}">
              <i data-lucide="${isTemplate ? 'layout-template' : 'layout-template'}" aria-hidden="true"></i>
              ${isTemplate ? 'Retirer modèle' : 'Marquer modèle'}
            </button>
          </div>
        </div>`;
    };

    let html = '';

    if (templates.length) {
        html += `
        <div class="parcours-section">
          <h2 class="parcours-section-title">
            <i data-lucide="layout-template" aria-hidden="true"></i>
            Modèles de formation
            <span class="badge badge-template badge-sm">${templates.length}</span>
          </h2>
          <div class="parcours-grid">${templates.map(cardHTML).join('')}</div>
        </div>`;
    }

    if (instances.length) {
        html += `
        <div class="parcours-section">
          <h2 class="parcours-section-title">
            <i data-lucide="git-branch" aria-hidden="true"></i>
            Instances de formations
            <span class="badge badge-instance badge-sm">${instances.length}</span>
          </h2>
          <div class="parcours-grid">${instances.map(cardHTML).join('')}</div>
        </div>`;
    }

    if (standalone.length) {
        html += `
        <div class="parcours-section ${templates.length || instances.length ? 'parcours-section--separated' : ''}">
          ${templates.length || instances.length ? `
          <h2 class="parcours-section-title">
            <i data-lucide="map" aria-hidden="true"></i>
            Autres parcours
            <span class="badge badge-outline badge-sm">${standalone.length}</span>
          </h2>` : ''}
          <div class="parcours-grid">${standalone.map(cardHTML).join('')}</div>
        </div>`;
    }

    return html;
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
              ${financements.map(f => {
                const suffix = f.type_financement ? ` (${f.type_financement})` : '';
                return `<option value="${f.id}">${esc(f.nom)}${suffix}</option>`;
              }).join('')}
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
