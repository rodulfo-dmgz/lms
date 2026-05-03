import { mountQuizBlocks }  from '../../utils/quizPlayer.js';
import { mountDevoirBlocks } from '../../utils/devoirUpload.js';

// ── Blocs simples ─────────────────────────────────────────────
const SIMPLE_TYPES = [
    { type: 'heading',    icon: 'heading',       label: 'Titre de section' },
    { type: 'objectives', icon: 'target',        label: 'Objectifs' },
    { type: 'text',       icon: 'type',          label: 'Texte libre' },
    { type: 'video',      icon: 'play',          label: 'Vidéo' },
    { type: 'audio',      icon: 'headphones',    label: 'Audio' },
    { type: 'pdf',        icon: 'file-text',     label: 'PDF' },
    { type: 'xlsx',       icon: 'table-2',       label: 'Excel' },
    { type: 'docx',       icon: 'file-text',     label: 'Word' },
    { type: 'pptx',       icon: 'presentation',  label: 'PowerPoint' },
    { type: 'link',       icon: 'link',          label: 'Lien externe' },
    { type: 'activity',   icon: 'pencil-line',   label: 'Activité' },
    { type: 'keypoints',  icon: 'star',          label: 'Points clés' },
    { type: 'spacer',     icon: 'minus',         label: 'Séparateur' },
    { type: 'quiz',       icon: 'help-circle',   label: 'Quiz' },
    { type: 'devoir',     icon: 'upload',        label: 'Devoir à rendre' },
];

// ── Blocs conteneurs ──────────────────────────────────────────
const CONTAINER_TYPES = [
    { type: 'accordion', icon: 'layers',       label: 'Accordéon' },
    { type: 'columns2',  icon: 'panel-left',   label: '2 colonnes' },
    { type: 'columns4',  icon: 'layout-grid',  label: 'Colonnes (flex)' },
];

const ALL_TYPES = [...SIMPLE_TYPES, ...CONTAINER_TYPES];

// ── Dispositions colonnes ─────────────────────────────────────
const COL_LAYOUTS = {
    // ── 2 colonnes ──────────────────────────────────────────────
    '1+1':       { label: '2 colonnes égales',            slots: 2, grid: '1fr 1fr'                    },
    '2+1':       { label: '2/3 gauche + 1/3 droite',      slots: 2, grid: '2fr 1fr'                    },
    '1+2':       { label: '1/3 gauche + 2/3 droite',      slots: 2, grid: '1fr 2fr'                    },
    '3+1':       { label: '¾ gauche + ¼ droite',          slots: 2, grid: '3fr 1fr'                    },
    '1+3':       { label: '¼ gauche + ¾ droite',          slots: 2, grid: '1fr 3fr'                    },
    // ── 3 colonnes ──────────────────────────────────────────────
    '1+1+1':     { label: '3 colonnes égales',             slots: 3, grid: '1fr 1fr 1fr'               },
    '1+2+1':     { label: '1 · Centre large · 1',          slots: 3, grid: '1fr 2fr 1fr'               },
    '2+1+1':     { label: 'Large gauche + 2 droites',      slots: 3, grid: '2fr 1fr 1fr'               },
    // ── 4 colonnes ──────────────────────────────────────────────
    '1+1+1+1':   { label: '4 colonnes égales',             slots: 4, grid: 'repeat(4, 1fr)'            },
    // ── 5 colonnes ──────────────────────────────────────────────
    '1x5':       { label: '5 colonnes égales',             slots: 5, grid: 'repeat(5, 1fr)'            },
    '2+1x4':     { label: 'Large gauche + 4 colonnes',     slots: 5, grid: '2fr 1fr 1fr 1fr 1fr'      },
    // ── 6 colonnes ──────────────────────────────────────────────
    '1x6':       { label: '6 colonnes égales',             slots: 6, grid: 'repeat(6, 1fr)'            },
    // ── 7 colonnes ──────────────────────────────────────────────
    '1x7':       { label: '7 colonnes égales',             slots: 7, grid: 'repeat(7, 1fr)'            },
};

// ── État global ────────────────────────────────────────────────
let _blocks    = [];
let _onSave    = null;
let _onDraft   = null;
let _saved     = true;
let _seance    = null;
let _container = null;
let _dragIdx   = null;

// ── Entrée principale ─────────────────────────────────────────
export function renderSeanceEditor(container, { seance, onSave, onSaveDraft, onSaveTitle, onBack }) {
    _onSave    = onSave;
    _onDraft   = onSaveDraft || null;
    _blocks    = parseBlocks(seance.contenu_blocks, seance.contenu);
    _saved     = true;
    _seance    = seance;
    _container = container;

    // ── Focus mode : masquer la sidebar pour maximiser le canvas ──
    const appLayout = document.querySelector('.app-layout');
    appLayout?.classList.add('editor-focus');

    const legacyImported = _blocks.length === 1 && _blocks[0].type === 'rawhtml';

    container.innerHTML = `
    <div class="editor-shell">

      <div class="editor-topbar">
        <button class="btn btn-ghost btn-sm" id="editorBack">
          <i data-lucide="arrow-left" aria-hidden="true"></i> Retour
        </button>
        <!-- Bouton toggle sidebar -->
        <button class="btn btn-ghost btn-sm editor-sidebar-toggle" id="btnToggleSidebar"
                title="Afficher / masquer la navigation">
          <i data-lucide="panel-left-open" aria-hidden="true"></i>
        </button>
        <div class="editor-topbar-title">
          <i data-lucide="file-edit" aria-hidden="true"></i>
          <span id="editorTitleDisplay">${esc(seance.titre)}</span>
        </div>
        <div class="editor-topbar-actions">
          <span id="editorSavedBadge" class="badge badge-success" style="display:none">
            <i data-lucide="check" aria-hidden="true"></i> Sauvegardé
          </span>
          <button class="btn btn-ghost btn-sm" id="btnPreviewTab">
            <i data-lucide="external-link" aria-hidden="true"></i> Aperçu stagiaire
          </button>
          ${_onDraft ? `
          <button class="btn btn-secondary btn-sm" id="btnDraft">
            <i data-lucide="file-clock" aria-hidden="true"></i> Brouillon
          </button>` : ''}
          <button class="btn btn-cta btn-sm" id="btnSaveAll">
            <i data-lucide="send" aria-hidden="true"></i> Publier
          </button>
        </div>
      </div>

      ${legacyImported ? `
      <div class="legacy-import-notice" id="legacyNotice">
        <i data-lucide="info" aria-hidden="true"></i>
        <span>Contenu existant importé automatiquement. Modifiez-le ou reconstruisez avec les blocs.</span>
        <button class="btn btn-ghost btn-sm" id="dismissLegacy">✕</button>
      </div>` : ''}

      <div class="editor-layout">

        <aside class="editor-sidebar-props">
          <div class="editor-props-section">
            <h3 class="editor-props-title">Informations</h3>
            <div class="form-group">
              <label class="form-label">Titre</label>
              <input type="text" id="propTitre" class="form-input form-input--sm" value="${esc(seance.titre)}">
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="propType" class="form-input form-input--sm">
                ${['cours','tp','exercice','quiz','evaluation'].map(t =>
                  `<option value="${t}" ${seance.type === t ? 'selected':''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Durée (h)</label>
              <input type="number" id="propDuree" class="form-input form-input--sm"
                     value="${seance.duree_heures ?? 3.5}" min="0" step="0.5">
            </div>
            <button class="btn btn-secondary btn-sm" id="btnSaveProps" style="width:100%">
              <i data-lucide="check" aria-hidden="true"></i> Appliquer
            </button>
          </div>

          <div class="editor-props-section">
            <h3 class="editor-props-title">Blocs simples</h3>
            <div class="editor-block-palette">
              ${SIMPLE_TYPES.map(bt => `
              <button class="editor-palette-btn" data-type="${bt.type}">
                <i data-lucide="${bt.icon}" aria-hidden="true"></i><span>${bt.label}</span>
              </button>`).join('')}
            </div>
          </div>

          <div class="editor-props-section">
            <h3 class="editor-props-title">Conteneurs</h3>
            <div class="editor-block-palette">
              ${CONTAINER_TYPES.map(bt => `
              <button class="editor-palette-btn" data-type="${bt.type}">
                <i data-lucide="${bt.icon}" aria-hidden="true"></i><span>${bt.label}</span>
              </button>`).join('')}
            </div>
          </div>
        </aside>

        <main class="editor-canvas">
          <div class="editor-canvas-hint">
            <i data-lucide="grip-vertical" aria-hidden="true"></i>
            Glissez ⠿ pour réorganiser · Cliquez ⚙ pour modifier · Les conteneurs encapsulent d'autres blocs
          </div>
          <div id="blockList" class="editor-block-list"></div>
          <div id="editorEmpty" class="editor-empty ${_blocks.length ? 'hidden' : ''}">
            <i data-lucide="layout-panel-left" aria-hidden="true"></i>
            <p>Ajoutez un bloc depuis le panneau gauche pour commencer.</p>
          </div>
        </main>

        <aside class="editor-preview-pane">
          <div class="editor-props-section" style="position:sticky;top:0;background:var(--surface-base);z-index:1">
            <h3 class="editor-props-title">
              Aperçu
              <div style="display:flex;gap:var(--space-1)">
                <button class="btn-icon" id="btnRefreshPreview" title="Rafraîchir l'aperçu">
                  <i data-lucide="refresh-cw" aria-hidden="true"></i>
                </button>
                <button class="btn-icon" id="btnPreviewTab2" title="Ouvrir dans un onglet">
                  <i data-lucide="external-link" aria-hidden="true"></i>
                </button>
              </div>
            </h3>
          </div>
          <div id="previewPane" class="editor-preview-body"></div>
        </aside>

      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Events de la coquille ──────────────────────────────────

    // ── Sync de l'icône du bouton éditeur avec l'état réel de la sidebar ──
    // (le bouton topbar peut aussi modifier editor-focus en dehors de ce scope)
    function syncEditorSidebarBtn() {
        const isHidden = appLayout?.classList.contains('editor-focus')
                      || appLayout?.classList.contains('sidebar-hidden');
        const icon = isHidden ? 'panel-left-open' : 'panel-left-close';
        const btnEl = container.querySelector('#btnToggleSidebar');
        if (!btnEl) return;
        btnEl.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btnEl });
    }

    if (appLayout) {
        new MutationObserver(syncEditorSidebarBtn)
            .observe(appLayout, { attributes: true, attributeFilter: ['class'] });
    }

    // Toggle sidebar (focus mode)
    container.querySelector('#btnToggleSidebar')?.addEventListener('click', () => {
        if (!appLayout) return;
        const isHidden = appLayout.classList.contains('editor-focus')
                      || appLayout.classList.contains('sidebar-hidden');
        if (isHidden) {
            appLayout.classList.remove('editor-focus');
            appLayout.classList.remove('sidebar-hidden');
            localStorage.setItem('lms_sidebar_hidden', 'false');
        } else {
            appLayout.classList.add('editor-focus');
        }
        // L'icône sera mise à jour par le MutationObserver ci-dessus
    });

    // Retour : quitter le focus mode proprement
    container.querySelector('#editorBack').addEventListener('click', () => {
        if (!_saved && !confirm('Modifications non enregistrées. Quitter ?')) return;
        appLayout?.classList.remove('editor-focus');
        onBack();
    });
    container.querySelector('#dismissLegacy')?.addEventListener('click', () => {
        container.querySelector('#legacyNotice')?.remove();
    });
    container.querySelector('#btnSaveProps').addEventListener('click', async () => {
        const btn = container.querySelector('#btnSaveProps');
        btn.disabled = true;
        await onSaveTitle({
            titre:        container.querySelector('#propTitre').value.trim() || seance.titre,
            type:         container.querySelector('#propType').value,
            duree_heures: parseFloat(container.querySelector('#propDuree').value) || 3.5,
        });
        container.querySelector('#editorTitleDisplay').textContent =
            container.querySelector('#propTitre').value.trim() || seance.titre;
        btn.disabled = false;
    });
    container.querySelector('#btnSaveAll').addEventListener('click', () => doPublish(container));
    container.querySelector('#btnDraft')?.addEventListener('click', () => doSaveDraft(container));

    const openPreview = () => {
        const html  = serializeBlocks(_blocks);
        const titre = container.querySelector('#propTitre')?.value.trim() || seance.titre;
        localStorage.setItem('lms_preview_seance', JSON.stringify({ titre, html, ts: Date.now() }));
        window.open(location.pathname + '#/preview/seance', '_blank');
    };
    container.querySelector('#btnPreviewTab')?.addEventListener('click',  openPreview);
    container.querySelector('#btnPreviewTab2')?.addEventListener('click', openPreview);
    container.querySelector('#btnRefreshPreview')?.addEventListener('click', () => updatePreview());

    container.querySelectorAll('.editor-palette-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            _blocks.push(createDefaultBlock(btn.dataset.type));
            _saved = false;
            renderBlockList();
            const last = container.querySelector('#blockList .block-card:last-child');
            last?.querySelector('.block-edit-form')?.classList.remove('hidden');
            last?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });

    renderBlockList();
    updatePreview();
}

