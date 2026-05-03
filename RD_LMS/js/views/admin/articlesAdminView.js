/**
 * articlesAdminView.js — Gestion des articles et sources RSS (Espace Zen)
 * Deux onglets : Articles | Sources RSS
 */

// ── Constantes ──────────────────────────────────────────────────
const CATEGORIES = [
    { value: 'inspiration', label: 'Inspiration',  color: 'primary'   },
    { value: 'bien-etre',   label: 'Bien-être',    color: 'secondary' },
    { value: 'methode',     label: 'Méthode',      color: 'accent'    },
    { value: 'cariere',     label: 'Carrière',     color: 'primary'   },
    { value: 'actualite',   label: 'Actualité',    color: 'secondary' },
];

const SOURCE_TYPES = [
    { value: 'rss',      label: 'Flux RSS'        },
    { value: 'manuel',   label: 'Manuel (lien)'   },
    { value: 'scraping', label: 'Scraping'         },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

function catBadge(val) {
    const c = CAT_MAP[val] || { label: val, color: 'primary' };
    return `<span class="badge badge--${c.color}">${esc(c.label)}</span>`;
}

// ── Rendu principal ─────────────────────────────────────────────
export function renderArticlesAdmin(container, {
    articles = [],
    sources  = [],
    tab      = 'articles',
    onCreate, onEdit, onDelete,
    onCreateSource, onEditSource, onDeleteSource,
    onSyncRSS,
}) {
    container.innerHTML = `
    <div class="page-admin">

      <div class="dashboard-header">
        <div class="dashboard-greeting">
          <h1 class="dashboard-greeting__hello">Espace Zen — Contenus</h1>
          <p class="dashboard-greeting__date">Gérer les articles et les sources RSS pour la section Lecture</p>
        </div>
      </div>

      <!-- Onglets -->
      <div class="adm-tabs">
        <button class="adm-tab${tab === 'articles' ? ' adm-tab--active' : ''}" data-tab="articles">
          <i data-lucide="file-text" aria-hidden="true"></i> Articles
          <span class="adm-tab__count">${articles.length}</span>
        </button>
        <button class="adm-tab${tab === 'sources' ? ' adm-tab--active' : ''}" data-tab="sources">
          <i data-lucide="rss" aria-hidden="true"></i> Sources RSS
          <span class="adm-tab__count">${sources.length}</span>
        </button>
      </div>

      <!-- Panneau Articles -->
      <div class="adm-tab-panel${tab === 'articles' ? ' adm-tab-panel--active' : ''}" data-panel="articles">
        <div class="adm-panel-header">
          <h2 class="adm-panel-header__title">Articles (<span id="art-count">${articles.length}</span>)</h2>
          <button class="btn btn-cta" id="btnNewArticle">
            <i data-lucide="plus" aria-hidden="true"></i> Nouvel article
          </button>
        </div>

        ${articles.length === 0
            ? `<div class="adm-empty">
                 <i data-lucide="file-text" aria-hidden="true"></i>
                 <p>Aucun article pour l'instant. Ajoutez votre premier article manuellement ou créez une source RSS.</p>
               </div>`
            : `<div class="table-wrapper">
                 <table class="admin-table">
                   <thead>
                     <tr>
                       <th>Titre</th>
                       <th>Catégorie</th>
                       <th>Lecture</th>
                       <th>Lien externe</th>
                       <th>Statut</th>
                       <th></th>
                     </tr>
                   </thead>
                   <tbody>
                     ${articles.map(a => `
                     <tr>
                       <td>
                         <div class="adm-cell-title">${esc(a.titre)}</div>
                         ${a.excerpt ? `<div class="adm-cell-sub">${esc(a.excerpt.substring(0, 80))}${a.excerpt.length > 80 ? '…' : ''}</div>` : ''}
                       </td>
                       <td>${catBadge(a.categorie)}</td>
                       <td>${a.duree_lecture ? `<span class="adm-cell-meta"><i data-lucide="clock"></i>${a.duree_lecture} min</span>` : '—'}</td>
                       <td>${a.url_externe
                            ? `<a href="${esc(a.url_externe)}" target="_blank" rel="noopener" class="table-ext-link">
                                 <i data-lucide="external-link"></i> Ouvrir
                               </a>`
                            : '—'}</td>
                       <td>${a.actif
                            ? `<span class="badge badge--success">Publié</span>`
                            : `<span class="badge badge--muted">Brouillon</span>`}</td>
                       <td class="table-actions">
                         <button class="btn-icon btn-icon--sm" data-action="edit-article" data-id="${a.id}" title="Modifier">
                           <i data-lucide="edit-2" aria-hidden="true"></i>
                         </button>
                         <button class="btn-icon btn-icon--sm btn-icon--danger" data-action="delete-article" data-id="${a.id}" data-titre="${esc(a.titre)}" title="Supprimer">
                           <i data-lucide="trash-2" aria-hidden="true"></i>
                         </button>
                       </td>
                     </tr>`).join('')}
                   </tbody>
                 </table>
               </div>`}
      </div>

      <!-- Panneau Sources -->
      <div class="adm-tab-panel${tab === 'sources' ? ' adm-tab-panel--active' : ''}" data-panel="sources">
        <div class="adm-panel-header">
          <h2 class="adm-panel-header__title">Sources RSS (<span id="src-count">${sources.length}</span>)</h2>
          <div style="display:flex;gap:var(--space-2)">
            ${onSyncRSS && sources.filter(s => s.actif && s.url_rss).length > 0 ? `
            <button class="btn btn-secondary" id="btnSyncRSS">
              <i data-lucide="refresh-cw" aria-hidden="true"></i>
              Synchroniser les flux (${sources.filter(s => s.actif && s.url_rss).length})
            </button>` : ''}
            <button class="btn btn-cta" id="btnNewSource">
              <i data-lucide="plus" aria-hidden="true"></i> Nouvelle source
            </button>
          </div>
        </div>

        <div class="tp-notice tp-notice--info" style="margin-bottom: var(--space-5)">
          <i data-lucide="info" aria-hidden="true"></i>
          <div>
            Cliquez sur <strong>Synchroniser les flux</strong> pour importer les derniers articles
            des sources RSS actives. Les doublons sont ignorés automatiquement.
          </div>
        </div>

        ${sources.length === 0
            ? `<div class="adm-empty">
                 <i data-lucide="rss" aria-hidden="true"></i>
                 <p>Aucune source configurée. Ajoutez des flux RSS ou des sources manuelles.</p>
               </div>`
            : `<div class="table-wrapper">
                 <table class="admin-table">
                   <thead>
                     <tr>
                       <th>Nom</th>
                       <th>Type</th>
                       <th>Catégorie</th>
                       <th>URL / Flux</th>
                       <th>Statut</th>
                       <th>Synchro</th>
                       <th></th>
                     </tr>
                   </thead>
                   <tbody>
                     ${sources.map(s => `
                     <tr>
                       <td>
                         <div class="adm-cell-title">${esc(s.nom)}</div>
                         ${s.description ? `<div class="adm-cell-sub">${esc(s.description.substring(0, 70))}${s.description.length > 70 ? '…' : ''}</div>` : ''}
                       </td>
                       <td><span class="badge badge--muted">${esc(SOURCE_TYPES.find(t => t.value === s.type)?.label || s.type)}</span></td>
                       <td>${catBadge(s.categorie)}</td>
                       <td>${s.url_rss
                            ? `<a href="${esc(s.url_rss)}" target="_blank" rel="noopener" class="table-ext-link">
                                 <i data-lucide="external-link"></i> Voir
                               </a>`
                            : '—'}</td>
                       <td>${s.actif
                            ? `<span class="badge badge--success">Active</span>`
                            : `<span class="badge badge--muted">Inactive</span>`}</td>
                       <td>${s.derniere_sync
                            ? `<span class="adm-cell-meta"><i data-lucide="refresh-cw"></i>${new Date(s.derniere_sync).toLocaleDateString('fr-FR')}</span>`
                            : '<span class="adm-cell-meta" style="color:var(--text-muted)">Jamais</span>'}</td>
                       <td class="table-actions">
                         <button class="btn-icon btn-icon--sm" data-action="edit-source" data-id="${s.id}" title="Modifier">
                           <i data-lucide="edit-2" aria-hidden="true"></i>
                         </button>
                         <button class="btn-icon btn-icon--sm btn-icon--danger" data-action="delete-source" data-id="${s.id}" data-nom="${esc(s.nom)}" title="Supprimer">
                           <i data-lucide="trash-2" aria-hidden="true"></i>
                         </button>
                       </td>
                     </tr>`).join('')}
                   </tbody>
                 </table>
               </div>`}
      </div>

    </div>`;

    // ── Événements tabs ──
    container.querySelectorAll('.adm-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const t = btn.dataset.tab;
            container.querySelectorAll('.adm-tab').forEach(b => b.classList.toggle('adm-tab--active', b.dataset.tab === t));
            container.querySelectorAll('.adm-tab-panel').forEach(p => p.classList.toggle('adm-tab-panel--active', p.dataset.panel === t));
        });
    });

    // ── Bouton Nouvel article ──
    container.querySelector('#btnNewArticle')?.addEventListener('click', () => {
        showArticleModal(container, null, async (data) => {
            await onCreate(data);
        });
    });

    // ── Bouton Synchroniser RSS ──────────────────────────────────
    container.querySelector('#btnSyncRSS')?.addEventListener('click', async () => {
        const btn = container.querySelector('#btnSyncRSS');
        const rssSources = sources.filter(s => s.actif && s.url_rss);
        if (!rssSources.length) return;

        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Synchronisation…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        try {
            const result = await onSyncRSS(rssSources);
            if (result) {
                let msg = `✅ ${result.added} article(s) importé(s)`;
                if (result.skipped) msg += `, ${result.skipped} ignoré(s) (doublons)`;
                if (result.errors?.length) {
                    msg += `\n\n⚠️ ${result.errors.length} erreur(s) :\n`;
                    msg += result.errors.map(e => `• ${e}`).join('\n');
                }
                alert(msg);
            }
        } finally {
            btn.disabled  = false;
            btn.innerHTML = `<i data-lucide="refresh-cw" aria-hidden="true"></i> Synchroniser les flux (${rssSources.length})`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
    });

    // ── Bouton Nouvelle source ──
    container.querySelector('#btnNewSource')?.addEventListener('click', () => {
        showSourceModal(container, null, async (data) => {
            await onCreateSource(data);
        });
    });

    // ── Actions tableau articles ──
    container.querySelectorAll('[data-action="edit-article"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const art = articles.find(a => a.id === btn.dataset.id);
            if (!art) return;
            showArticleModal(container, art, async (data) => {
                await onEdit(art.id, data);
            });
        });
    });
    container.querySelectorAll('[data-action="delete-article"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`Supprimer l'article "${btn.dataset.titre}" ?`)) return;
            await onDelete(btn.dataset.id);
        });
    });

    // ── Actions tableau sources ──
    container.querySelectorAll('[data-action="edit-source"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const src = sources.find(s => s.id === btn.dataset.id);
            if (!src) return;
            showSourceModal(container, src, async (data) => {
                await onEditSource(src.id, data);
            });
        });
    });
    container.querySelectorAll('[data-action="delete-source"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`Supprimer la source "${btn.dataset.nom}" ?`)) return;
            await onDeleteSource(btn.dataset.id);
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Modale Article ──────────────────────────────────────────────
export function showArticleModal(container, article, onConfirm) {
    const isEdit  = !!article;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="art-modal-title">
      <div class="modal-header">
        <h2 class="modal-title" id="art-modal-title">
          <i data-lucide="${isEdit ? 'edit-2' : 'plus-circle'}" aria-hidden="true"></i>
          ${isEdit ? 'Modifier l\'article' : 'Nouvel article'}
        </h2>
        <button class="modal-close" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="modal-body">
        <form id="articleForm" class="form-grid" novalidate>

          <div class="form-group form-group--full">
            <label class="form-label" for="art-titre">Titre <span class="form-required">*</span></label>
            <input id="art-titre" name="titre" type="text" class="form-input"
              value="${esc(article?.titre || '')}" required placeholder="Titre de l'article">
          </div>

          <div class="form-group form-group--full">
            <label class="form-label" for="art-excerpt">Extrait / Résumé</label>
            <textarea id="art-excerpt" name="excerpt" class="form-input" rows="2"
              placeholder="Court résumé affiché dans la liste…">${esc(article?.excerpt || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="art-categorie">Catégorie</label>
            <select id="art-categorie" name="categorie" class="form-input">
              ${CATEGORIES.map(c => `<option value="${c.value}"${article?.categorie === c.value ? ' selected' : ''}>${c.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="art-duree">Durée de lecture (min)</label>
            <input id="art-duree" name="duree_lecture" type="number" min="1" max="60" class="form-input"
              value="${article?.duree_lecture || ''}" placeholder="Ex: 5">
          </div>

          <div class="form-group form-group--full">
            <label class="form-label" for="art-url-ext">URL externe (lien vers l'article)</label>
            <input id="art-url-ext" name="url_externe" type="url" class="form-input"
              value="${esc(article?.url_externe || '')}" placeholder="https://…">
            <span class="form-hint">Si renseigné, le bouton "Lire" ouvrira ce lien dans un nouvel onglet.</span>
          </div>

          <div class="form-group form-group--full">
            <label class="form-label" for="art-image">URL de l'image</label>
            <input id="art-image" name="image_url" type="url" class="form-input"
              value="${esc(article?.image_url || '')}" placeholder="https://…">
          </div>

          <div class="form-group form-group--full">
            <label class="form-label" for="art-contenu">Contenu (optionnel — si article hébergé ici)</label>
            <textarea id="art-contenu" name="contenu" class="form-input" rows="5"
              placeholder="Contenu complet de l'article (optionnel si URL externe renseignée)…">${esc(article?.contenu || '')}</textarea>
          </div>

          <div class="form-group form-group--full">
            <label class="form-toggle-label">
              <input type="checkbox" name="actif" ${article?.actif !== false ? 'checked' : ''}>
              <span>Article publié (visible par les stagiaires)</span>
            </label>
          </div>

        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="artModalCancel">Annuler</button>
        <button class="btn btn-cta" id="artModalConfirm">
          <i data-lucide="${isEdit ? 'save' : 'plus'}" aria-hidden="true"></i>
          ${isEdit ? 'Enregistrer' : 'Créer l\'article'}
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('#artModalCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#artModalConfirm').addEventListener('click', async () => {
        const form   = overlay.querySelector('#articleForm');
        const data   = Object.fromEntries(new FormData(form).entries());
        data.actif   = form.querySelector('[name="actif"]').checked;

        if (!data.titre?.trim()) {
            overlay.querySelector('#art-titre').focus();
            overlay.querySelector('#art-titre').classList.add('input-error');
            return;
        }

        const btn    = overlay.querySelector('#artModalConfirm');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        try {
            await onConfirm(data);
            close();
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Enregistrer' : 'Créer'}`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            alert('Erreur : ' + err.message);
        }
    });
}

// ── Modale Source RSS ────────────────────────────────────────────
export function showSourceModal(container, source, onConfirm) {
    const isEdit  = !!source;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="src-modal-title">
      <div class="modal-header">
        <h2 class="modal-title" id="src-modal-title">
          <i data-lucide="${isEdit ? 'edit-2' : 'plus-circle'}" aria-hidden="true"></i>
          ${isEdit ? 'Modifier la source' : 'Nouvelle source'}
        </h2>
        <button class="modal-close" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="modal-body">
        <form id="sourceForm" class="form-grid" novalidate>

          <div class="form-group form-group--full">
            <label class="form-label" for="src-nom">Nom <span class="form-required">*</span></label>
            <input id="src-nom" name="nom" type="text" class="form-input"
              value="${esc(source?.nom || '')}" required placeholder="Ex: Harvard Business Review FR">
          </div>

          <div class="form-group">
            <label class="form-label" for="src-type">Type de source</label>
            <select id="src-type" name="type" class="form-input">
              ${SOURCE_TYPES.map(t => `<option value="${t.value}"${source?.type === t.value ? ' selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="src-categorie">Catégorie</label>
            <select id="src-categorie" name="categorie" class="form-input">
              ${CATEGORIES.map(c => `<option value="${c.value}"${source?.categorie === c.value ? ' selected' : ''}>${c.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-group form-group--full">
            <label class="form-label" for="src-url">URL du flux RSS / lien</label>
            <input id="src-url" name="url_rss" type="url" class="form-input"
              value="${esc(source?.url_rss || '')}" placeholder="https://…/rss.xml">
            <span class="form-hint">Pour les sources manuelles, indiquez l'URL de la page principale.</span>
          </div>

          <div class="form-group form-group--full">
            <label class="form-label" for="src-desc">Description</label>
            <textarea id="src-desc" name="description" class="form-input" rows="2"
              placeholder="Description courte de la source…">${esc(source?.description || '')}</textarea>
          </div>

          <div class="form-group form-group--full">
            <label class="form-toggle-label">
              <input type="checkbox" name="actif" ${source?.actif !== false ? 'checked' : ''}>
              <span>Source active (utilisée pour récupérer du contenu)</span>
            </label>
          </div>

        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="srcModalCancel">Annuler</button>
        <button class="btn btn-cta" id="srcModalConfirm">
          <i data-lucide="${isEdit ? 'save' : 'plus'}" aria-hidden="true"></i>
          ${isEdit ? 'Enregistrer' : 'Créer la source'}
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('#srcModalCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#srcModalConfirm').addEventListener('click', async () => {
        const form   = overlay.querySelector('#sourceForm');
        const data   = Object.fromEntries(new FormData(form).entries());
        data.actif   = form.querySelector('[name="actif"]').checked;

        if (!data.nom?.trim()) {
            overlay.querySelector('#src-nom').focus();
            overlay.querySelector('#src-nom').classList.add('input-error');
            return;
        }

        const btn    = overlay.querySelector('#srcModalConfirm');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        try {
            await onConfirm(data);
            close();
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Enregistrer' : 'Créer'}`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            alert('Erreur : ' + err.message);
        }
    });
}

// ── Helper XSS ──────────────────────────────────────────────────
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
