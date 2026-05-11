-- ============================================================
-- LMS DASHBOA_RD — Schéma v1.0
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Référentiel RNCP ──────────────────────────────────────
CREATE TABLE lms_titres_pro (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_rncp                   VARCHAR(20) UNIQUE NOT NULL,
    sigle                       VARCHAR(20),
    intitule                    TEXT NOT NULL,
    niveau                      INT CHECK (niveau BETWEEN 1 AND 8),
    date_publication_jo         DATE,
    date_effet                  DATE,
    date_previsionnelle_revision DATE,
    secteur_activite            TEXT,
    created_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_certificats_ccp (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre_pro_id UUID REFERENCES lms_titres_pro(id) ON DELETE CASCADE,
    code         VARCHAR(20) UNIQUE NOT NULL,
    intitule     TEXT NOT NULL,
    ordre        INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_activites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ccp_id      UUID REFERENCES lms_certificats_ccp(id) ON DELETE CASCADE,
    intitule    TEXT NOT NULL,
    description TEXT,
    ordre       INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_competences (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id           UUID REFERENCES lms_activites(id) ON DELETE CASCADE,
    intitule              TEXT NOT NULL,
    description_processus TEXT,
    criteres_performance  TEXT[],
    ordre                 INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_competences_transversales (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre_pro_id          UUID REFERENCES lms_titres_pro(id) ON DELETE CASCADE,
    intitule              TEXT NOT NULL,
    description_processus TEXT,
    criteres_performance  TEXT[],
    ordre                 INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ DEFAULT now()
);

-- ── Contenu pédagogique ────────────────────────────────────
CREATE TABLE lms_cours (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre                      VARCHAR(255) NOT NULL,
    description                TEXT,
    duree_heures               INT NOT NULL DEFAULT 0,
    est_transversal            BOOLEAN NOT NULL DEFAULT false,
    image_url                  TEXT,
    objectif_pedagogique       TEXT,
    competence_id              UUID REFERENCES lms_competences(id) ON DELETE SET NULL,
    ccp_id                     UUID REFERENCES lms_certificats_ccp(id) ON DELETE SET NULL,
    competence_transversale_id UUID REFERENCES lms_competences_transversales(id) ON DELETE SET NULL,
    created_at                 TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_sequences (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cours_id  UUID REFERENCES lms_cours(id) ON DELETE CASCADE NOT NULL,
    titre     VARCHAR(255) NOT NULL,
    objectif  TEXT,
    image_url TEXT,
    ordre     INT NOT NULL DEFAULT 0
);

CREATE TABLE lms_seances (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id  UUID REFERENCES lms_sequences(id) ON DELETE CASCADE NOT NULL,
    titre        VARCHAR(255) NOT NULL,
    duree_heures DECIMAL(4,1) DEFAULT 0,
    type         VARCHAR(50) CHECK (type IN ('cours','tp','exercice','quiz','evaluation')),
    contenu      TEXT,
    ordre        INT NOT NULL DEFAULT 0
);

-- ── Parcours & Financements ────────────────────────────────
CREATE TABLE lms_pathways (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre        VARCHAR(255) NOT NULL,
    description  TEXT,
    titre_pro_id UUID REFERENCES lms_titres_pro(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_financements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom         VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_parcours_finance_config (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pathway_id          UUID REFERENCES lms_pathways(id) ON DELETE CASCADE NOT NULL,
    financement_id      UUID REFERENCES lms_financements(id) ON DELETE CASCADE NOT NULL,
    duree_totale_heures INT,
    notes               TEXT,
    UNIQUE(pathway_id, financement_id)
);

CREATE TABLE lms_config_cours (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id    UUID REFERENCES lms_parcours_finance_config(id) ON DELETE CASCADE NOT NULL,
    cours_id     UUID REFERENCES lms_cours(id) ON DELETE CASCADE NOT NULL,
    duree_heures INT,
    obligatoire  BOOLEAN NOT NULL DEFAULT true,
    ordre        INT NOT NULL DEFAULT 0,
    UNIQUE(config_id, cours_id)
);

-- ── Utilisateurs & Cohortes ────────────────────────────────
CREATE TABLE lms_profiles (
    id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    civilite       VARCHAR(5) CHECK (civilite IN ('M.', 'Mme', 'Mlle')),
    nom            VARCHAR(100) NOT NULL,
    prenom         VARCHAR(100) NOT NULL,
    date_naissance DATE,
    adresse        TEXT,
    code_postal    VARCHAR(10),
    ville          VARCHAR(100),
    telephone      VARCHAR(20),
    role           VARCHAR(30) NOT NULL DEFAULT 'stagiaire'
                   CHECK (role IN ('admin','formateur_editeur','formateur','stagiaire','invite')),
    first_login    BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lms_profiles_updated_at
BEFORE UPDATE ON lms_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE lms_cohortes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom            VARCHAR(100) NOT NULL,
    pathway_id     UUID REFERENCES lms_pathways(id) ON DELETE RESTRICT NOT NULL,
    financement_id UUID REFERENCES lms_financements(id) ON DELETE SET NULL,
    date_debut     DATE,
    date_fin       DATE,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_cohorte_membres (
    cohorte_id       UUID REFERENCES lms_cohortes(id) ON DELETE CASCADE NOT NULL,
    profile_id       UUID REFERENCES lms_profiles(id) ON DELETE CASCADE NOT NULL,
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (cohorte_id, profile_id)
);

-- ── Progression ────────────────────────────────────────────
CREATE TABLE lms_session_progress (
    profile_id      UUID REFERENCES lms_profiles(id) ON DELETE CASCADE NOT NULL,
    seance_id       UUID REFERENCES lms_seances(id) ON DELETE CASCADE NOT NULL,
    statut          VARCHAR(20) NOT NULL DEFAULT 'non_commence'
                    CHECK (statut IN ('non_commence','en_cours','termine')),
    score           DECIMAL(5,2),
    date_completion TIMESTAMPTZ,
    PRIMARY KEY (profile_id, seance_id)
);

-- ── Logs import admin ──────────────────────────────────────
CREATE TABLE lms_import_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID REFERENCES lms_profiles(id) ON DELETE SET NULL,
    type_import     VARCHAR(50) NOT NULL,
    nb_lignes       INT NOT NULL DEFAULT 0,
    nb_succes       INT NOT NULL DEFAULT 0,
    nb_erreurs      INT NOT NULL DEFAULT 0,
    details_erreurs JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Index performances ─────────────────────────────────────
CREATE INDEX idx_lms_session_progress_profile ON lms_session_progress(profile_id);
CREATE INDEX idx_lms_session_progress_seance  ON lms_session_progress(seance_id);
CREATE INDEX idx_lms_cohorte_membres_profile  ON lms_cohorte_membres(profile_id);
CREATE INDEX idx_lms_cohorte_membres_cohorte  ON lms_cohorte_membres(cohorte_id);
CREATE INDEX idx_lms_seances_sequence         ON lms_seances(sequence_id);
CREATE INDEX idx_lms_sequences_cours          ON lms_sequences(cours_id);
CREATE INDEX idx_lms_config_cours_config      ON lms_config_cours(config_id);
