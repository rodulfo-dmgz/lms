import { db } from '../lib/supabaseClient.js';

// ── Liste des produits ────────────────────────────────────────
export async function getProduits() {
    const { data, error } = await db
        .from('lms_produits')
        .select(`
            id, nom, description, actif, created_at, pathway_id,
            lms_pathways(titre),
            lms_produit_items(id)
        `)
        .order('nom');
    if (error) throw error;
    return (data || []).map(p => ({
        id:            p.id,
        nom:           p.nom,
        description:   p.description,
        actif:         p.actif,
        created_at:    p.created_at,
        pathway_id:    p.pathway_id,
        pathway_titre: p.lms_pathways?.titre || '—',
        nb_items:      p.lms_produit_items?.length || 0,
    }));
}

// ── Produit par ID ────────────────────────────────────────────
export async function getProduitById(id) {
    const { data, error } = await db
        .from('lms_produits')
        .select('id, nom, description, pathway_id, actif, created_at')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

// ── Créer un produit ──────────────────────────────────────────
export async function createProduit({ nom, description, pathway_id, actif = true }) {
    const { data, error } = await db
        .from('lms_produits')
        .insert({ nom, description: description || null, pathway_id, actif })
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ── Mettre à jour un produit ──────────────────────────────────
export async function updateProduit(id, { nom, description, actif }) {
    const patch = { nom };
    if (description !== undefined) patch.description = description || null;
    if (actif        !== undefined) patch.actif       = actif;
    const { data, error } = await db
        .from('lms_produits')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ── Supprimer un produit ──────────────────────────────────────
export async function deleteProduit(id) {
    const { error } = await db.from('lms_produits').delete().eq('id', id);
    if (error) throw error;
}

// ── Items d'un produit ────────────────────────────────────────
export async function getProduitItems(produitId) {
    const { data, error } = await db
        .from('lms_produit_items')
        .select(`
            id, produit_id, item_type, cours_id, sequence_id, seance_id, ordre,
            lms_cours(id, titre),
            lms_sequences(id, titre),
            lms_seances(id, titre)
        `)
        .eq('produit_id', produitId)
        .order('ordre');
    if (error) throw error;
    return (data || []).map(item => ({
        ...item,
        titre: item.lms_cours?.titre
             || item.lms_sequences?.titre
             || item.lms_seances?.titre
             || '—',
    }));
}

// ── Ajouter un item à un produit ──────────────────────────────
export async function addProduitItem({ produit_id, item_type, cours_id, sequence_id, seance_id }) {
    // Ordre = max actuel + 1
    const { data: existing } = await db
        .from('lms_produit_items')
        .select('ordre')
        .eq('produit_id', produit_id)
        .order('ordre', { ascending: false })
        .limit(1);
    const maxOrdre = existing?.[0]?.ordre ?? 0;

    const { data, error } = await db
        .from('lms_produit_items')
        .insert({
            produit_id,
            item_type,
            cours_id:    cours_id    || null,
            sequence_id: sequence_id || null,
            seance_id:   seance_id   || null,
            ordre: maxOrdre + 1,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ── Supprimer un item ─────────────────────────────────────────
export async function removeProduitItem(id) {
    const { error } = await db.from('lms_produit_items').delete().eq('id', id);
    if (error) throw error;
}

// ── Arbre de contenu d'un parcours (pour le sélecteur) ────────
export async function getPathwayContentTree(pathwayId) {
    // 1. Configs du parcours
    const { data: configs, error: ce } = await db
        .from('lms_parcours_finance_config')
        .select('id')
        .eq('pathway_id', pathwayId);
    if (ce) throw ce;

    const configIds = (configs || []).map(c => c.id);
    if (!configIds.length) return [];

    // 2. Cours liés aux configs (dédupliqués)
    const { data: ccRows, error: coe } = await db
        .from('lms_config_cours')
        .select('cours_id')
        .in('config_id', configIds);
    if (coe) throw coe;

    const uniqueCoursIds = [...new Set((ccRows || []).map(cc => cc.cours_id))];
    if (!uniqueCoursIds.length) return [];

    // 3. Détails des cours
    const { data: coursData, error: cde } = await db
        .from('lms_cours')
        .select('id, titre')
        .in('id', uniqueCoursIds)
        .order('titre');
    if (cde) throw cde;

    // 4. Séquences
    const { data: seqData, error: se } = await db
        .from('lms_sequences')
        .select('id, titre, cours_id')
        .in('cours_id', uniqueCoursIds)
        .order('ordre');
    if (se) throw se;

    const seqIds = (seqData || []).map(s => s.id);

    // 5. Séances
    let seanceData = [];
    if (seqIds.length) {
        const { data: sd, error: sde } = await db
            .from('lms_seances')
            .select('id, titre, sequence_id')
            .in('sequence_id', seqIds)
            .order('ordre');
        if (sde) throw sde;
        seanceData = sd || [];
    }

    // 6. Construire l'arbre
    const seancesBySeq = {};
    seanceData.forEach(s => {
        if (!seancesBySeq[s.sequence_id]) seancesBySeq[s.sequence_id] = [];
        seancesBySeq[s.sequence_id].push(s);
    });

    const seqsByCours = {};
    (seqData || []).forEach(s => {
        if (!seqsByCours[s.cours_id]) seqsByCours[s.cours_id] = [];
        seqsByCours[s.cours_id].push({ ...s, seances: seancesBySeq[s.id] || [] });
    });

    return (coursData || []).map(c => ({
        ...c,
        sequences: seqsByCours[c.id] || [],
    }));
}

// ── Produits d'un parcours (dropdown d'assignation) ───────────
export async function getProduitsForPathway(pathwayId) {
    const { data, error } = await db
        .from('lms_produits')
        .select('id, nom, actif')
        .eq('pathway_id', pathwayId)
        .eq('actif', true)
        .order('nom');
    if (error) throw error;
    return data ?? [];
}

// ── Produits assignés à une cohorte ──────────────────────────
export async function getCohorteProduitsAssigned(cohorteId) {
    const { data, error } = await db
        .from('lms_cohorte_produits')
        .select(`
            id, cohorte_id, produit_id, created_at,
            lms_produits(id, nom, actif)
        `)
        .eq('cohorte_id', cohorteId)
        .order('created_at');
    if (error) throw error;
    return (data || []).map(r => ({
        id:         r.id,
        produit_id: r.produit_id,
        nom:        r.lms_produits?.nom  ?? '—',
        actif:      r.lms_produits?.actif ?? false,
        created_at: r.created_at,
    }));
}

export async function assignProduitToCohorte(cohorteId, produitId) {
    const { error } = await db
        .from('lms_cohorte_produits')
        .insert({ cohorte_id: cohorteId, produit_id: produitId });
    if (error) throw error;
}

export async function unassignProduitFromCohorte(cohorteId, produitId) {
    const { error } = await db
        .from('lms_cohorte_produits')
        .delete()
        .eq('cohorte_id', cohorteId)
        .eq('produit_id', produitId);
    if (error) throw error;
}

// ── Produits assignés à un stagiaire (override individuel) ───
export async function getProfileProduitsAssigned(profileId) {
    const { data, error } = await db
        .from('lms_profile_produits')
        .select(`
            id, profile_id, produit_id, created_at,
            lms_produits(id, nom, actif, pathway_id, lms_pathways(titre))
        `)
        .eq('profile_id', profileId)
        .order('created_at');
    if (error) throw error;
    return (data || []).map(r => ({
        id:             r.id,
        produit_id:     r.produit_id,
        nom:            r.lms_produits?.nom  ?? '—',
        actif:          r.lms_produits?.actif ?? false,
        pathway_titre:  r.lms_produits?.lms_pathways?.titre ?? '—',
        created_at:     r.created_at,
    }));
}

export async function assignProduitToProfile(profileId, produitId) {
    const { error } = await db
        .from('lms_profile_produits')
        .insert({ profile_id: profileId, produit_id: produitId });
    if (error) throw error;
}

export async function unassignProduitFromProfile(profileId, produitId) {
    const { error } = await db
        .from('lms_profile_produits')
        .delete()
        .eq('profile_id', profileId)
        .eq('produit_id', produitId);
    if (error) throw error;
}
