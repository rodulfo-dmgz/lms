-- ================================================================
-- SEED v2 — Assistant de direction (TP-01293, Niveau 5)
-- 13 modules · 52 séquences · 210 séances · 735 h centre
-- ================================================================
-- IMPORTANT : ne touche PAS lms_profiles (comptes utilisateurs)
-- ================================================================

-- ── 1. Vider les tables de contenu ───────────────────────────
TRUNCATE TABLE
    lms_session_progress,
    lms_cohorte_membres,
    lms_config_cours,
    lms_parcours_finance_config,
    lms_cohortes,
    lms_seances,
    lms_sequences,
    lms_cours,
    lms_pathways,
    lms_financements,
    lms_competences,
    lms_activites,
    lms_certificats_ccp,
    lms_competences_transversales,
    lms_titres_pro
CASCADE;

-- ================================================================
DO $$
DECLARE
    -- Référentiel
    v_titre_pro_id  UUID;
    v_ccp1_id       UUID;
    v_ccp2_id       UUID;
    v_ccp3_id       UUID;
    -- Parcours
    v_pathway_id    UUID;
    v_fin_id        UUID;
    v_pfc_id        UUID;
    -- Cours
    v_icp_id UUID; v_ban_id UUID; v_cpn_id UUID; v_sol_id UUID;
    v_pad_id UUID; v_paq_id UUID; v_sin_id UUID; v_vsi_id UUID;
    v_gpc_id UUID; v_oge_id UUID; v_ced_id UUID; v_apa_id UUID;
    v_ppi_id UUID;
    -- Séquence courante
    v_seq UUID;
    -- Cohorte
    v_cohorte_id UUID;
BEGIN

-- ── Titre Professionnel ──────────────────────────────────────
INSERT INTO lms_titres_pro (code_rncp, sigle, intitule, niveau, secteur_activite)
VALUES ('TP-01293', 'AD', 'Assistant de direction', 5, 'Gestion administrative et direction')
RETURNING id INTO v_titre_pro_id;

-- ── CCP ─────────────────────────────────────────────────────
INSERT INTO lms_certificats_ccp (titre_pro_id, code, intitule, ordre)
VALUES (v_titre_pro_id, 'CCP1',
        'Organiser et gérer les activités administratives et logistiques de la direction', 1)
RETURNING id INTO v_ccp1_id;

INSERT INTO lms_certificats_ccp (titre_pro_id, code, intitule, ordre)
VALUES (v_titre_pro_id, 'CCP2',
        'Contribuer à la gestion de l''information et au pilotage de la direction', 2)
RETURNING id INTO v_ccp2_id;

INSERT INTO lms_certificats_ccp (titre_pro_id, code, intitule, ordre)
VALUES (v_titre_pro_id, 'CCP3',
        'Concevoir et mettre en œuvre la communication de la direction', 3)
RETURNING id INTO v_ccp3_id;

-- ── Pathway + Financement + Config ──────────────────────────
INSERT INTO lms_pathways (titre, description, titre_pro_id)
VALUES ('Parcours Assistant de direction',
        'Formation complète 735 h centre + 175 h stage – Niveau 5 (Bac+2)', v_titre_pro_id)
RETURNING id INTO v_pathway_id;

INSERT INTO lms_financements (nom, description)
VALUES ('CPF', 'Compte Personnel de Formation')
RETURNING id INTO v_fin_id;

INSERT INTO lms_parcours_finance_config (pathway_id, financement_id, duree_totale_heures, notes)
VALUES (v_pathway_id, v_fin_id, 910, '735 h centre + 175 h stage')
RETURNING id INTO v_pfc_id;

-- ════════════════════════════════════════════════════════════
-- MODULE 1 — ICP · 42 h · CCP1
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('ICP — Interface et communication professionnelle',
        'Maîtriser l''accueil, la communication verbale et non verbale, la gestion des situations complexes et la communication interculturelle.',
        42, v_ccp1_id,
        'Assurer un accueil professionnel de qualité et gérer les situations de communication complexes.')
RETURNING id INTO v_icp_id;

-- ICP.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_icp_id, 'ICP.1 — Fondamentaux de la communication professionnelle',
        'Comprendre les enjeux de la communication et de l''accueil professionnel.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Les enjeux de l''accueil et de l''image de la structure', 3.5, 'cours', 1),
(v_seq, 'Communication verbale et non verbale', 3.5, 'cours', 2),
(v_seq, 'Écoute active et techniques de questionnement', 3.5, 'tp', 3);

-- ICP.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_icp_id, 'ICP.2 — Accueil physique et téléphonique',
        'Organiser et assurer un accueil physique et téléphonique de qualité.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Organiser et assurer un accueil physique professionnel', 3.5, 'cours', 1),
(v_seq, 'Gestion des appels : filtrage, prise de notes, messages', 3.5, 'cours', 2),
(v_seq, 'Mises en situation : accueil simultané et interruptions', 3.5, 'tp', 3);

-- ICP.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_icp_id, 'ICP.3 — Gestion des situations complexes et handicap',
        'Gérer les situations délicates et accueillir les personnes en situation de handicap.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Accueillir une personne en situation de handicap (tous types)', 3.5, 'cours', 1),
