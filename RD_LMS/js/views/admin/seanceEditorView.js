import { mountQuizBlocks }  from '../../utils/quizPlayer.js';
import { mountDevoirBlocks } from '../../utils/devoirUpload.js';
import { db }                from '../../lib/supabaseClient.js';
import {
    getPathways, getPathwayConfigs, getPathwayTree,
    getSeanceForEditor, saveSeanceContent,
} from '../../models/ContentModel.js';

// ── Blocs simples ─────────────────────────────────────────────
const SIMPLE_TYPES = [
    { type: 'heading',         icon: 'heading',       label: 'Titre de section' },
    { type: 'objectives',      icon: 'target',        label: 'Objectifs' },
    { type: 'text',            icon: 'type',          label: 'Texte libre' },
    { type: 'callout',         icon: 'info',          label: 'Encadré callout' },
    { type: 'consigne',        icon: 'clipboard-list', label: 'Consigne' },
    { type: 'video',           icon: 'play',          label: 'Vidéo' },
    { type: 'audio',           icon: 'headphones',    label: 'Audio' },
    { type: 'pdf',             icon: 'file-text',     label: 'PDF' },
    { type: 'xlsx',            icon: 'table-2',       label: 'Excel' },
    { type: 'docx',            icon: 'file-text',     label: 'Word' },
    { type: 'pptx',            icon: 'presentation',  label: 'PowerPoint' },
    { type: 'resources_group', icon: 'folder-open',   label: 'Ressources groupées' },
    { type: 'iframe',          icon: 'monitor',       label: 'Ressource externe (iframe)' },
    { type: 'code',            icon: 'code-2',        label: 'Code coloré' },
    { type: 'link',            icon: 'link',          label: 'Lien externe' },
    { type: 'activity',        icon: 'pencil-line',   label: 'Activité' },
    { type: 'keypoints',       icon: 'star',          label: 'Points clés' },
    { type: 'poll',            icon: 'bar-chart-2',   label: 'Sondage rapide' },
    { type: 'spacer',          icon: 'minus',         label: 'Séparateur' },
    { type: 'quiz',            icon: 'help-circle',   label: 'Quiz' },
    { type: 'devoir',          icon: 'upload',        label: 'Devoir à rendre' },
    { type: 'seance_end',      icon: 'award',         label: 'Fin de séance' },
];

