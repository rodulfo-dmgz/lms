import { db } from '../lib/supabaseClient.js';

const FIELDS = `
    id, nom, description, type_financement, financeur,
    organisme_gestionnaire, code_cpf,
    prix_ht, prix_ttc, taux_tva,
    taux_prise_charge, plafond_montant, plafond_heures,
    notes_commerciales, actif, created_at
`.trim();

/**
 * Liste complète (admin) — tous les financements, actifs ou non
 */
export async function getAllFinancements() {
    const { data, error } = await db
        .from('lms_financements')
        .select(FIELDS)
        .order('nom');
    if (error) throw error;
    return data ?? [];
}

/**
 * Liste filtrée (selects) — seulement les actifs
 */
export async function getActiveFinancements() {
    const { data, error } = await db
        .from('lms_financements')
        .select('id, nom, type_financement, financeur')
        .eq('actif', true)
        .order('nom');
    if (error) throw error;
    return data ?? [];
}

/**
 * Un seul financement par id
 */
export async function getFinancementById(id) {
    const { data, error } = await db
        .from('lms_financements')
        .select(FIELDS)
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

/**
 * Création
 */
export async function createFinancement(payload) {
    const { data, error } = await db
        .from('lms_financements')
        .insert(sanitize(payload))
        .select(FIELDS)
        .single();
    if (error) throw error;
    return data;
}

/**
 * Mise à jour
 */
export async function updateFinancement(id, payload) {
    const { data, error } = await db
        .from('lms_financements')
        .update(sanitize(payload))
        .eq('id', id)
        .select(FIELDS)
        .single();
    if (error) throw error;
    return data;
}

/**
 * Suppression (seulement si non référencé)
 */
export async function deleteFinancement(id) {
    const { error } = await db
        .from('lms_financements')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ── Helpers ──────────────────────────────────────────────────

function toNullableFloat(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
}

function toNullableInt(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
}

function sanitize(raw) {
    return {
        nom:                    raw.nom?.trim()                    || null,
        description:            raw.description?.trim()            || null,
        type_financement:       raw.type_financement               || null,
        financeur:              raw.financeur?.trim()              || null,
        organisme_gestionnaire: raw.organisme_gestionnaire?.trim() || null,
        code_cpf:               raw.code_cpf?.trim()               || null,
        prix_ht:                toNullableFloat(raw.prix_ht),
        prix_ttc:               toNullableFloat(raw.prix_ttc),
        taux_tva:               toNullableFloat(raw.taux_tva),
        taux_prise_charge:      toNullableFloat(raw.taux_prise_charge),
        plafond_montant:        toNullableFloat(raw.plafond_montant),
        plafond_heures:         toNullableInt(raw.plafond_heures),
        notes_commerciales:     raw.notes_commerciales?.trim()     || null,
        actif:                  raw.actif !== false,
    };
}