// ── Publier (blocs + HTML → DB, stagiaires voient les changements) ──
async function doPublish(container) {
    const btn = container.querySelector('#btnSaveAll');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Publication…'; }
    if (typeof lucide !== 'undefined') lucide.createIcons?.({ root: btn });
    await _onSave(serializeBlocks(_blocks), _blocks);
    _saved = true;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i> Publier'; lucide.createIcons?.({ root: btn }); }
    showSavedBadge(container);
}

// ── Brouillon (blocs JSON → DB, contenu stagiaire inchangé) ────
async function doSaveDraft(container) {
    if (!_onDraft) return;
    const btn = container.querySelector('#btnDraft');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>'; }
    if (typeof lucide !== 'undefined') lucide.createIcons?.({ root: btn });
    await _onDraft(_blocks);
    _saved = true;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="file-clock"></i> Brouillon'; lucide.createIcons?.({ root: btn }); }
    showSavedBadge(container);
}

function showSavedBadge(container) {
    const badge = container.querySelector('#editorSavedBadge');
    if (!badge) return;
    badge.style.display = '';
    lucide.createIcons?.({ root: badge });
    setTimeout(() => { badge.style.display = 'none'; }, 3000);
}

// ── Rendu liste racine ────────────────────────────────────────
function renderBlockList() {
    const list  = _container?.querySelector('#blockList');
    const empty = _container?.querySelector('#editorEmpty');
    if (!list) return;

    // ── Sauvegarder l'état replié AVANT de reconstruire le DOM ───
    // On mémorise les idx des blocs-conteneurs actuellement repliés.
    const collapsedIdxs = new Set();
    list.querySelectorAll('.block-card.block-collapsed[data-idx]').forEach(card => {
        collapsedIdxs.add(parseInt(card.dataset.idx, 10));
    });

    if (!_blocks.length) { list.innerHTML = ''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');

    list.innerHTML = _blocks.map((b, i) => renderRootCard(b, i)).join('');
    populateRichEditors(list, _blocks);

    // Monter les slots imbriqués pour chaque conteneur
    list.querySelectorAll('.block-card[data-container]').forEach(card => {
        const idx   = parseInt(card.dataset.idx, 10);
        const block = _blocks[idx];
        if (!block) return;
        mountContainerSlots(card, block, () => { _saved = false; updatePreview(); });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: list });

    list.querySelectorAll('.block-card').forEach(card => {
        const idx   = parseInt(card.dataset.idx, 10);
        const block = _blocks[idx];
        if (!block) return;
        bindRootCardEvents(card, block, idx);
    });

    // ── Restaurer l'état replié APRÈS binding (icônes déjà créées) ─
    collapsedIdxs.forEach(idx => {
        const card = list.querySelector(`.block-card[data-idx="${idx}"]`);
        if (!card) return;
        card.classList.add('block-collapsed');
        const icon = card.querySelector('.block-collapse-toggle i[data-lucide]');
        if (icon) {
            icon.setAttribute('data-lucide', 'chevron-down');
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: card.querySelector('.block-collapse-toggle') });
        }
    });
}

// ── Monter les slots d'un conteneur racine ────────────────────
function mountContainerSlots(card, block, onChange) {
    if (block.type === 'accordion') {
        block.children = block.children || [];
        const area = card.querySelector('.nested-slot');
        if (area) mountNestedSlot(area, block.children, onChange, { allowContainers: true });

    } else if (block.type === 'columns2') {
        block.children = ensureSlots(block.children, 2);
        card.querySelectorAll('.block-column-slot .nested-slot').forEach((area, si) => {
            mountNestedSlot(area, block.children[si], onChange, { allowContainers: false });
        });

    } else if (block.type === 'columns4') {
        const cfg = COL_LAYOUTS[block.layout] || COL_LAYOUTS['1+1+1+1'];
        block.children = ensureSlots(block.children, cfg.slots);
        card.querySelectorAll('.block-column-slot .nested-slot').forEach((area, si) => {
            mountNestedSlot(area, block.children[si], onChange, { allowContainers: false });
        });
        card.querySelector('[data-layout-sel]')?.addEventListener('change', (e) => {
            applyLayoutChange(block, e.target.value);
            _saved = false;
            renderBlockList(); // re-render pour mettre à jour la grille
        });
    }
}

// ── Slot de blocs imbriqués (récursif possible via allowContainers) ──
function mountNestedSlot(areaEl, blocks, onChange, { allowContainers = false } = {}) {
    const extraTypes = allowContainers
        ? [{ type: 'columns2', icon: 'panel-left', label: '2 colonnes' },
           { type: 'columns4', icon: 'layout-grid', label: 'Colonnes (flex)' }]
        : [];
    const paletteTypes = [...SIMPLE_TYPES, ...extraTypes];

    areaEl.innerHTML =
        blocks.map((b, i) => {
            if (allowContainers && (b.type === 'columns2' || b.type === 'columns4')) {
                return renderNestedContainerCard(b, i, blocks.length);
            }
            return renderNestedCard(b, i, blocks.length);
        }).join('') +
        `<details class="nested-add-details">
           <summary class="nested-add-trigger">
             <i data-lucide="plus-circle" aria-hidden="true"></i> Ajouter un bloc
           </summary>
           <div class="nested-add-grid">
             ${paletteTypes.map(t => `
             <button class="nested-add-btn" data-type="${t.type}" title="${t.label}">
               <i data-lucide="${t.icon}" aria-hidden="true"></i>
               <span>${t.label}</span>
             </button>`).join('')}
           </div>
         </details>`;

    populateRichEditors(areaEl, blocks);

    // Monter les sous-slots des colonnes dans l'accordéon
    // ⚠️ Doit se faire AVANT le binding des événements du niveau courant
    if (allowContainers) {
        areaEl.querySelectorAll(':scope > .nested-card--container').forEach(card => {
            const idx = parseInt(card.dataset.idx, 10);
            const block = blocks[idx];
            if (!block) return;
            mountNestedColumns(areaEl, card, block, blocks, onChange, { allowContainers });
        });
    }

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: areaEl });

    // ── Palette d'ajout ──────────────────────────────────────────
    // ⚠️ :scope > garantit qu'on ne bind QUE les boutons du <details>
    //    direct de CE niveau (pas ceux des colonnes imbriquées).
    areaEl.querySelector(':scope > .nested-add-details')
        ?.querySelectorAll('.nested-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // empêche la remontée vers un slot parent
            blocks.push(createDefaultBlock(btn.dataset.type));
            onChange();
            remountNestedSlot(areaEl, blocks, onChange, { allowContainers });
            // Ouvrir le formulaire du dernier bloc ajouté
            const cards = areaEl.querySelectorAll(':scope > .nested-card, :scope > .nested-card--container');
            cards[cards.length - 1]?.querySelector('.nested-edit-form')?.classList.remove('hidden');
        });
    });

    // ── Events blocs simples — uniquement les enfants directs ────
    areaEl.querySelectorAll(':scope > .nested-card:not([data-container])').forEach(card => {
        const idx = parseInt(card.dataset.idx, 10);
        card.querySelector('.nested-edit-toggle')?.addEventListener('click', () => {
            card.querySelector('.nested-edit-form')?.classList.toggle('hidden');
        });
        card.querySelector('.nested-move-up')?.addEventListener('click', () => {
            if (idx === 0) return;
            [blocks[idx-1], blocks[idx]] = [blocks[idx], blocks[idx-1]];
            onChange(); remountNestedSlot(areaEl, blocks, onChange, { allowContainers });
        });
        card.querySelector('.nested-move-down')?.addEventListener('click', () => {
            if (idx === blocks.length - 1) return;
            [blocks[idx], blocks[idx+1]] = [blocks[idx+1], blocks[idx]];
            onChange(); remountNestedSlot(areaEl, blocks, onChange, { allowContainers });
        });
        card.querySelector('.nested-delete')?.addEventListener('click', () => {
            if (!confirm('Supprimer ce bloc ?')) return;
            blocks.splice(idx, 1); onChange(); remountNestedSlot(areaEl, blocks, onChange, { allowContainers });
        });
        card.querySelectorAll('input, select, textarea').forEach(el => {
            const h = () => { updateBlockFromForm(card, blocks[idx]); onChange(); };
            el.addEventListener('input', h); el.addEventListener('change', h);
        });
        card.querySelectorAll('.rich-editor').forEach(ed => {
            ed.addEventListener('input', () => { updateBlockFromForm(card, blocks[idx]); onChange(); });
        });
        card.querySelectorAll('.rich-btn[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (btn.dataset.cmd === 'createLink') { const u = prompt('URL :'); if (u) document.execCommand('createLink', false, u); }
                else document.execCommand(btn.dataset.cmd, false, null);
                updateBlockFromForm(card, blocks[idx]); onChange();
            });
        });
    });

    // ── Events conteneurs imbriqués — uniquement les enfants directs ──
    areaEl.querySelectorAll(':scope > .nested-card--container').forEach(card => {
        const idx = parseInt(card.dataset.idx, 10);
        card.querySelector('.nested-move-up')?.addEventListener('click', () => {
            if (idx === 0) return;
            [blocks[idx-1], blocks[idx]] = [blocks[idx], blocks[idx-1]];
            onChange(); remountNestedSlot(areaEl, blocks, onChange, { allowContainers });
        });
        card.querySelector('.nested-move-down')?.addEventListener('click', () => {
            if (idx === blocks.length - 1) return;
            [blocks[idx], blocks[idx+1]] = [blocks[idx+1], blocks[idx]];
            onChange(); remountNestedSlot(areaEl, blocks, onChange, { allowContainers });
        });
        card.querySelector('.nested-delete')?.addEventListener('click', () => {
            if (!confirm('Supprimer ce bloc ?')) return;
            blocks.splice(idx, 1); onChange(); remountNestedSlot(areaEl, blocks, onChange, { allowContainers });
        });
    });
}

