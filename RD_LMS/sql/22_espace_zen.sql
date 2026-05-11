-- ═══════════════════════════════════════════════════════════════
-- 22_espace_zen.sql
-- Table lms_articles — Espace Zen > Lecture
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lms_articles (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titre          TEXT        NOT NULL,
    excerpt        TEXT,
    contenu        TEXT,
    image_url      TEXT,
    categorie      TEXT        NOT NULL DEFAULT 'inspiration'
                               CHECK (categorie IN ('inspiration','bien-etre','methode','cariere','actualite')),
    duree_lecture  INT         DEFAULT 5,      -- minutes
    actif          BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_lms_articles_categorie ON lms_articles(categorie);
CREATE INDEX IF NOT EXISTS idx_lms_articles_actif     ON lms_articles(actif);
CREATE INDEX IF NOT EXISTS idx_lms_articles_created   ON lms_articles(created_at DESC);

-- RLS
ALTER TABLE lms_articles ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les utilisateurs authentifiés
DROP POLICY IF EXISTS "articles_read_authenticated" ON lms_articles;
CREATE POLICY "articles_read_authenticated"
    ON lms_articles FOR SELECT
    TO authenticated
    USING (actif = true);

-- Écriture : admins uniquement
DROP POLICY IF EXISTS "articles_admin_all" ON lms_articles;
CREATE POLICY "articles_admin_all"
    ON lms_articles FOR ALL
    TO authenticated
    USING     (get_my_role() = 'admin')
    WITH CHECK (get_my_role() = 'admin');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION _update_lms_articles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_lms_articles_updated_at ON lms_articles;
CREATE TRIGGER trg_lms_articles_updated_at
    BEFORE UPDATE ON lms_articles
    FOR EACH ROW EXECUTE FUNCTION _update_lms_articles_updated_at();

-- ─── Données d'exemple ──────────────────────────────────────────
INSERT INTO lms_articles (titre, excerpt, categorie, duree_lecture) VALUES
(
    'Comment structurer sa prise de notes efficacement',
    'Découvrez les meilleures techniques pour organiser vos apprentissages et retenir l''essentiel lors de vos séances de formation.',
    'methode', 4
),
(
    'La méthode Pomodoro appliquée à la formation',
    'Travaillez en cycles de 25 minutes pour maximiser votre concentration et réduire la fatigue mentale. Un outil simple et redoutablement efficace.',
    'methode', 3
),
(
    'Gérer le stress pendant la formation : 5 conseils pratiques',
    'La formation intensive peut générer beaucoup de pression. Voici des stratégies concrètes pour rester serein et performant.',
    'bien-etre', 5
),
(
    'Le dossier professionnel : un atout, pas une contrainte',
    'Comprenez pourquoi bien préparer votre DP est la clé de votre réussite au titre professionnel. Un outil de valorisation avant tout.',
    'cariere', 6
),
(
    'Soft skills : les compétences qui font la différence',
    'Communication, adaptabilité, esprit d''équipe — ces compétences transversales sont aussi importantes que votre savoir-faire technique.',
    'inspiration', 4
),
(
    'L''intelligence émotionnelle au service de votre carrière',
    'Savoir gérer ses émotions et comprendre celles des autres est un levier puissant pour évoluer professionnellement.',
    'inspiration', 5
),
(
    'Apprendre à apprendre : la méta-compétence du XXIe siècle',
    'Comment développer votre capacité à acquérir de nouvelles connaissances rapidement ? Les neurosciences ont des réponses.',
    'methode', 7
)
ON CONFLICT DO NOTHING;
