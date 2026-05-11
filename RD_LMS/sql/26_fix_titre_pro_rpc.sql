-- ═══════════════════════════════════════════════════════════════
-- 26_fix_titre_pro_rpc.sql
-- Fix get_titre_pro_for_profile : ajouter id, code_rncp, url_reac
--
-- Sans `id` le frontend ne peut pas charger :
--   - les documents (lms_tp_documents)
--   - les AT/CP (lms_certificats_ccp → lms_compétences)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_titre_pro_for_profile(p_profile_id UUID)
RETURNS TABLE (
    id          UUID,
    sigle       TEXT,
    intitule    TEXT,
    niveau      INT,
    code_rncp   TEXT,
    url_reac    TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tp.id,
        tp.sigle::TEXT,
        tp.intitule::TEXT,
        tp.niveau,
        tp.code_rncp::TEXT,
        tp.url_reac::TEXT
    FROM lms_cohorte_membres cm
    JOIN lms_cohortes   co ON co.id = cm.cohorte_id
    JOIN lms_pathways   pw ON pw.id = co.pathway_id
    JOIN lms_titres_pro tp ON tp.id = pw.titre_pro_id
    WHERE cm.profile_id = p_profile_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
