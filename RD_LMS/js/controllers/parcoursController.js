import {
    getPathways, getPathwayConfigs, getPathwayTree,
    getCoursExtendedFields, getSequenceExtendedFields, getSeanceExtendedFields,
    createCoursInConfig, updateCours, deleteCoursFromConfig, reorderConfigCours,
    createSequence, updateSequence, deleteSequence, reorderSequences,
    createSeance, updateSeance, deleteSeance, reorderSeances,
    getSeanceForEditor, saveSeanceContent, saveDraftBlocks,
    createPathway, addPathwayConfig, getAllModulesForClone, cloneCoursToConfig,
    cloneSequenceToModule, cloneSeanceToSequence,
    toggleTemplate, instantiateTemplate,
} from '../models/ContentModel.js';
import { getTitresPro, getFinancements, getCohortes } from '../models/AdminModel.js';
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
            if (result) loadParcoursAdmin(container);
        },
        onToggleTemplate: async (pathwayId) => {
            const isNowTemplate = await safeCall(() => toggleTemplate(pathwayId), 'modèle');
            if (isNowTemplate !== null) loadParcoursAdmin(container);
        },
        onInstantiate: async (templateId, templateTitre) => {
            const cohortes = await safeCall(getCohortes, 'cohortes') || [];
            if (!cohortes.length) { alert('Aucune cohorte disponible.'); return; }
            showInstantiateModal(templateId, templateTitre, cohortes, async (cohorteId) => {
                const newId = await safeCall(
                    () => instantiateTemplate(templateId, cohorteId),
                    'instanciation'
                );
                if (newId) {
                    loadParcoursAdmin(container);
                    // Naviguer vers la nouvelle instance
                    window.location.hash = `#/admin/parcours/${newId}`;
                }
            });
        },
    });
}

