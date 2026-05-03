import { db } from '../lib/supabaseClient.js';

// ── Parcours ─────────────────────────────────────────────────
export async function getPathways() {
    const { data, error } = await db.rpc('admin_get_pathways');
    if (error) throw error;
    return data ?? [];
}

export async function getPathwayConfigs(pathwayId) {
    const { data, error } = await db.rpc('admin_get_pathway_configs', { p_pathway_id: pathwayId });
    if (error) throw error;
    return data ?? [];
}

export async function getPathwayTree(configId) {
    const { data, error } = await db.rpc('admin_get_pathway_tree', { p_config_id: configId });
    if (error) throw error;
    return data ?? [];
}

// ── Modules (lms_cours) ──────────────────────────────────────

/**
 * Récupère les champs étendus de plusieurs cours en une seule requête.
 * Utilisé pour enrichir le tree avec image_url / est_transversal (champs absents du RPC).
 * @param {string[]} ids — tableau de cours_id
 * @returns {Promise<Array<{id, image_url, est_transversal, duree_heures}>>}
 */
export async function getCoursExtendedFields(ids) {
    if (!ids?.length) return [];
    const { data, error } = await db
        .from('lms_cours')
        .select('id, image_url, est_transversal, duree_heures')
        .in('id', ids);
    if (error) throw error;
    return data ?? [];
}

export async function createCoursInConfig(configId, { titre, description, objectif, duree_heures, obligatoire }) {
    const { data, error } = await db.rpc('admin_create_cours_in_config', {
        p_config_id:    configId,
        p_titre:        titre,
        p_description:  description || null,
        p_objectif:     objectif    || null,
        p_duree_heures: duree_heures || 0,
        p_obligatoire:  obligatoire ?? true,
    });
    if (error) throw error;
    return data;
}

export async function updateCours(id, { titre, description, objectif, image_url, duree_heures, est_transversal }) {
    // NOTE : 'obligatoire' n'est PAS dans lms_cours — il appartient à lms_config_cours.
    // Colonnes disponibles : titre, description, objectif_pedagogique, duree_heures,
    //                        image_url, est_transversal
    const payload = {
        titre,
        description:          description || null,
        objectif_pedagogique: objectif    || null,
    };
    if (image_url       !== undefined) payload.image_url       = image_url       || null;
    if (duree_heures    !== undefined) payload.duree_heures    = Math.round(duree_heures); // integer en DB
    if (est_transversal !== undefined) payload.est_transversal = est_transversal;

    const { error } = await db
        .from('lms_cours')
        .update(payload)
        .eq('id', id);
    if (error) throw error;
}

export async function deleteCoursFromConfig(configCoursId) {
    // Only removes from config, does not delete the course itself
    const { error } = await db.from('lms_config_cours').delete().eq('id', configCoursId);
    if (error) throw error;
}

export async function reorderConfigCours(items) {
    // items: [{configCoursId, ordre}]
    const ids    = items.map(i => i.configCoursId);
    const ordres = items.map(i => i.ordre);
    const { error } = await db.rpc('admin_reorder_config_cours', {
        p_config_cours_ids: ids,
        p_ordres:           ordres,
    });
    if (error) throw error;
}

