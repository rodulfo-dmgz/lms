import { db } from '../lib/supabaseClient.js';

// Chemin de stockage : {stagiaire_id}/{seance_id}/{block_id}/{filename}
function storagePath(stagiaireId, seanceId, blockId, filename) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${stagiaireId}/${seanceId}/${blockId}/${Date.now()}_${safe}`;
}

/**
 * Upload un fichier vers le bucket "devoirs".
 * Retourne { name, url, size, type } (URL signée 1 an).
 */
export async function uploadDevoirFile(stagiaireId, seanceId, blockId, file) {
    const path = storagePath(stagiaireId, seanceId, blockId, file.name);

    const { error: upErr } = await db.storage
        .from('devoirs')
        .upload(path, file, { upsert: false });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await db.storage
        .from('devoirs')
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 an
    if (signErr) throw signErr;

    return {
        name:     file.name,
        url:      signed.signedUrl,
        path,                        // gardé pour régénérer l'URL si expirée
        size:     file.size,
        type:     file.type,
    };
}

/**
 * Supprime un fichier du bucket devoirs.
 */
export async function deleteDevoirFile(path) {
    const { error } = await db.storage.from('devoirs').remove([path]);
    if (error) throw error;
}

/**
 * Sauvegarde ou met à jour la soumission d'un devoir.
 */
export async function saveDevoirSubmission({ seanceId, blockId, stagiaireId, fileUrls, message }) {
    const { data, error } = await db
        .from('lms_devoir_submissions')
        .upsert({
            seance_id:    seanceId,
            block_id:     blockId,
            stagiaire_id: stagiaireId,
            file_urls:    fileUrls,
            message:      message || null,
            submitted_at: new Date().toISOString(),
        }, { onConflict: 'seance_id,block_id,stagiaire_id' })
        .select()
        .single();
    if (error) throw error;

    // Notifier le staff (non-bloquant — erreur silencieuse)
    _notifyStaffDevoir(stagiaireId, seanceId).catch(() => {});

    return data;
}

async function _notifyStaffDevoir(stagiaireId, seanceId) {
    const [profRes, seanceRes] = await Promise.all([
        db.from('lms_profiles').select('nom,prenom').eq('id', stagiaireId).single(),
        db.from('lms_seances').select('titre').eq('id', seanceId).single(),
    ]);
    const name   = [profRes.data?.prenom, profRes.data?.nom].filter(Boolean).join(' ') || 'Un stagiaire';
    const titre  = seanceRes.data?.titre || 'une séance';
    await db.rpc('notify_staff', {
        p_type:     'devoir_submitted',
        p_title:    `Nouveau dépôt — ${titre}`,
        p_message:  `${name} a déposé un travail.`,
        p_link:     '/admin/devoirs',
        p_metadata: { seance_id: seanceId, stagiaire_id: stagiaireId },
    });
}

/**
 * Récupère la soumission d'un stagiaire pour un bloc devoir.
 */
export async function getDevoirSubmission({ seanceId, blockId, stagiaireId }) {
    const { data, error } = await db
        .from('lms_devoir_submissions')
        .select('*')
        .eq('seance_id',    seanceId)
        .eq('block_id',     blockId)
        .eq('stagiaire_id', stagiaireId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

/**
 * Récupère toutes les soumissions pour une séance (admin).
 * Joint les infos du profil stagiaire.
 */
export async function getDevoirSubmissionsBySeance(seanceId) {
    const { data, error } = await db
        .from('lms_devoir_submissions')
        .select(`
            *,
            lms_profiles!stagiaire_id (nom, prenom)
        `)
        .eq('seance_id', seanceId)
        .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

/**
 * Récupère toutes les soumissions non-notées (admin).
 */
export async function getPendingDevoirSubmissions() {
    const { data, error } = await db
        .from('lms_devoir_submissions')
        .select(`
            *,
            lms_profiles!stagiaire_id (nom, prenom),
            lms_seances!seance_id (titre)
        `)
        .is('note', null)
        .order('submitted_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

/**
 * Enregistre la note et le feedback d'un admin.
 */
export async function gradeDevoirSubmission({ submissionId, note, noteMax, feedback, gradedBy }) {
    const { data, error } = await db
        .from('lms_devoir_submissions')
        .update({
            note,
            note_max:   noteMax,
            feedback:   feedback || null,
            graded_by:  gradedBy,
            graded_at:  new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select('*, lms_seances!seance_id(titre)')
        .single();
    if (error) throw error;

    // Notifier le stagiaire (non-bloquant)
    if (data?.stagiaire_id) {
        const titre = data.lms_seances?.titre || 'votre devoir';
        db.rpc('notify_user', {
            p_user_id:  data.stagiaire_id,
            p_type:     'devoir_graded',
            p_title:    'Votre devoir a été corrigé',
            p_message:  `Note obtenue : ${note}/${noteMax} — « ${titre} »`,
            p_metadata: { submission_id: submissionId, note, note_max: noteMax },
        }).catch(() => {});
    }

    return data;
}

/**
 * Génère une URL signée fraîche pour un fichier (si l'originale a expiré).
 */
export async function refreshSignedUrl(path) {
    const { data, error } = await db.storage
        .from('devoirs')
        .createSignedUrl(path, 60 * 60 * 2); // 2h
    if (error) throw error;
    return data.signedUrl;
}