// Monter les sous-slots d'une colonne imbriquée dans accordéon
function mountNestedColumns(parentAreaEl, card, block, parentBlocks, onChange, parentOptions) {
    const remount = () => remountNestedSlot(parentAreaEl, parentBlocks, onChange, parentOptions);

    if (block.type === 'columns2') {
        block.children = ensureSlots(block.children, 2);
        card.querySelectorAll('.nested-col-slot .nested-slot').forEach((area, si) => {
            mountNestedSlot(area, block.children[si], onChange, { allowContainers: false });
        });
    } else if (block.type === 'columns4') {
        const cfg = COL_LAYOUTS[block.layout || '1+1+1+1'];
        block.children = ensureSlots(block.children, cfg.slots);
        card.querySelectorAll('.nested-col-slot .nested-slot').forEach((area, si) => {
            mountNestedSlot(area, block.children[si], onChange, { allowContainers: false });
        });
        card.querySelector('[data-layout-sel]')?.addEventListener('change', (e) => {
            applyLayoutChange(block, e.target.value);
            onChange();
            remount();
        });
    }
}

function remountNestedSlot(areaEl, blocks, onChange, options) {
    mountNestedSlot(areaEl, blocks, onChange, options);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: areaEl });
}

// ── Carte racine ───────────────────────────────────────────────
function renderRootCard(block, idx) {
    const bt   = ALL_TYPES.find(t => t.type === block.type) || { icon: 'code-2', label: 'HTML' };
    const isCt = ['accordion', 'columns2', 'columns4'].includes(block.type);

    const hdr = `
    <div class="block-card-header">
      <div class="block-drag-handle"><i data-lucide="grip-vertical" aria-hidden="true"></i></div>
      <div class="block-card-type">
        <i data-lucide="${bt.icon}" aria-hidden="true"></i>
        <span>${bt.label}</span>
      </div>
      ${!isCt ? `<div class="block-card-preview">${esc(blockPreview(block))}</div>` : ''}
      <div class="block-card-actions">
        <button class="btn-icon block-move-up"   title="Monter"    ${idx===0?'disabled':''}><i data-lucide="chevron-up"></i></button>
        <button class="btn-icon block-move-down" title="Descendre" ${idx===_blocks.length-1?'disabled':''}><i data-lucide="chevron-down"></i></button>
        <button class="btn-icon block-duplicate" title="Dupliquer"><i data-lucide="copy"></i></button>
        ${!isCt ? `<button class="btn-icon btn-icon--edit block-edit-toggle" title="Modifier"><i data-lucide="settings-2"></i></button>` : ''}
        ${isCt  ? `<button class="btn-icon block-collapse-toggle" title="Réduire / Développer"><i data-lucide="chevron-up"></i></button>` : ''}
        <button class="btn-icon btn-icon--delete block-delete" title="Supprimer"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;

    let body = '';
    if (block.type === 'accordion') {
        body = `
        <div class="block-container-body">
          <div class="block-container-config">
            <input type="text" class="form-input form-input--sm" data-field="title"
                   placeholder="Titre du panneau…" value="${esc(block.title || '')}">
          </div>
          <div class="nested-slot"></div>
        </div>`;

    } else if (block.type === 'columns2') {
        body = `
        <div class="block-container-body block-columns-body" style="grid-template-columns:1fr 1fr">
          <div class="block-column-slot"><div class="block-column-label">Colonne A</div><div class="nested-slot"></div></div>
          <div class="block-column-slot"><div class="block-column-label">Colonne B</div><div class="nested-slot"></div></div>
        </div>`;

    } else if (block.type === 'columns4') {
        const layout = block.layout || '1+1+1+1';
        const cfg    = COL_LAYOUTS[layout];
        const labels = ['A','B','C','D','E','F','G'];
        const opts   = Object.entries(COL_LAYOUTS).map(([k,v]) =>
            `<option value="${k}" ${k===layout?'selected':''}>${v.label}</option>`).join('');
        const slots  = Array.from({length: cfg.slots}, (_, i) =>
            `<div class="block-column-slot"><div class="block-column-label">Col. ${labels[i]}</div><div class="nested-slot"></div></div>`
        ).join('');
        body = `
        <div class="block-container-body">
          <div class="block-container-config">
            <label class="form-label" style="margin:0">Disposition</label>
            <select class="form-input form-input--sm" data-layout-sel style="max-width:260px">${opts}</select>
          </div>
          <div class="block-columns-body" style="grid-template-columns:${cfg.grid}">${slots}</div>
        </div>`;

    } else {
        body = `<div class="block-edit-form hidden">${renderBlockForm(block)}</div>`;
    }

    return `
    <div class="block-card block-card--${block.type}${isCt?' block-card--container':''}"
         data-idx="${idx}"${isCt?' data-container':''}>
      ${hdr}${body}
    </div>`;
}

// ── Carte imbriquée (simple) ──────────────────────────────────
function renderNestedCard(block, idx, total) {
    const bt = ALL_TYPES.find(t => t.type === block.type) || { icon: 'box', label: block.type };
    return `
    <div class="nested-card" data-idx="${idx}">
      <div class="nested-card-header">
        <div class="nested-card-type"><i data-lucide="${bt.icon}" aria-hidden="true"></i><span>${bt.label}</span></div>
        <div class="nested-card-preview">${esc(blockPreview(block))}</div>
        <div class="nested-card-actions">
          <button class="btn-icon nested-move-up"   title="Monter"    ${idx===0?'disabled':''}><i data-lucide="chevron-up"></i></button>
          <button class="btn-icon nested-move-down" title="Descendre" ${idx===total-1?'disabled':''}><i data-lucide="chevron-down"></i></button>
          <button class="btn-icon btn-icon--edit nested-edit-toggle" title="Modifier"><i data-lucide="settings-2"></i></button>
          <button class="btn-icon btn-icon--delete nested-delete"   title="Supprimer"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="nested-edit-form hidden">${renderBlockForm(block)}</div>
    </div>`;
}

// ── Carte conteneur imbriquée (colonnes dans accordéon) ───────
function renderNestedContainerCard(block, idx, total) {
    const bt = ALL_TYPES.find(t => t.type === block.type) || { icon: 'layout-grid', label: block.type };

    let colsBody = '';
    if (block.type === 'columns2') {
        colsBody = `
        <div class="nested-columns-body" style="grid-template-columns:1fr 1fr">
          <div class="nested-col-slot"><div class="block-column-label">Col. A</div><div class="nested-slot"></div></div>
          <div class="nested-col-slot"><div class="block-column-label">Col. B</div><div class="nested-slot"></div></div>
        </div>`;
    } else {
        const layout = block.layout || '1+1+1+1';
        const cfg    = COL_LAYOUTS[layout];
        const labels = ['A','B','C','D','E','F','G'];
        const opts   = Object.entries(COL_LAYOUTS).map(([k,v]) =>
            `<option value="${k}" ${k===layout?'selected':''}>${v.label}</option>`).join('');
        const slots  = Array.from({length: cfg.slots}, (_, i) =>
            `<div class="nested-col-slot"><div class="block-column-label">Col. ${labels[i]}</div><div class="nested-slot"></div></div>`
        ).join('');
        colsBody = `
        <div class="block-container-config" style="padding:var(--space-2) var(--space-3) 0">
          <label class="form-label" style="margin:0">Disposition</label>
          <select class="form-input form-input--sm" data-layout-sel style="max-width:240px">${opts}</select>
        </div>
        <div class="nested-columns-body" style="grid-template-columns:${cfg.grid}">${slots}</div>`;
    }

    return `
    <div class="nested-card nested-card--container" data-idx="${idx}" data-container>
      <div class="nested-card-header">
        <div class="nested-card-type"><i data-lucide="${bt.icon}" aria-hidden="true"></i><span>${bt.label}</span></div>
        <div class="nested-card-actions">
          <button class="btn-icon nested-move-up"   title="Monter"    ${idx===0?'disabled':''}><i data-lucide="chevron-up"></i></button>
          <button class="btn-icon nested-move-down" title="Descendre" ${idx===total-1?'disabled':''}><i data-lucide="chevron-down"></i></button>
          <button class="btn-icon btn-icon--delete nested-delete"   title="Supprimer"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="nested-container-body">${colsBody}</div>
    </div>`;
}

// ── Events racine (SCOPED pour éviter le bug de titre) ────────
function bindRootCardEvents(card, block, idx) {
    const isCt = ['accordion', 'columns2', 'columns4'].includes(block.type);

    // Drag & drop
    const handle = card.querySelector('.block-drag-handle');
    handle?.addEventListener('mousedown', () => { card.draggable = true; });
    card.addEventListener('dragend', () => {
        card.draggable = false; card.classList.remove('dragging');
        _container?.querySelectorAll('.block-card').forEach(c => c.classList.remove('drop-zone--active'));
    });
    card.addEventListener('dragstart', (e) => {
        _dragIdx = idx; e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => card.classList.add('dragging'), 0);
    });
    card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (_dragIdx === null || _dragIdx === idx) return;
        _container?.querySelectorAll('.block-card').forEach(c => c.classList.remove('drop-zone--active'));
        card.classList.add('drop-zone--active');
    });
    card.addEventListener('dragleave', (e) => { if (!card.contains(e.relatedTarget)) card.classList.remove('drop-zone--active'); });
    card.addEventListener('drop', (e) => {
        e.preventDefault(); card.classList.remove('drop-zone--active');
        if (_dragIdx === null || _dragIdx === idx) return;
        const moved = _blocks.splice(_dragIdx, 1)[0];
        _blocks.splice(idx, 0, moved);
        _dragIdx = null; _saved = false; renderBlockList(); updatePreview();
    });

    // Boutons communs
    card.querySelector('.block-move-up')?.addEventListener('click', () => {
        if (idx === 0) return;
        [_blocks[idx-1], _blocks[idx]] = [_blocks[idx], _blocks[idx-1]];
        _saved = false; renderBlockList(); updatePreview();
    });
    card.querySelector('.block-move-down')?.addEventListener('click', () => {
        if (idx === _blocks.length - 1) return;
        [_blocks[idx], _blocks[idx+1]] = [_blocks[idx+1], _blocks[idx]];
        _saved = false; renderBlockList(); updatePreview();
    });
    card.querySelector('.block-delete')?.addEventListener('click', () => {
        if (!confirm('Supprimer ce bloc ?')) return;
        _blocks.splice(idx, 1); _saved = false; renderBlockList(); updatePreview();
    });
    card.querySelector('.block-duplicate')?.addEventListener('click', () => {
        _blocks.splice(idx + 1, 0, JSON.parse(JSON.stringify(block)));
        _saved = false; renderBlockList(); updatePreview();
    });
    card.querySelector('.block-edit-toggle')?.addEventListener('click', () => {
        const form = card.querySelector('.block-edit-form');
        form?.classList.toggle('hidden');
        // Re-monter le quiz editor quand on ouvre le formulaire
        if (!form?.classList.contains('hidden') && block.type === 'quiz') {
            mountQuizEditor(card, block, () => { _saved = false; updatePreview(); });
        }
    });

    // Collapse / expand pour les blocs conteneurs (accordéon, colonnes)
    card.querySelector('.block-collapse-toggle')?.addEventListener('click', (e) => {
        const body   = card.querySelector('.block-container-body');
        const icon   = e.currentTarget.querySelector('i[data-lucide]');
        const isOpen = !card.classList.contains('block-collapsed');
        card.classList.toggle('block-collapsed', isOpen);
        if (icon) {
            icon.setAttribute('data-lucide', isOpen ? 'chevron-down' : 'chevron-up');
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: e.currentTarget });
        }
    });

    if (isCt) {
        // ⚠️ IMPORTANT: Scope uniquement à .block-container-config pour éviter
        // que les inputs des blocs imbriqués écrasent les propriétés du conteneur
        card.querySelector('.block-container-config')?.querySelectorAll('input:not([data-layout-sel]), select:not([data-layout-sel])').forEach(el => {
            const h = () => { updateContainerConfig(card, block); _saved = false; updatePreview(); };
            el.addEventListener('input', h); el.addEventListener('change', h);
        });
    } else {
        // Blocs simples : écoute tous les champs
        card.querySelectorAll('input, select, textarea').forEach(el => {
            const h = () => { updateBlockFromForm(card, block); _saved = false; updatePreview(); };
            el.addEventListener('input', h); el.addEventListener('change', h);
        });
        card.querySelectorAll('.rich-editor').forEach(ed => {
            ed.addEventListener('input', () => { updateBlockFromForm(card, block); _saved = false; updatePreview(); });
        });
        // Séparateur : mise à jour visuelle de l'option sélectionnée
        if (block.type === 'spacer') {
            card.querySelectorAll('.spacer-style-opt input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    card.querySelectorAll('.spacer-style-opt').forEach(opt => opt.classList.remove('active'));
                    radio.closest('.spacer-style-opt')?.classList.add('active');
                });
            });
        }
        card.querySelectorAll('.rich-btn[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (btn.dataset.cmd === 'createLink') { const u = prompt('URL :'); if (u) document.execCommand('createLink', false, u); }
                else document.execCommand(btn.dataset.cmd, false, null);
                updateBlockFromForm(card, block); _saved = false; updatePreview();
            });
        });

        // ── Éditeur de quiz dynamique ──────────────────────────────
        if (block.type === 'quiz') {
            mountQuizEditor(card, block, () => { _saved = false; updatePreview(); });
        }
    }
}

// ── Quiz : montage des événements dynamiques ───────────────────
function mountQuizEditor(card, block, onChange) {
    block.questions = block.questions || [];

    const rerender = () => {
        const form = card.querySelector('.block-edit-form');
        if (!form) return;
        form.innerHTML = renderQuizForm(block);
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: form });
        mountQuizEditor(card, block, onChange);
    };

    // Ajouter une question
    card.querySelector('.quiz-add-question')?.addEventListener('click', () => {
        block.questions.push({ type: 'mcq', text: '', options: ['', ''], correct: 0, explanation: '' });
        rerender(); onChange();
    });

    // Ajouter une section / séparateur
    card.querySelector('.quiz-add-section')?.addEventListener('click', () => {
        block.questions.push({ type: 'section', text: '' });
        rerender(); onChange();
    });

    // Chaque question
    card.querySelectorAll('.quiz-question-card').forEach(qCard => {
        const qi = parseInt(qCard.dataset.qi, 10);
        const q  = block.questions[qi];
        if (!q) return;

        // Changer le type de question
        qCard.querySelector('.quiz-q-type')?.addEventListener('change', (e) => {
            q.type = e.target.value;
            if (q.type === 'truefalse') { q.options = undefined; q.correct = 0; }
            else if (q.type === 'checkbox') { q.options = q.options || ['','']; q.correct = []; }
            else if (q.type === 'mcq')      { q.options = q.options || ['','']; q.correct = 0; }
            else                            { q.options = undefined; q.correct = undefined; }
            rerender(); onChange();
        });

        // Texte de la question
        qCard.querySelector(`[data-qfield="text"]`)?.addEventListener('input', (e) => {
            q.text = e.target.value; onChange();
        });
        // Explication
        qCard.querySelector(`[data-qfield="explanation"]`)?.addEventListener('input', (e) => {
            q.explanation = e.target.value; onChange();
        });
        // Description section (sections uniquement)
        qCard.querySelector(`[data-qfield="description"]`)?.addEventListener('input', (e) => {
            q.description = e.target.value; onChange();
        });
        // Audio section (sections uniquement)
        qCard.querySelector(`[data-qfield="audio"]`)?.addEventListener('input', (e) => {
            q.audio = e.target.value; onChange();
        });

        // Supprimer question
        qCard.querySelector('.quiz-delete-q')?.addEventListener('click', () => {
            block.questions.splice(qi, 1);
            rerender(); onChange();
        });

        // Ajouter option (MCQ/checkbox)
        qCard.querySelector('.quiz-add-option')?.addEventListener('click', () => {
            q.options = q.options || [];
            q.options.push('');
            rerender(); onChange();
        });

        // Options : texte + bonne réponse + supprimer
        qCard.querySelectorAll('.quiz-option-row').forEach(row => {
            const oi = parseInt(row.dataset.oi, 10);

            row.querySelector('[data-ofield="text"]')?.addEventListener('input', (e) => {
                q.options[oi] = e.target.value; onChange();
            });

            row.querySelector('[data-correct]')?.addEventListener('change', (e) => {
                if (q.type === 'mcq' || q.type === 'truefalse') {
                    q.correct = parseInt(e.target.value, 10);
                } else {
                    // checkbox : reconstruire le tableau des bonnes réponses
                    const all = qCard.querySelectorAll('[data-correct]:checked');
                    q.correct = Array.from(all).map(el => parseInt(el.value, 10));
                }
                // Sync .active sur les labels TF
                qCard.querySelectorAll('.quiz-tf-opt').forEach(l => l.classList.remove('active'));
                row.closest('.quiz-tf-opt')?.classList.add('active');
                onChange();
            });

            row.querySelector('.quiz-remove-option')?.addEventListener('click', () => {
                q.options.splice(oi, 1);
                if (q.type === 'mcq' && q.correct >= q.options.length) q.correct = 0;
                if (q.type === 'checkbox') q.correct = (q.correct||[]).filter(c => c < q.options.length);
                rerender(); onChange();
            });
        });

        // Vrai/Faux correct toggle
        qCard.querySelectorAll('.quiz-tf-opt input[data-correct]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                q.correct = parseInt(e.target.value, 10);
                qCard.querySelectorAll('.quiz-tf-opt').forEach(l => l.classList.remove('active'));
                radio.closest('.quiz-tf-opt')?.classList.add('active');
                onChange();
            });
        });
    });

    // Titre / passing_score / show_correction / sectioned via champs standard
    card.querySelector('[data-field="title"]')?.addEventListener('input', e => { block.title = e.target.value; onChange(); });
    card.querySelector('[data-field="passing_score"]')?.addEventListener('change', e => { block.passing_score = parseInt(e.target.value,10); onChange(); });
    card.querySelector('[data-field="show_correction"]')?.addEventListener('change', e => { block.show_correction = e.target.checked; onChange(); });
    card.querySelector('[data-field="sectioned"]')?.addEventListener('change', e => { block.sectioned = e.target.checked; onChange(); });

    // ── Drag & drop sur les cartes questions ───────────────────────
    let _qDragIdx = null;
    card.querySelectorAll('.quiz-question-card').forEach(qCard => {
        const handle = qCard.querySelector('.quiz-q-drag-handle');
        handle?.addEventListener('mousedown', () => { qCard.draggable = true; });
        qCard.addEventListener('dragend', () => {
            qCard.draggable = false;
            qCard.classList.remove('dragging');
            _qDragIdx = null;
        });
        qCard.addEventListener('dragstart', (e) => {
            _qDragIdx = parseInt(qCard.dataset.qi, 10);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => qCard.classList.add('dragging'), 0);
        });
        qCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (_qDragIdx === null) return;
            qCard.classList.add('drop-zone--active');
        });
        qCard.addEventListener('dragleave', (e) => {
            if (!qCard.contains(e.relatedTarget)) qCard.classList.remove('drop-zone--active');
        });
        qCard.addEventListener('drop', (e) => {
            e.preventDefault();
            qCard.classList.remove('drop-zone--active');
            const targetIdx = parseInt(qCard.dataset.qi, 10);
            if (_qDragIdx === null || _qDragIdx === targetIdx) return;
            const moved = block.questions.splice(_qDragIdx, 1)[0];
            block.questions.splice(targetIdx, 0, moved);
            _qDragIdx = null;
            rerender(); onChange();
        });
    });

    // ── Import Aiken / Aiken+ / CSV ────────────────────────────────
    let _importFmt = 'aiken';
    const importPanel = card.querySelector('.quiz-import-panel');

    card.querySelector('.quiz-open-import')?.addEventListener('click', () => {
        importPanel?.classList.remove('hidden');
    });
    card.querySelectorAll('.quiz-close-import').forEach(btn =>
        btn.addEventListener('click', () => importPanel?.classList.add('hidden'))
    );

    // Onglets format
    card.querySelectorAll('.quiz-import-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            card.querySelectorAll('.quiz-import-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            _importFmt = tab.dataset.fmt;
            const ex = card.querySelector('#quiz-import-example');
            if (!ex) return;
            if (_importFmt === 'aiken') {
                ex.innerHTML = `<strong>Format Aiken :</strong>
<pre>Question ici ?
A) Option A
B) Option B
C) Option C
ANSWER: B

