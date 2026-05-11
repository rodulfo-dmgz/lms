-- ═══════════════════════════════════════════════════════════════════════════
--  17_template_instances.sql
--  Système "Modèle → Instance" inspiré de Moodle (mais en mieux)
--
--  MIGRATION ADDITIVE — aucune donnée existante n'est modifiée.
--  Tous les parcours existants restent fonctionnels (is_template=false, template_id=null).
--
--  Nouvelles colonnes :
--    lms_pathways.is_template       — true si ce parcours est un modèle
--    lms_pathways.template_id       — UUID du modèle source (NULL si modèle ou standalone)
--    lms_seances.template_seance_id — UUID de la séance source dans le modèle (future sync)
--
--  Nouvelles fonctions :
--    admin_toggle_template(p_pathway_id)           — bascule is_template true/false
--    admin_instantiate_template(p_template_id, p_cohorte_id) — crée une instance complète
--    admin_get_pathways()                          — redéfinie pour inclure is_template / template
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
--  1. NOUVELLES COLONNES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE lms_pathways
    ADD COLUMN IF NOT EXISTS is_template   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS template_id   UUID    REFERENCES lms_pathways(id) ON DELETE SET NULL;

ALTER TABLE lms_seances
    ADD COLUMN IF NOT EXISTS template_seance_id UUID REFERENCES lms_seances(id) ON DELETE SET NULL;

-- Index pour retrouver rapidement toutes les instances d'un modèle
CREATE INDEX IF NOT EXISTS idx_lms_pathways_template_id ON lms_pathways(template_id);
CREATE INDEX IF NOT EXISTS idx_lms_seances_template_id  ON lms_seances(template_seance_id);


-- ─────────────────────────────────────────────────────────────────────────────
--  2. REDÉFINITION DE admin_get_pathways — inclut is_template + template info
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS admin_get_pathways();

CREATE OR REPLACE FUNCTION admin_get_pathways()
RETURNS TABLE (
    id                 UUID,
    titre              TEXT,
    description        TEXT,
    titre_pro_id       UUID,
    titre_pro_sigle    TEXT,
    titre_pro_intitule TEXT,
    is_template        BOOLEAN,
    template_id        UUID,
    template_titre     TEXT,
    instance_count     BIGINT
) AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY
    SELECT
        pw.id,
        pw.titre::TEXT,
        pw.description::TEXT,
        tp.id,
        tp.sigle::TEXT,
        tp.intitule::TEXT,
        pw.is_template,
        pw.template_id,
        tpl.titre::TEXT        AS template_titre,
        (SELECT COUNT(*) FROM lms_pathways inst WHERE inst.template_id = pw.id)  AS instance_count
    FROM lms_pathways pw
    LEFT JOIN lms_titres_pro tp  ON tp.id  = pw.titre_pro_id
    LEFT JOIN lms_pathways   tpl ON tpl.id = pw.template_id
    ORDER BY pw.is_template DESC, tp.intitule, pw.titre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION admin_get_pathways TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
--  3. admin_toggle_template — marque / démarque un parcours comme modèle
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_toggle_template(p_pathway_id UUID)
RETURNS BOOLEAN         -- retourne la nouvelle valeur de is_template
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_new_val BOOLEAN;
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    UPDATE lms_pathways
    SET is_template = NOT is_template
    WHERE id = p_pathway_id
    RETURNING is_template INTO v_new_val;

    RETURN v_new_val;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_toggle_template TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
