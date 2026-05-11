-- ============================================================
-- LMS DASHBOA_RD — Données de test v1.0
-- ⚠️  À exécuter UNIQUEMENT sur un environnement de dev/staging
-- ============================================================

-- ── Titre professionnel de test ───────────────────────────
INSERT INTO lms_titres_pro (code_rncp, sigle, intitule, niveau, secteur_activite)
VALUES ('RNCP37274', 'TSSR', 'Technicien Supérieur Systèmes et Réseaux', 5, 'Informatique');

-- ── CCP de test ───────────────────────────────────────────
INSERT INTO lms_certificats_ccp (titre_pro_id, code, intitule, ordre)
SELECT id, 'CCP1', 'Exploiter les éléments de l''infrastructure', 1 FROM lms_titres_pro WHERE code_rncp = 'RNCP37274';

INSERT INTO lms_certificats_ccp (titre_pro_id, code, intitule, ordre)
SELECT id, 'CCP2', 'Exploiter des serveurs Windows et Linux', 2 FROM lms_titres_pro WHERE code_rncp = 'RNCP37274';

-- ── Financement de test ───────────────────────────────────
INSERT INTO lms_financements (nom, description)
VALUES ('CPF', 'Compte Personnel de Formation'),
       ('OPCO', 'Opérateur de Compétences'),
       ('Entreprise', 'Financement direct entreprise');

-- ── Pathway de test ───────────────────────────────────────
INSERT INTO lms_pathways (titre, description, titre_pro_id)
SELECT 'Parcours TSSR Complet', 'Formation complète Technicien Systèmes et Réseaux', id
FROM lms_titres_pro WHERE code_rncp = 'RNCP37274';

-- ── Config parcours/financement ───────────────────────────
INSERT INTO lms_parcours_finance_config (pathway_id, financement_id, duree_totale_heures)
SELECT p.id, f.id, 840
FROM lms_pathways p, lms_financements f
WHERE p.titre = 'Parcours TSSR Complet' AND f.nom = 'CPF';

-- ── Cours de test ─────────────────────────────────────────
INSERT INTO lms_cours (titre, description, duree_heures, est_transversal, objectif_pedagogique)
VALUES
    ('Réseaux fondamentaux', 'Introduction aux protocoles réseau et modèles OSI/TCP-IP', 40, false,
     'Comprendre les principes de base des réseaux informatiques'),
    ('Administration Linux', 'Commandes shell, gestion des services et sécurité Linux', 60, false,
     'Administrer un serveur Linux en production'),
    ('Virtualisation', 'VMware, VirtualBox et concepts de virtualisation', 30, false,
     'Mettre en place des environnements virtualisés'),
    ('Compétences Transversales', 'Communication professionnelle et gestion de projet', 20, true,
     'Développer les soft skills essentiels en entreprise');

-- ── Lier cours au parcours ────────────────────────────────
INSERT INTO lms_config_cours (config_id, cours_id, duree_heures, obligatoire, ordre)
SELECT pfc.id, c.id, c.duree_heures, true, ROW_NUMBER() OVER (ORDER BY c.titre)
FROM lms_parcours_finance_config pfc
JOIN lms_pathways p ON p.id = pfc.pathway_id
CROSS JOIN lms_cours c
WHERE p.titre = 'Parcours TSSR Complet';

-- ── Séquences pour "Réseaux fondamentaux" ─────────────────
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
SELECT c.id, s.titre, s.objectif, s.ordre
FROM lms_cours c,
(VALUES
    ('Modèle OSI et TCP/IP', 'Comprendre les 7 couches du modèle OSI', 1),
    ('Adressage IP et sous-réseaux', 'Maîtriser le subnetting IPv4 et IPv6', 2),
    ('Protocoles essentiels', 'DNS, DHCP, HTTP, FTP — fonctionnement et configuration', 3)
) AS s(titre, objectif, ordre)
WHERE c.titre = 'Réseaux fondamentaux';

-- ── Séances pour la séquence "Modèle OSI" ────────────────
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, contenu, ordre)
SELECT seq.id, s.titre, s.duree, s.type::VARCHAR, s.contenu, s.ordre
FROM lms_sequences seq,
(VALUES
    ('Introduction au modèle OSI',         1.5, 'cours',    'Présentation des 7 couches avec exemples concrets.', 1),
    ('La couche physique et liaison',       2.0, 'cours',    'Câblage, Ethernet, MAC addresses.', 2),
    ('Les couches réseau et transport',     2.0, 'tp',       'TP : analyse de trames avec Wireshark.', 3),
    ('Quiz modèle OSI',                     0.5, 'quiz',     'Questions de validation des acquis.', 4)
) AS s(titre, duree, type, contenu, ordre)
WHERE seq.titre = 'Modèle OSI et TCP/IP';

-- ── Cohorte de test ───────────────────────────────────────
-- (Nécessite un pathway existant)
INSERT INTO lms_cohortes (nom, pathway_id, financement_id, date_debut, date_fin)
SELECT 'Promo TSSR 2026-A', p.id, f.id, '2026-01-15', '2026-12-15'
FROM lms_pathways p, lms_financements f
WHERE p.titre = 'Parcours TSSR Complet' AND f.nom = 'CPF';