(v_seq, 'Gestion des visiteurs difficiles ou insistants', 3.5, 'cours', 2),
(v_seq, 'Désamorcer un conflit, garder le contrôle de soi', 3.5, 'tp', 3);

-- ICP.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_icp_id, 'ICP.4 — Communication interculturelle et posture professionnelle',
        'Adapter sa communication aux contextes culturels et renforcer sa posture professionnelle.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Styles de communication et contextes culturels', 3.5, 'cours', 1),
(v_seq, 'Confidentialité, réserve et limites de son rôle', 3.5, 'cours', 2),
(v_seq, 'Synthèse et évaluation : jeu de rôle transversal', 3.5, 'evaluation', 3);

-- ════════════════════════════════════════════════════════════
-- MODULE 2 — BAN · 77 h · CCP2
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('BAN — Bureautique avancée et productivité individuelle',
        'Maîtriser les outils de bureautique avancés : traitement de texte, tableur, présentation et PAO.',
        77, v_ccp2_id,
        'Produire des documents professionnels de qualité et automatiser des tâches bureautiques.')
RETURNING id INTO v_ban_id;

-- BAN.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ban_id, 'BAN.1 — Traitement de texte professionnel',
        'Maîtriser les fonctionnalités avancées d''un traitement de texte.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Mise en page, styles, modèles, tableaux', 3.5, 'cours', 1),
(v_seq, 'Publipostage, formulaires, collaboration sur un document', 3.5, 'cours', 2),
(v_seq, 'Automatisation avec les champs et les macros simples', 3.5, 'tp', 3),
(v_seq, 'Rédaction de rapports longs (notes de service, comptes rendus)', 3.5, 'tp', 4),
(v_seq, 'Atelier pratique et test intermédiaire', 3.5, 'evaluation', 5);

-- BAN.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ban_id, 'BAN.2 — Tableur avancé',
        'Exploiter les fonctions avancées du tableur pour analyser et visualiser des données.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Rappels et fonctions avancées (SI, RECHERCHE, INDEX, EQUIV)', 3.5, 'cours', 1),
(v_seq, 'Gestion de bases de données : tris, filtres, sous-totaux', 3.5, 'cours', 2),
(v_seq, 'Tableaux croisés dynamiques et graphiques croisés', 3.5, 'tp', 3),
(v_seq, 'Outils d''analyse : valeur cible, solveur, scénarios (1/2)', 3.5, 'tp', 4),
(v_seq, 'Outils d''analyse : valeur cible, solveur, scénarios (2/2)', 3.5, 'tp', 5),
(v_seq, 'Automatisation avec les macros enregistrées', 3.5, 'tp', 6),
(v_seq, 'Conception de tableaux de bord (indicateurs, KPI)', 3.5, 'tp', 7),
(v_seq, 'Évaluation sommative sur études de cas', 3.5, 'evaluation', 8);

-- BAN.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ban_id, 'BAN.3 — Présentation et communication visuelle',
        'Concevoir des supports de présentation impactants.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Principes de conception d''un support impactant', 3.5, 'cours', 1),
(v_seq, 'PowerPoint avancé : masques, animations, transitions', 3.5, 'tp', 2),
(v_seq, 'Alternatives (Canva, Prezi, Google Slides)', 3.5, 'tp', 3),
(v_seq, 'Utiliser une charte graphique dans ses présentations', 3.5, 'cours', 4),
(v_seq, 'Atelier : réaliser et présenter un dossier en 10 slides', 3.5, 'evaluation', 5);

-- BAN.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ban_id, 'BAN.4 — Initiation à la PAO et aux outils en ligne',
        'Initiation aux outils de publication assistée par ordinateur.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Notions de PAO (Publisher, Scribus) pour flyers et affiches', 3.5, 'cours', 1),
(v_seq, 'Outils de PréAO en ligne (Canva, Genially)', 3.5, 'tp', 2),
(v_seq, 'Création de supports print pour événement (simulation)', 3.5, 'tp', 3),
(v_seq, 'Bouclage des productions et portfolio numérique', 3.5, 'tp', 4);

-- ════════════════════════════════════════════════════════════
-- MODULE 3 — CPN · 56 h · CCP1
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('CPN — Collaboration et planification numériques',
        'Maîtriser les outils numériques de collaboration, de planification et de gestion documentaire.',
        56, v_ccp1_id,
        'Utiliser les plateformes numériques collaboratives pour organiser le travail et gérer les documents.')
RETURNING id INTO v_cpn_id;

-- CPN.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_cpn_id, 'CPN.1 — Agendas partagés et messagerie',
        'Gérer efficacement les agendas partagés et la messagerie professionnelle.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Gestion d''agenda sous Outlook / Google Calendar', 3.5, 'cours', 1),
(v_seq, 'Planifier et suivre les réunions via l''agenda', 3.5, 'tp', 2),
(v_seq, 'Messagerie professionnelle : classement, règles, archives', 3.5, 'cours', 3),
(v_seq, 'Atelier : gérer 3 agendas de dirigeants sur une semaine type', 3.5, 'tp', 4);

