-- ═══════════════════════════════════════════════════════════════════════════
--  10_parcours_clone.sql
--  • Migration : rend financement_id nullable dans lms_parcours_finance_config
--  • admin_create_pathway      — crée un nouveau parcours + config initiale
--  • admin_get_all_modules_for_clone — liste tous les modules de tous les
--                                     parcours (sélecteur de source pour clonage)
--  • admin_clone_cours         — copie complète d'un module vers une config
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
--  Migration : financement_id peut être NULL (parcours sans financement défini)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE lms_parcours_finance_config
    ALTER COLUMN financement_id DROP NOT NULL;

-- Index partiel : un seul enregistrement "sans financement" par parcours
-- (la contrainte UNIQUE existante ne couvre pas les NULLs en PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pathway_no_financement
    ON lms_parcours_finance_config (pathway_id)
    WHERE financement_id IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
--  Créer un nouveau parcours + sa première configuration
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_pathway(
    p_titre          text,
    p_description    text    DEFAULT NULL,
    p_titre_pro_id   uuid    DEFAULT NULL,
    p_financement_id uuid    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_pathway_id uuid;
    v_config_id  uuid;
BEGIN
    -- Vérification des droits
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    -- 1. Insérer le parcours
    INSERT INTO lms_pathways (titre, description, titre_pro_id)
    VALUES (p_titre, p_description, p_titre_pro_id)
    RETURNING id INTO v_pathway_id;

    -- 2. Créer la config initiale (financement optionnel)
    INSERT INTO lms_parcours_finance_config (pathway_id, financement_id)
    VALUES (v_pathway_id, p_financement_id)
    RETURNING id INTO v_config_id;

    RETURN json_build_object(
        'pathway_id', v_pathway_id,
        'config_id',  v_config_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_pathway TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
--  Lister tous les modules (cours) de tous les parcours pour la modale de clone
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_all_modules_for_clone()
RETURNS TABLE (
    pathway_id    uuid,
    pathway_titre text,
    cours_id      uuid,
    cours_titre   text,
    seq_count     bigint,
    seance_count  bigint
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT DISTINCT
        pw.id                                                           AS pathway_id,
        pw.titre                                                        AS pathway_titre,
        c.id                                                            AS cours_id,
        c.titre                                                         AS cours_titre,
        (SELECT COUNT(*) FROM lms_sequences  WHERE cours_id = c.id)    AS seq_count,
        (SELECT COUNT(*) FROM lms_seances sc
             JOIN lms_sequences sq ON sq.id = sc.sequence_id
             WHERE sq.cours_id = c.id)                                  AS seance_count
    FROM lms_pathways pw
    JOIN lms_parcours_finance_config  pc ON pc.pathway_id = pw.id
    JOIN lms_config_cours             cc ON cc.config_id  = pc.id
    JOIN lms_cours                     c ON c.id          = cc.cours_id
    ORDER BY pw.titre, c.titre;
$$;

GRANT EXECUTE ON FUNCTION admin_get_all_modules_for_clone TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
--  Copie complète d'un module (cours + séquences + séances) vers une config
--  Retourne l'UUID du nouveau cours créé
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_clone_cours(
    p_source_cours_id uuid,
    p_dest_config_id  uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_new_cours_id uuid;
    v_new_seq_id   uuid;
    v_next_ordre   int;
    r_seq          record;
    r_seance       record;
BEGIN
    -- Vérification des droits
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    -- 1. Copier lms_cours (obligatoire n'existe pas dans lms_cours, c'est dans lms_config_cours)
    INSERT INTO lms_cours (
        titre, description, objectif_pedagogique, duree_heures
    )
    SELECT
        titre || ' (copie)',
        description,
        objectif_pedagogique,
        duree_heures
    FROM lms_cours
    WHERE id = p_source_cours_id
    RETURNING id INTO v_new_cours_id;

    -- 2. Copier les séquences
    FOR r_seq IN
        SELECT * FROM lms_sequences
        WHERE cours_id = p_source_cours_id
        ORDER BY ordre
    LOOP
        INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
        VALUES (v_new_cours_id, r_seq.titre, r_seq.objectif, r_seq.ordre)
        RETURNING id INTO v_new_seq_id;

        -- 3. Copier les séances de chaque séquence
        FOR r_seance IN
            SELECT * FROM lms_seances
            WHERE sequence_id = r_seq.id
            ORDER BY ordre
        LOOP
            INSERT INTO lms_seances (
                sequence_id, titre, type, duree_heures, ordre,
                contenu, contenu_blocks
            )
            VALUES (
                v_new_seq_id,
                r_seance.titre,
                r_seance.type,
                r_seance.duree_heures,
                r_seance.ordre,
                r_seance.contenu,
                r_seance.contenu_blocks
            );
        END LOOP;
    END LOOP;

    -- 4. Déterminer le prochain ordre dans la config de destination
    SELECT COALESCE(MAX(ordre) + 1, 0)
    INTO v_next_ordre
    FROM lms_config_cours
    WHERE config_id = p_dest_config_id;

    -- 5. Lier le nouveau cours à la config de destination (obligatoire = true par défaut)
    INSERT INTO lms_config_cours (config_id, cours_id, ordre, obligatoire)
    VALUES (p_dest_config_id, v_new_cours_id, v_next_ordre, true);

    RETURN v_new_cours_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_clone_cours TO authenticated;
