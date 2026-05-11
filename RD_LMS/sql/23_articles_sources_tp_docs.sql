-- ═══════════════════════════════════════════════════════════════
-- 23_articles_sources_tp_docs.sql
-- 1. lms_article_sources   — Sources RSS / flux pour l'Espace Zen
-- 2. lms_tp_documents      — Documents par titre professionnel (REAC, DP…)
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. SOURCES D'ARTICLES (RSS / liens)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_article_sources (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nom            TEXT        NOT NULL,
    url_rss        TEXT,                   -- URL du flux RSS (nullable si type = 'manuel')
    type           TEXT        NOT NULL DEFAULT 'rss'
                               CHECK (type IN ('rss', 'manuel', 'scraping')),
    categorie      TEXT        NOT NULL DEFAULT 'inspiration'
                               CHECK (categorie IN ('inspiration','bien-etre','methode','cariere','actualite')),
    description    TEXT,
    actif          BOOLEAN     NOT NULL DEFAULT true,
    derniere_sync  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter url_externe à lms_articles si elle n'existe pas déjà
ALTER TABLE lms_articles ADD COLUMN IF NOT EXISTS url_externe TEXT;
ALTER TABLE lms_articles ADD COLUMN IF NOT EXISTS source_id   UUID REFERENCES lms_article_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lms_articles_url_ext ON lms_articles(url_externe) WHERE url_externe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lms_article_sources_actif ON lms_article_sources(actif);

-- RLS article_sources
ALTER TABLE lms_article_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_sources_read_admin"  ON lms_article_sources;
CREATE POLICY "article_sources_read_admin"
    ON lms_article_sources FOR SELECT
    TO authenticated
    USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "article_sources_admin_all" ON lms_article_sources;
CREATE POLICY "article_sources_admin_all"
    ON lms_article_sources FOR ALL
    TO authenticated
    USING     (get_my_role() = 'admin')
    WITH CHECK (get_my_role() = 'admin');

-- Sources d'exemple
INSERT INTO lms_article_sources (nom, url_rss, type, categorie, description) VALUES
(
    'Harvard Business Review FR',
    'https://www.hbrfrance.fr/rss',
    'rss',
    'cariere',
    'Articles de management, leadership et développement professionnel'
),
(
    'Cerveau & Psycho',
    'https://www.cerveauetpsycho.fr/rss.xml',
    'rss',
    'bien-etre',
    'Psychologie, neurosciences et bien-être au travail'
),
(
    'Apec - Conseils carrière',
    'https://www.apec.fr/candidat/actualites-conseils.html',
    'manuel',
    'cariere',
    'Conseils APEC pour l''emploi et la carrière'
)
ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- 2. DOCUMENTS TITRE PROFESSIONNEL
-- ───────────────────────────────────────────────────────────────
-- Ces documents sont stockés dans le bucket Supabase Storage "titre_pro"
-- Structure : titre_pro/{sigle}/{type}/{nom_fichier}
-- Ex : titre_pro/AD/reac/REAC_TP_AD_2024.pdf
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_tp_documents (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titre_pro_id   UUID        NOT NULL REFERENCES lms_titres_pro(id) ON DELETE CASCADE,
    type           TEXT        NOT NULL
                               CHECK (type IN ('reac','referentiel','dp_modele','grille_ecf','annexe','autre')),
    nom            TEXT        NOT NULL,           -- Nom affiché
    description    TEXT,
    storage_path   TEXT        NOT NULL,           -- Chemin dans le bucket
    file_name      TEXT,                           -- Nom du fichier original
    file_size      BIGINT,                         -- Taille en octets
    mime_type      TEXT        DEFAULT 'application/pdf',
    url_public     TEXT,                           -- URL publique (si bucket public)
    ordre          INT         NOT NULL DEFAULT 0,
    actif          BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lms_tp_docs_titre_pro ON lms_tp_documents(titre_pro_id);
CREATE INDEX IF NOT EXISTS idx_lms_tp_docs_type      ON lms_tp_documents(type);

-- RLS
ALTER TABLE lms_tp_documents ENABLE ROW LEVEL SECURITY;

-- Stagiaires et formateurs peuvent lire les documents actifs
DROP POLICY IF EXISTS "tp_docs_read_authenticated" ON lms_tp_documents;
CREATE POLICY "tp_docs_read_authenticated"
    ON lms_tp_documents FOR SELECT
    TO authenticated
    USING (actif = true);

-- Admins peuvent tout faire
DROP POLICY IF EXISTS "tp_docs_admin_all" ON lms_tp_documents;
CREATE POLICY "tp_docs_admin_all"
    ON lms_tp_documents FOR ALL
    TO authenticated
    USING     (get_my_role() = 'admin')
    WITH CHECK (get_my_role() = 'admin');

-- ───────────────────────────────────────────────────────────────
-- Storage bucket "titre_pro"
-- À créer dans Supabase Dashboard > Storage > New Bucket
-- Nom : titre_pro
-- Public : false (accès via signed URLs)
-- ───────────────────────────────────────────────────────────────
-- Policies storage (à exécuter depuis l'onglet Storage > Policies)
-- CREATE POLICY "Admins peuvent uploader" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'titre_pro' AND get_my_role() = 'admin');
--
-- CREATE POLICY "Utilisateurs auth peuvent lire"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'titre_pro');
-- ───────────────────────────────────────────────────────────────