--  4. admin_instantiate_template — crée une instance complète pour une cohorte
--
--  Logique :
--    1. Vérifie que p_template_id est bien un modèle
--    2. Génère le nom : "{template.titre}_{cohorte.nom}_{année_courante}"
--    3. Clone lms_pathways (nouveau enregistrement, template_id = p_template_id)
--    4. Clone toutes les lms_parcours_finance_config du modèle
--    5. Pour chaque config :
--       a. Clone chaque lms_cours (sans le suffixe "(copie)")
--       b. Clone chaque lms_sequences
--       c. Clone chaque lms_seances (avec template_seance_id = id source)
--       d. Clone lms_config_cours reliant la nouvelle config au nouveau cours
--    6. Met à jour lms_cohortes.pathway_id = nouveau pathway
--    Retourne l'UUID du nouveau pathway créé
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_instantiate_template(
    p_template_id UUID,
    p_cohorte_id  UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_template          lms_pathways%ROWTYPE;
    v_cohorte_nom       TEXT;
    v_instance_name     TEXT;
    v_new_pathway_id    UUID;
    v_new_config_id     UUID;
    v_new_cours_id      UUID;
    v_new_seq_id        UUID;
    v_next_ordre        INT;
    r_config            RECORD;
    r_cc                RECORD;
    r_seq               RECORD;
    r_seance            RECORD;
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;

    -- ── Récupérer le modèle ──────────────────────────────────────
    SELECT * INTO v_template FROM lms_pathways WHERE id = p_template_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Modèle introuvable : %', p_template_id; END IF;
    IF NOT v_template.is_template THEN
        RAISE EXCEPTION 'Ce parcours n''est pas marqué comme modèle.';
    END IF;

    -- ── Récupérer le nom de la cohorte ───────────────────────────
    SELECT nom INTO v_cohorte_nom FROM lms_cohortes WHERE id = p_cohorte_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cohorte introuvable : %', p_cohorte_id; END IF;

    -- ── Générer le nom de l'instance ──────────────────────────────
    v_instance_name := v_template.titre
        || '_' || regexp_replace(v_cohorte_nom, '\s+', '_', 'g')
        || '_' || EXTRACT(YEAR FROM now())::TEXT;

    -- ── 1. Cloner le pathway ──────────────────────────────────────
    INSERT INTO lms_pathways (titre, description, titre_pro_id, is_template, template_id)
    VALUES (
        v_instance_name,
        v_template.description,
        v_template.titre_pro_id,
        false,
        p_template_id
    )
    RETURNING id INTO v_new_pathway_id;

    -- ── 2. Cloner les configurations (financement) ────────────────
    FOR r_config IN
        SELECT * FROM lms_parcours_finance_config
        WHERE pathway_id = p_template_id
    LOOP
        INSERT INTO lms_parcours_finance_config (
            pathway_id, financement_id, duree_totale_heures, notes
        )
        VALUES (
            v_new_pathway_id,
            r_config.financement_id,
            r_config.duree_totale_heures,
            r_config.notes
        )
        RETURNING id INTO v_new_config_id;

        -- ── 3. Cloner les modules (cours) de cette config ─────────
        FOR r_cc IN
            SELECT cc.*, c.id AS c_id, c.titre AS c_titre,
                   c.description AS c_desc, c.objectif_pedagogique AS c_obj,
                   c.duree_heures AS c_duree, c.est_transversal AS c_transv,
                   c.image_url AS c_img
            FROM lms_config_cours cc
            JOIN lms_cours c ON c.id = cc.cours_id
            WHERE cc.config_id = r_config.id
            ORDER BY cc.ordre
        LOOP
            -- Cloner le cours (même titre, pas de "(copie)")
            INSERT INTO lms_cours (
                titre, description, objectif_pedagogique,
                duree_heures, est_transversal, image_url
            )
            VALUES (
                r_cc.c_titre,
                r_cc.c_desc,
                r_cc.c_obj,
                r_cc.c_duree,
                r_cc.c_transv,
                r_cc.c_img
            )
            RETURNING id INTO v_new_cours_id;

            -- Cloner les séquences
            FOR r_seq IN
                SELECT * FROM lms_sequences
                WHERE cours_id = r_cc.c_id
                ORDER BY ordre
            LOOP
                INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
                VALUES (v_new_cours_id, r_seq.titre, r_seq.objectif, r_seq.ordre)
                RETURNING id INTO v_new_seq_id;

                -- Cloner les séances (avec template_seance_id pour traçabilité)
                FOR r_seance IN
                    SELECT * FROM lms_seances
                    WHERE sequence_id = r_seq.id
                    ORDER BY ordre
                LOOP
                    INSERT INTO lms_seances (
                        sequence_id, titre, type, duree_heures, ordre,
                        contenu, contenu_blocks, template_seance_id
                    )
                    VALUES (
                        v_new_seq_id,
                        r_seance.titre,
                        r_seance.type,
                        r_seance.duree_heures,
                        r_seance.ordre,
                        r_seance.contenu,
                        r_seance.contenu_blocks,
                        r_seance.id          -- lien vers la séance du modèle
                    );
                END LOOP;
            END LOOP;

            -- Lier le cours cloné à la config clonée
            INSERT INTO lms_config_cours (config_id, cours_id, ordre, obligatoire)
            VALUES (v_new_config_id, v_new_cours_id, r_cc.ordre, r_cc.obligatoire);

        END LOOP;
    END LOOP;

    -- ── 4. Rattacher la cohorte à la nouvelle instance ────────────
    UPDATE lms_cohortes
    SET pathway_id = v_new_pathway_id
    WHERE id = p_cohorte_id;

    RETURN v_new_pathway_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_instantiate_template TO authenticated;
