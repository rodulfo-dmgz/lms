-- ============================================================
-- LMS DASHBOA_RD — Notifications & Progression admin
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- ─── Table notifications ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_notifications (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type        text        NOT NULL CHECK (type IN (
                                'devoir_submitted','devoir_graded',
                                'quiz_submitted','system')),
    title       text        NOT NULL,
    message     text,
    link        text,
    read_at     timestamptz DEFAULT NULL,
    created_at  timestamptz DEFAULT now(),
    metadata    jsonb       DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS lms_notif_user_date_idx
    ON lms_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lms_notif_unread_idx
    ON lms_notifications(user_id)
    WHERE read_at IS NULL;

ALTER TABLE lms_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON lms_notifications;
CREATE POLICY "notif_select_own" ON lms_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_update_own" ON lms_notifications;
CREATE POLICY "notif_update_own" ON lms_notifications
    FOR UPDATE USING (auth.uid() = user_id);


-- ─── RPC : notifier tout le staff (admin + formateur) ────────
CREATE OR REPLACE FUNCTION notify_staff(
    p_type     text,
    p_title    text,
    p_message  text,
    p_link     text    DEFAULT NULL,
    p_metadata jsonb   DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO lms_notifications (user_id, type, title, message, link, metadata)
    SELECT p.id, p_type, p_title, p_message, p_link, p_metadata
    FROM   lms_profiles p
    WHERE  p.role IN ('admin', 'formateur', 'formateur_editeur');
END;
$$;

-- ─── RPC : notifier un utilisateur spécifique ────────────────
CREATE OR REPLACE FUNCTION notify_user(
    p_user_id  uuid,
    p_type     text,
    p_title    text,
    p_message  text,
    p_link     text    DEFAULT NULL,
    p_metadata jsonb   DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO lms_notifications (user_id, type, title, message, link, metadata)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata);
END;
$$;

-- ─── RPC : marquer toutes mes notifications comme lues ───────
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE lms_notifications
    SET    read_at = now()
    WHERE  user_id  = auth.uid()
      AND  read_at IS NULL;
END;
$$;


-- ─── RPC admin : résumé progression par stagiaire ────────────
-- Retourne une ligne par stagiaire avec toutes ses métriques.
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
              ON pfc.pathway_id = co.pathway_id
             AND pfc.financement_id = co.financement_id
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