Affirmation vraie ou fausse ?
A) Vrai
B) Faux
ANSWER: A</pre>`;
            } else if (_importFmt === 'aikenplus') {
                ex.innerHTML = `<strong>Format Aiken+ (sections + audio + description) :</strong>
<pre>SECTION: Partie 1 — Compréhension
SECTION_DESC: Écoutez l'audio, puis répondez.
SECTION_AUDIO: https://...url-audio-1.mp3

Question 1 ?
A) Option A
B) Option B
C) Option C
ANSWER: B

SECTION: Partie 2 — Vocabulaire
SECTION_AUDIO: https://...url-audio-2.mp3

Question 2 ?
A) Vrai
B) Faux
ANSWER: A</pre>`;
            } else {
                ex.innerHTML = `<strong>Format CSV</strong> <span style="opacity:.7">(sans en-tête)</span> :
<pre>mcq,Question?,OptionA,OptionB,OptionC,OptionD,B,Explication
truefalse,Affirmation vraie ?,,,,,A,
checkbox,Choisir les bonnes réponses,Opt1,Opt2,Opt3,,AB,</pre>`;
            }
        });
    });

    // Bouton importer
    card.querySelector('.quiz-do-import')?.addEventListener('click', () => {
        const raw = card.querySelector('.quiz-import-text')?.value?.trim();
        if (!raw) return;
        const parsed = _importFmt === 'csv'       ? parseQuizCsv(raw)
                     : _importFmt === 'aikenplus' ? parseQuizAikenPlus(raw)
                     :                              parseQuizAiken(raw);
        if (!parsed.length) { alert('Aucune question détectée. Vérifiez le format.'); return; }
        block.questions = [...(block.questions || []), ...parsed];
        rerender(); onChange();
        importPanel?.classList.add('hidden');
    });
}

// ── Parseur Aiken ──────────────────────────────────────────────
function parseQuizAiken(text) {
    const questions = [];
    // Split par lignes ANSWER: (chaque bloc finit par ANSWER:)
    const blocks = text.split(/\n(?=\S)/g);
    let current = null;

    for (const line of text.split('\n')) {
        const trim = line.trim();
        if (!trim) {
            if (current) { questions.push(current); current = null; }
            continue;
        }
        // Ligne ANSWER: X
        const answerMatch = trim.match(/^ANSWER\s*:\s*([A-Z](?:\s*,\s*[A-Z])*)/i);
        if (answerMatch && current) {
            const letters = answerMatch[1].toUpperCase().split(/\s*,\s*/);
            const indices = letters.map(l => l.charCodeAt(0) - 65); // A=0, B=1…
            if (current.type === 'truefalse') {
                current.correct = indices[0] ?? 0; // A=Vrai=0, B=Faux=1
            } else if (indices.length > 1) {
                current.type    = 'checkbox';
                current.correct = indices;
            } else {
                current.type    = 'mcq';
                current.correct = indices[0] ?? 0;
            }
            questions.push(current);
            current = null;
            continue;
        }
        // Ligne option A) / A. / A -
        const optMatch = trim.match(/^([A-Z])\s*[).:\-]\s*(.+)/i);
        if (optMatch && current) {
            current.options = current.options || [];
            current.options.push(optMatch[2].trim());
            continue;
        }
        // Sinon : texte de question (peut être multi-lignes)
        if (!current) {
            const isTF = /^(vrai|faux|true|false)/i.test(trim);
            current = {
                type:    isTF ? 'truefalse' : 'mcq',
                text:    trim,
                options: isTF ? ['Vrai', 'Faux'] : [],
                correct: 0,
                explanation: '',
            };
        } else if (!current.options.length) {
            current.text += ' ' + trim; // question multi-lignes
        }
    }
    if (current) questions.push(current);
    return questions;
}

// ── Parseur Aiken+ (sections + audio + description) ───────────
// Directives spéciales (en début de ligne) :
//   SECTION: Titre de la section
//   SECTION_DESC: Description visible par le stagiaire
//   SECTION_AUDIO: https://url-audio...
// Le reste suit le format Aiken standard (Question / A) ... / ANSWER: X)
function parseQuizAikenPlus(text) {
    const questions = [];
    let currentSection = null;
    let current = null;

    for (const rawLine of text.split('\n')) {
        const trim = rawLine.trim();
        if (!trim) {
            if (current) { questions.push(current); current = null; }
            continue;
        }

        // SECTION: directive
        const sectionMatch = trim.match(/^SECTION\s*:\s*(.+)/i);
        if (sectionMatch) {
            if (current) { questions.push(current); current = null; }
            currentSection = { type: 'section', text: sectionMatch[1].trim(), description: '', audio: '' };
            questions.push(currentSection);
            continue;
        }

        // SECTION_DESC: directive
        const descMatch = trim.match(/^SECTION_DESC\s*:\s*(.+)/i);
        if (descMatch && currentSection) {
            currentSection.description = descMatch[1].trim();
            continue;
        }

        // SECTION_AUDIO: directive
        const audioMatch = trim.match(/^SECTION_AUDIO\s*:\s*(.+)/i);
        if (audioMatch && currentSection) {
            currentSection.audio = audioMatch[1].trim();
            continue;
        }

        // ANSWER: X ou ANSWER: A,B
        const answerMatch = trim.match(/^ANSWER\s*:\s*([A-Z](?:\s*,\s*[A-Z])*)/i);
        if (answerMatch && current) {
            const letters  = answerMatch[1].toUpperCase().split(/\s*,\s*/);
            const indices  = letters.map(l => l.charCodeAt(0) - 65);
            if (current.type === 'truefalse') {
                current.correct = indices[0] ?? 0;
            } else if (indices.length > 1) {
                current.type    = 'checkbox';
                current.correct = indices;
            } else {
                current.type    = 'mcq';
                current.correct = indices[0] ?? 0;
            }
            questions.push(current);
            current = null;
            continue;
        }

        // Ligne option A) / A. / A -
        const optMatch = trim.match(/^([A-Z])\s*[).:\-]\s*(.+)/i);
        if (optMatch && current) {
            current.options = current.options || [];
            current.options.push(optMatch[2].trim());
            continue;
        }

        // Sinon : texte de question (peut être multi-lignes)
        if (!current) {
            const isTF = /^(vrai|faux|true|false)/i.test(trim);
            current = {
                type:        isTF ? 'truefalse' : 'mcq',
                text:        trim,
                options:     isTF ? ['Vrai', 'Faux'] : [],
                correct:     0,
                explanation: '',
            };
        } else if (!current.options?.length) {
            current.text += ' ' + trim;
        }
    }
    if (current) questions.push(current);
    return questions;
}

// ── Parseur CSV ────────────────────────────────────────────────
// Colonnes (sans en-tête) : type, question, optA, optB, optC, optD, correct, explanation
// correct = A|B|C|D (MCQ/TF) ou AB|ACD (checkbox)
function parseQuizCsv(text) {
    const questions = [];
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        const cols = csvSplit(line);
        if (cols.length < 2) continue;
        const [type, question, ...rest] = cols;
        const t   = (type || 'mcq').toLowerCase().trim();
        const exp = rest[5]?.trim() || '';

        if (t === 'shorttext' || t === 'texte') {
            questions.push({ type: 'shorttext', text: question.trim(), explanation: exp });
            continue;
        }
        if (t === 'truefalse' || t === 'vf' || t === 'vrai/faux') {
            const correctLetter = (rest[4] || 'A').trim().toUpperCase();
            questions.push({
                type: 'truefalse',
                text: question.trim(),
                options: ['Vrai', 'Faux'],
                correct: correctLetter === 'A' ? 0 : 1,
                explanation: exp,
            });
            continue;
        }
        // MCQ ou checkbox
        const opts = [rest[0], rest[1], rest[2], rest[3]]
            .map(o => o?.trim()).filter(Boolean);
        if (!opts.length) continue;
        const correctStr = (rest[4] || 'A').trim().toUpperCase();
        const indices    = [...correctStr].map(l => l.charCodeAt(0) - 65).filter(i => i >= 0 && i < opts.length);

        if (t === 'checkbox' || indices.length > 1) {
            questions.push({ type: 'checkbox', text: question.trim(), options: opts, correct: indices, explanation: exp });
        } else {
            questions.push({ type: 'mcq', text: question.trim(), options: opts, correct: indices[0] ?? 0, explanation: exp });
        }
    }
    return questions;
}

function csvSplit(line) {
    // Gère les guillemets doubles : "text, with, comma"
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; continue; }
        if (c === ',' && !inQ) { result.push(cur); cur = ''; continue; }
        cur += c;
    }
    result.push(cur);
    return result;
}

// ── Formulaires ───────────────────────────────────────────────
function renderBlockForm(block) {
    switch (block.type) {
        case 'heading':
            return field('Texte du titre',
                `<input type="text" class="form-input" data-field="text" value="${esc(block.text || '')}">`);

        case 'objectives': case 'keypoints':
            return field(block.type === 'objectives' ? 'Objectifs — un par ligne' : 'Points clés — un par ligne',
                `<textarea class="form-input form-textarea" data-field="items_raw" rows="5">${esc((block.items || []).join('\n'))}</textarea>`);

        case 'text':
            return richField('Contenu', 'html');

        case 'video': {
            const embed = toEmbedUrl(block.url || '');
            const ok    = embed && embed !== block.url;
            const src   = block.url || '';
            const srcType = isDriveUrl(src) ? '🔗 Google Drive détecté → lecture intégrée'
                          : src.includes('youtube') || src.includes('youtu.be') ? '▶ YouTube détecté → embed automatique'
                          : src.includes('vimeo') ? '▶ Vimeo détecté → embed automatique'
                          : '';
            return field('URL de la vidéo',
                `<input type="url" class="form-input" data-field="url" value="${esc(src)}" placeholder="YouTube, Vimeo, ou lien de partage Google Drive">`)
                + (ok && srcType ? `<p class="form-hint form-hint--ok">${srcType}</p>` : '')
                + note('Supporte : YouTube · Vimeo · Google Drive (lien de partage /view ou /preview)')
                + field('Titre', `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}" placeholder="Titre de la vidéo (optionnel)">`)
                + field('Durée', `<input type="text" class="form-input" data-field="duration" value="${esc(block.duration || '')}" placeholder="ex : 12:45 ou 1h20">`)
                + field('Description', `<textarea class="form-input form-textarea" data-field="description" rows="3" placeholder="Courte description (optionnel)">${esc(block.description || '')}</textarea>`);
        }

        case 'audio': {
            const aUrl  = block.url || '';
            const aType = isDriveUrl(aUrl) ? '🔗 Google Drive → lecteur intégré (iframe)'
                        : isSupabaseUrl(aUrl) ? '☁ Supabase Storage → lecteur natif'
                        : '';
            return field('URL du fichier audio',
                `<input type="url" class="form-input" data-field="url" value="${esc(aUrl)}" placeholder="Supabase Storage, Google Drive ou URL directe">`)
                + (aType ? `<p class="form-hint form-hint--ok">${aType}</p>` : '')
                + field('Titre', `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}">`)
                + note('☁ <strong>Supabase Storage recommandé</strong> pour la lecture inline · Drive affiche un lien (CORB) · MP3/OGG/WAV directs acceptés');
        }

        case 'pdf': case 'xlsx': case 'docx': case 'pptx': {
            const fUrl   = block.url || '';
            const fType  = isDriveUrl(fUrl) ? '🔗 Google Drive → prévisualisation intégrée disponible'
                         : isSupabaseUrl(fUrl) ? '☁ Supabase Storage → prévisualisation intégrée disponible'
                         : '';
            const canInline = block.type === 'pdf';
            return field('URL', `<input type="url" class="form-input" data-field="url" value="${esc(fUrl)}" placeholder="Google Drive, Supabase ou URL directe">`)
                + (fType ? `<p class="form-hint form-hint--ok">${fType}</p>` : '')
                + field('Nom affiché', `<input type="text" class="form-input" data-field="filename" value="${esc(block.filename || '')}">`)
                + (canInline ? `<label class="form-checkbox-label">
                    <input type="checkbox" data-field="inline" ${block.inline ? 'checked' : ''}>
                    Afficher le PDF en ligne (visionneuse intégrée)
                  </label>` : '');
        }

        case 'link':
            return field('URL', `<input type="url" class="form-input" data-field="url" value="${esc(block.url || '')}" placeholder="https://...">`)
                + field('Texte du lien', `<input type="text" class="form-input" data-field="label" value="${esc(block.label || '')}">`);

        case 'activity':
            return field('Titre', `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}">`)
                + richField('Consignes', 'instructions');

        case 'rawhtml':
            return `<p class="form-hint" style="background:var(--surface-raised);border-radius:var(--radius-md);padding:var(--space-3)">
              Contenu importé. Éditez le HTML ou reconstruisez avec les blocs.
            </p>${richField('HTML', 'html')}`;

        case 'spacer': {
            const s  = block.style || 'space';
            const nm = `spacer_style_${Math.random().toString(36).slice(2,7)}`;
            const opt = (val, label) => `
              <label class="spacer-style-opt${s===val?' active':''}">
                <input type="radio" name="${nm}" data-field="style" value="${val}" ${s===val?'checked':''}>
                <span class="spacer-style-preview spacer-style-preview--${val}"></span>
                <span>${label}</span>
              </label>`;
            return `<div class="spacer-style-picker">
              ${opt('space','Espace')}${opt('blue','Bleu')}${opt('green','Vert')}
            </div>`;
        }

        case 'quiz':
            return renderQuizForm(block);

        case 'devoir':
            return renderDevoirForm(block);

        default: return `<p class="form-hint">Type : ${block.type}</p>`;
    }
}

