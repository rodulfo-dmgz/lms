-- ============================================================
-- LMS DASHBOA_RD — RPCs Console Admin v1.0
-- ============================================================

-- ── Statistiques tableau de bord admin ───────────────────────
CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS TABLE (nb_cohortes BIGINT, nb_stagiaires BIGINT, nb_pathways BIGINT, nb_cours BIGINT)
AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY SELECT
        (SELECT COUNT(*)::BIGINT FROM lms_cohortes),
        (SELECT COUNT(*)::BIGINT FROM lms_profiles WHERE role = 'stagiaire'),
        (SELECT COUNT(*)::BIGINT FROM lms_pathways),
        (SELECT COUNT(*)::BIGINT FROM lms_cours);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Liste complète des cohortes ───────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_cohortes()
RETURNS TABLE (
    id UUID, nom TEXT, date_debut DATE, date_fin DATE,
    pathway_id UUID, pathway_titre TEXT,
    financement_id UUID, financement_nom TEXT,
    nb_membres BIGINT
) AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY
    SELECT
        c.id, c.nom::TEXT, c.date_debut, c.date_fin,
        c.pathway_id, pw.titre::TEXT,
        c.financement_id, f.nom::TEXT,
        COUNT(cm.profile_id)
    FROM lms_cohortes c
    JOIN  lms_pathways pw ON pw.id = c.pathway_id
    LEFT JOIN lms_financements f ON f.id = c.financement_id
    LEFT JOIN lms_cohorte_membres cm ON cm.cohorte_id = c.id
    GROUP BY c.id, c.nom, c.date_debut, c.date_fin, c.pathway_id, pw.titre, c.financement_id, f.nom
    ORDER BY c.nom;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Membres d'une cohorte ─────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_cohorte_members(p_cohorte_id UUID)
RETURNS TABLE (
    profile_id UUID, civilite TEXT, nom TEXT, prenom TEXT,
    first_login BOOLEAN, date_inscription DATE
) AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY
    SELECT p.id, p.civilite::TEXT, p.nom::TEXT, p.prenom::TEXT,
           p.first_login, cm.date_inscription
    FROM lms_cohorte_membres cm
    JOIN lms_profiles p ON p.id = cm.profile_id
    WHERE cm.cohorte_id = p_cohorte_id
    ORDER BY p.nom, p.prenom;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Stagiaires disponibles (non membres d'une cohorte) ───────
CREATE OR REPLACE FUNCTION admin_get_available_stagiaires(p_cohorte_id UUID DEFAULT NULL)
RETURNS TABLE (id UUID, civilite TEXT, nom TEXT, prenom TEXT)
AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY
    SELECT p.id, p.civilite::TEXT, p.nom::TEXT, p.prenom::TEXT
    FROM lms_profiles p
    WHERE p.role = 'stagiaire'
      AND (
          p_cohorte_id IS NULL
          OR p.id NOT IN (
              SELECT cm.profile_id FROM lms_cohorte_membres cm
              WHERE cm.cohorte_id = p_cohorte_id
          )
      )
    ORDER BY p.nom, p.prenom;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Liste de tous les stagiaires avec leur cohorte ───────────
CREATE OR REPLACE FUNCTION admin_get_stagiaires()
RETURNS TABLE (
    id UUID, civilite TEXT, nom TEXT, prenom TEXT,
    role TEXT, first_login BOOLEAN, created_at TIMESTAMPTZ,
    cohorte_id UUID, cohorte_nom TEXT
) AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY
    SELECT
        p.id, p.civilite::TEXT, p.nom::TEXT, p.prenom::TEXT,
        p.role::TEXT, p.first_login, p.created_at,
        cm.cohorte_id, co.nom::TEXT
    FROM lms_profiles p
    LEFT JOIN lms_cohorte_membres cm ON cm.profile_id = p.id
    LEFT JOIN lms_cohortes co ON co.id = cm.cohorte_id
    ORDER BY p.nom, p.prenom;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Parcours avec leur titre pro ──────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_pathways()
RETURNS TABLE (
    id UUID, titre TEXT, description TEXT,
    titre_pro_id UUID, titre_pro_sigle TEXT, titre_pro_intitule TEXT
) AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY
    SELECT pw.id, pw.titre::TEXT, pw.description::TEXT,
           tp.id, tp.sigle::TEXT, tp.intitule::TEXT
    FROM lms_pathways pw
    LEFT JOIN lms_titres_pro tp ON tp.id = pw.titre_pro_id
    ORDER BY tp.intitule, pw.titre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Cours disponibles pour un parcours+financement ───────────
CREATE OR REPLACE FUNCTION admin_get_cours_for_config(p_pathway_id UUID, p_financement_id UUID)
RETURNS TABLE (
    cours_id UUID, cours_titre TEXT, obligatoire BOOLEAN,
    ordre INT, duree_heures INT, config_id UUID
) AS $$
BEGIN
    IF get_my_role() != 'admin' THEN RAISE EXCEPTION 'Accès non autorisé'; END IF;
    RETURN QUERY
    SELECT c.id, c.titre::TEXT, cc.obligatoire, cc.ordre, cc.duree_heures, cc.config_id
    FROM lms_parcours_finance_config pfc
    JOIN lms_config_cours cc ON cc.config_id = pfc.id
    JOIN lms_cours c ON c.id = cc.cours_id
    WHERE pfc.pathway_id = p_pathway_id AND pfc.financement_id = p_financement_id
    ORDER BY cc.ordre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
