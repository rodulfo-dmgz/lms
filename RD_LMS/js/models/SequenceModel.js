import { db } from '../lib/supabaseClient.js';

export async function getSequences(coursId) {
    const { data, error } = await db
        .from('lms_sequences')
        .select('id, titre, objectif, image_url, ordre')
        .eq('cours_id', coursId)
        .order('ordre');
    if (error) throw error;
    return data;
}

export async function getSequence(sequenceId) {
    const { data, error } = await db
        .from('lms_sequences')
        .select('id, titre, objectif, ordre')
        .eq('id', sequenceId)
        .single();
    if (error) throw error;
    return data;
}

export async function getCours(coursId) {
    const { data, error } = await db
        .from('lms_cours')
        .select('id, titre, description, duree_heures, objectif_pedagogique, image_url')
        .eq('id', coursId)
        .single();
    if (error) throw error;
    return data;
}