// ── Blocs conteneurs ──────────────────────────────────────────
const CONTAINER_TYPES = [
    { type: 'welcome',   icon: 'smile',          label: 'Accueil + Objectifs' },
    { type: 'consignes', icon: 'clipboard-list', label: 'Consignes +' },
    { type: 'accordion', icon: 'layers',         label: 'Accordéon' },
    { type: 'columns2',  icon: 'panel-left',     label: '2 colonnes' },
    { type: 'columns4',  icon: 'layout-grid',    label: 'Colonnes (flex)' },
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

// ── Undo / Redo ───────────────────────────────────────────────
let _history    = [];
let _historyIdx = -1;

// ── Auto-save ─────────────────────────────────────────────────
let _autoSaveTimer = null;
const AUTOSAVE_KEY = () => `lms_autosave_${_seance?.id || 'unknown'}`;

// ── Gabarits ──────────────────────────────────────────────────
const TEMPLATES_KEY = 'lms_block_templates';

// ── Prévisualisation mobile ───────────────────────────────────
let _mobilePreview = false;

// ── Raccourcis clavier (pour pouvoir les retirer au démontage) ─
let _kbdHandler = null;

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
          <span id="autoSaveBadge" class="badge badge-neutral" style="display:none;font-size:11px">
            <i data-lucide="cloud" aria-hidden="true"></i> Brouillon local
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

          <div class="editor-props-section">
            <h3 class="editor-props-title" style="display:flex;align-items:center;justify-content:space-between">
              Gabarits
              <span style="font-size:11px;font-weight:normal;color:var(--text-muted)">Blocs enregistrés</span>
            </h3>
            <div id="gabaritsPanel"></div>
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
                <button class="btn-icon" id="btnMobilePreview" title="Basculer vue mobile / bureau">
                  <i data-lucide="smartphone" aria-hidden="true"></i>
                </button>
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
            pushHistory();
            _blocks.push(createDefaultBlock(btn.dataset.type));
            _saved = false;
            renderBlockList();
            scheduleAutoSave();
            const last = container.querySelector('#blockList .block-card:last-child');
            last?.querySelector('.block-edit-form')?.classList.remove('hidden');
            last?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });

    // ── Mobile preview toggle ──────────────────────────────────
    container.querySelector('#btnMobilePreview')?.addEventListener('click', () => {
        _mobilePreview = !_mobilePreview;
        const pane = container.querySelector('#previewPane');
        const btn  = container.querySelector('#btnMobilePreview');
        pane?.classList.toggle('editor-preview-mobile', _mobilePreview);
        btn?.classList.toggle('btn-icon--active', _mobilePreview);
        const icon = _mobilePreview ? 'monitor' : 'smartphone';
        if (btn) { btn.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`; if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn }); }
    });

    // ── Setup keyboard shortcuts ───────────────────────────────
    setupKeyboardShortcuts(container);

    // ── Init gabarits + restore auto-save ─────────────────────
    _history = []; _historyIdx = -1;
    renderBlockList();
    pushHistory(); // snapshot initial
    renderGabaritsPanel();
    updatePreview();
    checkAutoSaveRestore();
}

// ── Publier (blocs + HTML → DB, stagiaires voient les changements) ──
async function doPublish(container) {
    const btn = container.querySelector('#btnSaveAll');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Publication…'; }
    if (typeof lucide !== 'undefined') lucide.createIcons?.({ root: btn });
    await _onSave(serializeBlocks(_blocks), _blocks);
    _saved = true;
    clearAutoSave();
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
    clearAutoSave();
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

// ── Historique undo / redo ────────────────────────────────────
function pushHistory() {
    _history = _history.slice(0, _historyIdx + 1);
    _history.push(JSON.stringify(_blocks));
    if (_history.length > 40) _history.shift();
    _historyIdx = _history.length - 1;
}

function undoHistory() {
    if (_historyIdx <= 0) return;
    _historyIdx--;
    _blocks = JSON.parse(_history[_historyIdx]);
    _saved  = false;
    renderBlockList();
    updatePreview();
    scheduleAutoSave();
}

function redoHistory() {
    if (_historyIdx >= _history.length - 1) return;
    _historyIdx++;
    _blocks = JSON.parse(_history[_historyIdx]);
    _saved  = false;
    renderBlockList();
    updatePreview();
    scheduleAutoSave();
}

// ── Auto-sauvegarde (debounce 3 s → localStorage) ─────────────
function scheduleAutoSave() {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(() => {
        try {
            localStorage.setItem(AUTOSAVE_KEY(), JSON.stringify(_blocks));
            const badge = _container?.querySelector('#autoSaveBadge');
            if (badge) { badge.style.display = ''; setTimeout(() => { badge.style.display = 'none'; }, 2000); }
        } catch { /* storage full */ }
    }, 3000);
}

function clearAutoSave() {
    clearTimeout(_autoSaveTimer);
    try { localStorage.removeItem(AUTOSAVE_KEY()); } catch { /* */ }
}

function checkAutoSaveRestore() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY());
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!Array.isArray(saved) || !saved.length) return;
        if (confirm('Une sauvegarde automatique a été trouvée. Restaurer les modifications non publiées ?')) {
            _blocks = saved;
            renderBlockList();
            updatePreview();
        } else {
            clearAutoSave();
        }
    } catch { /* */ }
}

// ── Raccourcis clavier ────────────────────────────────────────
function setupKeyboardShortcuts(container) {
    if (_kbdHandler) document.removeEventListener('keydown', _kbdHandler);
    _kbdHandler = (e) => {
        if (!container.isConnected) { document.removeEventListener('keydown', _kbdHandler); return; }
        const ctrl = e.ctrlKey || e.metaKey;
        if (!ctrl) return;

        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoHistory(); return; }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redoHistory(); return; }
        if (e.key === 's' && e.shiftKey) { e.preventDefault(); doPublish(container); return; }
        if (e.key === 's' && !e.shiftKey) { e.preventDefault(); doSaveDraft(container); return; }
    };
    document.addEventListener('keydown', _kbdHandler);
}

// ── Gabarits de blocs (localStorage) ─────────────────────────
function getTemplates() {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
}

function saveTemplate(block) {
    const name = prompt('Nom du gabarit :', block.title || block.text || block.type);
    if (!name?.trim()) return;
    const list = getTemplates();
    list.push({ name: name.trim(), block: JSON.parse(JSON.stringify(block)), savedAt: Date.now() });
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list)); } catch { alert('Impossible de sauvegarder (stockage plein).'); }
    renderGabaritsPanel();
}

function deleteTemplate(idx) {
    const list = getTemplates();
    list.splice(idx, 1);
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list)); } catch { /* */ }
    renderGabaritsPanel();
}

function renderGabaritsPanel() {
    const panel = _container?.querySelector('#gabaritsPanel');
    if (!panel) return;
    const list = getTemplates();
    if (!list.length) {
        panel.innerHTML = '<p class="form-hint" style="margin:0">Aucun gabarit enregistré.<br>Cliquez sur <i data-lucide="bookmark-plus" style="width:12px;height:12px;vertical-align:middle"></i> sur un bloc pour le sauvegarder.</p>';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: panel });
        return;
    }
    panel.innerHTML = list.map((t, i) => `
    <div class="gabarit-item">
      <button class="gabarit-load-btn" data-idx="${i}" title="Insérer ce gabarit">
        <i data-lucide="${ALL_TYPES.find(bt=>bt.type===t.block.type)?.icon||'box'}" aria-hidden="true"></i>
        <span>${esc(t.name)}</span>
      </button>
      <button class="gabarit-delete-btn btn-icon" data-idx="${i}" title="Supprimer ce gabarit">
        <i data-lucide="x" aria-hidden="true"></i>
      </button>
    </div>`).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: panel });
    panel.querySelectorAll('.gabarit-load-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const t = getTemplates()[parseInt(btn.dataset.idx, 10)];
            if (!t) return;
            pushHistory();
            _blocks.push(deepCloneBlock(t.block));
            _saved = false;
            renderBlockList();
            updatePreview();
            scheduleAutoSave();
            const last = _container?.querySelector('#blockList .block-card:last-child');
            last?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });
    panel.querySelectorAll('.gabarit-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm('Supprimer ce gabarit ?')) return;
            deleteTemplate(parseInt(btn.dataset.idx, 10));
        });
    });
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
    if (block.type === 'welcome') {
        block.children = block.children || [];
        const area = card.querySelector('.nested-slot');
        if (area) mountNestedSlot(area, block.children, onChange, { allowContainers: false });

    } else if (block.type === 'consignes') {
        block.children = block.children || [];
        const area = card.querySelector('.nested-slot');
        if (area) mountNestedSlot(area, block.children, onChange, { allowContainers: true });

    } else if (block.type === 'accordion') {
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
            const lastCard = cards[cards.length - 1];
            lastCard?.querySelector('.nested-edit-form')?.classList.remove('hidden');
            // Si quiz : monter l'éditeur quiz immédiatement (form auto-ouvert)
            const lastIdx = lastCard ? parseInt(lastCard.dataset.idx, 10) : -1;
            if (lastCard && blocks[lastIdx]?.type === 'quiz' && !lastCard.dataset.quizMounted) {
                lastCard.dataset.quizMounted = '1';
                mountQuizEditor(lastCard, blocks[lastIdx], onChange);
            }
        });
    });

    // ── Events blocs simples — uniquement les enfants directs ────
    areaEl.querySelectorAll(':scope > .nested-card:not([data-container])').forEach(card => {
        const idx = parseInt(card.dataset.idx, 10);
        card.querySelector('.nested-edit-toggle')?.addEventListener('click', () => {
            const form = card.querySelector('.nested-edit-form');
            form?.classList.toggle('hidden');
            // Monter l'éditeur quiz à la première ouverture du formulaire
            if (!form?.classList.contains('hidden') && blocks[idx]?.type === 'quiz' && !card.dataset.quizMounted) {
                card.dataset.quizMounted = '1';
                mountQuizEditor(card, blocks[idx], onChange);
            }
        });
        card.querySelector('.nested-clone-to')?.addEventListener('click', () => {
            openCloneBlockModal(blocks[idx]);
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
        bindRichToolbars(card, () => { updateBlockFromForm(card, blocks[idx]); onChange(); });
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

    // ── Parcourir Supabase Storage — blocs imbriqués ────────────
    // Délégation sur areaEl : survit aux rerenders internes (quiz/poll/rg
    // font form.innerHTML = … ce qui détruit les listeners directs).
    // Guard _browseDelegated évite d'empiler plusieurs listeners si
    // remountNestedSlot rappelle mountNestedSlot sur le même areaEl.
    if (!areaEl._browseDelegated) {
        areaEl._browseDelegated = true;
        areaEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.block-browse-url');
            if (!btn || !areaEl.contains(btn)) return;
            e.stopPropagation();
            const row      = btn.closest('.url-browse-row');
            const urlInput = row?.querySelector('input[data-field]') ?? row?.querySelector('[data-field]');
            console.log('[browse-nested] btn clicked | row=', row, '| urlInput=', urlInput);
            if (urlInput) openStorageBrowser(urlInput, { accept: btn.dataset.accept || 'all' });
            else console.warn('[browse-nested] urlInput introuvable — vérifiez le DOM du bouton', btn);
        });
    }
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
    const isCt = ['welcome', 'consignes', 'accordion', 'columns2', 'columns4'].includes(block.type);

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
        <button class="btn-icon block-duplicate"      title="Dupliquer dans cette séance"><i data-lucide="copy"></i></button>
        <button class="btn-icon block-clone-to"       title="Cloner vers une autre séance"><i data-lucide="send-horizontal"></i></button>
        <button class="btn-icon block-save-template"  title="Sauvegarder comme gabarit"><i data-lucide="bookmark-plus"></i></button>
        ${['quiz','objectives'].includes(block.type) ? `<button class="btn-icon block-ai-generate" title="Générer avec l'IA"><i data-lucide="sparkles"></i></button>` : ''}
        ${!isCt ? `<button class="btn-icon btn-icon--edit block-edit-toggle" title="Modifier"><i data-lucide="settings-2"></i></button>` : ''}
        ${isCt  ? `<button class="btn-icon block-collapse-toggle" title="Réduire / Développer"><i data-lucide="chevron-up"></i></button>` : ''}
        <button class="btn-icon btn-icon--delete block-delete" title="Supprimer"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;

    let body = '';
    if (block.type === 'welcome') {
        body = `
        <div class="block-container-body">
          <div class="block-container-config block-container-config--welcome">
            <div class="welcome-editor-preview">
              <i data-lucide="smile" aria-hidden="true"></i>
              <span>Accordéon ouvert par défaut — stagiaire peut réduire</span>
            </div>
            <input type="text" class="form-input form-input--sm" data-field="title"
                   placeholder="Titre de la séance…" value="${esc(block.title || '')}" style="width:100%">
            <textarea class="form-input form-textarea" data-field="message" rows="2"
                      placeholder="👋 Bonjour $prenom, aujourd'hui nous allons…" style="width:100%;resize:vertical">${esc(block.message || '')}</textarea>
            <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
              <input type="text" class="form-input form-input--sm" data-field="duration"
                     value="${esc(block.duration || '')}" placeholder="⏱ Durée ex : 30 min" style="max-width:160px;flex:1">
              <input type="text" class="form-input form-input--sm" data-field="updated_date"
                     value="${esc(block.updated_date || '')}" placeholder="📅 Mis à jour le…" style="max-width:200px;flex:1">
            </div>
            <p class="form-hint" style="margin:0;font-size:11px">💡 <code>$prenom</code> sera remplacé par le prénom · Ajoutez les blocs <strong>Objectifs</strong> dans le slot ci-dessous</p>
          </div>
          <div class="nested-slot"></div>
        </div>`;

    } else if (block.type === 'consignes') {
        const cmModes = [
            { v:'instruction', icon:'clipboard-list', l:'Consigne'  },
            { v:'important',   icon:'alert-circle',   l:'Important' },
            { v:'astuce',      icon:'lightbulb',      l:'Astuce'    },
            { v:'rappel',      icon:'bell',           l:'Rappel'    },
            { v:'lecture',     icon:'book-open',      l:'Lecture'   },
        ];
        const cmCurrent = block.mode || 'instruction';
        body = `
        <div class="block-container-body">
          <div class="block-container-config block-container-config--consignes">
            <div class="consignes-mode-picker">${cmModes.map(m =>
                `<label class="consignes-mode-opt${cmCurrent===m.v?' active':''}">
                  <input type="radio" name="consignes_mode_${block.block_id||idx}" data-field="mode"
                         value="${m.v}" ${cmCurrent===m.v?'checked':''}>
                  <span class="consignes-mode-opt__icon consignes-mode-opt__icon--${m.v}">
                    <i data-lucide="${m.icon}" aria-hidden="true"></i>
                  </span>
                  <span class="consignes-mode-opt__label">${m.l}</span>
                </label>`
            ).join('')}</div>
            <input type="text" class="form-input form-input--sm" data-field="title"
                   placeholder="Titre personnalisé (optionnel)…" value="${esc(block.title || '')}" style="width:100%">
            <p class="form-hint" style="margin:0;font-size:11px">💡 Ajoutez n'importe quel bloc dans le slot — vidéo, audio, texte, quiz…</p>
          </div>
          <div class="nested-slot"></div>
        </div>`;

    } else if (block.type === 'accordion') {
        const accVariant = block.variant || 'standard';
        body = `
        <div class="block-container-body">
          <div class="block-container-config" style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
            <input type="text" class="form-input form-input--sm" data-field="title"
                   placeholder="Titre du panneau…" value="${esc(block.title || '')}" style="flex:1;min-width:180px">
            <select class="form-input form-input--sm" data-field="variant" style="max-width:230px" title="Variante visuelle">
              <option value="standard"  ${accVariant==='standard' ?'selected':''}>Standard</option>
              <option value="objectifs" ${accVariant==='objectifs'?'selected':''}>📋 Objectifs (ouvert par défaut)</option>
              <option value="activite"  ${accVariant==='activite' ?'selected':''}>✏️ Activité</option>
            </select>
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
          <button class="btn-icon nested-clone-to"  title="Cloner vers une autre séance"><i data-lucide="send-horizontal"></i></button>
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
    const isCt = ['welcome', 'consignes', 'accordion', 'columns2', 'columns4'].includes(block.type);

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
        pushHistory();
        [_blocks[idx-1], _blocks[idx]] = [_blocks[idx], _blocks[idx-1]];
        _saved = false; renderBlockList(); updatePreview(); scheduleAutoSave();
    });
    card.querySelector('.block-move-down')?.addEventListener('click', () => {
        if (idx === _blocks.length - 1) return;
        pushHistory();
        [_blocks[idx], _blocks[idx+1]] = [_blocks[idx+1], _blocks[idx]];
        _saved = false; renderBlockList(); updatePreview(); scheduleAutoSave();
    });
    card.querySelector('.block-delete')?.addEventListener('click', () => {
        if (!confirm('Supprimer ce bloc ?')) return;
        pushHistory();
        _blocks.splice(idx, 1); _saved = false; renderBlockList(); updatePreview(); scheduleAutoSave();
    });
    card.querySelector('.block-duplicate')?.addEventListener('click', () => {
        pushHistory();
        _blocks.splice(idx + 1, 0, deepCloneBlock(block));
        _saved = false; renderBlockList(); updatePreview(); scheduleAutoSave();
    });
    card.querySelector('.block-save-template')?.addEventListener('click', () => {
        saveTemplate(block);
    });
    card.querySelector('.block-clone-to')?.addEventListener('click', () => {
        openCloneBlockModal(block);
    });
    card.querySelector('.block-edit-toggle')?.addEventListener('click', () => {
        const form = card.querySelector('.block-edit-form');
        const wasHidden = form?.classList.contains('hidden');
        form?.classList.toggle('hidden');
        if (wasHidden) {
            pushHistory();
            // Montage via _mountDynamic() déjà défini plus bas dans bindRootCardEvents.
            // On l'appellera après — ici on utilise le même guard dataset.
            if (block.type === 'quiz' && !card.dataset.quizMounted) {
                card.dataset.quizMounted = '1';
                mountQuizEditor(card, block, () => { _saved = false; updatePreview(); scheduleAutoSave(); });
            }
            if (block.type === 'resources_group' && !card.dataset.rgMounted) {
                card.dataset.rgMounted = '1';
                mountResourcesGroupEditor(card, block, () => {
                    delete card.dataset.rgMounted;
                    _saved = false; updatePreview(); scheduleAutoSave();
                });
            }
            if (block.type === 'poll' && !card.dataset.pollMounted) {
                card.dataset.pollMounted = '1';
                mountPollEditor(card, block, () => { _saved = false; updatePreview(); scheduleAutoSave(); });
            }
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

    // Pickers radio visuels — .active toggle (simple ET conteneurs)
    card.querySelectorAll(
        '.spacer-style-opt input[type="radio"], .callout-variant-opt input[type="radio"], .consignes-mode-opt input[type="radio"]'
    ).forEach(radio => {
        radio.addEventListener('change', () => {
            const picker = radio.closest('.spacer-style-picker, .callout-variant-picker, .consignes-mode-picker');
            picker?.querySelectorAll('.spacer-style-opt, .callout-variant-opt, .consignes-mode-opt')
                   .forEach(opt => opt.classList.remove('active'));
            radio.closest('.spacer-style-opt, .callout-variant-opt, .consignes-mode-opt')?.classList.add('active');
        });
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
            const h = () => { updateBlockFromForm(card, block); _saved = false; updatePreview(); scheduleAutoSave(); };
            el.addEventListener('input', h); el.addEventListener('change', h);
        });
        card.querySelectorAll('.rich-editor').forEach(ed => {
            ed.addEventListener('input', () => { updateBlockFromForm(card, block); _saved = false; updatePreview(); scheduleAutoSave(); });
        });
        bindRichToolbars(card, () => { updateBlockFromForm(card, block); _saved = false; updatePreview(); scheduleAutoSave(); });

        // ── Éditeurs dynamiques — montage unique (guard via dataset) ──────
        // quiz/resources_group/poll : montés à l'ouverture du formulaire
        // (le toggle ci-dessus s'en charge). On force aussi un montage
        // immédiat si le formulaire vient d'être auto-ouvert (nouveau bloc).
        const _mountDynamic = () => {
            if (block.type === 'quiz' && !card.dataset.quizMounted) {
                card.dataset.quizMounted = '1';
                mountQuizEditor(card, block, () => { _saved = false; updatePreview(); scheduleAutoSave(); });
            }
            if (block.type === 'resources_group' && !card.dataset.rgMounted) {
                card.dataset.rgMounted = '1';
                mountResourcesGroupEditor(card, block, () => {
                    delete card.dataset.rgMounted;   // reset → rerender peut re-monter
                    _saved = false; updatePreview(); scheduleAutoSave();
                });
            }
            if (block.type === 'poll' && !card.dataset.pollMounted) {
                card.dataset.pollMounted = '1';
                mountPollEditor(card, block, () => { _saved = false; updatePreview(); scheduleAutoSave(); });
            }
        };
        _mountDynamic();

        // ── Parcourir Supabase Storage (tous les blocs ressource) ──
        // Délégation sur card : survit aux rerenders internes (quiz/poll/rg
        // font form.innerHTML = … ce qui détruit les listeners directs).
        card.addEventListener('click', (e) => {
            const btn = e.target.closest('.block-browse-url');
            if (!btn || !card.contains(btn)) return;
            e.stopPropagation();
            const row      = btn.closest('.url-browse-row');
            const urlInput = row?.querySelector('input[data-field]') ?? row?.querySelector('[data-field]');
            console.log('[browse-root] btn clicked | row=', row, '| urlInput=', urlInput);
            if (urlInput) openStorageBrowser(urlInput, { accept: btn.dataset.accept || 'all' });
            else console.warn('[browse-root] urlInput introuvable — vérifiez le DOM du bouton', btn);
        });

        // ── IA générative ──────────────────────────────────────────
        card.querySelector('.block-ai-generate')?.addEventListener('click', () => {
            openAiGenerateModal(block, () => { _saved = false; renderBlockList(); updatePreview(); scheduleAutoSave(); });
        });

        // ── Sync → auto-save ──────────────────────────────────────
        card.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input',  () => scheduleAutoSave());
            el.addEventListener('change', () => scheduleAutoSave());
        });
    }
}

