/**
 * LockModel.js — Verrouillage d'accès granulaire
 * Admin : pose / lève des verrous sur séance / séquence / cours
 * Stagiaire : consulte ses verrous actifs et entre le code pour lever
 */

import { db }    from '../lib/supabaseClient.js';
import { store } from '../store.js';

// ── Admin / Formateur ─────────────────────────────────────────────────────────

/**
 * Pose un verrou sur un élément pour un stagiaire.
 * @param {{ profileId, itemType, itemId, unlockCode, raison? }} opts
 */
export async function lockItem({ profileId, itemType, itemId, unlockCode, raison = null }) {
    const me = store.getProfile();
    const { data, error } = await db
        .from('lms_access_locks')
        .insert({
            profile_id:  profileId,
            item_type:   itemType,
            item_id:     itemId,
            unlock_code: unlockCode.trim(),
            raison:      raison?.trim() || null,
            locked_by:   me?.id || null,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * Déverrouille (désactive) un verrou depuis le panneau admin.
 * @param {string} lockId
 */
export async function adminUnlockItem(lockId) {
    const { error } = await db
        .from('lms_access_locks')
        .update({ is_active: false, unlocked_at: new Date().toISOString() })
        .eq('id', lockId);
    if (error) throw error;
}

/**
 * Retourne tous les verrous (actifs + historique) pour un stagiaire.
 * @param {string} profileId
 */
export async function getLocksForProfile(profileId) {
    const { data, error } = await db
        .from('lms_access_locks')
        .select('id, item_type, item_id, unlock_code, raison, is_active, locked_at, unlocked_at, locked_by')
        .eq('profile_id', profileId)
        .order('locked_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

/**
 * Pose un verrou sur un élément pour tous les membres d'une cohorte (via RPC).
 * Les membres déjà verrouillés sur cet élément sont ignorés (ON CONFLICT DO NOTHING).
 * @param {{ cohorteId, itemType, itemId, unlockCode, raison? }} opts
 * @returns {Promise<number>} — nombre de nouveaux verrous créés
 */
export async function lockCohortAccess({ cohorteId, itemType, itemId, unlockCode, raison = null }) {
    const me = store.getProfile();
    const { data, error } = await db.rpc('lock_cohort_access', {
        p_cohorte_id:  cohorteId,
        p_item_type:   itemType,
        p_item_id:     itemId,
        p_unlock_code: unlockCode.trim(),
        p_raison:      raison?.trim() || null,
        p_locked_by:   me?.id || null,
    });
    if (error) throw error;
    return Number(data ?? 0);
}

/**
 * Retourne la cohorte d'un stagiaire (null si non inscrit).
 * @param {string} profileId
 * @returns {Promise<{ cohorte_id: string, cohorte_nom: string }|null>}
 */
export async function getProfileCohorte(profileId) {
    const { data, error } = await db
        .from('lms_cohorte_membres')
        .select('cohorte_id, lms_cohortes(nom)')
        .eq('profile_id', profileId)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
        cohorte_id:  data.cohorte_id,
        cohorte_nom: data.lms_cohortes?.nom ?? null,
    };
}

// ── Stagiaire ─────────────────────────────────────────────────────────────────

/**
 * Retourne les verrous actifs du stagiaire connecté.
 */
export async function getMyActiveLocks() {
    const { data, error } = await db
        .from('lms_access_locks')
        .select('id, item_type, item_id, raison, locked_at')
        .eq('is_active', true);
    if (error) throw error;
    return data ?? [];
}

/**
 * Tente de lever un verrou avec le code fourni.
 * Passe par la RPC SECURITY DEFINER côté Supabase.
 * @param {string} lockId
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function tryUnlockAccess(lockId, code) {
    const { data, error } = await db
        .rpc('try_unlock_access', { p_lock_id: lockId, p_code: code });
    if (error) throw error;
    return Boolean(data);
}
