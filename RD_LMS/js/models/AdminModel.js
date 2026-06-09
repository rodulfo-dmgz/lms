import { db }                   from '../lib/supabaseClient.js';
import { generateTempPassword } from '../utils/passwordGenerator.js';
import { store }                from '../store.js';
import { SUPABASE_URL }         from '../config.js';

// ── Stats dashboard ──────────────────────────────────────────
export async function getAdminStats() {
    const { data, error } = await db.rpc('admin_get_stats').single();
    if (error) throw error;
    return data;
}

// ── Cohortes ─────────────────────────────────────────────────
export async function getCohortes() {
    const { data, error } = await db.rpc('admin_get_cohortes');
    if (error) throw error;
    return data ?? [];
}

export async function getCohorteById(id) {
    const { data, error } = await db
        .from('lms_cohortes')
        .select('id, nom, date_debut, date_fin, pathway_id, financement_id')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function createCohorte({ nom, pathway_id, financement_id, date_debut, date_fin }) {
    const { data, error } = await db
        .from('lms_cohortes')
        .insert({ nom, pathway_id, financement_id, date_debut: date_debut || null, date_fin: date_fin || null })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateCohorte(id, { nom, date_debut, date_fin }) {
    const { data, error } = await db
        .from('lms_cohortes')
        .update({ nom, date_debut: date_debut || null, date_fin: date_fin || null })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteCohorte(id) {
    const { error } = await db.from('lms_cohortes').delete().eq('id', id);
    if (error) throw error;
}

// ── Membres d'une cohorte ────────────────────────────────────
export async function getCohorteMembers(cohorteId) {
    const { data, error } = await db.rpc('admin_get_cohorte_members', { p_cohorte_id: cohorteId });
    if (error) throw error;
    return data ?? [];
}

export async function getAvailableStagiaires(cohorteId = null) {
    const params = cohorteId ? { p_cohorte_id: cohorteId } : { p_cohorte_id: null };
    const { data, error } = await db.rpc('admin_get_available_stagiaires', params);
    if (error) throw error;
    return data ?? [];
}

export async function addMember(cohorteId, profileId) {
    const { error } = await db
        .from('lms_cohorte_membres')
        .insert({ cohorte_id: cohorteId, profile_id: profileId });
    if (error) throw error;
}

export async function removeMember(cohorteId, profileId) {
    const { error } = await db
        .from('lms_cohorte_membres')
        .delete()
        .eq('cohorte_id', cohorteId)
        .eq('profile_id', profileId);
    if (error) throw error;
}

// ── Stagiaires ───────────────────────────────────────────────
export async function getStagiaires() {
    const { data, error } = await db.rpc('admin_get_stagiaires');
    if (error) throw error;
    return data ?? [];
}

export async function getStagiaireById(id) {
    const { data, error } = await db
        .from('lms_profiles')
        .select('id, civilite, nom, prenom, date_naissance, telephone, role, first_login, created_at')
        .eq('id', id)
        .single();
    if (error) throw error;

    // Récupère la cohorte actuelle
    const { data: membre } = await db
        .from('lms_cohorte_membres')
        .select('cohorte_id, lms_cohortes(nom)')
        .eq('profile_id', id)
        .maybeSingle();

    return {
        ...data,
        cohorte_id:  membre?.cohorte_id  ?? null,
        cohorte_nom: membre?.lms_cohortes?.nom ?? null,
    };
}

export async function updateStagiaireProfile(id, updates) {
    const { data, error } = await db
        .from('lms_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function enrollStagiaire(profileId, cohorteId) {
    // Retire d'abord de l'ancienne cohorte si elle existe
    await db.from('lms_cohorte_membres').delete().eq('profile_id', profileId);
    if (!cohorteId) return;
    const { error } = await db
        .from('lms_cohorte_membres')
        .insert({ cohorte_id: cohorteId, profile_id: profileId });
    if (error) throw error;
}

export async function createStagiaire(data) {
    const tempPassword = generateTempPassword(data.prenom, data.nom);
    const { data: { session } } = await db.auth.getSession();

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            email:          data.email.trim().toLowerCase(),
            password:       tempPassword,
            nom:            data.nom.trim(),
            prenom:         data.prenom.trim(),
            civilite:       data.civilite   || null,
            date_naissance: data.date_naissance || null,
            cohorte_id:     data.cohorte_id || null,
            role:           data.role       || 'stagiaire',
            adresse:        data.adresse    || null,
            code_postal:    data.code_postal || null,
            ville:          data.ville      || null,
            telephone:      data.telephone  || null,
        }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return { ...result, mot_de_passe: result.enrolled_existing ? null : tempPassword };
}

export async function resetStagiairePassword(userId) {
    const { data: { session } } = await db.auth.getSession();

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'reset_password', user_id: userId }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

// ── Référentiel ──────────────────────────────────────────────
export async function getTitresPro() {
    const { data, error } = await db
        .from('lms_titres_pro')
        .select('id, sigle, intitule, niveau')
        .order('intitule');
    if (error) throw error;
    return data ?? [];
}

export async function getTitresProFull() {
    const { data, error } = await db
        .from('lms_titres_pro')
        .select('id, code_rncp, sigle, intitule, niveau, date_publication_jo, date_effet, date_previsionnelle_revision, secteur_activite, url_reac, created_at')
        .order('intitule');
    if (error) throw error;
    return data ?? [];
}

// ── Documents titre professionnel ────────────────────────────
export async function getTitreProDocuments(titreProId) {
    const { data, error } = await db
        .from('lms_tp_documents')
        .select('id, type, nom, description, storage_path, file_name, file_size, mime_type, url_public, ordre')
        .eq('titre_pro_id', titreProId)
        .eq('actif', true)
        .order('ordre')
        .order('created_at');
    if (error) throw error;
    return data ?? [];
}

export async function getAllTitreProDocuments(titreProIds) {
    if (!titreProIds.length) return {};
    const { data, error } = await db
        .from('lms_tp_documents')
        .select('id, titre_pro_id, type, nom, description, storage_path, file_name, file_size, url_public, ordre')
        .in('titre_pro_id', titreProIds)
        .eq('actif', true)
        .order('ordre');
    if (error) throw error;
    // Regroup by titre_pro_id
    const map = {};
    for (const d of data ?? []) {
        if (!map[d.titre_pro_id]) map[d.titre_pro_id] = [];
        map[d.titre_pro_id].push(d);
    }
    return map;
}

// Déduit le type de document depuis le chemin de stockage
function inferDocType(path) {
    const lower = path.toLowerCase();
    if (lower.includes('/reac/')    || lower.includes('_reac_') || lower.startsWith('reac')) return 'reac';
    if (lower.includes('/referentiel/') || lower.includes('referentiel'))                   return 'referentiel';
    if (lower.includes('/dp_modele/') || lower.includes('dp_modele') || lower.includes('dossier_pro')) return 'dp_modele';
    if (lower.includes('/grille_ecf/') || lower.includes('grille_ecf') || lower.includes('grille')) return 'grille_ecf';
    if (lower.includes('/annexe/') || lower.includes('annexe'))                             return 'annexe';
    return 'autre';
}

// Déduit le type depuis le NOM du fichier (sans le chemin)
function inferDocTypeFromName(name) {
    return inferDocType(name.toLowerCase());
}

/**
 * Scanne le dossier `{sigle}/` du bucket `titre_pro` et enregistre en DB
 * tous les fichiers qui n'ont pas encore de record dans `lms_tp_documents`.
 * Retourne { added: number, skipped: number, errors: string[] }
 */
export async function syncTitreProDocumentsFromStorage(titre) {
    const sigle  = titre.sigle || titre.code_rncp;
    const result = { added: 0, skipped: 0, errors: [] };

    // Lister les fichiers et sous-dossiers au premier niveau
    const folders = ['', 'reac', 'referentiel', 'dp_modele', 'grille_ecf', 'annexe', 'autre'];
    const allFiles = [];

    for (const folder of folders) {
        const prefix = folder ? `${sigle}/${folder}` : sigle;
        const { data: items, error } = await db.storage
            .from('titre_pro')
            .list(prefix, { limit: 200, offset: 0 });
        if (error) continue;
        for (const item of (items || [])) {
            if (item.id === null) continue; // c'est un sous-dossier
            const path = folder ? `${sigle}/${folder}/${item.name}` : `${sigle}/${item.name}`;
            allFiles.push({ name: item.name, path, folder, metadata: item.metadata });
        }
    }

    if (!allFiles.length) return result;

    // Récupérer les chemins déjà enregistrés
    const { data: existing } = await db
        .from('lms_tp_documents')
        .select('storage_path')
        .eq('titre_pro_id', titre.id);
    const existingPaths = new Set((existing || []).map(d => d.storage_path));

    // Insérer les fichiers manquants
    for (const f of allFiles) {
        if (existingPaths.has(f.path)) { result.skipped++; continue; }

        const type = f.folder ? inferDocType(f.folder) : inferDocTypeFromName(f.name);
        const nom  = f.name
            .replace(/^\d+_/, '')         // enlever le timestamp préfixe éventuel
            .replace(/\.[^.]+$/, '')      // enlever l'extension
            .replace(/[_-]/g, ' ')        // _ et - → espaces
            .trim();

        const { data: urlData } = db.storage.from('titre_pro').getPublicUrl(f.path);
        const url_public = urlData?.publicUrl || null;

        const { error: insErr } = await db.from('lms_tp_documents').insert({
            titre_pro_id: titre.id,
            type,
            nom:          nom || f.name,
            storage_path: f.path,
            file_name:    f.name,
            file_size:    f.metadata?.size || null,
            mime_type:    f.metadata?.mimetype || 'application/pdf',
            url_public,
        });

        if (insErr) { result.errors.push(`${f.name} : ${insErr.message}`); }
        else        { result.added++; }
    }

    return result;
}

export async function uploadTitreProDocument(titre, file, { type, nom, description }) {
    const sigle     = titre.sigle || titre.code_rncp;
    const ext       = file.name.split('.').pop();
    const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path      = `${sigle}/${type}/${Date.now()}_${safeName}`;

    // 1. Upload dans le bucket
    const { data: uploadData, error: uploadError } = await db.storage
        .from('titre_pro')
        .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    // 2. Obtenir l'URL publique permanente (bucket public)
    const { data: urlData } = db.storage
        .from('titre_pro')
        .getPublicUrl(path);
    const url_public = urlData?.publicUrl || null;

    // 3. Sauvegarder les métadonnées
    const { data: doc, error: docError } = await db
        .from('lms_tp_documents')
        .insert({
            titre_pro_id: titre.id,
            type,
            nom,
            description: description || null,
            storage_path: path,
            file_name:    file.name,
            file_size:    file.size,
            mime_type:    file.type || 'application/pdf',
            url_public,
        })
        .select()
        .single();
    if (docError) throw docError;
    return { ...doc, url_public };
}

export async function deleteTitreProDocument(docId, storagePath) {
    // Supprimer du storage
    if (storagePath) {
        await db.storage.from('titre_pro').remove([storagePath]);
    }
    // Supprimer les métadonnées
    const { error } = await db.from('lms_tp_documents').delete().eq('id', docId);
    if (error) throw error;
}

export async function createTitrePro(fields) {
    const { data, error } = await db
        .from('lms_titres_pro')
        .insert(sanitizeTitrePro(fields))
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateTitrePro(id, fields) {
    const { data, error } = await db
        .from('lms_titres_pro')
        .update(sanitizeTitrePro(fields))
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteTitrePro(id) {
    const { error } = await db.from('lms_titres_pro').delete().eq('id', id);
    if (error) throw error;
}

function sanitizeTitrePro(f) {
    return {
        code_rncp:                    f.code_rncp?.trim() || undefined,
        sigle:                        f.sigle?.trim()     || null,
        intitule:                     f.intitule?.trim()  || undefined,
        niveau:                       f.niveau ? parseInt(f.niveau, 10) : null,
        date_publication_jo:          f.date_publication_jo          || null,
        date_effet:                   f.date_effet                   || null,
        date_previsionnelle_revision: f.date_previsionnelle_revision  || null,
        secteur_activite:             f.secteur_activite?.trim()     || null,
        url_reac:                     f.url_reac?.trim()             || null,
    };
}

export async function getPathways() {
    const { data, error } = await db.rpc('admin_get_pathways');
    if (error) throw error;
    return data ?? [];
}

export async function getFinancements() {
    const { data, error } = await db
        .from('lms_financements')
        .select('id, nom, type_financement, financeur')
        .eq('actif', true)
        .order('nom');
    if (error) throw error;
    return data ?? [];
}

// ── Import CSV ───────────────────────────────────────────────
export async function importStagiaires(rows) {
    const results = { success: [], errors: [] };
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            if (!row.email || !row.nom || !row.prenom) throw new Error('Colonnes email, nom et prenom obligatoires');
            const result = await createStagiaire({
                email:          row.email,
                nom:            row.nom,
                prenom:         row.prenom,
                civilite:       row.civilite    || null,
                date_naissance: parseDate(row.date_naissance),
                cohorte_id:     row.cohorte_id  || null,
                adresse:        row.adresse     || null,
                code_postal:    row.code_postal || null,
                ville:          row.ville       || null,
                telephone:      row.telephone   || null,
            });
            results.success.push({
                ligne:            i + 2,
                email:            row.email,
                prenom:           row.prenom,
                nom:              row.nom,
                mot_de_passe:     result.mot_de_passe,
                enrolled_existing: result.enrolled_existing,
            });
        } catch (err) {
            results.errors.push({ ligne: i + 2, email: row.email || '?', message: err.message });
        }
    }
    try {
        await db.rpc('admin_prepare_import_log', {
            p_admin_id:    store.getUser()?.id,
            p_type_import: 'stagiaires',
            p_nb_lignes:   rows.length,
            p_nb_succes:   results.success.length,
            p_nb_erreurs:  results.errors.length,
            p_details:     results.errors.length ? JSON.stringify(results.errors) : null,
        });
    } catch (_) { /* traçabilité non bloquante */ }
    return results;
}

export async function getAllProfiles() {
    const { data, error } = await db
        .from('lms_profiles')
        .select('id, civilite, nom, prenom, role, created_at')
        .order('nom');
    if (error) throw error;
    return data;
}

function parseDate(str) {
    if (!str) return null;
    if (str.includes('/')) {
        const [d, m, y] = str.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Rejeter les séries Excel ou formats non reconnus
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
    return str;
}

// ── Titre pro par ID ─────────────────────────────────────────
export async function getTitreProById(id) {
    const { data, error } = await db
        .from('lms_titres_pro')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

// ── Référentiel AT / CP ──────────────────────────────────────
// Structure : lms_titres_pro → lms_certificats_ccp → lms_activites → lms_competences
export async function getTitreProReferentiel(titreProId) {
    const { data, error } = await db
        .from('lms_certificats_ccp')
        .select(`
            id, code, intitule, ordre,
            lms_activites (
                id, intitule, description, ordre,
                lms_competences (
                    id, intitule, description_processus, criteres_performance, ordre
                )
            )
        `)
        .eq('titre_pro_id', titreProId)
        .order('ordre')
        .order('ordre', { referencedTable: 'lms_activites' })
        .order('ordre', { referencedTable: 'lms_activites.lms_competences' });
    if (error) throw error;
    return data ?? [];
}

// ── Référentiel à plat AT → CP (pour l'admin UI) ─────────────
// AT = lms_certificats_ccp ; CP = lms_competences via auto-activite
// Retourne : [{ id, code, intitule, ordre, competences: [...] }]
export async function getTitreProReferentielFlat(titreProId) {
    const raw = await getTitreProReferentiel(titreProId);
    return raw.map(ccp => ({
        id:          ccp.id,
        code:        ccp.code,
        intitule:    ccp.intitule,
        ordre:       ccp.ordre,
        competences: (ccp.lms_activites || [])
            .sort((a, b) => a.ordre - b.ordre)
            .flatMap(at => (at.lms_competences || []).sort((a, b) => a.ordre - b.ordre)),
    }));
}

// Crée ou récupère l'activite "par défaut" d'un CCP (même intitulé, transparent pour l'UI)
async function getOrCreateAutoActivite(ccpId) {
    const { data: existing } = await db
        .from('lms_activites')
        .select('id')
        .eq('ccp_id', ccpId)
        .limit(1)
        .maybeSingle();
    if (existing) return existing.id;
    // Récupérer l'intitulé du CCP pour nommer l'activite
    const { data: ccp } = await db
        .from('lms_certificats_ccp')
        .select('intitule')
        .eq('id', ccpId)
        .single();
    const newAt = await createActivite(ccpId, { intitule: ccp?.intitule || 'Activité', ordre: 0 });
    return newAt.id;
}

// Ajoute une CP à un AT (CCP id fourni, activite auto-créée si besoin)
export async function addCPtoAT(ccpId, cpData) {
    const activiteId = await getOrCreateAutoActivite(ccpId);
    return createCompetence(activiteId, cpData);
}

// Met à jour une CP (pas besoin de connaître l'activite)
export async function updateCPinAT(cpId, fields) {
    return updateCompetence(cpId, fields);
}

// ── CRUD CCP ─────────────────────────────────────────────────
export async function createCCP(titreProId, { code, intitule, ordre = 0 }) {
    const { data, error } = await db
        .from('lms_certificats_ccp')
        .insert({ titre_pro_id: titreProId, code: code?.trim(), intitule: intitule?.trim(), ordre })
        .select().single();
    if (error) throw error;
    return data;
}
export async function updateCCP(id, { code, intitule, ordre }) {
    const patch = {};
    if (code     !== undefined) patch.code     = code?.trim();
    if (intitule !== undefined) patch.intitule = intitule?.trim();
    if (ordre    !== undefined) patch.ordre    = ordre;
    const { data, error } = await db.from('lms_certificats_ccp').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
}
export async function deleteCCP(id) {
    const { error } = await db.from('lms_certificats_ccp').delete().eq('id', id);
    if (error) throw error;
}

// ── CRUD Activités (AT) ──────────────────────────────────────
export async function createActivite(ccpId, { intitule, description = null, ordre = 0 }) {
    const { data, error } = await db
        .from('lms_activites')
        .insert({ ccp_id: ccpId, intitule: intitule?.trim(), description: description || null, ordre })
        .select().single();
    if (error) throw error;
    return data;
}
export async function updateActivite(id, fields) {
    const patch = {};
    if (fields.intitule    !== undefined) patch.intitule    = fields.intitule?.trim();
    if (fields.description !== undefined) patch.description = fields.description || null;
    if (fields.ordre       !== undefined) patch.ordre       = fields.ordre;
    const { data, error } = await db.from('lms_activites').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
}
export async function deleteActivite(id) {
    const { error } = await db.from('lms_activites').delete().eq('id', id);
    if (error) throw error;
}

// ── CRUD Compétences (CP) ────────────────────────────────────
export async function createCompetence(activiteId, { intitule, description_processus = null, criteres_performance = [], ordre = 0 }) {
    const { data, error } = await db
        .from('lms_competences')
        .insert({ activite_id: activiteId, intitule: intitule?.trim(), description_processus: description_processus || null, criteres_performance: criteres_performance || [], ordre })
        .select().single();
    if (error) throw error;
    return data;
}
export async function updateCompetence(id, fields) {
    const { data, error } = await db.from('lms_competences').update({
        intitule:             fields.intitule?.trim(),
        description_processus: fields.description_processus || null,
        criteres_performance: fields.criteres_performance   || [],
        ordre:                fields.ordre ?? undefined,
    }).eq('id', id).select().single();
    if (error) throw error;
    return data;
}
export async function deleteCompetence(id) {
    const { error } = await db.from('lms_competences').delete().eq('id', id);
    if (error) throw error;
}

// ── Import CSV Référentiel ────────────────────────────────────
// Colonnes obligatoires : code_ccp, intitule_ccp, intitule_at, intitule_cp
// Colonnes optionnelles : ordre_ccp, ordre_at, description_cp, ordre_cp, criteres_cp
// criteres_cp : valeurs séparées par | (ex: "Critère 1|Critère 2")
export async function importReferentielCSV(titreProId, rows) {
    const results = { success: 0, errors: [] };

    // Caches pour éviter des requêtes redondantes dans le batch
    const ccpMap = {};   // code_ccp → id
    const atMap  = {};   // `${ccp_id}::${intitule_at}` → id (cohérent avec la requête DB)
    const cpSeen = new Set(); // `${at_id}::${intitule_cp}` → déduplique les CP dans le batch

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            const ccpCode  = (row.code_ccp      || '').trim();
            const ccpIntit = (row.intitule_ccp   || '').trim();
            const ccpOrdre = parseInt(row.ordre_ccp   || '0', 10);
            const atIntit  = (row.intitule_at    || '').trim();
            const atOrdre  = parseInt(row.ordre_at    || '0', 10);
            const cpIntit  = (row.intitule_cp    || '').trim();
            const cpDesc   = (row.description_cp || '').trim();
            const cpOrdre  = parseInt(row.ordre_cp    || '0', 10);
            // criteres_cp : "Critère A|Critère B" → ['Critère A', 'Critère B']
            const cpCriteres = (row.criteres_cp || '')
                .split('|').map(s => s.trim()).filter(Boolean);

            if (!ccpCode || !ccpIntit) throw new Error('code_ccp et intitule_ccp obligatoires');
            if (!atIntit)              throw new Error('intitule_at obligatoire');
            if (!cpIntit)              throw new Error('intitule_cp obligatoire');

            // ── CCP : upsert par (titre_pro_id, code) ──
            if (!ccpMap[ccpCode]) {
                const { data: existing } = await db
                    .from('lms_certificats_ccp')
                    .select('id')
                    .eq('titre_pro_id', titreProId)
                    .eq('code', ccpCode)
                    .maybeSingle();
                ccpMap[ccpCode] = existing
                    ? existing.id
                    : (await createCCP(titreProId, { code: ccpCode, intitule: ccpIntit, ordre: ccpOrdre })).id;
            }
            const ccpId = ccpMap[ccpCode];

            // ── AT : upsert par (ccp_id, intitule) ──
            // Clé de cache cohérente avec la requête DB (pas d'ordre dans la clé)
            const atKey = `${ccpId}::${atIntit}`;
            if (!atMap[atKey]) {
                const { data: existing } = await db
                    .from('lms_activites')
                    .select('id')
                    .eq('ccp_id', ccpId)
                    .eq('intitule', atIntit)
                    .maybeSingle();
                atMap[atKey] = existing
                    ? existing.id
                    : (await createActivite(ccpId, { intitule: atIntit, ordre: atOrdre })).id;
            }
            const atId = atMap[atKey];

            // ── CP : upsert par (activite_id, intitule) — évite les doublons ──
            const cpKey = `${atId}::${cpIntit}`;
            if (!cpSeen.has(cpKey)) {
                const { data: existingCp } = await db
                    .from('lms_competences')
                    .select('id')
                    .eq('activite_id', atId)
                    .eq('intitule', cpIntit)
                    .maybeSingle();
                if (!existingCp) {
                    await createCompetence(atId, {
                        intitule:             cpIntit,
                        description_processus: cpDesc || null,
                        criteres_performance:  cpCriteres,
                        ordre:                cpOrdre,
                    });
                }
                cpSeen.add(cpKey);
            }
            results.success++;
        } catch (err) {
            results.errors.push({ ligne: i + 2, message: err.message });
        }
    }
    return results;
}
