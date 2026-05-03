/**
 * ProgressAdminModel.js — Suivi de la progression des stagiaires (admin/formateur)
 */

import { db } from '../lib/supabaseClient.js';

/**
 * Résumé global de tous les stagiaires (une ligne par stagiaire).
 */
export async function getStagiairesProgress() {
    const { data, error } = await db.rpc('admin_get_stagiaires_progress');
    if (error) throw error;
    return data ?? [];
}

/**
 * Détail d'un stagiaire :
 * - progression séance par séance (via RPC admin_get_stagiaire_seance_progress)
 * - soumissions quiz
 * - soumissions devoirs
 */
export async function getStagiaireDetail(profileId) {
    const [seanceRes, quizRes, devoirRes] = await Promise.all([
        db.rpc('admin_get_stagiaire_seance_progress', { p_profile_id: profileId }),
        db
            .from('lms_quiz_submissions')
            .select('id, seance_id, block_id, score, max_score, submitted_at, lms_seances!seance_id(titre)')
            .eq('stagiaire_id', profileId)
            .order('submitted_at', { ascending: false })
            .limit(30),
        db
            .from('lms_devoir_submissions')
            .select('id, seance_id, block_id, note, note_max, feedback, submitted_at, graded_at, lms_seances!seance_id(titre)')
            .eq('stagiaire_id', profileId)
            .order('submitted_at', { ascending: false })
            .limit(30),
    ]);

    if (seanceRes.error) throw seanceRes.error;

    // Regrouper les séances par cours → sequence
    const seanceRows  = seanceRes.data ?? [];
    const coursByIdMap = new Map();

    for (const row of seanceRows) {
        if (!coursByIdMap.has(row.cours_id)) {
            coursByIdMap.set(row.cours_id, {
                cours_id:    row.cours_id,
                cours_titre: row.cours_titre,
                cours_ordre: row.cours_ordre,
                sequences:   new Map(),
            });
        }
        const cours = coursByIdMap.get(row.cours_id);

        if (!cours.sequences.has(row.sequence_id)) {
            cours.sequences.set(row.sequence_id, {
                sequence_id:    row.sequence_id,
                sequence_titre: row.sequence_titre,
                sequence_ordre: row.sequence_ordre,
                seances:        [],
            });
        }
        cours.sequences.get(row.sequence_id).seances.push({
            seance_id:    row.seance_id,
            seance_titre: row.seance_titre,
            seance_ordre: row.seance_ordre,
            seance_type:  row.seance_type,
            statut:       row.statut,   // 'termine' | 'en_cours' | null
        });
    }

    // Convertir Maps → Arrays triés
    const coursTree = [...coursByIdMap.values()]
        .sort((a, b) => a.cours_ordre - b.cours_ordre)
        .map(c => ({
            ...c,
            sequences: [...c.sequences.values()]
                .sort((a, b) => a.sequence_ordre - b.sequence_ordre),
        }));

    return {
        coursTree,
        quizSubs:   quizRes.data   ?? [],
        devoirSubs: devoirRes.data ?? [],
    };
}
