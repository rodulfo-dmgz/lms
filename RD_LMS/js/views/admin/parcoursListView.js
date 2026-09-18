import { showEditFormationModal } from './parcoursTreeView.js';

const MODALITE_LABELS = { presentiel: 'Présentiel', distanciel: 'Distanciel', hybride: 'Hybride' };

// ── Identité visuelle des cartes (monogramme coloré, stable par parcours) ──
const CARD_PALETTE = [
    { bg: '#e0e7ff', fg: '#4338ca' }, // indigo
    { bg: '#dbeafe', fg: '#1d4ed8' }, // bleu
    { bg: '#dcfce7', fg: '#15803d' }, // vert
    { bg: '#fef3c7', fg: '#b45309' }, // ambre
    { bg: '#fae8ff', fg: '#a21caf' }, // fuchsia
    { bg: '#ccfbf1', fg: '#0f766e' }, // teal
    { bg: '#ffe4e6', fg: '#be123c' }, // rose
    { bg: '#e0f2fe', fg: '#0369a1' }, // cyan
];

function pathwayColor(pw) {
    const key = pw.id || pw.titre || '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return CARD_PALETTE[hash % CARD_PALETTE.length];
}

function pathwayMonogram(pw) {
    if (pw.code) return pw.code.slice(0, 3).toUpperCase();
    const words = (pw.titre || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

export function renderParcoursList(container, {
    pathways, titresPro = [], financements = [], publicsCibles = [], categories = [],
    onCreatePathway, onToggleTemplate, onInstantiate, onCreatePublicCible, onCreateCategory,
    onEditPathway, onDeletePathway, onGetFormationPublicIds,
}) {
    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Parcours de formation</h1>
          <p class="admin-page-sub" id="parcoursCount">${pathways.length} parcours disponible${pathways.length > 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn-cta" id="btnNewPathway">
          <i data-lucide="plus" aria-hidden="true"></i> Nouveau parcours
        </button>
      </div>

      ${pathways.length === 0 ? '' : renderFilterBar(categories)}

      <div id="parcoursGroups">
      ${pathways.length === 0 ? `
      <div class="admin-empty">
        <i data-lucide="map" aria-hidden="true"></i>
        <p>Aucun parcours pour l'instant. Cliquez sur « Nouveau parcours » pour commencer.</p>
      </div>` : renderPathwayGroups(pathways)}
      </div>
      <div class="admin-empty" id="parcoursNoMatch" style="display:none">
        <i data-lucide="search-x" aria-hidden="true"></i>
        <p>Aucun parcours ne correspond aux filtres.</p>
      </div>

    </div>`;

    container.querySelector('#btnNewPathway')?.addEventListener('click', () => {
        showCreatePathwayModal(container, titresPro, financements, publicsCibles, categories, onCreatePathway, onCreatePublicCible, onCreateCategory);
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

    // Bouton "Modifier" — ouvre la modale d'édition directement depuis la liste
    container.querySelectorAll('.btn-edit-pathway').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            const pw = pathways.find(p => p.id === btn.dataset.id);
            if (!pw) return;
            const currentPublicIds = await onGetFormationPublicIds?.(pw.id) || [];
            showEditFormationModal(pw, titresPro, publicsCibles, categories, currentPublicIds,
                (data) => onEditPathway?.(pw.id, data), onCreatePublicCible, onCreateCategory);
        });
    });

    // Bouton "Supprimer" — archive la formation (réversible, cf. statut)
    container.querySelectorAll('.btn-delete-pathway').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!confirm(`Supprimer le parcours "${btn.dataset.titre}" ? Il disparaîtra de la liste (récupérable via le filtre "Archivé uniquement").`)) return;
            onDeletePathway?.(btn.dataset.id);
        });
    });

    bindFilterBar(container);
}

// ── Barre de filtres ─────────────────────────────────────────
function renderFilterBar(categories) {
    return `
    <div class="admin-filter-bar">
      <div class="admin-filter-field admin-filter-field--search">
        <label class="admin-filter-label" for="pfSearch">Recherche</label>
        <div class="admin-filter-search">
          <i data-lucide="search" aria-hidden="true"></i>
          <input type="text" id="pfSearch" placeholder="Titre ou code…">
        </div>
      </div>
      <div class="admin-filter-field">
        <label class="admin-filter-label" for="pfCategorie">Catégorie</label>
        <select id="pfCategorie">
          <option value="">Toutes</option>
          ${categories.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}
        </select>
      </div>
      <div class="admin-filter-field">
        <label class="admin-filter-label" for="pfStatut">Statut</label>
        <select id="pfStatut">
          <option value="">Tous (hors archivés)</option>
          <option value="publie">Publié</option>
          <option value="brouillon">Brouillon</option>
          <option value="archive">Archivé uniquement</option>
        </select>
      </div>
      <div class="admin-filter-field">
        <label class="admin-filter-label" for="pfModalite">Modalité</label>
        <select id="pfModalite">
          <option value="">Toutes</option>
          <option value="presentiel">Présentiel</option>
          <option value="distanciel">Distanciel</option>
          <option value="hybride">Hybride</option>
        </select>
      </div>
      <button class="btn btn-ghost btn-sm admin-filter-reset" id="pfReset" title="Réinitialiser les filtres">
        <i data-lucide="x" aria-hidden="true"></i> Réinitialiser
      </button>
    </div>`;
}

function bindFilterBar(container) {
    const search   = container.querySelector('#pfSearch');
    const categorie = container.querySelector('#pfCategorie');
    const statut   = container.querySelector('#pfStatut');
    const modalite = container.querySelector('#pfModalite');
    const resetBtn = container.querySelector('#pfReset');
    if (!search) return; // pas de filtres si aucun parcours

    const countLabel = container.querySelector('#parcoursCount');

    const applyFilters = () => {
        const q        = search.value.trim().toLowerCase();
        const catVal   = categorie.value;
        const statVal  = statut.value;
        const modVal   = modalite.value;

        let visibleCount = 0;
        container.querySelectorAll('.parcours-card-wrap').forEach(wrap => {
            const matchQ   = !q || wrap.dataset.titre.includes(q) || wrap.dataset.code.includes(q);
            const matchCat = !catVal  || wrap.dataset.categorieId === catVal;
            // Par défaut ("Tous"), les parcours archivés restent masqués :
            // il faut choisir explicitement "Archivé uniquement" pour les voir.
            const matchStat = statVal ? wrap.dataset.statut === statVal : wrap.dataset.statut !== 'archive';
            const matchMod = !modVal  || wrap.dataset.modalite === modVal;
            const visible = matchQ && matchCat && matchStat && matchMod;
            wrap.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });

        // Masquer les sections (Modèles / Instances / Autres) devenues vides
        container.querySelectorAll('.parcours-section').forEach(section => {
            const anyVisible = [...section.querySelectorAll('.parcours-card-wrap')].some(w => w.style.display !== 'none');
            section.style.display = anyVisible ? '' : 'none';
        });

        container.querySelector('#parcoursNoMatch').style.display = visibleCount === 0 ? '' : 'none';
        if (countLabel) countLabel.textContent = `${visibleCount} parcours disponible${visibleCount > 1 ? 's' : ''}`;
    };

    [search, categorie, statut, modalite].forEach(el => {
        el.addEventListener('input', applyFilters);
        el.addEventListener('change', applyFilters);
    });
    resetBtn?.addEventListener('click', () => {
        search.value = ''; categorie.value = ''; statut.value = ''; modalite.value = '';
        applyFilters();
    });

    applyFilters(); // masquer les archivés dès l'affichage initial
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
        <div class="parcours-card-wrap"
             data-titre="${esc(pw.titre).toLowerCase()}"
             data-code="${esc(pw.code || '').toLowerCase()}"
             data-categorie-id="${pw.categorie_id || ''}"
             data-statut="${pw.statut || 'publie'}"
             data-modalite="${pw.modalite || ''}">
          <a href="#/admin/parcours/${pw.id}" class="parcours-card ${isTemplate ? 'parcours-card--template' : ''} ${isInstance ? 'parcours-card--instance' : ''}">
            ${isTemplate || isInstance ? `
            <div class="parcours-card__icon">
              <i data-lucide="${isTemplate ? 'layout-template' : 'copy'}" aria-hidden="true"></i>
            </div>` : `
            <div class="parcours-card__icon parcours-card__icon--mono" style="background:${pathwayColor(pw).bg};color:${pathwayColor(pw).fg}">
              ${esc(pathwayMonogram(pw))}
            </div>`}
            <div class="parcours-card__body">
              <div class="parcours-card__titre-row">
                ${pw.code ? `<span class="badge badge-outline badge-sm text-mono">${esc(pw.code)}</span>` : ''}
                <span class="parcours-card__titre">${esc(pw.titre)}</span>
                ${isTemplate  ? `<span class="badge badge-template">Modèle</span>` : ''}
                ${isInstance  ? `<span class="badge badge-instance">Instance</span>` : ''}
                ${pw.statut === 'brouillon' ? `<span class="badge badge-warning badge-sm">Brouillon</span>` : ''}
                ${pw.statut === 'archive'   ? `<span class="badge badge-neutral badge-sm">Archivé</span>`   : ''}
              </div>
              ${(pw.categorie_nom || pw.niveau || pw.modalite || pw.lieu) ? `
              <div class="parcours-card__meta" style="flex-wrap:wrap;gap:var(--space-2)">
                ${pw.categorie_nom ? `<span><i data-lucide="tag" style="width:12px;height:12px"></i> ${esc(pw.categorie_nom)}</span>` : ''}
                ${pw.niveau        ? `<span><i data-lucide="signal" style="width:12px;height:12px"></i> ${esc(pw.niveau)}</span>` : ''}
                ${pw.modalite      ? `<span><i data-lucide="monitor" style="width:12px;height:12px"></i> ${esc(MODALITE_LABELS[pw.modalite] || pw.modalite)}</span>` : ''}
                ${pw.lieu          ? `<span><i data-lucide="map-pin" style="width:12px;height:12px"></i> ${esc(pw.lieu)}</span>` : ''}
              </div>` : ''}
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
              ${pw.publics?.length ? `
              <div class="parcours-card__meta" style="flex-wrap:wrap;gap:var(--space-1)">
                ${pw.publics.map(nom => `<span class="badge badge-outline badge-sm">${esc(nom)}</span>`).join('')}
              </div>` : ''}
            </div>
            <div class="parcours-card__arrow">
              <i data-lucide="chevron-right" aria-hidden="true"></i>
            </div>
          </a>
          <!-- Actions rapides sous la carte -->
          <div class="parcours-card-actions">
            <div class="parcours-card-actions__left">
              ${isTemplate ? `
              <button class="btn btn-sm btn-cta btn-instantiate"
                      data-id="${pw.id}" data-titre="${esc(pw.titre)}"
                      title="Créer une instance de ce modèle pour une cohorte">
                <i data-lucide="git-branch" aria-hidden="true"></i> Instancier
              </button>` : ''}
              <button class="btn btn-sm btn-ghost btn-toggle-template"
                      data-id="${pw.id}"
                      title="${isTemplate ? 'Retirer le statut modèle' : 'Marquer comme modèle de formation'}">
                <i data-lucide="layout-template" aria-hidden="true"></i>
                ${isTemplate ? 'Retirer modèle' : 'Modèle'}
              </button>
            </div>
            <div class="parcours-card-actions__right">
              <button class="btn-icon btn-icon--edit btn-edit-pathway"
                      data-id="${pw.id}" title="Modifier ce parcours" aria-label="Modifier ce parcours">
                <i data-lucide="pencil" aria-hidden="true"></i>
              </button>
              <button class="btn-icon btn-icon--delete btn-delete-pathway"
                      data-id="${pw.id}" data-titre="${esc(pw.titre)}"
                      title="Archiver ce parcours" aria-label="Archiver ce parcours">
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>
            </div>
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
function showCreatePathwayModal(container, titresPro, financements, publicsCibles, categories, onConfirm, onCreatePublicCible, onCreateCategory) {
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
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Code</label>
            <input type="text" id="pwCode" class="form-input" placeholder="Ex : GCF34">
          </div>
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select id="pwStatut" class="form-input">
              <option value="publie" selected>Publié</option>
              <option value="brouillon">Brouillon</option>
              <option value="archive">Archivé</option>
            </select>
          </div>
          <div class="form-group" style="flex:2">
            <label class="form-label">Catégorie</label>
            <div style="display:flex;gap:var(--space-2)">
              <select id="pwCategorie" class="form-input">
                <option value="">— Aucune —</option>
                ${categories.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}
              </select>
              <input type="text" id="pwNewCategorie" class="form-input form-input--sm" style="max-width:160px" placeholder="Nouvelle…">
              <button type="button" class="btn btn-ghost btn-sm" id="btnAddCategorie">
                <i data-lucide="plus" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Durée (heures)</label>
            <input type="number" id="pwDureeHeures" class="form-input" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Durée (jours)</label>
            <input type="number" id="pwDureeJours" class="form-input" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Niveau</label>
            <input type="text" id="pwNiveau" class="form-input" placeholder="Ex : Niveau 5, Bac+2…">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Modalité</label>
            <select id="pwModalite" class="form-input">
              <option value="">— Non précisée —</option>
              <option value="presentiel">Présentiel</option>
              <option value="distanciel">Distanciel</option>
              <option value="hybride">Hybride</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Langue</label>
            <input type="text" id="pwLangue" class="form-input" value="fr" style="max-width:80px">
          </div>
          <div class="form-group">
            <label class="form-label">Lieu</label>
            <input type="text" id="pwLieu" class="form-input" placeholder="Ex : Montpellier">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Prérequis</label>
          <textarea id="pwPrerequis" class="form-input form-textarea" rows="2"
                    placeholder="Ex : Niveau B1 en français, maîtrise du clavier…"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Objectifs pédagogiques</label>
          <textarea id="pwObjectifs" class="form-input form-textarea" rows="2"
                    placeholder="Ex : Être capable de gérer un standard téléphonique…"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Public(s) cible(s)</label>
          <div id="pwPublicsList" style="display:flex;flex-direction:column;gap:var(--space-1)">
            ${publicsCibles.map(p => `
            <label class="form-checkbox-label" style="margin-top:0">
              <input type="checkbox" value="${p.id}" class="pw-public-cb"> ${esc(p.nom)}
            </label>`).join('') || '<p class="form-hint">Aucun public cible défini pour l\'instant.</p>'}
          </div>
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2)">
            <input type="text" id="pwNewPublic" class="form-input form-input--sm" placeholder="Nouveau public cible…">
            <button type="button" class="btn btn-ghost btn-sm" id="btnAddPublic">
              <i data-lucide="plus" aria-hidden="true"></i> Ajouter
            </button>
          </div>
        </div>
        <p class="form-hint">
          <i data-lucide="info" aria-hidden="true" style="width:12px;height:12px"></i>
          D'autres modes de financement pourront être ajoutés plus tard.
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

    // Ajouter une nouvelle catégorie à la volée
    overlay.querySelector('#btnAddCategorie')?.addEventListener('click', async () => {
        const input = overlay.querySelector('#pwNewCategorie');
        const nom   = input?.value.trim();
        if (!nom) return;
        const id = await onCreateCategory?.(nom);
        if (id) {
            const sel = overlay.querySelector('#pwCategorie');
            const opt = document.createElement('option');
            opt.value = id; opt.textContent = nom; opt.selected = true;
            sel.appendChild(opt);
            input.value = '';
        }
    });

    // Ajouter un nouveau public cible à la volée
    overlay.querySelector('#btnAddPublic')?.addEventListener('click', async () => {
        const input = overlay.querySelector('#pwNewPublic');
        const nom   = input?.value.trim();
        if (!nom) return;
        const id = await onCreatePublicCible?.(nom);
        if (id) {
            const list = overlay.querySelector('#pwPublicsList');
            list.querySelector('.form-hint')?.remove();
            const label = document.createElement('label');
            label.className = 'form-checkbox-label';
            label.style.marginTop = '0';
            label.innerHTML = `<input type="checkbox" value="${id}" class="pw-public-cb" checked> ${esc(nom)}`;
            list.appendChild(label);
            input.value = '';
        }
    });

    overlay.querySelector('#pwConfirmBtn')?.addEventListener('click', async () => {
        const titre = overlay.querySelector('#pwTitre')?.value.trim();
        if (!titre) { overlay.querySelector('#pwTitre')?.focus(); return; }

        const btn = overlay.querySelector('#pwConfirmBtn');
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Création…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        const publicIds = [...overlay.querySelectorAll('.pw-public-cb:checked')].map(cb => cb.value);

        await onConfirm({
            titre,
            description:    overlay.querySelector('#pwDesc')?.value.trim()       || null,
            titre_pro_id:   overlay.querySelector('#pwTitrePro')?.value          || null,
            financement_id: overlay.querySelector('#pwFinancement')?.value       || null,
            code:           overlay.querySelector('#pwCode')?.value.trim()       || null,
            statut:         overlay.querySelector('#pwStatut')?.value            || 'publie',
            categorie_id:   overlay.querySelector('#pwCategorie')?.value         || null,
            duree_heures:   overlay.querySelector('#pwDureeHeures')?.value       ? parseInt(overlay.querySelector('#pwDureeHeures').value, 10) : null,
            duree_jours:    overlay.querySelector('#pwDureeJours')?.value        ? parseInt(overlay.querySelector('#pwDureeJours').value, 10)  : null,
            niveau:         overlay.querySelector('#pwNiveau')?.value.trim()     || null,
            modalite:       overlay.querySelector('#pwModalite')?.value          || null,
            langue:         overlay.querySelector('#pwLangue')?.value.trim()     || 'fr',
            lieu:           overlay.querySelector('#pwLieu')?.value.trim()       || null,
            prerequis:      overlay.querySelector('#pwPrerequis')?.value.trim()  || null,
            objectifs:      overlay.querySelector('#pwObjectifs')?.value.trim()  || null,
            public_ids:     publicIds,
        });
        overlay.remove();
    });
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
