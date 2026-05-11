-- ═══════════════════════════════════════════════════════════
-- 05_quiz_devoir.sql
-- Tables quiz_submissions + devoir_submissions + bucket devoirs
-- À exécuter dans l'éditeur SQL Supabase
-- ═══════════════════════════════════════════════════════════

-- ── 1. Soumissions quiz ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_quiz_submissions (
    id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    seance_id     uuid        NOT NULL REFERENCES lms_seances(id) ON DELETE CASCADE,
    block_id      text        NOT NULL,   -- identifiant stable du bloc quiz
    stagiaire_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    answers       jsonb       NOT NULL DEFAULT '[]',
    -- [{question_id, answer}]  answer = index(int) | int[] | string
    score         numeric(5,2),           -- points obtenus
    max_score     numeric(5,2),           -- points maximum
    submitted_at  timestamptz DEFAULT now(),
    UNIQUE (seance_id, block_id, stagiaire_id)
);

ALTER TABLE lms_quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Stagiaire : lire/créer/remplacer ses propres soumissions
DROP POLICY IF EXISTS "quiz_own_select"   ON lms_quiz_submissions;
CREATE POLICY "quiz_own_select" ON lms_quiz_submissions
    FOR SELECT USING (auth.uid() = stagiaire_id);

DROP POLICY IF EXISTS "quiz_own_insert"   ON lms_quiz_submissions;
CREATE POLICY "quiz_own_insert" ON lms_quiz_submissions
    FOR INSERT WITH CHECK (auth.uid() = stagiaire_id);

DROP POLICY IF EXISTS "quiz_own_update"   ON lms_quiz_submissions;
CREATE POLICY "quiz_own_update" ON lms_quiz_submissions
    FOR UPDATE USING (auth.uid() = stagiaire_id);

-- Admin : tout lire
DROP POLICY IF EXISTS "quiz_admin_select" ON lms_quiz_submissions;
CREATE POLICY "quiz_admin_select" ON lms_quiz_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lms_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ── 2. Soumissions devoir ────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_devoir_submissions (
    id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    seance_id     uuid        NOT NULL REFERENCES lms_seances(id) ON DELETE CASCADE,
    block_id      text        NOT NULL,   -- identifiant stable du bloc devoir
    stagiaire_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_urls     jsonb       NOT NULL DEFAULT '[]',  -- [{name, url, size, type}]
    message       text,                              -- commentaire du stagiaire
    note          numeric(5,2),                      -- note donnée par le formateur (null = non noté)
    note_max      numeric(5,2) DEFAULT 20,
    feedback      text,                              -- commentaire du formateur
    graded_by     uuid REFERENCES auth.users(id),
    graded_at     timestamptz,
    submitted_at  timestamptz DEFAULT now(),
    UNIQUE (seance_id, block_id, stagiaire_id)
);

ALTER TABLE lms_devoir_submissions ENABLE ROW LEVEL SECURITY;

-- Stagiaire : lire ses propres soumissions
DROP POLICY IF EXISTS "devoir_own_select"   ON lms_devoir_submissions;
CREATE POLICY "devoir_own_select" ON lms_devoir_submissions
    FOR SELECT USING (auth.uid() = stagiaire_id);

-- Stagiaire : créer une soumission
DROP POLICY IF EXISTS "devoir_own_insert"   ON lms_devoir_submissions;
CREATE POLICY "devoir_own_insert" ON lms_devoir_submissions
    FOR INSERT WITH CHECK (auth.uid() = stagiaire_id);

-- Stagiaire : modifier sa soumission UNIQUEMENT si pas encore noté
DROP POLICY IF EXISTS "devoir_own_update"   ON lms_devoir_submissions;
CREATE POLICY "devoir_own_update" ON lms_devoir_submissions
    FOR UPDATE USING (
        auth.uid() = stagiaire_id
        AND note IS NULL
    );

-- Admin : tout lire
DROP POLICY IF EXISTS "devoir_admin_select" ON lms_devoir_submissions;
CREATE POLICY "devoir_admin_select" ON lms_devoir_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lms_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin : noter (update note + feedback + graded_by + graded_at)
DROP POLICY IF EXISTS "devoir_admin_update" ON lms_devoir_submissions;
CREATE POLICY "devoir_admin_update" ON lms_devoir_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM lms_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ── 3. Bucket Supabase Storage ───────────────────────────────
-- À exécuter si le bucket n'existe pas encore
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'devoirs',
    'devoirs',
    false,                      -- privé : URLs signées uniquement
    52428800,                   -- 50 Mo max par fichier
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
        'video/mp4', 'video/webm',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'text/plain',
        'application/zip'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Politique storage : stagiaire peut uploader dans son propre dossier
DROP POLICY IF EXISTS "devoirs_upload_own" ON storage.objects;
CREATE POLICY "devoirs_upload_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'devoirs'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

DROP POLICY IF EXISTS "devoirs_read_own" ON storage.objects;
CREATE POLICY "devoirs_read_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'devoirs'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

DROP POLICY IF EXISTS "devoirs_delete_own" ON storage.objects;
CREATE POLICY "devoirs_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'devoirs'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

DROP POLICY IF EXISTS "devoirs_admin_all" ON storage.objects;
CREATE POLICY "devoirs_admin_all" ON storage.objects
    FOR ALL USING (
        bucket_id = 'devoirs'
        AND EXISTS (
            SELECT 1 FROM lms_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ── 4. Vue agrégée pour l'admin (optionnel, pratique) ────────
-- Note : l'email est dans auth.users, pas dans lms_profiles
CREATE OR REPLACE VIEW lms_devoir_submissions_view AS
SELECT
    ds.*,
    p.nom,
    p.prenom,
    u.email,
    s.titre AS seance_titre
FROM lms_devoir_submissions ds
JOIN lms_profiles   p ON p.id = ds.stagiaire_id
JOIN auth.users     u ON u.id = ds.stagiaire_id
JOIN lms_seances    s ON s.id = ds.seance_id;
