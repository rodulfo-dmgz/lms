-- ═══════════════════════════════════════════════════════════════════════════
--  12_push_subscriptions.sql
--  Table pour stocker les subscriptions Web Push par utilisateur.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lms_push_subscriptions (
    id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES lms_profiles(id) ON DELETE CASCADE,
    endpoint   text        NOT NULL,
    p256dh     text        NOT NULL,
    auth       text        NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, endpoint)
);

ALTER TABLE lms_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur gère ses propres subscriptions
DROP POLICY IF EXISTS "push_sub_own_select" ON lms_push_subscriptions;
CREATE POLICY "push_sub_own_select" ON lms_push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_sub_own_insert" ON lms_push_subscriptions;
CREATE POLICY "push_sub_own_insert" ON lms_push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_sub_own_update" ON lms_push_subscriptions;
CREATE POLICY "push_sub_own_update" ON lms_push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_sub_own_delete" ON lms_push_subscriptions;
CREATE POLICY "push_sub_own_delete" ON lms_push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- L'Edge Function (service_role) peut lire toutes les subscriptions pour envoyer les pushs
-- Pas besoin de policy supplémentaire — service_role bypasse RLS par défaut.
