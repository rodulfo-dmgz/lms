import { db } from '../lib/supabaseClient.js';

export async function getProfile(userId) {
    const { data, error } = await db
        .from('lms_profiles')
        .select('id, civilite, nom, prenom, date_naissance, adresse, code_postal, ville, telephone, role, first_login, avatar_url, created_at')
        .eq('id', userId)
        .single();
    if (error) throw error;
    return data;
}

export async function updateProfile(userId, updates) {
    const { data, error } = await db
        .from('lms_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getTitrePro(profileId) {
    const { data } = await db
        .rpc('get_titre_pro_for_profile', { p_profile_id: profileId })
        .maybeSingle();
    return data ?? null;
}
