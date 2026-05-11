-- ============================================================
-- LMS DASHBOA_RD — Étape 6 : Import et gestion des configs parcours
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- RPC : Ajouter un financement (config) à un parcours existant
-- ────────────────────────────────────────────────────────────
-- Crée un nouvel enregistrement dans lms_parcours_finance_config.
-- Retourne le nouveau config_id.
CREATE OR REPLACE FUNCTION admin_add_pathway_config(
    p_pathway_id     UUID,
    p_financement_id UUID    -- NULL autorisé (config sans financement)
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_config_id UUID;
BEGIN
    IF get_my_role() != 'admin' THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;

    INSERT INTO lms_parcours_finance_config (pathway_id, financement_id)
    VALUES (p_pathway_id, p_financement_id)
    RETURNING id INTO v_config_id;

    RETURN json_build_object('config_id', v_config_id);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_pathway_config TO authenticated;
