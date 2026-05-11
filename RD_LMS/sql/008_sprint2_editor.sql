-- ============================================================
-- LMS DASHBOA_RD — Éditeur de structure Sprint 2/3
-- ============================================================

-- ── Migration : colonne blocs JSON pour l'éditeur ────────────
ALTER TABLE lms_seances ADD COLUMN IF NOT EXISTS contenu_blocks JSONB;

-- ── RPC : Configurations d'un parcours ───────────────────────
CREATE OR REPLACE FUNCTION admin_get_pathway_configs(p_pathway_id UUID)
RETURNS TABLE (
    config_id UUID, financement_id UUID, financement_nom TEXT,
    duree_totale INT, nb_cours BIGINT
) AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY
    SELECT pfc.id, pfc.financement_id, f.nom::TEXT,
           pfc.duree_totale_heures,
           COUNT(cc.id)
    FROM lms_parcours_finance_config pfc
    LEFT JOIN lms_financements f ON f.id = pfc.financement_id
    LEFT JOIN lms_config_cours cc ON cc.config_id = pfc.id
    WHERE pfc.pathway_id = p_pathway_id
    GROUP BY pfc.id, pfc.financement_id, f.nom, pfc.duree_totale_heures
    ORDER BY f.nom;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC : Arbre complet d'une configuration ───────────────────
CREATE OR REPLACE FUNCTION admin_get_pathway_tree(p_config_id UUID)
RETURNS JSONB AS $$
DECLARE result JSONB;
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    SELECT jsonb_agg(
        jsonb_build_object(
            'cours_id',        c.id,
            'titre',           c.titre,
            'description',     c.description,
            'obligatoire',     cc.obligatoire,
            'ordre',           cc.ordre,
            'config_cours_id', cc.id,
            'sequences', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id',       seq.id,
                        'titre',    seq.titre,
                        'objectif', seq.objectif,
                        'ordre',    seq.ordre,
                        'seances',  COALESCE((
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'id',           s.id,
                                    'titre',        s.titre,
                                    'duree_heures', s.duree_heures,
                                    'type',         s.type,
                                    'ordre',        s.ordre,
                                    'has_content',  (s.contenu IS NOT NULL AND length(s.contenu) > 10)
                                ) ORDER BY s.ordre
                            ) FROM lms_seances s WHERE s.sequence_id = seq.id
                        ), '[]'::jsonb)
                    ) ORDER BY seq.ordre
                ) FROM lms_sequences seq WHERE seq.cours_id = c.id
            ), '[]'::jsonb)
        ) ORDER BY cc.ordre
    ) INTO result
    FROM lms_config_cours cc
    JOIN lms_cours c ON c.id = cc.cours_id
    WHERE cc.config_id = p_config_id;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC : Sauvegarder le contenu d'une séance ─────────────────
CREATE OR REPLACE FUNCTION admin_save_seance_content(
    p_seance_id UUID, p_contenu TEXT, p_blocks JSONB
)
RETURNS VOID AS $$
BEGIN
    IF get_my_role() NOT IN ('admin', 'formateur_editeur') THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;
    UPDATE lms_seances
    SET contenu = p_contenu, contenu_blocks = p_blocks
    WHERE id = p_seance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC : Réordonner les modules d'une config ─────────────────
CREATE OR REPLACE FUNCTION admin_reorder_config_cours(
    p_config_cours_ids UUID[], p_ordres INT[]
)
RETURNS VOID AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    FOR i IN 1..array_length(p_config_cours_ids, 1) LOOP
        UPDATE lms_config_cours SET ordre = p_ordres[i]
        WHERE id = p_config_cours_ids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC : Réordonner les séquences ────────────────────────────
CREATE OR REPLACE FUNCTION admin_reorder_sequences(
    p_sequence_ids UUID[], p_ordres INT[]
)
RETURNS VOID AS $$
BEGIN
    IF get_my_role() NOT IN ('admin', 'formateur_editeur') THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;
    FOR i IN 1..array_length(p_sequence_ids, 1) LOOP
        UPDATE lms_sequences SET ordre = p_ordres[i]
        WHERE id = p_sequence_ids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC : Réordonner les séances ──────────────────────────────
CREATE OR REPLACE FUNCTION admin_reorder_seances(
    p_seance_ids UUID[], p_ordres INT[]
)
RETURNS VOID AS $$
BEGIN
    IF get_my_role() NOT IN ('admin', 'formateur_editeur') THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;
    FOR i IN 1..array_length(p_seance_ids, 1) LOOP
        UPDATE lms_seances SET ordre = p_ordres[i]
        WHERE id = p_seance_ids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC : Créer un module dans une config ─────────────────────
CREATE OR REPLACE FUNCTION admin_create_cours_in_config(
    p_config_id UUID,
    p_titre TEXT, p_description TEXT, p_objectif TEXT,
    p_duree_heures INT, p_obligatoire BOOLEAN
)
RETURNS UUID AS $$
DECLARE
    new_cours_id UUID;
    max_ordre    INT;
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    INSERT INTO lms_cours (titre, description, objectif_pedagogique, duree_heures)
    VALUES (p_titre, p_description, p_objectif, p_duree_heures)
    RETURNING id INTO new_cours_id;

    SELECT COALESCE(MAX(ordre), 0) + 1 INTO max_ordre
    FROM lms_config_cours WHERE config_id = p_config_id;

    INSERT INTO lms_config_cours (config_id, cours_id, obligatoire, ordre, duree_heures)
    VALUES (p_config_id, new_cours_id, p_obligatoire, max_ordre, p_duree_heures);

    RETURN new_cours_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC : Sauvegarder brouillon (blocs JSON uniquement) ───────
-- Contrairement à admin_save_seance_content, cette fonction ne
-- touche PAS à la colonne `contenu` que les stagiaires voient.
CREATE OR REPLACE FUNCTION admin_save_seance_draft(
    p_seance_id UUID, p_blocks JSONB
)
RETURNS VOID AS $$
BEGIN
    IF get_my_role() NOT IN ('admin', 'formateur_editeur') THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;
    UPDATE lms_seances
    SET contenu_blocks = p_blocks
    WHERE id = p_seance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
