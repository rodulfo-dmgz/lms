import {
    getPathways, getPathwayConfigs, getPathwayTree,
    createCoursInConfig, updateCours, deleteCoursFromConfig, reorderConfigCours,
    createSequence, updateSequence, deleteSequence, reorderSequences,
    createSeance, updateSeance, deleteSeance, reorderSeances,
    getSeanceForEditor, saveSeanceContent, saveDraftBlocks,
    createPathway, getAllModulesForClone, cloneCoursToConfig,
} from '../models/ContentModel.js';
import { getTitresPro, getFinancements } from '../models/AdminModel.js';
import { safeCall, handleError } from '../errorHandler.js';
import { renderParcoursList }   from '../views/admin/parcoursListView.js';
import { renderParcoursTree }   from '../views/admin/parcoursTreeView.js';
import { renderSeanceEditor }   from '../views/admin/seanceEditorView.js';

// ── Liste des parcours ───────────────────────────────────────
export async function loadParcoursAdmin(container) {
    loading(container, 'Chargement des parcours…');
    const [pathways, titresPro, financements] = await Promise.all([
        safeCall(getPathways,    'parcours')     || [],
        safeCall(getTitresPro,   'titres_pro')   || [],
        safeCall(getFinancements,'financements') || [],
    ]);

    renderParcoursList(container, {
        pathways,
        titresPro,
        financements,
        onCreatePathway: async (data) => {
            const result = await safeCall(() => createPathway(data), 'créer parcours');
            if (result) {
                loadParcoursAdmin(container);
            }
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Arbre d'un parcours ──────────────────────────────────────
export async function loadParcoursTree(container, pathwayId) {
    loading(container, 'Chargement du parcours…');
    const [pathways, configs] = await Promise.all([
        safeCall(getPathways, 'pathways'),
        safeCall(() => getPathwayConfigs(pathwayId), 'configs'),
    ]);

    const pathway = (pathways || []).find(p => p.id === pathwayId);
    if (!pathway) { window.location.hash = '#/admin/parcours'; return; }

    if (!configs?.length) {
        container.innerHTML = `<div class="page-admin">
          <div class="admin-page-header">
            <h1 class="admin-page-title">${esc(pathway.titre)}</h1>
            <a href="#/admin/parcours" class="btn btn-ghost"><i data-lucide="arrow-left"></i> Retour</a>
          </div>
          <div class="admin-empty">
            <i data-lucide="alert-circle"></i>
            <p>Aucune configuration (parcours + financement) trouvée pour ce parcours.</p>
          </div>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
        return;
    }

    // Default to first config
    const hash       = location.hash;
    const cfgParam   = new URLSearchParams(hash.split('?')[1] || '').get('cfg');
    const activeConfig = configs.find(c => c.config_id === cfgParam) || configs[0];

    const tree = await safeCall(() => getPathwayTree(activeConfig.config_id), 'tree') || [];

    const refresh = () => loadParcoursTree(container, pathwayId);

    renderParcoursTree(container, {
        pathway,
        configs,
        activeConfig,
        tree,
        onConfigChange: (configId) => {
            window.location.hash = `#/admin/parcours/${pathwayId}?cfg=${configId}`;
        },
        // Module callbacks
        onAddModule: async (data) => {
            await safeCall(() => createCoursInConfig(activeConfig.config_id, data), 'ajout module');
            refresh();
        },
        onEditModule: async (coursId, data) => {
            await safeCall(() => updateCours(coursId, data), 'modification module');
            refresh();
        },
        onDeleteModule: async (configCoursId, titre) => {
            if (!confirm(`Retirer le module "${titre}" de ce parcours ?`)) return;
            await safeCall(() => deleteCoursFromConfig(configCoursId), 'suppression module');
            refresh();
        },
        onMoveModule: async (items) => {
            await safeCall(() => reorderConfigCours(items), 'réordonnancement modules');
            refresh();
        },
        // Séquence callbacks
        onAddSequence: async (coursId, data) => {
            await safeCall(() => createSequence(coursId, data), 'ajout séquence');
            refresh();
        },
        onEditSequence: async (id, data) => {
            await safeCall(() => updateSequence(id, data), 'modification séquence');
            refresh();
        },
        onDeleteSequence: async (id, titre) => {
            if (!confirm(`Supprimer la séquence "${titre}" et toutes ses séances ?`)) return;
            await safeCall(() => deleteSequence(id), 'suppression séquence');
            refresh();
        },
        onMoveSequence: async (items) => {
            await safeCall(() => reorderSequences(items), 'réordonnancement séquences');
            refresh();
        },
        // Séance callbacks
        onAddSeance: async (sequenceId, data) => {
            await safeCall(() => createSeance(sequenceId, data), 'ajout séance');
            refresh();
        },
        onEditSeance: async (id, data) => {
            await safeCall(() => updateSeance(id, data), 'modification séance');
            refresh();
        },
        onDeleteSeance: async (id, titre) => {
            if (!confirm(`Supprimer la séance "${titre}" ?`)) return;
            await safeCall(() => deleteSeance(id), 'suppression séance');
            refresh();
        },
        onMoveSeance: async (items) => {
            await safeCall(() => reorderSeances(items), 'réordonnancement séances');
            refresh();
        },
        onEditContent: (seanceId) => {
            window.location.hash = `#/admin/seances/${seanceId}/edit`;
        },
        // Clonage de module depuis un autre parcours
        onCloneModule: async () => {
            const allModules = await safeCall(getAllModulesForClone, 'modules clone') || [];
            if (!allModules.length) { alert('Aucun module disponible à cloner.'); return; }
            showCloneModal(allModules, activeConfig.config_id, async (sourceCoursId) => {
                await safeCall(
                    () => cloneCoursToConfig(sourceCoursId, activeConfig.config_id),
                    'clonage module'
                );
                refresh();
            });
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Éditeur de contenu séance ────────────────────────────────
export async function loadSeanceEditor(container, seanceId) {
    loading(container, 'Chargement de la séance…');
    const seance = await safeCall(() => getSeanceForEditor(seanceId), 'séance');
    if (!seance) return;

    renderSeanceEditor(container, {
        seance,
        onSave: async (html, blocks) => {
            await safeCall(() => saveSeanceContent(seanceId, html, blocks), 'sauvegarde contenu');
        },
        onSaveDraft: async (blocks) => {
            await safeCall(() => saveDraftBlocks(seanceId, blocks), 'brouillon');
        },
        onSaveTitle: async (data) => {
            await safeCall(
                () => import('../models/ContentModel.js').then(m => m.updateSeance(seanceId, data)),
                'mise à jour séance'
            );
        },
        onBack: () => { history.back(); },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Modale de clonage ────────────────────────────────────────
function showCloneModal(allModules, currentConfigId, onConfirm) {
    // Grouper par parcours
    const byPathway = {};
    allModules.forEach(m => {
        if (!byPathway[m.pathway_id]) byPathway[m.pathway_id] = { titre: m.pathway_titre, modules: [] };
        byPathway[m.pathway_id].modules.push(m);
    });

    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal">
      <div class="tree-modal-header">
        <h3><i data-lucide="copy" aria-hidden="true"></i> Cloner un module</h3>
        <button class="tree-modal-close btn-icon" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="tree-modal-body">
        <p class="form-hint" style="margin-bottom:var(--space-3)">
          Choisissez un module à copier dans ce parcours.<br>
          Toutes ses séquences et séances seront dupliquées indépendamment.
        </p>
        <div class="form-group">
          <label class="form-label form-label--required">Parcours source</label>
          <select id="clonePathwaySel" class="form-input">
            <option value="">— Sélectionner un parcours —</option>
            ${Object.entries(byPathway).map(([pid, pw]) =>
              `<option value="${pid}">${esc(pw.titre)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" id="cloneModuleWrap" style="display:none">
          <label class="form-label form-label--required">Module à cloner</label>
          <select id="cloneModuleSel" class="form-input">
            <option value="">— Sélectionner un module —</option>
          </select>
          <p class="form-hint" id="cloneModuleHint" style="margin-top:var(--space-1)"></p>
        </div>
      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Annuler</button>
        <button class="btn btn-cta" id="cloneConfirmBtn" disabled>
          <i data-lucide="copy" aria-hidden="true"></i> Cloner ce module
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const pathwaySel = overlay.querySelector('#clonePathwaySel');
    const moduleWrap = overlay.querySelector('#cloneModuleWrap');
    const moduleSel  = overlay.querySelector('#cloneModuleSel');
    const moduleHint = overlay.querySelector('#cloneModuleHint');
    const confirmBtn = overlay.querySelector('#cloneConfirmBtn');

    pathwaySel.addEventListener('change', () => {
        const pid = pathwaySel.value;
        if (!pid) { moduleWrap.style.display = 'none'; confirmBtn.disabled = true; return; }
        const mods = byPathway[pid]?.modules || [];
        moduleSel.innerHTML = `<option value="">— Sélectionner un module —</option>` +
            mods.map(m => `<option value="${m.cours_id}">${esc(m.cours_titre)} (${m.seq_count} séq., ${m.seance_count} séances)</option>`).join('');
        moduleWrap.style.display = 'block';
        confirmBtn.disabled = true;
        moduleHint.textContent = '';
    });

    moduleSel.addEventListener('change', () => {
        const cid = moduleSel.value;
        if (!cid) { confirmBtn.disabled = true; moduleHint.textContent = ''; return; }
        const mod = allModules.find(m => m.cours_id === cid);
        moduleHint.textContent = mod
            ? `${mod.seq_count} séquence${mod.seq_count > 1 ? 's' : ''}, ${mod.seance_count} séance${mod.seance_count > 1 ? 's' : ''} seront copiées.`
            : '';
        confirmBtn.disabled = false;
    });

    overlay.querySelectorAll('.tree-modal-close').forEach(b =>
        b.addEventListener('click', () => overlay.remove())
    );
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    confirmBtn.addEventListener('click', async () => {
        const sourceCoursId = moduleSel.value;
        if (!sourceCoursId) return;
        confirmBtn.disabled  = true;
        confirmBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Clonage…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        await onConfirm(sourceCoursId);
        overlay.remove();
    });
}

function loading(container, msg) {
    container.innerHTML = `<div class="loading">
      <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>${msg}
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
