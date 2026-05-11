-- ═══════════════════════════════════════════════════════════════════════════
--  13_fix_financement_join.sql
--
--  BUG : pfc.financement_id = co.financement_id renvoie FALSE quand les deux
--        sont NULL (NULL = NULL n'est pas TRUE en SQL).
--  FIX : remplacer par IS NOT DISTINCT FROM, qui traite NULL comme une valeur
--        comparable (NULL IS NOT DISTINCT FROM NULL = TRUE).
--
--  Fonctions corrigées :
--    • get_student_courses          (utilisée par Modules + Mes Cours)
--    • get_student_progress_summary (utilisée par le Dashboard)
--    • admin_get_stagiaires_progress (utilisée par la page Progression admin)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── RPC 1 : Cours d'un stagiaire ──────────────────────────────────────────
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
    JOIN lms_cohorte_membres cm  ON cm.profile_id = p.id
    JOIN lms_cohortes co         ON co.id = cm.cohorte_id
    JOIN lms_parcours_finance_config pfc
        ON  pfc.pathway_id = co.pathway_id
        AND pfc.financement_id IS NOT DISTINCT FROM co.financement_id   -- ← FIX
    JOIN lms_config_cours cc     ON cc.config_id = pfc.id
    JOIN lms_cours c             ON c.id = cc.cours_id
    WHERE p.id = p_profile_id
    ORDER BY cc.ordre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC 3 : Résumé progression dashboard ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_student_progress_summary(p_profile_id UUID)
RETURNS TABLE (
    cours_id UUID, cours_titre TEXT,
    total_seances INT, terminees INT, pourcentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.titre::TEXT,
        COUNT(s.id)::INT,
        COUNT(sp.seance_id) FILTER (WHERE sp.statut = 'termine')::INT,
        ROUND(
            COUNT(sp.seance_id) FILTER (WHERE sp.statut = 'termine')::DECIMAL
            / NULLIF(COUNT(s.id), 0) * 100, 1
        )
    FROM lms_profiles p
    JOIN lms_cohorte_membres cm  ON cm.profile_id = p.id
    JOIN lms_cohortes co         ON co.id = cm.cohorte_id
    JOIN lms_parcours_finance_config pfc
        ON  pfc.pathway_id = co.pathway_id
        AND pfc.financement_id IS NOT DISTINCT FROM co.financement_id   -- ← FIX
    JOIN lms_config_cours cc     ON cc.config_id = pfc.id
    JOIN lms_cours c             ON c.id = cc.cours_id
    JOIN lms_sequences seq       ON seq.cours_id = c.id
    JOIN lms_seances s           ON s.sequence_id = seq.id
    LEFT JOIN lms_session_progress sp
        ON sp.seance_id = s.id AND sp.profile_id = p_profile_id
    WHERE p.id = p_profile_id
    GROUP BY c.id, c.titre
    ORDER BY MAX(cc.ordre);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC admin : résumé progression par stagiaire ──────────────────────────
CREATE OR REPLACE FUNCTION admin_get_stagiaires_progress()
RETURNS TABLE (
    id                  uuid,
    nom                 text,
    prenom              text,
    cohorte_nom         text,
    seances_terminees   bigint,
    seances_total       bigint,
    quiz_count          bigint,
    quiz_avg_pct        numeric,
    devoirs_submitted   bigint,
    devoirs_pending     bigint,
    devoirs_graded      bigint,
    last_activity       timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT
        p.id,
        p.nom::text,
        p.prenom::text,
        co.nom::text                                                           AS cohorte_nom,
        COUNT(DISTINCT sp.seance_id) FILTER (WHERE sp.statut = 'termine')     AS seances_terminees,
        COUNT(DISTINCT s.id)                                                   AS seances_total,
        COUNT(DISTINCT qs.id)                                                  AS quiz_count,
        ROUND(
            AVG(CASE WHEN qs.max_score > 0
                     THEN qs.score / qs.max_score * 100 END)::numeric, 1
        )                                                                      AS quiz_avg_pct,
        COUNT(DISTINCT ds.id)                                                  AS devoirs_submitted,
        COUNT(DISTINCT ds.id) FILTER (WHERE ds.note IS NULL)                  AS devoirs_pending,
        COUNT(DISTINCT ds.id) FILTER (WHERE ds.note IS NOT NULL)              AS devoirs_graded,
        GREATEST(
            MAX(sp.date_completion),
            MAX(qs.submitted_at),
            MAX(ds.submitted_at)
        )                                                                      AS last_activity
    FROM lms_profiles p
    LEFT JOIN lms_cohorte_membres cm  ON cm.profile_id  = p.id
    LEFT JOIN lms_cohortes co         ON co.id           = cm.cohorte_id
    LEFT JOIN lms_parcours_finance_config pfc
              ON  pfc.pathway_id = co.pathway_id
              AND pfc.financement_id IS NOT DISTINCT FROM co.financement_id   -- ← FIX
    LEFT JOIN lms_config_cours cc     ON cc.config_id    = pfc.id
    LEFT JOIN lms_sequences seq       ON seq.cours_id    = cc.cours_id
    LEFT JOIN lms_seances s           ON s.sequence_id   = seq.id
    LEFT JOIN lms_session_progress sp ON sp.profile_id   = p.id
    LEFT JOIN lms_quiz_submissions qs ON qs.stagiaire_id = p.id
    LEFT JOIN lms_devoir_submissions ds ON ds.stagiaire_id = p.id
    WHERE p.role = 'stagiaire'
    GROUP BY p.id, p.nom, p.prenom, co.nom
    ORDER BY p.nom, p.prenom;
$$;