-- CPN.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_cpn_id, 'CPN.2 — Outils de visioconférence et communication unifiée',
        'Maîtriser les outils de visioconférence et organiser des réunions à distance.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Maîtriser Teams, Zoom, Webex : planifier, animer, enregistrer', 3.5, 'cours', 1),
(v_seq, 'Fonctionnalités avancées (sondages, tableaux blancs, salles)', 3.5, 'tp', 2),
(v_seq, 'Simulation de réunion à distance avec invités externes', 3.5, 'tp', 3);

-- CPN.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_cpn_id, 'CPN.3 — Plateformes collaboratives et gestion de projet',
        'Utiliser les plateformes collaboratives et les outils de planification de projet.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Découverte de SharePoint / Google Drive / Dropbox', 3.5, 'cours', 1),
(v_seq, 'Création d''un espace collaboratif, gestion des droits', 3.5, 'tp', 2),
(v_seq, 'Outils de planification de projet (Trello, Planner)', 3.5, 'cours', 3),
(v_seq, 'Diagramme de GANTT avec MS Project ou équivalent', 3.5, 'tp', 4),
(v_seq, 'Mise en commun : projet fil rouge (définition du bac à sable)', 3.5, 'tp', 5);

-- CPN.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_cpn_id, 'CPN.4 — Gestion électronique de documents et workflows',
        'Mettre en place une GED et automatiser des workflows documentaires.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Classement et arborescence, nommage, versionnage', 3.5, 'cours', 1),
(v_seq, 'Workflows de validation et signature électronique', 3.5, 'cours', 2),
(v_seq, 'Automatisation simple (Power Automate, IFTTT)', 3.5, 'tp', 3),
(v_seq, 'Projet intégrateur : concevoir un processus complet', 3.5, 'tp', 4);

-- ════════════════════════════════════════════════════════════
-- MODULE 4 — SOL · 63 h · CCP1
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('SOL — Support organisationnel et logistique',
        'Organiser les activités de la direction : agenda, déplacements, réunions et ressources matérielles.',
        63, v_ccp1_id,
        'Assurer la gestion logistique et organisationnelle d''une direction avec autonomie et rigueur.')
RETURNING id INTO v_sol_id;

-- SOL.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_sol_id, 'SOL.1 — Gestion des agendas et des priorités',
        'Maîtriser les techniques de gestion du temps et des priorités multiples.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Techniques de gestion du temps et matrice d''Eisenhower', 3.5, 'cours', 1),
(v_seq, 'Utilisation avancée d''un agenda partagé (cas complexes)', 3.5, 'tp', 2),
(v_seq, 'Gérer les imprévus et renégocier les priorités', 3.5, 'tp', 3),
(v_seq, 'Planification d''une semaine type avec plusieurs dirigeants', 3.5, 'tp', 4),
(v_seq, 'Atelier : construire une feuille de route trimestrielle', 3.5, 'tp', 5);

-- SOL.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_sol_id, 'SOL.2 — Organisation des déplacements',
        'Organiser et optimiser les déplacements professionnels, y compris à l''international.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Formalités administratives (visas, passeports, assurances)', 3.5, 'cours', 1),
(v_seq, 'Réservation de transports et hébergement, optimisation budgétaire', 3.5, 'tp', 2),
(v_seq, 'Prise en compte du handicap et de l''accessibilité', 3.5, 'cours', 3),
(v_seq, 'Négociation avec les prestataires, référencement durable', 3.5, 'tp', 4),
(v_seq, 'Simulation : organiser un déplacement à l''international', 3.5, 'tp', 5);

-- SOL.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_sol_id, 'SOL.3 — Préparation et suivi des réunions',
        'Préparer et assurer le suivi complet d''une réunion professionnelle.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Typologie des réunions et logistique adaptée', 3.5, 'cours', 1),
(v_seq, 'Convocations, ordre du jour, documents préparatoires', 3.5, 'tp', 2),
(v_seq, 'Comptes rendus en français et en anglais (niveau B2)', 3.5, 'tp', 3),
(v_seq, 'Accessibilité des réunions (handicap, visio, distanciel)', 3.5, 'cours', 4);

-- SOL.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_sol_id, 'SOL.4 — Coordination des ressources matérielles',
        'Gérer les ressources matérielles et assurer le reporting budgétaire du service.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Achats responsables et gestion des stocks de bureau', 3.5, 'cours', 1),
(v_seq, 'Suivi budgétaire simple et reporting', 3.5, 'tp', 2),
(v_seq, 'Mise en place d''un tableau de bord logistique', 3.5, 'tp', 3),
(v_seq, 'BILAN 25 % — entretien individuel et collectif', 3.5, 'evaluation', 4);

-- ════════════════════════════════════════════════════════════
-- MODULE 5 — PAD · 56 h · CCP2
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('PAD — Pilotage et aide à la décision',
        'Collecter, structurer et analyser les données pour produire des tableaux de bord et des reportings.',
        56, v_ccp2_id,
        'Concevoir des outils de pilotage et d''aide à la décision pour la direction.')