// ── Quiz : montage des événements dynamiques ───────────────────
function mountQuizEditor(card, block, onChange) {
    block.questions = block.questions || [];

    const rerender = () => {
        // Supporte les blocs racines (.block-edit-form) ET imbriqués (.nested-edit-form)
        const form = card.querySelector('.block-edit-form') ?? card.querySelector('.nested-edit-form');
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
        // Titre audio (sections uniquement)
        qCard.querySelector(`[data-qfield="audioTitle"]`)?.addEventListener('input', (e) => {
            q.audioTitle = e.target.value; onChange();
        });
        // Parcourir le bucket Supabase
        qCard.querySelector('.quiz-browse-audio')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const inp = qCard.querySelector('[data-qfield="audio"]');
            console.log('[browse-quiz-audio] cliqué | inp=', inp);
            openStorageBrowser(inp);
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

    // Titre / passing_score / show_correction / sectioned / banner / merci
    card.querySelector('[data-field="title"]')?.addEventListener('input', e => { block.title = e.target.value; onChange(); });
    card.querySelector('[data-field="passing_score"]')?.addEventListener('change', e => { block.passing_score = parseInt(e.target.value,10); onChange(); });
    card.querySelector('[data-field="show_correction"]')?.addEventListener('change', e => { block.show_correction = e.target.checked; onChange(); });
    card.querySelector('[data-field="sectioned"]')?.addEventListener('change', e => { block.sectioned = e.target.checked; onChange(); });
    card.querySelector('[data-field="banner"]')?.addEventListener('input', e => { block.banner = e.target.value; onChange(); });
    card.querySelector('[data-field="merci"]')?.addEventListener('input', e => { block.merci = e.target.value; onChange(); });
    card.querySelector('.quiz-browse-banner')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const inp = card.querySelector('[data-field="banner"]');
        console.log('[browse-quiz-banner] cliqué | inp=', inp);
        openStorageBrowser(inp, { accept: 'image' });
    });

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
                ex.innerHTML = `<strong>Format Aiken+ (sections + audio + description + explication) :</strong>
<pre>SECTION: Partie 1 — Compréhension
SECTION_DESC: Écoutez l'audio, puis répondez aux questions.
SECTION_AUDIO: https://...url-audio-1.mp3

Question 1 ?
A) Option A
B) Option B
C) Option C
ANSWER: B
EXPLANATION: L'option B est correcte car...

SECTION: Partie 2 — Vocabulaire
SECTION_AUDIO: https://...url-audio-2.mp3

Question 2 ?
A) Vrai
B) Faux
ANSWER: A
EXPLICATION: C'est vrai parce que...</pre>`;
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

// ── Éditeur Ressources groupées ───────────────────────────────
// ── Catégories ressources groupées ───────────────────────────
const RG_CATS = {
    pdf:          { label: 'PDF',              icon: 'file-text'     },
    texte:        { label: 'Éditeur de texte', icon: 'file-type-2'   },
    tableur:      { label: 'Tableur',          icon: 'table-2'       },
    presentation: { label: 'Présentation',     icon: 'presentation'  },
    audio:        { label: 'Audio',            icon: 'headphones'    },
    video:        { label: 'Vidéo',            icon: 'play-circle'   },
    image:        { label: 'Image',            icon: 'image'         },
    lien:         { label: 'Lien',             icon: 'external-link' },
    autre:        { label: 'Autre',            icon: 'paperclip'     },
};

function rgCatSelect(currentVal, fi) {
    return `<select class="form-input form-input--sm rg-cat-select" data-fi="${fi}" title="Catégorie">
      ${Object.entries(RG_CATS).map(([v, c]) =>
        `<option value="${v}" ${currentVal === v ? 'selected' : ''}>${c.label}</option>`
      ).join('')}
    </select>`;
}

function mountResourcesGroupEditor(card, block, onChange) {
    block.files = block.files || [{ url: '', filename: '', category: 'lien' }];

    const rerender = () => {
        const form = card.querySelector('.block-edit-form') ?? card.querySelector('.nested-edit-form');
        if (!form) return;
        form.innerHTML = renderResourcesGroupForm(block);
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: form });
        mountResourcesGroupEditor(card, block, onChange);
    };

    card.querySelector('[data-field="title"]')?.addEventListener('input', e => { block.title = e.target.value; onChange(); });

    card.querySelector('.rg-add-file')?.addEventListener('click', () => {
        block.files.push({ url: '', filename: '', category: 'lien' });
        rerender(); onChange();
    });

    card.querySelectorAll('.rg-file-row').forEach(row => {
        const fi = parseInt(row.dataset.fi, 10);
        if (!block.files[fi]) return;

        row.querySelector('[data-furl]')?.addEventListener('input', e => { block.files[fi].url = e.target.value; onChange(); });
        row.querySelector('[data-fname]')?.addEventListener('input', e => { block.files[fi].filename = e.target.value; onChange(); });
        row.querySelector('.rg-cat-select')?.addEventListener('change', e => { block.files[fi].category = e.target.value; onChange(); });

        row.querySelector('.rg-browse-file')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const urlInput = row.querySelector('[data-furl]');
            console.log('[browse-rg] bouton parcourir cliqué | urlInput=', urlInput);
            if (urlInput) openStorageBrowser(urlInput, { accept: 'all' });
            else console.warn('[browse-rg] urlInput [data-furl] introuvable dans la ligne', row);
        });

        row.querySelector('.rg-remove-file')?.addEventListener('click', () => {
            if (block.files.length <= 1) return;
            block.files.splice(fi, 1); rerender(); onChange();
        });
    });
}

function renderResourcesGroupForm(block) {
    const files = block.files || [];
    return `
    <div class="form-group">
      <label class="form-label">Titre du groupe</label>
      <div class="url-browse-row">
        <input type="text" class="form-input" data-field="title"
               value="${esc(block.title || '')}" placeholder="Ex : Ressources de la séance">
      </div>
    </div>
    <div class="rg-editor-header">
      <span>URL</span><span>Nom affiché</span><span>Catégorie</span><span></span>
    </div>
    <div class="rg-files-list">
      ${files.map((f, fi) => `
      <div class="rg-file-row" data-fi="${fi}">
        <div class="url-browse-row">
          <input type="url" class="form-input form-input--sm" data-furl
                 placeholder="https://… ou Supabase" value="${esc(f.url || '')}">
          <button type="button" class="btn btn-ghost btn-sm rg-browse-file"
                  title="Parcourir Supabase Storage">
            <i data-lucide="folder-open" aria-hidden="true"></i>
          </button>
        </div>
        <input type="text" class="form-input form-input--sm" data-fname
               placeholder="Nom affiché" value="${esc(f.filename || '')}">
        ${rgCatSelect(f.category || 'lien', fi)}
        <button type="button" class="btn-icon btn-icon--delete rg-remove-file"
                title="Supprimer" ${files.length <= 1 ? 'disabled' : ''}>
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>`).join('')}
    </div>
    <button type="button" class="btn btn-ghost btn-sm rg-add-file" style="margin-top:var(--space-3)">
      <i data-lucide="plus-circle" aria-hidden="true"></i> Ajouter un fichier
    </button>`;
}

// ── Éditeur Sondage rapide ────────────────────────────────────
function mountPollEditor(card, block, onChange) {
    block.options = block.options || ['', ''];

    const rerender = () => {
        const form = card.querySelector('.block-edit-form') ?? card.querySelector('.nested-edit-form');
        if (!form) return;
        form.innerHTML = renderPollForm(block);
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: form });
        mountPollEditor(card, block, onChange);
    };

    card.querySelector('[data-field="question"]')?.addEventListener('input', e => { block.question = e.target.value; onChange(); });
    card.querySelector('[data-field="allow_multiple"]')?.addEventListener('change', e => { block.allow_multiple = e.target.checked; onChange(); });
    card.querySelector('.poll-add-opt')?.addEventListener('click', () => {
        block.options.push(''); rerender(); onChange();
    });
    card.querySelectorAll('.poll-opt-row').forEach(row => {
        const oi = parseInt(row.dataset.oi, 10);
        row.querySelector('[data-opt]')?.addEventListener('input', e => { block.options[oi] = e.target.value; onChange(); });
        row.querySelector('.poll-remove-opt')?.addEventListener('click', () => {
            if (block.options.length <= 2) return;
            block.options.splice(oi, 1); rerender(); onChange();
        });
    });
}

