import { db }    from '../lib/supabaseClient.js';
import { store } from '../store.js';

export async function getModulesForStudent() {
    let profileId = store.state.viewAs?.profileId;

    // viewAs cohorte sélectionnée mais pas de stagiaire précis →
    // on prend le premier membre de la cohorte comme représentant pour afficher le curriculum
    if (!profileId && store.state.viewAs?.cohorteId) {
        try {
            const { data: members } = await db.rpc('admin_get_cohorte_members', {
                p_cohorte_id: store.state.viewAs.cohorteId,
            });
            profileId = members?.[0]?.profile_id ?? null;
        } catch { /* silencieux */ }
    }

    profileId = profileId ?? store.getUser().id;
    const { data, error } = await db.rpc('get_student_courses', { p_profile_id: profileId });
    if (error) throw error;
    return data;
}