RETURNING id INTO v_pad_id;

-- PAD.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_pad_id, 'PAD.1 — Collecte et structuration des données',
        'Identifier et exploiter les sources de données internes.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Identification des sources internes (ERP, CRM, fichiers)', 3.5, 'cours', 1),
(v_seq, 'Méthodes de collecte et validation des données', 3.5, 'cours', 2),
(v_seq, 'Structurer une base de données avec Excel', 3.5, 'tp', 3),
(v_seq, 'Exercice d''extraction et de mise en qualité d''un jeu de données', 3.5, 'tp', 4);

-- PAD.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_pad_id, 'PAD.2 — Conception de tableaux de bord',
        'Concevoir et produire des tableaux de bord opérationnels.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Choix des indicateurs pertinents (KPI, ratios)', 3.5, 'cours', 1),
(v_seq, 'Construction d''un tableau de bord opérationnel', 3.5, 'tp', 2),
(v_seq, 'Visualisation des données (graphiques sparklines, jauges)', 3.5, 'tp', 3),
(v_seq, 'Tableau de bord de suivi d''activité (cas commercial)', 3.5, 'tp', 4),
(v_seq, 'Évaluation : créer un tableau de bord pour sa propre direction', 3.5, 'evaluation', 5);

-- PAD.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_pad_id, 'PAD.3 — Analyse des indicateurs et commentaires',
        'Analyser les indicateurs et produire des synthèses pour la direction.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Techniques d''analyse (tendances, écarts, comparaisons)', 3.5, 'cours', 1),
(v_seq, 'Rédiger un commentaire synthétique pour un dirigeant', 3.5, 'tp', 2),
(v_seq, 'Présenter oralement ses analyses avec support', 3.5, 'tp', 3),
(v_seq, 'Alerter et proposer des actions correctives', 3.5, 'tp', 4);

-- PAD.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_pad_id, 'PAD.4 — ERP/CRM et reporting',
        'Utiliser un ERP/CRM et générer des états de reporting.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Initiation à un ERP (type Cegid, Odoo) et CRM', 3.5, 'cours', 1),
(v_seq, 'Générer des états de reporting prêts à l''emploi', 3.5, 'tp', 2),
(v_seq, 'Intégration avec Excel et cas de synthèse', 3.5, 'tp', 3);

-- ════════════════════════════════════════════════════════════
-- MODULE 6 — PAQ · 46 h · CCP2
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('PAQ — Processus administratifs et qualité',
        'Diagnostiquer, modéliser et améliorer les processus administratifs dans une démarche qualité.',
        46, v_ccp2_id,
        'Concevoir et mettre en œuvre une démarche d''amélioration des processus administratifs.')
RETURNING id INTO v_paq_id;

-- PAQ.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_paq_id, 'PAQ.1 — Diagnostic des processus existants',
        'Analyser et diagnostiquer les processus administratifs existants.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Cartographie des processus : notions et vocabulaire', 3.5, 'cours', 1),
(v_seq, 'Outils de diagnostic (Ishikawa, 5 pourquoi, QQQOQCP)', 3.5, 'cours', 2),
(v_seq, 'Recueil d''informations sur un processus réel de la structure', 3.5, 'tp', 3),
(v_seq, 'Restitution et validation du diagnostic', 3.5, 'tp', 4);

-- PAQ.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_paq_id, 'PAQ.2 — Modélisation et rédaction de procédures',
        'Modéliser des processus et rédiger des procédures opérationnelles.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Logigramme : règles de construction et exercices', 3.5, 'cours', 1),
(v_seq, 'Rédaction d''une procédure papier/digitale', 3.5, 'tp', 2),
(v_seq, 'Création de modes opératoires et fiches réflexes', 3.5, 'tp', 3),
(v_seq, 'Atelier : refonte d''une procédure d''accueil ou de courrier', 3.5, 'tp', 4);

-- PAQ.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_paq_id, 'PAQ.3 — Mise en œuvre et suivi de la démarche qualité',
        'Déployer une démarche qualité et assurer son suivi.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Présenter une procédure aux utilisateurs', 3.5, 'cours', 1),
(v_seq, 'Outils de suivi (indicateurs de performance de processus)', 3.5, 'tp', 2),
(v_seq, 'Amélioration continue et gestion des versions', 3.5, 'cours', 3),
(v_seq, 'Classement documentaire et accessibilité', 3.5, 'tp', 4),
(v_seq, 'BILAN 50 % — bilan de mi-parcours', 3.5, 'evaluation', 5);

-- ════════════════════════════════════════════════════════════
-- MODULE 7 — SIN · 35 h · CCP2
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('SIN — Sécurité de l''information et sobriété numérique',
        'Comprendre les enjeux de la cybersécurité, du RGPD et de la sobriété numérique.',
        35, v_ccp2_id,
        'Adopter des pratiques numériques sécurisées et respectueuses des données personnelles.')
RETURNING id INTO v_sin_id;

