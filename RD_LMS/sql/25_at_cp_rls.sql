-- ═══════════════════════════════════════════════════════════════
-- 25_at_cp_rls.sql
-- RLS pour lms_certificats_ccp, lms_activites, lms_competences
-- Fix contrainte unique code CCP : per-titre plutôt que globale
-- ═══════════════════════════════════════════════════════════════

-- ── Fix contrainte UNIQUE sur lms_certificats_ccp.code ───────
-- "CCP1" peut exister dans plusieurs titres différents
ALTER TABLE lms_certificats_ccp
    DROP CONSTRAINT IF EXISTS lms_certificats_ccp_code_key;

ALTER TABLE lms_certificats_ccp
    DROP CONSTRAINT IF EXISTS lms_certificats_ccp_titre_code_key;

ALTER TABLE lms_certificats_ccp
    ADD CONSTRAINT lms_certificats_ccp_titre_code_key
    UNIQUE (titre_pro_id, code);

-- ── RLS : lms_certificats_ccp ─────────────────────────────────
ALTER TABLE lms_certificats_ccp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ccp_select_authenticated" ON lms_certificats_ccp;
CREATE POLICY "ccp_select_authenticated"
    ON lms_certificats_ccp FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "ccp_admin_all" ON lms_certificats_ccp;
CREATE POLICY "ccp_admin_all"
    ON lms_certificats_ccp FOR ALL
    TO authenticated
    USING     (get_my_role() = 'admin')
    WITH CHECK (get_my_role() = 'admin');

-- ── RLS : lms_activites ───────────────────────────────────────
ALTER TABLE lms_activites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activites_select_authenticated" ON lms_activites;
CREATE POLICY "activites_select_authenticated"
    ON lms_activites FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "activites_admin_all" ON lms_activites;
CREATE POLICY "activites_admin_all"
    ON lms_activites FOR ALL
    TO authenticated
    USING     (get_my_role() = 'admin')
    WITH CHECK (get_my_role() = 'admin');

-- ── RLS : lms_competences ─────────────────────────────────────
ALTER TABLE lms_competences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competences_select_authenticated" ON lms_competences;
CREATE POLICY "competences_select_authenticated"
    ON lms_competences FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "competences_admin_all" ON lms_competences;
CREATE POLICY "competences_admin_all"
    ON lms_competences FOR ALL
    TO authenticated
    USING     (get_my_role() = 'admin')
    WITH CHECK (get_my_role() = 'admin');

-- ── RLS : lms_competences_transversales ──────────────────────
ALTER TABLE lms_competences_transversales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comp_trans_select" ON lms_competences_transversales;
CREATE POLICY "comp_trans_select"
    ON lms_competences_transversales FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "comp_trans_admin_all" ON lms_competences_transversales;
CREATE POLICY "comp_trans_admin_all"
    ON lms_competences_transversales FOR ALL
    TO authenticated
    USING     (get_my_role() = 'admin')
    WITH CHECK (get_my_role() = 'admin');

-- ── Index utiles ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ccp_titre_pro    ON lms_certificats_ccp (titre_pro_id);
CREATE INDEX IF NOT EXISTS idx_activites_ccp    ON lms_activites       (ccp_id);
CREATE INDEX IF NOT EXISTS idx_competences_at   ON lms_competences     (activite_id);
