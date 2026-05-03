import { db }    from '../lib/supabaseClient.js';
import { store } from '../store.js';

/**
 * Séances d'une séquence avec progression (accès direct, sans filtre produit).
 * Conservé pour la prévisualisation admin / mode éditeur.
 */
export async function getSeancesWithProgress(sequenceId) {
    // Utilise le profil simulé (viewAs) si actif, sinon l'utilisateur connecté
    const profileId = store.getActiveProfileId();
    const { data, error } = await db
        .from('lms_seances')
        .select(`id, titre, duree_heures, type, contenu, ordre,
            lms_session_progress!left(statut, score, date_completion)`)
        .eq('sequence_id', sequenceId)
        .eq('lms_session_progress.profile_id', profileId)
        .order('ordre');
    if (error) throw error;
    return data.map(s => ({
        ...s,
        statut:          s.lms_session_progress?.[0]?.statut || 'non_commence',
        score:           s.lms_session_progress?.[0]?.score  || null,
        date_completion: s.lms_session_progress?.[0]?.date_completion || null
    }));
}

/**
 * Séances accessibles pour le profil actif (respecte les produits assignés).
 * Utilise le RPC get_student_seances — inclut statut/score/date_completion.
 */
export async function getStudentSeances(sequenceId) {
    const profileId = store.getActiveProfileId();
    const { data, error } = await db.rpc('get_student_seances', {
        p_profile_id:  profileId,
        p_sequence_id: sequenceId,
    });
    if (error) throw error;
    return (data ?? []).map(s => ({
        ...s,
        statut:          s.statut          || 'non_commence',
        score:           s.score           ?? null,
        date_completion: s.date_completion ?? null,
    }));
}