-- SIN.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_sin_id, 'SIN.1 — Cybersécurité pour l''assistant',
        'Identifier et prévenir les risques cybersécurité dans le contexte du secrétariat.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Identification des risques (phishing, malware, ingénierie sociale)', 3.5, 'cours', 1),
(v_seq, 'Bonnes pratiques : mots de passe, double authentification, VPN', 3.5, 'cours', 2),
(v_seq, 'Sécuriser le télétravail : partage d''écran, confidentialité', 3.5, 'tp', 3);

-- SIN.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_sin_id, 'SIN.2 — RGPD et protection des données',
        'Appliquer les principes du RGPD dans le traitement des données personnelles.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Principes clés du RGPD pour le secrétariat', 3.5, 'cours', 1),
(v_seq, 'Collecte, stockage et suppression des données personnelles', 3.5, 'cours', 2),
(v_seq, 'Étude de cas : mise en conformité d''un fichier clients', 3.5, 'tp', 3);

-- SIN.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_sin_id, 'SIN.3 — Sobriété numérique et éco-gestes',
        'Mesurer et réduire l''empreinte numérique du service.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Empreinte carbone du numérique (mail, cloud, visio)', 3.5, 'cours', 1),
(v_seq, 'Mettre en place une politique de sobriété au sein du service', 3.5, 'tp', 2);

-- SIN.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_sin_id, 'SIN.4 — E-réputation et traces numériques',
        'Gérer l''e-réputation de la direction et protéger les traces numériques.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Veiller sur l''e-réputation de sa direction', 3.5, 'cours', 1),
(v_seq, 'Nettoyer et protéger ses propres traces numériques', 3.5, 'tp', 2);

-- ════════════════════════════════════════════════════════════
-- MODULE 8 — VSI · 46 h · CCP2
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('VSI — Veille stratégique et informationnelle',
        'Mettre en place un dispositif de veille stratégique et informationnelle pour la direction.',
        46, v_ccp2_id,
        'Concevoir et animer un système de veille adapté aux besoins de la direction.')
RETURNING id INTO v_vsi_id;

-- VSI.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_vsi_id, 'VSI.1 — Méthodologie de veille et sources',
        'Définir un plan de veille et identifier les sources fiables.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Définir un plan de veille : objectifs, axes, périmètre', 3.5, 'cours', 1),
(v_seq, 'Sources d''information fiables (législation, économie, concurrence)', 3.5, 'cours', 2),
(v_seq, 'Outils de recherche avancée sur le web', 3.5, 'tp', 3);

-- VSI.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_vsi_id, 'VSI.2 — Outils de veille automatisée',
        'Paramétrer et utiliser des outils de veille automatisée.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Agrégateurs de flux RSS (Feedly, Inoreader)', 3.5, 'cours', 1),
(v_seq, 'Alertes Google, Talkwalker, notifications', 3.5, 'tp', 2),
(v_seq, 'Outils de curation (Scoop.it, Pearltrees)', 3.5, 'tp', 3),
(v_seq, 'Création d''un tableau de bord de veille personnalisé', 3.5, 'tp', 4);

-- VSI.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_vsi_id, 'VSI.3 — Analyse, synthèse et diffusion',
        'Analyser, synthétiser et diffuser les informations de veille.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Lecture rapide et extraction des éléments clés', 3.5, 'cours', 1),
(v_seq, 'Rédaction de synthèses et de notes d''information', 3.5, 'tp', 2),
(v_seq, 'Diffusion adaptée (newsletter interne, portail documentaire)', 3.5, 'tp', 3);

-- VSI.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_vsi_id, 'VSI.4 — Veille sectorielle et e-réputation',
        'Conduire une veille sectorielle et surveiller l''e-réputation de l''entreprise.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Veille concurrentielle et sectorielle', 3.5, 'cours', 1),
(v_seq, 'Suivi de l''image de l''entreprise sur les réseaux sociaux', 3.5, 'tp', 2),
(v_seq, 'Projet final de veille sur un sujet donné par la direction (simulation)', 3.5, 'tp', 3);

-- ════════════════════════════════════════════════════════════
-- MODULE 9 — GPC · 63 h · CCP1
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('GPC — Gestion de projet et coordination',
        'Acquérir les fondamentaux de la gestion de projet et coordonner les équipes et ressources.',
        63, v_ccp1_id,
        'Planifier, coordonner et suivre un projet en tant qu''assistant de direction.')
RETURNING id INTO v_gpc_id;

-- GPC.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_gpc_id, 'GPC.1 — Fondamentaux de la gestion de projet',
        'Maîtriser le vocabulaire et les méthodes de base de la gestion de projet.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Vocabulaire projet, triangle QCD, cycle de vie', 3.5, 'cours', 1),
(v_seq, 'Rôles et responsabilités (chef de projet, équipe, assistant)', 3.5, 'cours', 2),
(v_seq, 'Outils de gestion de projet (logiciels, méthodes agiles)', 3.5, 'cours', 3),
(v_seq, 'Définition du projet fil rouge (avec cahier des charges)', 3.5, 'tp', 4);

