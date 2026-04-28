import { db } from '../lib/supabaseClient.js';

/**
 * Sauvegarde ou remplace la soumission d'un quiz.
 * @param {object} p
 * @param {string} p.seanceId
 * @param {string} p.blockId   - identifiant stable du bloc quiz
 * @param {string} p.stagiaireId
 * @param {Array}  p.answers   - [{question_id, answer}]
 * @param {number} p.score
 * @param {number} p.maxScore
 */
export async function saveQuizSubmission({ seanceId, blockId, stagiaireId, answers, score, maxScore }) {
    const { data, error } = await db
        .from('lms_quiz_submissions')
        .upsert({
            seance_id:    seanceId,
            block_id:     blockId,
            stagiaire_id: stagiaireId,
            answers,
            score,
            max_score:    maxScore,
            submitted_at: new Date().toISOString(),
        }, { onConflict: 'seance_id,block_id,stagiaire_id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * Récupère la soumission d'un stagiaire pour un bloc quiz.
 */
export async function getQuizSubmission({ seanceId, blockId, stagiaireId }) {
    const { data, error } = await db
        .from('lms_quiz_submissions')
        .select('*')
        .eq('seance_id',    seanceId)
        .eq('block_id',     blockId)
        .eq('stagiaire_id', stagiaireId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

/**
 * Récupère toutes les soumissions pour une séance (admin).
 */
export async function getQuizSubmissionsBySeance(seanceId) {
    const { data, error } = await db
        .from('lms_quiz_submissions')
        .select('*, lms_profiles(nom, prenom)')
        .eq('seance_id', seanceId)
        .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}
