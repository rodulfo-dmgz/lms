-- ═══════════════════════════════════════════════════════════════════════════
--  11_devoirs_navigation.sql
--  • admin_get_devoirs_navigation  — arbre Parcours→Cohorte→Module→Séq→Séance
--                                    avec compteurs (pending / total) par nœud
--  • admin_get_seance_submissions   — dépôts d'une séance filtrés par cohorte
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
--  Arbre de navigation des devoirs
--  Retourne une ligne par (parcours, cohorte, module, séquence, séance)
--  avec le nombre de soumissions pending et total dans ce contexte.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_devoirs_navigation()
RETURNS TABLE (
    pathway_id      uuid,
    pathway_titre   text,
    titre_pro_sigle text,
    cohorte_id      uuid,
    cohorte_nom     text,
    cours_id        uuid,
    cours_titre     text,
    sequence_id     uuid,
    sequence_titre  text,
    sequence_ordre  int,
    seance_id       uuid,
    seance_titre    text,
    seance_ordre    int,
    total_count     bigint,
    pending_count   bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    RETURN QUERY
    SELECT
        pw.id,
        pw.titre::text,
        tp.sigle::text,
        coh.id,
        coh.nom::text,
        c.id,
        c.titre::text,
        seq.id,
        seq.titre::text,
        seq.ordre,
        san.id,
        san.titre::text,
        san.ordre,
        COUNT(DISTINCT ds.id)::bigint,
        COUNT(DISTINCT ds.id) FILTER (WHERE ds.note IS NULL)::bigint
    FROM lms_devoir_submissions ds
    JOIN lms_seances                 san ON san.id       = ds.seance_id
    JOIN lms_sequences               seq ON seq.id       = san.sequence_id
    JOIN lms_cours                     c ON c.id         = seq.cours_id
    JOIN lms_config_cours             cc ON cc.cours_id  = c.id
    JOIN lms_parcours_finance_config pfc ON pfc.id       = cc.config_id
    JOIN lms_pathways                 pw ON pw.id        = pfc.pathway_id
    LEFT JOIN lms_titres_pro          tp ON tp.id        = pw.titre_pro_id
    JOIN lms_cohortes                coh ON coh.pathway_id = pw.id
    JOIN lms_cohorte_membres          cm ON cm.cohorte_id = coh.id
                                       AND cm.profile_id  = ds.stagiaire_id
    GROUP BY
        pw.id, pw.titre, tp.sigle,
        coh.id, coh.nom,
        c.id, c.titre,
        seq.id, seq.titre, seq.ordre,
        san.id, san.titre, san.ordre
    ORDER BY
        tp.sigle NULLS LAST, pw.titre, coh.nom,
        c.titre, seq.ordre, san.ordre;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_devoirs_navigation TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
--  Soumissions d'une séance filtrées par cohorte
--  Retourne tous les dépôts (notés ou non) des membres de la cohorte
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_seance_submissions(
    p_seance_id  uuid,
    p_cohorte_id uuid
)
RETURNS TABLE (
    submission_id uuid,
    stagiaire_id  uuid,
    prenom        text,
    nom           text,
    file_urls     jsonb,
    message       text,
    note          numeric,
    note_max      numeric,
    feedback      text,
    graded_at     timestamptz,
    submitted_at  timestamptz,
    block_id      text
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    RETURN QUERY
    SELECT
        ds.id,
        ds.stagiaire_id,
        p.prenom::text,
        p.nom::text,
        ds.file_urls,
        ds.message,
        ds.note,
        ds.note_max,
        ds.feedback,
        ds.graded_at,
        ds.submitted_at,
        ds.block_id
    FROM lms_devoir_submissions ds
    JOIN lms_profiles          p  ON p.id  = ds.stagiaire_id
    JOIN lms_cohorte_membres   cm ON cm.profile_id  = ds.stagiaire_id
                                 AND cm.cohorte_id  = p_cohorte_id
    WHERE ds.seance_id = p_seance_id
    ORDER BY p.nom, p.prenom, ds.submitted_at;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_seance_submissions TO authenticated;
