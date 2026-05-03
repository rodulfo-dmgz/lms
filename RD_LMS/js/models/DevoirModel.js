import { db } from '../lib/supabaseClient.js';

// Chemin de stockage : {nom_seance}/{NomPrenom}/{timestamp}_{filename}
// Ex : Intro_au_marketing/Marie_Dupont/1714900000000_mon_devoir.pdf
function storagePath(stagiaireId, seanceId, filename, studentName, seanceTitre) {
    const safe       = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeName   = (studentName || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || stagiaireId;
    const safeTitre  = (seanceTitre || seanceId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    return `${safeTitre}/${safeName}/${Date.now()}_${safe}`;
}

/**
 * Upload un fichier vers le bucket "devoirs".
 * Retourne { name, url, path, size, type } (URL signée 1 an).
 */
export async function uploadDevoirFile(stagiaireId, seanceId, blockId, file, studentName = '', seanceTitre = '') {
    const path = storagePath(stagiaireId, seanceId, file.name, studentName, seanceTitre);

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

    // Notifier le stagiaire (non-bloquant — via helper async pour éviter .catch sur builder Supabase)
    if (data?.stagiaire_id) {
        const titre = data.lms_seances?.titre || 'votre devoir';
        _notifyUserDevoir(data.stagiaire_id, note, noteMax, titre, submissionId).catch(() => {});
    }

    return data;
}

async function _notifyUserDevoir(stagiaireId, note, noteMax, titre, submissionId) {
    await db.rpc('notify_user', {
        p_user_id:  stagiaireId,
        p_type:     'devoir_graded',
        p_title:    'Votre devoir a été corrigé ✓',
        p_message:  `Note obtenue : ${note}/${noteMax} — « ${titre} »`,
        p_link:     '/mes-devoirs',
        p_metadata: { submission_id: submissionId, note, note_max: noteMax },
    });
}

/**
 * Récupère tous les devoirs d'un stagiaire (soumis et corrigés).
 * Utilisé par la page "Mes devoirs" côté stagiaire.
 */
export async function getMesDevoirs(stagiaireId) {
    const { data, error } = await db
        .from('lms_devoir_submissions')
        .select(`
            id, seance_id, block_id, file_urls, message,
            note, note_max, feedback, graded_at, submitted_at,
            lms_seances!seance_id (
                titre,
                lms_sequences!sequence_id (
                    titre,
                    lms_cours!cours_id ( titre )
                )
            )
        `)
        .eq('stagiaire_id', stagiaireId)
        .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

/**
 * Arbre de navigation des devoirs pour l'admin.
 * Retourne une ligne par (parcours, cohorte, module, séquence, séance).
 */
export async function getDevoirsNavigation() {
    const { data, error } = await db.rpc('admin_get_devoirs_navigation');
    if (error) throw error;
    return data ?? [];
}

/**
 * Soumissions d'une séance filtrées par cohorte (admin).
 */
export async function getSeanceSubmissions(seanceId, cohorteId) {
    const { data, error } = await db.rpc('admin_get_seance_submissions', {
        p_seance_id:  seanceId,
        p_cohorte_id: cohorteId,
    });
    if (error) throw error;
    return data ?? [];
}

/**
 * Supprime une soumission côté ADMIN (pas de restriction stagiaire_id).
 * Supprime les fichiers du storage + la ligne en base.
 */
export async function deleteSubmission({ submissionId, fileUrls }) {
    const paths = (fileUrls || []).map(f => f.path).filter(Boolean);
    if (paths.length) {
        await db.storage.from('devoirs').remove(paths);
    }
    const { error } = await db
        .from('lms_devoir_submissions')
        .delete()
        .eq('id', submissionId);
    if (error) throw error;
}

/**
 * Supprime la soumission d'un stagiaire et ses fichiers associés.
 * Utilisé par le stagiaire pour retirer et redéposer un devoir non encore noté.
 */
export async function resetDevoirSubmission({ submissionId, fileUrls, stagiaireId }) {
    // Supprimer les fichiers du storage
    const paths = (fileUrls || []).map(f => f.path).filter(Boolean);
    if (paths.length) {
        await db.storage.from('devoirs').remove(paths);
    }
    // Supprimer la ligne en base (double vérif : stagiaire_id protège contre la suppression d'autrui)
    const { error } = await db
        .from('lms_devoir_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('stagiaire_id', stagiaireId);
    if (error) throw error;
}

/**
 * Récupère TOUS les stagiaires d'une cohorte pour une séance,
 * qu'ils aient soumis un devoir ou non (style Moodle).
 * Nécessite le RPC SQL `admin_get_seance_all_students`.
 */
export async function getSeanceAllStudents(seanceId, cohorteId) {
    const { data, error } = await db.rpc('admin_get_seance_all_students', {
        p_seance_id:  seanceId,
        p_cohorte_id: cohorteId,
    });
    if (error) throw error;
    return data ?? [];
}

/**
 * Note directement un stagiaire, même sans dépôt préalable.
 * Crée d'abord une soumission vide (upsert), puis grade.
 */
export async function gradeDirectly({ seanceId, blockId, stagiaireId, note, noteMax, feedback, gradedBy }) {
    // 1. Créer ou récupérer la soumission
    const { data: sub, error: subErr } = await db
        .from('lms_devoir_submissions')
        .upsert({
            seance_id:    seanceId,
            block_id:     blockId || 'direct',
            stagiaire_id: stagiaireId,
            file_urls:    [],
            message:      null,
            submitted_at: new Date().toISOString(),
        }, { onConflict: 'seance_id,block_id,stagiaire_id' })
        .select('id')
        .single();
    if (subErr) throw subErr;

    // 2. Enregistrer la note
    return gradeDevoirSubmission({ submissionId: sub.id, note, noteMax, feedback, gradedBy });
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
