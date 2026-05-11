-- ═══════════════════════════════════════════════════════════════
-- 24_url_reac_column.sql
-- Ajoute la colonne url_reac à lms_titres_pro
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE lms_titres_pro ADD COLUMN IF NOT EXISTS url_reac TEXT;

COMMENT ON COLUMN lms_titres_pro.url_reac IS
    'URL du REAC officiel (Banque di.afpa.fr ou autre source officielle)';
