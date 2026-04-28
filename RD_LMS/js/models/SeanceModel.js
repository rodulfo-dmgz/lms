import { db }    from '../lib/supabaseClient.js';
import { store } from '../store.js';

export async function getSeancesWithProgress(sequenceId) {
    const profileId = store.getUser().id;
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
