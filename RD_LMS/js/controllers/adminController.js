import {
    getAdminStats, getCohortes, getCohorteById, createCohorte, updateCohorte, deleteCohorte,
    getCohorteMembers, getAvailableStagiaires, addMember, removeMember,
    getStagiaires, getStagiaireById, updateStagiaireProfile, enrollStagiaire, createStagiaire,
    getTitresPro, getPathways, getFinancements,
    importStagiaires, getAllProfiles,
} from '../models/AdminModel.js';
import { parseCSV }           from '../utils/csvParser.js';
import { store }              from '../store.js';
import { safeCall, handleError } from '../errorHandler.js';
import { renderAdminHome }    from '../views/admin/adminHomeView.js';
import { renderCohorteList }  from '../views/admin/cohorteListView.js';
import { renderCohorteForm }  from '../views/admin/cohorteFormView.js';
import { renderStagiaireList } from '../views/admin/stagiaireListView.js';
import { renderStagiaireForm } from '../views/admin/stagiaireFormView.js';
import { renderImportPreview, renderImportResults } from '../views/adminView.js';

// ── Point d'entrée principal (dispatche selon le hash) ───────
export async function loadAdmin(container) {
    const hash = location.hash.slice(1);

    if (/^\/admin\/cohortes\/nouveau$/.test(hash)) return loadCohorteNew(container);
    if (/^\/admin\/cohortes\/([^/]+)$/.test(hash)) {
        const id = hash.match(/^\/admin\/cohortes\/([^/]+)$/)[1];
        return loadCohorteEdit(container, id);
    }
    if (/^\/admin\/cohortes$/.test(hash)) return loadCohorteList(container);

    if (/^\/admin\/stagiaires\/nouveau$/.test(hash)) return loadStagiaireNew(container);
    if (/^\/admin\/stagiaires\/([^/]+)$/.test(hash)) {
        const id = hash.match(/^\/admin\/stagiaires\/([^/]+)$/)[1];
        return loadStagiaireEdit(container, id);
    }
    if (/^\/admin\/stagiaires$/.test(hash)) return loadStagiaireList(container);

    return loadAdminHome(container);
}

