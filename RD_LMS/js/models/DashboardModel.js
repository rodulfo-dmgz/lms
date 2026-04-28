import { db } from '../lib/supabaseClient.js';

export async function getProgressSummary(profileId) {
    const { data, error } = await db.rpc('get_student_progress_summary', {
        p_profile_id: profileId
    });
    if (error) throw error;
    return data;
}