// ── Séquences ────────────────────────────────────────────────
export async function createSequence(coursId, { titre, objectif, image_url }) {
    const { data: existing } = await db
        .from('lms_sequences')
        .select('ordre')
        .eq('cours_id', coursId)
        .order('ordre', { ascending: false })
        .limit(1);
    const nextOrdre = ((existing?.[0]?.ordre) ?? -1) + 1;

    const { data, error } = await db
        .from('lms_sequences')
        .insert({
            cours_id:  coursId,
            titre,
            objectif:  objectif   || null,
            image_url: image_url  || null,
            ordre:     nextOrdre,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateSequence(id, { titre, objectif, image_url }) {
    const payload = { titre, objectif: objectif || null };
    if (image_url !== undefined) payload.image_url = image_url || null;
    const { error } = await db
        .from('lms_sequences')
        .update(payload)
        .eq('id', id);
    if (error) throw error;
}

/**
 * Récupère image_url de plusieurs séquences en une seule requête.
 * @param {string[]} ids
 */
export async function getSequenceExtendedFields(ids) {
    if (!ids?.length) return [];
    const { data, error } = await db
        .from('lms_sequences')
        .select('id, image_url')
        .in('id', ids);
    if (error) throw error;
    return data ?? [];
}

export async function deleteSequence(id) {
    const { error } = await db.from('lms_sequences').delete().eq('id', id);
    if (error) throw error;
}

export async function reorderSequences(items) {
    const { error } = await db.rpc('admin_reorder_sequences', {
        p_sequence_ids: items.map(i => i.id),
        p_ordres:       items.map(i => i.ordre),
    });
    if (error) throw error;
}

// ── Séances ──────────────────────────────────────────────────
export async function createSeance(sequenceId, { titre, type, duree_heures, image_url }) {
    const { data: existing } = await db
        .from('lms_seances')
        .select('ordre')
        .eq('sequence_id', sequenceId)
        .order('ordre', { ascending: false })
        .limit(1);
    const nextOrdre = ((existing?.[0]?.ordre) ?? -1) + 1;

    const { data, error } = await db
        .from('lms_seances')
        .insert({
            sequence_id:  sequenceId,
            titre,
            type:         type        || 'cours',
            duree_heures: duree_heures ?? 3.5,
            image_url:    image_url   || null,
            ordre:        nextOrdre,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateSeance(id, { titre, type, duree_heures, image_url }) {
    const payload = { titre, type: type || null, duree_heures: duree_heures ?? null };
    if (image_url !== undefined) payload.image_url = image_url || null;
    const { error } = await db
        .from('lms_seances')
        .update(payload)
        .eq('id', id);
    if (error) throw error;
}

/**
 * Récupère image_url de plusieurs séances en une seule requête.
 * @param {string[]} ids
 */
export async function getSeanceExtendedFields(ids) {
    if (!ids?.length) return [];
    const { data, error } = await db
        .from('lms_seances')
        .select('id, image_url')
        .in('id', ids);
    if (error) throw error;
    return data ?? [];
}

export async function deleteSeance(id) {
    const { error } = await db.from('lms_seances').delete().eq('id', id);
    if (error) throw error;
}

export async function reorderSeances(items) {
    const { error } = await db.rpc('admin_reorder_seances', {
        p_seance_ids: items.map(i => i.id),
        p_ordres:     items.map(i => i.ordre),
    });
    if (error) throw error;
}

// ── Création d'un nouveau parcours ──────────────────────────
/**
 * Crée un nouveau parcours + sa config initiale.
 * Appelle la RPC admin_create_pathway (SECURITY DEFINER).
 * @returns {{ pathway_id: string, config_id: string }}
 */
export async function createPathway({ titre, description, titre_pro_id, financement_id }) {
    const { data, error } = await db.rpc('admin_create_pathway', {
        p_titre:          titre,
        p_description:    description    || null,
        p_titre_pro_id:   titre_pro_id   || null,
        p_financement_id: financement_id || null,
    });
    if (error) throw error;
    return data; // { pathway_id, config_id }
}

/**
 * Ajoute une configuration (financement) à un parcours existant.
 * @returns {{ config_id: string }}
 */
export async function addPathwayConfig(pathwayId, financementId) {
    const { data, error } = await db.rpc('admin_add_pathway_config', {
        p_pathway_id:     pathwayId,
        p_financement_id: financementId || null,
    });
    if (error) throw error;
    return data; // { config_id }
}

// ── Liste de tous les modules pour la modale de clonage ──────
export async function getAllModulesForClone() {
    const { data, error } = await db.rpc('admin_get_all_modules_for_clone');
    if (error) throw error;
    return data ?? [];
}

// ── Cloner un module (cours + séquences + séances) ───────────
/**
 * Copie complète d'un cours existant vers une config de destination.
 * @param {string} sourceCoursId — UUID du cours source
 * @param {string} destConfigId  — UUID de la config de destination
 * @returns {string} UUID du nouveau cours créé
 */
export async function cloneCoursToConfig(sourceCoursId, destConfigId) {
    const { data, error } = await db.rpc('admin_clone_cours', {
        p_source_cours_id: sourceCoursId,
        p_dest_config_id:  destConfigId,
    });
    if (error) throw error;
    return data;
}

// ── Modèles & instances ──────────────────────────────────────
export async function toggleTemplate(pathwayId) {
    const { data, error } = await db.rpc('admin_toggle_template', { p_pathway_id: pathwayId });
    if (error) throw error;
    return data; // boolean : nouvelle valeur de is_template
}

export async function instantiateTemplate(templateId, cohorteId) {
    const { data, error } = await db.rpc('admin_instantiate_template', {
        p_template_id: templateId,
        p_cohorte_id:  cohorteId,
    });
    if (error) throw error;
    return data; // UUID du nouveau pathway créé
}

// ── Cloner séquence / séance ─────────────────────────────────
/**
 * Clone une séquence (+ toutes ses séances) vers un module de destination.
 * @param {string} sourceSeqId  — UUID de la séquence source
 * @param {string} destCoursId  — UUID du module (lms_cours) de destination
 * @returns {string} UUID de la nouvelle séquence
 */
export async function cloneSequenceToModule(sourceSeqId, destCoursId) {
    const { data, error } = await db.rpc('admin_clone_sequence', {
        p_source_seq_id: sourceSeqId,
        p_dest_cours_id: destCoursId,
    });
    if (error) throw error;
    return data;
}

/**
 * Clone une séance vers une séquence de destination.
 * @param {string} sourceSeanceId — UUID de la séance source
 * @param {string} destSeqId      — UUID de la séquence de destination
 * @returns {string} UUID de la nouvelle séance
 */
export async function cloneSeanceToSequence(sourceSeanceId, destSeqId) {
    const { data, error } = await db.rpc('admin_clone_seance', {
        p_source_seance_id: sourceSeanceId,
        p_dest_seq_id:      destSeqId,
    });
    if (error) throw error;
    return data;
}

// ── Contenu séance (éditeur Sprint 3) ───────────────────────
export async function getSeanceForEditor(id) {
    const { data, error } = await db
        .from('lms_seances')
        .select('id, titre, type, duree_heures, contenu, contenu_blocks')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function saveSeanceContent(seanceId, html, blocks) {
    const { error } = await db.rpc('admin_save_seance_content', {
        p_seance_id: seanceId,
        p_contenu:   html,
        p_blocks:    blocks,
    });
    if (error) throw error;
}

export async function saveDraftBlocks(seanceId, blocks) {
    const { error } = await db.rpc('admin_save_seance_draft', {
        p_seance_id: seanceId,
        p_blocks:    blocks,
    });
    if (error) throw error;
}