-- GPC.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_gpc_id, 'GPC.2 — Planification et ordonnancement',
        'Décomposer et planifier un projet avec les outils appropriés.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Décomposer le projet : WBS, liste des tâches', 3.5, 'cours', 1),
(v_seq, 'Estimation des durées et des ressources', 3.5, 'tp', 2),
(v_seq, 'Construire un planning (GANTT, rétroplanning)', 3.5, 'tp', 3),
(v_seq, 'Intégrer les contraintes (budget, délais, handicap)', 3.5, 'cours', 4),
(v_seq, 'Atelier : planifier le projet fil rouge', 3.5, 'tp', 5);

-- GPC.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_gpc_id, 'GPC.3 — Coordination d''équipe et suivi',
        'Coordonner une équipe et assurer le suivi d''un projet.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Outils de suivi (tableau de bord projet, indicateurs)', 3.5, 'tp', 1),
(v_seq, 'Animation de réunion d''avancement', 3.5, 'tp', 2),
(v_seq, 'Comptes rendus de suivi et communication interne', 3.5, 'tp', 3),
(v_seq, 'Gestion des risques et alerte', 3.5, 'cours', 4),
(v_seq, 'Collaboration inter-services et gestion des conflits', 3.5, 'cours', 5);

-- GPC.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_gpc_id, 'GPC.4 — Communication projet et bilan',
        'Communiquer sur le projet et réaliser un bilan complet.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Communication externe sur le projet', 3.5, 'cours', 1),
(v_seq, 'Élaboration du bilan de projet (qualitatif, quantitatif)', 3.5, 'tp', 2),
(v_seq, 'Présentation finale devant un « comité de direction »', 3.5, 'tp', 3),
(v_seq, 'BILAN 75 % — évaluation du projet fil rouge et du bloc projet', 3.5, 'evaluation', 4);

-- ════════════════════════════════════════════════════════════
-- MODULE 10 — OGE · 56 h · CCP3
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('OGE — Organisation et gestion d''événements',
        'Planifier, organiser et évaluer un événement professionnel de A à Z.',
        56, v_ccp3_id,
        'Piloter l''organisation complète d''un événement professionnel en autonomie.')
RETURNING id INTO v_oge_id;

-- OGE.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_oge_id, 'OGE.1 — Cahier des charges et budget événementiel',
        'Rédiger un cahier des charges et établir un budget prévisionnel.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Typologies d''événements professionnels', 3.5, 'cours', 1),
(v_seq, 'Rédiger un cahier des charges', 3.5, 'tp', 2),
(v_seq, 'Établir un budget prévisionnel', 3.5, 'tp', 3),
(v_seq, 'Recherche de prestataires et appels d''offres', 3.5, 'tp', 4);

-- OGE.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_oge_id, 'OGE.2 — Logistique et partenaires',
        'Assurer la planification logistique et la coordination des partenaires.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Planification logistique (lieu, matériel, accessibilité)', 3.5, 'cours', 1),
(v_seq, 'Coordination des intervenants internes et externes', 3.5, 'tp', 2),
(v_seq, 'Gestion des invitations et inscriptions', 3.5, 'tp', 3),
(v_seq, 'Plan B et gestion des imprévus', 3.5, 'cours', 4);

-- OGE.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_oge_id, 'OGE.3 — Communication événementielle',
        'Concevoir et déployer la stratégie de communication d''un événement.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Stratégie de communication avant, pendant, après', 3.5, 'cours', 1),
(v_seq, 'Création de supports de communication (flyer, programme)', 3.5, 'tp', 2),
(v_seq, 'Réseaux sociaux pour l''événement', 3.5, 'tp', 3),
(v_seq, 'Discours et protocole', 3.5, 'cours', 4);

-- OGE.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_oge_id, 'OGE.4 — Évaluation et bilan',
        'Évaluer un événement et rédiger un bilan complet.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Conception d''un questionnaire de satisfaction', 3.5, 'tp', 1),
(v_seq, 'Suivi du budget réalisé vs prévisionnel', 3.5, 'tp', 2),
(v_seq, 'Rédaction du bilan qualitatif et quantitatif', 3.5, 'tp', 3),
(v_seq, 'Présentation du retour d''expérience à la direction', 3.5, 'evaluation', 4);

-- ════════════════════════════════════════════════════════════
-- MODULE 11 — CED · 56 h · CCP3
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('CED — Communication écrite et digitale',
        'Maîtriser la rédaction professionnelle print et digitale, les réseaux sociaux et la mesure d''impact.',
        56, v_ccp3_id,
        'Produire et diffuser des contenus de communication professionnels adaptés aux différents supports.')
RETURNING id INTO v_ced_id;

-- CED.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ced_id, 'CED.1 — Rédaction professionnelle et charte graphique',
        'Maîtriser les principes de l''écrit professionnel et l''application d''une charte graphique.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Principes de l''écrit professionnel, adaptation au destinataire', 3.5, 'cours', 1),
(v_seq, 'Appliquer une charte graphique (couleurs, polices, logos)', 3.5, 'cours', 2),
(v_seq, 'Rédiger pour le print : articles, plaquettes', 3.5, 'tp', 3),
(v_seq, 'Rédiger pour le web : référencement, lisibilité', 3.5, 'tp', 4);

