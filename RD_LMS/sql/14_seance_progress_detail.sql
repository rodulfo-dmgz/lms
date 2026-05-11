-- ═══════════════════════════════════════════════════════════════════════════
--  14_seance_progress_detail.sql
--
--  RPC : admin_get_stagiaire_seance_progress(p_profile_id)
--
--  Retourne la progression séance par séance d'un stagiaire pour l'admin.
--  Utilisé par le modal de détail dans la page Progression.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_get_stagiaire_seance_progress(p_profile_id UUID)
RETURNS TABLE (
    cours_id        UUID,
    cours_titre     TEXT,
    cours_ordre     INT,
    sequence_id     UUID,
    sequence_titre  TEXT,
    sequence_ordre  INT,
    seance_id       UUID,
    seance_titre    TEXT,
    seance_ordre    INT,
    seance_type     TEXT,
    statut          TEXT    -- 'termine' | 'en_cours' | NULL (non commencé)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.titre::TEXT,
        cc.ordre,
        seq.id,
        seq.titre::TEXT,
        seq.ordre,
        s.id,
        s.titre::TEXT,
        s.ordre,
        s.type::TEXT,
        sp.statut::TEXT
    FROM lms_profiles p
    JOIN lms_cohorte_membres cm  ON cm.profile_id = p.id
    JOIN lms_cohortes co         ON co.id = cm.cohorte_id
    JOIN lms_parcours_finance_config pfc
        ON  pfc.pathway_id = co.pathway_id
        AND pfc.financement_id IS NOT DISTINCT FROM co.financement_id
    JOIN lms_config_cours cc     ON cc.config_id = pfc.id
    JOIN lms_cours c             ON c.id = cc.cours_id
    JOIN lms_sequences seq       ON seq.cours_id = c.id
    JOIN lms_seances s           ON s.sequence_id = seq.id
    LEFT JOIN lms_session_progress sp
        ON sp.seance_id = s.id AND sp.profile_id = p_profile_id
    WHERE p.id = p_profile_id
    ORDER BY cc.ordre, seq.ordre, s.ordre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;