// ── Arbre d'un parcours ──────────────────────────────────────
export async function loadParcoursTree(container, pathwayId) {
    loading(container, 'Chargement du parcours…');
    const [pathways, configs, financements] = await Promise.all([
        safeCall(getPathways,   'pathways'),
        safeCall(() => getPathwayConfigs(pathwayId), 'configs'),
        safeCall(getFinancements, 'financements'),
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

    // ── Enrichir les modules (image_url / est_transversal absents du RPC) ──
    if (tree.length) {
        const ids      = tree.map(m => m.cours_id).filter(Boolean);
        const extended = await safeCall(() => getCoursExtendedFields(ids), 'tree-extended') || [];
        if (extended.length) {
            const extMap = Object.fromEntries(extended.map(e => [e.id, e]));
            tree.forEach(m => {
                const ext = extMap[m.cours_id];
                if (ext) {
                    m.image_url       = ext.image_url       ?? null;
                    m.est_transversal = ext.est_transversal ?? false;
                    if (m.duree_heures == null) m.duree_heures = ext.duree_heures ?? 0;
                }
            });
        }

        // ── Enrichir les séquences avec image_url ────────────────────────
        const allSeqIds = tree.flatMap(m => (m.sequences || []).map(s => s.id));
        if (allSeqIds.length) {
            const seqExt = await safeCall(() => getSequenceExtendedFields(allSeqIds), 'seq-extended') || [];
            if (seqExt.length) {
                const seqMap = Object.fromEntries(seqExt.map(s => [s.id, s.image_url]));
                tree.forEach(m => {
                    (m.sequences || []).forEach(s => { s.image_url = seqMap[s.id] ?? null; });
                });
            }
        }

        // ── Enrichir les séances avec image_url ──────────────────────────
        const allSeanceIds = tree.flatMap(m =>
            (m.sequences || []).flatMap(s => (s.seances || []).map(se => se.id))
        );
        if (allSeanceIds.length) {
            const seanceExt = await safeCall(() => getSeanceExtendedFields(allSeanceIds), 'seance-extended') || [];
            if (seanceExt.length) {
                const seanceMap = Object.fromEntries(seanceExt.map(s => [s.id, s.image_url]));
                tree.forEach(m => {
                    (m.sequences || []).forEach(seq => {
                        (seq.seances || []).forEach(s => { s.image_url = seanceMap[s.id] ?? null; });
                    });
                });
            }
        }
    }

    const refresh = () => loadParcoursTree(container, pathwayId);

    renderParcoursTree(container, {
        pathway,
        configs,
        activeConfig,
        tree,
        financements: financements || [],
        onConfigChange: (configId) => {
            window.location.hash = `#/admin/parcours/${pathwayId}?cfg=${configId}`;
        },
        // Ajouter une configuration (financement) au parcours
        onAddConfig: async (financementId) => {
            const result = await safeCall(
                () => addPathwayConfig(pathwayId, financementId),
                'ajout configuration'
            );
            if (result) {
                // Le changement de hash déclenche le routeur → rechargement automatique
                window.location.hash = `#/admin/parcours/${pathwayId}?cfg=${result.config_id}`;
            }
        },
        // Import CSV — reçoit un tableau de lignes parsées, rafraîchit si succès partiel ou total
        onImportCSV: async (rows) => {
            const results = await importCSVRows(rows, activeConfig.config_id);
            if (results.success > 0) {
                // Déclencher le rechargement après que la modale ait eu le temps d'afficher le résultat
                setTimeout(() => refresh(), 2200);
            }
            return results;
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
        // Clonage de séquence vers un autre module
        onCloneSequence: async (seq) => {
            await showCloneSequenceModal(seq, async (destCoursId) => {
                await safeCall(
                    () => cloneSequenceToModule(seq.id, destCoursId),
                    'clonage séquence'
                );
                refresh();
            });
        },
        // Clonage de séance vers une autre séquence
        onCloneSeance: async (seance) => {
            await showCloneSeanceModal(seance, async (destSeqId) => {
                await safeCall(
                    () => cloneSeanceToSequence(seance.id, destSeqId),
                    'clonage séance'
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

// ── Modale d'instanciation d'un modèle ───────────────────────
function showInstantiateModal(templateId, templateTitre, cohortes, onConfirm) {
    const year = new Date().getFullYear();

    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal tree-modal--lg">
      <div class="tree-modal-header">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="git-branch" aria-hidden="true"></i>
          <h3>Instancier le modèle pour une cohorte</h3>
        </div>
        <button class="tree-modal-close btn-icon"><i data-lucide="x"></i></button>
      </div>
      <div class="tree-modal-body">

        <div class="clone-block-info">
          <i data-lucide="layout-template" aria-hidden="true"></i>
          <span>Modèle : <strong>${esc(templateTitre)}</strong></span>
        </div>

        <div class="form-group">
          <label class="form-label form-label--required">
            <i data-lucide="users" style="width:14px;height:14px"></i>
            Cohorte de destination
          </label>
          <select id="instCohorte" class="form-input">
            <option value="">— Sélectionner une cohorte —</option>
            ${cohortes.map(c => `<option value="${c.id}" data-nom="${esc(c.nom)}">${esc(c.nom)}${c.date_debut ? ` (${new Date(c.date_debut).toLocaleDateString('fr-FR')})` : ''}</option>`).join('')}
          </select>
        </div>

        <div id="instNameWrap" class="form-group" style="display:none">
          <label class="form-label">
            <i data-lucide="tag" style="width:14px;height:14px"></i>
            Nom généré automatiquement
          </label>
          <input type="text" id="instName" class="form-input" readonly
                 style="background:var(--surface-raised);font-family:var(--font-mono);font-size:var(--font-body2-size)">
          <p class="form-hint">Vous pourrez renommer cette instance depuis son arbre.</p>
        </div>

        <div class="instance-info-box" style="display:none" id="instInfoBox">
          <i data-lucide="info" aria-hidden="true"></i>
          <div>
            <strong>Ce que l'instanciation va faire :</strong>
            <ul style="margin:var(--space-1) 0 0 var(--space-4);padding:0">
              <li>Créer une copie complète et indépendante du modèle</li>
              <li>Nommer le parcours : <em id="instNamePreview"></em></li>
              <li>Rattacher la cohorte à ce nouveau parcours</li>
              <li>Tous les modules, séquences et séances seront copiés</li>
            </ul>
          </div>
        </div>

        <div id="instStatus" class="clone-status-msg" style="display:none"></div>
      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Annuler</button>
        <button class="btn btn-cta" id="instConfirmBtn" disabled>
          <i data-lucide="git-branch" aria-hidden="true"></i> Instancier
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const cohorteEl  = overlay.querySelector('#instCohorte');
    const nameWrap   = overlay.querySelector('#instNameWrap');
    const nameInput  = overlay.querySelector('#instName');
    const infoBox    = overlay.querySelector('#instInfoBox');
    const namePreview = overlay.querySelector('#instNamePreview');
    const statusEl   = overlay.querySelector('#instStatus');
    const confirmBtn = overlay.querySelector('#instConfirmBtn');

    overlay.querySelectorAll('.tree-modal-close').forEach(b => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    cohorteEl.addEventListener('change', () => {
        const opt = cohorteEl.options[cohorteEl.selectedIndex];
        if (!cohorteEl.value) {
            nameWrap.style.display = infoBox.style.display = 'none';
            confirmBtn.disabled = true;
            return;
        }
        const cohorteNom = opt.dataset.nom || opt.text;
        const safeName   = cohorteNom.replace(/\s+/g, '_');
        const generated  = `${templateTitre}_${safeName}_${year}`;
        nameInput.value        = generated;
        namePreview.textContent = generated;
        nameWrap.style.display = infoBox.style.display = '';
        confirmBtn.disabled    = false;
        statusEl.style.display = 'none';
    });

    confirmBtn.addEventListener('click', async () => {
        const cohorteId = cohorteEl.value; if (!cohorteId) return;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Instanciation en cours…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });

        try {
            await onConfirm(cohorteId);
            statusEl.style.display = '';
            statusEl.className = 'clone-status-msg clone-status-msg--success';
            statusEl.textContent = `✓ Instance "${nameInput.value}" créée ! Redirection…`;
            confirmBtn.innerHTML = '<i data-lucide="check"></i> Créé !';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
            setTimeout(() => overlay.remove(), 1500);
        } catch (e) {
            statusEl.style.display = '';
            statusEl.className = 'clone-status-msg clone-status-msg--error';
            statusEl.textContent = `Erreur : ${e?.message || e}`;
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i data-lucide="git-branch"></i> Instancier';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        }
    });
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

// ── Modale : Cloner une séquence vers un autre module ────────
async function showCloneSequenceModal(seq, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal tree-modal--lg">
      <div class="tree-modal-header">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="send-horizontal" aria-hidden="true"></i>
          <h3>Cloner la séquence vers un autre module</h3>
        </div>
        <button class="tree-modal-close btn-icon"><i data-lucide="x"></i></button>
      </div>
      <div class="tree-modal-body">
        <div class="clone-block-info">
          <i data-lucide="list" aria-hidden="true"></i>
          <span>Séquence à cloner : <strong>${esc(seq.titre)}</strong>
            <span class="badge badge-outline badge-sm" style="margin-left:var(--space-1)">${(seq.seances||[]).length} séance(s)</span>
          </span>
        </div>
        <div class="form-group">
          <label class="form-label form-label--required"><i data-lucide="book-open" style="width:14px;height:14px"></i> Parcours</label>
          <select id="cseqParcours" class="form-input"><option value="">⏳ Chargement…</option></select>
        </div>
        <div id="cseqConfigWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required"><i data-lucide="settings" style="width:14px;height:14px"></i> Configuration</label>
          <select id="cseqConfig" class="form-input"><option value="">— Sélectionner —</option></select>
        </div>
        <div id="cseqModuleWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required"><i data-lucide="layers" style="width:14px;height:14px"></i> Module de destination</label>
          <select id="cseqModule" class="form-input"><option value="">— Sélectionner un module —</option></select>
        </div>
        <div id="cseqStatus" class="clone-status-msg" style="display:none"></div>
      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Annuler</button>
        <button class="btn btn-cta" id="cseqConfirm" disabled>
          <i data-lucide="send-horizontal"></i> Cloner ici
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const parcoursEl = overlay.querySelector('#cseqParcours');
    const configWrap = overlay.querySelector('#cseqConfigWrap');
    const configEl   = overlay.querySelector('#cseqConfig');
    const moduleWrap = overlay.querySelector('#cseqModuleWrap');
    const moduleEl   = overlay.querySelector('#cseqModule');
    const statusEl   = overlay.querySelector('#cseqStatus');
    const confirmBtn = overlay.querySelector('#cseqConfirm');

    overlay.querySelectorAll('.tree-modal-close').forEach(b => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    function showStatus(msg, isErr = false) {
        statusEl.style.display = '';
        statusEl.className = `clone-status-msg clone-status-msg--${isErr ? 'error' : 'success'}`;
        statusEl.textContent = msg;
    }

    let _tree = [];

    // Charger parcours
    try {
        const parcours = await getPathways();
        parcoursEl.innerHTML = `<option value="">— Sélectionner un parcours —</option>` +
            parcours.map(p => `<option value="${p.id}">${esc(p.titre)}</option>`).join('');
    } catch { parcoursEl.innerHTML = '<option value="">Erreur</option>'; }

    parcoursEl.addEventListener('change', async () => {
        configWrap.style.display = 'none'; moduleWrap.style.display = 'none';
        confirmBtn.disabled = true; statusEl.style.display = 'none';
        const pid = parcoursEl.value; if (!pid) return;
        try {
            const configs = await getPathwayConfigs(pid);
            if (!configs.length) { showStatus('Aucune config trouvée.', true); return; }
            if (configs.length === 1) { await loadModules(configs[0].config_id); }
            else {
                configWrap.style.display = '';
                configEl.innerHTML = `<option value="">— Sélectionner —</option>` +
                    configs.map(c => `<option value="${c.config_id}">${esc(c.financement_nom || 'Sans financement')}</option>`).join('');
            }
        } catch { showStatus('Erreur chargement configs.', true); }
    });

    configEl.addEventListener('change', async () => {
        moduleWrap.style.display = 'none'; confirmBtn.disabled = true;
        if (!configEl.value) return;
        await loadModules(configEl.value);
    });

    async function loadModules(configId) {
        try {
            _tree = await getPathwayTree(configId);
            if (!_tree.length) { showStatus('Ce parcours n\'a aucun module.', true); return; }
            moduleWrap.style.display = '';
            moduleEl.innerHTML = `<option value="">— Sélectionner un module —</option>` +
                _tree.map(m => `<option value="${m.cours_id}">${esc(m.titre)}</option>`).join('');
        } catch { showStatus('Erreur chargement modules.', true); }
    }

    moduleEl.addEventListener('change', () => { confirmBtn.disabled = !moduleEl.value; });

    confirmBtn.addEventListener('click', async () => {
        const destCoursId = moduleEl.value; if (!destCoursId) return;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Clonage…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        try {
            await onConfirm(destCoursId);
            showStatus(`✓ Séquence clonée avec succès dans "${moduleEl.options[moduleEl.selectedIndex].text}" !`);
            confirmBtn.innerHTML = '<i data-lucide="check"></i> Cloné !';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
            setTimeout(() => overlay.remove(), 1800);
        } catch (e) {
            showStatus(`Erreur : ${e?.message || e}`, true);
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i data-lucide="send-horizontal"></i> Cloner ici';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        }
    });
}

// ── Modale : Cloner une séance vers une autre séquence ───────
async function showCloneSeanceModal(seance, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'tree-modal-overlay';
    overlay.innerHTML = `
    <div class="tree-modal tree-modal--lg">
      <div class="tree-modal-header">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="send-horizontal" aria-hidden="true"></i>
          <h3>Cloner la séance vers une autre séquence</h3>
        </div>
        <button class="tree-modal-close btn-icon"><i data-lucide="x"></i></button>
      </div>
      <div class="tree-modal-body">
        <div class="clone-block-info">
          <i data-lucide="file-text" aria-hidden="true"></i>
          <span>Séance à cloner : <strong>${esc(seance.titre)}</strong>
            <span class="badge badge-outline badge-sm" style="margin-left:var(--space-1)">${seance.type || 'cours'}</span>
          </span>
        </div>
        <div class="form-group">
          <label class="form-label form-label--required"><i data-lucide="book-open" style="width:14px;height:14px"></i> Parcours</label>
          <select id="cseanceParcours" class="form-input"><option value="">⏳ Chargement…</option></select>
        </div>
        <div id="cseanConfigWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required"><i data-lucide="settings" style="width:14px;height:14px"></i> Configuration</label>
          <select id="cseanConfig" class="form-input"><option value="">— Sélectionner —</option></select>
        </div>
        <div id="cseanModuleWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required"><i data-lucide="layers" style="width:14px;height:14px"></i> Module</label>
          <select id="cseanModule" class="form-input"><option value="">— Sélectionner un module —</option></select>
        </div>
        <div id="cseanSeqWrap" class="form-group" style="display:none">
          <label class="form-label form-label--required"><i data-lucide="list" style="width:14px;height:14px"></i> Séquence de destination</label>
          <select id="cseanSeq" class="form-input"><option value="">— Sélectionner une séquence —</option></select>
        </div>
        <div id="cseanStatus" class="clone-status-msg" style="display:none"></div>
      </div>
      <div class="tree-modal-footer">
        <button class="btn btn-ghost tree-modal-close">Annuler</button>
        <button class="btn btn-cta" id="cseanConfirm" disabled>
          <i data-lucide="send-horizontal"></i> Cloner ici
        </button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const parcoursEl = overlay.querySelector('#cseanceParcours');
    const configWrap = overlay.querySelector('#cseanConfigWrap');
    const configEl   = overlay.querySelector('#cseanConfig');
    const moduleWrap = overlay.querySelector('#cseanModuleWrap');
    const moduleEl   = overlay.querySelector('#cseanModule');
    const seqWrap    = overlay.querySelector('#cseanSeqWrap');
    const seqEl      = overlay.querySelector('#cseanSeq');
    const statusEl   = overlay.querySelector('#cseanStatus');
    const confirmBtn = overlay.querySelector('#cseanConfirm');

    overlay.querySelectorAll('.tree-modal-close').forEach(b => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    function showStatus(msg, isErr = false) {
        statusEl.style.display = '';
        statusEl.className = `clone-status-msg clone-status-msg--${isErr ? 'error' : 'success'}`;
        statusEl.textContent = msg;
    }

    let _tree = [];

    // Charger parcours
    try {
        const parcours = await getPathways();
        parcoursEl.innerHTML = `<option value="">— Sélectionner un parcours —</option>` +
            parcours.map(p => `<option value="${p.id}">${esc(p.titre)}</option>`).join('');
    } catch { parcoursEl.innerHTML = '<option value="">Erreur</option>'; }

    parcoursEl.addEventListener('change', async () => {
        configWrap.style.display = moduleWrap.style.display = seqWrap.style.display = 'none';
        confirmBtn.disabled = true; statusEl.style.display = 'none';
        const pid = parcoursEl.value; if (!pid) return;
        try {
            const configs = await getPathwayConfigs(pid);
            if (!configs.length) { showStatus('Aucune config trouvée.', true); return; }
            if (configs.length === 1) { await loadTree(configs[0].config_id); }
            else {
                configWrap.style.display = '';
                configEl.innerHTML = `<option value="">— Sélectionner —</option>` +
                    configs.map(c => `<option value="${c.config_id}">${esc(c.financement_nom || 'Sans financement')}</option>`).join('');
            }
        } catch { showStatus('Erreur chargement configs.', true); }
    });

    configEl.addEventListener('change', async () => {
        moduleWrap.style.display = seqWrap.style.display = 'none'; confirmBtn.disabled = true;
        if (!configEl.value) return;
        await loadTree(configEl.value);
    });

    async function loadTree(configId) {
        try {
            _tree = await getPathwayTree(configId);
            if (!_tree.length) { showStatus('Ce parcours n\'a aucun module.', true); return; }
            moduleWrap.style.display = '';
            moduleEl.innerHTML = `<option value="">— Sélectionner un module —</option>` +
                _tree.map(m => `<option value="${m.cours_id}">${esc(m.titre)}</option>`).join('');
        } catch { showStatus('Erreur chargement arbre.', true); }
    }

    moduleEl.addEventListener('change', () => {
        seqWrap.style.display = 'none'; confirmBtn.disabled = true;
        seqEl.innerHTML = '<option value="">— Sélectionner une séquence —</option>';
        const mod = _tree.find(m => m.cours_id === moduleEl.value);
        if (!mod) return;
        const seqs = mod.sequences || [];
        if (!seqs.length) { showStatus('Ce module n\'a aucune séquence.', true); return; }
        seqWrap.style.display = '';
        seqEl.innerHTML = `<option value="">— Sélectionner une séquence —</option>` +
            seqs.map(s => `<option value="${s.id}">${esc(s.titre)}</option>`).join('');
    });

    seqEl.addEventListener('change', () => { confirmBtn.disabled = !seqEl.value; statusEl.style.display = 'none'; });

    confirmBtn.addEventListener('click', async () => {
        const destSeqId = seqEl.value; if (!destSeqId) return;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Clonage…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        try {
            await onConfirm(destSeqId);
            showStatus(`✓ Séance clonée avec succès dans "${seqEl.options[seqEl.selectedIndex].text}" !`);
            confirmBtn.innerHTML = '<i data-lucide="check"></i> Cloné !';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
            setTimeout(() => overlay.remove(), 1800);
        } catch (e) {
            showStatus(`Erreur : ${e?.message || e}`, true);
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i data-lucide="send-horizontal"></i> Cloner ici';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: confirmBtn });
        }
    });
}

// ── Import CSV : crée la hiérarchie module → séquence → séance ──
/**
 * @param {Array<{type, titre, description, duree_heures, type_seance}>} rows
 * @param {string} configId — config active dans laquelle créer les modules
 * @returns {{ success: number, errors: Array<{ligne, titre, message}> }}
 */
async function importCSVRows(rows, configId) {
    const results      = { success: 0, errors: [] };
    let currentCoursId = null;
    let currentSeqId   = null;

    for (let i = 0; i < rows.length; i++) {
        const row   = rows[i];
        const type  = (row.type || '').toLowerCase().trim();
        const titre = (row.titre || '').trim();

        if (!type || !titre) continue; // ignorer les lignes vides

        try {
            if (type === 'module') {
                const coursId = await createCoursInConfig(configId, {
                    titre,
                    description:  row.description  || null,
                    objectif:     row.description  || null,
                    duree_heures: parseFloat(row.duree_heures) || 0,
                    obligatoire:  true,
                });
                currentCoursId = coursId;
                currentSeqId   = null;
                results.success++;

            } else if (type === 'sequence' || type === 'séquence') {
                if (!currentCoursId) throw new Error('Séquence sans module parent (définir un module avant)');
                const seq = await createSequence(currentCoursId, {
                    titre,
                    objectif: row.description || null,
                });
                currentSeqId = seq.id;
                results.success++;

            } else if (type === 'seance' || type === 'séance') {
                if (!currentSeqId) throw new Error('Séance sans séquence parente (définir une séquence avant)');
                await createSeance(currentSeqId, {
                    titre,
                    type:         row.type_seance || 'cours',
                    duree_heures: parseFloat(row.duree_heures) || 3.5,
                });
                results.success++;

            } else {
                throw new Error(`Type inconnu : "${row.type}" — utiliser module, sequence ou seance`);
            }
        } catch (err) {
            results.errors.push({ ligne: i + 2, titre: titre || '?', message: err.message });
        }
    }
    return results;
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function loading(container, msg) {
    container.innerHTML = `<div class="loading">
      <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>${msg}
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

