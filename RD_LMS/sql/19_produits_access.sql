-- ============================================================
-- LMS DASHBOA_RD — Étape 4 : Contrôle d'accès par produits
-- ============================================================
-- Logique générale :
--   • Si aucun produit n'est assigné (ni à la cohorte, ni en
--     individuel), le comportement est inchangé : accès complet.
--   • Dès qu'un produit est assigné, seul le contenu inclus
--     dans un produit actif est accessible.
--   • Les produits de la cohorte + les produits individuels
--     du stagiaire sont fusionnés (UNION).
--
-- Granularité des produit_items :
--   item_type = 'module'   → tout le module (séquences + séances)
--   item_type = 'sequence' → uniquement cette séquence (+ ses séances)
--   item_type = 'seance'   → uniquement cette séance
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- RPC 1 (mise à jour) : Cours accessibles pour un stagiaire
-- ────────────────────────────────────────────────────────────
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
    WITH all_produit_ids AS (
        -- Produits de la cohorte du stagiaire
        SELECT cp.produit_id
        FROM lms_cohorte_produits cp
        JOIN lms_cohorte_membres cm ON cm.cohorte_id = cp.cohorte_id
        WHERE cm.profile_id = p_profile_id
        UNION
        -- Produits individuels du stagiaire
        SELECT pp.produit_id
        FROM lms_profile_produits pp
        WHERE pp.profile_id = p_profile_id
    ),
    allowed_cours_ids AS (
        -- Via item_type = 'module'
        SELECT pi.cours_id AS id
        FROM lms_produit_items pi
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'module'
          AND pi.cours_id IS NOT NULL

        UNION

        -- Via item_type = 'sequence' (le module parent est accessible)
        SELECT seq.cours_id AS id
        FROM lms_produit_items pi
        JOIN lms_sequences seq ON seq.id = pi.sequence_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'sequence'
          AND pi.sequence_id IS NOT NULL

        UNION

        -- Via item_type = 'seance' (remonter jusqu'au module)
        SELECT seq.cours_id AS id
        FROM lms_produit_items pi
        JOIN lms_seances s   ON s.id = pi.seance_id
        JOIN lms_sequences seq ON seq.id = s.sequence_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'seance'
          AND pi.seance_id IS NOT NULL
    )
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
      AND (
          -- Pas de produits → accès complet (comportement historique)
          NOT EXISTS (SELECT 1 FROM all_produit_ids)
          OR
          -- Produits présents → seulement les modules couverts
          c.id IN (SELECT id FROM allowed_cours_ids)
      )
    ORDER BY cc.ordre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ────────────────────────────────────────────────────────────
-- RPC 2 (mise à jour) : Résumé de progression dashboard
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_student_progress_summary(p_profile_id UUID)
RETURNS TABLE (
    cours_id UUID, cours_titre TEXT,
    total_seances INT, terminees INT, pourcentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH all_produit_ids AS (
        SELECT cp.produit_id
        FROM lms_cohorte_produits cp
        JOIN lms_cohorte_membres cm ON cm.cohorte_id = cp.cohorte_id
        WHERE cm.profile_id = p_profile_id
        UNION
        SELECT pp.produit_id
        FROM lms_profile_produits pp
        WHERE pp.profile_id = p_profile_id
    ),
    allowed_cours_ids AS (
        SELECT pi.cours_id AS id
        FROM lms_produit_items pi
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'module' AND pi.cours_id IS NOT NULL
        UNION
        SELECT seq.cours_id AS id
        FROM lms_produit_items pi
        JOIN lms_sequences seq ON seq.id = pi.sequence_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'sequence' AND pi.sequence_id IS NOT NULL
        UNION
        SELECT seq.cours_id AS id
        FROM lms_produit_items pi
        JOIN lms_seances s     ON s.id = pi.seance_id
        JOIN lms_sequences seq ON seq.id = s.sequence_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'seance' AND pi.seance_id IS NOT NULL
    ),
    -- Séances réellement accessibles pour le calcul de progression
    allowed_seance_ids AS (
        -- Via module entier
        SELECT s.id
        FROM lms_produit_items pi
        JOIN lms_sequences seq ON seq.cours_id = pi.cours_id
        JOIN lms_seances s     ON s.sequence_id = seq.id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'module' AND pi.cours_id IS NOT NULL
        UNION
        -- Via séquence
        SELECT s.id
        FROM lms_produit_items pi
        JOIN lms_seances s ON s.sequence_id = pi.sequence_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'sequence' AND pi.sequence_id IS NOT NULL
        UNION
        -- Via séance directe
        SELECT pi.seance_id AS id
        FROM lms_produit_items pi
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'seance' AND pi.seance_id IS NOT NULL
    )
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
    JOIN lms_cohorte_membres cm ON cm.profile_id = p.id
    JOIN lms_cohortes co ON co.id = cm.cohorte_id
    JOIN lms_parcours_finance_config pfc
        ON pfc.pathway_id = co.pathway_id
       AND pfc.financement_id = co.financement_id
    JOIN lms_config_cours cc ON cc.config_id = pfc.id
    JOIN lms_cours c ON c.id = cc.cours_id
    JOIN lms_sequences seq ON seq.cours_id = c.id
    JOIN lms_seances s ON s.sequence_id = seq.id
    LEFT JOIN lms_session_progress sp
        ON sp.seance_id = s.id AND sp.profile_id = p_profile_id
    WHERE p.id = p_profile_id
      -- Filtre module
      AND (
          NOT EXISTS (SELECT 1 FROM all_produit_ids)
          OR c.id IN (SELECT id FROM allowed_cours_ids)
      )
      -- Filtre séance (pour ne compter que les séances accessibles)
      AND (
          NOT EXISTS (SELECT 1 FROM all_produit_ids)
          OR s.id IN (SELECT id FROM allowed_seance_ids)
      )
    GROUP BY c.id, c.titre
    ORDER BY MAX(cc.ordre);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ────────────────────────────────────────────────────────────
-- RPC 3 (nouveau) : Séquences accessibles d'un module
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_student_sequences(
    p_profile_id UUID,
    p_cours_id   UUID
)
RETURNS TABLE (
    id        UUID,
    titre     TEXT,
    objectif  TEXT,
    image_url TEXT,
    ordre     INT
) AS $$
BEGIN
    RETURN QUERY
    WITH all_produit_ids AS (
        SELECT cp.produit_id
        FROM lms_cohorte_produits cp
        JOIN lms_cohorte_membres cm ON cm.cohorte_id = cp.cohorte_id
        WHERE cm.profile_id = p_profile_id
        UNION
        SELECT pp.produit_id
        FROM lms_profile_produits pp
        WHERE pp.profile_id = p_profile_id
    ),
    allowed_seq_ids AS (
        -- Via module entier (toutes les séquences du module sont accessibles)
        SELECT seq.id
        FROM lms_sequences seq
        JOIN lms_produit_items pi ON pi.cours_id = seq.cours_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'module'
          AND seq.cours_id = p_cours_id

        UNION

        -- Via séquence directe
        SELECT pi.sequence_id AS id
        FROM lms_produit_items pi
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'sequence'
          AND pi.sequence_id IN (
              SELECT id FROM lms_sequences WHERE cours_id = p_cours_id
          )

        UNION

        -- Via séance (la séquence parente est accessible pour navigation)
        SELECT s.sequence_id AS id
        FROM lms_produit_items pi
        JOIN lms_seances s ON s.id = pi.seance_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'seance'
          AND s.sequence_id IN (
              SELECT id FROM lms_sequences WHERE cours_id = p_cours_id
          )
    )
    SELECT
        seq.id,
        seq.titre::TEXT,
        seq.objectif::TEXT,
        seq.image_url::TEXT,
        seq.ordre
    FROM lms_sequences seq
    WHERE seq.cours_id = p_cours_id
      AND (
          NOT EXISTS (SELECT 1 FROM all_produit_ids)
          OR seq.id IN (SELECT id FROM allowed_seq_ids)
      )
    ORDER BY seq.ordre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ────────────────────────────────────────────────────────────
-- RPC 4 (nouveau) : Séances accessibles d'une séquence + progression
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_student_seances(
    p_profile_id  UUID,
    p_sequence_id UUID
)
RETURNS TABLE (
    id              UUID,
    titre           TEXT,
    duree_heures    INT,
    type            TEXT,
    contenu         TEXT,
    ordre           INT,
    statut          TEXT,
    score           NUMERIC,
    date_completion TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH seq_cours AS (
        -- Module auquel appartient cette séquence (pour la règle 'module')
        SELECT cours_id FROM lms_sequences WHERE id = p_sequence_id
    ),
    all_produit_ids AS (
        SELECT cp.produit_id
        FROM lms_cohorte_produits cp
        JOIN lms_cohorte_membres cm ON cm.cohorte_id = cp.cohorte_id
        WHERE cm.profile_id = p_profile_id
        UNION
        SELECT pp.produit_id
        FROM lms_profile_produits pp
        WHERE pp.profile_id = p_profile_id
    ),
    allowed_seance_ids AS (
        -- Via module entier (toutes les séances de la séquence accessibles)
        SELECT s.id
        FROM lms_seances s
        CROSS JOIN seq_cours
        JOIN lms_produit_items pi ON pi.cours_id = seq_cours.cours_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'module'
          AND s.sequence_id = p_sequence_id

        UNION

        -- Via séquence directe (toutes les séances de la séquence accessibles)
        SELECT s.id
        FROM lms_seances s
        JOIN lms_produit_items pi ON pi.sequence_id = p_sequence_id
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'sequence'
          AND s.sequence_id = p_sequence_id

        UNION

        -- Via séance directe
        SELECT pi.seance_id AS id
        FROM lms_produit_items pi
        WHERE pi.produit_id IN (SELECT produit_id FROM all_produit_ids)
          AND pi.item_type = 'seance'
          AND pi.seance_id IN (
              SELECT id FROM lms_seances WHERE sequence_id = p_sequence_id
          )
    )
    SELECT
        s.id,
        s.titre::TEXT,
        s.duree_heures,
        s.type::TEXT,
        s.contenu::TEXT,
        s.ordre,
        COALESCE(sp.statut, 'non_commence')::TEXT,
        sp.score,
        sp.date_completion
    FROM lms_seances s
    LEFT JOIN lms_session_progress sp
        ON sp.seance_id = s.id AND sp.profile_id = p_profile_id
    WHERE s.sequence_id = p_sequence_id
      AND (
          NOT EXISTS (SELECT 1 FROM all_produit_ids)
          OR s.id IN (SELECT id FROM allowed_seance_ids)
      )
    ORDER BY s.ordre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
