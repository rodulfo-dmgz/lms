import { db }    from '../lib/supabaseClient.js';
import { store } from '../store.js';

export async function toggleSeanceCompletion(seanceId) {
    const { data, error } = await db.rpc('toggle_seance_progress', {
        p_profile_id: store.getUser().id,
        p_seance_id:  seanceId
    });
    if (error) throw error;
    return data;
}
