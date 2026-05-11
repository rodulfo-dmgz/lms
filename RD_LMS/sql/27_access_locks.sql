-- ══════════════════════════════════════════════════════════════
--  27_access_locks  (idempotent — safe to re-run)
--  Verrouillage d'accès granulaire par séance / séquence / cours
--  L'admin pose un verrou avec un code ; le stagiaire le lève.
-- ══════════════════════════════════════════════════════════════

-- ── Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_access_locks (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id   UUID        NOT NULL REFERENCES lms_profiles(id) ON DELETE CASCADE,
    item_type    TEXT        NOT NULL CHECK (item_type IN ('cours', 'sequence', 'seance')),
    item_id      UUID        NOT NULL,
    unlock_code  TEXT        NOT NULL,
    raison       TEXT,
    locked_by    UUID        REFERENCES lms_profiles(id),
    locked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    unlocked_at  TIMESTAMPTZ,
    is_active    BOOLEAN     NOT NULL DEFAULT true
);

-- ── Index partial unique : un seul verrou actif par (stagiaire, type, élément) ─
CREATE UNIQUE INDEX IF NOT EXISTS lms_access_locks_active_uq
    ON lms_access_locks (profile_id, item_type, item_id)
    WHERE is_active = true;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE lms_access_locks ENABLE ROW LEVEL SECURITY;

-- Recréer les policies proprement (DROP IF EXISTS + CREATE)
DROP POLICY IF EXISTS "locks_staff_all"      ON lms_access_locks;
DROP POLICY IF EXISTS "locks_stagiaire_read" ON lms_access_locks;

-- Admin / formateur : accès complet
CREATE POLICY "locks_staff_all" ON lms_access_locks
    FOR ALL TO authenticated
    USING   (get_my_role() IN ('admin', 'formateur'))
    WITH CHECK (get_my_role() IN ('admin', 'formateur'));

-- Stagiaire : lecture de ses verrous actifs uniquement
CREATE POLICY "locks_stagiaire_read" ON lms_access_locks
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid() AND is_active = true);


-- ── RPC : déverrouiller (côté stagiaire) ─────────────────────
--  Vérifie que le code correspond, met is_active = false.
--  SECURITY DEFINER pour éviter que le stagiaire ne puisse UPDATE
--  directement (les policies SELECT-only suffisent côté RLS).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION try_unlock_access(p_lock_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lock lms_access_locks;
BEGIN
    SELECT * INTO v_lock
    FROM   lms_access_locks
    WHERE  id         = p_lock_id
      AND  profile_id = auth.uid()
      AND  is_active  = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF lower(trim(v_lock.unlock_code)) <> lower(trim(p_code)) THEN
        RETURN false;
    END IF;

    UPDATE lms_access_locks
       SET is_active   = false,
           unlocked_at = now()
     WHERE id = p_lock_id;

    RETURN true;
END;
$$;


-- ── RPC : verrouiller pour toute une cohorte (admin/formateur) ─
--  Insert une ligne par membre de la cohorte.
--  ON CONFLICT DO NOTHING → ignore les membres déjà verrouillés.
--  Retourne le nombre de nouveaux verrous créés.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lock_cohort_access(
    p_cohorte_id  UUID,
    p_item_type   TEXT,
    p_item_id     UUID,
    p_unlock_code TEXT,
    p_raison      TEXT,
    p_locked_by   UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF get_my_role() NOT IN ('admin', 'formateur') THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    INSERT INTO lms_access_locks
        (profile_id, item_type, item_id, unlock_code, raison, locked_by)
    SELECT cm.profile_id,
           p_item_type,
           p_item_id,
           p_unlock_code,
           p_raison,
           p_locked_by
    FROM   lms_cohorte_membres cm
    WHERE  cm.cohorte_id = p_cohorte_id
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
