import { db } from '../lib/supabaseClient.js';

export async function getProgressSummary(profileId) {
    const { data, error } = await db.rpc('get_student_progress_summary', {
        p_profile_id: profileId
    });
    if (error) throw error;
    if (!data?.length) return data ?? [];

    // Le RPC ne retourne pas image_url — on l'enrichit depuis lms_cours
    const ids = data.map(c => c.cours_id);
    const { data: imgData } = await db
        .from('lms_cours')
        .select('id, image_url')
        .in('id', ids);

    if (imgData?.length) {
        const imgMap = Object.fromEntries(imgData.map(c => [c.id, c.image_url]));
        return data.map(c => ({ ...c, image_url: imgMap[c.cours_id] ?? null }));
    }
    return data;
}
