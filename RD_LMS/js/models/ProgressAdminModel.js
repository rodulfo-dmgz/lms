/**
 * ProgressAdminModel.js — Suivi de la progression des stagiaires (admin/formateur)
 */

import { db } from '../lib/supabaseClient.js';

/**
 * Résumé global de tous les stagiaires (une ligne par stagiaire).
 * Appelle la RPC admin_get_stagiaires_progress.
 */
export async function getStagiairesProgress() {
    const { data, error } = await db.rpc('admin_get_stagiaires_progress');
    if (error) throw error;
    return data ?? [];
}

/**
 * Détail d'un stagiaire :
 * - progression par cours (via get_student_progress_summary)
 * - soumissions quiz
 * - soumissions devoirs
 */
export async function getStagiaireDetail(profileId) {
    const [progressRes, quizRes, devoirRes] = await Promise.all([
        db.rpc('get_student_progress_summary', { p_profile_id: profileId }),
        db
            .from('lms_quiz_submissions')
            .select('id, seance_id, block_id, score, max_score, submitted_at, lms_seances!seance_id(titre)')
            .eq('stagiaire_id', profileId)
            .order('submitted_at', { ascending: false })
            .limit(20),
        db
            .from('lms_devoir_submissions')
            .select('id, seance_id, block_id, note, note_max, feedback, submitted_at, graded_at, lms_seances!seance_id(titre)')
            .eq('stagiaire_id', profileId)
            .order('submitted_at', { ascending: false })
            .limit(20),
    ]);

    if (progressRes.error) throw progressRes.error;

    return {
        progressByCours: progressRes.data ?? [],
        quizSubs:        quizRes.data   ?? [],
        devoirSubs:      devoirRes.data ?? [],
    };
}
