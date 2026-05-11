-- ═══════════════════════════════════════════════════════════════════════
-- 15 — Politique RLS pour le bucket Storage "Cours"
-- Permet aux utilisateurs authentifiés de LISTER les fichiers.
-- (Les fichiers sont déjà lisibles publiquement via URL, mais SELECT
--  sur la table storage.objects nécessite une policy explicite.)
-- ═══════════════════════════════════════════════════════════════════════

-- S'assurer que le bucket existe et est public
INSERT INTO storage.buckets (id, name, public)
VALUES ('Cours', 'Cours', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Permettre à tout utilisateur authentifié de lister les objets du bucket Cours
DROP POLICY IF EXISTS "Authenticated can list Cours" ON storage.objects;
CREATE POLICY "Authenticated can list Cours"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'Cours');

-- Permettre à tout utilisateur authentifié de lire les métadonnées (utile pour l'API list)
DROP POLICY IF EXISTS "Public can read Cours objects" ON storage.objects;
CREATE POLICY "Public can read Cours objects"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'Cours');