-- CED.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ced_id, 'CED.2 — Création de supports print',
        'Concevoir des supports de communication imprimés professionnels.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Conception d''un flyer ou d''une brochure', 3.5, 'tp', 1),
(v_seq, 'Réalisation d''une affiche avec logiciel de PAO', 3.5, 'tp', 2),
(v_seq, 'Lettre d''information interne (newsletter papier)', 3.5, 'tp', 3),
(v_seq, 'Validation et mise en page finale, relations imprimeur', 3.5, 'tp', 4);

-- CED.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ced_id, 'CED.3 — Communication digitale et réseaux sociaux',
        'Créer et diffuser des contenus digitaux sur les réseaux sociaux professionnels.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Panorama des médias sociaux professionnels (LinkedIn, Twitter, Instagram)', 3.5, 'cours', 1),
(v_seq, 'Création de contenus adaptés (post, story, article)', 3.5, 'tp', 2),
(v_seq, 'Planifier ses publications, outils de programmation', 3.5, 'tp', 3),
(v_seq, 'Atelier : campagne de communication réelle pour un événement du centre', 3.5, 'tp', 4);

-- CED.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ced_id, 'CED.4 — Mesure d''impact et amélioration continue',
        'Mesurer et analyser l''impact des actions de communication.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Indicateurs de performance (taux d''engagement, portée)', 3.5, 'cours', 1),
(v_seq, 'Suivi des articles de presse et retombées', 3.5, 'tp', 2),
(v_seq, 'Bilan de l''action de communication et recommandations', 3.5, 'tp', 3),
(v_seq, 'Projet final : dossier de communication complet et soutenance', 3.5, 'evaluation', 4);

-- ════════════════════════════════════════════════════════════
-- MODULE 12 — APA · 77 h · CCP3
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('APA — Anglais professionnel de l''assistanat',
        'Développer les compétences en anglais professionnel pour l''assistant de direction : oral, écrit, réunions et certification.',
        77, v_ccp3_id,
        'Atteindre le niveau B2 en anglais professionnel et préparer la certification TOEIC ou Linguaskill.')
RETURNING id INTO v_apa_id;

-- APA.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_apa_id, 'APA.1 — Accueil et communication orale',
        'Maîtriser la communication orale professionnelle en anglais.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Accueillir un visiteur anglophone', 3.5, 'tp', 1),
(v_seq, 'Gérer un appel téléphonique en anglais', 3.5, 'tp', 2),
(v_seq, 'Prendre un message, reformuler', 3.5, 'tp', 3),
(v_seq, 'Conversation de courtoisie et small talk', 3.5, 'cours', 4),
(v_seq, 'Gérer une situation difficile en anglais', 3.5, 'tp', 5),
(v_seq, 'Simulation globale : accueil + téléphone', 3.5, 'evaluation', 6);

-- APA.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_apa_id, 'APA.2 — Rédaction professionnelle (emails, comptes rendus)',
        'Rédiger des documents professionnels en anglais.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Structure d''un email professionnel en anglais', 3.5, 'cours', 1),
(v_seq, 'Rédiger une invitation, un accusé de réception, un rappel', 3.5, 'tp', 2),
(v_seq, 'Compte rendu de réunion en anglais (minutes)', 3.5, 'tp', 3),
(v_seq, 'Synthèse d''un document en anglais', 3.5, 'tp', 4),
(v_seq, 'Traduction / adaptation de courts documents de la direction', 3.5, 'tp', 5),
(v_seq, 'Atelier écriture intensive : 5 situations professionnelles', 3.5, 'evaluation', 6);

-- APA.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_apa_id, 'APA.3 — Participation à des réunions et événements',
        'Participer activement à des réunions et événements en anglais.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Exprimer son opinion, participer à une discussion', 3.5, 'cours', 1),
(v_seq, 'Présenter un projet ou un bilan en anglais', 3.5, 'tp', 2),
(v_seq, 'Accompagner un visiteur étranger', 3.5, 'tp', 3),
(v_seq, 'Organiser un déplacement à l''étranger en anglais', 3.5, 'tp', 4),
(v_seq, 'Jeu de rôle : réunion de travail avec participants internationaux', 3.5, 'evaluation', 5);

-- APA.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_apa_id, 'APA.4 — Consolidation et certification B2',
        'Se préparer et passer la certification en anglais niveau B2.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Révision grammaticale et lexicale', 3.5, 'cours', 1),
(v_seq, 'Préparation au test de certification (TOEIC, Linguaskill)', 3.5, 'cours', 2),
(v_seq, 'Examen blanc de certification', 3.5, 'evaluation', 3),
(v_seq, 'Analyse des résultats et remédiation', 3.5, 'cours', 4),
(v_seq, 'Passage de la certification (examen officiel simulé)', 3.5, 'evaluation', 5);