function renderPollForm(block) {
    const opts = block.options || ['', ''];
    return `
    <div class="form-group">
      <label class="form-label">Question</label>
      <input type="text" class="form-input" data-field="question" value="${esc(block.question || '')}" placeholder="Votre question…">
    </div>
    <div class="form-group">
      <label class="form-label">Options</label>
      <div class="poll-opts-list">
        ${opts.map((o, oi) => `
        <div class="poll-opt-row" data-oi="${oi}">
          <span class="poll-opt-bullet">${String.fromCharCode(65 + oi)}</span>
          <input type="text" class="form-input form-input--sm" data-opt value="${esc(o)}" placeholder="Option ${oi + 1}…">
          <button type="button" class="btn-icon btn-icon--delete poll-remove-opt" title="Supprimer" ${opts.length <= 2 ? 'disabled' : ''}>
            <i data-lucide="x" aria-hidden="true"></i>
          </button>
        </div>`).join('')}
      </div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm poll-add-opt">
      <i data-lucide="plus-circle" aria-hidden="true"></i> Ajouter une option
    </button>
    <label class="form-checkbox-label" style="margin-top:var(--space-3)">
      <input type="checkbox" data-field="allow_multiple" ${block.allow_multiple ? 'checked' : ''}>
      Choix multiples autorisés
    </label>
    <p class="form-hint">Les votes sont enregistrés localement dans le navigateur de chaque stagiaire.</p>`;
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

// ── Parseur Aiken+ (sections + audio + description + explication) ─
// Directives spéciales (en début de ligne) :
//   SECTION:       Titre de la section
//   SECTION_DESC:  Description visible par le stagiaire
//   SECTION_AUDIO: https://url-audio...
//   ANSWER:        A | B,C  (réponse correcte)
//   EXPLANATION:   Texte de l'explication (après ANSWER:)
//   EXPLICATION:   Alias français de EXPLANATION:
function parseQuizAikenPlus(text) {
    const questions = [];
    let currentSection  = null;
    let current         = null;
    let lastQuestion    = null; // pour EXPLANATION: après ANSWER:

    for (const rawLine of text.split('\n')) {
        const trim = rawLine.trim();
        if (!trim) {
            if (current) { questions.push(current); lastQuestion = current; current = null; }
            continue;
        }

        // SECTION: directive
        const sectionMatch = trim.match(/^SECTION\s*:\s*(.+)/i);
        if (sectionMatch) {
            if (current) { questions.push(current); lastQuestion = current; current = null; }
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

        // EXPLANATION: / EXPLICATION: directive (avant ou après ANSWER:)
        const expMatch = trim.match(/^(?:EXPLANATION|EXPLICATION|EXPLAIN)\s*:\s*(.+)/i);
        if (expMatch) {
            const expText = expMatch[1].trim();
            if (current)                     current.explanation      = expText;
            else if (lastQuestion)           lastQuestion.explanation = expText;
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
            lastQuestion = current;
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

        case 'objectives':
            return field('Objectifs — un par ligne (verbe d\'action + contenu)',
                `<textarea class="form-input form-textarea" data-field="items_raw" rows="5"
                           placeholder="Identifier les concepts clés\nComprendre le fonctionnement\nAppliquer la méthode…">${esc((block.items || []).join('\n'))}</textarea>`)
                + richField('💡 Pourquoi c\'est important', 'why_important')
                + field('📊 Prérequis (optionnel) — un par ligne',
                    `<textarea class="form-input form-textarea" data-field="prerequisites_raw" rows="3"
                               placeholder="Connaître les bases de…\nSavoir utiliser…">${esc((block.prerequisites || []).join('\n'))}</textarea>`);

        case 'keypoints':
            return field('Points clés — un par ligne',
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
            return urlWithBrowse('URL de la vidéo', 'url', src, 'YouTube, Vimeo, ou lien de partage Google Drive')
                + (ok && srcType ? `<p class="form-hint form-hint--ok">${srcType}</p>` : '')
                + note('Supporte : YouTube · Vimeo · Google Drive · Supabase Storage')
                + field('Titre', `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}" placeholder="Titre de la vidéo (optionnel)">`)
                + field('Durée', `<input type="text" class="form-input" data-field="duration" value="${esc(block.duration || '')}" placeholder="ex : 12:45 ou 1h20">`)
                + field('Description', `<textarea class="form-input form-textarea" data-field="description" rows="3" placeholder="Courte description (optionnel)">${esc(block.description || '')}</textarea>`);
        }

        case 'audio': {
            const aUrl  = block.url || '';
            const aType = isDriveUrl(aUrl) ? '🔗 Google Drive → lecteur intégré (iframe)'
                        : isSupabaseUrl(aUrl) ? '☁ Supabase Storage → lecteur natif'
                        : '';
            return urlWithBrowse('URL du fichier audio', 'url', aUrl, 'Supabase Storage, Google Drive ou URL directe', 'audio')
                + (aType ? `<p class="form-hint form-hint--ok">${aType}</p>` : '')
                + field('Titre', `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}">`)
                + note('☁ <strong>Supabase Storage recommandé</strong> · MP3/OGG/WAV directs acceptés');
        }

        case 'pdf': case 'xlsx': case 'docx': case 'pptx': {
            const fUrl   = block.url || '';
            const fType  = isDriveUrl(fUrl) ? '🔗 Google Drive → prévisualisation intégrée disponible'
                         : isSupabaseUrl(fUrl) ? '☁ Supabase Storage → prévisualisation intégrée disponible'
                         : '';
            const canInline = block.type === 'pdf';
            return urlWithBrowse('URL', 'url', fUrl, 'Google Drive, Supabase ou URL directe')
                + (fType ? `<p class="form-hint form-hint--ok">${fType}</p>` : '')
                + field('Nom affiché', `<input type="text" class="form-input" data-field="filename" value="${esc(block.filename || '')}">`)
                + (canInline ? `<label class="form-checkbox-label">
                    <input type="checkbox" data-field="inline" ${block.inline ? 'checked' : ''}>
                    Afficher le PDF en ligne (visionneuse intégrée)
                  </label>` : '');
        }


        case 'link':
            return urlWithBrowse('URL', 'url', block.url || '', 'https://…')
                + field('Texte du lien', `<input type="text" class="form-input" data-field="label" value="${esc(block.label || '')}">`);

        case 'activity': {
            const actTypes = ['Lecture','Vidéo','Quiz','Exercice','Discussion','Projet','Évaluation'];
            return field('Titre',
                    `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}">`)
                + field('Durée estimée',
                    `<input type="text" class="form-input form-input--sm" data-field="duration" value="${esc(block.duration || '')}" placeholder="ex : 10 min" style="max-width:150px">`)
                + field('Type d\'activité',
                    `<select class="form-input form-input--sm" data-field="activity_type" style="max-width:200px">
                       <option value="">— Choisir —</option>
                       ${actTypes.map(t => `<option value="${t}" ${(block.activity_type||'')=== t?'selected':''}>${t}</option>`).join('')}
                     </select>`)
                + richField('📌 Consignes', 'instructions')
                + field('✅ Critère de réussite',
                    `<input type="text" class="form-input" data-field="success_criteria"
                             value="${esc(block.success_criteria || '')}" placeholder="Comment l\'apprenant sait qu\'il a réussi…">`)
                + field('💬 Question de réflexion (optionnel)',
                    `<input type="text" class="form-input" data-field="reflection"
                             value="${esc(block.reflection || '')}" placeholder="Question pour approfondir…">`);
        }

        case 'consigne': {
            // Bloc simple collapsible (utilisable partout, y compris dans les accordéons)
            const cnModes = [
                { v:'instruction', icon:'clipboard-list', l:'Consigne'  },
                { v:'important',   icon:'alert-circle',   l:'Important' },
                { v:'astuce',      icon:'lightbulb',      l:'Astuce'    },
                { v:'rappel',      icon:'bell',           l:'Rappel'    },
                { v:'lecture',     icon:'book-open',      l:'Lecture'   },
            ];
            const cnm = block.mode || 'instruction';
            return field('Type',
                `<div class="consignes-mode-picker">${cnModes.map(m =>
                    `<label class="consignes-mode-opt${cnm===m.v?' active':''}">
                      <input type="radio" name="consigne_mode_${block.block_id||''}" data-field="mode"
                             value="${m.v}" ${cnm===m.v?'checked':''}>
                      <span class="consignes-mode-opt__icon consignes-mode-opt__icon--${m.v}">
                        <i data-lucide="${m.icon}" aria-hidden="true"></i>
                      </span>
                      <span class="consignes-mode-opt__label">${m.l}</span>
                    </label>`
                ).join('')}</div>`)
                + field('Titre (optionnel)', `<input type="text" class="form-input form-input--sm" data-field="title" value="${esc(block.title || '')}" placeholder="Laisser vide pour le titre par défaut…">`)
                + richField('Contenu', 'content');
        }

        case 'callout': {
            const variant = block.variant || 'conseil';
            const variants = [
                { v:'conseil',   l:'Conseil (bleu)'     },
                { v:'attention', l:'Attention (orange)' },
                { v:'astuce',    l:'Astuce (vert)'      },
                { v:'citation',  l:'Citation (gris)'    },
            ];
            return field('Type d\'encadré',
                `<div class="callout-variant-picker">${variants.map(cv =>
                    `<label class="callout-variant-opt${variant===cv.v?' active':''}">
                      <input type="radio" name="callout_var_${block.block_id||''}" data-field="variant"
                             value="${cv.v}" ${variant===cv.v?'checked':''}>${cv.l}
                    </label>`
                ).join('')}</div>`)
                + field('Titre (optionnel)', `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}">`)
                + richField('Contenu', 'content');
        }

        case 'seance_end':
            return field('Titre (optionnel)',
                    `<input type="text" class="form-input" data-field="title"
                             value="${esc(block.title || '')}" placeholder="🎉 Félicitations !">`)
                + field('Message de conclusion',
                    `<textarea class="form-input form-textarea" data-field="message" rows="3"
                               placeholder="Message de fin — $prenom sera remplacé par le prénom">${esc(block.message || '')}</textarea>`)
                + field('✅ Accomplissements — un par ligne',
                    `<textarea class="form-input form-textarea" data-field="achievements_raw" rows="4"
                               placeholder="Vous avez appris à…\nVous maîtrisez maintenant…">${esc((block.achievements || []).join('\n'))}</textarea>`)
                + field('➡️ Prochaine étape (optionnel)',
                    `<input type="text" class="form-input" data-field="next_step"
                             value="${esc(block.next_step || '')}" placeholder="Titre de la séance suivante…">`);

        case 'iframe':
            return field('URL de la ressource',
                `<input type="url" class="form-input" data-field="url" value="${esc(block.url || '')}"
                        placeholder="https://… (Genially, H5P, Padlet, Google Forms…)">`)
                + note('Fonctionne avec : Genially · H5P · Padlet · Google Forms · Sites compatibles iframe')
                + field('Titre', `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}" placeholder="Titre affiché au-dessus (optionnel)">`)
                + field('Hauteur (px)', `<input type="number" class="form-input form-input--sm" data-field="height" value="${block.height || 500}" min="200" max="1200" step="50" style="width:120px">`);

        case 'code': {
            const langs = ['javascript','typescript','python','html','css','sql','bash','json','java','php','csharp','xml','yaml','markdown'];
            return field('Langage',
                `<select class="form-input form-input--sm" data-field="language" style="width:auto">
                    ${langs.map(l => `<option value="${l}" ${(block.language||'javascript')===l?'selected':''}>${l}</option>`).join('')}
                 </select>`)
                + field('Titre (optionnel)', `<input type="text" class="form-input" data-field="title" value="${esc(block.title || '')}" placeholder="ex : Exemple — composant React">`)
                + `<div class="form-group"><label class="form-label">Code</label>
                   <textarea class="form-input form-textarea form-monospace" data-field="code" rows="10"
                             spellcheck="false" autocorrect="off" autocapitalize="off">${esc(block.code || '')}</textarea></div>`;
        }

        case 'resources_group':
            return renderResourcesGroupForm(block);

        case 'poll':
            return renderPollForm(block);

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
      <div class="form-group">
        <label class="form-label form-label--sm">
          <i data-lucide="image" style="width:13px;height:13px;vertical-align:middle;margin-right:4px" aria-hidden="true"></i>
          Bannière (URL image — 1200 × 300 px recommandé)
        </label>
        <div class="quiz-audio-url-row">
          <input type="url" class="form-input form-input--sm" data-field="banner"
                 placeholder="https://… (JPEG/PNG, ratio 4:1)" value="${esc(block.banner || '')}">
          <button type="button" class="btn btn-ghost btn-sm quiz-browse-banner"
                  title="Parcourir le bucket Supabase">
            <i data-lucide="folder-open" aria-hidden="true"></i> Parcourir
          </button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label form-label--sm">
          <i data-lucide="message-circle-heart" style="width:13px;height:13px;vertical-align:middle;margin-right:4px" aria-hidden="true"></i>
          Message après soumission (laisser vide pour le message par défaut)
        </label>
        <textarea class="form-input form-textarea form-input--sm" data-field="merci" rows="2"
                  placeholder="Bravo ! Vos réponses ont bien été enregistrées…">${esc(block.merci || '')}</textarea>
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
            <div class="quiz-audio-url-row">
              <input type="url" class="form-input form-input--sm" data-qi="${i}" data-qfield="audio"
                     placeholder="URL audio (Supabase, Google Drive, MP3 direct…)"
                     value="${esc(q.audio || '')}">
              <button type="button" class="btn btn-ghost btn-sm quiz-browse-audio" data-qi="${i}"
                      title="Parcourir le bucket Supabase">
                <i data-lucide="folder-open" aria-hidden="true"></i> Parcourir
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label form-label--sm">
              <i data-lucide="music-2" style="width:13px;height:13px;vertical-align:middle;margin-right:4px" aria-hidden="true"></i>
              Titre affiché dans le lecteur audio
            </label>
            <input type="text" class="form-input form-input--sm" data-qi="${i}" data-qfield="audioTitle"
                   placeholder="Ex : Dialogue — Réservation hôtel"
                   value="${esc(q.audioTitle || '')}">
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

// ── Binding toolbar rich-text — mutualisé root + nested ───────
// Gère : bold/italic/etc., taille, police, couleur.
// Sauvegarde la sélection sur mousedown toolbar pour pouvoir
// la restaurer avant d'appliquer la commande (select/color font perdent le focus).
function bindRichToolbars(container, onApply) {
    container.querySelectorAll('.rich-toolbar').forEach(toolbar => {
        const editor = toolbar.nextElementSibling; // .rich-editor suit toujours .rich-toolbar
        if (!editor) return;

        let savedRange = null;

        // Sauvegarder la sélection dès qu'on touche la toolbar
        toolbar.addEventListener('mousedown', () => {
            const sel = window.getSelection();
            savedRange = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        });

        const restoreSel = () => {
            if (!savedRange) return;
            editor.focus();
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
        };

        // Boutons standard (bold, italic, listes, lien…)
        toolbar.querySelectorAll('.rich-btn[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (btn.dataset.cmd === 'createLink') {
                    const u = prompt('URL :'); if (u) document.execCommand('createLink', false, u);
                } else {
                    document.execCommand(btn.dataset.cmd, false, null);
                }
                onApply();
            });
        });

        // Taille de police (1–7 HTML sizes → xx-small…xx-large)
        toolbar.querySelector('.rich-size')?.addEventListener('change', function () {
            restoreSel();
            if (this.value) {
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('fontSize', false, this.value);
            }
            this.value = '';
            onApply();
        });

        // Famille de police
        toolbar.querySelector('.rich-font')?.addEventListener('change', function () {
            restoreSel();
            if (this.value) {
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('fontName', false, this.value);
            }
            this.value = '';
            onApply();
        });

        // Couleur du texte
        toolbar.querySelector('.rich-color')?.addEventListener('input', function () {
            restoreSel();
            document.execCommand('foreColor', false, this.value);
            onApply();
        });
    });
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
        <select class="rich-ctrl rich-size" title="Taille du texte">
          <option value="">Taille</option>
          <option value="1">Petit</option>
          <option value="3">Normal</option>
          <option value="5">Grand</option>
          <option value="7">Titre</option>
        </select>
        <select class="rich-ctrl rich-font" title="Police">
          <option value="">Police</option>
          <option value="Plus Jakarta Sans">Jakarta Sans</option>
          <option value="Space Grotesk">Space Grotesk</option>
          <option value="JetBrains Mono">Mono</option>
        </select>
        <label class="rich-color-wrap" title="Couleur du texte">
          <i data-lucide="baseline" aria-hidden="true"></i>
          <input type="color" class="rich-ctrl rich-color" value="#374151">
        </label>
        <span class="rich-sep"></span>
        <button type="button" class="rich-btn" data-cmd="createLink"          title="Ajouter un lien">🔗 Lien</button>
        <button type="button" class="rich-btn" data-cmd="unlink"              title="Supprimer le lien">Ø lien</button>
        <span class="rich-sep"></span>
        <button type="button" class="rich-btn" data-cmd="removeFormat"        title="Effacer tout">✕</button>
      </div>
      <div class="rich-editor form-input" contenteditable="true" data-field="${fieldName}" spellcheck="false"></div>
    </div>`;
}

function field(label, input) {
    return `<div class="form-group">${label ? `<label class="form-label">${label}</label>` : ''}${input}</div>`;
}
function note(t) { return `<p class="form-hint">${t}</p>`; }

/** Champ URL + bouton Parcourir Supabase Storage */
function urlWithBrowse(label, fieldName, value, placeholder, accept = 'all') {
    return `<div class="form-group">
      ${label ? `<label class="form-label">${label}</label>` : ''}
      <div class="url-browse-row">
        <input type="url" class="form-input" data-field="${fieldName}"
               value="${esc(value)}" placeholder="${esc(placeholder)}">
        <button type="button" class="btn btn-ghost btn-sm block-browse-url"
                data-accept="${accept}" title="Parcourir Supabase Storage">
          <i data-lucide="folder-open" aria-hidden="true"></i>
        </button>
      </div>
    </div>`;
}

// ── Sync formulaire → bloc ────────────────────────────────────
function updateBlockFromForm(card, block) {
    if (!block) return;
    // resources_group / poll : gérés par leurs éditeurs dédiés
    if (block.type === 'resources_group' || block.type === 'poll') return;
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
        else if (key === 'prerequisites_raw')   { block.prerequisites = el.value.split('\n').map(s => s.trim()).filter(Boolean); }
        else if (key === 'achievements_raw')    { block.achievements  = el.value.split('\n').map(s => s.trim()).filter(Boolean); }
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
        else if (el.type === 'radio') { if (el.checked) block[el.dataset.field] = el.value; }
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

    // Coloration syntaxique Prism.js (si disponible)
    if (typeof Prism !== 'undefined') Prism.highlightAllUnder(pane);

    // Ressources groupées — bouton "Tout télécharger"
    mountResourcesGroupBlocks(pane);

    // Sync vers localStorage pour le refresh de l'aperçu externe
    try {
        const titre = _container?.querySelector('#propTitre')?.value.trim() || _seance?.titre || '';
        localStorage.setItem('lms_preview_seance', JSON.stringify({ titre, html, ts: Date.now() }));
    } catch { /* localStorage indisponible */ }
}

// ── Ressources groupées — interactivité "Tout télécharger" ────
// Garantit qu'un nom de fichier a une extension.
// Priorité : URL Supabase → Content-Type HTTP → nom inchangé.
function _ensureExt(name, url, contentType) {
    if (/\.\w{2,5}$/.test(name)) return name;          // déjà une extension
    const urlExt = (url || '').split('?')[0].match(/\.(\w{2,5})$/);
    if (urlExt) return `${name}.${urlExt[1]}`;          // extension dans l'URL
    const CT = {
        'application/pdf':    'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':   'docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':         'xlsx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'application/msword': 'doc',
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
        'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mp4': 'm4a',
        'video/mp4':  'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv',
    };
    const mime = (contentType || '').split(';')[0].trim().toLowerCase();
    if (CT[mime]) return `${name}.${CT[mime]}`;         // extension via Content-Type
    return name;
}

export function mountResourcesGroupBlocks(root) {
    root.querySelectorAll('.rg-download-all').forEach(btn => {
        if (btn.dataset.rgMounted) return;
        btn.dataset.rgMounted = '1';

        btn.addEventListener('click', async () => {
            let files;
            try { files = JSON.parse(btn.dataset.rgFiles || '[]'); } catch { files = []; }
            if (!files.length) return;

            // Séparer liens web (non téléchargeables) et fichiers
            const links         = files.filter(f => f.category === 'lien');
            const downloadables = files.filter(f => f.category !== 'lien');

            // Cas 1 : JSZip disponible → ZIP
            if (typeof JSZip !== 'undefined') {
                btn.disabled = true;
                const origHTML = btn.innerHTML;
                btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Préparation…';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

                const zip       = new JSZip();
                const errs      = [];
                const usedNames = {};

                // ── Téléchargement des fichiers ──────────────────────
                await Promise.all(downloadables.map(async (f) => {
                    try {
                        const res = await fetch(f.url, { mode: 'cors' });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const blob = await res.blob();
                        // Nom avec extension garantie (URL ou Content-Type)
                        let name = _ensureExt(f.name || 'fichier', f.url, res.headers.get('content-type'));
                        if (usedNames[name]) {
                            usedNames[name]++;
                            const dot = name.lastIndexOf('.');
                            name = dot > 0
                                ? name.slice(0, dot) + `_${usedNames[name]}` + name.slice(dot)
                                : name + `_${usedNames[name]}`;
                        } else { usedNames[name] = 1; }
                        zip.file(name, blob);
                    } catch (e) {
                        errs.push(f.name);
                        console.warn('[RG] Inaccessible (CORS) :', f.url, e.message);
                    }
                }));

                // ── Liens → liens.txt ────────────────────────────────
                if (links.length) {
                    const lines = links.map(f => `${f.name}\n${f.url}`).join('\n\n');
                    const header = `Liens — générés automatiquement\n${'─'.repeat(40)}\n\n`;
                    zip.file('liens.txt', header + lines);
                }

                // Générer + déclencher le téléchargement
                const zipName = btn.dataset.rgZip || 'ressources.zip';
                const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(zipBlob);
                a.download = zipName;
                a.click();
                URL.revokeObjectURL(a.href);

                btn.disabled = false;
                btn.innerHTML = origHTML;
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

                if (errs.length) {
                    alert(`${errs.length} fichier(s) non accessible(s) (restriction CORS) :\n${errs.join('\n')}\n\nCes fichiers n'ont pas été inclus dans le ZIP.`);
                }

            } else {
                // Cas 2 : Fallback — ouvrir chaque fichier dans un nouvel onglet
                if (!confirm(`Ouvrir les ${files.length} ressources dans de nouveaux onglets ?`)) return;
                files.forEach((f, i) => setTimeout(() => window.open(f.url, '_blank'), i * 300));
            }
        });
    });
}

