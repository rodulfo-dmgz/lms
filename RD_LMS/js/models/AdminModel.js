import { db }                   from '../lib/supabaseClient.js';
import { generateTempPassword } from '../utils/passwordGenerator.js';
import { store }                from '../store.js';
import { SUPABASE_URL }         from '../config.js';

// ── Stats dashboard ──────────────────────────────────────────
export async function getAdminStats() {
    const { data, error } = await db.rpc('admin_get_stats').single();
    if (error) throw error;
    return data;
}

// ── Cohortes ─────────────────────────────────────────────────
export async function getCohortes() {
    const { data, error } = await db.rpc('admin_get_cohortes');
    if (error) throw error;
    return data ?? [];
}

export async function getCohorteById(id) {
    const { data, error } = await db
        .from('lms_cohortes')
        .select('id, nom, date_debut, date_fin, pathway_id, financement_id')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function createCohorte({ nom, pathway_id, financement_id, date_debut, date_fin }) {
    const { data, error } = await db
        .from('lms_cohortes')
        .insert({ nom, pathway_id, financement_id, date_debut: date_debut || null, date_fin: date_fin || null })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateCohorte(id, { nom, date_debut, date_fin }) {
    const { data, error } = await db
        .from('lms_cohortes')
        .update({ nom, date_debut: date_debut || null, date_fin: date_fin || null })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteCohorte(id) {
    const { error } = await db.from('lms_cohortes').delete().eq('id', id);
    if (error) throw error;
}

// ── Membres d'une cohorte ────────────────────────────────────
export async function getCohorteMembers(cohorteId) {
    const { data, error } = await db.rpc('admin_get_cohorte_members', { p_cohorte_id: cohorteId });
    if (error) throw error;
    return data ?? [];
}

export async function getAvailableStagiaires(cohorteId = null) {
    const params = cohorteId ? { p_cohorte_id: cohorteId } : { p_cohorte_id: null };
    const { data, error } = await db.rpc('admin_get_available_stagiaires', params);
    if (error) throw error;
    return data ?? [];
}

export async function addMember(cohorteId, profileId) {
    const { error } = await db
        .from('lms_cohorte_membres')
        .insert({ cohorte_id: cohorteId, profile_id: profileId });
    if (error) throw error;
}

export async function removeMember(cohorteId, profileId) {
    const { error } = await db
        .from('lms_cohorte_membres')
        .delete()
        .eq('cohorte_id', cohorteId)
        .eq('profile_id', profileId);
    if (error) throw error;
}

// ── Stagiaires ───────────────────────────────────────────────
export async function getStagiaires() {
    const { data, error } = await db.rpc('admin_get_stagiaires');
    if (error) throw error;
    return data ?? [];
}

export async function getStagiaireById(id) {
    const { data, error } = await db
        .from('lms_profiles')
        .select('id, civilite, nom, prenom, date_naissance, telephone, role, first_login, created_at')
        .eq('id', id)
        .single();
    if (error) throw error;

    // Récupère la cohorte actuelle
    const { data: membre } = await db
        .from('lms_cohorte_membres')
        .select('cohorte_id, lms_cohortes(nom)')
        .eq('profile_id', id)
        .maybeSingle();

    return {
        ...data,
        cohorte_id:  membre?.cohorte_id  ?? null,
        cohorte_nom: membre?.lms_cohortes?.nom ?? null,
    };
}

export async function updateStagiaireProfile(id, updates) {
    const { data, error } = await db
        .from('lms_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function enrollStagiaire(profileId, cohorteId) {
    // Retire d'abord de l'ancienne cohorte si elle existe
    await db.from('lms_cohorte_membres').delete().eq('profile_id', profileId);
    if (!cohorteId) return;
    const { error } = await db
        .from('lms_cohorte_membres')
        .insert({ cohorte_id: cohorteId, profile_id: profileId });
    if (error) throw error;
}

export async function createStagiaire(data) {
    const tempPassword = generateTempPassword(data.prenom, data.nom);
    const { data: { session } } = await db.auth.getSession();

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            email:          data.email.trim().toLowerCase(),
            password:       tempPassword,
            nom:            data.nom.trim(),
            prenom:         data.prenom.trim(),
            civilite:       data.civilite || null,
            date_naissance: data.date_naissance || null,
            cohorte_id:     data.cohorte_id || null,
        }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return { ...await res.json(), mot_de_passe: tempPassword };
}

// ── Référentiel ──────────────────────────────────────────────
export async function getTitresPro() {
    const { data, error } = await db
        .from('lms_titres_pro')
        .select('id, sigle, intitule, niveau')
        .order('intitule');
    if (error) throw error;
    return data ?? [];
}

export async function getPathways() {
    const { data, error } = await db.rpc('admin_get_pathways');
    if (error) throw error;
    return data ?? [];
}

export async function getFinancements() {
    const { data, error } = await db
        .from('lms_financements')
        .select('id, nom')
        .order('nom');
    if (error) throw error;
    return data ?? [];
}

// ── Import CSV (conservé) ────────────────────────────────────
export async function importStagiaires(rows) {
    const results = { success: [], errors: [] };
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            if (!row.email || !row.nom || !row.prenom) throw new Error('Colonnes email, nom et prenom obligatoires');
            const result = await createStagiaire({
                email:          row.email,
                nom:            row.nom,
                prenom:         row.prenom,
                civilite:       row.civilite || null,
                date_naissance: parseDate(row.date_naissance),
                cohorte_id:     row.cohorte_id || null,
            });
            results.success.push({ ligne: i + 2, email: row.email, mot_de_passe: result.mot_de_passe });
        } catch (err) {
            results.errors.push({ ligne: i + 2, email: row.email || '?', message: err.message });
        }
    }
    await db.rpc('admin_prepare_import_log', {
        p_admin_id:    store.getUser()?.id,
        p_type_import: 'stagiaires',
        p_nb_lignes:   rows.length,
        p_nb_succes:   results.success.length,
        p_nb_erreurs:  results.errors.length,
        p_details:     results.errors.length ? JSON.stringify(results.errors) : null,
    });
    return results;
}

export async function getAllProfiles() {
    const { data, error } = await db
        .from('lms_profiles')
        .select('id, civilite, nom, prenom, role, created_at')
        .order('nom');
    if (error) throw error;
    return data;
}

function parseDate(str) {
    if (!str) return null;
    if (str.includes('/')) {
        const [d, m, y] = str.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return str;
}