// ── Formulaire Quiz ────────────────────────────────────────────
function renderQuizForm(block) {
    const qs = block.questions || [];
    return `
    <div class="quiz-editor">
      <div class="form-group">
        <label class="form-label">Titre du quiz</label>
        <input type="text" class="form-input" data-field="title" value="${esc(block.title||'')}">
      </div>
      <div class="quiz-editor-row">
        <div class="form-group" style="flex:1">
          <label class="form-label">Score de passage (%)</label>
          <input type="number" class="form-input form-input--sm" data-field="passing_score"
                 value="${block.passing_score ?? 70}" min="0" max="100" step="5">
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);align-self:flex-end;padding-bottom:var(--space-1)">
          <label class="form-checkbox-label">
            <input type="checkbox" data-field="show_correction" ${block.show_correction ? 'checked' : ''}>
            Afficher la correction après soumission
          </label>
          <label class="form-checkbox-label">
            <input type="checkbox" data-field="sectioned" ${block.sectioned ? 'checked' : ''}>
            Navigation section par section
          </label>
        </div>
      </div>
      <div class="quiz-questions" id="quiz-q-list">
        ${qs.map((q, i) => renderQuizQuestionEditor(q, i)).join('')}
      </div>
      <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap">
        <button type="button" class="btn btn-secondary btn-sm quiz-add-question">
          <i data-lucide="plus-circle" aria-hidden="true"></i> Ajouter une question
        </button>
        <button type="button" class="btn btn-ghost btn-sm quiz-add-section">
          <i data-lucide="separator-horizontal" aria-hidden="true"></i> Ajouter une section
        </button>
        <button type="button" class="btn btn-ghost btn-sm quiz-open-import">
          <i data-lucide="file-up" aria-hidden="true"></i> Importer (Aiken / CSV)
        </button>
      </div>
      <div class="quiz-import-panel hidden">
        <div class="quiz-import-header">
          <span>Import de questions</span>
          <button type="button" class="btn-icon quiz-close-import" title="Fermer">
            <i data-lucide="x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="quiz-import-tabs">
          <button type="button" class="quiz-import-tab active" data-fmt="aiken">Aiken (Moodle)</button>
          <button type="button" class="quiz-import-tab" data-fmt="aikenplus">Aiken+ (sections)</button>
          <button type="button" class="quiz-import-tab" data-fmt="csv">CSV</button>
        </div>
        <div class="quiz-import-example" id="quiz-import-example">
          <strong>Format Aiken :</strong>
          <pre>Quelle est la capitale de la France ?
A) Paris
B) Lyon
C) Marseille
D) Bordeaux
ANSWER: A

Le ciel est-il bleu ?
A) Vrai
B) Faux
ANSWER: A</pre>
        </div>
        <textarea class="form-input form-textarea quiz-import-text" rows="8"
                  placeholder="Collez vos questions ici…"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-2)">
          <button type="button" class="btn btn-ghost btn-sm quiz-close-import">Annuler</button>
          <button type="button" class="btn btn-cta btn-sm quiz-do-import">
            <i data-lucide="check" aria-hidden="true"></i> Importer
          </button>
        </div>
      </div>
      <p class="form-hint" style="margin-top:var(--space-2)">
        <strong>Types :</strong> Vrai/Faux · QCM (1 bonne réponse) · Cases à cocher (N bonnes réponses) · Réponse courte
      </p>
    </div>`;
}

