-- ═══════════════════════════════════════════════════════════════════════════
--  16_clone_sequence_seance.sql
--  • admin_clone_sequence  — copie une séquence (+ ses séances) vers un module
--  • admin_clone_seance    — copie une séance vers une séquence
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
--  Cloner une séquence (+ toutes ses séances) vers un module de destination
--  Retourne l'UUID de la nouvelle séquence créée
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_clone_sequence(
    p_source_seq_id  uuid,
    p_dest_cours_id  uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_new_seq_id   uuid;
    v_next_ordre   int;
    r_seance       record;
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    -- Prochain ordre dans le module de destination
    SELECT COALESCE(MAX(ordre) + 1, 0)
    INTO v_next_ordre
    FROM lms_sequences
    WHERE cours_id = p_dest_cours_id;

    -- Copier la séquence
    INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
    SELECT p_dest_cours_id,
           titre || ' (copie)',
           objectif,
           v_next_ordre
    FROM lms_sequences
    WHERE id = p_source_seq_id
    RETURNING id INTO v_new_seq_id;

    -- Copier toutes les séances
    FOR r_seance IN
        SELECT * FROM lms_seances
        WHERE sequence_id = p_source_seq_id
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

    RETURN v_new_seq_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_clone_sequence TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
--  Cloner une séance vers une séquence de destination
--  Retourne l'UUID de la nouvelle séance créée
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_clone_seance(
    p_source_seance_id uuid,
    p_dest_seq_id      uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_new_seance_id uuid;
    v_next_ordre    int;
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    -- Prochain ordre dans la séquence de destination
    SELECT COALESCE(MAX(ordre) + 1, 0)
    INTO v_next_ordre
    FROM lms_seances
    WHERE sequence_id = p_dest_seq_id;

    -- Copier la séance (contenu + blocs inclus)
    INSERT INTO lms_seances (
        sequence_id, titre, type, duree_heures, ordre,
        contenu, contenu_blocks
    )
    SELECT
        p_dest_seq_id,
        titre || ' (copie)',
        type,
        duree_heures,
        v_next_ordre,
        contenu,
        contenu_blocks
    FROM lms_seances
    WHERE id = p_source_seance_id
    RETURNING id INTO v_new_seance_id;

    RETURN v_new_seance_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_clone_seance TO authenticated;