// ── Accueil admin ────────────────────────────────────────────
async function loadAdminHome(container) {
    loading(container, 'Chargement…');
    const [stats, cohortes, stagiaires] = await Promise.all([
        safeCall(getAdminStats, 'stats'),
        safeCall(getCohortes, 'cohortes'),
        safeCall(getAllProfiles, 'profiles'),
    ]);
    renderAdminHome(container, {
        stats:      stats || { nb_cohortes: 0, nb_stagiaires: 0, nb_pathways: 0, nb_cours: 0 },
        cohortes:   cohortes || [],
        stagiaires: (stagiaires || []).filter(p => p.role === 'stagiaire'),
        onImport:   () => setupImport(container),
    });
    setupImport(container);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Liste des cohortes ───────────────────────────────────────
async function loadCohorteList(container) {
    loading(container, 'Chargement des cohortes…');
    const cohortes = await safeCall(getCohortes, 'cohortes') || [];
    renderCohorteList(container, {
        cohortes,
        onEdit:   (id)  => { window.location.hash = `#/admin/cohortes/${id}`; },
        onDelete: async (id, nom) => {
            if (!confirm(`Supprimer la cohorte "${nom}" ? Cette action est irréversible.`)) return;
            await safeCall(() => deleteCohorte(id), 'suppression cohorte');
            loadCohorteList(container);
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Créer une cohorte ────────────────────────────────────────
async function loadCohorteNew(container) {
    loading(container, 'Chargement…');
    const [pathways, financements] = await Promise.all([
        safeCall(getPathways, 'pathways'),
        safeCall(getFinancements, 'financements'),
    ]);
    renderCohorteForm(container, {
        cohorte:      null,
        pathways:     pathways || [],
        financements: financements || [],
        members:      [],
        available:    [],
        onSave: async (data) => {
            const created = await safeCall(() => createCohorte(data), 'création cohorte');
            if (created) window.location.hash = `#/admin/cohortes/${created.id}`;
        },
        onCancel: () => { window.location.hash = '#/admin/cohortes'; },
        onAddMember:    null,
        onRemoveMember: null,
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Éditer une cohorte ───────────────────────────────────────
async function loadCohorteEdit(container, id) {
    loading(container, 'Chargement de la cohorte…');
    const [cohorte, pathways, financements, members, available] = await Promise.all([
        safeCall(() => getCohorteById(id), 'cohorte'),
        safeCall(getPathways, 'pathways'),
        safeCall(getFinancements, 'financements'),
        safeCall(() => getCohorteMembers(id), 'membres'),
        safeCall(() => getAvailableStagiaires(id), 'stagiaires disponibles'),
    ]);

    if (!cohorte) { window.location.hash = '#/admin/cohortes'; return; }

    const refresh = () => loadCohorteEdit(container, id);

    renderCohorteForm(container, {
        cohorte,
        pathways:     pathways || [],
        financements: financements || [],
        members:      members || [],
        available:    available || [],
        onSave: async (data) => {
            await safeCall(() => updateCohorte(id, data), 'mise à jour cohorte');
            refresh();
        },
        onCancel: () => { window.location.hash = '#/admin/cohortes'; },
        onAddMember: async (profileId) => {
            await safeCall(() => addMember(id, profileId), 'ajout membre');
            refresh();
        },
        onRemoveMember: async (profileId, nom) => {
            if (!confirm(`Retirer ${nom} de cette cohorte ?`)) return;
            await safeCall(() => removeMember(id, profileId), 'retrait membre');
            refresh();
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Liste des stagiaires ─────────────────────────────────────
async function loadStagiaireList(container) {
    loading(container, 'Chargement des stagiaires…');
    const [stagiaires, cohortes] = await Promise.all([
        safeCall(getStagiaires, 'stagiaires'),
        safeCall(getCohortes, 'cohortes'),
    ]);
    renderStagiaireList(container, {
        stagiaires: stagiaires || [],
        cohortes:   cohortes || [],
        onEdit: (id) => { window.location.hash = `#/admin/stagiaires/${id}`; },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Créer un stagiaire ───────────────────────────────────────
async function loadStagiaireNew(container) {
    loading(container, 'Chargement…');
    const cohortes = await safeCall(getCohortes, 'cohortes') || [];
    renderStagiaireForm(container, {
        stagiaire: null,
        cohortes,
        onSave: async (data, showSuccess) => {
            const result = await safeCall(() => createStagiaire(data), 'création stagiaire');
            if (result) showSuccess(result.mot_de_passe, data.email);
        },
        onCancel: () => { window.location.hash = '#/admin/stagiaires'; },
        onEnroll: null,
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Éditer un stagiaire ──────────────────────────────────────
async function loadStagiaireEdit(container, id) {
    loading(container, 'Chargement du stagiaire…');
    const [stagiaire, cohortes] = await Promise.all([
        safeCall(() => getStagiaireById(id), 'stagiaire'),
        safeCall(getCohortes, 'cohortes'),
    ]);
    if (!stagiaire) { window.location.hash = '#/admin/stagiaires'; return; }

    const refresh = () => loadStagiaireEdit(container, id);

    renderStagiaireForm(container, {
        stagiaire,
        cohortes: cohortes || [],
        onSave: async (data) => {
            await safeCall(() => updateStagiaireProfile(id, data), 'mise à jour stagiaire');
            refresh();
        },
        onCancel: () => { window.location.hash = '#/admin/stagiaires'; },
        onEnroll: async (cohorteId) => {
            await safeCall(() => enrollStagiaire(id, cohorteId), 'inscription cohorte');
            refresh();
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Import CSV (conservé dans la home) ───────────────────────
let parsedRows = null;

function setupImport(container) {
    const dropZone  = container.querySelector('#csvDropZone');
    const fileInput = container.querySelector('#csvFileInput');
    const previewEl = container.querySelector('#csv-preview');
    const actionsEl = container.querySelector('#import-actions');
    const resultsEl = container.querySelector('#import-results');
    const btnImport = container.querySelector('#btnImport');
    if (!dropZone) return;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) processFile(fileInput.files[0]); });

    btnImport?.addEventListener('click', async () => {
        if (!parsedRows?.length) return;
        btnImport.disabled  = true;
        btnImport.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Import en cours…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btnImport });
        const results = await safeCall(() => importStagiaires(parsedRows), 'import CSV');
        if (results && resultsEl) {
            resultsEl.style.display = 'block';
            renderImportResults(resultsEl, results);
            if (actionsEl) actionsEl.style.display = 'none';
        }
        btnImport.disabled  = false;
        btnImport.innerHTML = '<i data-lucide="users"></i> Importer les stagiaires';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btnImport });
    });

    async function processFile(file) {
        try {
            const result = await parseCSV(file);
            parsedRows = result.data;
            if (previewEl)  { previewEl.style.display  = 'block'; renderImportPreview(previewEl, parsedRows); }
            if (actionsEl)  actionsEl.style.display  = 'block';
            if (resultsEl)  resultsEl.style.display  = 'none';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: previewEl });
        } catch (err) { handleError(err, 'CSV parsing'); }
    }
}

function loading(container, msg = 'Chargement…') {
    container.innerHTML = `<div class="loading">
      <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>${msg}
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}
