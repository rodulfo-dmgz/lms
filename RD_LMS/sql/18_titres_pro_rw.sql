-- ═══════════════════════════════════════════════════════════════════════════
--  18_titres_pro_rw.sql
--  Autorise les admins à créer / modifier / supprimer des titres pro depuis le LMS.
--  La table lms_titres_pro existe déjà. On s'assure que RLS est activé et que
--  les admins (role = 'admin' dans lms_profiles) ont les droits INSERT/UPDATE/DELETE.
-- ═══════════════════════════════════════════════════════════════════════════

-- Activer RLS si ce n'est pas déjà le cas
ALTER TABLE lms_titres_pro ENABLE ROW LEVEL SECURITY;

-- Lecture publique (authenticated) — les parcours en ont besoin
DROP POLICY IF EXISTS "titres_pro_select_authenticated" ON lms_titres_pro;
CREATE POLICY "titres_pro_select_authenticated"
    ON lms_titres_pro FOR SELECT
    TO authenticated
    USING (true);

-- Écriture réservée aux admins
DROP POLICY IF EXISTS "titres_pro_insert_admin" ON lms_titres_pro;
CREATE POLICY "titres_pro_insert_admin"
    ON lms_titres_pro FOR INSERT
    TO authenticated
    WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "titres_pro_update_admin" ON lms_titres_pro;
CREATE POLICY "titres_pro_update_admin"
    ON lms_titres_pro FOR UPDATE
    TO authenticated
    USING     (get_my_role() = 'admin')
    WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "titres_pro_delete_admin" ON lms_titres_pro;
CREATE POLICY "titres_pro_delete_admin"
    ON lms_titres_pro FOR DELETE
    TO authenticated
    USING (get_my_role() = 'admin');