// ── Sérialisation → HTML stagiaire ────────────────────────────
export function serializeBlocks(blocks) {
    return (blocks || []).map(serializeBlock).join('\n');
}

function serializeBlock(block) {
    switch (block.type) {
        case 'welcome': {
            const wDuration = block.duration     ? `<span class="welcome-accordion__meta-item"><i data-lucide="clock" aria-hidden="true"></i>${esc(block.duration)}</span>` : '';
            const wDate     = block.updated_date ? `<span class="welcome-accordion__meta-item"><i data-lucide="calendar" aria-hidden="true"></i>Mis à jour le ${esc(block.updated_date)}</span>` : '';
            const wMeta     = (wDuration || wDate) ? `<div class="welcome-accordion__meta">${wDuration}${wDate}</div>` : '';
            const wMsg      = block.message ? `<p class="welcome-accordion__message">${esc(block.message)}</p>` : '';
            const wChildren = (block.children || []).length ? `<div class="welcome-accordion__content">${serializeBlocks(block.children)}</div>` : '';
            return `<details class="welcome-accordion" open>
              <summary class="welcome-accordion__summary">
                <span class="welcome-accordion__summary-left">
                  <i data-lucide="smile" class="welcome-accordion__icon" aria-hidden="true"></i>
                  <span class="welcome-accordion__title">${esc(block.title||'Bienvenue')}</span>
                </span>
                <i data-lucide="chevron-down" class="welcome-accordion__chevron" aria-hidden="true"></i>
              </summary>
              <div class="welcome-accordion__body">
                ${wMsg}${wMeta}${wChildren}
              </div>
            </details>`;
        }

        case 'seance_end': {
            const achList = (block.achievements || []);
            const achHtml = achList.length
                ? `<ul class="seance-end__achievements">
                     ${achList.map(a => `<li><i data-lucide="check-circle" aria-hidden="true"></i>${esc(a)}</li>`).join('')}
                   </ul>`
                : '';
            const nextStep = block.next_step
                ? `<div class="seance-end__next"><i data-lucide="arrow-right" aria-hidden="true"></i> Prochaine étape : ${esc(block.next_step)}</div>`
                : '';
            const sMsg = block.message
                ? `<p class="seance-end__message">${esc(block.message)}</p>`
                : '';
            return `<div class="seance-end-block">
              <div class="seance-end-block__header">
                <i data-lucide="award" aria-hidden="true"></i>
                <span>${esc(block.title || '🎉 Félicitations !')}</span>
              </div>
              ${sMsg}${achHtml}${nextStep}
            </div>`;
        }

        case 'heading':
            return `<h3 class="seance-section-title"><i data-lucide="bookmark" aria-hidden="true"></i> ${esc(block.text || '')}</h3>`;

        case 'objectives': {
            const prereqs = (block.prerequisites || []);
            const prereqHtml = prereqs.length
                ? `<div class="objectifs-prerequisites">
                     <div class="objectifs-prerequisites__label"><i data-lucide="book-open" aria-hidden="true"></i> Prérequis</div>
                     <ul>${prereqs.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
                   </div>`
                : '';
            const whyHtml = block.why_important
                ? `<div class="objectifs-why">
                     <div class="objectifs-why__label"><i data-lucide="lightbulb" aria-hidden="true"></i> Pourquoi c'est important</div>
                     <div class="objectifs-why__content">${block.why_important}</div>
                   </div>`
                : '';
            return `<div class="seance-section seance-section--objectives">
              <div class="seance-section-title"><i data-lucide="target" aria-hidden="true"></i> Objectifs de la séance</div>
              <ul class="objectifs-list">
                ${(block.items||[]).map(o => `
                <li>
                  <span class="objectif-dot"><i data-lucide="check" aria-hidden="true"></i></span>
                  ${esc(o)}
                </li>`).join('')}
              </ul>
              ${whyHtml}${prereqHtml}
            </div>`;
        }

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
            const aDlHref = aDrive ? esc(toDriveDownloadUrl(aUrl)) : esc(safeHref(aUrl));

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
            const dlHref = isDriveUrl(fUrl) ? esc(toDriveDownloadUrl(fUrl)) : esc(safeHref(fUrl));

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
              <a class="ressource-card__body" href="${dlHref}" target="_blank" rel="noopener noreferrer">
                <div class="ressource-card__icon"><i data-lucide="${icons[block.type]}" aria-hidden="true"></i></div>
                <div class="ressource-card__info">
                  <span class="ressource-card__name">${fName}</span>
                  <span class="ressource-card__meta">${labels[block.type]}</span>
                </div>
              </a>
              <div class="ressource-card__actions">
                ${previewBtn}
                <a href="${dlHref}" target="_blank" rel="noopener noreferrer" class="ressource-card__btn" title="Télécharger" aria-label="Télécharger">
                  <i data-lucide="download" aria-hidden="true"></i>
                </a>
              </div>
            </div>`;
        }

        case 'consigne': {
            // Version simple : rich-text uniquement, utilisable partout (nested inclus)
            const SNMODES = {
                instruction: { icon: 'clipboard-list', label: 'Consigne'  },
                important:   { icon: 'alert-circle',   label: 'Important' },
                astuce:      { icon: 'lightbulb',      label: 'Astuce'    },
                rappel:      { icon: 'bell',           label: 'Rappel'    },
                lecture:     { icon: 'book-open',      label: 'Lecture'   },
            };
            const snMode  = block.mode || 'instruction';
            const snMd    = SNMODES[snMode] || SNMODES.instruction;
            const snLabel = esc(block.title || snMd.label);
            const snBody  = block.content
                ? `<div class="consignes-card__body">${block.content}</div>`
                : '';
            return `<details class="consignes-card consignes-card--${snMode}" open>
              <summary class="consignes-card__summary">
                <span class="consignes-card__summary-left">
                  <span class="consignes-card__icon-wrap">
                    <i data-lucide="${snMd.icon}" aria-hidden="true"></i>
                  </span>
                  <span class="consignes-card__label">${snLabel}</span>
                </span>
                <i data-lucide="chevron-down" class="consignes-card__chevron" aria-hidden="true"></i>
              </summary>
              ${snBody}
            </details>`;
        }

        case 'callout': {
            const cv = block.variant || 'conseil';
            const cvIcons = { conseil:'lightbulb', attention:'alert-triangle', astuce:'sparkles', citation:'quote' };
            const cvIcon  = cvIcons[cv] || 'info';
            const tHtml   = block.title ? `<div class="callout-title"><i data-lucide="${cvIcon}" aria-hidden="true"></i> ${esc(block.title)}</div>` : '';
            return `<div class="callout callout--${cv}">${tHtml}<div class="callout-content">${block.content || ''}</div></div>`;
        }

        case 'iframe': {
            if (!block.url) return '';
            const iTitle = block.title ? `<div class="iframe-block-title">${esc(block.title)}</div>` : '';
            return `<div class="iframe-block">${iTitle}<div class="iframe-wrapper" style="height:${parseInt(block.height,10)||500}px">
              <iframe src="${esc(block.url)}" frameborder="0" allowfullscreen loading="lazy"
                      allow="camera; microphone; fullscreen; autoplay"></iframe>
            </div></div>`;
        }

        case 'code': {
            const lang = block.language || 'javascript';
            const tHtml = block.title ? `<div class="code-block-title">${esc(block.title)}</div>` : '';
            const code  = (block.code || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            return `<div class="code-block">${tHtml}
              <pre class="code-block-pre"><code class="language-${esc(lang)}">${code}</code></pre>
            </div>`;
        }

        case 'resources_group': {
            const files = (block.files || []).filter(f => f.url?.trim());
            if (!files.length) return '';

            // ── Regrouper par catégorie (ordre défini) ─────────────
            const CAT_ORDER = ['pdf','texte','tableur','presentation','audio','video','image','lien','autre'];
            const grouped = {};
            files.forEach(f => {
                const k = (f.category && RG_CATS[f.category]) ? f.category : 'autre';
                (grouped[k] = grouped[k] || []).push(f);
            });
            const catKeys   = CAT_ORDER.filter(k => grouped[k]);
            const multiCats = catKeys.length > 1;

            // ── Sections (catégories) ──────────────────────────────
            const sectionsHtml = catKeys.map(k => {
                const cat   = RG_CATS[k];
                const items = grouped[k].map(f => {
                    const isLink = f.category === 'lien';
                    const dlHref = isDriveUrl(f.url) ? esc(toDriveDownloadUrl(f.url)) : esc(safeHref(f.url));
                    const name   = esc(f.filename || f.url.split('/').pop()?.split('?')[0] || 'Fichier');
                    return `<a class="rg-item" href="${dlHref}" target="_blank" rel="noopener noreferrer" title="${name}">
                      <div class="rg-item-icon"><i data-lucide="${cat.icon}" aria-hidden="true"></i></div>
                      <span class="rg-item-name">${name}</span>
                      <i data-lucide="${isLink ? 'arrow-up-right' : 'download'}" aria-hidden="true" class="rg-item-dl"></i>
                    </a>`;
                }).join('');

                const catHeader = multiCats
                    ? `<div class="rg-cat-header">
                         <i data-lucide="${cat.icon}" aria-hidden="true"></i>
                         <span>${cat.label}</span>
                         <span class="rg-cat-count">${grouped[k].length}</span>
                       </div>`
                    : '';
                return `<div class="rg-category">${catHeader}<div class="rg-files-grid">${items}</div></div>`;
            }).join('');

            // ── Bouton "Tout télécharger" ──────────────────────────
            const dlAllData = files.map(f => ({
                url:      safeHref(f.url),
                name:     f.filename || f.url.split('/').pop()?.split('?')[0] || 'fichier',
                category: f.category || 'autre',
            }));
            const dlBtn = files.length > 1
                ? `<button type="button" class="btn btn-outline btn-sm rg-download-all"
                           data-rg-files="${attrEsc(JSON.stringify(dlAllData))}"
                           data-rg-zip="${esc((block.title||'ressources').replace(/\s+/g,'_'))}.zip"
                           style="margin-top:var(--space-4)">
                     <i data-lucide="archive" aria-hidden="true"></i> Tout télécharger (.zip)
                   </button>`
                : '';

            // ── Accordéon (details/summary) ────────────────────────
            const sumTitle = esc(block.title || 'Ressources');
            const totalFiles = files.length;
            return `<details class="rg-accordion">
              <summary class="rg-accordion-summary">
                <i data-lucide="chevron-right" class="rg-accordion-chevron" aria-hidden="true"></i>
                <i data-lucide="folder-open" aria-hidden="true"></i>
                <span>${sumTitle}</span>
                <span class="rg-count-badge">${totalFiles} fichier${totalFiles > 1 ? 's' : ''}</span>
              </summary>
              <div class="rg-accordion-body">
                ${sectionsHtml}
                ${dlBtn}
              </div>
            </details>`;
        }

        case 'poll': {
            const opts    = block.options || [];
            const pollKey = `lms_poll_${block.block_id || '?'}`;
            const multiple = block.allow_multiple;
            const inputType = multiple ? 'checkbox' : 'radio';
            const optHtml  = opts.map((o, i) => `
              <label class="poll-option">
                <input type="${inputType}" name="poll_${block.block_id}" value="${i}" class="poll-input">
                <span class="poll-option-text">${esc(o || `Option ${i+1}`)}</span>
                <span class="poll-option-bar"><span class="poll-option-fill"></span></span>
              </label>`).join('');
            return `<div class="poll-block" data-poll-key="${esc(pollKey)}" data-poll-multiple="${multiple?'true':'false'}">
              <div class="poll-question"><i data-lucide="bar-chart-2" aria-hidden="true"></i> ${esc(block.question || 'Sondage')}</div>
              <div class="poll-options">${optHtml}</div>
              <button type="button" class="btn btn-secondary btn-sm poll-vote-btn" style="margin-top:var(--space-3)">Voter</button>
              <p class="poll-result-hint" style="display:none;margin-top:var(--space-2);font-size:var(--font-caption-size);color:var(--text-muted)">Votre réponse a été enregistrée.</p>
            </div>
            <script>
            (function(){ const el=document.currentScript.closest('.poll-block'); if(!el) return;
              const key=el.dataset.pollKey; const saved=localStorage.getItem(key);
              if(saved){ try{ const v=JSON.parse(saved); (Array.isArray(v)?v:[v]).forEach(i=>{ const inp=el.querySelectorAll('.poll-input')[i]; if(inp) inp.checked=true; }); el.querySelector('.poll-result-hint').style.display=''; } catch{} }
              el.querySelector('.poll-vote-btn')?.addEventListener('click',()=>{ const checked=[...el.querySelectorAll('.poll-input:checked')].map(i=>parseInt(i.value,10)); localStorage.setItem(key,JSON.stringify(checked)); el.querySelector('.poll-result-hint').style.display=''; }); })();
            </script>`;
        }

        case 'link':
            return `<a class="ressource-card ressource-card--link" href="${esc(safeHref(block.url))}" target="_blank" rel="noopener noreferrer">
              <div class="ressource-card__icon"><i data-lucide="external-link" aria-hidden="true"></i></div>
              <div class="ressource-card__info">
                <span class="ressource-card__name">${esc(block.label||block.url||'Lien')}</span>
                <span class="ressource-card__meta">Lien externe</span>
              </div>
              <i data-lucide="arrow-up-right" class="ressource-card__dl" aria-hidden="true"></i>
            </a>`;

        case 'activity': {
            const aType     = block.activity_type ? `<span class="activite-block__type-badge">${esc(block.activity_type)}</span>` : '';
            const aDuration = block.duration ? `<span class="activite-block__duration"><i data-lucide="clock" aria-hidden="true"></i> ${esc(block.duration)}</span>` : '';
            const aMeta     = (aType || aDuration) ? `<div class="activite-block__meta">${aType}${aDuration}</div>` : '';
            const aCriteria = block.success_criteria
                ? `<div class="activite-block__criteria">
                     <i data-lucide="check-square" aria-hidden="true"></i>
                     <span><strong>Critère de réussite :</strong> ${esc(block.success_criteria)}</span>
                   </div>`
                : '';
            const aReflect  = block.reflection
                ? `<div class="activite-block__reflection">
                     <i data-lucide="message-circle" aria-hidden="true"></i>
                     <span><strong>Question de réflexion :</strong> ${esc(block.reflection)}</span>
                   </div>`
                : '';
            return `<div class="activite-block">
              <div class="activite-block__header"><i data-lucide="pencil-line" aria-hidden="true"></i><span>${esc(block.title||'Activité')}</span></div>
              ${aMeta}
              <div class="activite-block__body">${block.instructions||''}</div>
              ${aCriteria}${aReflect}
            </div>`;
        }

        case 'consignes': {
            const CMODES = {
                instruction: { icon: 'clipboard-list', label: 'Consigne'  },
                important:   { icon: 'alert-circle',   label: 'Important' },
                astuce:      { icon: 'lightbulb',      label: 'Astuce'    },
                rappel:      { icon: 'bell',           label: 'Rappel'    },
                lecture:     { icon: 'book-open',      label: 'Lecture'   },
            };
            const _iconToMode = { 'clipboard-list':'instruction','list-checks':'instruction','info':'instruction','lightbulb':'astuce','alert-circle':'important','book-open':'lecture' };
            const cMode  = block.mode || _iconToMode[block.icon] || 'instruction';
            const cMd    = CMODES[cMode] || CMODES.instruction;
            const cLabel = esc(block.title || cMd.label);
            const cBody  = (block.children || []).length
                ? `<div class="consignes-card__body">${serializeBlocks(block.children)}</div>`
                : '';
            return `<details class="consignes-card consignes-card--${cMode}" open>
              <summary class="consignes-card__summary">
                <span class="consignes-card__summary-left">
                  <span class="consignes-card__icon-wrap">
                    <i data-lucide="${cMd.icon}" aria-hidden="true"></i>
                  </span>
                  <span class="consignes-card__label">${cLabel}</span>
                </span>
                <i data-lucide="chevron-down" class="consignes-card__chevron" aria-hidden="true"></i>
              </summary>
              ${cBody}
            </details>`;
        }

        case 'keypoints':
            return `<div class="key-points">
              <div class="key-points__title"><i data-lucide="star" aria-hidden="true"></i> Points clés</div>
              <ul class="key-points__list">
                ${(block.items||[]).map(i=>`<li><i data-lucide="check-circle" aria-hidden="true"></i>${esc(i)}</li>`).join('')}
              </ul>
            </div>`;

        case 'accordion': {
            const accV    = block.variant || 'standard';
            const accOpen = (accV === 'objectifs') ? ' open' : '';
            const accIcon = accV === 'objectifs' ? 'clipboard-list' : 'chevron-right';
            return `<details class="sub-accordion sub-accordion--${accV}"${accOpen}>
              <summary class="sub-accordion-summary">
                <i data-lucide="${accIcon}" class="sub-accordion-chevron" aria-hidden="true"></i>
                ${esc(block.title||'Section')}
              </summary>
              <div class="sub-accordion-body">${serializeBlocks(block.children||[])}</div>
            </details>`;
        }

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
                banner:          block.banner   || '',
                merci:           block.merci    || '',
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
        case 'welcome':    return block.title || '(accueil personnalisé)';
        case 'seance_end': return block.title || '(fin de séance)';
        case 'heading':    return block.text || '(sans titre)';
        case 'objectives': return `${(block.items||[]).length} objectif(s)`;
        case 'text':       return block.html ? block.html.replace(/<[^>]+>/g,'').slice(0,60) : '(vide)';
        case 'rawhtml':    return '(HTML hérité)';
        case 'video':      return block.url ? block.url.slice(0,55)+'…' : '(URL manquante)';
        case 'audio':      return block.title || block.url || '(audio)';
        case 'pdf': case 'xlsx': case 'docx': case 'pptx': return block.filename || block.type.toUpperCase();
        case 'link':       return block.label || block.url || '(lien)';
        case 'consigne':   return `[${block.mode||'instruction'}] ${block.title || block.content?.replace(/<[^>]+>/g,'').slice(0,40) || ''}`.trim();
        case 'consignes':  return `[${block.mode||'instruction'}] ${block.title || ''}`.trim();
        case 'activity':   return block.title || '(activité)';
        case 'keypoints':  return `${(block.items||[]).length} point(s) clé(s)`;
        case 'accordion':  return block.title || '(accordéon)';
        case 'columns2':   return '2 colonnes';
        case 'columns4':   return `Colonnes — ${block.layout||'1+1+1+1'}`;
        case 'callout':         return `[${block.variant||'conseil'}] ${block.title || block.content?.replace(/<[^>]+>/g,'').slice(0,40) || '(vide)'}`;
        case 'iframe':          return block.title || block.url || '(iframe)';
        case 'code':            return `${block.language||'code'} — ${block.title || (block.code||'').slice(0,40) || '(vide)'}`;
        case 'resources_group': return `${(block.files||[]).filter(f=>f.url).length} fichier(s) — ${block.title||'Ressources'}`;
        case 'poll':            return block.question || '(sondage)';
        case 'spacer':          return '—';
        case 'quiz':            return `${(block.questions||[]).length} question(s) — ${block.title||'Quiz'}`;
        case 'devoir':          return block.title || 'Devoir à rendre';
        default:                return '';
    }
}

function createDefaultBlock(type) {
    const d = {
        welcome:    { title: 'Titre de la séance', message: '👋 Bonjour $prenom, aujourd\'hui nous allons…', duration: '30 minutes', updated_date: '', children: [] },
        seance_end: { title: '🎉 Félicitations !', message: 'Vous avez terminé cette séance avec succès.', achievements: [], next_step: '' },
        heading:    { text: 'Nouveau titre' },
        objectives: { items: ['Identifier …', 'Comprendre …', 'Appliquer …'], why_important: '<p></p>', prerequisites: [] },
        text:       { html: '<p></p>' },
        video:      { url: '', caption: '' },
        audio:      { url: '', title: 'Titre de l\'audio' },
        pdf:        { url: '', filename: '' },
        xlsx:       { url: '', filename: '' },
        docx:       { url: '', filename: '' },
        pptx:       { url: '', filename: '' },
        link:            { url: '', label: '' },
        callout:         { variant: 'conseil', title: '', content: '<p></p>' },
        iframe:          { url: '', title: '', height: 500 },
        code:            { language: 'javascript', title: '', code: '' },
        resources_group: { title: 'Ressources', files: [{ url: '', filename: '', category: 'lien' }] },
        poll:            { block_id: crypto.randomUUID(), question: '', options: ['', ''], allow_multiple: false },
        consigne:        { mode: 'instruction', title: '', content: '<p></p>' },
        consignes:       { mode: 'instruction', title: '', children: [] },
        activity:        { title: 'Activité pratique', activity_type: 'Exercice', duration: '10 min', instructions: '<p></p>', success_criteria: '', reflection: '' },
        keypoints:       { items: ['Point clé 1'] },
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

// ── Clonage de bloc vers une autre séance ──────────────────────

/**
 * Copie profonde d'un bloc en régénérant les block_id uniques
 * (quiz / devoir ont un block_id qui sert de clé en DB).
 */
function deepCloneBlock(block) {
    const clone = JSON.parse(JSON.stringify(block));
    if (clone.block_id) clone.block_id = crypto.randomUUID();
    // Conteneurs : régénérer les IDs imbriqués
    if (Array.isArray(clone.children)) {
        if (clone.children.every(Array.isArray)) {
            // columns2 / columns4 : tableau de tableaux
            clone.children = clone.children.map(col =>
                col.map(child => deepCloneBlock(child))
            );
        } else {
            // accordion : tableau plat de blocs
            clone.children = clone.children.map(child => deepCloneBlock(child));
        }
    }
    return clone;
}

/**
 * Ouvre une modale permettant de choisir une séance de destination
 * et y colle une copie profonde du bloc.
 */
async function openCloneBlockModal(block) {
    const bt = ALL_TYPES.find(t => t.type === block.type) || { icon: 'code-2', label: block.type };
    const blockLabel = bt.label + (block.title ? ` — ${block.title}` : '');

    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';

    overlay.innerHTML = `
    <div class="tree-modal tree-modal--lg">

      <div class="tree-modal-header">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="send-horizontal" aria-hidden="true"></i>
          <h3>Cloner le bloc vers une autre séance</h3>
        </div>
        <button class="btn-icon clone-modal-close" title="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="tree-modal-body">

        <!-- Badge : type du bloc cloné -->
        <div class="clone-block-info">
          <i data-lucide="${bt.icon}" aria-hidden="true"></i>
          <span>Bloc à cloner : <strong>${esc(blockLabel)}</strong></span>
        </div>

        <!-- Parcours -->
        <div class="form-group">
          <label class="form-label form-label--required">
            <i data-lucide="book-open" aria-hidden="true" style="width:14px;height:14px"></i>
            Parcours
          </label>
          <select id="cloneParcoursSelect" class="form-input">
            <option value="">⏳ Chargement…</option>
          </select>
        </div>

        <!-- Config (si plusieurs) -->
        <div id="cloneConfigWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required">
            <i data-lucide="settings" aria-hidden="true" style="width:14px;height:14px"></i>
            Configuration / Financement
          </label>
          <select id="cloneConfigSelect" class="form-input">
            <option value="">— Sélectionner —</option>
          </select>
        </div>

        <!-- Module -->
        <div id="cloneModuleWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required">
            <i data-lucide="layers" aria-hidden="true" style="width:14px;height:14px"></i>
            Module
          </label>
          <select id="cloneModuleSelect" class="form-input">
            <option value="">— Sélectionner un module —</option>
          </select>
        </div>

        <!-- Séquence -->
        <div id="cloneSeqWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required">
            <i data-lucide="list" aria-hidden="true" style="width:14px;height:14px"></i>
            Séquence
          </label>
          <select id="cloneSeqSelect" class="form-input">
            <option value="">— Sélectionner une séquence —</option>
          </select>
        </div>

        <!-- Séance -->
        <div id="cloneSeanceWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required">
            <i data-lucide="file-text" aria-hidden="true" style="width:14px;height:14px"></i>
            Séance de destination
          </label>
          <select id="cloneSeanceSelect" class="form-input">
            <option value="">— Sélectionner une séance —</option>
          </select>
        </div>

        <!-- Message statut -->
        <div id="cloneStatusMsg" class="clone-status-msg" style="display:none"></div>

      </div><!-- /.tree-modal-body -->

      <div class="tree-modal-footer">
        <button class="btn btn-ghost clone-modal-close">Annuler</button>
        <button class="btn btn-cta" id="cloneConfirmBtn" disabled>
          <i data-lucide="send-horizontal" aria-hidden="true"></i> Cloner ici
        </button>
      </div>

    </div>`;

    document.documentElement.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    // ── Références ───────────────────────────────────────────────
    const parcoursSelect = overlay.querySelector('#cloneParcoursSelect');
    const configWrap     = overlay.querySelector('#cloneConfigWrap');
    const configSelect   = overlay.querySelector('#cloneConfigSelect');
    const moduleWrap     = overlay.querySelector('#cloneModuleWrap');
    const moduleSelect   = overlay.querySelector('#cloneModuleSelect');
    const seqWrap        = overlay.querySelector('#cloneSeqWrap');
    const seqSelect      = overlay.querySelector('#cloneSeqSelect');
    const seanceWrap     = overlay.querySelector('#cloneSeanceWrap');
    const seanceSelect   = overlay.querySelector('#cloneSeanceSelect');
    const confirmBtn     = overlay.querySelector('#cloneConfirmBtn');
    const statusMsg      = overlay.querySelector('#cloneStatusMsg');

    const closeModal = () => overlay.remove();
    overlay.querySelectorAll('.clone-modal-close').forEach(b => b.addEventListener('click', closeModal));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    let _tree = [];

    function showStatus(msg, isError = false) {
        statusMsg.style.display = '';
        statusMsg.className = `clone-status-msg clone-status-msg--${isError ? 'error' : 'success'}`;
        statusMsg.textContent = msg;
    }

    // level: 1=config, 2=module, 3=seq, 4=seance
    function resetFrom(level) {
        if (level <= 1) { configWrap.style.display  = 'none'; configSelect.innerHTML  = '<option value="">— Sélectionner —</option>'; }
        if (level <= 2) { moduleWrap.style.display  = 'none'; moduleSelect.innerHTML  = '<option value="">— Sélectionner un module —</option>'; }
        if (level <= 3) { seqWrap.style.display     = 'none'; seqSelect.innerHTML     = '<option value="">— Sélectionner une séquence —</option>'; }
        if (level <= 4) { seanceWrap.style.display  = 'none'; seanceSelect.innerHTML  = '<option value="">— Sélectionner une séance —</option>'; }
        confirmBtn.disabled = true;
        statusMsg.style.display = 'none';
        statusMsg.className = 'clone-status-msg';
    }

    // ── Chargement des parcours ──────────────────────────────────
    try {
        const parcours = await getPathways();
        if (!parcours.length) {
            parcoursSelect.innerHTML = '<option value="">Aucun parcours disponible</option>';
        } else {
            parcoursSelect.innerHTML = `<option value="">— Sélectionner un parcours —</option>` +
                parcours.map(p => `<option value="${p.id}">${esc(p.titre)}</option>`).join('');
        }
    } catch (e) {
        console.error('[clone] getPathways:', e);
        parcoursSelect.innerHTML = '<option value="">Erreur de chargement</option>';
    }

    // ── Cascade : Parcours → Config ──────────────────────────────
    parcoursSelect.addEventListener('change', async () => {
        const pid = parcoursSelect.value;
        resetFrom(1);
        if (!pid) return;
        try {
            const configs = await getPathwayConfigs(pid);
            if (!configs.length) { showStatus('Aucune configuration trouvée pour ce parcours.', true); return; }
            if (configs.length === 1) {
                // Une seule config → charger directement l'arbre
                await loadTree(configs[0].config_id);
            } else {
                configWrap.style.display = '';
                configSelect.innerHTML = `<option value="">— Sélectionner —</option>` +
                    configs.map(c => `<option value="${c.config_id}">${esc(c.financement_nom || 'Sans financement')}</option>`).join('');
            }
        } catch (e) {
            console.error('[clone] getPathwayConfigs:', e);
            showStatus('Erreur lors du chargement des configurations.', true);
        }
    });

    // ── Cascade : Config → Arbre ─────────────────────────────────
    configSelect.addEventListener('change', async () => {
        resetFrom(2);
        const cid = configSelect.value;
        if (!cid) return;
        await loadTree(cid);
    });

    async function loadTree(configId) {
        resetFrom(2);
        try {
            _tree = await getPathwayTree(configId);
            if (!_tree.length) { showStatus('Ce parcours ne contient aucun module.', true); return; }
            moduleWrap.style.display = '';
            moduleSelect.innerHTML = `<option value="">— Sélectionner un module —</option>` +
                _tree.map(m => `<option value="${m.cours_id}">${esc(m.titre)}</option>`).join('');
        } catch (e) { console.error('[clone] getPathwayTree:', e); showStatus('Erreur lors du chargement de l\'arbre.', true); }
    }

    // ── Cascade : Module → Séquences ────────────────────────────
    moduleSelect.addEventListener('change', () => {
        resetFrom(3);
        const mod = _tree.find(m => m.cours_id === moduleSelect.value);
        if (!mod) return;
        const seqs = mod.sequences || [];
        if (!seqs.length) { showStatus('Ce module ne contient aucune séquence.', true); return; }
        seqWrap.style.display = '';
        seqSelect.innerHTML = `<option value="">— Sélectionner une séquence —</option>` +
            seqs.map(s => `<option value="${s.id}">${esc(s.titre)}</option>`).join('');
    });

    // ── Cascade : Séquence → Séances ─────────────────────────────
    seqSelect.addEventListener('change', () => {
        resetFrom(4);
        const mod = _tree.find(m => m.cours_id === moduleSelect.value);
        const seq = (mod?.sequences || []).find(s => s.id === seqSelect.value);
        if (!seq) return;
        const seances = seq.seances || [];
        if (!seances.length) { showStatus('Cette séquence ne contient aucune séance.', true); return; }
        seanceWrap.style.display = '';
        seanceSelect.innerHTML = `<option value="">— Sélectionner une séance —</option>` +
            seances.map(s => `<option value="${s.id}">${esc(s.titre)}</option>`).join('');
    });

    // ── Activer le bouton Cloner ──────────────────────────────────
    seanceSelect.addEventListener('change', () => {
        confirmBtn.disabled = !seanceSelect.value;
        statusMsg.style.display = 'none';
    });

    // ── Confirmer le clonage ──────────────────────────────────────
    confirmBtn.addEventListener('click', async () => {
        const targetSeanceId = seanceSelect.value;
        if (!targetSeanceId) return;

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Clonage…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        statusMsg.style.display = 'none';

        try {
            // 1. Charger les blocs de la séance cible
            const targetSeance = await getSeanceForEditor(targetSeanceId);
            let targetBlocks = [];
            if (targetSeance.contenu_blocks) {
                if (typeof targetSeance.contenu_blocks === 'string') {
                    try { targetBlocks = JSON.parse(targetSeance.contenu_blocks); } catch { targetBlocks = []; }
                } else if (Array.isArray(targetSeance.contenu_blocks)) {
                    targetBlocks = targetSeance.contenu_blocks;
                }
            }

            // 2. Copie profonde avec nouveaux UUIDs
            const cloned = deepCloneBlock(block);

            // 3. Appendre
            targetBlocks.push(cloned);

            // 4. Régénérer le HTML et sauvegarder
            const html = serializeBlocks(targetBlocks);
            await saveSeanceContent(targetSeanceId, html, targetBlocks);

            // 5. Succès
            const seanceName = seanceSelect.options[seanceSelect.selectedIndex]?.text || 'la séance';
            showStatus(`✓ Bloc cloné avec succès dans "${seanceName}" !`);
            confirmBtn.innerHTML = '<i data-lucide="check" aria-hidden="true"></i> Cloné !';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
            setTimeout(() => closeModal(), 1800);

        } catch (err) {
            showStatus(`Erreur lors du clonage : ${err?.message || err}`, true);
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i data-lucide="send-horizontal" aria-hidden="true"></i> Cloner ici';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        }
    });
}

// ── IA générative — Claude API ────────────────────────────────
const AI_KEY_STORAGE = 'lms_anthropic_key';
const AI_MODEL       = 'claude-haiku-4-5-20251001';

async function openAiGenerateModal(block, onUpdate) {
    const isQuiz       = block.type === 'quiz';
    const isObjectives = block.type === 'objectives';
    if (!isQuiz && !isObjectives) return;

    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal" style="max-width:560px">
      <div class="tree-modal-header">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="sparkles" aria-hidden="true"></i>
          <h3>Générer avec l'IA</h3>
        </div>
        <button class="btn-icon ai-modal-close"><i data-lucide="x" aria-hidden="true"></i></button>
      </div>
      <div class="tree-modal-body" style="display:flex;flex-direction:column;gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Clé API Anthropic
            <span style="font-weight:normal;color:var(--text-muted)">(stockée localement, jamais envoyée au serveur)</span>
          </label>
          <input type="password" id="aiApiKey" class="form-input form-input--sm"
                 placeholder="sk-ant-api03-…" value="${esc(localStorage.getItem(AI_KEY_STORAGE)||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Sujet / contexte</label>
          <textarea id="aiPromptInput" class="form-input form-textarea" rows="4"
                    placeholder="${isQuiz ? 'Ex : 5 questions QCM sur la sécurité incendie en entreprise' : 'Ex : 3 objectifs pédagogiques pour une séance sur la gestion du stress'}">${isQuiz ? `5 questions QCM sur "${esc(block.title || 'ce sujet')}"` : `3 objectifs pour "${esc(_seance?.titre || 'cette séance')}"` }</textarea>
        </div>
        <div id="aiStatusMsg" style="display:none;padding:var(--space-3);border-radius:var(--radius-md);font-size:var(--font-caption-size)"></div>
      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost ai-modal-close">Annuler</button>
        <button class="btn btn-cta" id="aiGenerateBtn">
          <i data-lucide="sparkles" aria-hidden="true"></i> Générer
        </button>
      </div>
    </div>`;
    document.documentElement.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const close    = () => overlay.remove();
    overlay.querySelectorAll('.ai-modal-close').forEach(b => b.addEventListener('click', close));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    const statusEl = overlay.querySelector('#aiStatusMsg');
    const setStatus = (msg, isErr = false) => {
        statusEl.style.display = '';
        statusEl.style.background = isErr ? 'var(--semantic-danger-bg,#fef2f2)' : 'var(--semantic-info-bg,#eff6ff)';
        statusEl.style.color      = isErr ? 'var(--semantic-danger,#dc2626)'    : 'var(--action-primary)';
        statusEl.textContent      = msg;
    };

    overlay.querySelector('#aiGenerateBtn').addEventListener('click', async () => {
        const apiKey = overlay.querySelector('#aiApiKey').value.trim();
        const prompt = overlay.querySelector('#aiPromptInput').value.trim();
        if (!apiKey) { setStatus('Veuillez entrer votre clé API Anthropic.', true); return; }
        if (!prompt) { setStatus('Veuillez décrire ce que vous souhaitez générer.', true); return; }

        localStorage.setItem(AI_KEY_STORAGE, apiKey);

        const btn = overlay.querySelector('#aiGenerateBtn');
        btn.disabled = true; btn.textContent = '⏳ Génération…';
        setStatus('Appel à l\'API Anthropic en cours…');

        const systemPrompt = isQuiz
            ? `Tu es un expert en ingénierie pédagogique. Génère des questions de quiz en format JSON. Réponds UNIQUEMENT avec un tableau JSON valide, sans explication ni balise markdown. Format : [{"type":"mcq","text":"...","options":["..."],"correct":0,"explanation":"..."}]. Types possibles : mcq, truefalse, checkbox. Pour truefalse, options doit être ["Vrai","Faux"] et correct est 0 ou 1. Pour checkbox, correct est un tableau d'indices.`
            : `Tu es un expert en ingénierie pédagogique. Génère des objectifs pédagogiques concis. Réponds UNIQUEMENT avec un tableau JSON de chaînes de caractères, sans explication. Format : ["Objectif 1...", "Objectif 2...", ...]`;

        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    max_tokens: 1500,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }

            const data  = await res.json();
            const raw   = data.content?.[0]?.text?.trim() || '';
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('Réponse inattendue de l\'API.');

            const parsed = JSON.parse(jsonMatch[0]);

            if (isQuiz) {
                block.questions = [...(block.questions || []), ...parsed];
                setStatus(`✓ ${parsed.length} question(s) ajoutée(s).`);
            } else {
                const newItems = parsed.filter(Boolean);
                block.items = [...(block.items || []), ...newItems];
                setStatus(`✓ ${newItems.length} objectif(s) ajouté(s).`);
            }
            onUpdate();
            setTimeout(() => close(), 1500);
        } catch (err) {
            setStatus(`Erreur : ${err.message}`, true);
            btn.disabled = false; btn.textContent = '✦ Générer';
        }
    });
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

