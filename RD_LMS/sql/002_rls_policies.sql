-- ============================================================
-- LMS DASHBOA_RD — Row Level Security v1.0  (idempotent)
-- ============================================================

ALTER TABLE lms_titres_pro               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_certificats_ccp          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_activites                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_competences              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_competences_transversales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_cours                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_sequences                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_seances                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_pathways                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_financements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_parcours_finance_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_config_cours             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_cohortes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_cohorte_membres          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_session_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_import_logs              ENABLE ROW LEVEL SECURITY;

-- Utilitaire rôle courant (SECURITY DEFINER = accès sans récursion RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM lms_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── lms_profiles ──────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select"      ON lms_profiles;
CREATE POLICY "profiles_select" ON lms_profiles
    FOR SELECT USING (
        id = auth.uid()
        OR get_my_role() IN ('admin','formateur','formateur_editeur')
    );
DROP POLICY IF EXISTS "profiles_update_own"  ON lms_profiles;
CREATE POLICY "profiles_update_own" ON lms_profiles
    FOR UPDATE USING (id = auth.uid());
DROP POLICY IF EXISTS "profiles_admin_all"   ON lms_profiles;
CREATE POLICY "profiles_admin_all" ON lms_profiles
    FOR ALL USING (get_my_role() = 'admin');

-- ── Référentiel — lecture authentifiés, écriture admin ────
DROP POLICY IF EXISTS "ref_read_titres"     ON lms_titres_pro;
CREATE POLICY "ref_read_titres"     ON lms_titres_pro               FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ref_read_ccp"        ON lms_certificats_ccp;
CREATE POLICY "ref_read_ccp"        ON lms_certificats_ccp           FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ref_read_activites"  ON lms_activites;
CREATE POLICY "ref_read_activites"  ON lms_activites                 FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ref_read_comp"       ON lms_competences;
CREATE POLICY "ref_read_comp"       ON lms_competences               FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ref_read_transv"     ON lms_competences_transversales;
CREATE POLICY "ref_read_transv"     ON lms_competences_transversales FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ref_write_titres"    ON lms_titres_pro;
CREATE POLICY "ref_write_titres"    ON lms_titres_pro               FOR ALL USING (get_my_role() = 'admin');
DROP POLICY IF EXISTS "ref_write_ccp"       ON lms_certificats_ccp;
CREATE POLICY "ref_write_ccp"       ON lms_certificats_ccp           FOR ALL USING (get_my_role() = 'admin');
DROP POLICY IF EXISTS "ref_write_activites" ON lms_activites;
CREATE POLICY "ref_write_activites" ON lms_activites                 FOR ALL USING (get_my_role() = 'admin');
DROP POLICY IF EXISTS "ref_write_comp"      ON lms_competences;
CREATE POLICY "ref_write_comp"      ON lms_competences               FOR ALL USING (get_my_role() = 'admin');
DROP POLICY IF EXISTS "ref_write_transv"    ON lms_competences_transversales;
CREATE POLICY "ref_write_transv"    ON lms_competences_transversales FOR ALL USING (get_my_role() = 'admin');

-- ── Contenu pédagogique ────────────────────────────────────
DROP POLICY IF EXISTS "cours_read"      ON lms_cours;
CREATE POLICY "cours_read"     ON lms_cours     FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "sequences_read"  ON lms_sequences;
CREATE POLICY "sequences_read" ON lms_sequences FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "seances_read"    ON lms_seances;
CREATE POLICY "seances_read"   ON lms_seances   FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cours_write"     ON lms_cours;
CREATE POLICY "cours_write"     ON lms_cours     FOR ALL USING (get_my_role() IN ('admin','formateur_editeur'));
DROP POLICY IF EXISTS "sequences_write" ON lms_sequences;
CREATE POLICY "sequences_write" ON lms_sequences FOR ALL USING (get_my_role() IN ('admin','formateur_editeur'));
DROP POLICY IF EXISTS "seances_write"   ON lms_seances;
CREATE POLICY "seances_write"   ON lms_seances   FOR ALL USING (get_my_role() IN ('admin','formateur_editeur'));

-- ── Parcours & Financements ────────────────────────────────
DROP POLICY IF EXISTS "pathways_read"      ON lms_pathways;
CREATE POLICY "pathways_read"      ON lms_pathways               FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "finance_read"       ON lms_financements;
CREATE POLICY "finance_read"       ON lms_financements            FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "pfc_read"           ON lms_parcours_finance_config;
CREATE POLICY "pfc_read"           ON lms_parcours_finance_config FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "config_cours_read"  ON lms_config_cours;
CREATE POLICY "config_cours_read"  ON lms_config_cours            FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "pathways_admin"     ON lms_pathways;
CREATE POLICY "pathways_admin"     ON lms_pathways               FOR ALL USING (get_my_role() = 'admin');
DROP POLICY IF EXISTS "finance_admin"      ON lms_financements;
CREATE POLICY "finance_admin"      ON lms_financements            FOR ALL USING (get_my_role() = 'admin');
DROP POLICY IF EXISTS "pfc_admin"          ON lms_parcours_finance_config;
CREATE POLICY "pfc_admin"          ON lms_parcours_finance_config FOR ALL USING (get_my_role() = 'admin');
DROP POLICY IF EXISTS "config_cours_write" ON lms_config_cours;
CREATE POLICY "config_cours_write" ON lms_config_cours            FOR ALL USING (get_my_role() IN ('admin','formateur_editeur'));

-- ── Cohortes ───────────────────────────────────────────────
DROP POLICY IF EXISTS "cohortes_read"  ON lms_cohortes;
CREATE POLICY "cohortes_read" ON lms_cohortes
    FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cohortes_admin" ON lms_cohortes;
CREATE POLICY "cohortes_admin" ON lms_cohortes
    FOR ALL USING (get_my_role() = 'admin');
DROP POLICY IF EXISTS "membres_read"   ON lms_cohorte_membres;
CREATE POLICY "membres_read" ON lms_cohorte_membres
    FOR SELECT USING (
        profile_id = auth.uid()
        OR get_my_role() IN ('admin','formateur','formateur_editeur')
    );
DROP POLICY IF EXISTS "membres_admin"  ON lms_cohorte_membres;
CREATE POLICY "membres_admin" ON lms_cohorte_membres
    FOR ALL USING (get_my_role() = 'admin');

-- ── Progression — politique la plus critique ──────────────
DROP POLICY IF EXISTS "progress_select" ON lms_session_progress;
CREATE POLICY "progress_select" ON lms_session_progress
    FOR SELECT USING (
        profile_id = auth.uid()
        OR get_my_role() IN ('admin','formateur','formateur_editeur')
    );
DROP POLICY IF EXISTS "progress_insert" ON lms_session_progress;
CREATE POLICY "progress_insert" ON lms_session_progress
    FOR INSERT WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "progress_update" ON lms_session_progress;
CREATE POLICY "progress_update" ON lms_session_progress
    FOR UPDATE USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "progress_delete" ON lms_session_progress;
CREATE POLICY "progress_delete" ON lms_session_progress
    FOR DELETE USING (get_my_role() = 'admin');

-- ── Logs import ────────────────────────────────────────────
DROP POLICY IF EXISTS "import_logs_admin" ON lms_import_logs;
CREATE POLICY "import_logs_admin" ON lms_import_logs
    FOR ALL USING (get_my_role() = 'admin');