-- ════════════════════════════════════════════════════════════
-- MODULE 13 — PPI · 63 h · CCP3
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cours (titre, description, duree_heures, ccp_id, objectif_pedagogique)
VALUES ('PPI — Pratique professionnelle intégrative',
        'Intégrer l''ensemble des compétences du parcours : projet fil rouge, examens blancs, dossier professionnel.',
        63, v_ccp3_id,
        'Mobiliser l''ensemble des compétences acquises pour réussir l''évaluation finale du titre professionnel.')
RETURNING id INTO v_ppi_id;

-- PPI.1
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ppi_id, 'PPI.1 — Projet fil rouge intégrateur',
        'Mener à bien un projet transversal mobilisant l''ensemble des compétences du parcours.', 1)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Lancement du projet fil rouge (cahier des charges partagé)', 3.5, 'cours', 1),
(v_seq, 'Point d''étape et suivi 1', 3.5, 'tp', 2),
(v_seq, 'Atelier de résolution de problèmes', 3.5, 'tp', 3),
(v_seq, 'Point d''étape 2', 3.5, 'tp', 4),
(v_seq, 'Finalisation du projet et préparation de la restitution', 3.5, 'tp', 5),
(v_seq, 'Présentation du projet devant un jury interne', 3.5, 'evaluation', 6);

-- PPI.2
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ppi_id, 'PPI.2 — Préparation et retour de stage',
        'Préparer le stage en entreprise et analyser l''expérience acquise.', 2)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Préparation au stage : objectifs, livrables, convention', 3.5, 'cours', 1),
(v_seq, 'Retour de stage : analyse des pratiques, partage d''expérience', 3.5, 'tp', 2);

-- PPI.3
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ppi_id, 'PPI.3 — Examens blancs',
        'S''entraîner aux conditions d''examen pour préparer la certification.', 3)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Examen blanc n°1 — Bloc de compétences 1 (mise en situation + écrit)', 3.5, 'evaluation', 1),
(v_seq, 'Correction et débriefing EB1', 3.5, 'cours', 2),
(v_seq, 'Examen blanc n°2 — Blocs 1 et 2 (simulation complète)', 3.5, 'evaluation', 3),
(v_seq, 'Correction et débriefing EB2', 3.5, 'cours', 4);

-- PPI.4
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ppi_id, 'PPI.4 — Dossier professionnel',
        'Rédiger et préparer la soutenance du dossier professionnel.', 4)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Méthodologie du dossier professionnel (contenu, annexes)', 3.5, 'cours', 1),
(v_seq, 'Rédaction accompagnée du dossier', 3.5, 'tp', 2),
(v_seq, 'Relecture et feedback individuel', 3.5, 'tp', 3),
(v_seq, 'Préparation à la soutenance (posture, argumentation, temps)', 3.5, 'tp', 4);

-- PPI.5
INSERT INTO lms_sequences (cours_id, titre, objectif, ordre)
VALUES (v_ppi_id, 'PPI.5 — Révisions générales',
        'Consolider l''ensemble des acquis et synthétiser les compétences transversales.', 5)
RETURNING id INTO v_seq;
INSERT INTO lms_seances (sequence_id, titre, duree_heures, type, ordre) VALUES
(v_seq, 'Révision des blocs 1 (Q/R, points clés)', 3.5, 'cours', 1),
(v_seq, 'Révision du bloc 2 et synthèse transversale', 3.5, 'cours', 2);

-- ════════════════════════════════════════════════════════════
-- LIAISON : lms_config_cours (pathway → les 13 modules)
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_config_cours (config_id, cours_id, duree_heures, obligatoire, ordre) VALUES
(v_pfc_id, v_icp_id, 42,  true,  1),
(v_pfc_id, v_ban_id, 77,  true,  2),
(v_pfc_id, v_cpn_id, 56,  true,  3),
(v_pfc_id, v_sol_id, 63,  true,  4),
(v_pfc_id, v_pad_id, 56,  true,  5),
(v_pfc_id, v_paq_id, 46,  true,  6),
(v_pfc_id, v_sin_id, 35,  true,  7),
(v_pfc_id, v_vsi_id, 46,  true,  8),
(v_pfc_id, v_gpc_id, 63,  true,  9),
(v_pfc_id, v_oge_id, 56,  true, 10),
(v_pfc_id, v_ced_id, 56,  true, 11),
(v_pfc_id, v_apa_id, 77,  true, 12),
(v_pfc_id, v_ppi_id, 63,  true, 13);

-- ════════════════════════════════════════════════════════════
-- COHORTE + INSCRIPTION DU STAGIAIRE
-- ════════════════════════════════════════════════════════════
INSERT INTO lms_cohortes (nom, pathway_id, financement_id, date_debut, date_fin)
VALUES ('AD — Promotion 2025-2026', v_pathway_id, v_fin_id, '2025-09-01', '2026-06-30')
RETURNING id INTO v_cohorte_id;

-- Inscrire le stagiaire (rodulfo@ad.fr) à la cohorte
INSERT INTO lms_cohorte_membres (cohorte_id, profile_id, date_inscription)
SELECT v_cohorte_id, p.id, CURRENT_DATE
FROM lms_profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'rodulfo@ad.fr'
ON CONFLICT DO NOTHING;

END $$;
