import { db }    from '../lib/supabaseClient.js';
import { store } from '../store.js';

export async function getMesCoursDetail() {
    const userId = store.getUser().id;

    // 1. Courses via existing RPC
    const { data: courses, error: ce } = await db.rpc('get_student_courses', {
        p_profile_id: userId
    });
    if (ce) throw ce;
    if (!courses?.length) return { courses: [], seqByCours: {}, seancesBySeq: {}, progressBySeance: {} };

    const courseIds = courses.map(c => c.cours_id);

    // 2. Sequences
    const { data: sequences, error: se } = await db
        .from('lms_sequences')
        .select('id, cours_id, titre, objectif, ordre')
        .in('cours_id', courseIds)
        .order('ordre');
    if (se) throw se;

    const sequenceIds = (sequences || []).map(s => s.id);

    // 3. Séances
    let seances = [];
    if (sequenceIds.length) {
        const { data: sd, error: sce } = await db
            .from('lms_seances')
            .select('id, sequence_id, titre, type, duree_heures, ordre')
            .in('sequence_id', sequenceIds)
            .order('ordre');
        if (sce) throw sce;
        seances = sd || [];
    }

    // 4. Progress
    const { data: progress } = await db
        .from('lms_session_progress')
        .select('seance_id, statut, date_completion')
        .eq('profile_id', userId);

    // 5. Lookup maps
    const seqByCours = {};
    (sequences || []).forEach(s => {
        (seqByCours[s.cours_id] ??= []).push(s);
    });

    const seancesBySeq = {};
    seances.forEach(s => {
        (seancesBySeq[s.sequence_id] ??= []).push(s);
    });

    const progressBySeance = {};
    (progress || []).forEach(p => {
        progressBySeance[p.seance_id] = p;
    });

    return { courses, seqByCours, seancesBySeq, progressBySeance };
}