function renderQuizQuestionEditor(q, i) {
    // ── Section / séparateur ──────────────────────────────────────
    if (q.type === 'section') {
        return `
        <div class="quiz-question-card quiz-question-card--section" data-qi="${i}">
          <div class="quiz-question-header">
            <div class="quiz-q-drag-handle" title="Déplacer">
              <i data-lucide="grip-vertical" aria-hidden="true"></i>
            </div>
            <span class="quiz-question-num quiz-question-num--section">
              <i data-lucide="separator-horizontal" aria-hidden="true"></i>
            </span>
            <span class="quiz-section-badge">Section</span>
            <button type="button" class="btn-icon btn-icon--delete quiz-delete-q" data-qi="${i}" title="Supprimer cette section">
              <i data-lucide="trash-2" aria-hidden="true"></i>
            </button>
          </div>
          <div class="form-group">
            <label class="form-label form-label--sm">Titre de la section</label>
            <input type="text" class="form-input form-input--sm" data-qi="${i}" data-qfield="text"
                   placeholder="Ex : Partie 1 — Compréhension écrite…"
                   value="${esc(q.text || '')}">
          </div>
          <div class="form-group">
            <label class="form-label form-label--sm">Description (visible par le stagiaire)</label>
            <textarea class="form-input form-textarea form-input--sm" data-qi="${i}" data-qfield="description"
                      rows="2" placeholder="Description optionnelle affichée sous le titre…">${esc(q.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label form-label--sm">
              <i data-lucide="headphones" style="width:13px;height:13px;vertical-align:middle;margin-right:4px" aria-hidden="true"></i>
              Audio de la section (optionnel)
            </label>
            <input type="url" class="form-input form-input--sm" data-qi="${i}" data-qfield="audio"
                   placeholder="URL audio (Supabase, Google Drive, MP3 direct…)"
                   value="${esc(q.audio || '')}">
          </div>
        </div>`;
    }

    // ── Question normale ─────────────────────────────────────────
    const types = [
        { v:'truefalse', l:'Vrai / Faux' },
        { v:'mcq',       l:'QCM — 1 réponse' },
        { v:'checkbox',  l:'Cases à cocher' },
        { v:'shorttext', l:'Réponse courte' },
    ];
    const opts = types.map(t =>
        `<option value="${t.v}" ${q.type===t.v?'selected':''}>${t.l}</option>`
    ).join('');

    let answersHtml = '';
    if (q.type === 'truefalse') {
        answersHtml = `
        <div class="quiz-tf-row">
          <label class="quiz-tf-opt ${q.correct===0?'active':''}">
            <input type="radio" name="correct_${i}" data-correct value="0" ${q.correct===0?'checked':''}> Vrai
          </label>
          <label class="quiz-tf-opt ${q.correct===1?'active':''}">
            <input type="radio" name="correct_${i}" data-correct value="1" ${q.correct===1?'checked':''}> Faux
          </label>
        </div>`;
    } else if (q.type === 'mcq' || q.type === 'checkbox') {
        const options = q.options || ['', ''];
        answersHtml = `
        <div class="quiz-options-list" data-options>
          ${options.map((o, oi) => renderOptionRow(q, i, o, oi)).join('')}
        </div>
        <button type="button" class="btn btn-ghost btn-sm quiz-add-option">
          <i data-lucide="plus" aria-hidden="true"></i> Ajouter une option
        </button>`;
    } else {
        answersHtml = `<p class="form-hint">La réponse courte sera évaluée manuellement par le formateur.</p>`;
    }

    return `
    <div class="quiz-question-card" data-qi="${i}">
      <div class="quiz-question-header">
        <div class="quiz-q-drag-handle" title="Déplacer">
          <i data-lucide="grip-vertical" aria-hidden="true"></i>
        </div>
        <span class="quiz-question-num">Q${i+1}</span>
        <select class="form-input form-input--sm quiz-q-type" data-qi="${i}" style="width:auto">
          ${opts}
        </select>
        <button type="button" class="btn-icon btn-icon--delete quiz-delete-q" data-qi="${i}" title="Supprimer">
          <i data-lucide="trash-2" aria-hidden="true"></i>
        </button>
      </div>
      <div class="form-group">
        <input type="text" class="form-input form-input--sm" data-qi="${i}" data-qfield="text"
               placeholder="Texte de la question…" value="${esc(q.text||'')}">
      </div>
      <div class="quiz-answers" data-qi="${i}">
        ${answersHtml}
      </div>
      <div class="form-group" style="margin-top:var(--space-2)">
        <input type="text" class="form-input form-input--sm" data-qi="${i}" data-qfield="explanation"
               placeholder="Explication (optionnel, affichée après correction)…"
               value="${esc(q.explanation||'')}">
      </div>
    </div>`;
}

function renderOptionRow(q, qi, optText, oi) {
    const isMcq = q.type === 'mcq';
    if (isMcq) {
        const checked = q.correct === oi;
        return `
        <div class="quiz-option-row" data-oi="${oi}">
          <input type="radio" name="correct_${qi}" data-correct value="${oi}" ${checked?'checked':''} title="Bonne réponse">
          <input type="text" class="form-input form-input--sm" data-oi="${oi}" data-ofield="text"
                 value="${esc(optText)}" placeholder="Option ${oi+1}…">
          <button type="button" class="btn-icon quiz-remove-option" data-oi="${oi}" title="Supprimer">
            <i data-lucide="x" aria-hidden="true"></i>
          </button>
        </div>`;
    } else {
        const checked = Array.isArray(q.correct) && q.correct.includes(oi);
        return `
        <div class="quiz-option-row" data-oi="${oi}">
          <input type="checkbox" data-correct value="${oi}" ${checked?'checked':''} title="Bonne réponse">
          <input type="text" class="form-input form-input--sm" data-oi="${oi}" data-ofield="text"
                 value="${esc(optText)}" placeholder="Option ${oi+1}…">
          <button type="button" class="btn-icon quiz-remove-option" data-oi="${oi}" title="Supprimer">
            <i data-lucide="x" aria-hidden="true"></i>
          </button>
        </div>`;
    }
}