/**
 * Garantit qu'une URL est absolue (ajoute https:// si nécessaire).
 * Retourne '#' pour les URLs vides/invalides.
 * Usage : href="${esc(safeHref(url))}"
 */
function safeHref(url) {
    if (!url) return '#';
    const u = url.trim();
    if (!u) return '#';
    // Déjà absolu ou schéma spécial
    if (/^https?:\/\//i.test(u)) return u;
    if (/^(\/\/|mailto:|tel:|blob:|data:)/i.test(u)) return u;
    // Chemin interne (commence par / ou #)
    if (u.startsWith('/') || u.startsWith('#')) return u;
    // Tout le reste → on préfixe https://
    return 'https://' + u;
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

// ─── Navigateur Storage Supabase (navigation par dossiers) ───
const _AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm', 'opus']);
const _IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif']);

/**
 * Ouvre un modal navigateur de fichiers pour le bucket `Cours`.
 * Navigation dossier par dossier avec fil d'Ariane + filtre par nom.
 * @param {HTMLInputElement} targetInput — champ à remplir avec l'URL choisie
 * @param {{ accept?: 'audio' | 'image' | 'all' }} opts
 */
async function openStorageBrowser(targetInput, { accept = 'all' } = {}) {
    console.log('[openStorageBrowser] appelé | targetInput=', targetInput, '| accept=', accept);
    if (!targetInput) { console.warn('[openStorageBrowser] targetInput est null/undefined → abandon'); return; }
    const EXTS      = accept === 'image' ? _IMAGE_EXTS : accept === 'audio' ? _AUDIO_EXTS : null; // null = tous
    const typeLabel = accept === 'image' ? 'image' : accept === 'audio' ? 'audio' : 'fichier';
    const fileIcon  = accept === 'image' ? 'image' : accept === 'audio' ? 'music' : 'file';

    let currentPath  = '';   // chemin du dossier courant ('' = racine)
    let currentItems = [];   // entrées brutes Supabase du dossier courant

    // ── Créer l'overlay ────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.className = 'storage-browser-overlay';
    overlay.innerHTML = `
    <div class="storage-browser-modal">
      <div class="storage-browser-header">
        <span>
          <i data-lucide="folder-open" style="width:16px;height:16px;vertical-align:middle;margin-right:6px" aria-hidden="true"></i>
          Sélectionner un fichier ${typeLabel} — bucket Cours
        </span>
        <button type="button" class="btn-icon storage-browser-close" title="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <nav class="storage-browser-breadcrumb" id="sb-breadcrumb" aria-label="Navigation dossiers"></nav>
      <div class="storage-browser-search">
        <input type="search" class="form-input form-input--sm" id="sb-search"
               placeholder="Filtrer par nom dans ce dossier…" autocomplete="off">
      </div>
      <div class="storage-browser-body" id="sb-body">
        <div class="storage-browser-loading">
          <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>&nbsp;Chargement…
        </div>
      </div>
    </div>`;
    try {
        // ⚠️ On ajoute l'overlay à <html> (documentElement) et non à <body>
        // pour éviter que overflow:hidden sur #app (editor-focus) ou editor-shell
        // ne crée un contexte d'empilement qui clippe/masque les éléments position:fixed.
        document.documentElement.appendChild(overlay);
        console.log('[openStorageBrowser] overlay ajouté au documentElement', overlay);
    } catch (err) {
        console.error('[openStorageBrowser] impossible d\'ajouter l\'overlay au DOM :', err);
        return;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    overlay.querySelector('.storage-browser-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // ── Mise à jour du fil d'Ariane ─────────────────────────
    const _updateBreadcrumb = () => {
        const bc   = overlay.querySelector('#sb-breadcrumb');
        if (!bc) return;
        const parts = currentPath ? currentPath.split('/') : [];
        let html = `<span class="sb-crumb${!parts.length ? ' sb-crumb--current' : ''}" data-path="">Cours</span>`;
        parts.forEach((p, i) => {
            const pPath   = parts.slice(0, i + 1).join('/');
            const isCurr  = i === parts.length - 1;
            html += `<span class="sb-crumb-sep">/</span>
                     <span class="sb-crumb${isCurr ? ' sb-crumb--current' : ''}" data-path="${esc(pPath)}">${esc(p)}</span>`;
        });
        bc.innerHTML = html;
        bc.querySelectorAll('.sb-crumb:not(.sb-crumb--current)').forEach(c => {
            c.addEventListener('click', () => _navigateTo(c.dataset.path));
        });
    };

    // ── Rendu des éléments (filtrable) ──────────────────────
    const _renderItems = (filter = '') => {
        const body = overlay.querySelector('#sb-body');
        const q    = filter.toLowerCase().trim();

        const folders = currentItems.filter(i =>
            (i.id === null || i.metadata === null) &&
            i.name !== '.emptyFolderPlaceholder' &&
            (!q || i.name.toLowerCase().includes(q))
        );
        const files = currentItems.filter(i =>
            i.id !== null && i.metadata !== null &&
            i.name !== '.emptyFolderPlaceholder' &&
            (EXTS === null || EXTS.has((i.name.split('.').pop() || '').toLowerCase())) &&
            (!q || i.name.toLowerCase().includes(q))
        );

        if (!folders.length && !files.length) {
            body.innerHTML = `<p class="storage-browser-empty">${
                q ? 'Aucun résultat pour « ' + esc(q) + ' ».'
                  : `Ce dossier ne contient aucun fichier ${typeLabel} ni sous-dossier.`
            }</p>`;
            return;
        }

        body.innerHTML = `<ul class="storage-browser-list">
          ${folders.map(f => {
              const fp = currentPath ? `${currentPath}/${f.name}` : f.name;
              return `<li class="storage-browser-item storage-browser-item--folder" data-path="${esc(fp)}">
                <i data-lucide="folder" style="width:15px;height:15px;flex-shrink:0;color:var(--text-muted)" aria-hidden="true"></i>
                <span class="storage-browser-item__name">${esc(f.name)}</span>
                <i data-lucide="chevron-right" style="width:14px;height:14px;flex-shrink:0;color:var(--text-muted);margin-left:auto" aria-hidden="true"></i>
              </li>`;
          }).join('')}
          ${files.map(f => {
              const fp    = currentPath ? `${currentPath}/${f.name}` : f.name;
              const { data: urlData } = db.storage.from('Cours').getPublicUrl(fp);
              const pub   = urlData?.publicUrl || '';
              const thumb = accept === 'image' && pub
                  ? `<img src="${esc(pub)}" alt="" style="width:44px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;border:1px solid var(--border-color)">`
                  : `<i data-lucide="${fileIcon}" style="width:14px;height:14px;flex-shrink:0;color:var(--action-primary)" aria-hidden="true"></i>`;
              return `<li class="storage-browser-item" data-url="${esc(pub)}" data-name="${esc(f.name)}">
                ${thumb}
                <span class="storage-browser-item__name">${esc(f.name)}</span>
              </li>`;
          }).join('')}
        </ul>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: body });

        // Clic dossier → naviguer dedans
        body.querySelectorAll('.storage-browser-item--folder').forEach(item => {
            item.addEventListener('click', () => _navigateTo(item.dataset.path));
        });
        // Clic fichier → sélectionner
        body.querySelectorAll('.storage-browser-item:not(.storage-browser-item--folder)').forEach(item => {
            item.addEventListener('click', () => {
                targetInput.value = item.dataset.url;
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                overlay.remove();
            });
        });
    };

    // ── Navigation dans un dossier ──────────────────────────
    const _navigateTo = async (path) => {
        currentPath = path;
        const sbSearch = overlay.querySelector('#sb-search');
        if (sbSearch) sbSearch.value = '';
        _updateBreadcrumb();

        const body = overlay.querySelector('#sb-body');
        body.innerHTML = `<div class="storage-browser-loading">
          <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>&nbsp;Chargement…
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: body });

        // ── Lister le contenu via le SDK Supabase (auth gérée automatiquement) ──
        const { data, error: storageError } = await db.storage
            .from('Cours')
            .list(path || '', {
                limit: 1000,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (storageError) {
            const msg = storageError.message || 'Erreur inconnue';
            const isMissing = msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('does not exist');
            body.innerHTML = `<p class="storage-browser-empty" style="color:var(--semantic-error,#ef4444)">
              <strong>Impossible d'accéder au bucket « Cours »</strong><br>
              ${esc(msg)}<br>
              <small style="opacity:.75;line-height:1.5;display:block;margin-top:6px">
                ${isMissing
                    ? '⚠️ Le bucket n\'existe pas encore. Exécutez <code>sql/15_storage_cours_rls.sql</code> dans Supabase SQL Editor.'
                    : 'Vérifiez les politiques RLS du bucket dans Supabase → Storage → Policies.'
                }
              </small>
            </p>`;
            return;
        }

        currentItems = Array.isArray(data) ? data : [];
        _renderItems();
    };

    // ── Filtre en temps réel ────────────────────────────────
    overlay.querySelector('#sb-search')?.addEventListener('input', e => {
        _renderItems(e.target.value);
    });

    // ── Chargement initial : racine ─────────────────────────
    _navigateTo('').catch(err => {
        console.error('[openStorageBrowser] erreur dans _navigateTo :', err);
        const body = overlay.querySelector('#sb-body');
        if (body) body.innerHTML = `<p class="storage-browser-empty" style="color:var(--semantic-error,#ef4444)">
            <strong>Erreur inattendue</strong><br>${esc(String(err))}
        </p>`;
    });
}
