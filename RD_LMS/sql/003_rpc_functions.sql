-- ============================================================
-- LMS DASHBOA_RD — Fonctions RPC v1.0
-- ============================================================

-- ── RPC 1 : Cours d'un stagiaire ──────────────────────────
CREATE OR REPLACE FUNCTION get_student_courses(p_profile_id UUID)
RETURNS TABLE (
    cours_id        UUID,    titre           TEXT,
    description     TEXT,    duree_reelle    INT,
    obligatoire     BOOLEAN, est_transversal BOOLEAN,
    image_url       TEXT,    objectif        TEXT,
    ordre           INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.titre::TEXT,
        c.description::TEXT,
        COALESCE(cc.duree_heures, c.duree_heures),
        cc.obligatoire,
        c.est_transversal,
        c.image_url::TEXT,
        c.objectif_pedagogique::TEXT,
        cc.ordre
    FROM lms_profiles p
    JOIN lms_cohorte_membres cm ON cm.profile_id = p.id
    JOIN lms_cohortes co ON co.id = cm.cohorte_id
    JOIN lms_parcours_finance_config pfc
        ON pfc.pathway_id = co.pathway_id
        AND pfc.financement_id = co.financement_id
    JOIN lms_config_cours cc ON cc.config_id = pfc.id
    JOIN lms_cours c ON c.id = cc.cours_id
    WHERE p.id = p_profile_id
    ORDER BY cc.ordre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC 2 : Toggle progression (réversible) ───────────────
CREATE OR REPLACE FUNCTION toggle_seance_progress(
    p_profile_id UUID, p_seance_id UUID
)
RETURNS TEXT AS $$
DECLARE old_stat TEXT; new_stat TEXT;
BEGIN
    IF auth.uid() != p_profile_id THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;
    SELECT statut INTO old_stat
    FROM lms_session_progress
    WHERE profile_id = p_profile_id AND seance_id = p_seance_id;

    IF old_stat IS NULL OR old_stat = 'non_commence' THEN
        new_stat := 'termine';
        INSERT INTO lms_session_progress (profile_id, seance_id, statut, date_completion)
        VALUES (p_profile_id, p_seance_id, 'termine', now())
        ON CONFLICT (profile_id, seance_id)
        DO UPDATE SET statut = 'termine', date_completion = now();
    ELSIF old_stat = 'termine' THEN
        new_stat := 'non_commence';
        UPDATE lms_session_progress
        SET statut = 'non_commence', date_completion = NULL
        WHERE profile_id = p_profile_id AND seance_id = p_seance_id;
    ELSE
        new_stat := old_stat;
    END IF;
    RETURN new_stat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC 3 : Résumé progression dashboard ─────────────────
CREATE OR REPLACE FUNCTION get_student_progress_summary(p_profile_id UUID)
RETURNS TABLE (
    cours_id UUID, cours_titre TEXT,
    total_seances INT, terminees INT, pourcentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.titre::TEXT,
        COUNT(s.id)::INT,
        COUNT(sp.seance_id) FILTER (WHERE sp.statut = 'termine')::INT,
        ROUND(
            COUNT(sp.seance_id) FILTER (WHERE sp.statut = 'termine')::DECIMAL
            / NULLIF(COUNT(s.id), 0) * 100, 1
        )
    FROM lms_profiles p
    JOIN lms_cohorte_membres cm ON cm.profile_id = p.id
    JOIN lms_cohortes co ON co.id = cm.cohorte_id
    JOIN lms_parcours_finance_config pfc
        ON pfc.pathway_id = co.pathway_id AND pfc.financement_id = co.financement_id
    JOIN lms_config_cours cc ON cc.config_id = pfc.id
    JOIN lms_cours c ON c.id = cc.cours_id
    JOIN lms_sequences seq ON seq.cours_id = c.id
    JOIN lms_seances s ON s.sequence_id = seq.id
    LEFT JOIN lms_session_progress sp
        ON sp.seance_id = s.id AND sp.profile_id = p_profile_id
    WHERE p.id = p_profile_id
    GROUP BY c.id, c.titre
    ORDER BY MAX(cc.ordre);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC 4 : Log import admin ──────────────────────────────
CREATE OR REPLACE FUNCTION admin_prepare_import_log(
    p_admin_id UUID, p_type_import TEXT,
    p_nb_lignes INT, p_nb_succes INT, p_nb_erreurs INT,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE new_id UUID;
BEGIN
    IF get_my_role() != 'admin' THEN
        RAISE EXCEPTION 'Réservé aux administrateurs';
    END IF;
    INSERT INTO lms_import_logs
        (admin_id, type_import, nb_lignes, nb_succes, nb_erreurs, details_erreurs)
    VALUES (p_admin_id, p_type_import, p_nb_lignes, p_nb_succes, p_nb_erreurs, p_details)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC 5 : Titre professionnel d'un stagiaire ───────────
CREATE OR REPLACE FUNCTION get_titre_pro_for_profile(p_profile_id UUID)
RETURNS TABLE (sigle TEXT, intitule TEXT, niveau INT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tp.sigle::TEXT,
        tp.intitule::TEXT,
        tp.niveau
    FROM lms_cohorte_membres cm
    JOIN lms_cohortes   co ON co.id = cm.cohorte_id
    JOIN lms_pathways   pw ON pw.id = co.pathway_id
    JOIN lms_titres_pro tp ON tp.id = pw.titre_pro_id
    WHERE cm.profile_id = p_profile_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC 6 : Marquer first_login terminé ───────────────────
CREATE OR REPLACE FUNCTION mark_first_login_done()
RETURNS VOID AS $$
BEGIN
    UPDATE lms_profiles SET first_login = false WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