// ── Formulaire Devoir ──────────────────────────────────────────
const DEVOIR_FILE_TYPES = [
    { v:'pdf',   l:'PDF' },
    { v:'docx',  l:'Word (.docx)' },
    { v:'xlsx',  l:'Excel (.xlsx)' },
    { v:'pptx',  l:'PowerPoint (.pptx)' },
    { v:'mp3',   l:'Audio (MP3/WAV)' },
    { v:'mp4',   l:'Vidéo (MP4)' },
    { v:'image', l:'Images (JPG/PNG)' },
    { v:'zip',   l:'Archive (.zip)' },
];

function renderDevoirForm(block) {
    const accepted = block.accepted_types || [];
    return `
    <div class="form-group">
      <label class="form-label">Titre</label>
      <input type="text" class="form-input" data-field="title" value="${esc(block.title||'')}">
    </div>
    ${richField('Consignes', 'instructions')}
    <div class="form-group">
      <label class="form-label">Types de fichiers acceptés</label>
      <div class="devoir-file-types">
        ${DEVOIR_FILE_TYPES.map(ft => `
        <label class="form-checkbox-label">
          <input type="checkbox" data-field="accepted_types" data-ftype="${ft.v}"
                 ${accepted.includes(ft.v)?'checked':''}>
          ${ft.l}
        </label>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Nombre de fichiers maximum</label>
      <input type="number" class="form-input form-input--sm" data-field="max_files"
             value="${block.max_files ?? 3}" min="1" max="10" style="width:100px">
    </div>
    <p class="form-hint">
      ID bloc : <code style="font-family:var(--font-mono);font-size:11px">${block.block_id}</code>
    </p>`;
}

function richField(label, fieldName) {
    return `
    <div class="form-group">
      ${label ? `<label class="form-label">${label}</label>` : ''}
      <div class="rich-toolbar">
        <button type="button" class="rich-btn" data-cmd="bold"                title="Gras"><b>G</b></button>
        <button type="button" class="rich-btn" data-cmd="italic"              title="Italique"><i>I</i></button>
        <button type="button" class="rich-btn" data-cmd="underline"           title="Souligné"><u>S</u></button>
        <span class="rich-sep"></span>
        <button type="button" class="rich-btn" data-cmd="insertUnorderedList" title="Liste à puces">• Liste</button>
        <button type="button" class="rich-btn" data-cmd="insertOrderedList"   title="Liste numérotée">1. Liste</button>
        <span class="rich-sep"></span>
        <button type="button" class="rich-btn" data-cmd="createLink"          title="Ajouter un lien">🔗 Lien</button>
        <button type="button" class="rich-btn" data-cmd="unlink"              title="Supprimer le lien">Ø lien</button>
        <span class="rich-sep"></span>
        <button type="button" class="rich-btn" data-cmd="removeFormat"        title="Effacer">✕</button>
      </div>
      <div class="rich-editor form-input" contenteditable="true" data-field="${fieldName}" spellcheck="false"></div>
    </div>`;
}

function field(label, input) {
    return `<div class="form-group">${label ? `<label class="form-label">${label}</label>` : ''}${input}</div>`;
}
function note(t) { return `<p class="form-hint">${t}</p>`; }

// ── Sync formulaire → bloc ────────────────────────────────────
function updateBlockFromForm(card, block) {
    if (!block) return;
    // Devoir : accepted_types est un tableau de valeurs depuis plusieurs checkboxes
    if (block.type === 'devoir') {
        const checked = [];
        card.querySelectorAll('[data-field="accepted_types"]').forEach(cb => {
            if (cb.checked) checked.push(cb.dataset.ftype);
        });
        if (checked.length || card.querySelector('[data-field="accepted_types"]')) {
            block.accepted_types = checked;
        }
    }
    card.querySelectorAll('[data-field]').forEach(el => {
        const key = el.dataset.field;
        if (key === 'accepted_types')           { return; } // géré ci-dessus
        if (key === 'items_raw')                { block.items = el.value.split('\n').map(s => s.trim()).filter(Boolean); }
        else if (el.contentEditable === 'true') { block[key] = el.innerHTML; }
        else if (el.type === 'checkbox')        { block[key] = el.checked; }
        else if (el.type === 'radio')           { if (el.checked) block[key] = el.value; }
        else                                    { block[key] = el.value; }
    });
}

// Scope uniquement à .block-container-config (fix bug titre accordéon)
function updateContainerConfig(card, block) {
    card.querySelector('.block-container-config')?.querySelectorAll('[data-field]').forEach(el => {
        if (el.contentEditable === 'true') block[el.dataset.field] = el.innerHTML;
        else block[el.dataset.field] = el.value;
    });
}

function populateRichEditors(el, blocks) {
    el.querySelectorAll('.rich-editor[contenteditable]').forEach(editor => {
        const card = editor.closest('[data-idx]');
        const idx  = parseInt(card?.dataset.idx, 10);
        if (isNaN(idx) || !blocks[idx]) return;
        const f = editor.dataset.field;
        if (f in blocks[idx]) editor.innerHTML = blocks[idx][f] || '';
    });
}

// ── Preview ───────────────────────────────────────────────────
function updatePreview() {
    const pane = _container?.querySelector('#previewPane');
    if (!pane) return;
    const html = serializeBlocks(_blocks);
    pane.innerHTML = html || '<p style="color:var(--text-muted);font-size:var(--font-caption-size);padding:var(--space-4)">Aucun contenu</p>';
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: pane });

    // Monter les blocs quiz/devoir en mode aperçu (pas d'interaction DB)
    mountQuizBlocks(pane,  { seanceId: _seance?.id || 'preview', stagiaireId: null, previewMode: true });
    mountDevoirBlocks(pane, { seanceId: _seance?.id || 'preview', stagiaireId: null, previewMode: true });

    // Sync vers localStorage pour le refresh de l'aperçu externe
    try {
        const titre = _container?.querySelector('#propTitre')?.value.trim() || _seance?.titre || '';
        localStorage.setItem('lms_preview_seance', JSON.stringify({ titre, html, ts: Date.now() }));
    } catch { /* localStorage indisponible */ }
}

// ── Sérialisation → HTML stagiaire ────────────────────────────
export function serializeBlocks(blocks) {
    return (blocks || []).map(serializeBlock).join('\n');
}

function serializeBlock(block) {
    switch (block.type) {
        case 'heading':
            return `<h3 class="seance-section-title"><i data-lucide="bookmark" aria-hidden="true"></i> ${esc(block.text || '')}</h3>`;

        case 'objectives':
            return `<div class="seance-section">
              <div class="seance-section-title"><i data-lucide="target" aria-hidden="true"></i> Objectifs de la séance</div>
              <ul class="objectifs-list">
                ${(block.items||[]).map(o => `
                <li>
                  <span class="objectif-dot"><i data-lucide="check" aria-hidden="true"></i></span>
                  ${esc(o)}
                </li>`).join('')}
              </ul>
            </div>`;

        case 'text':
            return `<div class="seance-text-block">${block.html || ''}</div>`;

        case 'rawhtml':
            return block.html || '';

        case 'video': {
            const embed = toEmbedUrl(block.url || '');
            if (!embed) return '';
            const vTitle    = block.title    ? `<span class="video-meta__title">${esc(block.title)}</span>` : '';
            const vDuration = block.duration ? `<span class="video-meta__duration"><i data-lucide="clock" aria-hidden="true"></i>${esc(block.duration)}</span>` : '';
            const vMeta     = (vTitle || vDuration)
                ? `<div class="video-meta">${vTitle}${vDuration}</div>` : '';
            const vDesc     = block.description
                ? `<p class="video-description">${esc(block.description)}</p>` : '';
            return `<div class="video-block">
              ${vMeta}
              <div class="video-wrapper"><iframe src="${esc(embed)}" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen loading="lazy"></iframe></div>
              ${vDesc}
            </div>`;
        }

        case 'audio': {
            const aUrl    = block.url || '';
            const aTitle  = esc(block.title || 'Audio');
            const aDrive  = isDriveUrl(aUrl);
            const aDlHref = aDrive ? esc(toDriveDownloadUrl(aUrl)) : esc(aUrl);

            if (aDrive) {
                // Google Drive bloque le streaming audio via CORB.
                // Fallback minimal : carte avec liens Écouter + Télécharger.
                const aOpenHref = esc(toDrivePreviewUrl(aUrl).replace('/preview', '/view'));
                return `<div class="audio-player-simple audio-player-simple--drive">
                  <div class="audio-player-simple__header">
                    <i data-lucide="headphones" aria-hidden="true"></i>
                    <span class="audio-player-simple__title">${aTitle}</span>
                    <a href="${aDlHref}" target="_blank" rel="noopener"
                       class="audio-download-btn" title="Télécharger l'audio">
                      <i data-lucide="download" aria-hidden="true"></i>
                    </a>
                  </div>
                  <a href="${aOpenHref}" target="_blank" rel="noopener"
                     class="audio-drive-fallback">
                    <i data-lucide="play-circle" aria-hidden="true"></i>
                    Écouter sur Google Drive
                  </a>
                </div>`;
            }

            // Supabase / URL directe → lecteur natif
            return `<div class="audio-player-simple">
              <div class="audio-player-simple__header">
                <i data-lucide="headphones" aria-hidden="true"></i>
                <span class="audio-player-simple__title">${aTitle}</span>
                ${aUrl ? `<a href="${aDlHref}" download class="audio-download-btn" title="Télécharger l'audio">
                  <i data-lucide="download" aria-hidden="true"></i>
                </a>` : ''}
              </div>
              <audio controls src="${esc(aUrl)}" preload="none">
                <a href="${aDlHref}" target="_blank" rel="noopener">Écouter</a>
              </audio>
            </div>`;
        }

        case 'pdf': case 'xlsx': case 'docx': case 'pptx': {
            const icons  = { pdf:'file-text', xlsx:'table-2', docx:'file-type-2', pptx:'presentation' };
            const labels = { pdf:'PDF', xlsx:'Excel', docx:'Word', pptx:'PowerPoint' };
            const fUrl   = block.url || '#';
            const fName  = esc(block.filename || block.type.toUpperCase());
            const dlHref = isDriveUrl(fUrl) ? esc(toDriveDownloadUrl(fUrl)) : esc(fUrl);

            // Bouton aperçu œil (PDF uniquement, si Drive/Supabase ou option inline cochée)
            const canPreview = block.type === 'pdf'
                && (block.inline || isDriveUrl(fUrl) || isSupabaseUrl(fUrl));
            const embedSrc   = isDriveUrl(fUrl) ? toDrivePreviewUrl(fUrl) : fUrl;

            const previewBtn = canPreview
                ? `<button class="ressource-card__btn" data-pdf-url="${esc(embedSrc)}"
                       data-pdf-title="${fName}" title="Aperçu du document" aria-label="Aperçu">
                     <i data-lucide="eye" aria-hidden="true"></i>
                   </button>`
                : '';

            // Carte avec structure div → __body (lien) + __actions (icônes)
            return `<div class="ressource-card ressource-card--${block.type}">
              <a class="ressource-card__body" href="${dlHref}" target="_blank" rel="noopener">
                <div class="ressource-card__icon"><i data-lucide="${icons[block.type]}" aria-hidden="true"></i></div>
                <div class="ressource-card__info">
                  <span class="ressource-card__name">${fName}</span>
                  <span class="ressource-card__meta">${labels[block.type]}</span>
                </div>
              </a>
              <div class="ressource-card__actions">
                ${previewBtn}
                <a href="${dlHref}" target="_blank" rel="noopener" class="ressource-card__btn" title="Télécharger" aria-label="Télécharger">
                  <i data-lucide="download" aria-hidden="true"></i>
                </a>
              </div>
            </div>`;
        }

        case 'link':
            return `<a class="ressource-card ressource-card--link" href="${esc(block.url||'#')}" target="_blank" rel="noopener">
              <div class="ressource-card__icon"><i data-lucide="external-link" aria-hidden="true"></i></div>
              <div class="ressource-card__info">
                <span class="ressource-card__name">${esc(block.label||block.url||'Lien')}</span>
                <span class="ressource-card__meta">Lien externe</span>
              </div>
              <i data-lucide="arrow-up-right" class="ressource-card__dl" aria-hidden="true"></i>
            </a>`;

        case 'activity':
            return `<div class="activite-block">
              <div class="activite-block__header"><i data-lucide="pencil-line" aria-hidden="true"></i><span>${esc(block.title||'Activité')}</span></div>
              <div class="activite-block__body">${block.instructions||''}</div>
            </div>`;

        case 'keypoints':
            return `<div class="key-points">
              <div class="key-points__title"><i data-lucide="star" aria-hidden="true"></i> Points clés</div>
              <ul class="key-points__list">
                ${(block.items||[]).map(i=>`<li><i data-lucide="check-circle" aria-hidden="true"></i>${esc(i)}</li>`).join('')}
              </ul>
            </div>`;

        case 'accordion':
            return `<details class="sub-accordion">
              <summary class="sub-accordion-summary">
                <i data-lucide="chevron-right" class="sub-accordion-chevron" aria-hidden="true"></i>
                ${esc(block.title||'Section')}
              </summary>
              <div class="sub-accordion-body">${serializeBlocks(block.children||[])}</div>
            </details>`;

        case 'columns2': {
            const [s0,s1] = block.children || [[],[]];
            return `<div class="seance-columns" style="grid-template-columns:1fr 1fr">
              <div class="seance-column">${serializeBlocks(s0)}</div>
              <div class="seance-column">${serializeBlocks(s1)}</div>
            </div>`;
        }

        case 'columns4': {
            const cfg   = COL_LAYOUTS[block.layout] || COL_LAYOUTS['1+1+1+1'];
            const slots = ensureSlots(block.children || [], cfg.slots);
            return `<div class="seance-columns" style="grid-template-columns:${cfg.grid}">
              ${slots.map(s=>`<div class="seance-column">${serializeBlocks(s)}</div>`).join('')}
            </div>`;
        }

        case 'spacer': {
            const st = block.style || 'space';
            if (st === 'space') return `<div class="seance-spacer seance-spacer--space"></div>`;
            return `<hr class="seance-spacer seance-spacer--${st}">`;
        }

        case 'quiz': {
            if (!block.questions?.length) return '';
            const n       = block.questions.length;
            const payload = JSON.stringify({
                block_id:        block.block_id,
                title:           block.title || 'Quiz',
                show_correction: block.show_correction ?? true,
                passing_score:   block.passing_score ?? 70,
                questions:       block.questions,
            });
            // HTML statique visible immédiatement ; quizPlayer.js le remplace au montage
            return `<div class="quiz-block" data-quiz="${attrEsc(payload)}">
              <div class="quiz-player">
                <div class="quiz-player__header">
                  <div class="quiz-player__icon"><i data-lucide="help-circle" aria-hidden="true"></i></div>
                  <div>
                    <div class="quiz-player__title">${esc(block.title || 'Quiz')}</div>
                    <div class="quiz-player__meta">${n} question${n>1?'s':''} · Score de passage : ${block.passing_score ?? 70}%</div>
                  </div>
                </div>
                <div style="padding:var(--space-4) var(--space-5);color:var(--text-muted);font-size:var(--font-caption-size)">
                  <i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Chargement du quiz…
                </div>
              </div>
            </div>`;
        }

        case 'devoir': {
            const accepted  = (block.accepted_types || []).join(', ').toUpperCase() || '—';
            const dPayload  = JSON.stringify({
                block_id:       block.block_id,
                title:          block.title || 'Devoir à rendre',
                instructions:   block.instructions || '',
                accepted_types: block.accepted_types || [],
                max_files:      block.max_files || 3,
            });
            // HTML statique visible immédiatement ; devoirUpload.js le remplace au montage
            return `<div class="devoir-block" data-devoir="${attrEsc(dPayload)}">
              <div class="devoir-player">
                <div class="devoir-player__header">
                  <div class="devoir-player__icon"><i data-lucide="upload" aria-hidden="true"></i></div>
                  <div class="devoir-player__info">
                    <div class="devoir-player__title">${esc(block.title || 'Devoir à rendre')}</div>
                    <div class="devoir-player__types">
                      <span class="badge badge-neutral">${esc(accepted)}</span>
                      <span class="devoir-player__maxfiles">${block.max_files ?? 3} fichier${(block.max_files??3)>1?'s':''} max</span>
                    </div>
                  </div>
                </div>
                <div style="padding:var(--space-4) var(--space-5);color:var(--text-muted);font-size:var(--font-caption-size)">
                  <i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Chargement…
                </div>
              </div>
            </div>`;
        }

        default: return '';
    }
}

function blockPreview(block) {
    switch (block.type) {
        case 'heading':    return block.text || '(sans titre)';
        case 'objectives': return `${(block.items||[]).length} objectif(s)`;
        case 'text':       return block.html ? block.html.replace(/<[^>]+>/g,'').slice(0,60) : '(vide)';
        case 'rawhtml':    return '(HTML hérité)';
        case 'video':      return block.url ? block.url.slice(0,55)+'…' : '(URL manquante)';
        case 'audio':      return block.title || block.url || '(audio)';
        case 'pdf': case 'xlsx': case 'docx': case 'pptx': return block.filename || block.type.toUpperCase();
        case 'link':       return block.label || block.url || '(lien)';
        case 'activity':   return block.title || '(activité)';
        case 'keypoints':  return `${(block.items||[]).length} point(s) clé(s)`;
        case 'accordion':  return block.title || '(accordéon)';
        case 'columns2':   return '2 colonnes';
        case 'columns4':   return `Colonnes — ${block.layout||'1+1+1+1'}`;
        case 'spacer':     return '—';
        case 'quiz':       return `${(block.questions||[]).length} question(s) — ${block.title||'Quiz'}`;
        case 'devoir':     return block.title || 'Devoir à rendre';
        default:           return '';
    }
}

function createDefaultBlock(type) {
    const d = {
        heading:    { text: 'Nouveau titre' },
        objectives: { items: ['Objectif 1', 'Objectif 2'] },
        text:       { html: '<p></p>' },
        video:      { url: '', caption: '' },
        audio:      { url: '', title: 'Titre de l\'audio' },
        pdf:        { url: '', filename: '' },
        xlsx:       { url: '', filename: '' },
        docx:       { url: '', filename: '' },
        pptx:       { url: '', filename: '' },
        link:       { url: '', label: '' },
        activity:   { title: 'Activité pratique', instructions: '<p></p>' },
        keypoints:  { items: ['Point clé 1'] },
        accordion:  { title: '', children: [] },
        columns2:   { children: [[], []] },
        columns4:   { layout: '1+1+1+1', children: [[], [], [], []] },
        spacer:     { style: 'space' },
        quiz:       {
            block_id: crypto.randomUUID(),
            title: 'Quiz de compréhension',
            show_correction: true,
            passing_score: 70,
            questions: [],
        },
        devoir:     {
            block_id: crypto.randomUUID(),
            title: 'Devoir à rendre',
            instructions: '<p>Déposez votre travail ci-dessous.</p>',
            accepted_types: ['pdf', 'docx', 'mp3', 'mp4'],
            max_files: 3,
        },
    };
    return { type, ...(d[type] || {}) };
}

// ── Layout colonnes ───────────────────────────────────────────
function applyLayoutChange(block, newLayout) {
    const cfg = COL_LAYOUTS[newLayout] || COL_LAYOUTS['1+1+1+1'];
    const old = block.children || [];
    const ch  = Array.from({ length: cfg.slots }, (_, i) => old[i] || []);
    for (let i = cfg.slots; i < old.length; i++) ch[cfg.slots - 1].push(...(old[i] || []));
    block.layout   = newLayout;
    block.children = ch;
}

// ── Parse blocs + fallback legacy HTML ────────────────────────
function parseBlocks(blocks, contenu) {
    if (blocks) {
        if (typeof blocks === 'string') { try { const p = JSON.parse(blocks); if (Array.isArray(p) && p.length) return p; } catch { /* */ } }
        if (Array.isArray(blocks) && blocks.length) return blocks;
    }
    if (contenu?.trim()) return [{ type: 'rawhtml', html: contenu }];
    return [];
}

// ── Helpers ───────────────────────────────────────────────────
function ensureSlots(children, n) {
    const arr = Array.isArray(children) ? [...children] : [];
    while (arr.length < n) arr.push([]);
    return arr.slice(0, n);
}
function toEmbedUrl(url) {
    if (!url) return '';
    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    // Vimeo
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    // Google Drive (vidéo, audio, PDF) — /view ou /edit → /preview
    if (isDriveUrl(url)) return toDrivePreviewUrl(url);
    return url;
}
/** Convertit n'importe quel lien Drive partagé en URL de prévisualisation */
function toDrivePreviewUrl(url) {
    if (!url) return '';
    const m = url.match(/drive\.google\.com\/file\/d\/([^/?#\s]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    // Liens "open?id=..." → conversion
    const o = url.match(/[?&]id=([^&\s]+)/);
    if (o && url.includes('drive.google.com')) return `https://drive.google.com/file/d/${o[1]}/preview`;
    return url;
}
/** Retourne true si l'URL est un lien Google Drive */
function isDriveUrl(url) {
    return /drive\.google\.com/.test(url || '');
}
/** Retourne true si l'URL est un fichier Supabase Storage */
function isSupabaseUrl(url) {
    return /supabase\.co\/storage/.test(url || '');
}
/** Convertit un lien Drive partagé en URL de streaming direct (pour <audio src>) */
function toDriveStreamUrl(url) {
    if (!url) return '';
    const m = url.match(/drive\.google\.com\/file\/d\/([^/?#\s]+)/);
    if (m) return `https://drive.google.com/uc?id=${m[1]}`;
    return url;
}
/** Convertit un lien Drive partagé en lien de téléchargement direct */
function toDriveDownloadUrl(url) {
    if (!url) return '';
    const m = url.match(/drive\.google\.com\/file\/d\/([^/?#\s]+)/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    return url;
}
function esc(str) {
    const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML;
}

/** Escapes a string for safe embedding inside an HTML attribute value (double-quoted).
 *  Unlike esc(), this also encodes `"` → `&quot;` so JSON payloads don't break the attribute. */
function attrEsc(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
