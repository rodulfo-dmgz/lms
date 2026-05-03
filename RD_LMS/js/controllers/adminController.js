import {
    getAdminStats, getCohortes, getCohorteById, createCohorte, updateCohorte, deleteCohorte,
    getCohorteMembers, getAvailableStagiaires, addMember, removeMember,
    getStagiaires, getStagiaireById, updateStagiaireProfile, enrollStagiaire, createStagiaire, resetStagiairePassword,
    getTitresPro, getTitresProFull, createTitrePro, updateTitrePro, deleteTitrePro,
    getAllTitreProDocuments, uploadTitreProDocument, deleteTitreProDocument, syncTitreProDocumentsFromStorage,
    getPathways, getFinancements,
    importStagiaires, getAllProfiles,
    getTitreProById, getTitreProReferentielFlat,
    createCCP, updateCCP, deleteCCP,
    deleteCompetence,
    addCPtoAT, updateCPinAT,
    importReferentielCSV,
} from '../models/AdminModel.js';
import {
    getArticles, createArticle, updateArticle, deleteArticle,
    getArticleSources, createArticleSource, updateArticleSource, deleteArticleSource,
} from '../models/ArticlesModel.js';
import {
    getProduits, getProduitById, createProduit, updateProduit, deleteProduit,
    getProduitItems, addProduitItem, removeProduitItem, getPathwayContentTree,
    getProduitsForPathway,
    getCohorteProduitsAssigned, assignProduitToCohorte, unassignProduitFromCohorte,
    getProfileProduitsAssigned, assignProduitToProfile, unassignProduitFromProfile,
} from '../models/ProduitsModel.js';
import { parseCSV }           from '../utils/csvParser.js';
import { store }              from '../store.js';
import { safeCall, handleError } from '../errorHandler.js';
import { renderAdminHome }    from '../views/admin/adminHomeView.js';
import { renderCohorteList }  from '../views/admin/cohorteListView.js';
import { renderCohorteForm }  from '../views/admin/cohorteFormView.js';
import { renderStagiaireList } from '../views/admin/stagiaireListView.js';
import { renderStagiaireForm } from '../views/admin/stagiaireFormView.js';
import { renderTitresProList, showDocumentsModal } from '../views/admin/titresProView.js';
import { renderReferentiel }                       from '../views/admin/referentielView.js';
import { renderArticlesAdmin }                    from '../views/admin/articlesAdminView.js';
import { renderInjectStagiaires } from '../views/admin/injectStagiairesView.js';
import { renderImportPreview, renderImportResults } from '../views/adminView.js';
import { renderProduitsList }       from '../views/admin/produitsListView.js';
import { renderProduitForm }        from '../views/admin/produitsFormView.js';
import { renderFinancementList }    from '../views/admin/financementListView.js';
import { renderFinancementForm }    from '../views/admin/financementFormView.js';
import {
    getAllFinancements, getFinancementById,
    createFinancement, updateFinancement, deleteFinancement,
} from '../models/FinancementModel.js';

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

    if (/^\/admin\/titres-pro\/([^/]+)\/referentiel$/.test(hash)) {
        const id = hash.match(/^\/admin\/titres-pro\/([^/]+)\/referentiel$/)[1];
        return loadReferentiel(container, id);
    }
    if (/^\/admin\/titres-pro$/.test(hash))      return loadTitresProList(container);
    if (/^\/admin\/articles$/.test(hash))        return loadArticlesAdmin(container);
    if (/^\/admin\/inject-stagiaires$/.test(hash)) return loadInjectStagiaires(container);

    if (/^\/admin\/produits\/nouveau$/.test(hash)) return loadProduitNew(container);
    if (/^\/admin\/produits\/([^/]+)$/.test(hash)) {
        const id = hash.match(/^\/admin\/produits\/([^/]+)$/)[1];
        return loadProduitEdit(container, id);
    }
    if (/^\/admin\/produits$/.test(hash)) return loadProduitList(container);

    if (/^\/admin\/financements\/nouveau$/.test(hash)) return loadFinancementNew(container);
    if (/^\/admin\/financements\/([^/]+)$/.test(hash)) {
        const id = hash.match(/^\/admin\/financements\/([^/]+)$/)[1];
        return loadFinancementEdit(container, id);
    }
    if (/^\/admin\/financements$/.test(hash)) return loadFinancementList(container);

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

    const [assignedProduits, availableProduits] = await Promise.all([
        safeCall(() => getCohorteProduitsAssigned(id),              'produits cohorte'),
        safeCall(() => getProduitsForPathway(cohorte.pathway_id),   'produits parcours'),
    ]);

    const refresh = () => loadCohorteEdit(container, id);

    renderCohorteForm(container, {
        cohorte,
        pathways:     pathways || [],
        financements: financements || [],
        members:      members || [],
        available:    available || [],
        assignedProduits:  assignedProduits  || [],
        availableProduits: availableProduits || [],
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
        onAssignProduit: async (produitId) => {
            await safeCall(() => assignProduitToCohorte(id, produitId), 'assignation produit');
            refresh();
        },
        onUnassignProduit: async (produitId) => {
            if (!confirm('Retirer ce produit de la cohorte ?')) return;
            await safeCall(() => unassignProduitFromCohorte(id, produitId), 'retrait produit');
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

    // Charger les produits assignés + tous les produits actifs (triés par parcours dans le dropdown)
    const [assignedProduits, availableProduits] = await Promise.all([
        safeCall(() => getProfileProduitsAssigned(id), 'produits stagiaire'),
        safeCall(getProduits,                          'produits disponibles'),
    ]);

    const refresh = () => loadStagiaireEdit(container, id);

    renderStagiaireForm(container, {
        stagiaire,
        cohortes:          cohortes          || [],
        assignedProduits:  assignedProduits  || [],
        availableProduits: availableProduits || [],
        onSave: async (data) => {
            await safeCall(() => updateStagiaireProfile(id, data), 'mise à jour stagiaire');
            refresh();
        },
        onCancel: () => { window.location.hash = '#/admin/stagiaires'; },
        onEnroll: async (cohorteId) => {
            await safeCall(() => enrollStagiaire(id, cohorteId), 'inscription cohorte');
            refresh();
        },
        onResetPassword: async () => {
            const result = await safeCall(() => resetStagiairePassword(id), 'réinitialisation mot de passe');
            if (result) {
                alert(`Mot de passe réinitialisé.\nNouveau mot de passe : ${result.mot_de_passe || 'firstlogin#'}`);
            }
        },
        onAssignProduit: async (produitId) => {
            await safeCall(() => assignProduitToProfile(id, produitId), 'assignation produit stagiaire');
            refresh();
        },
        onUnassignProduit: async (produitId) => {
            if (!confirm('Retirer ce produit du stagiaire ?')) return;
            await safeCall(() => unassignProduitFromProfile(id, produitId), 'retrait produit stagiaire');
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

// ── Titres professionnels ────────────────────────────────────
async function loadTitresProList(container) {
    loading(container, 'Chargement des titres professionnels…');

    const titresPro = await safeCall(getTitresProFull, 'titres_pro') || [];

    // Charger tous les documents en une requête
    const ids     = titresPro.map(t => t.id);
    const docsMap = await safeCall(() => getAllTitreProDocuments(ids), 'documents') || {};

    const refresh = () => loadTitresProList(container);

    renderTitresProList(container, {
        titresPro,
        docsMap,
        onCreate: async (data) => {
            const created = await safeCall(() => createTitrePro(data), 'création titre pro');
            if (created) refresh();
        },
        onEdit: async (id, data) => {
            const updated = await safeCall(() => updateTitrePro(id, data), 'mise à jour titre pro');
            if (updated) refresh();
        },
        onDelete: async (id) => {
            const ok = await safeCall(() => deleteTitrePro(id), 'suppression titre pro');
            if (ok !== null) refresh();
        },
        onManageDocs: (titre, docs) => {
            showDocumentsModal(titre, docs, {
                onUpload: async (t, file, meta) => {
                    const doc = await safeCall(
                        () => uploadTitreProDocument(t, file, meta),
                        'upload document'
                    );
                    return doc;
                },
                onDelete: async (docId, path) => {
                    await safeCall(() => deleteTitreProDocument(docId, path), 'suppression document');
                },
                onSync: async (t) => {
                    const result = await safeCall(
                        () => syncTitreProDocumentsFromStorage(t),
                        'synchronisation storage'
                    );
                    if (result) refresh();
                    return result;
                },
            });
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Référentiel CCP / AT / CP ────────────────────────────────
async function loadReferentiel(container, titreId) {
    loading(container, 'Chargement du référentiel…');

    const [titre, referentiel] = await Promise.all([
        safeCall(() => getTitreProById(titreId),               'titre pro'),
        safeCall(() => getTitreProReferentielFlat(titreId),    'référentiel'),
    ]);

    if (!titre) { window.location.hash = '#/admin/titres-pro'; return; }

    const refresh = () => loadReferentiel(container, titreId);

    renderReferentiel(container, {
        titre,
        referentiel: referentiel || [],

        // ── AT (= lms_certificats_ccp en base) ─────────────
        onAddAT: async (data) => {
            await safeCall(() => createCCP(titreId, data), 'création AT');
            refresh();
        },
        onEditAT: async (id, data) => {
            await safeCall(() => updateCCP(id, data), 'mise à jour AT');
            refresh();
        },
        onDeleteAT: async (id) => {
            await safeCall(() => deleteCCP(id), 'suppression AT');
            refresh();
        },

        // ── CP (= lms_competences, activite auto-créée) ─────
        onAddCP: async (ccpId, data) => {
            await safeCall(() => addCPtoAT(ccpId, data), 'création CP');
            refresh();
        },
        onEditCP: async (id, data) => {
            await safeCall(() => updateCPinAT(id, data), 'mise à jour CP');
            refresh();
        },
        onDeleteCP: async (id) => {
            await safeCall(() => deleteCompetence(id), 'suppression CP');
            refresh();
        },

        // ── Import CSV ─────────────────────────────────────
        onImportCSV: async (rows) => {
            const results = await safeCall(
                () => importReferentielCSV(titreId, rows),
                'import CSV référentiel'
            );
            if (results) refresh();
            return results;
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Injection stagiaires ─────────────────────────────────────
async function loadInjectStagiaires(container) {
    loading(container, 'Chargement…');
    const cohortes = await safeCall(getCohortes, 'cohortes') || [];

    renderInjectStagiaires(container, {
        cohortes,
        onImportRows: async (rows) => {
            return await safeCall(() => importStagiaires(rows), 'import') || { success: [], errors: [] };
        },
        onCreateOne: async (data) => {
            const result = await safeCall(() => createStagiaire(data), 'création stagiaire');
            if (!result) throw new Error('Erreur lors de la création');
            return result;
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Liste des produits ───────────────────────────────────────
async function loadProduitList(container) {
    loading(container, 'Chargement des produits…');
    const produits = await safeCall(getProduits, 'produits') || [];
    renderProduitsList(container, {
        produits,
        onEdit:   (id) => { window.location.hash = `#/admin/produits/${id}`; },
        onDelete: async (id, nom) => {
            if (!confirm(`Supprimer le produit "${nom}" ?\nLes assignations existantes seront également supprimées.`)) return;
            await safeCall(() => deleteProduit(id), 'suppression produit');
            loadProduitList(container);
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Créer un produit ─────────────────────────────────────────
async function loadProduitNew(container) {
    loading(container, 'Chargement…');
    const pathways = await safeCall(getPathways, 'pathways') || [];
    renderProduitForm(container, {
        produit:     null,
        pathways,
        items:       [],
        contentTree: [],
        onSave: async (data) => {
            const created = await safeCall(() => createProduit(data), 'création produit');
            if (created) window.location.hash = `#/admin/produits/${created.id}`;
        },
        onCancel:      () => { window.location.hash = '#/admin/produits'; },
        onAddItem:     null,
        onRemoveItem:  null,
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Éditer un produit ────────────────────────────────────────
async function loadProduitEdit(container, id) {
    loading(container, 'Chargement du produit…');
    const [produit, pathways] = await Promise.all([
        safeCall(() => getProduitById(id),    'produit'),
        safeCall(getPathways,                 'pathways'),
    ]);

    if (!produit) { window.location.hash = '#/admin/produits'; return; }

    const [items, contentTree] = await Promise.all([
        safeCall(() => getProduitItems(id),                       'items produit'),
        safeCall(() => getPathwayContentTree(produit.pathway_id), 'contenu parcours'),
    ]);

    const refresh = () => loadProduitEdit(container, id);

    renderProduitForm(container, {
        produit,
        pathways: pathways || [],
        items:       items       || [],
        contentTree: contentTree || [],
        onSave: async (data) => {
            await safeCall(() => updateProduit(id, data), 'mise à jour produit');
            refresh();
        },
        onCancel: () => { window.location.hash = '#/admin/produits'; },
        onAddItem: async ({ type, id: itemId }) => {
            await safeCall(() => addProduitItem({
                produit_id:  id,
                item_type:   type,
                cours_id:    type === 'module'   ? itemId : null,
                sequence_id: type === 'sequence' ? itemId : null,
                seance_id:   type === 'seance'   ? itemId : null,
            }), 'ajout item');
            refresh();
        },
        onRemoveItem: async (itemId) => {
            await safeCall(() => removeProduitItem(itemId), 'retrait item');
            refresh();
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Liste des financements ───────────────────────────────────
async function loadFinancementList(container) {
    loading(container, 'Chargement des financements…');
    const financements = await safeCall(getAllFinancements, 'financements') || [];
    renderFinancementList(container, {
        financements,
        onEdit:   (id) => { window.location.hash = `#/admin/financements/${id}`; },
        onDelete: async (id, nom) => {
            if (!confirm(`Supprimer le financement "${nom}" ?\nCette action est irréversible.`)) return;
            const err = await safeCall(() => deleteFinancement(id), 'suppression financement');
            if (err !== null) loadFinancementList(container);
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Créer un financement ─────────────────────────────────────
async function loadFinancementNew(container) {
    renderFinancementForm(container, {
        financement: null,
        onSave: async (data) => {
            const created = await safeCall(() => createFinancement(data), 'création financement');
            if (created) window.location.hash = `#/admin/financements/${created.id}`;
        },
        onCancel: () => { window.location.hash = '#/admin/financements'; },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Éditer un financement ────────────────────────────────────
async function loadFinancementEdit(container, id) {
    loading(container, 'Chargement du financement…');
    const financement = await safeCall(() => getFinancementById(id), 'financement');
    if (!financement) { window.location.hash = '#/admin/financements'; return; }

    renderFinancementForm(container, {
        financement,
        onSave: async (data) => {
            await safeCall(() => updateFinancement(id, data), 'mise à jour financement');
            window.location.hash = `#/admin/financements/${id}`;
            loadFinancementEdit(container, id);
        },
        onCancel: () => { window.location.hash = '#/admin/financements'; },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ── Articles & Sources RSS (Espace Zen) ──────────────────────
async function loadArticlesAdmin(container) {
    loading(container, 'Chargement des articles…');

    const [articles, sources] = await Promise.all([
        safeCall(() => getArticles({ includeInactive: true }), 'articles') || [],
        safeCall(() => getArticleSources({ includeInactive: true }), 'sources') || [],
    ]);

    const refresh = () => loadArticlesAdmin(container);

    renderArticlesAdmin(container, {
        articles: articles || [],
        sources:  sources  || [],
        onCreate: async (data) => {
            const created = await safeCall(() => createArticle(data), 'création article');
            if (created) refresh();
        },
        onEdit: async (id, data) => {
            const updated = await safeCall(() => updateArticle(id, data), 'mise à jour article');
            if (updated) refresh();
        },
        onDelete: async (id) => {
            const ok = await safeCall(() => deleteArticle(id), 'suppression article');
            if (ok !== null) refresh();
        },
        onCreateSource: async (data) => {
            const created = await safeCall(() => createArticleSource(data), 'création source');
            if (created) refresh();
        },
        onEditSource: async (id, data) => {
            const updated = await safeCall(() => updateArticleSource(id, data), 'mise à jour source');
            if (updated) refresh();
        },
        onDeleteSource: async (id) => {
            const ok = await safeCall(() => deleteArticleSource(id), 'suppression source');
            if (ok !== null) refresh();
        },
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

function loading(container, msg = 'Chargement…') {
    container.innerHTML = `<div class="loading">
      <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>${msg}
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}
