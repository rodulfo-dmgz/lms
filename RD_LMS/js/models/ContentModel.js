import { db } from '../lib/supabaseClient.js';

// ── Parcours ─────────────────────────────────────────────────
export async function getPathways() {
    const { data, error } = await db.rpc('admin_get_pathways');
    if (error) throw error;
    return data ?? [];
}

export async function updateFormation(id, { titre, description, titre_pro_id, prerequis, objectifs }) {
    const { error } = await db.rpc('admin_update_formation', {
        p_formation_id: id,
        p_titre:        titre,
        p_description:  description  || null,
        p_titre_pro_id: titre_pro_id || null,
        p_prerequis:    prerequis    || null,
        p_objectifs:    objectifs    || null,
    });
    if (error) throw error;
}

// ── Publics cibles ───────────────────────────────────────────
export async function getPublicsCibles() {
    const { data, error } = await db.rpc('admin_get_publics_cibles');
    if (error) throw error;
    return data ?? [];
}

export async function createPublicCible(nom) {
    const { data, error } = await db.rpc('admin_create_public_cible', { p_nom: nom });
    if (error) throw error;
    return data; // uuid
}

export async function setFormationPublics(formationId, publicIds) {
    const { error } = await db.rpc('admin_set_formation_publics', {
        p_formation_id: formationId,
        p_public_ids:   publicIds,
    });
    if (error) throw error;
}

export async function getFormationPublicIds(formationId) {
    const { data, error } = await db
        .from('lms_formation_publics')
        .select('public_id')
        .eq('formation_id', formationId);
    if (error) throw error;
    return (data || []).map(r => r.public_id);
}

export async function getFormationTree(formationId) {
    const { data, error } = await db.rpc('admin_get_formation_tree', { p_formation_id: formationId });
    if (error) throw error;
    return data ?? [];
}

// ── Modules (lms_modules) ─────────────────────────────────────

/**
 * Récupère les champs étendus de plusieurs cours en une seule requête.
 * Utilisé pour enrichir le tree avec image_url / est_transversal (champs absents du RPC).
 * @param {string[]} ids — tableau de cours_id
 * @returns {Promise<Array<{id, image_url, est_transversal, duree_heures}>>}
 */
export async function getCoursExtendedFields(ids) {
    if (!ids?.length) return [];
    const { data, error } = await db
        .from('lms_modules')
        .select('id, image_url, est_transversal, duree_heures')
        .in('id', ids);
    if (error) throw error;
    return data ?? [];
}

export async function createModuleInFormation(formationId, { titre, description, objectif, duree_heures, obligatoire }) {
    const { data, error } = await db.rpc('admin_create_module_in_formation', {
        p_formation_id: formationId,
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
    // NOTE : 'obligatoire' existe sur lms_modules mais n'est pas éditable depuis ce formulaire.
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
        .from('lms_modules')
        .update(payload)
        .eq('id', id);
    if (error) throw error;
}

export async function deleteModule(id) {
    // Suppression réelle — archivée automatiquement par le trigger BEFORE DELETE
    const { error } = await db.from('lms_modules').delete().eq('id', id);
    if (error) throw error;
}

export async function reorderModules(items) {
    // items: [{id, ordre}]
    const { error } = await db.rpc('admin_reorder_modules', {
        p_module_ids: items.map(i => i.id),
        p_ordres:     items.map(i => i.ordre),
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
 * Crée une nouvelle formation. Le financement (optionnel) est enregistré
 * comme allocation, plus comme "config" séparée.
 * @returns {{ pathway_id: string }}
 */
export async function createPathway({ titre, description, titre_pro_id, financement_id }) {
    const { data, error } = await db.rpc('admin_create_pathway', {
        p_titre:          titre,
        p_description:    description    || null,
        p_titre_pro_id:   titre_pro_id   || null,
        p_financement_id: financement_id || null,
    });
    if (error) throw error;
    return data; // { pathway_id }
}

/**
 * Ajoute un financement (allocation) à une formation existante.
 * @returns {{ allocation_id: string }}
 */
export async function addFormationFinancement(formationId, financementId) {
    const { data, error } = await db.rpc('admin_add_pathway_config', {
        p_pathway_id:     formationId,
        p_financement_id: financementId || null,
    });
    if (error) throw error;
    return data; // { allocation_id }
}

// ── Liste de tous les modules pour la modale de clonage ──────
export async function getAllModulesForClone() {
    const { data, error } = await db.rpc('admin_get_all_modules_for_clone');
    if (error) throw error;
    return data ?? [];
}

// ── Cloner un module (cours + séquences + séances) ───────────
/**
 * Copie complète d'un cours existant vers une formation de destination.
 * @param {string} sourceCoursId    — UUID du cours source
 * @param {string} destFormationId  — UUID de la formation de destination
 * @returns {string} UUID du nouveau cours créé
 */
export async function cloneCoursToFormation(sourceCoursId, destFormationId) {
    const { data, error } = await db.rpc('admin_clone_cours', {
        p_source_cours_id:    sourceCoursId,
        p_dest_formation_id:  destFormationId,
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
 * @param {string} destCoursId  — UUID du module (lms_modules) de destination
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
