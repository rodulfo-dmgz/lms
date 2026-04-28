import { db }    from '../lib/supabaseClient.js';
import { store } from '../store.js';

export async function getModulesForStudent() {
    const profileId = store.state.viewAs?.profileId ?? store.getUser().id;
    const { data, error } = await db.rpc('get_student_courses', { p_profile_id: profileId });
    if (error) throw error;
    return data;
}
